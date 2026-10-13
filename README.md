# Kotoba Beat (web)

A personal Japanese study game for PC and phone. It has a Reading Dojo (hiragana, katakana, starter kanji) and fourteen game modes (Rival Battle, Garden, Story, Particle Train, Kanji Forge, Conjugation Dojo, Sentence Builder, Katakana Rush, Rhythm, Pitch Duel, Speak Slice, Shopkeeper, Listening Lab and Numbers & Time) and a guided **Today** session.

Live site: https://rykoha.github.io/kotoba-web/

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

## Rival Battle

A boss fight built entirely from review (`js/modes/rival.js`, attacks in `js/rival-items.js`, lines in `js/rival-data.js`).

- **Rivals.** Kaito challenges you from the start. Master joins after story chapter 4, Sora after chapter 6 and Granny Kiku after chapter 8. Each speaks in their story voice. Later rivals have a little more stamina.
- **Attacks** come only from what you've already met, mixed together in one fight:
  - Garden words you've reviewed: meaning from the Japanese, or the Japanese from the meaning. Each word always asks the same way round. Due words come first.
  - Reading Dojo kana you've reviewed.
  - Conjugation Dojo forms, Particle Train trains and Numbers & Time scenes you've already practised, from the skill model's per-item records.
  - With fewer than 6 attacks available, the rivals wait.
- **Answers.** Tap, or press Say it and answer out loud (speech recognition, same lenient matching as the Garden). Quiet mode is tap only.
- **Combo.** 4 right in a row is a finisher: a short slash animation and a voiced shout from Ren. It hits 3 times. Reduced motion skips the animation.
- **Misses cost nothing.** The rival says a counter line in their voice, then the answer is played, and the attack comes back 3 turns later.
- **No losing.** 3 misses in a row, or under 60% after 6 attacks, turns the fight into a training montage. Each missed item is shown and heard, then drilled once. Then the rival bows with a line of respect. A fight ends when the rival is down, or after 16 attacks with a respect ending.
- **About 85%.** Options drop from 4 to 3 while a skill's recent accuracy is under ~80%. While the fight's own accuracy is under 80% the next attack is a well-known one; over 90%, a due or less-known one.
- **Grading.** Everything goes through the store: due Garden words with `store.reviewCard`, due kana with `recordDojo`, due conjugation cards with `reviewGrammar`, and every first try with `store.grade`. Reviews, accuracy and Progress update as in the other modes. Nothing new is saved: no wins, no counters.
- **Today.** On Saturdays and Sundays an **optional** Rival Battle block appears, once there's enough to fight with. Optional blocks never count toward finishing the day or the day's minutes.

## Icons

The app draws its icons as small line drawings instead of emoji: original 24×24 art in `js/icon-art.js`, with round 2px strokes in the text colour, so they follow light and dark mode and the text size.

Templates still write the emoji. `js/icons.js` swaps each one for its drawing as screens render, the same way reading help annotates text, so toasts, banners and every mode are covered. Emoji added later are caught too, once they're added to `EMOJI_ICONS` with a drawing.
- An icon next to words is hidden from screen readers.
- An icon that stands alone (a plant, a customer) is a named image.

`tests/icons.spec.js` checks that no screen shows an emoji.

## Exam readiness and the mock JLPT

**Road to N5.** Today and Progress show how close you are to a mock exam for the next JLPT level you haven't done (`js/readiness.js`). Each area fills toward a target:

| Area | What counts | Target |
|---|---|---|
| Vocabulary | N5 deck words at the Seedling stage or later | 75% of the deck |
| Kanji | kanji learned in the Reading Dojo or forged | 80% of the ones the app teaches |
| Grammar | N5 course grammar points whose Garden card holds for a week | 80% |
| Listening | first-try listening accuracy, last 4 weeks | 80% over 40+ answers |
| Reading | kana learned, and Story chapters cleared | all kana, 6 chapters |

"Ready for a mock" comes when the areas average 90% of their targets with none under 60%. "Later" quiets it for a week. Nothing is locked: the mini mock is open any time.

**Done levels drop off.** A level is done once a full mock is passed or the real test is marked as passed on Progress (which can be undone). Its meter then gives way to the next level. N4 has no lessons or mock yet, so its meter only shows the N5 words grown strong and the N4 bridge units.

**Mock JLPT** (`#/exam`, `js/exam.js`, questions in `js/exam-data.js`). Every question is made from the app's own content, so every spoken line already has a clip:
- Vocabulary: kanji reading with near-miss wrong readings (long vowels, voicing, っ, ゃゅょ), which spelling, word in context. No reading help.
- Grammar: grammar-card blanks and the starred slot (Sentence Builder sentences whose four slots have only one right order).
- Reading: Story chapters with their comprehension questions.
- Listening: Listening Lab scenes, Numbers & Time, and N5 example sentences. Quiet mode shows the lines instead.

There are two formats: a mini mock (no clock) and a full mock timed like the real N5 (20 / 40 / 30 minutes, with pause). It's scored like the real N5: 0-120 for vocabulary, grammar and reading, 0-60 for listening, a pass at 80 with minimums of 38 and 19. Every question counts the same here, so the score is a guide. Results show each part with where to practise, and every miss with its answer. Misses come back in the Garden. Recently asked questions are remembered so the next mock picks fresh ones.

Saved progress v9 adds `exam`: `history`, `real` (marks by level), `seen` (recent question ids) and `later`. The sync merge keeps each mock once, the latest real-test mark, the union of seen ids and the later "Later".

## Pronunciation check (optional)

A 🎤 **Check my pronunciation** button sits next to the 🔊 wherever a new word or phrase is taught:
- the story's "New words in this scene" screen
- new Garden cards, including the N5 deck's new words, after the reveal
- the stuck-word help panel
- course lesson examples
- a unit's key N5 words

Kana and kanji letter lessons don't have it. Every button opens one shared panel (`js/pron.js`). It runs only on the device, with no paid services, and does three checks:

- **Sounds.** Speech recognition (`Recognizer`) hears the attempt, which is compared with the target mora by mora after normalising kana (`pron-analysis.js`). Recognition is lenient and sometimes tidies up what it hears, so the panel says a match means "close enough".
- **Pitch accent.** `PitchTracker` records the learner's pitch, and each mora's pitch is compared with the word's high/low pattern. The pattern comes from the N5 deck's accent or a phrase's melody when known, otherwise from the app's own clip. Scoring follows what listeners hear: where the pitch drops and the direction of each step (`js/pitch-score.js`), not height or step size. Whispered beats (the す in です) and っ are left out. The panel draws the learner's line over the target melody on a fixed semitone scale, so a small wobble stays small.
- **Length and rhythm.** The recording is lined up with the app's VOICEVOX clip of the word, using dynamic time warping on loudness, voicing and pitch. That gives how long each mora was held, which catches:
  - long vowels (おばさん vs おばあさん)
  - a missing small っ pause (きて vs きって)
  - ん as its own beat
  - い/う that should go quiet (です, ～ます)
  - rushing

**Feedback:**
- A generous **Great / Close / Try again**, never a number.
- At most two tips, from a fixed rule table (`js/pron-tips.js`: issue → tip + example).
- Buttons to hear the model again (and slowly), try again, and play the model and then the learner's recording side by side.

**Without speech recognition**, the sound check is off: Chrome and Edge need the internet for it, and iPhone needs Dictation. The panel says so in one line and still gives pitch and length feedback. Mic problems use `micHelp()` and point to `#/check`.

Results feed `store.grade` with skill `'speaking'`; nothing is ever lost on a miss. Settings › Microphone › Pronunciation check hides the buttons (saved progress v7 adds `settings.pronCheck`). Quiet mode hides them too.

## Pitch Coach

A way to learn to steer pitch beat by beat (`js/pitch-coach.js`, maths in `js/pitch-score.js`, clip handling in `js/model-clip.js`). It opens from the pronunciation panel (**Pitch Coach**), as a warm-up from Rhythm and Pitch Duel, and as **Practise just this step** when the check finds a pitch problem.

- **Live line.** While the learner hums or speaks, their pitch is drawn as it comes over the target, median-filtered so single bad readings don't jump. The scale is fixed: ±8 semitones around their comfortable middle pitch. That middle is learned from a 2-second "say あ" the first time, then drifts slowly with each attempt. It's saved per device in `settings.voice` (`{ mid, lo, hi, n }`) and never synced. The comfortable band is shaded behind.
- **Target.** High and low steps timed to the app's own clip, with the drop marked. **Bigger** exaggerates the steps for practice. Whispered beats are drawn dotted and not scored, with a note saying why.
- **Ladder.** Hum it → Ma-ma-ma → the word → the word + が. The model plays first: a soft tone in the learner's own range for the hum and ma steps (and + が), the real clip for the word. Any step can be chosen; the next one is suggested after a Great or two Closes. Only the + が step tells flat words from words that drop after their last beat (はなが nose vs flower).
- **Just this step.** Loops two beats cut from the real clip (for example ば → あ in おばあさん) until right twice, then goes back to the whole word.
- **Ears first.** Before the first session on a word (and any time after), the word plays two or three ways and the learner taps the beat where the pitch drops, or "No drop". The ways are the word in voice 0 and two of the app's other VOICEVOX voices, always at normal speed. Every N5 word has clips in voices 1 and 3 for this (normal speed only), with each beat's pitch set from the word's accent so the drop is always where the quiz says; voice 2 is left out because it barely follows a set pitch. Starter phrases use their Pitch Duel clips in voices 1-3. Anything without them falls back to the same clip played a little lower and higher. A miss shows the answer and plays it again. Words done are kept in `coach.ears`, which is synced.

Everything feeds `store.grade` with skill `'pitch'`. Saved progress v8 adds `settings.voice` and `coach`.

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

Most lines get a normal and a slow clip; the N5 words' extra voices 1 and 3 (for Pitch Coach's Ears first) are normal speed only, with pitch shaped from the accent. It synthesizes only new lines, rewrites `js/clips.js`, `js/readings.js`, `js/words.js` (where romaji puts spaces between words) and the precache list in `sw.js`. Then bump `CACHE_VERSION`.

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
- `tests/pron.spec.js`: the pronunciation check. It covers mora, sound, length and pitch analysis on synthetic data, the tip table, where the 🎤 appears, and the flow with a fake mic and recognizer (no recognition, a blocked mic, skipping), plus the v6 → v7 migration (`tests/fixtures/progress-v6.json`).
- `tests/exam.spec.js`: the mock JLPT's question bank and scoring (in Node), the readiness meter on Today and Progress, "ready for a mock", marking the real test, a mini mock, the full mock's clock and pause, misses going into the Garden, and the v8 → v9 migration and sync merge (`tests/fixtures/progress-v8.json`).
- `tests/pitch-coach.spec.js`: the Pitch Coach. Unit tests for the semitone scale, median filter, voice learning, scoring and が, then a fake mic (an oscillator in place of `getUserMedia`) sings known pitch curves to drive the live line, the ladder, Bigger, just this step, ears first, the first-time voice step and the warm-up buttons, plus the v7 → v8 migration (`tests/fixtures/progress-v7.json`).
- `tests/garden-cards.spec.js`: Listen and Say it cards, grammar and conjugation cards, the needs-help mark and panel, the daily limits, and the v5 → v6 migration (`tests/fixtures/progress-v5.json`).
- `tests/recap.spec.js`: the recap quiz in lessons, story scenes, the Garden and Kanji Forge (misses, retries, skipping, quiet mode, reading help, earlier Garden reviews, every spoken line having a clip).
- `tests/rival.spec.js`: Rival Battle. Rivals unlocking, attacks only from what was learned, combos and the finisher, counters and comebacks, the training montage, Quiet mode, a spoken answer (fake recognizer), every line voiced and playable, and the optional weekend block.
- `tests/sync.spec.js`: the sync merge (phone-vs-PC conflict, idempotence, mined-line clashes), and syncing against a mocked api.github.com (connect, find the gist, the automatic syncs, offline, bad token, Disconnect, the token never leaking).
- `tests/offline.spec.js`: the service worker precaches everything and the app works with no network.
- `tests/smoke.spec.js` and `tests/store.spec.js`: settings, the `#/check` screen, layout and store bookkeeping.

Every test fails on any console error. If you change the shape of the saved progress, add a migration and a new fixture
next to `progress-v1.json` with a test that loads it.
