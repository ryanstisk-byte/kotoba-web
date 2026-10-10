# Kotoba Beat (web)

A personal Japanese study game for PC and phone. It has a Reading Dojo (hiragana, katakana, starter kanji) and thirteen game modes (Garden, Story, Particle Train, Kanji Forge, Conjugation Dojo, Sentence Builder, Katakana Rush, Rhythm, Pitch Duel, Speak Slice, Shopkeeper, Listening Lab and Numbers & Time) and a guided **Today** session.

Live site: https://ryanstisk-byte.github.io/kotoba-web/

- Plain HTML, CSS and JS with no build step. It works offline as a home-screen web app.
- Progress is saved in the browser on each device. To keep devices in step, turn on Settings > Sync across devices (optional, below). Export / Import still works as a manual backup.
- When you change any file, bump `CACHE_VERSION` in `sw.js` so installed copies update.

## Garden review cards

The Garden's daily watering (`store.dailyGardenQueue`) mixes several kinds of card, each with its own FSRS schedule:

| Card | What you do | Comes in |
|---|---|---|
| 👁 Meaning | See the Japanese, recall the meaning. | Every word. The plant's growth stage follows this card only. |
| 🎧 Listen | Hear the word's clip with no text, recall the meaning. | Once a word's Meaning card reaches stage 3. |
| 🗣 Say it | See the English (the example's English as an optional hint) and say the Japanese. Graded by speech recognition when it's there; otherwise, or in Quiet mode, you grade yourself after the reveal. | After the word's Listen card. |
| 📐 Grammar | Fill the blank in one of a course grammar point's example sentences. The examples rotate. | When the lesson is read or the unit is done. |
| 🔁 Conjugation | Pick a conjugated form, for example the て-form of 食べる. | When the form is practised in Conjugation Dojo. |

The daily review cap covers every card. New cards each day:
- up to 5 words
- up to 2 grammar cards
- up to 3 Listen / Say it cards

Fewer come in while recent accuracy is under ~80%, and none under ~70% (`tuning.js`).

Other modes can read the due grammar cards with `store.dueGrammar()` and record results with `store.reviewGrammar(key, ok)`. The cards and their fill-in blanks live in `js/grammar-cards.js`.

**Stuck words.** A card missed 4 times is marked as needing help. Its plant shows a 🩹; plants never wilt or die. The next time the card comes up, a help panel shows first:
- the word slowed down
- an example sentence
- a picture mnemonic (`js/mnemonics.js`, English only, so no new clips)
- any look-alike or sound-alike word side by side (`js/word-help.js`, drawn from the app's own words, so each one can be played)

Two right answers in a row clear the mark. The Garden screen's "Needs help" button practises these cards on purpose.

**Saved progress.** These cards are saved progress v6:
- `items[id].dirs` holds the Listen and Say it cards.
- `grammar` holds the grammar cards.
- `lapses`, `help` and `ok2` track the needs-help mark.
- `newd` and `newg` count each day's new directions and grammar cards.

The migration plants grammar cards for lessons already read and conjugation forms already practised. The sync merge keeps each card's own most recent review.

## Quick recap

Anything that teaches something new ends with a short recap quiz (`js/recap.js`, one shared component). Each place builds its own questions:

| Where | Questions |
|---|---|
| Course lessons | 4-6 on the lesson's grammar points and examples. Comes before the practice list, including the Today Input block. |
| Story course scenes | 2-3 on the scene's words and one of its lines, for scenes that stop partway through a chapter. Whole chapters keep their own comprehension questions. |
| Garden | The day's new words, after watering. |
| Kanji Forge | After each round of three new kanji. |

How it works:
- **Question types.** It asks for recall: hear it and pick the meaning, see the meaning and pick the Japanese, fill the particle, or put a short sentence in order.
- **Wrong options.** Particle questions only offer options that would make the sentence wrong.
- **Reading help.** It's switched off (`data-noruby`) wherever furigana would give the answer away.
- **Misses.** A miss shows the answer with a one-line reason, and the question comes back once at the end. The missed item's Garden word comes up for review by tomorrow (`store.recapMissed`).
- **Difficulty.** It shows three options instead of four while a skill's recent accuracy is under ~80%, to stay near 85%.
- **Never blocking.** It's always skippable, and the lesson or block already counts as done.
- **Audio.** It only speaks lines that already have VOICEVOX clips. Quiet mode shows the Japanese instead of playing it.

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
- `tests/garden-cards.spec.js`: Listen and Say it cards, grammar and conjugation cards, the needs-help mark and panel, the daily limits, and the v5 → v6 migration (`tests/fixtures/progress-v5.json`).
- `tests/recap.spec.js`: the recap quiz in lessons, story scenes, the Garden and Kanji Forge (misses, retries, skipping, quiet mode, reading help, earlier Garden reviews, every spoken line having a clip).
- `tests/sync.spec.js`: the sync merge (phone-vs-PC conflict, idempotence, mined-line clashes), and syncing against a mocked api.github.com (connect, find the gist, the automatic syncs, offline, bad token, Disconnect, the token never leaking).
- `tests/offline.spec.js`: the service worker precaches everything and the app works with no network.
- `tests/smoke.spec.js` and `tests/store.spec.js`: settings, the `#/check` screen, layout and store bookkeeping.

Every test fails on any console error. If you change the shape of the saved progress, add a migration and a new fixture
next to `progress-v1.json` with a test that loads it.
