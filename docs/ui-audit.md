# UI audit (October 2026)

Every screen was walked through at 390×844 (phone) and 1280×800 (desktop), light and dark. Screenshots come from
`node tools/screenshots.mjs <dir>`. Findings are ranked by how much they get in the way of a study session. Each one is
marked with how it was handled in the redesign.

## High impact

1. **Today isn't front and centre.** On a phone, the plan starts below the fold. Above it come the app name, a
   welcome line, up to three hint panels (iPhone install, Reading Dojo, sound check) and three stat tiles. The thing
   you came to do takes a scroll to reach. → *Today now leads: a hero card with the next block's Start button, then the
   plan. The hints and stat tiles moved below the plan (beside it on desktop), and a full Progress screen holds the rest.*
2. **No way around the app except back to home.** Settings is a gear icon, all nine modes sit at the bottom of the
   long home page, and there's no overview of progress. → *Phone gets a bottom tab bar (Today, Modes, Garden,
   Progress, Settings). Desktop gets the same five in the top bar.*
3. **Back is unreliable.** The ‹ button always jumps to home, and a deep link opened from a bookmark or the home
   screen has nothing to go back to, so the browser or iOS swipe-back leaves the app. → *A real history stack:
   ‹ steps back one screen. A deep link gets Today put underneath it. Esc goes back on PC.*
4. **No feedback that feels like a game.** Right answers change a colour and nothing else. There's no sound or
   movement, and finishing the whole day just reveals a plain card at the bottom. → *Hit and miss feedback (sound,
   haptics, an impact burst on hits, a gentle wobble on misses) and a full-screen reward when the day is done.*
5. **Desktop is a phone layout floating in empty space.** It's a narrow column with small type, the top bar icons
   are pushed to the far corners, and review cards have huge gaps. → *A wider layout with a two-column home and modes
   grid, centred top navigation, and type scaled up for a monitor.*

## Medium impact

6. **Latin text falls into a monospaced Japanese font.** Text marked `lang="ja"` uses a Japanese-first font stack,
   so the English in story chapter titles, shop feedback and kanji part names renders in the Japanese font's
   fixed-width Latin. → *One font stack: Latin UI fonts first, then Hiragino and Yu Gothic or Meiryo, for every
   element.*
7. **Too much help text in game screens.** Forge part tiles stack romaji, the part, and a name in mono type. The
   story line shows the reading line and romaji over the line at once. → *Tighter type hierarchy with smaller,
   dimmer secondary text. No information was removed.*
8. **No sense of style.** Pink buttons on beige and emoji icons read as a prototype. → *A shōnen look: heavy italic
   display type, ink outlines, a flame-orange accent with an electric-blue partner, and speed lines and impact
   frames only for big moments.*
9. **Disabled buttons look broken** (a washed-out pink "Hand it over"). Faded quiz options drop below readable
   contrast. → *A distinct disabled style, and faded options keep 3:1 contrast.*
10. **Text size is fixed.** Settings has no way to make Japanese bigger, and sizes are in px. → *A text-size setting
    (Small, Medium, Large, Extra large) that scales everything, because all sizes are now rem.*
11. **Furigana and romaji can crowd the line above** in large headings with tight line height, for example the
    story list titles. → *Ruby gets its own line spacing everywhere. A test checks that no reading overlaps other
    text on any screen.*

## Low impact

12. **Sound check hint shows forever** on the home screen, even after sound works. → *It moved into the help line,
    and Settings keeps a permanent link.*
13. **Screen changes are abrupt** (instant swap, and the scroll jumps). → *Short cross-fade and slide transitions,
    turned off under reduced motion.*
14. **Focus ring is a thin blue outline** that disappears on the pink buttons. → *A thick two-tone focus ring that
    shows on every surface.*
15. **Some icon-only controls have no visible label** (the 🐢, ふa and ⚙︎ buttons). They do have accessible names.
    → *Kept the names, added tooltips, and the tab bar has text labels.*
