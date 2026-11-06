/**
 * The MIQNAF® leaflet (supplied artwork, Wockhardt), as text: shown on the
 * last screen before a new game. Wording as on the leaflet; the artwork
 * pieces are in public/brand/leaflet.
 */

const ART = "/brand/leaflet";

export const LEAFLET = {
  headline: ["Breakthrough Innovation", "in CABP management"],
  hero: { src: `${ART}/hero.png`, width: 580, height: 395 },
  tagline: "The Next-Gen Macrolide",
  intro: "The Lactone-Ketolide structure with dual binding site and unique PK/PD properties, specifically designed to overcome resistance",

  /** Each point with its reference marks (superscript). */
  points: [
    {
      icon: `${ART}/icon-amr.png`,
      text: "India's first approved macrolide antibiotic combating antimicrobial resistance (AMR) and multidrug-resistant (MDR) pathogens",
      refs: "1,2,3",
    },
    {
      icon: `${ART}/icon-days.png`,
      text: "Three-day treatment regimen, significantly shortening the recovery time while improving patient outcomes",
      refs: "2",
    },
    { icon: `${ART}/icon-bactericidal.png`, text: "Bactericidal unlike other bacteriostatic macrolides", refs: "3" },
    {
      icon: `${ART}/icon-elderly.png`,
      text: "Less risk of drug-drug interactions as compared to other macrolides & well-tolerated in elderly/comorbid patients",
      refs: "4,*",
    },
  ],

  stats: [
    { icon: `${ART}/stat-lungs.png`, value: "8", unit: "Times", text: "Higher lung exposure than Azithromycin", refs: "5,6" },
    { icon: `${ART}/stat-cure.png`, value: "97%", unit: "Cure rate", text: "Achieved comparable cure rate vs Moxifloxacin", refs: "7" },
    { icon: `${ART}/stat-days.png`, value: "3", unit: "Day", text: "Ultra-short, once-a-day, oral therapy", refs: "*" },
  ],

  references: [
    "*MIQNAF® Prescribing information, Wockhardt Limited, 01/2025.",
    "Novel Macrolide Antibiotic Nafithromycin for Tackling Emerging Resistance in Respiratory Pathogens Encountered in India. Curr Microbiol 82, 465 (2025)",
    "Nafithromycin: Country’s First Indigenous Antibiotic. Ministry of Chemicals and Fertilizers. https://www.pib.gov.in/PressReleasePage.aspx?PRID=2081506&reg=48&lang=2",
    "Nafithromycin: a potential ketolide antibiotic for combating antimicrobial resistance in community-acquired bacterial pneumonia. Next Research. 2025. https://www.sciencedirect.com/science/article/abs/pii/S3050475925004610",
    "Chavan R, Zope V, Chavan N, Patil K, Yeole R, Bhagwat S, Patel M. Assessment of the in vitro cytochrome P450 (CYP) inhibition potential of nafithromycin, a next generation lactone ketolide antibiotic. Xenobiotica. 2021 Mar;51(3):251-261. doi: 10.1080/00498254.2020.1839983. Epub 2020 Nov 16. PMID: 33078993.",
    "Rodvold KA et al. Antimicrob Agents Chemother. 2017 Aug 24;61(9):e01096-17.",
    "Rodvold KA et al. Clin Pharmacokinet. 2011 Oct;50(10):637-64.",
    "The Lancet Regional Health – Southeast Asia, 2025; 41.",
  ],

  disclaimer:
    'This document is intended solely for the use of Wockhardt Ltd ("Company"). Any unauthorized copying, usage, publication, distribution, or reproduction of any part of this document without explicit consent from the Company is strictly prohibited. The said documents should be returned promptly upon request by the Company. It is important to adhere to the confidentiality clause to avoid potential legal consequences for any individual or organization found breaching the privacy of this data. This information constitutes an indirect, unadjusted comparison predicated on available scientific literature, rather than direct head-to-head studies. It delineates anticipated differences in treatments and postulates variations based on data. This information does not constitute definitive guidance for treatment decisions. The data represents an extrapolation of existing studies, potentially subject to bias and inaccuracies due to confounders and population mismatches. Interpret conclusions with caution and do not substitute them for professional medical advice. Healthcare providers must exercise their clinical expertise and consider patient-specific circumstances when making treatment decisions. This information is intended solely for informational purposes and does not constitute an endorsement of any specific treatment or medication. Always refer to relevant clinical guidelines and peer-reviewed literature for the latest information. To be sold by retail on prescription of Specialist only.',
  restriction: "For the use of Registered Medical Practitioner or a Hospital or a Laboratory only. © Copyright by Wockhardt.",

  company: { src: `${ART}/wockhardt-life-wins.png`, width: 228, height: 50, alt: "Wockhardt, Life Wins" },
  address: "Wockhardt Towers, G Block, Bandra Kurla Complex, Bandra East, Mumbai, Maharashtra 400051",
  pharmacovigilance: {
    heading: "Pharmacovigilance Details",
    email: "pvsafety@wockhardt.com",
    phone: "1800-258-8127",
  },
  qr: { src: `${ART}/qr.png`, width: 141, height: 134, alt: "QR code: MIQNAF®" },
} as const;
