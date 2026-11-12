// يصدّر بيانات المدرسة النشطة (من src/config.ts) إلى out/report.json
// لاستخدامها في سكربتات الصوت والتحقق — دون تكرار البيانات.
import { buildSync } from "esbuild";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(join(root, "out"), { recursive: true });
const outfile = join(root, "out", ".config.cjs");
buildSync({ entryPoints: [join(root, "src/config.ts")], bundle: true, platform: "node", format: "cjs", outfile, logLevel: "error" });
const require = createRequire(import.meta.url);
const cfg = require(outfile);
const data = { slug: cfg.SCHOOL_SLUG, timeline: cfg.TIMELINE, audio: cfg.AUDIO, video: cfg.VIDEO, narration: cfg.report.narration };
writeFileSync(join(root, "out", "report.json"), JSON.stringify(data, null, 2));
console.log(`exported ${data.narration.length} narration segments for "${data.slug}"`);
