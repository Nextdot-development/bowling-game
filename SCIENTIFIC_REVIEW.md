# Scientific and regulatory review: CABP Challenge

**Status: DRAFT. Not approved for release.**

Every scientific, comparative and promotional statement in this build is supplied draft copy. It must be checked by medical/scientific review and by regulatory before the game is used at an event. The developers have not corrected, validated or expanded any claim; discrepancies are recorded below for a decision by the authorised medical/regulatory team.

All content lives in one file, so reviewers only need to check it:

- [`src/data/gameData.ts`](src/data/gameData.ts): titles, therapy choice, the ten barrier pins, every pin outcome, all scores, every message, the closing copy, footer and disclaimer.

## 1. Items pending approval

| # | Item | As built (from the supplied brief) | Check |
|---|---|---|---|
| 1 | The ten treatment-barrier labels and their clinical interpretation | 1 Susceptibility Vs CABP Pathogens · 2 Bactericidal Activity · 3 Patient Compliance · 4 GI Side Effects · 5 QT Prolongation · 6 Atypical Coverage · 7 Anti-Inflammatory / Immunomodulatory Activity · 8 Managing AMR · 9 Lower Drug-Drug Interaction · 10 Potency. Pin numbers follow the bowling rack (1 = head pin). Knocking a pin down means the therapy overcomes that barrier; whether, for example, knocking down "GI Side Effects" or "QT Prolongation" reads correctly needs confirmation | ☐ |
| 2 | Short lane tags (written by the developers to fit the 3D lane) | Susceptibility, Bactericidal, Compliance, GI side effects, QT prolongation, Atypicals, Anti-inflam., AMR, Lower DDI, Potency. Full wording is always in the pin list and pin cards | ☐ |
| 3 | Scenario A first throw (Amoxi-Clav + Azithromycin) | Down: Bactericidal Activity, Anti-Inflammatory / Immunomodulatory Activity, Atypical Coverage, Lower Drug-Drug Interaction. Shaking: Susceptibility Vs CABP Pathogens. Standing: QT Prolongation, Patient Compliance, GI Side Effects, Managing AMR, Potency. Score 4.5/10 | ☐ |
| 4 | Scenario B first throw (Amoxi-Clav + Clarithromycin) | As Scenario A, plus Potency down. Score 5.5/10 | ☐ |
| 5 | **Basis for Scenario B's 5.5/10** | No formula supplied. It matches 5 pins down plus 0.5 for the shaking pin, and Scenario A's 4.5/10 matches the same reading; this is an observation, not an implemented rule. Scores are configured values, never calculated | ☐ confirm basis |
| 6 | Second-attempt behaviour | Same ball; the therapy cannot be changed; every standing pin shakes but none falls (no second-attempt outcome supplied) | ☐ |
| 7 | **Final Frame 1 scores** | Client update (2026-10-27): Amoxi-Clav + Azithromycin 4.5/10, Amoxi-Clav + Clarithromycin 5.5/10, on the transition and the scorecard (`FRAME_1_SCORE` in `gameData.ts`). This replaces the earlier brief's 5.5/10 for both | ☐ |
| 8 | Claim that all ten barriers fall in the MIQNAF® round | Frame 2: all 10 down, "STRIKE!", "All 10 Pins Down", score 10/10 | ☐ |
| 9 | Frame 2 down-pin list wording | The brief's Frame 2 list shortens two names ("Bactericidal", "Anti-Inflammatory Activity"). The game shows the full Frame 1 wording for the same pins, so the rack is consistent | ☐ confirm |
| 10 | Comparative statements | "Conventional Therapy vs Novel Therapy"; "How effective is your preferred conventional treatment strategy at knocking down these barriers?"; "Despite two attempts, several CABP treatment barriers are still standing."; "Let's see how a novel therapy performs."; the scorecard (Conventional Therapy vs MIQNAF®) | ☐ |
| 11 | Promotional statement (closing screen) | "MIQNAF® is designed to overcome resistance and deliver compliance with a superior profile." | ☐ |
| 12 | Prescribing-oriented call to action (closing screen) | "Please use MIQNAF® to secure maximum therapeutic benefit for your CABP patients." | ☐ |
| 13 | "Why MIQNAF® Changes the Game" (scorecard) | Three points supplied by the client (2026-10-27): Safety: "NO QT Prolongation, GI Safety"; Compliance: "Short Course Monotherapy"; Efficacy: "97% - 100% Sensitivity Vs CABP Pathogens" (`WHY_MIQNAF`). Comparative and quantitative claims: confirm the source for "97% - 100% Sensitivity" | ☐ |
| 14 | Scientific disclaimer wording | Footer, every screen (two lines; see section 2) | ☐ |
| 15 | Welcome copy | "CABP Challenge", "Conventional Therapy vs Novel Therapy", "Knock down the barriers" | ☐ |
| 16 | Ball descriptions (developer-written, used for screen readers) | "Amoxicillin/clavulanate with azithromycin.", "Amoxicillin/clavulanate with clarithromycin.", "MIQNAF® (nafithromycin)." Ball class labels "Conventional therapy" / "Novel therapy" | ☐ |
| 17 | Emoji in the brief | "🏆 MIQNAF®" and "STRIKE! 🎳" are shown without the emoji (they render inconsistently on kiosk browsers, and an earlier brief asked for no trophies) | ☐ confirm |

## 2. Regulatory items

- ☐ **Footer** (every screen, one line): "Disclaimer: This material is intended for scientific and educational purposes only. Views expressed by healthcare professionals are based on their individual clinical experience and are not intended as medical advice or endorsement of any brand or company." The earlier first line ("For scientific discussion among healthcare professionals. Pin outcomes are a teaching model…") was removed at the client's request on 2026-10-27; confirm regulatory is content without it, given the promotional comparison and call to action.
- ☐ **Logo**: the Wockhardt Respiratory logo appears in the header and on the welcome screen; its red "W" is the browser icon. The MIQNAF® logo appears only on the result pop-ups (Frame 1 "Good attempt!", Frame 2 "STRIKE!") and the scorecard, as the client asked.
- ☐ **Doctor's name**: required; used only in "Hi Dr. [Name]," the scorecard and the closing screen; kept for the session only, never stored or sent anywhere; shown as plain text. A leading "Dr." typed by the doctor is dropped so the greeting does not repeat it.
- ☐ **Sound on by default**: the brief says OFF by default; the client asked for ON (twice). Audio only starts after the first tap, and the header switch turns it off.
- ☐ **Sound effects**: `public/soundeffects/` holds two recordings named `freesound_community-…` (ball roll, strike). Confirm the licence covers use at the event. The win chime and soft "wah-wah" after the first throw are generated in code.
- ☐ **Fonts**: confirm the Acumin and Helvetica Neue licences cover embedding in this web/kiosk build.
- ☐ **Ball colours**: interface identifiers only (brand palette). Confirm they do not imply potency.

## 3. Discrepancies log

| Date | Item | Observed discrepancy | Reviewer | Decision |
|------|------|----------------------|----------|----------|
| 2026-10-27 | Scenario A score | Brief said 5.5/10 on the transition and scorecard; client updated it to 4.5/10 (item 7) | Client | Built as 4.5/10 |
| 2026-10-27 | Frame 2 pin names | Shortened names in the brief's Frame 2 list (item 9) | | Pending |
| 2026-10-27 | Sound default | Brief: off; client: on | | Built ON per client |

## Sign-off

| Role | Name | Date |
|------|------|------|
| Medical / scientific review | | |
| Regulatory | | |
