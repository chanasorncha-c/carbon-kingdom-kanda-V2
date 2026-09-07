# Carbon Kingdom — Setup & Testing Guide

Carbon Kingdom is a complete, single-page web game that teaches IUPAC
organic-chemistry nomenclature to Thai grade 11–12 students, with a nickname
+ avatar setup screen, 5 levels (Chain Hunt → Direction Duel → Bond
Detective → Substituent Market → Boss Battle), Solo / Class Race / Team
Battle multiplayer modes, a live teacher dashboard, and an end-of-game
report with CSV/print export. See `GDD.md` for the full design.

## Requirements

- Node.js 18+ (tested on Node 22)

## Run it locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). It's mobile-
responsive — open the same URL on a phone on the same Wi-Fi network (Vite
prints a "Network:" URL; use `npm run dev -- --host` if it doesn't show one).

## Build a production bundle

```bash
npm run build   # outputs to dist/
npm run preview # serves the built dist/ locally, to sanity-check the build
```

`npm run build` also type-checks the whole project (`tsc -b`) before
bundling, so a red build output means a real type error, not just a Vite
quirk.

## The two "apps" in one build

- **`/` (or `index.html`)** — the student game: nickname/avatar setup → Solo
  or join a classroom room → level picker → the 5 levels → end-of-game
  report.
- **`/#teacher`** (open `index.html#teacher`, or add `#teacher` to whatever
  URL you're hosting the built site at) — the teacher dashboard: create a
  Class Race or Team Battle room, display the 6-digit room code on the
  classroom screen/projector, watch the live leaderboard, progress grid, and
  most-missed-question heatmap, and start/end the game. No login — it's a
  hash route so it works on any static host with zero server config.

## What to test, level by level

Play through the nickname/avatar setup first (name required, ≤16
characters, 8 avatar colors), then either "เล่นคนเดียว" (solo, skips
multiplayer entirely) or join a room a teacher dashboard has created.

### Level 1 — Longest Chain Hunt (ล่าโซ่ที่ยาวที่สุด)
Click carbons in sequence to trace the longest continuous chain in each
structure (click the previous atom to undo one step). Around half of the 25
questions are deliberate "traps" where a branch chain beats the chain that
just *looks* longest across the middle row. "Get a hint" costs 30 points.

### Level 2 — Direction Duel (ดวลทิศทางเลข)
Pick which end to number from. A side-by-side table always shows both
directions' locants with the winner highlighted. Several of the 25
questions are conflict traps where a double/triple bond must win the lowest
locant even though the substituents would prefer the other direction; one
question has the bond exactly at the chain midpoint (a genuine tie),
correctly falling through to the substituent rule.

### Level 3 — Numbering City (เมืองกำหนดเลข)
The chain is a plain, unbranched structure with 1-3 substituents, already
numbered correctly (every backbone carbon shows its real IUPAC locant, by
the same lowest-locant rule Level 2 teaches). No bond-clicking, no complex
structures — the whole task is reading that numbering back correctly, in
one of 3 rotating multiple-choice shapes: "which locant is substituent X
at?", "what substituent is at locant N?", or (2-3 substituent questions)
"what's the full locant set?".

### Level 4 — Name Factory (โรงงานผลิตชื่อ)
Tap substituent cards into the correct alphabetical order to build the full
prefix list; repeated substituents auto-merge into di-/tri- cards. Decoy
cards test wrong locants and wrong substituents. Only 8 substituents are in
play here (and everywhere else in the game): methyl, ethyl, propyl, butyl,
fluoro, chloro, bromo, iodo — all 8 sort alphabetically by their plain name
with no "tert-"/"iso-" exceptions, so alphabetization stays a clean,
teachable rule.

### Level 5 — IUPAC Castle (ปราสาทไอยูแพค)
The boss battle: combines Level 3 (locants) and Level 4 (alphabetized
prefixes) into one full IUPAC name, in 2 rotating modes — **Name Builder**
(tap name-fragment cards in order, e.g. "3-chloro-" + "5-methyl" +
"hexane" → "3-chloro-5-methylhexane") and **Free Typing** (type the full
name; grading normalizes case/spacing/hyphen-dash so small formatting
differences aren't marked wrong). Every structure here is a plain alkane
chain using the same 8 substituents as Level 4 — no double/triple bonds.
Awards the "จอมเซียน IUPAC" (IUPAC Master) badge.

### Multiplayer (Solo / Class Race / Team Battle)
1. On the classroom display, open `index.html#teacher`, pick **Class Race**
   or **Team Battle**, and click "สร้างห้อง" (Create room) — a 6-digit code
   appears big on screen.
2. On each student device, go through setup → "เข้าร่วมห้องเรียน" (Join a
   classroom room) → enter the code. Team Battle rooms auto-balance new
   joiners onto whichever team (A/B) currently has fewer players.
3. Everyone sits in the lobby (shows the joined roster live) until the
   teacher clicks "เริ่มเกม" (Start game) on the dashboard — every joined
   device jumps to the level picker automatically, no refresh needed.
4. As students play, the teacher dashboard updates live: a leaderboard
   (score, team badge), a progress grid (which level each student is
   currently on/has finished), and a "most-missed questions" heatmap built
   from every wrong answer across the room. A red banner calls out any
   student stuck on 3+ wrong answers in a row.

**Important — this ships with the local (same-device) sync adapter**:
rooms are stored in `localStorage` and broadcast via `BroadcastChannel`, so
the teacher tab and student tabs must be **open in the same browser on the
same computer** to talk to each other (e.g. one shared classroom PC with
several browser tabs/windows, or for local dev/testing). This works great
for testing the whole flow end-to-end without any backend setup. For real
cross-device play (each student on their own phone/laptop), see "Enabling
real multiplayer" below.

### End-of-game report
From the level picker, "📊 ดูรายงานของฉัน" (View my report) shows a
per-level breakdown (questions answered/correct/wrong/accuracy/score) built
from everything played so far this session, total score, all badges earned,
and an auto-suggestion box naming any level under 70% accuracy. "⬇ Export
CSV" downloads the same data as a spreadsheet; "🖨 Print / Save PDF" opens
the browser print dialog with a print-only stylesheet (buttons and the
header hide automatically).

## Enabling real multiplayer (cross-device, via Firebase)

The whole multiplayer/teacher-dashboard layer is written against one
`RealtimeAdapter` interface (`src/types/multiplayer.ts`), so swapping in a
real backend doesn't touch any level or dashboard code:

1. Create a free Firebase project → enable **Realtime Database** (test mode
   is fine for a classroom trial; lock down rules before wider use).
2. `npm install firebase`
3. Fill in `src/services/realtime/firebaseConfig.ts` with your project's
   config object (from Firebase console → Project settings).
4. Rebuild (`npm run build`). `src/services/realtime/getAdapter.ts`
   automatically picks Firebase over the local adapter once both the config
   and the package are present — no other code changes needed. Leaving
   `firebaseConfig` as `null` (the default) keeps using the local adapter,
   and the app works identically either way if you never touch this file.

This project already ships with a real Firebase project's config filled in
(`src/services/realtime/firebaseConfig.ts`), so cross-device Class
Race/Team Battle already works out of the box — you don't need to do
anything in this section unless you want to point it at your own Firebase
project instead.

## Deploy so students can play from anywhere

The game is a fully static site (`npm run build` → the `dist/` folder) — no
server code to run, so any static-file host works. Two easy options:

### Option A — Netlify Drop (fastest, no account needed)
1. Run `npm run build` (or use the `dist/` folder you already have).
2. Go to **https://app.netlify.com/drop** in a browser.
3. Drag the whole `dist/` folder onto the page.
4. Netlify gives you a public URL (e.g. `https://random-name-123.netlify.app`)
   within seconds — send that link straight to students.
5. The teacher dashboard is at `<that URL>/#teacher`.

Re-deploying after a change (new questions, a fix) is the same 3 steps:
rebuild, drag `dist/` onto Netlify Drop again, get a new (or same, if you
made a free Netlify account and are re-dragging onto the *same* site) link.

### Option B — Firebase Hosting (reuses the Firebase project already set up)
Since this project already has a Firebase project configured for the
Realtime Database, hosting it in the *same* project keeps everything in one
place:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # pick the existing project (game-education-kanda-v1);
                         # public directory: dist ; single-page app: No
npm run build
firebase deploy
```

Firebase prints a public URL like `https://game-education-kanda-v1.web.app`
— send that to students, and `<that URL>/#teacher` is the dashboard. Re-run
`npm run build && firebase deploy` after any future change.

### Either way
- The student link and the `#teacher` dashboard link are the *same* deployed
  site — just add `#teacher` for the teacher's screen.
- Because Class Race/Team Battle sync through Firebase (see above), students
  can be on completely different networks/devices and it still works live.
- No student accounts or logins are needed — just the link and a nickname.

## Regenerating / editing the question bank

Every question is **generated by code from the real IUPAC rule**, not
hand-typed — each `scripts/gen-levelN.mjs` script defines structures as
data (chain length, branch positions, bond position/order, substituent
placements), runs the actual decision algorithm to compute the answer, and
refuses to write the output file if it detects a genuine tie/ambiguity in
anything you add. This is what "verify the chemistry rigorously" means in
practice here — the answer key can never drift from what the algorithm
says, and a bad edit fails loudly instead of shipping a wrong answer.

| Script | Rule engine | Bank size |
|---|---|---|
| `scripts/gen-level1.mjs` | tree-diameter (double-BFS) longest-chain + uniqueness check | 25 |
| `scripts/gen-level2.mjs` | lowest-locant precedence (bond beats substituents), conflict-flag detection | 25 |
| `scripts/gen-level3.mjs` | lowest-locant numbering, 3 rotating question shapes, distractor generation | 100 |
| `scripts/gen-level4.mjs` | real alphabetical sort key, multiplying prefixes, decoy-card generation | 100 |
| `scripts/gen-level5.mjs` | combines all of the above into full name assembly + numbering-direction resolution | 100 |

Levels 3-5 draw a random 25 of their 100-question pool each playthrough
(no repeats within one round — see `ROUND_SIZE` in each level's `.tsx`), so
replaying a level gives a genuinely different set of questions, not just a
different order.

To tweak or extend a level's question bank: edit that script's `defs` (or
per-question) array at the bottom, then re-run it, e.g.:

```bash
node scripts/gen-level5.mjs
```

It prints a summary of every question it generated (or an `AMBIGUOUS`/
`duplicates a real chunk` error instead of writing the file, naming exactly
what to fix). After changing any level's bank, regenerate the combined
deliverable file too:

```bash
node scripts/combine-questions.mjs   # writes questions.json (project root)
```

`questions.json` at the project root is the full 350-question bank in one
file (25 each for levels 1-2, 100 each for levels 3-5) for review/handoff;
the game itself reads the 5 per-level files in `src/data/` directly at
runtime.

## Language

The UI is set to **Thai** (`src/locales/th.json`). Every string also exists
in `src/locales/en.json` with identical keys — flip `ACTIVE_LOCALE` in
`src/locales/index.ts` from `'th'` to `'en'` to switch the whole game to
English, or add a new `xx.json` with the same keys for another language.
IUPAC chemical names/prefixes/suffixes themselves (methyl, chloro, -ene,
etc.) stay in English/Latin in both locales by design — that matches how
Thai chemistry classrooms actually write these names.

## Known limitations (by design)

- The bundled multiplayer sync only reaches across tabs on one device
  unless you configure Firebase (see above) — this is intentional so the
  game works fully offline/without any account or backend by default.
- Google Fonts (Baloo 2 / Fredoka / Nunito, plus Baloo Thambi 2 / Mitr /
  Sarabun for Thai glyphs) load from `index.html`; with no internet access
  the page still works, just falls back to the system font.
- Molecule diagrams are drawn live as SVG; scene backgrounds are bundled
  `.webp` images and everything else is CSS. Sound effects are synthesized
  live with the Web Audio API (some browsers require one click on the page
  before audio is allowed to play, which is normal browser behavior, not a
  bug).
