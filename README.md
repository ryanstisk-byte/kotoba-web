# Kotoba Beat (web)

A personal Japanese study game for PC and phone. It has a Reading Dojo (hiragana, katakana, starter kanji) and thirteen game modes (Garden, Story, Particle Train, Kanji Forge, Conjugation Dojo, Sentence Builder, Katakana Rush, Rhythm, Pitch Duel, Speak Slice, Shopkeeper, Listening Lab and Numbers & Time) and a guided **Today** session.

Live site: https://ryanstisk-byte.github.io/kotoba-web/

- Plain HTML, CSS and JS with no build step. It works offline as a home-screen web app.
- Progress is saved in the browser on each device. To keep devices in step, turn on Settings > Sync across devices (optional, below). Export / Import still works as a manual backup.
- When you change any file, bump `CACHE_VERSION` in `sw.js` so installed copies update.

## Sync across devices (optional)

Settings > Sync across devices keeps progress the same on the PC and the iPhone (Safari and the Home Screen app) through one private GitHub gist. It is the app's only network call outside its own site, and it does nothing until a token is pasted.

- **Token.** A fine-grained GitHub token with only the Gists permission (read and write). It is stored only on that device (localStorage key `kotobaBeat.sync`), kept apart from progress so it never appears in an export code, and sent only to `api.github.com`. Disconnect forgets the token and the gist id; the gist stays on GitHub.
- **Gist.** The first device makes a private gist holding `kotoba-beat-progress.json`. Other devices find it by that file name and remember its id.
- **When it syncs.** When the app opens or comes back into view, after each finished Today block or game, when the tab is hidden, and on Sync now.
- **Merging.** It never overwrites. `mergeProgress` in `js/store.js` is a pure function:
  - each review item keeps the copy with the most recent review
  - cleared lessons, chapters, forged kanji and course units are unioned
  - counters keep the larger value
  - mined Story lines from both devices are kept
  - settings stay per device
- **Failures.** Being offline or a bad token never touches progress or interrupts a game. Settings shows a calm note, and the next sync tries again. A synced copy from a newer app version is left alone until this device updates.
- **Reset.** With sync on, Reset only erases this device, and the next sync brings the progress back. Disconnect first to start over.

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
- `tests/new-modes.spec.js`: Listening Lab, Conjugation Dojo, Sentence Builder, Katakana Rush and Numbers & Time: right and
  wrong answers, skill grading, the Garden, Quiet mode, and finishing each as a Today block.
- `tests/today.spec.js`: the Today plan for each weekday, Short and Quiet sessions, beginners, and running every block.
- `tests/course.spec.js`: the guided course (path, units, lesson, grammar search, Today drawing from the current unit, unit completion, the saved `course` field).
- `tests/progress.spec.js`: saved progress loads with nothing lost (`tests/fixtures/progress-v1.json`), export/import, reload, reset.
- `tests/sync.spec.js`: the sync merge (phone-vs-PC conflict, idempotence, mined-line clashes), and syncing against a mocked api.github.com (connect, find the gist, the automatic syncs, offline, bad token, Disconnect, the token never leaking).
- `tests/offline.spec.js`: the service worker precaches everything and the app works with no network.
- `tests/smoke.spec.js` and `tests/store.spec.js`: settings, the `#/check` screen, layout and store bookkeeping.

Every test fails on any console error. If you change the shape of the saved progress, add a migration and a new fixture
next to `progress-v1.json` with a test that loads it.
