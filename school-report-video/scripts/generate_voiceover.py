#!/usr/bin/env python3
"""
توليد التعليق الصوتي لكل مقطع من نص السيناريو الموجود في ملف بيانات المدرسة.

- الصوت الافتراضي: ar-OM-AbdullahNeural (رجل، لهجة عُمانية فصيحة) عبر خدمة Microsoft Edge TTS.
- يحفظ ملفًا لكل مقطع في public/voiceover/<slug>/<id>.mp3
- يكتب المدد الفعلية إلى src/data/generated/voiceover.json لاستخدامها في المزامنة وخفض الموسيقى.
- يتجاوز المقاطع التي لم يتغير نصها (ذاكرة مؤقتة عبر hash).

الاستخدام:
    pip install edge-tts
    npm run voice                       # الصوت الافتراضي
    VOICE=ar-SA-HamedNeural npm run voice
    RATE=-8% npm run voice              # إبطاء الإلقاء
خلف وكيل شبكة بشهادة خاصة: EDGE_TTS_CA=/path/to/ca.pem npm run voice

تسجيل بشري: ضع ملفات n01.mp3 … في public/voiceover/<slug>/ ثم:
    SKIP_TTS=1 npm run voice            # يقيس المدد فقط دون توليد صوت
"""
import asyncio, hashlib, json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICE = os.environ.get("VOICE", "ar-OM-AbdullahNeural")
RATE = os.environ.get("RATE", "-4%")
PITCH = os.environ.get("PITCH", "-2Hz")

SKIP_TTS = os.environ.get("SKIP_TTS") == "1"
ca = os.environ.get("EDGE_TTS_CA") or (os.path.exists("/root/.ccr/ca-bundle.crt") and "/root/.ccr/ca-bundle.crt")
if ca:
    import certifi
    certifi.where = lambda: ca  # edge-tts يبني سياق SSL من certifi

if not SKIP_TTS:
    import edge_tts  # noqa: E402


def duration(path: str) -> float:
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path])
    return round(float(out.decode().strip()), 3)


async def synth(text: str, dest: str):
    """يولّد الصوت ويعيد توقيت كل كلمة (بالثواني من بداية الملف بعد قص الصمت)."""
    raw = dest + ".raw.mp3"
    for attempt in range(4):
        words = []
        try:
            com = edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH, boundary="WordBoundary")
            with open(raw, "wb") as f:
                async for chunk in com.stream():
                    if chunk["type"] == "audio":
                        f.write(chunk["data"])
                    elif chunk["type"] == "WordBoundary":
                        words.append({"w": chunk["text"], "t": chunk["offset"] / 1e7})
            break
        except Exception as e:  # شبكة متقطعة
            if attempt == 3:
                raise
            print(f"   retry ({e.__class__.__name__})")
            await asyncio.sleep(2 * (attempt + 1))
    # قص الصمت في البداية والنهاية + توحيد مستوى الصوت + نبرة إذاعية دافئة خفيفة
    subprocess.check_call([
        "ffmpeg", "-y", "-loglevel", "error", "-i", raw,
        "-af", "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
               "equalizer=f=140:t=q:w=1:g=2,equalizer=f=3500:t=q:w=1.2:g=1.5,loudnorm=I=-16:TP=-1.5:LRA=7",
        "-ar", "44100", "-ac", "1", "-b:a", "160k", dest,
    ])
    os.remove(raw)
    # قص الصمت الابتدائي يزيح التوقيت بمقدار زمن أول كلمة تقريبًا
    lead = max(0.0, words[0]["t"] - 0.03) if words else 0.0
    return [{"w": x["w"], "t": round(max(0.0, x["t"] - lead), 3)} for x in words]


async def main():
    subprocess.check_call(["node", os.path.join(ROOT, "scripts", "export-data.mjs")])
    data = json.load(open(os.path.join(ROOT, "out", "report.json"), encoding="utf-8"))
    slug = data["slug"]
    out_dir = os.path.join(ROOT, "public", "voiceover", slug)
    os.makedirs(out_dir, exist_ok=True)
    manifest_path = os.path.join(ROOT, "src", "data", "generated", f"{slug}.voice.json")
    try:
        old = json.load(open(manifest_path, encoding="utf-8"))
    except Exception:
        old = {}
    old_segments = old.get("segments", {}) if old.get("school") == slug and old.get("voice") == VOICE else {}

    segments = {}
    for seg in data["narration"]:
        sid, text = seg["id"], seg["text"]
        h = hashlib.sha1(f"{VOICE}|{RATE}|{PITCH}|{text}".encode()).hexdigest()[:12]
        dest = os.path.join(out_dir, f"{sid}.mp3")
        if SKIP_TTS:
            if not os.path.exists(dest):
                print(f" ✗ {sid} missing {os.path.relpath(dest, ROOT)}")
                continue
            segments[sid] = {"duration": duration(dest), "hash": "external", "words": []}
            print(f" ⏺ {sid} (external) {segments[sid]['duration']}s")
            continue
        if os.path.exists(dest) and old_segments.get(sid, {}).get("hash") == h and "words" in old_segments[sid]:
            segments[sid] = old_segments[sid]
            print(f" = {sid} (cached) {segments[sid]['duration']}s")
            continue
        print(f" ▶ {sid} …")
        words = await synth(text, dest)
        segments[sid] = {"duration": duration(dest), "hash": h, "words": words}
        print(f"   {segments[sid]['duration']}s")

    json.dump({"school": slug, "voice": "external" if SKIP_TTS else VOICE, "rate": RATE, "segments": segments}, open(manifest_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"\nmanifest → {os.path.relpath(manifest_path, ROOT)}")
    # تحقق التوقيت مباشرة
    sys.exit(subprocess.call(["node", os.path.join(ROOT, "scripts", "check-timing.mjs")]))


asyncio.run(main())
