# Kotoba Beat (web)

A personal Japanese study game for PC and phone. It has a Reading Dojo (hiragana, katakana, starter kanji) and eight game modes (Garden, Story, Particle Train, Kanji Forge, Rhythm, Pitch Duel, Speak Slice and Shopkeeper) and a guided **Today** session.

Live site: https://ryanstisk-byte.github.io/kotoba-web/

- Plain HTML, CSS and JS with no build step. It works offline as a home-screen web app.
- Progress is saved in the browser on each device. Use Settings > Export / Import to move it between devices.
- When you change any file, bump `CACHE_VERSION` in `sw.js` so installed copies update.

## Voice clips and readings

The app ships its own Japanese voices (VOICEVOX, one per character, at normal and slow speed) as small MP3s in
`audio/`, so sound works on every device and offline; device voices are optional (Settings › Voice). Romaji/furigana
come from `js/readings.js`. Both are generated. After changing any Japanese text, run:

    python3 -m pip install pyopenjtalk-plus   # once; needs ffmpeg and node too
    VOICEVOX_DIR=/path/to/voicevox python3 tools/build_assets.py

`tools/build_assets.py` lists what VOICEVOX_DIR must hold (VOICEVOX CORE 0.16 wheel, its ONNX Runtime, the Open JTalk
dictionary and the .vvm voice models) and which voices are used. Voices used: VOICEVOX:四国めたん, VOICEVOX:白上虎太郎,
VOICEVOX:青山龍星, VOICEVOX:玄野武宏, VOICEVOX:東北イタコ, VOICEVOX:ずんだもん (credited in Settings, as their terms require).

It synthesizes only new lines, rewrites `js/clips.js`, `js/readings.js` and the precache list in `sw.js`. Then bump `CACHE_VERSION`.
