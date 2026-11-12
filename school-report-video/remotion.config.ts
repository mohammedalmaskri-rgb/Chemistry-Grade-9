import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
// عرض النصوص العربية والتدرجات بجودة أعلى
Config.setChromiumOpenGlRenderer("angle");

// متصفح مخصص (اختياري) — مثلًا في بيئات بلا إنترنت:
// REMOTION_BROWSER=/path/to/chrome-headless-shell npm run render
if (process.env.REMOTION_BROWSER) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
}
