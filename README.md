# CABP Challenge: Conventional Therapy vs Novel Therapy

An interactive game for scientific discussion among healthcare professionals at a medical conference: the CABP Challenge, Conventional Therapy vs Novel Therapy. On a 3D lane with ten treatment-barrier pins, the doctor enters their name, chooses a conventional combination (Amoxi-Clav + Azithromycin or Amoxi-Clav + Clarithromycin) and bowls Frame 1 (two throws, same ball); a fresh rack is set and MIQNAF® (nafithromycin) is presented automatically for Frame 2. Every pin state and score comes from fixed, supplied configuration.

> **Draft scientific content.** Read [SCIENTIFIC_REVIEW.md](SCIENTIFIC_REVIEW.md) before any release.

## Requirements

- Node.js 20 or later (built and tested on Node 22)
- npm

No backend, database, API or network access is needed at runtime. Fonts and 3D assets are bundled or generated locally.

## Commands

```bash
npm install          # install dependencies
npm run dev          # development server at http://localhost:3000
npm test             # unit + interaction tests (Vitest)
npm run typecheck    # strict TypeScript check
npm run lint         # ESLint
npm run build        # production build
npm start            # serve the production build at http://localhost:3000
```

For a conference kiosk, run `npm run build && npm start` and open the page full-screen (F11) in Chrome or Edge, or use kiosk mode: `chrome --kiosk http://localhost:3000`.

**Touch screen (42", 37.5" × 21.1", 16:9).** Any landscape screen 900px wide or more (CSS pixels) gets a fixed full-screen layout with no page scrolling, and the whole interface scales with the screen height and width: 16px root text at 1920×1080, 32px at 3840×2160. A 1080p or 4K panel, at any Windows display scaling from 100% to 200%, full screen or in a browser window, shows the same one-screen layout. Touch handling: no double-tap zoom, no tap highlight, no long-press menu, no text selection, enlarged pin hit areas, and hover effects only on devices that can hover. Smaller or portrait screens get a scrolling, stacked layout.

Optional visual check (needs Chrome or Edge installed and the app running):

```bash
```

This plays the full flow in a headless browser, saves screenshots of each state at desktop, tablet and mobile sizes, and reports console errors and horizontal overflow.

## How it works

**Game flow:** `WELCOME → NAME_ENTRY → THERAPY_SELECTION → FRAME_1_READY → FRAME_1_ROLLING → FRAME_1_RESULT → SECOND_ATTEMPT → TRANSITION → FRAME_2_READY → FRAME_2_ROLLING → FRAME_2_RESULT → SCORECARD → CLOSING_SCREEN` (`sessionStage` in `src/lib/gameReducer.ts`). The reducer checks every action against the current stage: the therapy is locked once bowling starts, Frame 1 allows exactly two throws with the same ball (the second only shakes the standing pins), the transition resets the rack once (old pins lifted away, ten fresh pins lowered into the same spots), MIQNAF® is presented automatically and thrown once, and New game asks before resetting. All throws take the same line and timing.

**Swipe to roll:** there is no ROLL button. The player swipes the ball up the lane with a finger (or drags with a mouse); the ball follows the finger and is released into the roll (`src/components/game/SwipeToRoll.tsx`). A tap, a short drag, or a sideways or downward swipe does not roll. The gesture only starts the roll: its strength never changes the ball's path, speed or the outcome. The small forward nudge while dragging fades out within 0.22 s of release (`aimOffset` in `rollAnimation.ts`). Keyboard users can focus the ball and press Enter or Space.

**Single source of truth:** every ball, pin, outcome, score and message lives in `src/data/gameData.ts`. The outcome matrix exists only in `PINS[].outcome`; scores are configured values (`FIRST_THROW_SCORE`, `FRAME_1_SCORE`, `FRAME_2_SCORE`), never calculated. Pin states for each throw are derived through `src/lib/gameLogic.ts` (`rollLane`, `secondThrowLane`); `src/lib/outcomeValidation.ts` checks the supplied wording and results. All content is draft pending review: see SCIENTIFIC_REVIEW.md.

**Deterministic animation:** the ball's path and timing come from `src/lib/rollAnimation.ts`, a pure function of time with no drug input. The roll timer lives in `useGameState`, not in the renderer. The 3D scene only shows the predetermined outcome; no physics engine decides anything.


**Reveal rules:** pin cards show no per-ball outcomes; a ball's outcome is shown only on the lane, after it is rolled.

### Project layout

```
src/
  app/                 layout, page, global styles, interim fonts
  components/game/     GameShell (state wiring), IntroScreen, GameHeader, GameStage,
                       BowlingScene / BowlingLane / BowlingBall / PinDeck / PathogenPin (3D),
                       LaneFallback2D (no-WebGL lane + loading placeholder),
                       NameEntryScreen, TherapyScreen, BallRack, SwipeToRoll, ThrowResultPopup,
                       TransitionCard, Scorecard, ClosingScreen,
                       PinKey, PathogenInfoDialog,
                       AccessiblePinList, SoundToggle, GameFooter
  components/ui/       Dialog (focus trap, Escape, focus return), RichText
  data/                gameData.ts  ← all supplied content
  hooks/               useGameState, useReducedMotion, useGameAudio, useWebGLSupport, useElementSize
  lib/                 gameReducer (state machine), gameLogic, outcomeValidation,
                       rollAnimation, laneLayout, projection, timing, brand, brandAssets, drugVisuals
  types/game.ts        shared types
```

## Branding

- **Colours:** the three brand colours (`#9A1F24` red, `#28397F` navy, `#E7A900` gold) and the neutral tones are defined once in `src/lib/brand.ts`. They are injected as CSS custom properties (`--brand-red`, `--brand-navy`, `--brand-gold`, …) and mapped to Tailwind (`bg-brand-gold`, `text-brand-navy`, …). Change a colour there and it updates everywhere, including the 3D scene.
- **Fonts:** brand fonts from `public/font/`: Acumin Variable Concept for headings, numbers and buttons (`--font-display`), Helvetica Neue for body text (`--font-body`). The browser loads Latin-subset `.woff2` copies from `public/font/web/` (see `src/app/fonts.css`). Check that the font licences allow web/kiosk embedding.
- **Favicon:** `public/favicon.ico` (16 to 256 px) and `public/apple-touch-icon.png` are the red "W" from the Wockhardt logo (the full wordmark is unreadable at 16 px). They are linked with a version query (`?v=3`, set in `src/lib/brandAssets.ts`) because browsers cache favicons by URL; bump the version whenever the icon changes.
- **Logo:** the Wockhardt Respiratory logo (`public/brand/wockhardt-respiratory-logo.png`, set in `src/lib/brandAssets.ts`) appears in the header and on the intro screen. It is the supplied Wockhardt artwork trimmed to the logo; swap in an official SVG export when available.

## Accessibility

- Every control is a real button and works from the keyboard, including the pin labels on the lane, ball cards, the ball itself (Enter or Space rolls it) and dialogs. Focus states are visible.
- Dialogs trap focus, close on Escape or a backdrop click, and return focus to where it was.
- A polite live region announces each roll and its result. A screen-reader-only list describes the pin deck.
- Outcomes are always shown with text and icons, never by colour alone.
- `prefers-reduced-motion: reduce` skips the roll animation and shows the end state immediately, with the same outcome.
- Sound is on by default (client request); the header switch turns it off. Browsers only allow audio after a user gesture, so audio starts on the first tap (START GAME on the kiosk). The game plays the supplied recordings in `public/soundeffects/`: the ball rolling from release, fading out as it reaches the pins, then the strike crash timed so its first hit lands exactly at impact (a little quieter when fewer pins fall). Timing lives in `src/lib/rollSound.ts`, from the same timeline as the animation. Sound is never needed to understand the result.
- Without WebGL, a 2D lane with the same outcomes, controls and timing replaces the 3D scene automatically. The same lane also covers a lost WebGL context.

## Tests

`npm test` covers:

- the outcome matrix: 8 unique pins, the supplied labels and rows, 5 / 5 / 8 pins down, standing pins 2, 3 and 4, and a cell-by-cell match to the supplied table
- verbatim ball cards and disclaimer
- the reducer: rolling locked until a ball is chosen, no double rolls, a ball change resets the lane but keeps history, stale timers ignored, reduced-motion rolls, new-session reset
- animation: the same path and timing for every drug, the expected end poses, and a bounded swipe offset that is gone shortly after release
- swipe gestures: an upward swipe rolls; a tap, short drag, sideways or downward swipe does not
- sound score: one knock per falling pin as it starts to fall and a thud as it lands, rattles only for standing pins, and the same ball timing for every drug
- the UI (jsdom, which runs the 2D fallback): disclaimer present on every screen, sound on by default and switchable off, the full roll flow, reduced motion, keyboard use, the pin card, the win and try-again pop-ups
