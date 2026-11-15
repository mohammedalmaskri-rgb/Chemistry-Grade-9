// تصدير فيديو مدرسة: SCHOOL=<slug> npm run render   (الافتراضي: DEFAULT_SCHOOL في src/config.ts)
// خيارات إضافية تُمرَّر إلى Remotion: npm run render -- --scale=0.5
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
execFileSync("node", [join(root, "scripts/export-data.mjs")], { stdio: "inherit", env: process.env });
const { slug } = JSON.parse(readFileSync(join(root, "out/report.json"), "utf8"));
const draft = process.argv.includes("--draft");
const extra = process.argv.slice(2).filter((a) => a !== "--draft");
const out = join("out", `${slug}${draft ? "-draft" : ""}.mp4`);
const args = ["remotion", "render", "src/index.ts", `SchoolReport-${slug}`, out, "--codec=h264", draft ? "--crf=28" : "--crf=18", ...(draft ? ["--scale=0.5"] : []), ...extra];
console.log("npx", args.join(" "));
const r = spawnSync("npx", args, { cwd: root, stdio: "inherit" });
process.exit(r.status ?? 1);
