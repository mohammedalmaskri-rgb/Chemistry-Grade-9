// Run:  node --test supabase/functions/portal-files/handler.test.mjs   (Node 20+; no dependencies)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler, parseDataUrl, magicMatches, mimeFromExt, safeName, KINDS } from './handler.js';

const T = {
  teacher: '11111111-1111-4111-8111-111111111111',
  student: '22222222-2222-4222-8222-222222222222',
  admin: '33333333-3333-4333-8333-333333333333',
  nobody: '44444444-4444-4444-8444-444444444444',
};
const PRINCIPALS = { [T.teacher]: { role: 'teacher', user_id: 7 }, [T.student]: { role: 'student', user_id: 15 }, [T.admin]: { role: 'admin', user_id: 1 } };
const b64 = (bytes) => Buffer.from(bytes).toString('base64');
const PDF = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 10, 1, 2, 3]);
const JPG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);

function setup(over = {}) {
  const calls = { rpc: [], upload: [], signedUrl: [], signedUpload: [] };
  const state = {
    readInfo: { storage_path: 'materials/7/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.pdf', file_name: 'ملخص.pdf', mime: 'application/pdf' },
    batch: [], pending: [{ kind: 'materials', files: 2, bytes: 1000 }, { kind: 'content', files: 1, bytes: 50 }, { kind: 'questions', files: 0, bytes: 0 }],
    setResult: true, uploadError: null, verifyError: null, rpcError: null, ...over,
  };
  let n = 0;
  const handler = createHandler({
    uuid: () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
    rpc: async (name, args) => {
      calls.rpc.push([name, args]);
      if (state.rpcError === name) return { data: null, error: { message: 'boom secret details' } };
      if (name === 'portal_file_principal') { const p = PRINCIPALS[args.p_token]; return { data: p ? [p] : [], error: null }; }
      if (name === 'portal_file_read_info') return { data: state.readInfo ? [state.readInfo] : [], error: null };
      if (name === 'portal_file_legacy_pending') return { data: state.pending, error: null };
      if (name === 'portal_file_legacy_batch') return { data: state.batch, error: null };
      if (name === 'portal_file_legacy_set') return { data: state.setResult, error: null };
      return { data: null, error: { message: 'unknown' } };
    },
    storage: {
      signedUpload: async (path) => { calls.signedUpload.push(path); return { data: { token: 'jwt-up', path }, error: null }; },
      signedUrl: async (path, secs, dl) => { calls.signedUrl.push([path, secs, dl]); return state.verifyError ? { data: null, error: { message: 'x' } } : { data: { signedUrl: `https://x.supabase.co/sign/${path}?t=1` }, error: null }; },
      upload: async (path, bytes, mime) => { calls.upload.push([path, bytes, mime]); return { error: state.uploadError }; },
    },
  });
  const call = (body, init = {}) => handler(new Request('https://f.example/functions/v1/portal-files', { method: 'POST', headers: { origin: 'https://rawafidedu.om' }, body: typeof body === 'string' ? body : JSON.stringify(body), ...init }));
  return { call, calls, state, handler };
}
const j = async (r) => r.json();

test('CORS: preflight allowed for the site, other origins never echoed', async () => {
  const { handler } = setup();
  const ok = await handler(new Request('https://f/', { method: 'OPTIONS', headers: { origin: 'https://rawafidedu.om' } }));
  assert.equal(ok.status, 204);
  assert.equal(ok.headers.get('access-control-allow-origin'), 'https://rawafidedu.om');
  const bad = await handler(new Request('https://f/', { method: 'OPTIONS', headers: { origin: 'https://evil.example' } }));
  assert.notEqual(bad.headers.get('access-control-allow-origin'), 'https://evil.example');
});

test('request validation', async () => {
  const { call, handler } = setup();
  assert.equal((await handler(new Request('https://f/', { method: 'GET' }))).status, 405);
  assert.equal((await call('{not json')).status, 400);
  assert.equal((await call('x'.repeat(5000))).status, 413);
  assert.equal((await call({ action: 'upload' })).status, 401);
  assert.equal((await call({ action: 'upload', token: 'not-a-uuid' })).status, 401);
  assert.equal((await call({ action: 'upload', token: T.nobody })).status, 401);
  assert.equal((await call({ action: 'nope', token: T.teacher })).status, 400);
  assert.equal((await call([1, 2])).status, 401);
});

test('upload: teacher gets a signed URL under their OWN folder', async () => {
  const { call, calls } = setup();
  const r = await call({ action: 'upload', token: T.teacher, kind: 'materials', mime: 'application/pdf', size: 1 << 20, path: 'materials/999/evil.pdf' });
  assert.equal(r.status, 200);
  const b = await j(r);
  assert.match(b.path, /^materials\/7\/00000000-0000-4000-8000-\d{12}\.pdf$/);
  assert.equal(b.ref, `storage:${b.path}`);
  assert.equal(b.uploadToken, 'jwt-up');
  assert.deepEqual(calls.signedUpload, [b.path]); // a client-supplied path is ignored
  assert.equal(b.bucket, 'rawafid-files');
});

test('upload: role / kind / type / size rules', async () => {
  const { call } = setup();
  const up = (token, kind, mime, size) => call({ action: 'upload', token, kind, mime, size }).then((r) => r.status);
  assert.equal(await up(T.student, 'materials', 'application/pdf', 100), 403);
  assert.equal(await up(T.teacher, 'questions', 'image/jpeg', 100), 403);
  assert.equal(await up(T.admin, 'materials', 'application/pdf', 100), 403);
  assert.equal(await up(T.student, 'questions', 'image/jpeg', 100), 200);
  assert.equal(await up(T.student, 'questions', 'application/pdf', 100), 415);
  assert.equal(await up(T.teacher, 'materials', 'text/html', 100), 415);
  assert.equal(await up(T.teacher, 'materials', 'image/svg+xml', 100), 415);
  assert.equal(await up(T.teacher, 'content', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 100), 200);
  assert.equal(await up(T.teacher, 'materials', 'APPLICATION/PDF', 100), 200);
  assert.equal(await up(T.teacher, 'materials', 'application/pdf', KINDS.materials.maxBytes + 1), 413);
  assert.equal(await up(T.teacher, 'materials', 'application/pdf', KINDS.materials.maxBytes), 200);
  assert.equal(await up(T.student, 'questions', 'image/jpeg', KINDS.questions.maxBytes + 1), 413);
  assert.equal(await up(T.teacher, 'materials', 'application/pdf', 0), 400);
  assert.equal(await up(T.teacher, 'materials', 'application/pdf', -5), 400);
  assert.equal(await up(T.teacher, 'materials', 'application/pdf', 1.5), 400);
  assert.equal(await up(T.teacher, 'materials', 'application/pdf', '10'), 200);
  assert.equal(await up(T.teacher, 'videos', 'application/pdf', 10), 400);
});

test('download: signed URL from the path the DATABASE returns (never from the client)', async () => {
  const { call, calls } = setup();
  const r = await call({ action: 'download', token: T.student, kind: 'materials', id: 5, path: 'materials/999/x.pdf' });
  assert.equal(r.status, 200);
  const b = await j(r);
  assert.match(b.url, /materials\/7\/aaaaaaaa/);
  assert.equal(b.name, 'ملخص.pdf');
  assert.equal(b.mime, 'application/pdf');
  assert.equal(calls.signedUrl[0][1], 300);
  assert.equal(calls.signedUrl[0][2], undefined); // pdf: shown inline
  assert.deepEqual(calls.rpc.find((c) => c[0] === 'portal_file_read_info')[1], { p_token: T.student, p_kind: 'materials', p_id: 5 });
});

test('download: Office files are offered as a download with their name', async () => {
  const { call, calls } = setup({ readInfo: { storage_path: 'materials/7/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.docx', file_name: 'تقرير', mime: null } });
  const b = await j(await call({ action: 'download', token: T.teacher, kind: 'materials', id: 1 }));
  assert.equal(b.mime, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  assert.equal(calls.signedUrl[0][2], 'تقرير.docx');
  assert.equal(b.name, 'تقرير.docx');
});

test('download: not allowed / missing -> 404 with no hint; bad input -> 400; db error -> 500 without details', async () => {
  let { call } = setup({ readInfo: null });
  const r = await call({ action: 'download', token: T.student, kind: 'materials', id: 5 });
  assert.equal(r.status, 404);
  assert.deepEqual(await j(r), { error: 'not_found' });
  ({ call } = setup());
  assert.equal((await call({ action: 'download', token: T.student, kind: 'x', id: 5 })).status, 400);
  assert.equal((await call({ action: 'download', token: T.student, kind: 'materials', id: 'abc' })).status, 400);
  assert.equal((await call({ action: 'download', token: T.student, kind: 'materials', id: 0 })).status, 400);
  ({ call } = setup({ rpcError: 'portal_file_read_info' }));
  const e = await call({ action: 'download', token: T.student, kind: 'materials', id: 5 });
  assert.equal(e.status, 500);
  assert.equal(JSON.stringify(await j(e)).includes('boom'), false);
});

test('responses never contain the session token', async () => {
  const { call } = setup();
  for (const body of [{ action: 'upload', token: T.teacher, kind: 'materials', mime: 'application/pdf', size: 5 }, { action: 'download', token: T.teacher, kind: 'materials', id: 1 }, { action: 'legacy_pending', token: T.admin }]) {
    assert.equal((await (await call(body)).text()).includes(body.token), false);
  }
});

test('legacy_pending: admin only', async () => {
  const { call } = setup();
  assert.equal((await call({ action: 'legacy_pending', token: T.teacher })).status, 403);
  assert.equal((await call({ action: 'legacy_pending', token: T.student })).status, 403);
  const b = await j(await call({ action: 'legacy_pending', token: T.admin }));
  assert.equal(b.files, 3);
  assert.equal(b.bytes, 1050);
});

const row = (over = {}) => ({ kind: 'materials', id: 11, owner_id: 7, data: `data:application/pdf;base64,${b64(PDF)}`, file_name: 'a.pdf', mime: 'application/pdf', ...over });

test('legacy_migrate: admin only', async () => {
  const { call } = setup({ batch: [row()] });
  assert.equal((await call({ action: 'legacy_migrate', token: T.teacher })).status, 403);
  assert.equal((await call({ action: 'legacy_migrate', token: T.student })).status, 403);
});

test('legacy_migrate: uploads the exact bytes under the owner folder, verifies, then switches the row', async () => {
  const r = row();
  const { call, calls } = setup({ batch: [r] });
  const b = await j(await call({ action: 'legacy_migrate', token: T.admin }));
  assert.equal(b.results[0].ok, true);
  assert.equal(calls.upload.length, 1);
  const [path, bytes, mime] = calls.upload[0];
  assert.match(path, /^materials\/7\/[0-9a-f-]{36}\.pdf$/);
  assert.equal(mime, 'application/pdf');
  assert.deepEqual(Buffer.from(bytes), Buffer.from(PDF));
  const order = calls.rpc.map((c) => c[0]);
  assert.ok(order.indexOf('portal_file_legacy_set') > -1);
  const set = calls.rpc.find((c) => c[0] === 'portal_file_legacy_set')[1];
  assert.deepEqual(set, { p_token: T.admin, p_kind: 'materials', p_id: 11, p_path: path, p_expected_len: r.data.length });
  assert.equal(calls.signedUrl.length, 1); // existence check before the row is switched
  assert.equal(b.files, 3);
});

test('legacy_migrate: skip is passed on (clamped), so one bad file never blocks the rest', async () => {
  let s = setup({ batch: [] });
  await s.call({ action: 'legacy_migrate', token: T.admin, skip: 3 });
  assert.equal(s.calls.rpc.find((c) => c[0] === 'portal_file_legacy_batch')[1].p_skip, 3);
  s = setup({ batch: [] });
  await s.call({ action: 'legacy_migrate', token: T.admin, skip: 999999 });
  assert.equal(s.calls.rpc.find((c) => c[0] === 'portal_file_legacy_batch')[1].p_skip, 1000);
  s = setup({ batch: [] });
  await s.call({ action: 'legacy_migrate', token: T.admin, skip: -4 });
  assert.equal(s.calls.rpc.find((c) => c[0] === 'portal_file_legacy_batch')[1].p_skip, 0);
  s = setup({ batch: [] });
  await s.call({ action: 'legacy_migrate', token: T.admin, skip: 'x' });
  assert.equal(s.calls.rpc.find((c) => c[0] === 'portal_file_legacy_batch')[1].p_skip, 0);
});

test('legacy_migrate: questions go under the STUDENT folder; mime falls back to the file name', async () => {
  const { call, calls } = setup({ batch: [row({ kind: 'questions', id: 3, owner_id: 15, data: `data:image/jpeg;base64,${b64(JPG)}`, file_name: 'question-3', mime: null })] });
  const b = await j(await call({ action: 'legacy_migrate', token: T.admin }));
  assert.equal(b.results[0].ok, true);
  assert.match(calls.upload[0][0], /^questions\/15\/[0-9a-f-]{36}\.jpg$/);
  const s2 = setup({ batch: [row({ data: `data:application/octet-stream;base64,${b64(PDF)}`, file_name: 'x.pdf' })] });
  assert.equal((await j(await s2.call({ action: 'legacy_migrate', token: T.admin }))).results[0].ok, true);
});

test('legacy_migrate: unsafe / odd rows are skipped and left untouched', async () => {
  const cases = [
    [row({ data: 'data:text/html;base64,PGh0bWw+' , file_name: 'x.html'}), 'unsupported_type'],
    [row({ data: `data:application/pdf;base64,${b64(JPG)}` }), 'content_mismatch'],
    [row({ data: 'not a data url' }), 'not_base64'],
    [row({ kind: 'questions', owner_id: 15, data: `data:application/pdf;base64,${b64(PDF)}` }), 'unsupported_type'],
    [row({ data: `data:application/pdf;base64,${'A'.repeat(20 * 1024 * 1024)}` }), 'too_large'],
  ];
  for (const [r, why] of cases) {
    const { call, calls } = setup({ batch: [r] });
    const b = await j(await call({ action: 'legacy_migrate', token: T.admin }));
    assert.equal(b.results[0].ok, false);
    assert.equal(b.results[0].reason, why);
    assert.equal(calls.upload.length, 0);
    assert.equal(calls.rpc.some((c) => c[0] === 'portal_file_legacy_set'), false);
  }
});

test('legacy_migrate: row is NOT switched when the upload, the check or the row guard fails', async () => {
  let s = setup({ batch: [row()], uploadError: { message: 'x' } });
  assert.equal((await j(await s.call({ action: 'legacy_migrate', token: T.admin }))).results[0].reason, 'upload_failed');
  assert.equal(s.calls.rpc.some((c) => c[0] === 'portal_file_legacy_set'), false);
  s = setup({ batch: [row()], verifyError: true });
  assert.equal((await j(await s.call({ action: 'legacy_migrate', token: T.admin }))).results[0].reason, 'verify_failed');
  assert.equal(s.calls.rpc.some((c) => c[0] === 'portal_file_legacy_set'), false);
  s = setup({ batch: [row()], setResult: false });
  assert.equal((await j(await s.call({ action: 'legacy_migrate', token: T.admin }))).results[0].reason, 'row_changed');
});

test('helpers', () => {
  assert.deepEqual(parseDataUrl('data:image/png;base64,AAAA'), { mime: 'image/png', b64: 'AAAA' });
  assert.equal(parseDataUrl('data:image/png,AAAA'), null);
  assert.equal(parseDataUrl('https://x/y.png'), null);
  assert.equal(mimeFromExt('Report.PDF'), 'application/pdf');
  assert.equal(mimeFromExt('x.jpeg'), 'image/jpeg');
  assert.equal(mimeFromExt('x.exe'), null);
  assert.equal(magicMatches('application/pdf', PDF), true);
  assert.equal(magicMatches('application/pdf', JPG), false);
  assert.equal(magicMatches('text/html', PDF), false);
  assert.equal(safeName('../a/b\\c:d*.pdf\n'), '.. a b c d .pdf');
  assert.equal(safeName('x'.repeat(300)).length, 120);
});
