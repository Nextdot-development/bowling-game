
import type { Drug, DrugId, Pin } from "@/types/game";

export const GAME_TITLE = "CABP Challenge";
export const GAME_SUBTITLE = "Conventional Therapy vs Novel Therapy";
export const GAME_TAGLINE = "Knock down the barriers";

export const DISCLAIMER =
  "Disclaimer: This material is intended for scientific and educational purposes only. Views expressed by healthcare professionals are based on their individual clinical experience and are not intended as medical advice or endorsement of any brand or company.";

/** Therapy selection (Screen 1, after the name). */
export const THERAPY_INTRO = [
  "Every CABP patient presents multiple treatment challenges beyond pathogen eradication.",
  "How effective is your preferred conventional treatment strategy at knocking down these barriers?",
] as const;
export const THERAPY_HEADING = "Choose Your Therapy";

/** The doctor picks one conventional combination for Frame 1. */
export const CONVENTIONAL_BALLS: readonly DrugId[] = ["amoxiclavAzithro", "amoxiclavClarithro"];
/** Frame 2: presented automatically; the doctor never chooses it. */
export const NOVEL_BALL: DrugId = "miqnaf";

export const DRUGS: Readonly<Record<DrugId, Drug>> = {
  amoxiclavAzithro: {
    id: "amoxiclavAzithro",
    name: "Amoxi-Clav + Azithromycin",
    drugClass: "Conventional therapy",
    description: "Amoxicillin/clavulanate with azithromycin.",
  },
  amoxiclavClarithro: {
    id: "amoxiclavClarithro",
    name: "Amoxi-Clav + Clarithromycin",
    drugClass: "Conventional therapy",
    description: "Amoxicillin/clavulanate with clarithromycin.",
  },
  miqnaf: {
    id: "miqnaf",
    name: "Nafithromycin",
    drugClass: "Novel therapy",
    description: "Nafithromycin.",
  },
};

const D = "down" as const;
/** Stays up on the first throw, falls on the second. */
const D2 = "downSecond" as const;
const S = "standing" as const;
/** The shaking pin: rocks but stays up (counts as standing, scored as half). */
const W = "wobble" as const;

export const PINS: readonly Pin[] = [
  { number: 1, label: "Susceptibility", name: ["Susceptibility Vs CABP Pathogens"], outcome: { amoxiclavAzithro: W, amoxiclavClarithro: D, miqnaf: D } },
  { number: 2, label: "Bactericidal", name: ["Bactericidal Activity"], outcome: { amoxiclavAzithro: D, amoxiclavClarithro: D, miqnaf: D } },
  { number: 3, label: "Compliance", name: ["Patient Compliance (Dose Frequency)"], outcome: { amoxiclavAzithro: S, amoxiclavClarithro: S, miqnaf: D } },
  { number: 4, label: "Lung conc.", name: ["High Lung Concentration"], outcome: { amoxiclavAzithro: W, amoxiclavClarithro: D, miqnaf: D } },
  { number: 5, label: "QT prolongation", name: ["QT Prolongation"], outcome: { amoxiclavAzithro: S, amoxiclavClarithro: S, miqnaf: D } },
  { number: 6, label: "Atypicals", name: ["Atypical Coverage"], outcome: { amoxiclavAzithro: D, amoxiclavClarithro: D2, miqnaf: D } },
  { number: 7, label: "Anti-inflam.", name: ["Anti-Inflammatory / Immunomodulatory Activity"], outcome: { amoxiclavAzithro: D, amoxiclavClarithro: D, miqnaf: D } },
  { number: 8, label: "AMR", name: ["Managing AMR"], outcome: { amoxiclavAzithro: S, amoxiclavClarithro: S, miqnaf: D } },
  { number: 9, label: "Low DDI", name: ["Low Drug-Drug Interaction"], outcome: { amoxiclavAzithro: D, amoxiclavClarithro: D, miqnaf: D } },
  { number: 10, label: "Post-antibiotic", name: ["Post Antibiotic Effect"], outcome: { amoxiclavAzithro: D2, amoxiclavClarithro: D2, miqnaf: D } },
];

/**
 * Scores as supplied, configured explicitly (never calculated from the pins).
 * Client update of 2026-10-28: a point per pin down, plus half a point per
 * shaking pin after the second throw. Amoxi-Clav + Azithromycin: 4 down, then
 * 1 more with 2 shaking, so 4/10 then 6/10. Amoxi-Clav + Clarithromycin: 5 down,
 * then 2 more, none shaking, so 5/10 then 7/10.
 */
export const FIRST_THROW_SCORE: Readonly<Record<DrugId, number | null>> = {
  amoxiclavAzithro: 4,
  amoxiclavClarithro: 5,
  miqnaf: null,
};
export const FRAME_1_SCORE: Readonly<Record<DrugId, number | null>> = {
  amoxiclavAzithro: 6,
  amoxiclavClarithro: 7,
  miqnaf: null,
};
export const FRAME_2_SCORE = 10;
export const SCORE_OUT_OF = 10;

/** After the first throw (both scenarios). */
export const FIRST_THROW_COPY = {
  heading: "Good attempt!",
  body: "However, several treatment barriers remain standing.",
  button: "2nd attempt",
} as const;

/** Between the frames. */
export const TRANSITION_COPY = {
  heading: "Good Try",
  body: "Despite two attempts, several CABP treatment barriers are still standing.",
  rack: "A fresh rack of treatment challenges is now set.",
  next: "Let's see how a novel therapy performs.",
  button: "Now, let's check with novel therapy",
} as const;

/** Frame 2: the novel therapy, presented automatically. */
export const NOVEL_COPY = {
  heading: "Novel Therapy Challenge",
  ball: "Nafithromycin",
  button: "Throw ball",
} as const;

/** Frame 2 result (supplied, draft). */
export const STRIKE_COPY = {
  heading: "100% Success",
  body: "All 10 Pins Down",
  button: "See results",
} as const;

/** Final scorecard. */
export const SCORECARD_COPY = {
  heading: "CABP Challenge Results",
  frame2Therapy: "Nafithromycin",
  button: "Continue",
} as const;

/** "Why Nafithromycin Changes the Game": the three points supplied by the client (draft, pending approval). */
export const WHY_MIQNAF: { heading: string; points: readonly { title: string; text: readonly string[] }[] } | null = {
  heading: "Why Nafithromycin Changes the Game",
  points: [
    { title: "Safety", text: ["NO QT Prolongation"] },
    { title: "Compliance", text: ["Short Course Monotherapy"] },
    { title: "Efficacy", text: ["97% - 100% Sensitivity", "Vs CABP Pathogens"] },
  ],
};

/** Closing screen (supplied promotional copy, draft pending approval). */
export const CLOSING_COPY = {
  /** Followed by "Dr. [Name]," */
  salutation: "Dear",
  lines: [
    "Thank you for participating in the CABP Challenge!",
    "Nafithromycin lactone-Ketolide designed to overcome resistance in CABP Pathogens",
  ],
  /** Back to the welcome screen for the next doctor. */
  button: "New Game",
} as const;

/** The last page: the references, as supplied (numbered in this order). */
export const REFERENCES_COPY = {
  heading: "References",
  /** Opens the page from the closing screen. */
  open: "References",
  back: "Back",
  items: [
    "Menglan Zhou, Lijuan Wu, Wei Kang, Yanbing Li, Ge Zhang, Jingjia Zhang, Simeng Duan, Jin Li, Tong Wang, Yingchun Xu, Yihai Gu, In vitro activity of lactone ketolide nafithromycin (WCK 4873) against Streptococcus pneumoniae isolates enriched with macrolide-resistance phenotype collected from mainland China, JAC-Antimicrobial Resistance, Volume 4, Issue 5, October 2022, dlac103",
    "Veeraraghavan B, Varghese R, Saigal K, Balasubramanian S, Bai PSP, Lal Y B, Neeravi A, Baskar P, Anandhan K, Kumar CPG, Jayaraman Y, Nag VL, Baveja S, J B, Joshi SA, Iyer R. Activity of novel lactone ketolide nafithromycin against multicentric invasive and non-invasive pneumococcal isolates collected in India. JAC Antimicrob Resist. 2021 Jun 1;3(2):dlab066. doi: 10.1093/jacamr/dlab066. PMID: 34223128; PMCID: PMC8210042.",
    "J. Garau. Performance in practice: bacteriological efficacy in patients with drug-resistant S. pneumonia. Clin Microbiol Infect 2004; 10 (Suppl. 2): 28–35",
    "K. H. Makhija*, N. S. Jadhav, P. S. Jadhav, N. R. Pathan, Nafithromycin: India’s First Indigenously Developed Ketolide Antibiotic for Drug-Resistant Respiratory Infections, Int. J. of Pharm. Sci., 2026, Vol 4, Issue 5, 7597-7611.",
    "Akhavan BJ, Khanna NR, Vijhani P. Amoxicillin. 2023 Nov 17. In: StatPearls [Internet]. Treasure Island (FL): StatPearls Publishing; 2023 Jan–. PMID: 29489203.",
    "Davidson RJ. In vitro activity and pharmacodynamic/pharmacokinetic parameters of clarithromycin and azithromycin: why they matter in the treatment of respiratory tract infections. Infect Drug Resist. 2019;12:585-596",
    "Gore A, Viswanatha Swamy AH, Bharamu Nyamagoud S. Nafithromycin: advancements in antibiotic therapy against community-acquired pneumonia-resistant pathogens. Monaldi Arch Chest Dis. 2026 May 7;96(2). doi: 10.4081/monaldi.2025.3340. Epub 2025 Aug 5. PMID: 40824144.",
    "Choi Y, Lim HS, Chung D, Choi JG, Yoon D. Risk Evaluation of Azithromycin-Induced QT Prolongation in Real-World Practice. Biomed Res Int. 2018 Oct 14;2018:1574806. doi: 10.1155/2018/1574806. PMID: 30406128; PMCID: PMC6204160.",
    "Cetin M, Yıldırımer M, Ozen S, Tanrıverdi S, Coskun S. Clarithromycin-Induced Long QT Syndrome: A Case Report. Case Rep Med. 2012;2012:634652. doi: 10.1155/2012/634652. Epub 2012 Mar 26. PMID: 22489247; PMCID: PMC3318261.",
    "Patel PH, Hashmi MF. Macrolides. [Updated 2023 May 16]. In: StatPearls [Internet]. Treasure Island (FL): StatPearls Publishing; 2023 Jan.",
    "Dinesh Kumar, Debayan Sil, Rashmi Ghosh, Kumari Komal, Prachi Pandey, Ghanshyam Das Gupta, Manish Kumar. Nafithromycin: a potential ketolide antibiotic for combating antimicrobial resistance in community-acquired bacterial pneumonia, Next Research. 2025:2(3):100592, ISSN 3050-4759.",
    "Banjanac M, Munić Kos V, Nujić K, Vrančić M, Belamarić D, Crnković S, Hlevnjak M, Eraković Haber V. Anti-inflammatory mechanism of action of azithromycin in LPS-stimulated J774A.1 cells. Pharmacol Res. 2012 Oct;66(4):357-62. doi: 10.1016/j.phrs.2012.06.011. Epub 2012 Jul 3. PMID: 22766077.",
    "Pradhan S, Madke B, Kabra P, Singh AL. Anti-inflammatory and Immunomodulatory Effects of Antibiotics and Their Use in Dermatology. Indian J Dermatol. 2016 Sep-Oct;61(5):469-81. doi: 10.4103/0019-5154.190105. PMID: 27688434; PMCID: PMC5029230.",
    "Benjelloun MC, El Achhab Y, Nejjari C and the ORCA Study Group (2025) Efficacy and safety of a new drug formulation, amoxicillin-clavulanate-cineole, for adult lower respiratory tract infections: a nationwide observational study in Morocco. Front. Pharmacol. 16:1549014.",
    "Felstead S. Azithromycin drug interactions. Pathol Biol (Paris). 1995 Jun;43(6):512-4. PMID: 8539073.",
    "Thorburn CE, Molesworth SJ, Sutherland R, Rittenhouse S. Postantibiotic and post-beta-lactamase inhibitor effects of amoxicillin plus clavulanate. Antimicrob Agents Chemother. 1996 Dec;40(12):2796-801. doi: 10.1128/AAC.40.12.2796. PMID: 9124843; PMCID: PMC163624.",
    "Neuhauser MM, Prause JL, Danziger LH, Pendland SL. Postantibiotic effects of ABT-773 and amoxicillin-clavulanate against Streptococcus pneumoniae and Haemophilus influenzae. Antimicrob Agents Chemother. 2001 Dec;45(12):3613-5.",
    "Richard Quintiliani, Richard Quintiliani. Pharmacokinetics/Pharmacodynamics for Critical Care Clinicians, Critical Care Clinics. 2008;24(2):335-348. ISSN 0749-0704.",
    "Ferrara A, Dos Santos C, Cimbro M, Grassi GG. Comparative antimicrobial activity and post-antibiotic effect of azithromycin, clarithromycin and roxithromycin against some respiratory pathogens. Int J Antimicrob Agents. 1996 Aug;7(3):181-6. doi: 10.1016/s0924-8579(96)00320-2. PMID: 18611754.",
    "Debbia EA, Molinari G, Paglia P, Schito GC. Post-antibiotic effect of azithromycin on respiratory tract pathogens. Drugs Exp Clin Res. 1990;16(12):615-9. PMID: 1966617.",
    "Sachin Bhagwat, 2024, CIDSCON, August 15-18, Hyderabad, India. eT136. (Nafi_Drug Interaction).",
    "The Lancet Regional Health- Southeast Asia, 2025;41. (Nafi_QT).",
    "Phase 2 CT Data on File. (Nafi_QT).",
    "Trivedi J et al. 2020 May;129:155049. (Nafi_Anti inflammatory)",
    "MIQNAF Prescribing Information. (Susceptibility and AMR and Patient Compliance/Duration of Therapy)",
  ],
} as const;
