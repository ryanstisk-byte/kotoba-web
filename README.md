# Kotoba Beat (web)

A personal Japanese study game for PC and phone. It has a Reading Dojo (hiragana, katakana, starter kanji) and eight game modes (Garden, Story, Particle Train, Kanji Forge, Rhythm, Pitch Duel, Speak Slice and Shopkeeper) and a guided **Today** session.

Live site: https://ryanstisk-byte.github.io/kotoba-web/

- Plain HTML, CSS and JS with no build step. It works offline as a home-screen web app.
- Progress is saved in the browser on each device. Use Settings > Export / Import to move it between devices.
- When you change any file, bump `CACHE_VERSION` in `sw.js` so installed copies update.

## N5 deck

`tools/n5.tsv` holds a 686-word JLPT N5 deck in teaching order: kana, meaning, pitch accent, and an example sentence
with its reading. The Garden introduces it, 5 new words a day at most, after the starter phrases, skipping words already
planted from Story or Kanji Forge. Each word is voiced with its listed pitch accent and each example sentence is voiced
too (normal and slow). Readings were checked against JMdict (EDRDG, CC BY-SA 4.0). After editing the TSV, run the
build below; it regenerates `js/n5.js`.

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

## Tests

The site stays build-free; `package.json` only pulls in Playwright for the tests. Every pull request runs them on GitHub
Actions (`.github/workflows/tests.yml`).

    npm install
    npx playwright install chromium   # once
    npm test                          # Playwright, at phone (390x844) and desktop (1280x800) size
    npm run test:static               # precache list, clips, every spoken line has a clip

- `tests/modes.spec.js`: every mode loads and completes one interaction.
- `tests/story-saga.spec.js`: Story chapters 5-12 (data, furigana, questions), the chapter map and no-furigana challenge, "Paste a line" into the Garden, and the v3 saved shape (`tests/fixtures/progress-story.json`).
- `tests/today.spec.js`: the Today plan for each weekday, Short and Quiet sessions, beginners, and running every block.
- `tests/progress.spec.js`: saved progress loads with nothing lost (`tests/fixtures/progress-v1.json`), export/import, reload, reset.
- `tests/offline.spec.js`: the service worker precaches everything and the app works with no network.
- `tests/smoke.spec.js` and `tests/store.spec.js`: settings, the `#/check` screen, layout and store bookkeeping.

Every test fails on any console error. If you change the shape of the saved progress, add a migration and a new fixture
next to `progress-v1.json` with a test that loads it.
