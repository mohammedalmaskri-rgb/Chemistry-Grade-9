// يتحقق من أن كل مقطع تعليق ينتهي قبل المقطع التالي وقبل نهاية مشهده.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
execFileSync("node", [join(root, "scripts/export-data.mjs")], { stdio: "ignore" });
const data = JSON.parse(readFileSync(join(root, "out/report.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(root, "src/data/generated/voiceover.json"), "utf8"));
const durs = manifest.school === data.slug ? manifest.segments : {};
const GAP = 0.4;
let errors = 0;
let speech = 0;
const n = data.narration;
console.log("id    start    dur    end   | scene(ends)   slack");
for (let i = 0; i < n.length; i++) {
  const s = n[i];
  const d = durs[s.id]?.duration;
  const scene = data.timeline.find((t) => s.start >= t.from && s.start < t.to);
  if (!scene) { console.log(`✗ ${s.id} starts outside any scene`); errors++; continue; }
  if (d === undefined) { console.log(`? ${s.id} no audio yet (run npm run voice)`); continue; }
  speech += d;
  const end = s.start + d;
  const limit = Math.min(n[i + 1]?.start ?? Infinity, scene.to);
  const slack = limit - end;
  const ok = slack >= GAP;
  if (!ok) errors++;
  console.log(`${ok ? "✓" : "✗"} ${s.id} ${s.start.toFixed(1).padStart(6)} ${d.toFixed(2).padStart(6)} ${end.toFixed(2).padStart(7)} | ${scene.id.padEnd(11)}(${scene.to}) ${slack.toFixed(2).padStart(6)}`);
}
console.log(`\nspeech total: ${speech.toFixed(1)}s of ${data.video.durationInSeconds}s`);
if (errors) { console.error(`\n${errors} timing problem(s) — shift 'start' values in the school data file.`); process.exit(1); }
console.log("timing OK");
