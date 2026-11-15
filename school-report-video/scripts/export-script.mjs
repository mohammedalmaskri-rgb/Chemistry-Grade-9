// يولّد docs/SCRIPT.md: نص التعليق الصوتي الكامل بالتوقيتات الدقيقة ومراجع الصفحات.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
execFileSync("node", [join(root, "scripts/export-data.mjs")], { stdio: "ignore", env: process.env });
const data = JSON.parse(readFileSync(join(root, "out/report.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(root, `src/data/generated/${data.slug}.voice.json`), "utf8"));
const segs = manifest.school === data.slug ? manifest.segments : {};
const names = { intro: "المقدمة", basics: "البيانات الأساسية", achievement: "التحصيل الدراسي", initiatives: "المبادرات والأنشطة", evaluation: "التقويم الذاتي والتطوير", closing: "الخاتمة" };
const ts = (s) => `${String(Math.floor(s / 60)).padStart(1, "0")}:${(s % 60).toFixed(1).padStart(4, "0")}`;
const pages = (p) => (Array.isArray(p) ? p : [p]).join("، ");

let md = `# سيناريو التعليق الصوتي — ${data.slug}\n\n`;
md += `> مولَّد تلقائيًا من ملف بيانات المدرسة عبر \`node scripts/export-script.mjs\`. لا تعدّل هذا الملف يدويًا؛ عدّل \`narration\` في ملف البيانات.\n\n`;
md += `- الصوت: **${manifest.voice || "—"}** (رجل، عربية فصحى بلكنة عُمانية) · سرعة الإلقاء ${manifest.rate ?? "—"}\n`;
md += `- المدة الكلية للفيديو: ${data.video.durationInSeconds} ثانية · ${data.video.fps} إطارًا/ثانية\n`;
md += `- المقاطع الصوتية: \`public/voiceover/${data.slug}/<id>.mp3\`\n\n`;
md += `## استبدال الصوت بتسجيل بشري\n\n`;
md += `1. **مقطعًا بمقطع:** سجّل كل مقطع بالاسم نفسه (\`n01.mp3\` …) وضعه في المجلد أعلاه ثم شغّل \`npm run check\` للتأكد من أن المدد تناسب الفواصل (حدّث المدد بتشغيل \`npm run voice\` مع \`SKIP_TTS=1\` أو عدّل \`start\`).\n`;
md += `2. **ملفًا واحدًا كاملًا:** سجّل التعليق كاملًا متزامنًا مع التوقيتات أدناه، وضعه في \`public/audio/voiceover-full.mp3\`، ثم عيّن \`AUDIO.externalVoiceFile = "audio/voiceover-full.mp3"\` في \`src/config.ts\`.\n\n`;
for (const sc of data.timeline) {
  md += `## ${names[sc.id] ?? sc.id} (${sc.from}–${sc.to} ث)\n\n| المقطع | البداية | النهاية | النص | الصفحات |\n|---|---|---|---|---|\n`;
  for (const n of data.narration.filter((n) => n.start >= sc.from && n.start < sc.to)) {
    const d = segs[n.id]?.duration;
    md += `| ${n.id} | ${ts(n.start)} | ${d ? ts(n.start + d) : "—"} | ${n.text} | ${pages(n.pages)} |\n`;
  }
  md += "\n";
}
const outPath = join(root, "docs", "schools", data.slug, "SCRIPT.md");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, md);
console.log(`docs/schools/${data.slug}/SCRIPT.md written`);
