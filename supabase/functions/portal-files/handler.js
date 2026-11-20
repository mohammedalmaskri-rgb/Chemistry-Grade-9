// portal-files: private file storage for منصة روافد العلوم.
// Pure request handler (no imports) so it can be unit-tested with Node; index.ts wires it to Supabase.
//
// Authentication is the platform's own session token (teacher / student / admin). The token is sent in the JSON body,
// checked by the SECURITY DEFINER SQL functions portal_file_* (callable by service_role only), never logged.
//
// Actions
//   upload          {kind, mime, size, name}  -> one-time signed upload URL under the caller's OWN folder
//   download        {kind, id}                -> short-lived signed URL, only if the list rules would show the row to the caller
//   legacy_pending  {}                        -> admin: how many old inline files remain
//   legacy_migrate  {}                        -> admin: move the next few old inline (base64) files into Storage
//
// A file is referenced from the old column as the string  storage:<kind>/<owner_id>/<uuid>.<ext>

export const BUCKET = 'rawafid-files';
export const SIGNED_URL_SECONDS = 300;

const MB = 1024 * 1024;
export const TYPES = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const EXT_TO_MIME = Object.fromEntries(Object.entries(TYPES).map(([m, e]) => [e, m]));
EXT_TO_MIME.jpeg = 'image/jpeg';
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

export const KINDS = {
  materials: { roles: ['teacher'], mimes: Object.keys(TYPES), maxBytes: 6 * MB },
  content: { roles: ['teacher'], mimes: Object.keys(TYPES), maxBytes: 6 * MB },
  questions: { roles: ['student'], mimes: IMAGE_MIMES, maxBytes: 3 * MB },
};
const MIGRATE_MAX_BYTES = 12 * MB;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY = 4096;

const DEFAULT_ORIGINS = ['https://rawafidedu.om', 'https://www.rawafidedu.om'];

function corsHeaders(req, origins) {
  const o = req.headers.get('origin') || '';
  const allow = origins.includes(o) ? o : origins[0];
  return {
    'access-control-allow-origin': allow,
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

function json(req, origins, status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req, origins), 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export function safeName(name) {
  return String(name || '').replace(/[\u0000-\u001f\u007f\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
}

export function mimeFromExt(name) {
  const m = /\.([A-Za-z0-9]{2,5})$/.exec(String(name || ''));
  return m ? EXT_TO_MIME[m[1].toLowerCase()] || null : null;
}

// Cheap content sniffing for the files this function itself uploads (legacy migration).
export function magicMatches(mime, b) {
  const at = (i, v) => b[i] === v;
  switch (TYPES[mime]) {
    case 'pdf': return at(0, 0x25) && at(1, 0x50) && at(2, 0x44) && at(3, 0x46);
    case 'jpg': return at(0, 0xff) && at(1, 0xd8);
    case 'png': return at(0, 0x89) && at(1, 0x50) && at(2, 0x4e) && at(3, 0x47);
    case 'webp': return at(0, 0x52) && at(1, 0x49) && at(2, 0x46) && at(3, 0x46);
    case 'docx': case 'pptx': return at(0, 0x50) && at(1, 0x4b);
    case 'doc': case 'ppt': return at(0, 0xd0) && at(1, 0xcf) && at(2, 0x11) && at(3, 0xe0);
    default: return false;
  }
}

export function parseDataUrl(raw) {
  const m = /^data:([A-Za-z0-9.+\/-]+)?(?:;[^;,]*)*;base64,([A-Za-z0-9+\/=\s]*)$/.exec(String(raw || ''));
  if (!m) return null;
  return { mime: (m[1] || '').toLowerCase(), b64: m[2].replace(/\s+/g, '') };
}

function decodeBase64(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * @param {{
 *   rpc: (name: string, args: object) => Promise<{data: any, error: any}>,
 *   storage: {
 *     signedUpload: (path: string) => Promise<{data: any, error: any}>,
 *     signedUrl: (path: string, seconds: number, downloadName?: string) => Promise<{data: any, error: any}>,
 *     upload: (path: string, bytes: Uint8Array, mime: string) => Promise<{error: any}>,
 *   },
 *   uuid: () => string,
 *   origins?: string[],
 * }} deps
 */
export function createHandler(deps) {
  const origins = deps.origins && deps.origins.length ? deps.origins : DEFAULT_ORIGINS;
  const reply = (req, status, body) => json(req, origins, status, body);
  const fail = (req, status, code) => reply(req, status, { error: code });

  async function principalOf(token) {
    const { data, error } = await deps.rpc('portal_file_principal', { p_token: token });
    if (error) throw new Error('principal');
    const r = Array.isArray(data) ? data[0] : data;
    return r && r.role ? { role: r.role, id: Number(r.user_id) } : null;
  }

  async function upload(req, body, pr) {
    const kind = KINDS[body.kind];
    if (!kind) return fail(req, 400, 'bad_kind');
    if (!kind.roles.includes(pr.role)) return fail(req, 403, 'forbidden');
    const mime = String(body.mime || '').toLowerCase();
    if (!kind.mimes.includes(mime)) return fail(req, 415, 'unsupported_type');
    const size = Number(body.size);
    if (!Number.isInteger(size) || size <= 0) return fail(req, 400, 'bad_size');
    if (size > kind.maxBytes) return fail(req, 413, 'too_large');
    const path = `${body.kind}/${pr.id}/${deps.uuid()}.${TYPES[mime]}`;
    const { data, error } = await deps.storage.signedUpload(path);
    if (error || !data || !data.token) return fail(req, 500, 'storage');
    return reply(req, 200, { bucket: BUCKET, path, uploadToken: data.token, ref: `storage:${path}`, maxBytes: kind.maxBytes });
  }

  async function download(req, body, pr) {
    if (!KINDS[body.kind]) return fail(req, 400, 'bad_kind');
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) return fail(req, 400, 'bad_id');
    const { data, error } = await deps.rpc('portal_file_read_info', { p_token: body.token, p_kind: body.kind, p_id: id });
    if (error) throw new Error('read_info');
    const info = Array.isArray(data) ? data[0] : data;
    if (!info || !info.storage_path) return fail(req, 404, 'not_found');
    const ext = info.storage_path.split('.').pop();
    const mime = info.mime || EXT_TO_MIME[ext] || 'application/octet-stream';
    const isOffice = ['doc', 'docx', 'ppt', 'pptx'].includes(ext);
    let name = safeName(info.file_name) || `file.${ext}`;
    if (!/\.[A-Za-z0-9]{2,5}$/.test(name)) name = `${name}.${ext}`; // the front end picks the viewer from the extension
    const dl = isOffice ? name : undefined;
    const signed = await deps.storage.signedUrl(info.storage_path, SIGNED_URL_SECONDS, dl);
    if (signed.error || !signed.data || !signed.data.signedUrl) return fail(req, 404, 'not_found');
    return reply(req, 200, { url: signed.data.signedUrl, name, mime, expiresIn: SIGNED_URL_SECONDS });
  }

  async function pending(token) {
    const { data, error } = await deps.rpc('portal_file_legacy_pending', { p_token: token });
    if (error) throw new Error('pending');
    const rows = (data || []).map((r) => ({ kind: r.kind, files: Number(r.files), bytes: Number(r.bytes) }));
    return { rows, files: rows.reduce((a, r) => a + r.files, 0), bytes: rows.reduce((a, r) => a + r.bytes, 0) };
  }

  async function migrate(req, body) {
    const skip = Number.isInteger(body.skip) ? Math.min(Math.max(body.skip, 0), 1000) : 0;
    const { data, error } = await deps.rpc('portal_file_legacy_batch', { p_token: body.token, p_limit: 2, p_skip: skip });
    if (error) throw new Error('batch');
    const results = [];
    for (const row of data || []) {
      const res = { kind: row.kind, id: Number(row.id), ok: false, reason: '' };
      results.push(res);
      try {
        const parsed = parseDataUrl(row.data);
        if (!parsed) { res.reason = 'not_base64'; continue; }
        let mime = TYPES[parsed.mime] ? parsed.mime : (mimeFromExt(row.file_name) || '');
        if (!mime || !TYPES[mime]) { res.reason = 'unsupported_type'; continue; }
        if (row.kind === 'questions' && !IMAGE_MIMES.includes(mime)) { res.reason = 'unsupported_type'; continue; }
        if (parsed.b64.length > Math.ceil((MIGRATE_MAX_BYTES * 4) / 3) + 8) { res.reason = 'too_large'; continue; }
        const bytes = decodeBase64(parsed.b64);
        if (!bytes.length || bytes.length > MIGRATE_MAX_BYTES) { res.reason = 'too_large'; continue; }
        if (!magicMatches(mime, bytes)) { res.reason = 'content_mismatch'; continue; }
        const path = `${row.kind}/${Number(row.owner_id)}/${deps.uuid()}.${TYPES[mime]}`;
        const up = await deps.storage.upload(path, bytes, mime);
        if (up.error) { res.reason = 'upload_failed'; continue; }
        const check = await deps.storage.signedUrl(path, 60);
        if (check.error || !check.data) { res.reason = 'verify_failed'; continue; }
        const set = await deps.rpc('portal_file_legacy_set', {
          p_token: body.token, p_kind: row.kind, p_id: Number(row.id), p_path: path, p_expected_len: String(row.data).length,
        });
        if (set.error || set.data !== true) { res.reason = 'row_changed'; continue; }
        res.ok = true;
        res.bytes = bytes.length;
      } catch (_e) {
        res.reason = 'error';
      }
    }
    return { results, ...(await pending(body.token)) };
  }

  return async function handle(req) {
    try {
      if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req, origins) });
      if (req.method !== 'POST') return fail(req, 405, 'method');
      const text = await req.text();
      if (text.length > MAX_BODY) return fail(req, 413, 'too_large');
      let body;
      try { body = JSON.parse(text); } catch (_e) { return fail(req, 400, 'bad_json'); }
      if (!body || typeof body !== 'object') return fail(req, 400, 'bad_json');
      if (typeof body.token !== 'string' || !UUID_RE.test(body.token)) return fail(req, 401, 'unauthorized');

      const pr = await principalOf(body.token);
      if (!pr) return fail(req, 401, 'unauthorized');

      switch (body.action) {
        case 'upload': return await upload(req, body, pr);
        case 'download': return await download(req, body, pr);
        case 'legacy_pending':
          if (pr.role !== 'admin') return fail(req, 403, 'forbidden');
          return reply(req, 200, await pending(body.token));
        case 'legacy_migrate':
          if (pr.role !== 'admin') return fail(req, 403, 'forbidden');
          return reply(req, 200, await migrate(req, body));
        default: return fail(req, 400, 'bad_action');
      }
    } catch (_e) {
      return fail(req, 500, 'server');
    }
  };
}
