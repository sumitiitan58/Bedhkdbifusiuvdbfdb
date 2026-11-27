export type PyqExamType = 'JEE Main' | 'JEE Adv' | 'NEET UG';
export type PyqSubject = 'Physics' | 'Chemistry' | 'Mathematics' | 'Biology';
export type PyqQuestionType = 'MCQ' | 'NAT';

export interface ConceptPyqQuestion {
  id: string;
  exam: PyqExamType;
  subject: PyqSubject;
  chapter: string;
  conceptId: string;
  conceptTitle: string;
  conceptTitleHi: string;
  yieldLabel: 'High Yield' | 'Rising Trend' | 'Core Concept';
  year: number;
  shiftBadge: string;
  questionType: PyqQuestionType;
  questionEn: string;
  questionHi: string;
  optionsEn?: string[];
  optionsHi?: string[];
  correctOptionIndex?: number;
  natAnswer?: string;
  solutionStepsEn: string[];
  solutionStepsHi: string[];
  examTipEn: string;
}

export const CONCEPT_PYQ_BANK: ConceptPyqQuestion[] = [
  // PHYSICS — ELECTROSTATICS (Gauss's Law in Symmetric Shells)
  {
    id: 'pyq-phy-es-1',
    exam: 'JEE Main',
    subject: 'Physics',
    chapter: 'Electrostatics',
    conceptId: 'gauss-symmetric-shells',
    conceptTitle: "Gauss's Law in Symmetric Shells",
    conceptTitleHi: 'सममित कोशों में गॉस का नियम',
    yieldLabel: 'High Yield',
    year: 2025,
    shiftBadge: '2025 · Jan Shift 1',
    questionType: 'MCQ',
    questionEn:
      'A uniformly charged spherical shell of radius $R$ carries total charge $Q$. The electric field at distance $r = R/2$ from the centre and at $r = 2R$ are respectively:',
    questionHi:
      'त्रिज्या $R$ के एक समान रूप से आवेशित गोलीय कोश पर कुल आवेश $Q$ है। केंद्र से $r = R/2$ तथा $r = 2R$ दूरी पर विद्युत क्षेत्र क्रमशः होंगे:',
    optionsEn: [
      '$0$ and $\\frac{Q}{16\\pi\\varepsilon_0 R^2}$',
      '$\\frac{Q}{4\\pi\\varepsilon_0 R^2}$ and $\\frac{Q}{16\\pi\\varepsilon_0 R^2}$',
      '$0$ and $\\frac{Q}{4\\pi\\varepsilon_0 R^2}$',
      '$\\frac{Q}{8\\pi\\varepsilon_0 R^2}$ and $0$',
    ],
    optionsHi: [
      '$0$ तथा $\\frac{Q}{16\\pi\\varepsilon_0 R^2}$',
      '$\\frac{Q}{4\\pi\\varepsilon_0 R^2}$ तथा $\\frac{Q}{16\\pi\\varepsilon_0 R^2}$',
      '$0$ तथा $\\frac{Q}{4\\pi\\varepsilon_0 R^2}$',
      '$\\frac{Q}{8\\pi\\varepsilon_0 R^2}$ तथा $0$',
    ],
    correctOptionIndex: 0,
    solutionStepsEn: [
      'For $r = R/2 < R$, the Gaussian sphere encloses zero charge ($q_{\\text{enc}} = 0$), so $E_{\\text{in}} = 0$.',
      'For $r = 2R > R$, the shell behaves like a point charge $Q$ at the centre: $E_{\\text{out}} = \\frac{1}{4\\pi\\varepsilon_0}\\frac{Q}{(2R)^2} = \\frac{Q}{16\\pi\\varepsilon_0 R^2}$.',
    ],
    solutionStepsHi: [
      '$r = R/2 < R$ के लिए गॉसीय गोले के भीतर परिबद्ध आवेश शून्य ($q_{\\text{enc}} = 0$) है, अतः $E_{\\text{in}} = 0$।',
      '$r = 2R > R$ पर कोश केंद्र पर रखे बिंदु आवेश की तरह व्यवहार करता है: $E_{\\text{out}} = \\frac{Q}{16\\pi\\varepsilon_0 R^2}$।',
    ],
    examTipEn: 'Inside a hollow conducting or uniformly charged thin shell, $E = 0$ everywhere while potential stays constant at $V = kQ/R$.',
  },
  {
    id: 'pyq-phy-es-2',
    exam: 'JEE Main',
    subject: 'Physics',
    chapter: 'Electrostatics',
    conceptId: 'gauss-symmetric-shells',
    conceptTitle: "Gauss's Law in Symmetric Shells",
    conceptTitleHi: 'सममित कोशों में गॉस का नियम',
    yieldLabel: 'High Yield',
    year: 2024,
    shiftBadge: '2024 · Apr Shift 2',
    questionType: 'NAT',
    questionEn:
      'A point charge $q = 8.85\\,\\mu\\text{C}$ is placed at the centre of a cube of side $10\\,\\text{cm}$. Find the electric flux (in $10^5\\,\\text{N}\\cdot\\text{m}^2/\\text{C}$) passing through any ONE face of the cube. (Take $\\varepsilon_0 = 8.85 \\times 10^{-12}\\,\\text{SI}$). Wait — report $6\\Phi_{\\text{face}} / 10^5$ as an integer.',
    questionHi:
      'भुजा $10\\,\\text{cm}$ वाले घन के केंद्र पर $q = 8.85\\,\\mu\\text{C}$ आवेश रखा है। किसी एक फलक से गुजरने वाले फ्लक्स $\\Phi_{\\text{face}}$ के लिए $6\\Phi_{\\text{face}} / 10^5$ का पूर्णांक मान ज्ञात करें।',
    natAnswer: '10',
    solutionStepsEn: [
      'Total flux through all 6 faces by Gauss Law is $\\Phi_{\\text{total}} = \\frac{q}{\\varepsilon_0} = \\frac{8.85\\times 10^{-6}}{8.85\\times 10^{-12}} = 10^6\\,\\text{N}\\cdot\\text{m}^2/\\text{C}$.',
      'Since the charge is symmetrically placed at the centre, $6\\Phi_{\\text{face}} = \\Phi_{\\text{total}} = 10 \\times 10^5$, so the integer answer is $10$.',
    ],
    solutionStepsHi: [
      'गॉस के नियम से कुल फ्लक्स $\\Phi_{\\text{total}} = q/\\varepsilon_0 = 10^6\\,\\text{N}\\cdot\\text{m}^2/\\text{C}$ है।',
      'सममिति से $6\\Phi_{\\text{face}} = 10 \\times 10^5$, अतः पूर्णांक उत्तर $10$ है।',
    ],
    examTipEn: 'Flux through a closed cube does NOT depend on the side length $a$ — ignore dimensions when charge is centered.',
  },
  // PHYSICS — ROTATIONAL MOTION
  {
    id: 'pyq-phy-rot-1',
    exam: 'JEE Adv',
    subject: 'Physics',
    chapter: 'Rotational Motion',
    conceptId: 'rolling-incline-acceleration',
    conceptTitle: 'Pure Rolling on an Inclined Plane',
    conceptTitleHi: 'आनत तल पर शुद्ध लोटनिक गति',
    yieldLabel: 'High Yield',
    year: 2024,
    shiftBadge: 'JEE Adv 2024 · Paper 1',
    questionType: 'MCQ',
    questionEn:
      'A solid sphere and a hollow cylinder of equal mass $M$ and radius $R$ roll without slipping down an incline of angle $\\theta$. The ratio of acceleration of the solid sphere to that of the hollow cylinder is:',
    questionHi:
      'समान द्रव्यमान $M$ व त्रिज्या $R$ का एक ठोस गोला और खोखला बेलन $\\theta$ कोण वाले आनत तल पर बिना फिसले लुढ़कते हैं। ठोस गोले और खोखले बेलन के त्वरण का अनुपात है:',
    optionsEn: ['$10 : 7$', '$7 : 5$', '$5 : 3$', '$2 : 1$'],
    optionsHi: ['$10 : 7$', '$7 : 5$', '$5 : 3$', '$2 : 1$'],
    correctOptionIndex: 0,
    solutionStepsEn: [
      'Pure rolling acceleration is $a = \\frac{g\\sin\\theta}{1 + k^2/R^2}$.',
      'For solid sphere $k^2/R^2 = 2/5 \\Rightarrow a_s = \\frac{5}{7}g\\sin\\theta$. For hollow cylinder $k^2/R^2 = 1 \\Rightarrow a_c = \\frac{1}{2}g\\sin\\theta$.',
      'Ratio $a_s / a_c = (5/7) / (1/2) = 10 : 7$.',
    ],
    solutionStepsHi: [
      'शुद्ध लोटनिक त्वरण $a = \\frac{g\\sin\\theta}{1 + k^2/R^2}$ होता है।',
      'ठोस गोले के लिए $a_s = \\frac{5}{7}g\\sin\\theta$ तथा खोखले बेलन के लिए $a_c = \\frac{1}{2}g\\sin\\theta$।',
      'अनुपात $a_s / a_c = 10 : 7$।',
    ],
    examTipEn: 'Memorize $1 + k^2/R^2$ denominators: Solid sphere $7/5$, Disc $3/2$, Hollow sphere $5/3$, Ring/Hollow cylinder $2$.',
  },
  // PHYSICS — RAY OPTICS
  {
    id: 'pyq-phy-opt-1',
    exam: 'NEET UG',
    subject: 'Physics',
    chapter: 'Ray Optics',
    conceptId: 'lens-maker-immersion',
    conceptTitle: 'Lens Maker Formula & Medium Immersion',
    conceptTitleHi: 'लेंस निर्माता सूत्र व माध्यम परिवर्तन',
    yieldLabel: 'High Yield',
    year: 2025,
    shiftBadge: 'NEET UG 2025',
    questionType: 'MCQ',
    questionEn:
      'An equiconvex lens of refractive index $1.5$ has focal length $20\\,\\text{cm}$ in air. When completely immersed in a liquid of refractive index $1.6$, its behaviour and focal length become:',
    questionHi:
      '$1.5$ अपवर्तनांक वाले समउत्तल लेंस की वायु में फोकस दूरी $20\\,\\text{cm}$ है। इसे $1.6$ अपवर्तनांक के द्रव में डुबोने पर इसकी प्रकृति और फोकस दूरी होगी:',
    optionsEn: [
      'Diverging, $-160\\,\\text{cm}$',
      'Converging, $+160\\,\\text{cm}$',
      'Diverging, $-80\\,\\text{cm}$',
      'Converging, $+40\\,\\text{cm}$',
    ],
    optionsHi: [
      'अपसारी, $-160\\,\\text{cm}$',
      'अभिसारी, $+160\\,\\text{cm}$',
      'अपसारी, $-80\\,\\text{cm}$',
      'अभिसारी, $+40\\,\\text{cm}$',
    ],
    correctOptionIndex: 0,
    solutionStepsEn: [
      'Using $\\frac{f_l}{f_a} = \\frac{\\mu_g - 1}{(\\mu_g / \\mu_l) - 1} = \\frac{1.5 - 1}{(1.5/1.6) - 1} = \\frac{0.5}{-0.1/1.6} = -8$.',
      'Therefore $f_l = -8 \\times 20 = -160\\,\\text{cm}$ (negative sign confirms diverging behaviour).',
    ],
    solutionStepsHi: [
      '$\\frac{f_l}{f_a} = \\frac{\\mu_g - 1}{(\\mu_g/\\mu_l) - 1} = -8$।',
      'अतः $f_l = -8 \\times 20 = -160\\,\\text{cm}$ (ऋणात्मक चिह्न अपसारी प्रकृति दर्शाता है)।',
    ],
    examTipEn: 'Whenever $\\mu_{\\text{liquid}} > \\mu_{\\text{lens}}$, a convex lens immediately flips into a diverging lens.',
  },
  // CHEMISTRY — CHEMICAL BONDING
  {
    id: 'pyq-chem-cb-1',
    exam: 'JEE Main',
    subject: 'Chemistry',
    chapter: 'Chemical Bonding',
    conceptId: 'vsepr-hybridisation-shapes',
    conceptTitle: 'VSEPR Geometry & Lone-Pair Distortions',
    conceptTitleHi: 'VSEPR ज्यामिति व एकाकी युग्म विकृति',
    yieldLabel: 'High Yield',
    year: 2026,
    shiftBadge: '2026 · Jan Shift 2',
    questionType: 'MCQ',
    questionEn:
      'Which of the following pairs of xenon and interhalogen species are BOTH square planar in molecular geometry?',
    questionHi:
      'निम्नलिखित में से किस युग्म की दोनों प्रजातियों की आणविक ज्यामिति वर्ग समतलीय (Square Planar) है?',
    optionsEn: [
      '$\\text{XeF}_4$ and $\\text{ICl}_4^-$',
      '$\\text{XeF}_4$ and $\\text{SF}_4$',
      '$\\text{XeOF}_4$ and $\\text{BrF}_5$',
      '$\\text{XeF}_2$ and $\\text{I}_3^-$',
    ],
    optionsHi: [
      '$\\text{XeF}_4$ तथा $\\text{ICl}_4^-$',
      '$\\text{XeF}_4$ तथा $\\text{SF}_4$',
      '$\\text{XeOF}_4$ तथा $\\text{BrF}_5$',
      '$\\text{XeF}_2$ तथा $\\text{I}_3^-$',
    ],
    correctOptionIndex: 0,
    solutionStepsEn: [
      'For $\\text{XeF}_4$: steric number $= \\frac{8 + 4}{2} = 6$ ($sp^3d^2$) with 4 bond pairs and 2 lone pairs $\\Rightarrow$ Square Planar.',
      'For $\\text{ICl}_4^-$: steric number $= \\frac{7 + 4 + 1}{2} = 6$ ($sp^3d^2$) with 4 bond pairs and 2 lone pairs $\\Rightarrow$ Square Planar.',
    ],
    solutionStepsHi: [
      '$\\text{XeF}_4$ में संकरण $sp^3d^2$ (4 बंध युग्म + 2 एकाकी युग्म) $\\Rightarrow$ वर्ग समतलीय।',
      '$\\text{ICl}_4^-$ में भी संकरण $sp^3d^2$ (4 बंध युग्म + 2 एकाकी युग्म) $\\Rightarrow$ वर्ग समतलीय।',
    ],
    examTipEn: 'Steric number 6 with 2 lone pairs is always Square Planar (zero dipole moment when peripheral atoms are identical).',
  },
  // CHEMISTRY — CHEMICAL KINETICS
  {
    id: 'pyq-chem-ck-1',
    exam: 'NEET UG',
    subject: 'Chemistry',
    chapter: 'Chemical Kinetics',
    conceptId: 'first-order-half-life',
    conceptTitle: 'First-Order Half-Life & Arrhenius Plot',
    conceptTitleHi: 'प्रथम कोटि अर्ध-आयु व आरेनियस ग्राफ',
    yieldLabel: 'Rising Trend',
    year: 2024,
    shiftBadge: 'NEET UG 2024',
    questionType: 'MCQ',
    questionEn:
      'For a first-order reaction, the time required for $99.9\\%$ completion is approximately how many times its half-life $t_{1/2}$?',
    questionHi:
      'प्रथम कोटि की अभिक्रिया के $99.9\\%$ पूर्ण होने में लगा समय उसकी अर्ध-आयु $t_{1/2}$ का लगभग कितने गुना होता है?',
    optionsEn: ['$10\\,t_{1/2}$', '$3.3\\,t_{1/2}$', '$6.6\\,t_{1/2}$', '$2\\,t_{1/2}$'],
    optionsHi: ['$10\\,t_{1/2}$', '$3.3\\,t_{1/2}$', '$6.6\\,t_{1/2}$', '$2\\,t_{1/2}$'],
    correctOptionIndex: 0,
    solutionStepsEn: [
      '$t_{99.9\\%} = \\frac{2.303}{k}\\log_{10}(1000) = \\frac{3 \\times 2.303}{k}$.',
      'Dividing by $t_{1/2} = \\frac{0.693}{k}$ gives $\\frac{6.909}{0.693} \\approx 10$.',
    ],
    solutionStepsHi: [
      '$t_{99.9\\%} = \\frac{2.303}{k}\\log_{10}(1000) = \\frac{6.909}{k}$।',
      '$t_{1/2} = \\frac{0.693}{k}$ से भाग देने पर अनुपात लगभग $10$ प्राप्त होता है।',
    ],
    examTipEn: 'Direct NCERT Table shortcut: $t_{99.9\\%} \\approx 10\\,t_{1/2}$ and $t_{99\\%} = 2\\,t_{90\\%}$.',
  },
  // MATHEMATICS — DEFINITE INTEGRATION
  {
    id: 'pyq-math-di-1',
    exam: 'JEE Main',
    subject: 'Mathematics',
    chapter: 'Definite Integration',
    conceptId: 'kings-property-symmetry',
    conceptTitle: "King's Property & Symmetry Cancellation",
    conceptTitleHi: 'किंग प्रॉपर्टी व सममिति समाकलन',
    yieldLabel: 'High Yield',
    year: 2025,
    shiftBadge: '2025 · Apr Shift 1',
    questionType: 'NAT',
    questionEn:
      'Evaluate the integral $I = \\int_0^{\\pi/2} \\frac{\\sqrt{\\sin x}}{\\sqrt{\\sin x} + \\sqrt{\\cos x}}\\,dx$. Report the value of $\\frac{12I}{\\pi}$ as an integer.',
    questionHi:
      'समाकलन $I = \\int_0^{\\pi/2} \\frac{\\sqrt{\\sin x}}{\\sqrt{\\sin x} + \\sqrt{\\cos x}}\\,dx$ का मान ज्ञात करें तथा $\\frac{12I}{\\pi}$ का पूर्णांक मान लिखें।',
    natAnswer: '3',
    solutionStepsEn: [
      'Apply King Property $x \\to \\frac{\\pi}{2} - x$: $I = \\int_0^{\\pi/2} \\frac{\\sqrt{\\cos x}}{\\sqrt{\\cos x} + \\sqrt{\\sin x}}\\,dx$.',
      'Adding both equations: $2I = \\int_0^{\\pi/2} 1\\,dx = \\frac{\\pi}{2} \\Rightarrow I = \\frac{\\pi}{4}$.',
      'Hence $\\frac{12I}{\\pi} = \\frac{12(\\pi/4)}{\\pi} = 3$.',
    ],
    solutionStepsHi: [
      'किंग प्रॉपर्टी $x \\to \\frac{\\pi}{2} - x$ लगाने पर $2I = \\int_0^{\\pi/2} 1\\,dx = \\frac{\\pi}{2} \\Rightarrow I = \\frac{\\pi}{4}$।',
      'अतः $\\frac{12I}{\\pi} = 3$।',
    ],
    examTipEn: 'Any integral of form $\\int_a^b \\frac{f(x)}{f(x) + f(a+b-x)}\\,dx$ equals $\\frac{b - a}{2}$ instantly.',
  },
  // BIOLOGY — HUMAN PHYSIOLOGY
  {
    id: 'pyq-bio-hp-1',
    exam: 'NEET UG',
    subject: 'Biology',
    chapter: 'Human Physiology',
    conceptId: 'bohr-oxygen-dissociation',
    conceptTitle: 'Oxygen-Haemoglobin Dissociation Curve',
    conceptTitleHi: 'ऑक्सीजन-हीमोग्लोबिन वियोजन वक्र',
    yieldLabel: 'High Yield',
    year: 2025,
    shiftBadge: 'NEET UG 2025',
    questionType: 'MCQ',
    questionEn:
      'Which combination of physiological factors in tissues favours dissociation of oxyhaemoglobin (right shift of the $O_2$-dissociation curve)?',
    questionHi:
      'ऊतकों में कौन से कारकों का संयोजन ऑक्सीहीमोग्लोबिन के वियोजन (वक्र का दाईं ओर विस्थापन) के लिए अनुकूल है?',
    optionsEn: [
      'Low $pO_2$, high $pCO_2$, high $H^+$ concentration, higher temperature',
      'High $pO_2$, low $pCO_2$, low $H^+$ concentration, lower temperature',
      'High $pO_2$, high $pCO_2$, low $H^+$ concentration, lower temperature',
      'Low $pO_2$, low $pCO_2$, low $H^+$ concentration, higher temperature',
    ],
    optionsHi: [
      'कम $pO_2$, उच्च $pCO_2$, उच्च $H^+$ सांद्रता, अधिक तापमान',
      'उच्च $pO_2$, कम $pCO_2$, कम $H^+$ सांद्रता, कम तापमान',
      'उच्च $pO_2$, उच्च $pCO_2$, कम $H^+$ सांद्रता, कम तापमान',
      'कम $pO_2$, कम $pCO_2$, कम $H^+$ सांद्रता, अधिक तापमान',
    ],
    correctOptionIndex: 0,
    solutionStepsEn: [
      'In metabolically active tissues, $pO_2$ is low while $pCO_2$, $H^+$ (lower pH), and temperature are elevated.',
      'This Bohr effect reduces haemoglobin affinity for $O_2$, shifting the sigmoid curve right and delivering $O_2$ to tissues.',
    ],
    solutionStepsHi: [
      'सक्रिय ऊतकों में कम $pO_2$, उच्च $pCO_2$, उच्च $H^+$ (कम pH) तथा अधिक तापमान ऑक्सीहीमोग्लोबिन के वियोजन को बढ़ावा देते हैं।',
    ],
    examTipEn: 'NCERT Class 11 Ch. 17 verbatim: Alveoli = High $pO_2$, Low $pCO_2$, Less $H^+$, Low Temp (Formation). Tissues = exact opposite (Dissociation).',
  },
  // BIOLOGY — GENETICS
  {
    id: 'pyq-bio-gen-1',
    exam: 'NEET UG',
    subject: 'Biology',
    chapter: 'Genetics',
    conceptId: 'lac-operon-regulation',
    conceptTitle: 'Lac Operon Inducible Regulation',
    conceptTitleHi: 'लैक ओपेरॉन प्रेरक नियमन',
    yieldLabel: 'High Yield',
    year: 2024,
    shiftBadge: 'NEET UG 2024',
    questionType: 'MCQ',
    questionEn:
      'In the *E. coli* lac operon, the structural genes $z$, $y$, and $a$ code respectively for:',
    questionHi:
      '*E. coli* के लैक ओपेरॉन में संरचनात्मक जीन $z$, $y$ और $a$ क्रमशः किसे कोड करते हैं?',
    optionsEn: [
      '$\\beta$-galactosidase, permease, transacetylase',
      'Permease, $\\beta$-galactosidase, transacetylase',
      'Transacetylase, permease, $\\beta$-galactosidase',
      'Repressor protein, permease, $\\beta$-galactosidase',
    ],
    optionsHi: [
      '$\\beta$-गैलेक्टोसिडेस, पर्मिएस, ट्रांसएसिटाइलेस',
      'पर्मिएस, $\\beta$-गैलेक्टोसिडेस, ट्रांसएसिटाइलेस',
      'ट्रांसएसिटाइलेस, पर्मिएस, $\\beta$-गैलेक्टोसिडेस',
      'रिप्रेसर प्रोटीन, पर्मिएस, $\\beta$-गैलेक्टोसिडेस',
    ],
    correctOptionIndex: 0,
    solutionStepsEn: [
      'In Jacob and Monod lac operon model: $i$ = inhibitor (repressor), $z$ = $\\beta$-galactosidase, $y$ = permease, $a$ = transacetylase.',
      'Lactose/allolactose acts as inducer by binding and inactivating the repressor protein.',
    ],
    solutionStepsHi: [
      'लैक ओपेरॉन में $z = \\beta$-गैलेक्टोसिडेस, $y =$ पर्मिएस तथा $a =$ ट्रांसएसिटाइलेस को कोड करता है।',
    ],
    examTipEn: 'Mnemonic Z-Y-A → Galactosidase, Permease, Transacetylase — tested 6 times in the last 8 NEET papers.',
  },
];

// ============================================================================
// 2027 HIGH-YIELD PREDICTOR DATA (JEE Main 2027 & NEET UG 2027)
// ============================================================================
export interface PredictorChapterItem {
  id: string;
  exam: 'JEE Main 2027' | 'NEET UG 2027';
  subject: PyqSubject;
  chapter: string;
  weightagePct: number;
  expectedQuestions: number;
  priorityTier: 1 | 2 | 3;
  risingTrend: boolean;
  topSubTopics: [string, string, string];
}

export const PREDICTOR_2027_CHAPTERS: PredictorChapterItem[] = [
  // JEE Main 2027
  {
    id: 'pred-jee-1',
    exam: 'JEE Main 2027',
    subject: 'Physics',
    chapter: 'Electrostatics',
    weightagePct: 8.6,
    expectedQuestions: 2,
    priorityTier: 1,
    risingTrend: true,
    topSubTopics: ["Gauss's Law in Symmetric Shells", 'Dipole Torque & Potential', 'Capacitor Dielectric Slabs'],
  },
  {
    id: 'pred-jee-2',
    exam: 'JEE Main 2027',
    subject: 'Physics',
    chapter: 'Rotational Motion',
    weightagePct: 8.2,
    expectedQuestions: 2,
    priorityTier: 1,
    risingTrend: false,
    topSubTopics: ['Moment of Inertia Axes', 'Pure Rolling on Incline', 'Angular Momentum Conservation'],
  },
  {
    id: 'pred-jee-3',
    exam: 'JEE Main 2027',
    subject: 'Physics',
    chapter: 'Ray Optics',
    weightagePct: 7.4,
    expectedQuestions: 2,
    priorityTier: 1,
    risingTrend: true,
    topSubTopics: ['Lens Maker Immersion', 'Minimum Deviation Prism', 'Optical Instruments Magnification'],
  },
  {
    id: 'pred-jee-4',
    exam: 'JEE Main 2027',
    subject: 'Chemistry',
    chapter: 'Chemical Bonding',
    weightagePct: 9.1,
    expectedQuestions: 3,
    priorityTier: 1,
    risingTrend: true,
    topSubTopics: ['VSEPR Shapes & Lone Pairs', 'MOT Bond Order & Magnetism', 'Dipole Moment Exceptions'],
  },
  {
    id: 'pred-jee-5',
    exam: 'JEE Main 2027',
    subject: 'Chemistry',
    chapter: 'Coordination Compounds',
    weightagePct: 8.4,
    expectedQuestions: 2,
    priorityTier: 1,
    risingTrend: true,
    topSubTopics: ['CFT Splitting & CFSE', 'Magnetic Moment Spin-Only', 'Optical & Linkage Isomerism'],
  },
  {
    id: 'pred-jee-6',
    exam: 'JEE Main 2027',
    subject: 'Mathematics',
    chapter: 'Definite Integration',
    weightagePct: 8.9,
    expectedQuestions: 2,
    priorityTier: 1,
    risingTrend: false,
    topSubTopics: ["King's Property Symmetry", 'Leibniz Differentiation Rule', 'Limit of a Sum'],
  },
  {
    id: 'pred-jee-7',
    exam: 'JEE Main 2027',
    subject: 'Mathematics',
    chapter: 'Vectors & 3D Geometry',
    weightagePct: 9.8,
    expectedQuestions: 3,
    priorityTier: 1,
    risingTrend: true,
    topSubTopics: ['Shortest Distance Skew Lines', 'Foot of Perpendicular Image', 'Scalar & Vector Triple Product'],
  },
  {
    id: 'pred-jee-8',
    exam: 'JEE Main 2027',
    subject: 'Chemistry',
    chapter: 'Chemical Kinetics',
    weightagePct: 6.2,
    expectedQuestions: 2,
    priorityTier: 2,
    risingTrend: false,
    topSubTopics: ['First-Order Half-Life Ratios', 'Arrhenius Activation Energy', 'Order from Rate Law Data'],
  },
  {
    id: 'pred-jee-9',
    exam: 'JEE Main 2027',
    subject: 'Physics',
    chapter: 'Current Electricity',
    weightagePct: 7.1,
    expectedQuestions: 2,
    priorityTier: 2,
    risingTrend: false,
    topSubTopics: ['Kirchhoff Loop Symmetry', 'Meter Bridge Null Point', 'Galvanometer Shunt Conversion'],
  },
  {
    id: 'pred-jee-10',
    exam: 'JEE Main 2027',
    subject: 'Mathematics',
    chapter: 'Matrices & Determinants',
    weightagePct: 7.6,
    expectedQuestions: 2,
    priorityTier: 2,
    risingTrend: true,
    topSubTopics: ['Adjoint Properties |adj A|', 'Cayley-Hamilton Powers', 'System of Linear Equations'],
  },
  {
    id: 'pred-jee-11',
    exam: 'JEE Main 2027',
    subject: 'Physics',
    chapter: 'Elasticity & Fluids',
    weightagePct: 3.8,
    expectedQuestions: 1,
    priorityTier: 3,
    risingTrend: false,
    topSubTopics: ['Bernoulli Venturimeter', 'Excess Pressure Soap Bubble', 'Young Modulus Wire Elongation'],
  },
  {
    id: 'pred-jee-12',
    exam: 'JEE Main 2027',
    subject: 'Mathematics',
    chapter: 'Statistics & Heights',
    weightagePct: 3.4,
    expectedQuestions: 1,
    priorityTier: 3,
    risingTrend: false,
    topSubTopics: ['Variance Shift Scaling', 'Combined Mean & SD', 'Mean Deviation about Median'],
  },

  // NEET UG 2027
  {
    id: 'pred-neet-1',
    exam: 'NEET UG 2027',
    subject: 'Biology',
    chapter: 'Genetics',
    weightagePct: 12.4,
    expectedQuestions: 11,
    priorityTier: 1,
    risingTrend: true,
    topSubTopics: ['Lac Operon Regulation', 'DNA Replication Leading/Lagging', 'Pedigree & Linkage Crosses'],
  },
  {
    id: 'pred-neet-2',
    exam: 'NEET UG 2027',
    subject: 'Biology',
    chapter: 'Human Physiology',
    weightagePct: 11.2,
    expectedQuestions: 10,
    priorityTier: 1,
    risingTrend: true,
    topSubTopics: ['O2 Dissociation Bohr Shift', 'Cardiac Cycle & ECG Waves', 'Counter-Current Nephron Loop'],
  },
  {
    id: 'pred-neet-3',
    exam: 'NEET UG 2027',
    subject: 'Biology',
    chapter: 'Biotechnology & Applications',
    weightagePct: 8.6,
    expectedQuestions: 7,
    priorityTier: 1,
    risingTrend: true,
    topSubTopics: ['pBR322 Selectable Markers', 'PCR 3-Step Temperature Cycle', 'RNAi & Bt Cotton Cry Genes'],
  },
  {
    id: 'pred-neet-4',
    exam: 'NEET UG 2027',
    subject: 'Chemistry',
    chapter: 'Chemical Bonding',
    weightagePct: 7.8,
    expectedQuestions: 4,
    priorityTier: 1,
    risingTrend: false,
    topSubTopics: ['VSEPR Shapes & Angles', 'MOT Paramagnetic Species', 'Hydrogen Bonding Boiling Points'],
  },
  {
    id: 'pred-neet-5',
    exam: 'NEET UG 2027',
    subject: 'Physics',
    chapter: 'Ray Optics',
    weightagePct: 7.2,
    expectedQuestions: 4,
    priorityTier: 1,
    risingTrend: true,
    topSubTopics: ['Lens Maker Immersion', 'Total Internal Reflection', 'Compound Microscope Tube Length'],
  },
  {
    id: 'pred-neet-6',
    exam: 'NEET UG 2027',
    subject: 'Chemistry',
    chapter: 'Chemical Kinetics',
    weightagePct: 6.4,
    expectedQuestions: 3,
    priorityTier: 2,
    risingTrend: false,
    topSubTopics: ['First-Order Half-Life', 'Zero-Order Graph Slopes', 'Catalyst Activation Barrier'],
  },
  {
    id: 'pred-neet-7',
    exam: 'NEET UG 2027',
    subject: 'Biology',
    chapter: 'Plant Physiology',
    weightagePct: 7.5,
    expectedQuestions: 6,
    priorityTier: 2,
    risingTrend: false,
    topSubTopics: ['C4 Hatch-Slack Pathway', 'Chemiosmotic ATP Synthesis', 'Auxin & Gibberellin Roles'],
  },
  {
    id: 'pred-neet-8',
    exam: 'NEET UG 2027',
    subject: 'Physics',
    chapter: 'Electrostatics',
    weightagePct: 6.8,
    expectedQuestions: 3,
    priorityTier: 2,
    risingTrend: false,
    topSubTopics: ["Gauss's Law Shells", 'Equipotential Surfaces', 'Series-Parallel Capacitors'],
  },
  {
    id: 'pred-neet-9',
    exam: 'NEET UG 2027',
    subject: 'Physics',
    chapter: 'Rotational Motion',
    weightagePct: 5.9,
    expectedQuestions: 3,
    priorityTier: 2,
    risingTrend: false,
    topSubTopics: ['Radius of Gyration Ratios', 'Torque = Iα Equilibrium', 'Rolling Kinetic Energy'],
  },
  {
    id: 'pred-neet-10',
    exam: 'NEET UG 2027',
    subject: 'Biology',
    chapter: 'Ecology & Biodiversity',
    weightagePct: 8.1,
    expectedQuestions: 7,
    priorityTier: 1,
    risingTrend: true,
    topSubTopics: ['Population Growth Logistic Curve', 'Species-Area Log Graph', 'In-Situ vs Ex-Situ Hotspots'],
  },
  {
    id: 'pred-neet-11',
    exam: 'NEET UG 2027',
    subject: 'Chemistry',
    chapter: 'Biomolecules & Polymers',
    weightagePct: 3.9,
    expectedQuestions: 2,
    priorityTier: 3,
    risingTrend: false,
    topSubTopics: ['Reducing Sugars & Sucrose', 'Essential Amino Acids', 'Vitamin Deficiency Pairs'],
  },
  {
    id: 'pred-neet-12',
    exam: 'NEET UG 2027',
    subject: 'Physics',
    chapter: 'Thermal Properties',
    weightagePct: 3.6,
    expectedQuestions: 2,
    priorityTier: 3,
    risingTrend: false,
    topSubTopics: ['Wien Displacement Law', 'Newton Cooling Average Temp', 'Stefan-Boltzmann Radiance'],
  },
];

// ============================================================================
// NCERT-TO-PYQ MAPPER DATA (Split-Pane Desktop View)
// ============================================================================
export interface NcertHighlightLine {
  id: string;
  classLevel: 'Class 11' | 'Class 12';
  subject: 'Biology' | 'Chemistry' | 'Physics';
  chapter: string;
  pageRef: string;
  sectionHeading: string;
  contextBefore: string;
  highlightedSentence: string;
  contextAfter: string;
  linkedPyqs: Array<{
    id: string;
    examYear: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }>;
}

export const NCERT_TO_PYQ_HIGHLIGHTS: NcertHighlightLine[] = [
  {
    id: 'ncert-bio-1',
    classLevel: 'Class 11',
    subject: 'Biology',
    chapter: 'Human Physiology — Breathing & Exchange',
    pageRef: 'NCERT Class 11 · Ch. 17 · p. 274',
    sectionHeading: 'Transport of Oxygen — Bohr Effect Conditions',
    contextBefore: 'In the alveoli, where there is high pO2, low pCO2, lesser H+ concentration and lower temperature, the factors are all favourable for the formation of oxyhaemoglobin,',
    highlightedSentence:
      'whereas in the tissues, where low pO2, high pCO2, high H+ concentration and higher temperature exist, the conditions are favourable for dissociation of oxygen from the oxyhaemoglobin.',
    contextAfter: 'Every 100 ml of oxygenated blood can deliver around 5 ml of O2 to the tissues under normal physiological conditions.',
    linkedPyqs: [
      {
        id: 'npyq-b1-1',
        examYear: 'NEET UG 2025',
        question: 'Which set of tissue conditions shifts the oxygen-haemoglobin dissociation curve to the right?',
        options: [
          'Low pO2, high pCO2, high H+, high temperature',
          'High pO2, low pCO2, low H+, low temperature',
          'High pO2, high pCO2, high pH, low temperature',
          'Low pO2, low pCO2, high pH, high temperature',
        ],
        correctIndex: 0,
        explanation: 'Directly lifted from NCERT p. 274: active tissues have high CO2, high H+ (low pH), and high temperature, triggering Bohr dissociation.',
      },
      {
        id: 'npyq-b1-2',
        examYear: 'NEET UG 2022',
        question: 'Under normal physiological conditions, 100 ml of oxygenated blood delivers approximately how much O2 to tissues?',
        options: ['5 ml of O2', '4 ml of O2', '15 ml of O2', '20 ml of O2'],
        correctIndex: 0,
        explanation: 'NCERT p. 274 exact figure: 100 ml oxygenated blood delivers ~5 ml O2 (while 100 ml deoxygenated blood delivers ~4 ml CO2 to alveoli).',
      },
    ],
  },
  {
    id: 'ncert-bio-2',
    classLevel: 'Class 12',
    subject: 'Biology',
    chapter: 'Genetics — Molecular Basis of Inheritance',
    pageRef: 'NCERT Class 12 · Ch. 6 · p. 117',
    sectionHeading: 'The Lac Operon — Structural Genes & Inducer',
    contextBefore: 'The lac operon consists of one regulatory gene (the i gene) and three structural genes (z, y, and a).',
    highlightedSentence:
      'The z gene codes for beta-galactosidase (β-gal), the y gene codes for permease, and the a gene encodes a transacetylase; lactose is the substrate and regulates switching on and off of the operon.',
    contextAfter: 'Hence, lactose is termed as inducer. Regulation of lac operon by repressor is referred to as negative regulation.',
    linkedPyqs: [
      {
        id: 'npyq-b2-1',
        examYear: 'NEET UG 2024',
        question: 'In the lac operon of E. coli, which gene increases cell permeability to β-galactosides?',
        options: ['y gene (permease)', 'z gene (β-galactosidase)', 'a gene (transacetylase)', 'i gene (repressor)'],
        correctIndex: 0,
        explanation: 'NCERT p. 117 verbatim: the y gene codes for permease, which increases permeability of the cell to β-galactosides.',
      },
      {
        id: 'npyq-b2-2',
        examYear: 'NEET UG 2021',
        question: 'Regulation of lac operon by the repressor protein is categorized as:',
        options: ['Negative regulation', 'Positive-only regulation', 'Feedback inhibition', 'Post-transcriptional splicing'],
        correctIndex: 0,
        explanation: 'NCERT explicitly states: regulation of lac operon by repressor is referred to as negative regulation.',
      },
    ],
  },
  {
    id: 'ncert-chem-1',
    classLevel: 'Class 11',
    subject: 'Chemistry',
    chapter: 'Chemical Bonding & Molecular Structure',
    pageRef: 'NCERT Class 11 · Part 1 · p. 115',
    sectionHeading: 'VSEPR Repulsion Hierarchy & Bond Angles',
    contextBefore: 'According to Nyholm and Gillespie refinement of VSEPR theory, lone pairs occupy more angular space around the central atom than bond pairs.',
    highlightedSentence:
      'The repulsive interaction of electron pairs decreases in the order: Lone pair (lp) – Lone pair (lp) > Lone pair (lp) – Bond pair (bp) > Bond pair (bp) – Bond pair (bp).',
    contextAfter: 'Consequently, H2O (2 lone pairs) compresses to 104.5° while NH3 (1 lone pair) compresses to 107° from the tetrahedral 109.5°.',
    linkedPyqs: [
      {
        id: 'npyq-c1-1',
        examYear: 'JEE Main 2025 · Jan',
        question: 'The correct order of bond angle among CH4, NH3, and H2O based on VSEPR lp-lp vs lp-bp repulsions is:',
        options: ['CH4 > NH3 > H2O', 'H2O > NH3 > CH4', 'NH3 > CH4 > H2O', 'CH4 > H2O > NH3'],
        correctIndex: 0,
        explanation: 'Zero lone pairs in CH4 (109.5°) > 1 lone pair in NH3 (107°) > 2 lone pairs in H2O (104.5°).',
      },
      {
        id: 'npyq-c1-2',
        examYear: 'NEET UG 2023',
        question: 'In ClF3 (T-shaped, sp3d), both lone pairs occupy equatorial positions instead of axial positions because:',
        options: [
          'Equatorial placement minimizes 90° lp–lp and lp–bp repulsions',
          'Axial orbitals have higher s-character',
          'Fluorine prefers equatorial positions over lone pairs',
          'ClF3 has zero dipole moment',
        ],
        correctIndex: 0,
        explanation: 'Placing lone pairs at 120° equatorial sites avoids severe 90° lp-lp repulsions (Bent rule + VSEPR).',
      },
    ],
  },
  {
    id: 'ncert-chem-2',
    classLevel: 'Class 12',
    subject: 'Chemistry',
    chapter: 'Coordination Compounds — Crystal Field Theory',
    pageRef: 'NCERT Class 12 · Ch. 9 · p. 258',
    sectionHeading: 'Spectrochemical Series & Pairing Energy',
    contextBefore: 'Ligands can be arranged in a series in the order of increasing field strength called the spectrochemical series.',
    highlightedSentence:
      'If Δo < P, the fourth electron enters one of the eg orbitals giving configuration t2g3 eg1 (weak field / high spin); if Δo > P, it becomes energetically favourable to pair in t2g giving t2g4 eg0 (strong field / low spin).',
    contextAfter: 'CN- and CO are strong field ligands whereas halide ions and H2O are weak field ligands for most 3d ions.',
    linkedPyqs: [
      {
        id: 'npyq-c2-1',
        examYear: 'JEE Main 2026 · Jan',
        question: 'For a d6 octahedral complex with Δo > P (strong field ligand like CN-), the ground state electronic configuration and unpaired electrons are:',
        options: ['t2g6 eg0, 0 unpaired (diamagnetic)', 't2g4 eg2, 4 unpaired (paramagnetic)', 't2g5 eg1, 2 unpaired', 't2g3 eg3, 4 unpaired'],
        correctIndex: 0,
        explanation: 'When Δo > P, all 6 electrons pair up inside the lower-energy t2g set -> t2g6 eg0 (zero unpaired electrons).',
      },
    ],
  },
  {
    id: 'ncert-phy-1',
    classLevel: 'Class 12',
    subject: 'Physics',
    chapter: 'Electrostatics — Conductors & Cavity Shielding',
    pageRef: 'NCERT Class 12 · Ch. 2 · p. 68',
    sectionHeading: 'Electrostatic Shielding inside Hollow Conductors',
    contextBefore: 'Inside a conductor, electrostatic field is zero in static equilibrium and any excess charge resides strictly on the outer surface.',
    highlightedSentence:
      'Whatever be the charge and field configuration outside, any cavity in a conductor remains shielded from outside electric influence: the field inside the cavity is always zero.',
    contextAfter: 'This phenomenon is known as electrostatic shielding and protects sensitive instruments (and passengers inside a car during lightning).',
    linkedPyqs: [
      {
        id: 'npyq-p1-1',
        examYear: 'JEE Main 2024 · Apr',
        question: 'An uncharged hollow metallic sphere is placed in a uniform external electric field E0. The net electric field inside the empty cavity is:',
        options: ['Zero everywhere inside the cavity', 'Equal to E0 along the field', 'Equal to E0/2', 'Non-uniform and proportional to r'],
        correctIndex: 0,
        explanation: 'Induced surface charges on the conductor cancel E0 completely inside the cavity (electrostatic shielding, NCERT Ch. 2 p. 68).',
      },
    ],
  },
];

// ============================================================================
// COMMUNITY HUB DATA: ROOMS, POSTS, STUDY PEERS, JoSAA & MCC COUNSELLING
// ============================================================================
export interface CommunityRoom {
  id: string;
  slug: string;
  label: string;
  examFocus: 'All' | 'JEE' | 'NEET';
  activeOnline: number;
}

export const COMMUNITY_ROOMS: CommunityRoom[] = [
  { id: 'jee-2027', slug: '#jee-2027', label: 'JEE 2027 Main & Adv', examFocus: 'JEE', activeOnline: 184 },
  { id: 'neet-2027', slug: '#neet-2027', label: 'NEET UG 2027 Aspirants', examFocus: 'NEET', activeOnline: 216 },
  { id: 'droppers-grind', slug: '#droppers-grind', label: 'Droppers 10h Grind', examFocus: 'All', activeOnline: 142 },
  { id: 'physics-doubts', slug: '#physics-doubts', label: 'Physics Numericals', examFocus: 'All', activeOnline: 96 },
  { id: 'chemistry-ncert', slug: '#chemistry-ncert', label: 'Chemistry NCERT & OC', examFocus: 'All', activeOnline: 89 },
  { id: 'biology-rapid', slug: '#biology-rapid', label: 'Biology Rapid NCERT', examFocus: 'NEET', activeOnline: 128 },
];

export interface CommunityPost {
  id: string;
  roomId: string;
  authorName: string;
  authorInitials: string;
  examTag: 'JEE 27' | 'NEET 27' | 'Dropper';
  timestamp: string;
  content: string;
  attachmentCaption?: string;
  upvotes: number;
  repliesCount: number;
  solvedByMentor?: {
    mentorName: string;
    college: string;
    solutionSnippet: string;
  };
}

export const INITIAL_COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 'cp-1',
    roomId: 'physics-doubts',
    authorName: 'Rohan Deshmukh',
    authorInitials: 'RD',
    examTag: 'JEE 27',
    timestamp: '12m ago',
    content:
      'In a solid non-conducting sphere of radius $R$, why does $E \\propto r$ inside while a hollow conducting shell gives $E = 0$? Kept losing $-1$ on graph MCQs!',
    upvotes: 34,
    repliesCount: 6,
    solvedByMentor: {
      mentorName: 'Aarav Sharma',
      college: 'IIT Bombay CSE',
      solutionSnippet:
        'Inside a solid insulator, enclosed charge grows as $q_{\\text{enc}} = Q(r^3/R^3)$, so $E = \\frac{kQr}{R^3} \\propto r$. Inside a shell, $q_{\\text{enc}} = 0$ so $E = 0$.',
    },
  },
  {
    id: 'cp-2',
    roomId: 'biology-rapid',
    authorName: 'Ananya Verma',
    authorInitials: 'AV',
    examTag: 'NEET 27',
    timestamp: '28m ago',
    content:
      'Quick NCERT trap check: In the cardiac cycle, which wave of ECG marks the end of ventricular systole? Is it the T-wave end or QRS end?',
    upvotes: 41,
    repliesCount: 9,
    solvedByMentor: {
      mentorName: 'Dr. Meera Nair',
      college: 'AIIMS Delhi',
      solutionSnippet:
        'NCERT Class 11 Ch. 18 verbatim: "The end of the T-wave marks the end of systole" (T-wave = ventricular repolarisation).',
    },
  },
  {
    id: 'cp-3',
    roomId: 'jee-2027',
    authorName: 'Kabir Malhotra',
    authorInitials: 'KM',
    examTag: 'JEE 27',
    timestamp: '45m ago',
    content:
      'Just finished 45Q Custom CBT Mock with $186/300$ (98.9%ile predictor). Dropping rotational backlog using 5-stage mastery — anyone up for an evening 50m Focus Block?',
    upvotes: 22,
    repliesCount: 5,
  },
  {
    id: 'cp-4',
    roomId: 'chemistry-ncert',
    authorName: 'Priya Singh',
    authorInitials: 'PS',
    examTag: 'Dropper',
    timestamp: '1h ago',
    content:
      'Can someone confirm the stability order of carbocations in $S_N1$ solvolysis: $\\text{Ph}_3\\text{C}^+ > \\text{CH}_2=\\text{CH}-\\text{CH}_2^+ > 3^\\circ$ or does $3^\\circ$ beat allyl?',
    upvotes: 19,
    repliesCount: 4,
    solvedByMentor: {
      mentorName: 'Vikramaditya Joshi',
      college: 'IIT Delhi EE',
      solutionSnippet:
        'In standard JEE NCERT order: $\\text{Ph}_3\\text{C}^+ > \\text{Ph}_2\\text{CH}^+ > 3^\\circ\\text{ (t-butyl)} > \\text{PhCH}_2^+ \\approx \\text{Allyl}^+ > 2^\\circ > 1^\\circ$ (9 hyperconjugating $\\alpha$-H beat simple allyl resonance).',
    },
  },
  {
    id: 'cp-5',
    roomId: 'neet-2027',
    authorName: 'Sneha Kulkarni',
    authorInitials: 'SK',
    examTag: 'NEET 27',
    timestamp: '2h ago',
    content:
      'Using the NCERT-to-PYQ split view for Molecular Basis of Inheritance — literally 9 out of 11 past NEET questions came from 4 highlighted paragraphs!',
    upvotes: 53,
    repliesCount: 11,
  },
  {
    id: 'cp-6',
    roomId: 'droppers-grind',
    authorName: 'Harshvardhan Yadav',
    authorInitials: 'HY',
    examTag: 'Dropper',
    timestamp: '3h ago',
    content:
      'Day 42 of Daily Trifecta streak. Logged 8.5h Focus Block + 30 Electrostatics PYQs. Tip for fellow droppers: never skip Mistake Notebook re-attempts on Sundays.',
    upvotes: 64,
    repliesCount: 14,
  },
];

export interface StudyPeerProfile {
  id: string;
  name: string;
  initials: string;
  exam: 'JEE Main/Adv' | 'NEET UG' | 'Class 12 Boards';
  stateCity: string;
  stage: 'Class 11' | 'Class 12' | 'Dropper';
  dailyFocusGoalHours: 6 | 8 | 10;
  currentChapter: string;
  streakDays: number;
  statusNote: string;
}

export const STUDY_PEERS_DIRECTORY: StudyPeerProfile[] = [
  {
    id: 'peer-1',
    name: 'Aditya Raj',
    initials: 'AR',
    exam: 'JEE Main/Adv',
    stateCity: 'Patna, Bihar',
    stage: 'Dropper',
    dailyFocusGoalHours: 10,
    currentChapter: 'Rotational Motion & Definite Integration',
    streakDays: 31,
    statusNote: '50/10 Pomodoro grind 6 AM – 11 PM · Targeting IIT Roorkee',
  },
  {
    id: 'peer-2',
    name: 'Ishita Sharma',
    initials: 'IS',
    exam: 'NEET UG',
    stateCity: 'Jaipur, Rajasthan',
    stage: 'Class 12',
    dailyFocusGoalHours: 8,
    currentChapter: 'Human Physiology & Genetics NCERT',
    streakDays: 24,
    statusNote: 'Daily 90 NCERT Bio MCQs + 1 Chemistry DPP · AIIMS target',
  },
  {
    id: 'peer-3',
    name: 'Pranav Kulkarni',
    initials: 'PK',
    exam: 'JEE Main/Adv',
    stateCity: 'Pune, Maharashtra',
    stage: 'Class 12',
    dailyFocusGoalHours: 8,
    currentChapter: 'Electrostatics & Chemical Bonding',
    streakDays: 19,
    statusNote: 'Evening CBT Mock + Mistake Review partner needed',
  },
  {
    id: 'peer-4',
    name: 'Tanya Srivastava',
    initials: 'TS',
    exam: 'NEET UG',
    stateCity: 'Lucknow, Uttar Pradesh',
    stage: 'Dropper',
    dailyFocusGoalHours: 10,
    currentChapter: 'Organic Named Reactions & Ray Optics',
    streakDays: 44,
    statusNote: 'Silent study room 8h+ daily · KGMU / AIIMS target',
  },
  {
    id: 'peer-5',
    name: 'Devansh Patel',
    initials: 'DP',
    exam: 'JEE Main/Adv',
    stateCity: 'Ahmedabad, Gujarat',
    stage: 'Class 11',
    dailyFocusGoalHours: 6,
    currentChapter: 'Work Power Energy & GOC',
    streakDays: 15,
    statusNote: 'Building strong Class 11 base with 2027 Predictor',
  },
  {
    id: 'peer-6',
    name: 'Riya Chatterjee',
    initials: 'RC',
    exam: 'NEET UG',
    stateCity: 'Kolkata, West Bengal',
    stage: 'Class 12',
    dailyFocusGoalHours: 6,
    currentChapter: 'Biotechnology & Chemical Kinetics',
    streakDays: 22,
    statusNote: 'NCERT-to-PYQ evening revision sprints (7 PM – 10 PM)',
  },
];

export type CounsellingCategory = 'General' | 'OBC-NCL' | 'EWS' | 'SC' | 'ST';

export interface CollegeCutoffEntry {
  id: string;
  authority: 'JoSAA' | 'MCC';
  institute: string;
  program: string;
  state: string;
  quota: 'All India' | 'Home State';
  closingRanks: Record<CounsellingCategory, number>;
  avgPackageOrSeats: string;
}

export const COUNSELLING_CUTOFFS: CollegeCutoffEntry[] = [
  // JoSAA — IIT / NIT / IIIT
  {
    id: 'josaa-1',
    authority: 'JoSAA',
    institute: 'IIT Bombay',
    program: 'B.Tech Computer Science & Engg',
    state: 'Maharashtra',
    quota: 'All India',
    closingRanks: { General: 68, 'OBC-NCL': 210, EWS: 130, SC: 420, ST: 890 },
    avgPackageOrSeats: '171 Seats · Tier 1 IIT',
  },
  {
    id: 'josaa-2',
    authority: 'JoSAA',
    institute: 'IIT Delhi',
    program: 'B.Tech Electrical Engineering',
    state: 'Delhi',
    quota: 'All India',
    closingRanks: { General: 625, 'OBC-NCL': 1450, EWS: 980, SC: 2650, ST: 4800 },
    avgPackageOrSeats: '125 Seats · Tier 1 IIT',
  },
  {
    id: 'josaa-3',
    authority: 'JoSAA',
    institute: 'IIT Madras',
    program: 'B.Tech Mechanical Engineering',
    state: 'Tamil Nadu',
    quota: 'All India',
    closingRanks: { General: 2580, 'OBC-NCL': 5100, EWS: 3900, SC: 7400, ST: 11200 },
    avgPackageOrSeats: '198 Seats · Tier 1 IIT',
  },
  {
    id: 'josaa-4',
    authority: 'JoSAA',
    institute: 'NIT Trichy',
    program: 'B.Tech Computer Science & Engg',
    state: 'Tamil Nadu',
    quota: 'All India',
    closingRanks: { General: 1220, 'OBC-NCL': 2950, EWS: 1920, SC: 5800, ST: 9400 },
    avgPackageOrSeats: '115 Seats · Top NIT',
  },
  {
    id: 'josaa-5',
    authority: 'JoSAA',
    institute: 'NIT Surathkal (NITK)',
    program: 'B.Tech Electronics & Comm (ECE)',
    state: 'Karnataka',
    quota: 'All India',
    closingRanks: { General: 4950, 'OBC-NCL': 9800, EWS: 7200, SC: 16500, ST: 24000 },
    avgPackageOrSeats: '124 Seats · Top NIT',
  },
  {
    id: 'josaa-6',
    authority: 'JoSAA',
    institute: 'MNNIT Allahabad',
    program: 'B.Tech Computer Science & Engg',
    state: 'Uttar Pradesh',
    quota: 'Home State',
    closingRanks: { General: 5600, 'OBC-NCL': 11200, EWS: 8400, SC: 19000, ST: 29500 },
    avgPackageOrSeats: '210 Seats · HS Advantage',
  },
  {
    id: 'josaa-7',
    authority: 'JoSAA',
    institute: 'NIT Patna',
    program: 'B.Tech Computer Science & Engg',
    state: 'Bihar',
    quota: 'Home State',
    closingRanks: { General: 15800, 'OBC-NCL': 24500, EWS: 20200, SC: 42000, ST: 58000 },
    avgPackageOrSeats: '165 Seats · HS Advantage',
  },
  {
    id: 'josaa-8',
    authority: 'JoSAA',
    institute: 'IIIT Gwalior (ABV-IIITM)',
    program: 'B.Tech Information Technology',
    state: 'Madhya Pradesh',
    quota: 'All India',
    closingRanks: { General: 11400, 'OBC-NCL': 19800, EWS: 16200, SC: 34000, ST: 49000 },
    avgPackageOrSeats: '120 Seats · Top IIIT',
  },
  {
    id: 'josaa-9',
    authority: 'JoSAA',
    institute: 'MNIT Jaipur',
    program: 'B.Tech Electrical Engineering',
    state: 'Rajasthan',
    quota: 'Home State',
    closingRanks: { General: 16900, 'OBC-NCL': 26800, EWS: 22100, SC: 44500, ST: 61000 },
    avgPackageOrSeats: '118 Seats · HS Advantage',
  },

  // MCC — AIIMS & Govt MBBS
  {
    id: 'mcc-1',
    authority: 'MCC',
    institute: 'AIIMS New Delhi',
    program: 'MBBS (All India Quota)',
    state: 'Delhi',
    quota: 'All India',
    closingRanks: { General: 57, 'OBC-NCL': 255, EWS: 214, SC: 989, ST: 1624 },
    avgPackageOrSeats: '132 Seats · #1 Medical',
  },
  {
    id: 'mcc-2',
    authority: 'MCC',
    institute: 'Maulana Azad Medical College (MAMC)',
    program: 'MBBS (15% AIQ / DU)',
    state: 'Delhi',
    quota: 'All India',
    closingRanks: { General: 145, 'OBC-NCL': 680, EWS: 520, SC: 2450, ST: 4900 },
    avgPackageOrSeats: '250 Seats · Top Govt MBBS',
  },
  {
    id: 'mcc-3',
    authority: 'MCC',
    institute: 'JIPMER Puducherry',
    program: 'MBBS (Open Quota)',
    state: 'Puducherry',
    quota: 'All India',
    closingRanks: { General: 350, 'OBC-NCL': 1210, EWS: 1080, SC: 4800, ST: 8900 },
    avgPackageOrSeats: '187 Seats · INI Medical',
  },
  {
    id: 'mcc-4',
    authority: 'MCC',
    institute: 'AIIMS Jodhpur',
    program: 'MBBS (All India Quota)',
    state: 'Rajasthan',
    quota: 'All India',
    closingRanks: { General: 497, 'OBC-NCL': 1340, EWS: 1190, SC: 5900, ST: 11800 },
    avgPackageOrSeats: '125 Seats · Premier AIIMS',
  },
  {
    id: 'mcc-5',
    authority: 'MCC',
    institute: 'IMS-BHU Varanasi',
    program: 'MBBS (Central Univ)',
    state: 'Uttar Pradesh',
    quota: 'All India',
    closingRanks: { General: 1090, 'OBC-NCL': 2450, EWS: 2100, SC: 14200, ST: 24800 },
    avgPackageOrSeats: '100 Seats · Central MBBS',
  },
  {
    id: 'mcc-6',
    authority: 'MCC',
    institute: 'KGMU Lucknow',
    program: 'MBBS (State / AIQ)',
    state: 'Uttar Pradesh',
    quota: 'Home State',
    closingRanks: { General: 3200, 'OBC-NCL': 5100, EWS: 4600, SC: 29500, ST: 48000 },
    avgPackageOrSeats: '250 Seats · Top State Govt',
  },
  {
    id: 'mcc-7',
    authority: 'MCC',
    institute: 'Grant Govt Medical College (JJ)',
    program: 'MBBS (State / AIQ)',
    state: 'Maharashtra',
    quota: 'Home State',
    closingRanks: { General: 5900, 'OBC-NCL': 9400, EWS: 8100, SC: 39000, ST: 68000 },
    avgPackageOrSeats: '250 Seats · Top Mumbai Govt',
  },
  {
    id: 'mcc-8',
    authority: 'MCC',
    institute: 'PMCH Patna',
    program: 'MBBS (State / AIQ)',
    state: 'Bihar',
    quota: 'Home State',
    closingRanks: { General: 8400, 'OBC-NCL': 12200, EWS: 11100, SC: 52000, ST: 79000 },
    avgPackageOrSeats: '200 Seats · Bihar Flagship',
  },
];

export const FOCUS_LEADERBOARD_TOP5 = [
  { rank: 1, name: 'Harshvardhan Y.', exam: 'JEE Dropper', hoursToday: 9.4, delta: '+2' as const, elo: 1842, xp: 4820 },
  { rank: 2, name: 'Tanya S.', exam: 'NEET 2027', hoursToday: 8.8, delta: '+1' as const, elo: 1795, xp: 4610 },
  { rank: 3, name: 'Aditya R.', exam: 'JEE 2027', hoursToday: 8.2, delta: '-1' as const, elo: 1760, xp: 4390 },
  { rank: 4, name: 'Ishita S.', exam: 'NEET 2027', hoursToday: 7.6, delta: '+3' as const, elo: 1712, xp: 4125 },
  { rank: 5, name: 'Pranav K.', exam: 'JEE 2027', hoursToday: 7.1, delta: '0' as const, elo: 1684, xp: 3940 },
];
