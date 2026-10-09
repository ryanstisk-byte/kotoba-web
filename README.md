# Kotoba Beat (web)

A personal Japanese study game for PC and phone. It has a Reading Dojo (hiragana, katakana, starter kanji) and eight game modes (Garden, Story, Particle Train, Kanji Forge, Rhythm, Pitch Duel, Speak Slice and Shopkeeper) and a guided **Today** session.

Live site: https://ryanstisk-byte.github.io/kotoba-web/

- Plain HTML, CSS and JS with no build step. It works offline as a home-screen web app.
- Progress is saved in the browser on each device. Use Settings > Export / Import to move it between devices.
- When you change any file, bump `CACHE_VERSION` in `sw.js` so installed copies update.

## Voice clips and readings

The app ships its own Japanese voice (Open JTalk's "mei" voice) as small MP3s in `audio/`, so sound works on every
device and offline; device voices are optional (Settings › Voice). Romaji/furigana come from `js/readings.js`.
Both are generated. After changing any Japanese text, run:

    python3 -m pip install pyopenjtalk-plus   # once; needs ffmpeg and node too
    python3 tools/build_assets.py

It synthesizes only new lines, rewrites `js/clips.js`, `js/readings.js` and the precache list in `sw.js`. Then bump `CACHE_VERSION`.
