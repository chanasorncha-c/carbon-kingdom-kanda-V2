# Carbon Kingdom — Game Design Document (v0.1, for approval)

*A whole-class multiplayer web game that teaches IUPAC nomenclature to Grade 11–12 students.*

---

## 1. Title

**Primary: Carbon Kingdom**

Three alternatives, in case you want options:

1. **IUPAC Isles** — leans into "King IUPAC" as ruler of a chain of island-kingdoms (Alkane Isle, Alkene Atoll, etc.), each level = a new isle.
2. **Chain Reaction Kingdom** — keeps the kingdom framing but foregrounds the "chain" mechanic that runs through all 5 levels.
3. **The Nomenclature Chronicles** — more "adventure storybook" tone if you want level intros to read like short chapters.

I'd default to keeping **Carbon Kingdom** — it's short, on-brand with the kawaii/royal art direction, and reads well on a leaderboard/badge UI — but flagging the alternatives per your request.

---

## 2. One-line pitch

Students trace, number, and name organic molecules to rescue/build Carbon Kingdom from Chloro the Trickster, leveling up from "find the chain" to a full boss-battle IUPAC name-off, solo or as a live whole-class competition with a real-time teacher dashboard.

---

## 3. Art direction (confirmed, no changes proposed)

- Kawaii/chibi, flat design, soft shadows, rounded corners.
- Palette: mint `#A8E6CF`, peach `#FFD3B6`, cream yellow `#FFF5BA`, lavender `#C7CEEA`, coral `#FFAAA5`.
- Fonts: Baloo 2 (headers/UI chrome), Fredoka (buttons/callouts), Nunito (body text/explanations) — all via Google Fonts.
- All characters, atoms, and bonds are hand-built SVG/CSS — no image assets, so everything themes cleanly and scales crisply on phones.
- Feedback loop: bounce-on-hover (Framer Motion `whileHover`), confetti burst on correct (small custom SVG-particle burst, not a library, to avoid an extra dependency), gentle shake on wrong (`x: [0,-6,6,-4,4,0]` keyframe).
- Audio: a tiny `useSynth()` hook wrapping the Web Audio API — an `OscillatorNode` + `GainNode` envelope for the "ding" (two quick ascending sine tones) and a lower, short "boop" (single low triangle-wave tone) for wrong. No audio files.

⚠️ **Flag:** confetti-as-SVG-burst instead of a canvas library keeps bundle size down but I'll need to hand-tune particle count/duration so it doesn't feel cheap — will show you both a v1 and ask if it needs more juice.

---

## 4. Characters

| Character | Role | Look | Sample lines |
|---|---|---|---|
| **Carbie** | Hero carbon atom | Blue-grey chibi circle, 4 tiny arms | "Let's find our family!" / "Nice one! 🎉" |
| **Hydro-Chick** | Clings to open valences | Tiny white chick, clings to Carbie's arms | "Peep! I fill in the gaps~" |
| **Professor Methyl** | Hint-giver | Round character, glasses, lab coat | "Try counting from the other end — sometimes the shortcut isn't the shortest!" |
| **Auntie Hydroxy (–OH)** | Substituent NPC, Level 4 | Pink-red, apron | "Oh dearie, don't forget — I still count even with an 'i' in front of me!" |
| **Chloro the Trickster** | Antagonist/distractor | Green, sly grin | "Heehee, I snuck onto carbon 3!" / "Aw, found me already?" |
| **King IUPAC** | Level 5 boss | Wears a benzene-ring crown | "Name me correctly, young chemist, or the kingdom stays in chaos!" |

Encouraging/near-miss lines (used across levels, keyed by outcome not level, so they're easy to extend in `locales/`):
- Correct: "Nice one! 🎉", "Carbie's arms are all full — perfect!", "That's textbook IUPAC!"
- Near miss: "So close — try counting from the other end!", "Careful, Chloro might be hiding a longer path!", "Almost! Check if di/tri should count when you alphabetize."
- Wrong: "Not quite — Professor Methyl has a hint if you want one." (soft "boop", no shame-y language)

---

## 5. Level design

Every level: pastel scene, Professor Methyl intro line, 3-life or untimed-but-scored attempt (see scoring), badge on mastery.

### Level 1 — Find the Parent Chain ("Longest Chain Hunt")
- **Scene:** Carbon Forest.
- **Mechanic:** click-drag across a skeletal structure to trace a continuous path; live carbon count shown; on submit, compare to the true longest chain.
- **Trap requirement:** ≥40% of the 15 Level-1 questions must have their longest chain running through a branch, not the visually "horizontal" row of atoms — this is explicit in the question schema as `isHorizontalTrap: boolean`.
- **Feedback:** "That chain has 5 carbons — but there's a longer path through the branch on the right!"

### Level 2 — Choose the Numbering Direction ("Direction Duel")
- **Scene:** Arrow Bridge, left/right signposts.
- **Mechanic:** player picks an end; locants animate onto the chain one atom at a time; a comparison table shows both directions' locant sets.
- **Rule taught:** lowest locants to the point of first difference; multiple bonds outrank substituents when assigning the numbering direction (Rule precedence, not raw numeric comparison).
- ⚠️ **Flag on the sample table in your brief:** "Left = 2,4,5 | Right = 3,4,6" was illustrative placeholder text, not a computed result — for a single chain, left- and right-end locant sets are mirror images (`right_i = n + 1 − left_i`), so real question data will be generated (or hand-verified) from the actual structure, e.g.:
  - 2,4-dimethylheptane: numbering from the left gives {2,4}; from the right the same two carbons are {4,6}; left wins at the first point of difference (2 < 4).
  I'll build every Level 2 question this way (compute both directions from the real structure) rather than hand-typing plausible-looking numbers, to avoid shipping a wrong "correct answer."

### Level 3 — Identify Double/Triple Bonds ("Bond Detective")
- **Scene:** Detective Lab, magnifying glass cursor.
- **Mechanic:** click the multiple bond(s) → choose suffix (-ane/-ene/-yne) → assign locant (lower-numbered carbon of that bond).
- **Coverage:** simple enes/ynes, dienes/trienes (e.g. hexa-2,4-diene), and mixed en-yne chains.
- ⚠️ **Flag:** for mixed en-yne questions, current IUPAC rules give **"-ene" priority over "-yne" for low locants when there's still a tie** after applying the general lowest-locants rule to the combined set. I'll encode this as an explicit tie-break step in the answer key and double-check each en-yne question by hand rather than relying on a general "lowest number wins" shortcut, since that shortcut is only correct when there's no tie.

### Level 4 — Identify Substituents ("Substituent Market")
- **Scene:** Substituent Market stalls.
- **Mechanic:** drag substituent cards onto carbons; groups: methyl, ethyl, propyl, isopropyl, butyl, tert-butyl, fluoro, chloro, bromo, iodo, nitro, phenyl, hydroxy, amino.
- **Rules taught:** multiplying prefixes (di-, tri-, tetra-) for repeated *simple* substituents, and alphabetical ordering of substituent prefixes.
- ⚠️ **Two accuracy flags I want to build in correctly rather than fix later:**
  1. **Alphabetization key ≠ display name.** "tert-butyl" alphabetizes as **"butyl"** (the italicized "tert-" is ignored), but "isopropyl" alphabetizes as **"isopropyl"** — the "iso" is *not* ignored, since it isn't an italicized detachable prefix. I'll give every substituent a separate `sortKey` field (e.g. `{ display: "tert-butyl", sortKey: "butyl" }`) so the game can't accidentally alphabetize tert-butyl under "T".
  2. **Hydroxy/amino as prefixes only make sense when something outranks them.** By strict IUPAC seniority-of-suffix rules, a molecule with an –OH and nothing more senior on the chain should be named as an alcohol (**"-ol" suffix**), not "hydroxy-substituted [parent]" — same logic for –NH₂ vs. "-amine". So: for every question where "hydroxy" or "amino" appears as a *substituent prefix*, I'll make sure the molecule also contains a more senior group (e.g., a ketone, aldehyde, or carboxylic acid) so treating –OH/–NH₂ as a prefix is actually correct — otherwise I'll write that question as a straightforward "-ol"/"-amine" naming question instead. **This is a curriculum-scope call I'd like your sign-off on** (i.e., "do we want -ol/-amine suffix naming in scope at all, even as a rare case, or should Level 4 stay strictly hydrocarbon-backbone-plus-substituents"?).

### Level 5 — Full IUPAC Name ("Boss Battle")
- **Scene:** Castle of King IUPAC, night sky.
- **Modes (rotate per question):**
  (a) Name Builder — drag ordered blocks (locants → multiplying prefix+substituent → parent+suffix) into place.
  (b) Free Typing — normalized string match (lowercase, strip spaces, normalize hyphen/en-dash/comma variants) before comparing.
  (c) Reverse Mode — given a name, pick the matching structure from 4 (3 distractors built from *common student errors*: wrong numbering direction, wrong parent chain, or mis-alphabetized substituents — not random noise, so the wrong answers are themselves teaching moments).
- Boss health bar drops per correct answer; a combo (see §7) can trigger a bonus hit.

---

## 6. Question bank (plan for `questions.json`)

Schema (per your spec, plus two additions I want to flag):

```json
{
  "id": "L1-E-003",
  "level": 1,
  "difficulty": "easy",
  "structure": { "atoms": [...], "bonds": [...] },
  "prompt": "Click through the longest continuous carbon chain.",
  "choices": [...],
  "answer": "...",
  "explanation": "The chain along the bottom looks longest at a glance, but the 2-carbon branch actually connects into a 7-carbon path through the top — always check branches before locking in the 'obvious' row.",
  "hint": "Try tracing through the branch near carbon 3.",
  "isHorizontalTrap": true,
  "sortKeys": { "tert-butyl": "butyl" }
}
```

- `structure` as a small coordinate-array object (`atoms:[{id,x,y,element}]`, `bonds:[{from,to,order}]`) rather than raw SMILES — this feeds `<MoleculeCanvas/>` directly with no SMILES parser needed, which is one less dependency and one less source of rendering bugs. (If you specifically want SMILES stored too, e.g. for future portability, I can store both — SMILES as metadata, coordinates as the render source of truth.)
- 15+ questions × 5 levels = 75+, tagged easy/medium/hard, randomized order and randomized choice order at runtime (not baked into the file).
- **Verification plan:** every question gets hand-checked against IUPAC 2013 recommendations before it ships; anything I'm not fully certain of gets a ⚠️ inline comment in that question's `explanation` draft for you to double-check, per your instructions — none go in silently.

---

## 7. Multiplayer, scoring, badges

- Join: 6-digit room code (teacher-generated), nickname + 1-of-8 cartoon avatar, no login.
- Modes: **Solo Adventure**, **Class Race** (shared live leaderboard sidebar), **Team Battle** (2–4 teams, pooled scores).
- Scoring: 100 pts first-try correct / −30 if hint used / 0 + time cost if wrong; +50 speed bonus under 10s; combo ×1.2 (3 in a row) / ×1.5 (5) / ×2 (10).
- Badges: Chain Hunter (L1), Locant King (L2), Bond Detective (L3), Name Master (L5) — plus I'd suggest one for L4 for symmetry, e.g. **"Market Master"** (substituent ordering), so every level has a badge — flag for your call.

---

## 8. Teacher dashboard (`/teacher`)

- Live leaderboard (name, avatar, score, current level), updating in real time.
- Progress grid: students × levels, green/yellow/red.
- Most-missed-question heatmap across the whole room.
- Controls: start/pause, lock levels, broadcast message.
- Auto-alert when one student fails the *same* question 3+ times (so the teacher can walk over, rather than the game just re-serving it).

## 9. End-of-game report

- Per student: score, time, accuracy % per level, missed questions.
- Per class: average, hardest level, top-5 most-missed questions.
- Auto-suggestions, e.g. "68% of students failed Level 2 → review the lowest-locant rule."
- Export: CSV + print-to-PDF (`window.print` + `@media print`).

---

## 10. Tech architecture

- **Frontend:** React + TypeScript + Tailwind + Framer Motion.
- **Real-time:** Firebase Realtime Database, with a `RealtimeAdapter` interface so the whole app talks to an abstraction, not Firebase directly; a `BroadcastChannel` + `localStorage` implementation of the same interface lets you test whole-class flow on one machine (multiple tabs = multiple "students") with zero backend setup. This also means later swapping in a different backend doesn't touch game logic.
- **Rendering:** `<MoleculeCanvas atoms={...} bonds={...} highlightPath={...} />`, pure SVG, one shared component used by every level (chain-tracing, bond-clicking, structure-picking all reuse it with different interaction layers on top).
- **i18n:** every user-facing string in `locales/en.json` (Thai file added later without touching components).
- **Accessibility:** ≥44px tap targets, WCAG AA contrast checked against the pastel palette specifically (a couple of the lighter pastels, e.g. cream yellow text-on-white, will need a darker text color or an outline to pass AA — flagging now since "cute pastel" and "AA contrast" can fight each other).

---

## 11. Proposed high-level file structure

```
carbon-kingdom/
  src/
    components/
      MoleculeCanvas/
      characters/        (Carbie, HydroChick, ProfessorMethyl, AuntieHydroxy, Chloro, KingIUPAC)
      ui/                (buttons, cards, confetti, sound hook)
    levels/
      Level1_ChainHunt/
      Level2_DirectionDuel/
      Level3_BondDetective/
      Level4_SubstituentMarket/
      Level5_BossBattle/
    realtime/
      RealtimeAdapter.ts
      firebaseAdapter.ts
      broadcastChannelAdapter.ts
    teacher/             (dashboard routes/components)
    report/              (end-of-game report + CSV/PDF export)
    data/
      questions.json
    locales/
      en.json
    App.tsx, routes, etc.
  public/
  README / SETUP.md
  TEACHER_MANUAL.md
```
Full file-by-file breakdown comes in Deliverable 2, once this GDD is approved.

---

## 12. Build plan (matches your requested workflow)

1. This GDD → **you approve or edit**.
2. Deliverable 2 (full file structure) + Deliverable 3 scaffolding.
3. Build **Level 1 only**, runnable standalone → you test.
4. Level 2 → test → Level 3 → test → Level 4 → test → Level 5 → test.
5. Wire in multiplayer (Class Race / Team Battle) once solo levels are solid.
6. Teacher dashboard + end-of-game report.
7. `questions.json` grows alongside each level (15+ per level, verified as that level is built — not all 75 dumped at once, so chemistry review stays manageable).
8. Setup guide + one-page teacher manual last.

---

## 13. Decisions (confirmed by BOLATA, 2026-09-06)

1. **Title:** Carbon Kingdom — final.
2. **Level 4 scope:** hydroxy/amino questions will include a mix that resolves as **suffix** naming ("-ol" / "-amine") when –OH/–NH₂ is the senior group, alongside the prefix cases where a more senior group is present. Each question's `explanation` will make explicit *why* that instance is prefix vs. suffix, since that's the actual teaching point.
3. **`questions.json` structure field:** stores **both** — the coordinate `atoms`/`bonds` array (render source of truth for `<MoleculeCanvas/>`) **and** a `smiles` string per question as portable metadata/for future tooling.
4. **Level 4 badge:** "Market Master" — final.

Status: **GDD approved.** Proceeding to Deliverable 2 (file structure) and Level 1.
