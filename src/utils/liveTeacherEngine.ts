export type LiveTeacherSvgType =
  | 'vectors'
  | 'circuit'
  | 'optics'
  | 'reaction'
  | 'calculus'
  | 'mechanics'
  | 'biology'
  | 'generic';

export type LiveTeacherLanguage = 'hinglish' | 'english';

export interface LiveTeacherStep {
  stepNumber: number;
  title: string;
  narrationScript: string;
  englishNarrationScript: string;
  boardLatex: string;
  boardNotes: string;
  svgType: LiveTeacherSvgType;
  proTip: string;
}

export interface LiveTeacherLessonRequest {
  questionText: string;
  subjectName?: string;
  chapterName?: string;
  solutionText?: string;
  officialAnswer?: string;
  studentAnswer?: string;
  preferredLanguage?: LiveTeacherLanguage;
  requestNonce?: number;
  source?: 'preps-ai' | 'mistake-notebook' | 'chapter-dpp' | 'cbt-analysis';
}

export interface LiveTeacherLesson {
  id: string;
  topicTitle: string;
  subjectName: string;
  chapterName: string;
  svgType: LiveTeacherSvgType;
  questionPrompt: string;
  officialAnswer?: string;
  studentAnswer?: string;
  steps: LiveTeacherStep[];
  quickDoubtSuggestions: string[];
}

export function detectTeacherSvgType(
  questionText: string,
  subjectName = '',
  chapterName = ''
): LiveTeacherSvgType {
  const hay = `${questionText} ${subjectName} ${chapterName}`.toLowerCase();

  if (
    /circuit|resistor|capacitor|ohm|kirchhoff|current|voltage|emf|battery|inductor|wheatstone|galvanometer|ampere|volt/.test(
      hay
    )
  ) {
    return 'circuit';
  }
  if (
    /lens|mirror|refract|reflect|snell|prism|focal|ray|optics|diffract|interference|wavelength/.test(
      hay
    )
  ) {
    return 'optics';
  }
  if (
    /incline|wedge|friction|pulley|tension|sin\s*theta|sinθ|cosθ|block|normal force|free.?body|vector|projectile|newton|force/.test(
      hay
    )
  ) {
    return 'vectors';
  }
  if (
    /biology|cell|dna|rna|enzyme|genetics|hardy|gymnosperm|photosynthesis|respiration|neuron|heart|nephron|botany|zoology|ncert bio/.test(
      hay
    )
  ) {
    return 'biology';
  }
  if (
    /organic|aldol|cannizzaro|reagent|aldehyde|ketone|alkene|benzene|sn1|sn2|grignard|nabh4|lialh4|ester|amine|reaction|kinetics|equilibrium|hybridization|chemistry/.test(
      hay
    )
  ) {
    return 'reaction';
  }
  if (
    /integral|differenti|limit|matrix|determinant|parabola|ellipse|hyperbola|derivative|calculus|sin\^|cos\^|maths|mathematics|quadratic|sequence/.test(
      hay
    )
  ) {
    return 'calculus';
  }
  if (
    /rotation|torque|angular|moment of inertia|gravitation|escape velocity|orbit|gauss|electric field|dipole|magnetic|shm|pendulum|thermo|physics/.test(
      hay
    )
  ) {
    return 'mechanics';
  }
  return 'generic';
}

function cleanSnippet(text: string, maxLen = 150): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return 'High-Yield JEE / NEET Concept';
  return compact.length > maxLen ? `${compact.slice(0, maxLen - 1).trim()}…` : compact;
}

function extractFirstLatexFormula(text?: string): string | null {
  if (!text) return null;
  const blockMatch = text.match(/\$\$([^$]+)\$\$/);
  if (blockMatch?.[1]) return blockMatch[1].trim();
  const inlineMatch = text.match(/\$([^$]+)\$/);
  if (inlineMatch?.[1]) return inlineMatch[1].trim();
  return null;
}

export function generateLiveTeacherLesson(req: LiveTeacherLessonRequest): LiveTeacherLesson {
  const questionPrompt = cleanSnippet(req.questionText || 'Core Concept Walkthrough', 240);
  const svgType = detectTeacherSvgType(req.questionText, req.subjectName, req.chapterName);

  const inferredSubject =
    req.subjectName?.trim() ||
    (svgType === 'reaction'
      ? 'Chemistry'
      : svgType === 'calculus'
        ? 'Mathematics'
        : svgType === 'biology'
          ? 'Biology'
          : 'Physics');

  const inferredChapter =
    req.chapterName?.trim() ||
    (svgType === 'vectors'
      ? 'Laws of Motion & Friction'
      : svgType === 'circuit'
        ? 'Current Electricity & Circuits'
        : svgType === 'optics'
          ? 'Ray Optics & Optical Instruments'
          : svgType === 'reaction'
            ? 'Organic Reaction Mechanisms'
            : svgType === 'calculus'
              ? 'Definite Calculus & Functions'
              : svgType === 'mechanics'
                ? 'Rotational & Field Mechanics'
                : svgType === 'biology'
                  ? 'NCERT Genetics & Physiology'
                  : 'Core Exam Problem Solving');

  const rawSolution = req.solutionText?.trim() ?? '';
  const safeSolutionText = /namaste!\s*main\s*hoon\s*preps|main\s*hoon\s*prepsbot|hi!\s*i'?m\s*preps/i.test(
    rawSolution
  )
    ? ''
    : rawSolution;
  const extractedFormula = extractFirstLatexFormula(safeSolutionText || req.questionText);
  const officialAnswer = req.officialAnswer?.trim();
  const mistakeNote =
    req.studentAnswer && officialAnswer && req.studentAnswer !== officialAnswer
      ? `Tumne ${req.studentAnswer} mark kiya tha, jabki sahi answer ${officialAnswer} hai.`
      : '';
  const mistakeNoteEn =
    req.studentAnswer && officialAnswer && req.studentAnswer !== officialAnswer
      ? `You selected ${req.studentAnswer}, whereas the verified answer is ${officialAnswer}.`
      : '';

  const templates: Record<
    LiveTeacherSvgType,
    {
      s1Latex: string;
      s1Notes: string;
      s1Hi: string;
      s1En: string;
      s1Tip: string;
      s2Latex: string;
      s2Notes: string;
      s2Hi: string;
      s2En: string;
      s2Tip: string;
      s3Latex: string;
      s3Notes: string;
      s3Hi: string;
      s3En: string;
      s3Tip: string;
      s4Latex: string;
      s4Notes: string;
      s4Hi: string;
      s4En: string;
      s4Tip: string;
      doubts: string[];
    }
  > = {
    vectors: {
      s1Latex: '\\vec{F}_{\\text{net}} = m\\vec{a}, \\quad \\theta = \\text{incline angle}',
      s1Notes: 'Identify mass m, incline angle θ, and coefficient of friction μ before writing equations.',
      s1Hi: `Namaste beta! Chalo ${inferredChapter} ka yeh problem board par ekdam crystal clear solve karte hain. Sabse pehle given values mark karo aur coordinate axes incline ke along aur perpendicular set karo. ${mistakeNote}`,
      s1En: `Welcome to the board! Let us break down this ${inferredChapter} problem step by step. First, list every given parameter and align your axes parallel and perpendicular to the incline. ${mistakeNoteEn}`,
      s1Tip: 'Always choose X-axis along the direction of acceleration so ay = 0 immediately.',
      s2Latex: 'N = mg\\cos\\theta, \\quad F_{\\parallel} = mg\\sin\\theta - f_k',
      s2Notes: 'Resolve weight mg into two orthogonal components: mg sinθ pulls down the slope, mg cosθ balances Normal N.',
      s2Hi: 'Step 2 mein Free-Body Diagram dekho board par! Gravity mg hamesha vertically downwards lagti hai. Iska ek component slope ke along mg sin theta aata hai jo block ko neeche khinchta hai, aur doosra mg cos theta normal reaction N ko balance karta hai.',
      s2En: 'Look at the Free-Body Diagram on the board in Step 2. Weight mg acts vertically downward, resolving into mg sin theta along the slope and mg cos theta perpendicular to balance the normal reaction N.',
      s2Tip: 'Angle between vertical mg and the normal axis always equals the incline angle θ.',
      s3Latex: extractedFormula || 'a = \\frac{mg\\sin\\theta - \\mu mg\\cos\\theta}{m} = g(\\sin\\theta - \\mu\\cos\\theta)',
      s3Notes: safeSolutionText
        ? cleanSnippet(safeSolutionText, 180)
        : 'Substitute friction f = μN = μmg cosθ into Newton’s Second Law and cancel mass m.',
      s3Hi: 'Ab Step 3 mein equation substitute karo! Friction f barabar mu times N hota hai, yani mu m g cos theta. Net force ko m into a ke barabar rakhte hi mass m cancel ho jata hai aur acceleration milta hai g times sin theta minus mu cos theta.',
      s3En: 'In Step 3, substitute kinetic friction f equals mu times N into Newton’s second law. Notice how mass m cancels cleanly from every term, leaving a equals g times sin theta minus mu cos theta.',
      s3Tip: 'Check limiting case θ = 0° or μ = 0 right away: a must collapse to 0 or g sinθ.',
      s4Latex: officialAnswer
        ? `\\text{Verified Answer: } \\mathbf{${officialAnswer.replace(/[{}]/g, '')}}`
        : 'a_{\\text{final}} = g(\\sin\\theta - \\mu\\cos\\theta)',
      s4Notes: officialAnswer
        ? `Final verified result: ${officialAnswer}. Double-check units and direction sign before locking your CBT bubble.`
        : 'Double-check whether the block is moving up or down the incline to get friction direction right.',
      s4Hi: `Bahut badhiya! Final answer verify ho gaya${officialAnswer ? ` — sahi option hai ${officialAnswer}` : ''}. Exam shortcut yaad rakhna: agar rolling sphere ho toh sin theta ke neeche 1 plus k square by R square laga dena, 10 second mein answer aayega!`,
      s4En: `Excellent work! Our final verified answer is ready${officialAnswer ? ` — ${officialAnswer}` : ''}. Remember the exam-day shortcut: always verify boundary angles and friction direction before marking your answer.`,
      s4Tip: '10-Second Check: Mass cancels out in sliding/rolling incline problems unless external force F is added.',
      doubts: [
        'Step 2 mein sin θ kyun liya?',
        'Friction ki direction kaise decide karein?',
        'Exam mein 10-second shortcut kya hai?',
      ],
    },
    circuit: {
      s1Latex: 'V = IR, \\quad \\sum I_{\\text{in}} = \\sum I_{\\text{out}}, \\quad \\sum \\Delta V_{\\text{loop}} = 0',
      s1Notes: 'Identify EMF sources, series/parallel branches, and steady-state capacitor conditions.',
      s1Hi: `Chalo beta, ${inferredChapter} ka circuit board par trace karte hain! Pehle har node par potential assume karo aur dekho kaunse resistors series mein hain aur kaunse parallel mein. ${mistakeNote}`,
      s1En: `Let us trace this ${inferredChapter} circuit cleanly on the board. Start by marking node potentials and identifying series versus parallel branches. ${mistakeNoteEn}`,
      s1Tip: 'At steady state (t → ∞), a fully charged capacitor acts like an OPEN circuit (I = 0).',
      s2Latex: 'R_{\\text{eq}} = R_1 + \\frac{R_2 R_3}{R_2 + R_3}, \\quad I_{\\text{main}} = \\frac{E}{R_{\\text{eq}} + r}',
      s2Notes: 'Follow the animated cyan current path from the positive terminal and apply KVL clockwise.',
      s2Hi: 'Step 2 mein circuit diagram dekho! Positive terminal se current I nikalta hai aur node par split hota hai. Parallel branch ka equivalent resistance nikaal kar hum poora circuit ek single loop mein simplify kar sakte hain.',
      s2En: 'Watch the animated current path in Step 2. Current leaves the positive terminal and divides across parallel branches, letting us reduce the network into an equivalent single loop.',
      s2Tip: 'Use Nodal Analysis whenever 2 or more batteries appear — it beats KVL loop equations on speed.',
      s3Latex: extractedFormula || 'I = \\frac{E}{R_{\\text{eq}}}, \\quad V_{\\text{branch}} = E - Ir',
      s3Notes: safeSolutionText
        ? cleanSnippet(safeSolutionText, 180)
        : 'Apply Kirchhoff’s Voltage Law around the active loop and solve for branch current and terminal PD.',
      s3Hi: 'Ab Step 3 mein KVL lagao! Battery se minus to plus jaane par plus E, aur current ki direction mein resistor cross karne par minus I R. Values plug karte hi exact branch current aur voltage drop nikal aata hai.',
      s3En: 'Now apply Kirchhoff’s Voltage Law in Step 3. Moving from negative to positive across a cell adds E, while moving with current across a resistor subtracts I times R.',
      s3Tip: 'Check power conservation: Total power delivered by battery (E·I) must equal ΣI²R.',
      s4Latex: officialAnswer
        ? `\\text{Verified Answer: } \\mathbf{${officialAnswer.replace(/[{}]/g, '')}}`
        : 'P_{\\text{max}} = \\frac{E^2}{4r} \\quad (\\text{at } R = r)',
      s4Notes: officialAnswer
        ? `Verified Result: ${officialAnswer}. Watch for mA vs A and kΩ vs Ω unit traps.`
        : 'Always verify mA/μF prefixes before submitting numerical answers.',
      s4Hi: `Shabaash! Final answer lock ho gaya${officialAnswer ? ` — ${officialAnswer}` : ''}. Exam mein current divider rule lagana: parallel branch mein current inverse ratio of resistance mein split hota hai!`,
      s4En: `Well done! The final answer is locked in${officialAnswer ? ` — ${officialAnswer}` : ''}. For maximum exam speed, use the current divider rule: branch current splits inversely with resistance.`,
      s4Tip: 'Current Divider Shortcut: I₁ = I_total × R₂ / (R₁ + R₂) — opposite resistor goes in numerator!',
      doubts: [
        'KVL mein sign convention kaise yaad rakhein?',
        'Steady state mein capacitor open kyun hota hai?',
        'Parallel shortcut formula phir se samjhao',
      ],
    },
    optics: {
      s1Latex: '\\frac{1}{v} - \\frac{1}{u} = \\frac{1}{f} \\; (\\text{Lens}), \\quad \\frac{1}{v} + \\frac{1}{u} = \\frac{1}{f} \\; (\\text{Mirror})',
      s1Notes: 'Apply Cartesian sign convention strictly: direction of incident light is positive (+X).',
      s1Hi: `Namaste beta! ${inferredChapter} mein 90% silly mistakes sirf sign convention se hoti hain. Step 1 mein yaad rakho: incident ray ki direction hamesha positive hoti hai, isliye real object ke liye u negative lenge. ${mistakeNote}`,
      s1En: `Welcome! In ${inferredChapter}, almost every careless error comes from sign conventions. Step 1 sets the golden rule: take the direction of incident light as positive, making object distance u negative for real objects. ${mistakeNoteEn}`,
      s1Tip: 'Convex lens has f > 0; Concave lens has f < 0. Never substitute signs twice!',
      s2Latex: 'm = \\frac{h_i}{h_o} = \\frac{v}{u} = \\frac{f}{f + u}',
      s2Notes: 'Trace two principal rays on the blackboard: (1) parallel ray through F₂, (2) undeviated ray through optical center O.',
      s2Hi: 'Step 2 ka ray diagram dekho board par! Pehli ray principal axis ke parallel aakar focus F2 se guzarti hai, aur doosri ray optical center se seedhi nikal jaati hai. Jahan dono rays milti hain, wahin real inverted image banti hai.',
      s2En: 'Look at the animated ray diagram in Step 2. The ray parallel to the principal axis refracts through focus F2, while the central ray passes straight through optical center O to locate the image.',
      s2Tip: 'If object is at 2F, image forms at 2F with exact same size (m = −1) — super common JEE benchmark!',
      s3Latex: extractedFormula || 'v = \\frac{uf}{u + f}, \\quad P = \\frac{100}{f\\,(\\text{cm})}\\,\\text{D}',
      s3Notes: safeSolutionText
        ? cleanSnippet(safeSolutionText, 180)
        : 'Substitute signed u and f directly into the rearranged image formula to avoid reciprocal arithmetic errors.',
      s3Hi: 'Step 3 mein direct formula v barabar u f upon u plus f use karo — isse LCM lene ki galti kabhi nahi hoti! Values with proper sign put karte hi exact image position aur magnification mil jata hai.',
      s3En: 'In Step 3, plug signed u and f directly into the rearranged formula v equals u f divided by u plus f to prevent reciprocal sign mistakes.',
      s3Tip: 'For lens in a medium of refractive index μ_m, focal length scales via (μ_g / μ_m − 1).',
      s4Latex: officialAnswer
        ? `\\text{Verified Answer: } \\mathbf{${officialAnswer.replace(/[{}]/g, '')}}`
        : 'm < 0 \\Rightarrow \\text{Real \\& Inverted}, \\quad m > 0 \\Rightarrow \\text{Virtual \\& Erect}',
      s4Notes: officialAnswer
        ? `Verified Result: ${officialAnswer}. Confirm real vs virtual nature from sign of v and m.`
        : 'Verify real/virtual and erect/inverted nature from signs of v and magnification m.',
      s4Hi: `Perfect! Final answer confirm ho gaya${officialAnswer ? ` — ${officialAnswer}` : ''}. Yaad rakhna: negative magnification matlab inverted image, aur agar lens ka aadha hissa black paper se cover kar dein toh image poori banti hai, bas intensity kam hoti hai!`,
      s4En: `Spot on! Final answer verified${officialAnswer ? ` — ${officialAnswer}` : ''}. Always double-check sign of magnification m to distinguish inverted real images from erect virtual ones.`,
      s4Tip: 'Newton’s Formula Shortcut: x₁ · x₂ = f² when distances are measured from the two foci.',
      doubts: [
        'u ko negative kyun liya Step 1 mein?',
        'Mirror aur lens formula mein difference kya hai?',
        'Lens ko paani mein daalein toh f kyun badhta hai?',
      ],
    },
    reaction: {
      s1Latex: '\\text{Substrate} + \\text{Reagent} \\xrightarrow{\\text{Condition}} \\text{Major Product}',
      s1Notes: 'Identify the functional group, electrophilic/nucleophilic site, and reagent selectivity first.',
      s1Hi: `Namaste beta! ${inferredChapter} mein reagent dekhte hi mechanism trigger hona chahiye. Step 1 mein substrate ka reactive center aur reagent ka role identify karo — yeh nucleophile hai, mild reducing agent hai, ya strong base? ${mistakeNote}`,
      s1En: `Welcome! In ${inferredChapter}, recognizing the reagent immediately unlocks the mechanism. In Step 1, locate the reactive functional group and classify the reagent’s exact selectivity. ${mistakeNoteEn}`,
      s1Tip: 'Check stereochemistry & α-hydrogen availability before jumping to the product!',
      s2Latex: '\\text{R-CH=CH-CHO} \\xrightarrow{\\text{NaBH}_4/\\text{EtOH}} \\text{R-CH=CH-CH}_2\\text{OH}',
      s2Notes: 'Track curved electron arrows from electron-rich nucleophile (Nu⁻) toward electron-deficient carbon (δ⁺).',
      s2Hi: 'Step 2 ka mechanism flow board par dekho! Electron-rich nucleophile delta-positive carbonyl carbon par attack karta hai, pi-bond oxygen par shift hota hai, aur stable intermediate banta hai. Reagent selectivity yahan sabse bada NTA trap hota hai.',
      s2En: 'Follow the animated electron-flow arrow in Step 2. The electron-rich species attacks the electrophilic center, forming the key transition intermediate before protonation or elimination.',
      s2Tip: 'NaBH₄ reduces aldehydes/ketones selectively without touching isolated C=C or esters.',
      s3Latex: extractedFormula || 'k = A e^{-E_a / RT}, \\quad \\Delta G^\\circ = -RT\\ln K',
      s3Notes: safeSolutionText
        ? cleanSnippet(safeSolutionText, 180)
        : 'Apply stability order (carbocation 3° > 2° > 1°, Saytzeff major alkene, or chemoselective hydride transfer).',
      s3Hi: 'Ab Step 3 mein major product lock karo! Hamesha thermodynamic stability ya rearrangement check karo — agar carbocation ban raha hai toh hydride ya methyl shift zaroor check karna, warna option trap mein phans jaoge.',
      s3En: 'Now lock in the major product in Step 3. Check whether carbocation rearrangement, regioselectivity, or stereochemical inversion governs the dominant pathway.',
      s3Tip: 'For Cannizzaro, aldehyde MUST have zero α-hydrogens (like HCHO, PhCHO, (CH₃)₃C-CHO).',
      s4Latex: officialAnswer
        ? `\\text{Verified Answer: } \\mathbf{${officialAnswer.replace(/[{}]/g, '')}}`
        : '\\text{Major Product Confirmed (NCERT Exception Checked)}',
      s4Notes: officialAnswer
        ? `Final verified result: ${officialAnswer}. Save this reagent transformation to your Mistake Notebook.`
        : 'Review the reagent selectivity ladder once more before moving to the next PYQ.',
      s4Hi: `Zabardast! Answer bilkul confirm ho gaya${officialAnswer ? ` — ${officialAnswer}` : ''}. Chemistry mein har galat reaction ko 1-line Reagent Flashcard bana kar revise karo, full marks pakke hain!`,
      s4En: `Fantastic! Your answer is confirmed${officialAnswer ? ` — ${officialAnswer}` : ''}. Turn every tricky reagent exception into a 1-line flashcard to guarantee quick marks on exam day.`,
      s4Tip: 'NTA loves testing mild vs strong reagents (PCC vs KMnO₄, NaBH₄ vs LiAlH₄, dil. vs conc. NaOH).',
      doubts: [
        'NaBH4 aur LiAlH4 mein kya difference hai?',
        'Carbocation rearrangement kab check karein?',
        'NCERT ka isme main exception kya hai?',
      ],
    },
    calculus: {
      s1Latex: 'I = \\int_a^b f(x)\\,dx, \\quad \\text{Check symmetry } f(a+b-x)',
      s1Notes: 'Spot the structural pattern (King’s property, 1^∞ limit, Leibniz rule, or substitution) before brute-forcing.',
      s1Hi: `Chalo beta, ${inferredChapter} ka problem smart tarike se solve karte hain! JEE Maths mein direct integration ya expansion kabhi mat shuru karo — Step 1 mein pehle symmetry ya standard indeterminate form identify karo. ${mistakeNote}`,
      s1En: `Let us solve this ${inferredChapter} question smartly! In JEE Mathematics, never brute-force first — in Step 1, always check for symmetry properties or standard indeterminate forms. ${mistakeNoteEn}`,
      s1Tip: 'If limits are [0, π/2] or [a, b] with symmetric denominator, test King’s Property P₄ immediately.',
      s2Latex: 'f(x) + f(a+b-x) = \\text{const} \\implies 2I = \\int_a^b \\text{const}\\,dx',
      s2Notes: 'Visualize the shaded area on the curve — replacing x with (a + b − x) reflects the graph horizontally without changing total area.',
      s2Hi: 'Step 2 mein board ka graph dekho! Jab hum x ko a plus b minus x se replace karte hain, curve mirror ho jata hai par limits ke beech ka total area bilkul same rehta hai. Isliye I plus I add karne par complex denominator cancel ho jata hai!',
      s2En: 'Look at the curve area diagram in Step 2. Substituting x with a plus b minus x mirrors the curve horizontally across the interval while preserving the exact shaded area under the curve.',
      s2Tip: 'Remember to divide by 2 at the end (2I → I) — forgetting the factor of 2 is the #1 JEE error!',
      s3Latex: extractedFormula || 'I = \\frac{1}{2}\\int_a^b 1\\,dx = \\frac{b - a}{2}',
      s3Notes: safeSolutionText
        ? cleanSnippet(safeSolutionText, 180)
        : 'Combine the original and transformed equations, simplify algebraically, and apply the upper/lower limits carefully.',
      s3Hi: 'Step 3 mein dono equations add karo: 2I ban jata hai simple integral of 1 dx from a to b. Upper limit minus lower limit karke 2 se divide karo — bas 3 line mein JEE Main ka 4-mark question khatam!',
      s3En: 'In Step 3, add both equations to collapse the numerator and denominator cleanly, evaluate between the upper and lower limits, and divide by 2.',
      s3Tip: 'Plug a quick test value (like n = 0 or x = 0) to sanity-check your final expression in 5 seconds.',
      s4Latex: officialAnswer
        ? `\\text{Verified Answer: } \\mathbf{${officialAnswer.replace(/[{}]/g, '')}}`
        : 'I = \\frac{b - a}{2}',
      s4Notes: officialAnswer
        ? `Final verified result: ${officialAnswer}. Check domain restrictions and sign of limits.`
        : 'Verify whether the integrand is even, odd, or periodic on symmetric limits [−a, a].',
      s4Hi: `Ekdum mast! Sahi answer aa gaya${officialAnswer ? ` — ${officialAnswer}` : ''}. Maths mein aise symmetry shortcuts tumhara 2 minute bachate hain har shift mein!`,
      s4En: `Brilliant! The verified answer is complete${officialAnswer ? ` — ${officialAnswer}` : ''}. Mastering symmetry shortcuts like this saves precious minutes in every timed JEE paper.`,
      s4Tip: 'Always check odd function on [−a, a]: if f(−x) = −f(x), the entire integral is 0 instantly!',
      doubts: [
        'King’s property kab apply hoti hai?',
        'Step 3 mein 2 se divide kyun kiya?',
        'Iska 5-second verification trick kya hai?',
      ],
    },
    mechanics: {
      s1Latex: '\\vec{\\tau} = \\vec{r} \\times \\vec{F} = I\\vec{\\alpha}, \\quad L = I\\omega',
      s1Notes: 'Identify conserved quantities (Energy, Linear Momentum, or Angular Momentum) and system symmetry.',
      s1Hi: `Namaste beta! ${inferredChapter} ka yeh classic high-weightage concept hai. Step 1 mein sabse pehle check karo ki kya external torque ya external force zero hai, taaki hum conservation law laga sakein. ${mistakeNote}`,
      s1En: `Welcome! This is a high-weightage ${inferredChapter} concept. In Step 1, check whether net external torque or force is zero so you can apply conservation laws directly. ${mistakeNoteEn}`,
      s1Tip: 'Choose your pivot/hinge point wisely so unknown reaction forces produce zero torque.',
      s2Latex: 'I = I_{\\text{cm}} + Md^2, \\quad v_{\\text{cm}} = \\omega R \\; (\\text{Pure Rolling})',
      s2Notes: 'Check the animated vector setup on the blackboard: radius vector r, velocity/field lines, and pivot axis.',
      s2Hi: 'Step 2 ka diagram dekho board par! Center of mass ke around moment of inertia I_cm lo, aur agar axis shifted hai toh Parallel Axis Theorem M d square add karo. Pure rolling ke liye contact point par velocity zero hoti hai.',
      s2En: 'Inspect the diagram in Step 2. Apply the Parallel Axis Theorem when shifting away from the center of mass, and enforce the pure-rolling no-slip condition v equals omega R.',
      s2Tip: 'Remember: E = 0 inside a conducting shell does NOT mean potential V = 0; V stays constant = kQ/R.',
      s3Latex: extractedFormula || 'a = \\frac{g\\sin\\theta}{1 + k^2/R^2} \\quad \\text{or} \\quad v_e = \\sqrt{\\frac{2GM}{R}}',
      s3Notes: safeSolutionText
        ? cleanSnippet(safeSolutionText, 180)
        : 'Combine the conservation law with the geometric constraint and simplify to isolate the required unknown.',
      s3Hi: 'Ab Step 3 mein equations combine karo! Jab I ghat-ta hai toh angular momentum conserve rakhne ke liye omega badhta hai, aur kinetic energy L square by 2I bhi badhti hai. Units aur powers dhyan se match karo.',
      s3En: 'In Step 3, combine your conservation law with the geometric constraint to isolate the unknown cleanly, checking dimensional consistency at every step.',
      s3Tip: 'Dimensional analysis eliminates 2 wrong options immediately in JEE/NEET Physics!',
      s4Latex: officialAnswer
        ? `\\text{Verified Answer: } \\mathbf{${officialAnswer.replace(/[{}]/g, '')}}`
        : '\\text{Concept & Dimensional Check Passed}',
      s4Notes: officialAnswer
        ? `Verified Result: ${officialAnswer}. Confirm units and direction vector.`
        : 'Confirm dimensions, sign, and physical intuition before moving on.',
      s4Hi: `Bahut shandaar! Final answer verified hai${officialAnswer ? ` — ${officialAnswer}` : ''}. Yaad rakhna: solid sphere ka k square by R square sabse kam 2/5 hota hai, isliye rolling race hamesha solid sphere jeet-ta hai!`,
      s4En: `Outstanding! The final answer is verified${officialAnswer ? ` — ${officialAnswer}` : ''}. Always double-check physical intuition and dimensions to lock in full marks.`,
      s4Tip: 'Always verify units on the final expression — a missing R or √2 shows up instantly.',
      doubts: [
        'Angular momentum conserve hone par KE kyun badhti hai?',
        'Parallel axis theorem mein d kahan se measure hota hai?',
        'Dimension check shortcut samjhao',
      ],
    },
    biology: {
      s1Latex: '\\text{NCERT Line Check} \\implies \\text{Key Exception \\& Exact Terminology}',
      s1Notes: 'Pinpoint the exact NCERT keyword (e.g., "not enclosed", "toward anode", "haploid", "p + q = 1").',
      s1Hi: `Namaste future doctor! NEET Biology mein har sawal seedha NCERT ki exact line se banta hai. Step 1 mein pehle woh keyword pakdo jisko NTA aksar flip karke trap banata hai. ${mistakeNote}`,
      s1En: `Welcome, future doctor! Every NEET Biology question traces back to an exact NCERT sentence. In Step 1, isolate the critical NCERT keyword that examiners love to flip. ${mistakeNoteEn}`,
      s1Tip: 'Underline words like "only", "always", "except", "before and after" while reading NEET questions.',
      s2Latex: 'p + q = 1, \\quad p^2 + 2pq + q^2 = 1',
      s2Notes: 'Visualize the biological pathway / NCERT diagram on the board to lock spatial memory.',
      s2Hi: 'Step 2 ka visual diagram dekho board par! Pathway ya structure ko visually yaad rakhne se Assertion-Reason aur Match-the-Following questions mein confusion zero ho jata hai.',
      s2En: 'Study the visual diagram in Step 2 on the board. Locking the spatial sequence or genetic ratio visually eliminates confusion in Assertion-Reason questions.',
      s2Tip: 'In Hardy-Weinberg numericals, ALWAYS take square root of q² first to find q before computing 2pq!',
      s3Latex: extractedFormula || '\\text{Eliminate 3 NCERT-Contradicting Options} \\implies \\text{100\\% Sure Match}',
      s3Notes: safeSolutionText
        ? cleanSnippet(safeSolutionText, 180)
        : 'Cross-check each statement against NCERT Class 11/12 text and eliminate subtly flipped statements.',
      s3Hi: 'Ab Step 3 mein option-by-option NCERT cross-check karo! Jo statement ek bhi exception ko ignore karti hai usse turant eliminate karo, aur exact NCERT wording wale statement ko lock karo.',
      s3En: 'In Step 3, verify each statement line-by-line against NCERT and eliminate distractors that flip a single qualifying phrase.',
      s3Tip: 'If two options look close, pick the one using exact NCERT terminology verbatim.',
      s4Latex: officialAnswer
        ? `\\text{Verified Answer: } \\mathbf{${officialAnswer.replace(/[{}]/g, '')}}`
        : '\\text{NCERT Verified +4 Marks}',
      s4Notes: officialAnswer
        ? `Verified Result: ${officialAnswer}. Highlight this exact line in your NCERT book today.`
        : 'Highlight this exact NCERT sentence so you never miss it in a future mock.',
      s4Hi: `Bahut badiya! Correct NCERT answer lock ho gaya${officialAnswer ? ` — ${officialAnswer}` : ''}. Aaj hi is line ko apni NCERT mein highlight kar lena!`,
      s4En: `Great job! The NCERT-verified answer is locked in${officialAnswer ? ` — ${officialAnswer}` : ''}. Highlight this exact line in your NCERT textbook for 1-minute revision.`,
      s4Tip: '95%+ NEET Bio questions come verbatim from NCERT text, summary boxes, and diagram captions.',
      doubts: [
        'NCERT ka exact trap word kaunsa tha?',
        'Assertion-Reason solve karne ka best trick kya hai?',
        'Isse milta-julta ek aur PYQ batao',
      ],
    },
    generic: {
      s1Latex: '\\text{Given Data} \\longrightarrow \\text{Governing Law} \\longrightarrow \\text{Target Variable}',
      s1Notes: 'Extract all known values, units, and the exact quantity asked before touching algebra.',
      s1Hi: `Namaste beta! Chalo is sawal ko bilkul step-by-step teacher style mein todte hain. Step 1 mein sabse pehle given data aur governing concept likho taaki koi hidden condition miss na ho. ${mistakeNote}`,
      s1En: `Welcome! Let us solve this problem cleanly step by step. In Step 1, extract every given value and identify the core governing law so no hidden constraint is missed. ${mistakeNoteEn}`,
      s1Tip: 'Read the very last line of the question twice so you solve for the exact asked quantity.',
      s2Latex: '\\text{Visual Model} \\implies \\text{Isolate Unknowns cleanly}',
      s2Notes: 'Sketch a quick schematic / relation map connecting known inputs to the target output.',
      s2Hi: 'Step 2 mein board par structure dekho! Given values aur required formula ke beech ka bridge banana sabse zaroori step hai — yahi se 80% problem solve ho jata hai.',
      s2En: 'Look at the visual breakdown in Step 2. Mapping how given inputs connect to the governing equation solves 80% of the problem before algebra even starts.',
      s2Tip: 'Convert every unit into SI right at Step 2 to avoid 10³ factor mistakes.',
      s3Latex: extractedFormula || '\\text{Substitute Knowns} \\implies \\text{Simplify Step-by-Step}',
      s3Notes: safeSolutionText
        ? cleanSnippet(safeSolutionText, 180)
        : 'Substitute values cleanly, keep track of signs and powers of 10, and simplify systematically.',
      s3Hi: 'Ab Step 3 mein step-by-step substitution karo! Signs aur powers of 10 ko alag se simplify karo taaki silly calculation mistake bilkul na ho.',
      s3En: 'In Step 3, substitute the knowns systematically, keeping signs and powers of ten clean to avoid careless arithmetic slips.',
      s3Tip: 'Estimate the order of magnitude mentally before checking options.',
      s4Latex: officialAnswer
        ? `\\text{Verified Answer: } \\mathbf{${officialAnswer.replace(/[{}]/g, '')}}`
        : '\\text{Final Answer Verified}',
      s4Notes: officialAnswer
        ? `Final verified result: ${officialAnswer}. Save this pattern to your Mistake Notebook if missed earlier.`
        : 'Double-check units, sign, and option mapping before locking your answer.',
      s4Hi: `Shabaash! Final answer bilkul clear hai${officialAnswer ? ` — ${officialAnswer}` : ''}. Koi bhi step dobara samajhna ho toh neeche Raise Hand dabao, main yahin board par explain kar dunga!`,
      s4En: `Well done! The final answer is verified${officialAnswer ? ` — ${officialAnswer}` : ''}. Tap Raise Hand below anytime if you want me to unpack any step further!`,
      s4Tip: 'Always do a 5-second sanity check on units and sign before submitting.',
      doubts: [
        'Step 2 ko aur simple tarike se samjhao',
        'Isme common silly mistake kya hoti hai?',
        'Exam mein fast shortcut kya lagega?',
      ],
    },
  };

  const tpl = templates[svgType];

  const steps: LiveTeacherStep[] = [
    {
      stepNumber: 1,
      title: 'Given & Core Concept',
      narrationScript: tpl.s1Hi,
      englishNarrationScript: tpl.s1En,
      boardLatex: tpl.s1Latex,
      boardNotes: tpl.s1Notes,
      svgType,
      proTip: tpl.s1Tip,
    },
    {
      stepNumber: 2,
      title: 'Diagram / Visual Setup',
      narrationScript: tpl.s2Hi,
      englishNarrationScript: tpl.s2En,
      boardLatex: tpl.s2Latex,
      boardNotes: tpl.s2Notes,
      svgType,
      proTip: tpl.s2Tip,
    },
    {
      stepNumber: 3,
      title: 'Step-by-Step Derivation',
      narrationScript: tpl.s3Hi,
      englishNarrationScript: tpl.s3En,
      boardLatex: tpl.s3Latex,
      boardNotes: tpl.s3Notes,
      svgType,
      proTip: tpl.s3Tip,
    },
    {
      stepNumber: 4,
      title: 'Final Answer & Exam Shortcut',
      narrationScript: tpl.s4Hi,
      englishNarrationScript: tpl.s4En,
      boardLatex: tpl.s4Latex,
      boardNotes: tpl.s4Notes,
      svgType,
      proTip: tpl.s4Tip,
    },
  ];

  return {
    id: `lesson-${Date.now()}-${svgType}`,
    topicTitle: `${inferredSubject} · ${inferredChapter}`,
    subjectName: inferredSubject,
    chapterName: inferredChapter,
    svgType,
    questionPrompt,
    officialAnswer,
    studentAnswer: req.studentAnswer,
    steps,
    quickDoubtSuggestions: tpl.doubts,
  };
}

export function buildTeacherDoubtFallback(
  doubt: string,
  lesson: LiveTeacherLesson,
  activeStep: LiveTeacherStep,
  lang: LiveTeacherLanguage
): { reply: string; latex?: string } {
  const q = doubt.toLowerCase();

  if (q.includes('sin') || q.includes('cos') || q.includes('theta') || q.includes('angle')) {
    return {
      reply:
        lang === 'hinglish'
          ? `Great doubt beta! Inclined plane par vertical weight $mg$ aur normal axis ke beech ka angle $\\theta$ hota hai. Isliye normal ke saath adjacent component $mg\\cos\\theta$ banta hai aur slope ke along opposite component $mg\\sin\\theta$ aata hai. Shortcut check: jab $\\theta = 0^\\circ$ (flat ground), $\\sin 0^\\circ = 0$ matlab koi sliding pull nahi!`
          : `Great question! On an inclined plane, the angle between vertical weight $mg$ and the normal axis equals $\\theta$. Thus the adjacent component perpendicular to the plane is $mg\\cos\\theta$, while the opposite component pulling down the slope is $mg\\sin\\theta$. Quick check: at $\\theta = 0^\\circ$, $\\sin 0^\\circ = 0$ (no slope pull).`,
      latex: 'F_{\\parallel} = mg\\sin\\theta, \\quad N = mg\\cos\\theta',
    };
  }

  if (q.includes('shortcut') || q.includes('trick') || q.includes('fast')) {
    return {
      reply:
        lang === 'hinglish'
          ? `Exam-hall shortcut suno: Step ${activeStep.stepNumber} (${activeStep.title}) mein ${activeStep.proTip} Isse bina lambi calculation ke tum 10–15 seconds mein galat options eliminate kar sakte ho!`
          : `Here is the exam-hall shortcut for Step ${activeStep.stepNumber} (${activeStep.title}): ${activeStep.proTip} This lets you eliminate distractors in 10–15 seconds without long algebra.`,
      latex: activeStep.boardLatex,
    };
  }

  if (q.includes('sign') || q.includes('negative') || q.includes('direction')) {
    return {
      reply:
        lang === 'hinglish'
          ? `Sign convention bilkul simple rakho beta: jo direction motion ya incident ray ki hai usse $+ve$ maano. Step ${activeStep.stepNumber} mein ek baar signs fix kar liye toh formula ke andar kabhi dobara sign mat badalna — answer ka final sign khud sahi direction bata dega!`
          : `Keep sign conventions effortless: pick the direction of motion or incident light as $+ve$. Once you substitute signed knowns in Step ${activeStep.stepNumber}, never add extra signs to the unknown — the final sign tells you the true direction.`,
      latex: activeStep.boardLatex,
    };
  }

  return {
    reply:
      lang === 'hinglish'
        ? `Bahut accha sawal pucha beta! Step ${activeStep.stepNumber} (${activeStep.title}) ka main logic yeh hai: ${activeStep.boardNotes} Pro-tip yaad rakhna — ${activeStep.proTip} Ab jab clear ho gaya ho toh "Resume Lesson" dabao!`
        : `Excellent cross-question! In Step ${activeStep.stepNumber} (${activeStep.title}) for ${lesson.chapterName}, the key idea is: ${activeStep.boardNotes} Keep this pro-tip in mind: ${activeStep.proTip}`,
    latex: activeStep.boardLatex,
  };
}
