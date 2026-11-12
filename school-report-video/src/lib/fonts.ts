import { continueRender, delayRender, staticFile } from "remotion";

const ARABIC = "U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC, U+102E0-102FB, U+10E60-10E7E, U+10EC2-10EC4, U+10EFC-10EFF, U+1EE00-1EEFF";
const LATIN = "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";

const faces: { family: string; file: string; weight: number }[] = [
  ...[400, 500, 700, 800, 900].map((w) => ({ family: "Noto Kufi Arabic", file: "noto-kufi-arabic", weight: w })),
  ...[300, 400, 500, 600, 700].map((w) => ({ family: "IBM Plex Sans Arabic", file: "ibm-plex-sans-arabic", weight: w })),
];

let started = false;

/** تحميل الخطوط محليًا من public/fonts — بلا اعتماد على الإنترنت أثناء التصدير */
export const loadFonts = () => {
  if (started || typeof document === "undefined") return;
  started = true;
  const handle = delayRender("Loading Arabic fonts");
  const all: Promise<FontFace>[] = [];
  for (const f of faces) {
    for (const [subset, range] of [["arabic", ARABIC], ["latin", LATIN]] as const) {
      const face = new FontFace(f.family, `url(${staticFile(`fonts/${f.file}-${subset}-${f.weight}-normal.woff2`)}) format('woff2')`, {
        weight: String(f.weight),
        style: "normal",
        unicodeRange: range,
        display: "block",
      });
      (document.fonts as unknown as { add: (f: FontFace) => void }).add(face);
      all.push(face.load());
    }
  }
  Promise.all(all)
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error("Font load failed", e);
      continueRender(handle);
    });
};
