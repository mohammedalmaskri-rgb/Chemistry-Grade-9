// يصدّر لقطات ثابتة عند ثوانٍ محددة للمراجعة السريعة دون تصدير الفيديو كاملًا.
// الاستخدام: npm run stills -- 5 20 40 ...   (بالثواني) — الافتراضي: لقطة من كل مقطع فرعي
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const secs = process.argv.slice(2).map(Number).filter((n) => !Number.isNaN(n));
const times = secs.length ? secs : [9, 27, 35, 46, 58, 70, 83, 99, 113, 129, 146, 166, 183, 199, 220, 237, 258, 279, 295];
const scale = Number(process.env.STILL_SCALE ?? 0.5);
const outDir = join(root, "out", "stills");
mkdirSync(outDir, { recursive: true });

const serveUrl = await bundle({ entryPoint: join(root, "src/index.ts") });
const browserExecutable = process.env.REMOTION_BROWSER ?? null;
const composition = await selectComposition({ serveUrl, id: "SchoolReportSilent", browserExecutable });
for (const s of times) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(s * composition.fps));
  const output = join(outDir, `t${String(s).padStart(3, "0")}.png`);
  await renderStill({ composition, serveUrl, output, frame, scale, browserExecutable, chromiumOptions: { gl: "angle" } });
  console.log("✓", output);
}
