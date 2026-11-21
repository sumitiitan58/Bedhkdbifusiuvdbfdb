import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve(process.cwd(), 'public/assets/aistudio');
fs.mkdirSync(OUT_DIR, { recursive: true });

function pdfEscape(str) {
  return String(str)
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapLines(text, maxChars) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (!cur) {
      cur = w;
    } else if ((cur + ' ' + w).length <= maxChars) {
      cur += ' ' + w;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/**
 * Generates a crisp, print-grade A4 vector PDF (595 x 842 pt) with PREPSKM branding.
 */
function buildPrepskmPdf(doc) {
  const pages = [];
  const PAGE_W = 595;
  const PAGE_H = 842;
  const MARGIN_X = 42;
  const CONTENT_W = PAGE_W - MARGIN_X * 2;

  let ops = [];
  let y = PAGE_H;

  function drawHeader(pageNum) {
    ops = [];
    // Top navy banner
    ops.push('0.043 0.106 0.231 rg');
    ops.push(`0 ${PAGE_H - 76} ${PAGE_W} 76 re f`);
    // Orange accent stripe
    ops.push('0.976 0.451 0.086 rg');
    ops.push(`0 ${PAGE_H - 80} ${PAGE_W} 4 re f`);

    // Brand label
    ops.push('1 1 1 rg');
    ops.push('BT /F2 10 Tf');
    ops.push(`${MARGIN_X} ${PAGE_H - 26} Td (${pdfEscape('PREPSKM.IN  |  JEE MAIN & ADVANCED CONCISE NOTES')}) Tj ET`);

    // Right badge
    const badge = `${doc.subject.toUpperCase()}  |  ${doc.classLabel.toUpperCase()}`;
    ops.push('0.976 0.451 0.086 rg');
    ops.push('BT /F2 9 Tf');
    ops.push(`${PAGE_W - MARGIN_X - badge.length * 5.2} ${PAGE_H - 26} Td (${pdfEscape(badge)}) Tj ET`);

    // Chapter title
    ops.push('1 1 1 rg');
    ops.push('BT /F2 16 Tf');
    ops.push(`${MARGIN_X} ${PAGE_H - 52} Td (${pdfEscape(`Ch ${doc.num}: ${doc.title}`)}) Tj ET`);

    // Subtitle
    ops.push('0.80 0.86 0.96 rg');
    ops.push('BT /F1 8.5 Tf');
    ops.push(`${MARGIN_X} ${PAGE_H - 68} Td (${pdfEscape(`Weightage: ${doc.weightage} Marks  |  Difficulty: ${doc.difficulty}  |  Page ${pageNum}`)}) Tj ET`);

    // Footer divider & text
    ops.push('0.85 0.88 0.92 RG 0.6 w');
    ops.push(`${MARGIN_X} 36 m ${PAGE_W - MARGIN_X} 36 l S`);
    ops.push('0.40 0.46 0.55 rg');
    ops.push('BT /F1 8 Tf');
    ops.push(`${MARGIN_X} 22 Td (${pdfEscape('PREPSKM.IN  -  Curated by @unfiltereddsumit  |  Free JEE Revision Library')}) Tj ET`);
    ops.push('BT /F1 8 Tf');
    ops.push(`${PAGE_W - MARGIN_X - 42} 22 Td (${pdfEscape(`Page ${pageNum}`)}) Tj ET`);

    y = PAGE_H - 102;
  }

  function flushPage() {
    pages.push(ops.join('\n'));
  }

  function ensureSpace(needed) {
    if (y - needed < 54) {
      flushPage();
      drawHeader(pages.length + 1);
    }
  }

  function drawSectionHeading(title, colorRgb = '0.145 0.388 0.922') {
    ensureSpace(36);
    y -= 6;
    // Soft section bar
    ops.push('0.945 0.965 0.992 rg');
    ops.push(`${MARGIN_X} ${y - 6} ${CONTENT_W} 22 re f`);
    ops.push(`${colorRgb} rg`);
    ops.push(`${MARGIN_X} ${y - 6} 4 22 re f`);
    ops.push('0.043 0.106 0.231 rg');
    ops.push('BT /F2 11 Tf');
    ops.push(`${MARGIN_X + 12} ${y + 1} Td (${pdfEscape(title)}) Tj ET`);
    y -= 24;
  }

  function drawBullet(label, body) {
    const full = label ? `${label}: ${body}` : body;
    const wrapped = wrapLines(full, 88);
    const height = wrapped.length * 14 + 5;
    ensureSpace(height);

    // Bullet dot
    ops.push('0.976 0.451 0.086 rg');
    ops.push(`${MARGIN_X + 6} ${y - 2} 3.5 3.5 re f`);

    ops.push('0.12 0.16 0.24 rg');
    wrapped.forEach((line, idx) => {
      const font = idx === 0 && label ? '/F2' : '/F1';
      ops.push(`BT ${font} 9.5 Tf`);
      ops.push(`${MARGIN_X + 16} ${y - 3 - idx * 13.5} Td (${pdfEscape(line)}) Tj ET`);
    });
    y -= height;
  }

  function drawFormulaBox(formulaLine) {
    const wrapped = wrapLines(formulaLine, 82);
    const boxH = wrapped.length * 14 + 12;
    ensureSpace(boxH + 6);
    ops.push('0.965 0.973 0.985 rg');
    ops.push(`${MARGIN_X + 6} ${y - boxH + 8} ${CONTENT_W - 12} ${boxH} re f`);
    ops.push('0.82 0.87 0.94 RG 0.6 w');
    ops.push(`${MARGIN_X + 6} ${y - boxH + 8} ${CONTENT_W - 12} ${boxH} re S`);
    ops.push('0.043 0.106 0.231 rg');
    wrapped.forEach((line, idx) => {
      ops.push('BT /F3 9 Tf');
      ops.push(`${MARGIN_X + 14} ${y - 5 - idx * 13.5} Td (${pdfEscape(line)}) Tj ET`);
    });
    y -= boxH + 6;
  }

  function drawTrapBox(text) {
    const wrapped = wrapLines(text, 84);
    const boxH = wrapped.length * 13.5 + 12;
    ensureSpace(boxH + 6);
    ops.push('1.0 0.968 0.929 rg');
    ops.push(`${MARGIN_X + 6} ${y - boxH + 8} ${CONTENT_W - 12} ${boxH} re f`);
    ops.push('0.976 0.451 0.086 rg');
    ops.push(`${MARGIN_X + 6} ${y - boxH + 8} 3.5 ${boxH} re f`);
    ops.push('0.45 0.18 0.04 rg');
    wrapped.forEach((line, idx) => {
      ops.push('BT /F1 9.2 Tf');
      ops.push(`${MARGIN_X + 16} ${y - 5 - idx * 13.5} Td (${pdfEscape(line)}) Tj ET`);
    });
    y -= boxH + 6;
  }

  drawHeader(1);

  // Intro summary card
  const introLines = wrapLines(doc.summary, 90);
  const introH = introLines.length * 13.5 + 14;
  ops.push('0.97 0.98 1.0 rg');
  ops.push(`${MARGIN_X} ${y - introH + 10} ${CONTENT_W} ${introH} re f`);
  ops.push('0.80 0.86 0.96 RG 0.7 w');
  ops.push(`${MARGIN_X} ${y - introH + 10} ${CONTENT_W} ${introH} re S`);
  ops.push('0.14 0.20 0.30 rg');
  introLines.forEach((line, idx) => {
    ops.push('BT /F1 9.5 Tf');
    ops.push(`${MARGIN_X + 10} ${y - 4 - idx * 13.5} Td (${pdfEscape(line)}) Tj ET`);
  });
  y -= introH + 10;

  drawSectionHeading('1. HIGH-YIELD SYLLABUS & CONCEPT ROADMAP');
  for (const item of doc.topics) {
    drawBullet(item[0], item[1]);
  }

  drawSectionHeading('2. MASTER FORMULA SHEET & KEY RELATIONS', '0.063 0.725 0.506');
  for (const f of doc.formulas) {
    drawFormulaBox(f);
  }

  drawSectionHeading('3. CLASSIC JEE TRAPS, EXCEPTIONS & EXAM SHORTCUTS', '0.976 0.451 0.086');
  for (const t of doc.traps) {
    drawTrapBox(t);
  }

  drawSectionHeading('4. SOLVED PYQ CHECKPOINTS (JEE MAIN & ADVANCED)');
  for (const p of doc.pyqs) {
    drawBullet(p[0], p[1]);
  }

  flushPage();

  // Assemble PDF objects
  const objects = [];
  function addObj(body) {
    objects.push(body);
    return objects.length;
  }

  const font1 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const font2 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const font3 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>');

  const pageObjIds = [];
  const pagesPlaceholderIdx = addObj(''); // filled after pages created

  for (const stream of pages) {
    const contentId = addObj(`<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`);
    const pageId = addObj(
      `<< /Type /Page /Parent ${pagesPlaceholderIdx} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R /F3 ${font3} 0 R >> >> /Contents ${contentId} 0 R >>`
    );
    pageObjIds.push(pageId);
  }

  objects[pagesPlaceholderIdx - 1] = `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjIds.length} >>`;
  const catalogId = addObj(`<< /Type /Catalog /Pages ${pagesPlaceholderIdx} 0 R >>`);

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefPos = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
}

const PHYSICS_DOCS = [
  {
    file: 'PREPSKM_Phy_01_Units_Dimensions_Errors_JEE.pdf',
    num: '01',
    title: 'Units, Dimensions & Errors',
    subject: 'Physics',
    classLabel: 'Class 11 JEE',
    weightage: 4,
    difficulty: 'Easy',
    summary: 'Complete JEE Main & Advanced concise revision covering SI Base Units, Dimensional Formulae of Mechanics & Electromagnetism, Significant Figures, Error Propagation, Vernier Callipers, Screw Gauge, and Lab Experiments.',
    topics: [
      ['SI Base & Supplementary Units', '7 fundamental units (m, kg, s, A, K, mol, cd) plus radian & steradian (dimensionless).'],
      ['Principle of Homogeneity', 'Only quantities with identical dimensions can be added, subtracted, or equated. Transcendental functions (sin, exp, log) have dimensionless arguments.'],
      ['Significant Figures & Rounding', 'Trailing zeros without decimal point are non-significant; addition/subtraction follows least decimal places; multiplication/division follows least significant figures.'],
      ['Vernier Callipers & Screw Gauge', 'Least Count (LC) = 1 MSD - 1 VSD; Screw Gauge LC = Pitch / No. of Circular Scale Divisions. Always apply Zero Error correction: True Reading = Observed - Zero Error.'],
    ],
    formulas: [
      'Error Propagation for Z = (A^p * B^q) / C^r  =>  (dZ/Z)_max = p(dA/A) + q(dB/B) + r(dC/C)',
      'Relative Error in Sum/Diff (Z = A +/- B):  dZ_max = dA + dB   (errors ALWAYS add!)',
      'Key Dimensions: [G] = M^-1 L^3 T^-2 | [h] = M L^2 T^-1 | [eps0] = M^-1 L^-3 T^4 A^2 | [mu0] = M L T^-2 A^-2',
      'LC (Vernier) = 1 MSD - 1 VSD = (1 - m/n) MSD   |   LC (Screw Gauge) = Pitch / N',
    ],
    traps: [
      'TRAP 1: Never subtract errors in Z = A - B or Z = A / B. Maximum permissible error ALWAYS adds absolute or fractional errors.',
      'TRAP 2: Zero error sign! Positive zero error is SUBTRACTED; negative zero error is ADDED to measured reading.',
      'TRAP 3: Time constants RC, L/R, and sqrt(LC) all have dimension [T], while 1/sqrt(mu0*eps0) = c has dimension [L T^-1].',
    ],
    pyqs: [
      ['PYQ Check 1 (JEE Main)', 'If Force F, Velocity V, and Time T are taken as fundamental units, [Mass] = [F V^-1 T].'],
      ['PYQ Check 2 (JEE Adv)', 'In Searle experiment for Young modulus Y = 4FL / (pi d^2 l), % error in Y = %L + 2(%d) + %l (since F is exact weight).'],
    ],
  },
  {
    file: 'PREPSKM_Phy_02_Kinematics_JEE.pdf',
    num: '02',
    title: 'Kinematics',
    subject: 'Physics',
    classLabel: 'Class 11 JEE',
    weightage: 8,
    difficulty: 'Moderate',
    summary: '1D Calculus Kinematics, Motion Under Gravity & Graph Conversions, 2D Projectile Motion, Inclined Plane Projectile, Relative Velocity (River-Boat, Rain-Man, Minimum Separation), and JEE PYQs.',
    topics: [
      ['1D Calculus Kinematics', 'v = dx/dt, a = dv/dt = v(dv/dx). Area under v-t graph gives displacement; area under a-t graph gives change in velocity.'],
      ['Motion Under Gravity', 'Galileo odd-number ratio 1:3:5:7 for equal time intervals from rest; stopping distance s_stop = u^2/(2a) proportional to u^2.'],
      ['Ground-to-Ground & Inclined Projectile', 'Equation of trajectory y = x tan(theta) - g x^2 / (2 u^2 cos^2 theta) = x tan(theta)(1 - x/R). Maximum range R_max = u^2/g at 45 deg.'],
      ['Relative Motion in 2D', 'River-Boat: shortest time t_min = d / v_br (aim perpendicular); shortest path requires v_br > v_r and sin(theta) = v_r / v_br.'],
    ],
    formulas: [
      'Projectile: T = (2u sin theta)/g  |  H = (u^2 sin^2 theta)/(2g)  |  R = (u^2 sin 2theta)/g  |  4H = R tan theta',
      'Inclined Plane (angle beta, launch alpha wrt incline): T = 2u sin(alpha)/(g cos beta) | R_max = u^2 / (g(1 + sin beta))',
      'Min Distance Between Two Particles: Switch to frame of B => d_min = |r_AB x v_AB| / |v_AB|',
      'Rain-Man: v_rm = v_r - v_m  (tilt umbrella along -v_rm)',
    ],
    traps: [
      'TRAP 1: Distance >= |Displacement|. Check if velocity v(t) changes sign inside [t1, t2] before integrating for distance.',
      'TRAP 2: On an inclined plane, max range occurs at alpha = (pi/4 - beta/2) wrt the incline (bisects vertical and incline).',
      'TRAP 3: Radius of curvature of projectile at any point where velocity makes angle phi with horizontal: R_c = v^2 / (g cos phi).',
    ],
    pyqs: [
      ['PYQ Check 1', 'Two projectiles thrown at complementary angles theta and (90 - theta) have equal range R and T1*T2 = 2R/g, H1 + H2 = u^2/(2g).'],
      ['PYQ Check 2', 'For a particle with v = alpha * sqrt(x), acceleration a = v(dv/dx) = alpha^2 / 2 (constant acceleration!).'],
    ],
  },
  {
    file: 'PREPSKM_Phy_03_Laws_of_Motion_JEE.pdf',
    num: '03',
    title: 'Laws of Motion & Friction',
    subject: 'Physics',
    classLabel: 'Class 11 JEE',
    weightage: 8,
    difficulty: 'Moderate',
    summary: 'Newton Laws, Free Body Diagrams, String vs Spring Cut Problems, Pulley & Wedge Constraints, Pseudo Force in Non-Inertial Frames, Static/Kinetic Friction, Two-Block Algorithm & Circular Dynamics.',
    topics: [
      ['String vs Spring Cut', 'String tension & normal force vanish/adjust instantaneously; ideal spring force kx CANNOT change instantaneously after a cut.'],
      ['Constraint Relations', 'Virtual work method: Sum(T . a) = 0 for massless inextensible strings; Wedge constraint: perpendicular acceleration component matches wedge surface.'],
      ['Friction & Two-Block Systems', 'f_static <= mu_s * N (self-adjusting); f_kinetic = mu_k * N. Two-block algorithm: assume moving together -> find a_common -> check required f <= mu_s * N.'],
      ['Circular Dynamics', 'Banking with friction: v_max = sqrt(Rg (tan theta + mu)/(1 - mu tan theta)). Conical pendulum: T = 2*pi*sqrt(L cos theta / g).'],
    ],
    formulas: [
      'Atwood Machine: a = (m1 - m2)g / (m1 + m2)  |  T = 2 m1 m2 g / (m1 + m2)',
      'Minimum Force to Pull Block on Rough Horizontal Surface: F_min = mu*mg / sqrt(1 + mu^2) at angle tan(theta) = mu',
      'Angle of Repose: tan(theta_r) = mu_s  |  Block sliding down rough incline: a = g(sin theta - mu_k cos theta)',
      'Pseudo Force in Frame Accelerating at a_0: F_pseudo = -m * a_0',
    ],
    traps: [
      'TRAP 1: Static friction is NOT always mu_s * N! Use mu_s * N only at impending slipping.',
      'TRAP 2: Pulling a lawn roller is easier than pushing because pulling reduces Normal reaction N = mg - F sin(theta).',
      'TRAP 3: In a curved track, centripetal force is NOT a separate force — it is the net radial component of real forces (N, T, mg, f).',
    ],
    pyqs: [
      ['PYQ Check 1', 'Block of mass m on smooth wedge of mass M: horizontal acceleration needed for wedge to keep block stationary is a = g tan(theta).'],
      ['PYQ Check 2', 'Chain of length L hanging off rough table (coeff mu): max hanging fraction without slipping is mu / (1 + mu).'],
    ],
  },
  {
    file: 'PREPSKM_Phy_04_Work_Energy_Power_JEE.pdf',
    num: '04',
    title: 'Work, Energy & Power',
    subject: 'Physics',
    classLabel: 'Class 11 JEE',
    weightage: 4,
    difficulty: 'Moderate',
    summary: 'Work by Constant & Variable Forces, Work-Energy Theorem (valid in all frames including non-inertial with pseudo force), Conservative Forces, Potential Energy U(x) Equilibrium Curves, Vertical Circular Motion & Constant Power.',
    topics: [
      ['Work-Energy Theorem', 'W_all = W_conservative + W_non-conservative + W_external + W_pseudo = Delta K. Valid for both rigid bodies and variable forces.'],
      ['Conservative Force & U(x)', 'F = -grad(U) = -(dU/dx i + dU/dy j + dU/dz k). Stable equilibrium: dU/dx = 0 & d2U/dx2 > 0; Unstable: d2U/dx2 < 0.'],
      ['Vertical Circular Motion (String vs Rod)', 'String minimum speed at bottom to loop = sqrt(5gR), top = sqrt(gR), mid = sqrt(3gR). Massless rod needs only sqrt(4gR) at bottom!'],
      ['Constant Power Motion', 'P = F.v = const => v(t) = sqrt(2Pt/m), x(t) proportional to t^(3/2), a(t) proportional to t^(-1/2).'],
    ],
    formulas: [
      'W = Integral(F . dr)   |   Delta K = W_total   |   Delta(K + U) = W_nc + W_ext',
      'Vertical Circle String Tension Difference: T_bottom - T_top = 6 mg (always!)',
      'Condition for Particle Leaving Smooth Hemisphere of Radius R from Top: cos(theta) = 2/3 (h = R/3 below top)',
      'Spring Energy: U = (1/2) k x^2  |  Work by spring from x1 to x2: W_s = (1/2)k(x1^2 - x2^2)',
    ],
    traps: [
      'TRAP 1: Work done by friction can be positive, negative, or zero depending on reference frame (though total work by static friction on a two-block system is zero).',
      'TRAP 2: For vertical circle with a string, if sqrt(2gR) < u_bottom < sqrt(5gR), the string goes slack above the horizontal (between 90 and 180 deg) and becomes a projectile!',
    ],
    pyqs: [
      ['PYQ Check 1', 'Force F = (y i + x j) is conservative because dFy/dx = dFx/dy = 1, with U(x,y) = -xy + C.'],
      ['PYQ Check 2', 'Block dropped from height h onto spring k: max compression x satisfies mg(h + x) = (1/2)k x^2 (don\'t forget +x in gravity work!).'],
    ],
  },
  {
    file: 'PREPSKM_Phy_05_COM_Collisions_JEE.pdf',
    num: '05',
    title: 'COM, Momentum & Collisions',
    subject: 'Physics',
    classLabel: 'Class 11 JEE',
    weightage: 8,
    difficulty: 'Moderate',
    summary: 'Center of Mass of Standard Bodies & Cavity Trick, Motion of COM (Man-Boat / Block-Wedge Shift), Variable Mass Rocket Propulsion, Reduced Mass Spring-Block Systems, Head-On & Oblique Collisions.',
    topics: [
      ['COM of Standard Bodies', 'Semicircular ring: 2R/pi; Semicircular disc: 4R/(3pi); Hollow hemisphere: R/2; Solid hemisphere: 3R/8; Solid cone: h/4 from base; Hollow cone: h/3 from base.'],
      ['Cavity Trick', 'Treat removed cavity as negative mass (-m_cav): x_COM = (M*x_full - m_cav*x_cav) / (M - m_cav).'],
      ['Momentum Conservation & Man-Boat', 'If F_ext,x = 0 and initial v_COM = 0 => Sum(m_i * Delta x_i) = 0.'],
      ['Collisions (e = Coefficient of Restitution)', 'e = (v2 - v1)_sep / (u1 - u2)_app along Line of Impact (LOI). Perpendicular components remain unchanged for smooth spheres.'],
    ],
    formulas: [
      'Loss of KE in Head-On Collision: Delta K_loss = (1/2) * mu * (u1 - u2)^2 * (1 - e^2), where mu = m1*m2/(m1 + m2)',
      'Rocket Equation: F_thrust = v_rel * (-dm/dt)  |  v = v0 + v_rel * ln(m0/m) - gt',
      'Spring-Block Max Compression (free on smooth floor): (1/2) k x_max^2 = (1/2) mu (v_rel)^2',
      'Bouncing Ball: h_n = e^(2n) h0  |  Total Distance = h0 * (1 + e^2)/(1 - e^2)  |  Total Time = sqrt(2h0/g) * (1 + e)/(1 - e)',
    ],
    traps: [
      'TRAP 1: Elastic collision between two EQUAL masses in 2D (one at rest) ALWAYS sends them off at 90 degrees to each other!',
      'TRAP 2: Coefficient of restitution e applies ONLY to velocity components along the common normal (Line of Impact).',
    ],
    pyqs: [
      ['PYQ Check 1', 'Block of mass m slides down smooth movable wedge M of base b: horizontal shift of wedge = m*b / (M + m).'],
      ['PYQ Check 2', 'In head-on elastic collision with equal mass m1 = m2, velocities simply interchange.'],
    ],
  },
  {
    file: 'PREPSKM_Phy_06_Rotational_Motion_JEE.pdf',
    num: '06',
    title: 'Rotational Motion',
    subject: 'Physics',
    classLabel: 'Class 11 JEE',
    weightage: 8,
    difficulty: 'Tough',
    summary: 'Moment of Inertia, Parallel & Perpendicular Axis Theorems, Torque & Static Equilibrium, Angular Momentum Conservation, Pure Rolling, Instantaneous Axis of Rotation (IAOR), Incline Race, Rolling+Slipping & Toppling.',
    topics: [
      ['MOI & Axis Theorems', 'Parallel Axis: I = I_cm + M d^2. Perpendicular Axis (planar laminae ONLY): I_z = I_x + I_y.'],
      ['Standard MOI (I = beta M R^2)', 'Ring: 1 | Hollow Cylinder: 1 | Disc/Solid Cylinder: 1/2 | Hollow Sphere: 2/3 | Solid Sphere: 2/5 | Rod (center): ML^2/12, (end): ML^2/3.'],
      ['Pure Rolling Kinematics & Dynamics', 'v_cm = omega * R, a_cm = alpha * R. Velocity of top point = 2v_cm; contact point = 0.'],
      ['Toppling vs Sliding', 'Compare force needed for sliding (mu*mg) vs force for toppling about front edge (F*h = mg*(b/2)).'],
    ],
    formulas: [
      'Pure Rolling Down Incline: a = g sin(theta) / (1 + beta)  |  f_req = [beta / (1 + beta)] mg sin(theta)',
      'Condition for No Slipping Down Incline: mu_s >= [beta / (1 + beta)] tan(theta)',
      'Angular Momentum about O: L_O = I_cm * omega + r_cm x (M * v_cm)   (valid even during slipping!)',
      'Rolling Kinetic Energy: K = (1/2) M v_cm^2 * (1 + beta) = (1/2) I_IAOR * omega^2',
    ],
    traps: [
      'TRAP 1: Race down incline (fastest to slowest): Solid Sphere (beta=2/5) > Disc (1/2) > Hollow Sphere (2/3) > Ring (1). Independent of Mass and Radius!',
      'TRAP 2: Pulling force F applied at height h above center on a rolling body: friction is ZERO if h = beta * R (e.g., h = R/2 for a disc).',
      'TRAP 3: Perpendicular axis theorem NEVER applies to 3D bodies like spheres or cylinders.',
    ],
    pyqs: [
      ['PYQ Check 1', 'Solid sphere given pure translation v0 on rough floor: final pure rolling speed v = (5/7) v0 (via L conservation about contact point!).'],
      ['PYQ Check 2', 'Rod of length L hinged at one end released from horizontal: alpha_initial = 3g/(2L), omega_vertical = sqrt(3g/L).'],
    ],
  },
  {
    file: 'PREPSKM_Phy_07_Gravitation_JEE.pdf',
    num: '07',
    title: 'Gravitation',
    subject: 'Physics',
    classLabel: 'Class 11 JEE',
    weightage: 4,
    difficulty: 'Easy',
    summary: 'Newton Law of Gravitation, Field & Variation of g (Altitude, Depth, Latitude), Shell Theorem, Gravitational Potential & Self-Energy, Cavity Trick, Escape Velocity, Satellites, Kepler Laws, Elliptical Orbits & Tunnel SHM.',
    topics: [
      ['Variation of g', 'Height h << R: g\' = g(1 - 2h/R). Depth d: g\' = g(1 - d/R) (exact for uniform sphere). Rotation at latitude lambda: g\' = g - omega^2 R cos^2(lambda).'],
      ['Shell & Solid Sphere Fields/Potentials', 'Inside hollow shell: E = 0, V = -GM/R (constant!). Inside solid sphere: E = GMr/R^3, V = -GM(3R^2 - r^2)/(2R^3). Center V = 1.5 * V_surface.'],
      ['Satellites & Orbital Mechanics', 'Orbital speed v_o = sqrt(GM/r). Total Energy E = -GMm/(2r) = -K = U/2. Binding Energy = +GMm/(2r).'],
      ['Kepler Laws & Elliptical Orbits', 'dA/dt = L/(2m) = const. T^2 proportional to a^3 (semi-major axis!). v_max/v_min = r_max/r_min = (1+e)/(1-e).'],
    ],
    formulas: [
      'Escape Velocity: v_e = sqrt(2GM/R) = sqrt(2gR) = 11.2 km/s (Earth)  |  v_e = sqrt(2) * v_orbital(surface)',
      'Gravitational Self-Energy of Uniform Solid Sphere: U_self = -3 G M^2 / (5 R)  (Hollow Shell: -G M^2 / (2R))',
      'Earth Tunnel SHM (any chord, even off-center!): T = 2*pi * sqrt(R / g) = 84.6 minutes',
      'Binary Star System (m1, m2 at sep d): omega = sqrt(G(m1 + m2) / d^3)',
    ],
    traps: [
      'TRAP 1: For height comparable to R (e.g. h = R), DO NOT use g(1 - 2h/R)! Use exact g\' = g * R^2 / (R + h)^2.',
      'TRAP 2: Field inside a spherical cavity inside a uniform solid sphere is UNIFORM: E_cav = (4/3) pi G rho * (vector O_sphere -> O_cavity)!',
    ],
    pyqs: [
      ['PYQ Check 1', 'Particle projected with speed v > v_e reaches infinity with speed v_inf = sqrt(v^2 - v_e^2).'],
      ['PYQ Check 2', 'Geostationary satellite: T = 24 hr, equatorial plane, west-to-east, height ~ 36,000 km (~ 6R from center).'],
    ],
  },
  {
    file: 'PREPSKM_Phy_08_Elasticity_Solids_JEE.pdf',
    num: '08',
    title: 'Elasticity',
    subject: 'Physics',
    classLabel: 'Class 11 JEE',
    weightage: 4,
    difficulty: 'Easy',
    summary: 'Stress-Strain Curve, Hooke Law, Young/Bulk/Shear Moduli & Poisson Ratio, Non-Uniform/Rotating/Tapered Rods, Elastic Energy Density, Thermal Stress, Cantilever Bending & Torsion.',
    topics: [
      ['Elastic Moduli & Relations', 'Y = (F/A)/(dL/L), B = -dP/(dV/V), G (eta) = shear stress / shear strain. Compressibility K = 1/B.'],
      ['Poisson Ratio (sigma)', 'sigma = -(dR/R)/(dL/L). Theoretical limits: -1 <= sigma <= 0.5; practical metals: 0 < sigma < 0.5 (sigma = 0.5 means incompressible).'],
      ['Elongation Under Self-Weight & Rotation', 'Hanging uniform rod under own weight Mg: dL = MgL / (2AY) = rho*g*L^2 / (2Y).'],
      ['Thermal Stress & Energy Density', 'Clamped rod heated by dT: Thermal stress = Y * alpha * dT (independent of length!). Elastic energy density u = (1/2) * stress * strain = stress^2 / (2Y).'],
    ],
    formulas: [
      'Inter-relations: Y = 3B(1 - 2*sigma) = 2G(1 + sigma)  |  9/Y = 3/G + 1/B',
      'Rotating Uniform Rod (mass M, len L, angular speed omega): dL = M * omega^2 * L^2 / (3 A Y)',
      'Tapered Conical Frustum Rod (radii r1, r2): dL = F * L / (pi * r1 * r2 * Y)',
      'Torsion of Cylinder: tau = (pi * G * r^4 / (2L)) * theta',
    ],
    traps: [
      'TRAP 1: When a wire is stretched slowly by hanging mass Mg, gravity loses Mg*dL, HALF (1/2 Mg*dL) is stored as elastic PE and HALF is lost as heat!',
      'TRAP 2: Steel is MORE elastic than rubber because Y_steel >> Y_rubber.',
    ],
    pyqs: [
      ['PYQ Check 1', 'Fractional volume change of stretched wire: dV/V = (1 - 2*sigma) * (dL/L). If volume is constant, sigma = 0.5.'],
      ['PYQ Check 2', 'Breaking stress depends ONLY on material (independent of length or cross-sectional area); breaking force is proportional to Area A.'],
    ],
  },
  {
    file: 'PREPSKM_Phy_09_Fluid_Mechanics_JEE.pdf',
    num: '09',
    title: 'Fluid Mechanics & Surface Tension',
    subject: 'Physics',
    classLabel: 'Class 11 JEE',
    weightage: 8,
    difficulty: 'Moderate',
    summary: 'Hydrostatics, Pascal Law, Accelerating & Rotating Fluids, Buoyancy & Dam Force, Continuity & Bernoulli Theorem (Venturimeter, Pitot, Siphon), Torricelli Efflux, Viscosity (Poiseuille, Stokes), Surface Tension, Excess Pressure & Capillary Rise.',
    topics: [
      ['Hydrostatics & Accelerating Fluids', 'P = P0 + rho*g*h. Horizontal acceleration a: free surface tilts at tan(theta) = a/g. Rotating cylinder: paraboloid y = omega^2 r^2 / (2g).'],
      ['Buoyancy & Floating Equilibrium', 'F_B = V_sub * rho_liq * g_eff. Apparent weight of submerged ice melting in water: level stays SAME if pure water, drops if denser liquid!'],
      ['Bernoulli & Torricelli', 'P + (1/2)rho*v^2 + rho*g*h = const along streamline. Efflux speed v = sqrt(2gh); max horizontal range R_max = H when hole is at h = H/2.'],
      ['Viscosity & Surface Tension', 'Stokes drag F = 6*pi*eta*r*v. Excess pressure: Liquid drop = 2T/R; Soap bubble = 4T/R. Capillary rise h = 2T cos(theta) / (rho*g*r).'],
    ],
    formulas: [
      'Terminal Velocity: v_T = (2/9) * r^2 * (rho_body - rho_fluid) * g / eta',
      'Poiseuille Flow Rate: Q = pi * dP * r^4 / (8 * eta * L)',
      'Coalescence of N Identical Drops (r -> R = N^(1/3) r): Energy Released = 4*pi*T * (N r^2 - R^2)',
      'Two Soap Bubbles Merging Isothermally (vacuum): R^2 = R1^2 + R2^2  |  Common interface radius: 1/R_c = 1/R1 - 1/R2',
    ],
    traps: [
      'TRAP 1: If a capillary tube is of insufficient length (L < h), water DOES NOT overflow — meniscus flattens so radius of curvature increases (R_new = R_old * h / L).',
      'TRAP 2: When two soap bubbles of unequal radii are connected by a tube, air flows from SMALLER bubble (higher pressure 4T/r) to LARGER bubble!',
    ],
    pyqs: [
      ['PYQ Check 1', 'Force on vertical dam wall of width b and water height H: F = (1/2) rho*g*H^2*b acting at H/3 from bottom.'],
      ['PYQ Check 2', 'Time to empty tank of area A through hole a from H1 to H2: t = (A/a) * sqrt(2/g) * (sqrt(H1) - sqrt(H2)).'],
    ],
  },
  {
    file: 'PREPSKM_Phy_10_Thermal_Physics_JEE.pdf',
    num: '10',
    title: 'Thermal Physics',
    subject: 'Physics',
    classLabel: 'Class 11 JEE',
    weightage: 4,
    difficulty: 'Moderate',
    summary: 'Thermometry, Linear/Area/Volume Thermal Expansion, Apparent Liquid Expansion, Pendulum Clock & Scale Errors, Calorimetry (Ice-Steam Mixing), Heat Conduction (Thermal Resistance & Ice Growth), Radiation (Kirchhoff, Wien, Stefan-Boltzmann) & Newton Law of Cooling.',
    topics: [
      ['Thermal Expansion', 'L = L0(1 + alpha*dT); beta = 2*alpha, gamma = 3*alpha (isotropic). Apparent expansion: gamma_app = gamma_liquid - gamma_vessel.'],
      ['Pendulum & Scale Errors', 'Fractional time loss/gain: dT/T = (1/2) alpha * dT. Hot metal scale expands => reads LESS than true length!'],
      ['Calorimetry (Ice-Water-Steam)', 'Ice c = 0.5 cal/gC, Water c = 1 cal/gC, L_f = 80 cal/g, L_v = 540 cal/g. Check phase change heat thresholds before computing T_final.'],
      ['Conduction & Radiation', 'Thermal resistance R_th = L / (k*A). Stefan-Boltzmann: P = e*sigma*A*(T^4 - T0^4). Wien Law: lambda_m * T = b = 2.898e-3 m*K.'],
    ],
    formulas: [
      'Bimetallic Strip Radius of Curvature: R = d / ((alpha2 - alpha1) * dT)',
      'Growth of Ice Layer on Pond (thickness x): t = (rho * L_f / (2 * k * |T|)) * x^2   =>  t proportional to x^2',
      'Newton Law of Cooling (Average Form): (T1 - T2)/t = K * [(T1 + T2)/2 - T_surr]',
      'Solar Constant & Equilibrium Temperature of Planet: T_eq = T_sun * sqrt(R_sun / (2*d))',
    ],
    traps: [
      'TRAP 1: Rate of cooling (-dT/dt) is proportional to (A / m*c) = 3 / (rho*c*R), so smaller sphere cools FASTER, even though larger sphere radiates more power!',
      'TRAP 2: In Stefan-Boltzmann Law, T MUST always be in Kelvin (K), never Celsius.',
    ],
    pyqs: [
      ['PYQ Check 1', 'Two rods in series (L1, k1 & L2, k2): k_eq = (L1 + L2) / (L1/k1 + L2/k2). In parallel: k_eq = (k1*A1 + k2*A2)/(A1 + A2).'],
      ['PYQ Check 2', 'Hole in a heated metal plate EXPANDS just like the solid material (photographic enlargement!).'],
    ],
  },
  {
    file: 'PREPSKM_Phy_11_KTG_Thermodynamics_JEE.pdf',
    num: '11',
    title: 'KTG & Thermodynamics',
    subject: 'Physics',
    classLabel: 'Class 11 JEE',
    weightage: 8,
    difficulty: 'Moderate',
    summary: 'Ideal Gas Law, KTG Pressure & Molecular Speeds, Mean Free Path, Degrees of Freedom & Gas Mixtures, First Law & All 5 Processes (Isochoric, Isobaric, Isothermal, Adiabatic, Polytropic), Cyclic Processes, Carnot Engine, Refrigerator & Entropy.',
    topics: [
      ['KTG & Molecular Speeds', 'P = (1/3) rho v_rms^2. Speeds order: v_mp < v_avg < v_rms (ratio sqrt(2) : sqrt(8/pi) : sqrt(3)).'],
      ['Degrees of Freedom (f) & Mixtures', 'Monoatomic f=3 (gamma=5/3); Diatomic rigid f=5 (gamma=7/5); Non-linear polyatomic f=6 (gamma=4/3). Cv = fR/2, Cp = (f/2 + 1)R.'],
      ['First Law & Polytropic Processes', 'dQ = dU + dW. Always dU = n*Cv*dT (for ideal gas in ANY process!). Polytropic PV^x = const => C = Cv + R/(1 - x).'],
      ['Second Law, Carnot & Entropy', 'Carnot efficiency eta = 1 - T_sink/T_source. Refrigerator COP = Q2/W = T2/(T1 - T2). Entropy change dS = Integral(dQ_rev / T).'],
    ],
    formulas: [
      'v_rms = sqrt(3RT/M)  |  v_avg = sqrt(8RT/(pi*M))  |  v_mp = sqrt(2RT/M)',
      'Mean Free Path: lambda = 1 / (sqrt(2) * pi * d^2 * n) = k_B * T / (sqrt(2) * pi * d^2 * P)',
      'Adiabatic Work: W = (P1 V1 - P2 V2) / (gamma - 1) = nR(T1 - T2) / (gamma - 1)',
      'Gas Mixture: Cv_mix = (n1 Cv1 + n2 Cv2) / (n1 + n2)  |  gamma_mix = Cp_mix / Cv_mix',
    ],
    traps: [
      'TRAP 1: Slope of Adiabatic on P-V graph is gamma times steeper than Isothermal: (dP/dV)_adia = gamma * (dP/dV)_iso.',
      'TRAP 2: Free expansion of an ideal gas into vacuum: Q = 0, W = 0, Delta U = 0, Delta T = 0, yet Delta S = nR ln(V2/V1) > 0 (irreversible!).',
    ],
    pyqs: [
      ['PYQ Check 1', 'Efficiency of a cyclic process = W_net / Q_absorbed (ONLY sum positive heat legs in denominator, NOT net heat!).'],
      ['PYQ Check 2', 'In isobaric process for diatomic gas (f=5), fraction of heat going to work = W/Q = R/Cp = 2/7; to internal energy = 5/7.'],
    ],
  },
  {
    file: 'PREPSKM_Phy_12_SHM_JEE.pdf',
    num: '12',
    title: 'Simple Harmonic Motion',
    subject: 'Physics',
    classLabel: 'Class 11 JEE',
    weightage: 4,
    difficulty: 'Moderate',
    summary: 'SHM Kinematics, Phasor Circle Method, Superposition of Collinear & Orthogonal SHMs, Energy Time vs Space Averages, Spring-Block & Pulley-Spring Systems, Simple/Physical/Torsional Pendulums, Damped & Forced Oscillations.',
    topics: [
      ['SHM Kinematics & Phasor Circle', 'a = -omega^2 x; v = omega * sqrt(A^2 - x^2). Time from 0 to A/2 is T/12; from A/2 to A is T/6 (phasor circle makes time intervals instant!).'],
      ['Energy in SHM', 'E = (1/2) m omega^2 A^2. Time average: <K>_t = <U>_t = E/2. Space average: <K>_x = (2/3)E, <U>_x = (1/3)E.'],
      ['Spring-Block & Pulley Combinations', 'Series: 1/k_eq = 1/k1 + 1/k2. Parallel: k_eq = k1 + k2. Cutting spring of length L into ratio n1:n2 gives k proportional to 1/L.'],
      ['Pendulums & g_eff', 'Simple: T = 2*pi*sqrt(L/g_eff). Physical: T = 2*pi*sqrt(I/(m*g*d)). Infinite length pendulum: T = 2*pi*sqrt(R_earth / g) = 84.6 min.'],
    ],
    formulas: [
      'Two-Block Spring System (m1, m2): T = 2*pi * sqrt(mu / k),  where mu = m1*m2 / (m1 + m2)',
      'Spring with Mass m_s: T = 2*pi * sqrt((M + m_s/3) / k)',
      'Damped Oscillation: x(t) = A0 * exp(-b*t / (2m)) * cos(omega\'*t + phi)  |  E(t) = E0 * exp(-b*t / m)',
      'Superposition of Collinear SHMs (same omega): A_res = sqrt(A1^2 + A2^2 + 2 A1 A2 cos(dphi))',
    ],
    traps: [
      'TRAP 1: Frequency of KE or PE oscillation is 2f (double the SHM frequency!), while total energy E is constant.',
      'TRAP 2: Hanging a spring vertically shifts ONLY the mean position by mg/k; time period T = 2*pi*sqrt(m/k) is UNCHANGED!',
    ],
    pyqs: [
      ['PYQ Check 1', 'U-tube liquid column of total length L: T = 2*pi * sqrt(L / (2g)).'],
      ['PYQ Check 2', 'In a movable pulley with mass attached to pulley and spring k on string: k_eff = 4k or k/4 depending on whether mass moves 2x or x/2 wrt spring.'],
    ],
  },
  {
    file: 'PREPSKM_Phy_13_Waves_Sound_JEE.pdf',
    num: '13',
    title: 'Waves & Sound',
    subject: 'Physics',
    classLabel: 'Class 11 JEE',
    weightage: 4,
    difficulty: 'Moderate',
    summary: 'Progressive Waves, Wave Velocity on String & Laplace Sound Speed, Interference & Reflection, Standing Waves & Sonometer, Open/Closed Organ Pipes, Resonance Column & End Correction, Decibel Intensity, Beats, Quincke Tube & Doppler Effect.',
    topics: [
      ['Progressive Wave Equation', 'y(x,t) = A sin(omega*t - kx + phi). Particle velocity v_p = -v_wave * (dy/dx). Wave intensity I = 2 * pi^2 * f^2 * A^2 * rho * v.'],
      ['Speed of Waves', 'String: v = sqrt(T / mu). Sound in gas (Laplace adiabatic): v = sqrt(gamma * R * T / M). Sound speed is independent of pressure at constant T.'],
      ['Standing Waves & Organ Pipes', 'String/Open Pipe: all harmonics f_n = n*v/(2L). Closed Pipe: ONLY odd harmonics f_n = (2n-1)*v/(4L).'],
      ['Beats & Doppler Effect', 'Beat frequency f_beat = |f1 - f2|. Loading a tuning fork with wax DECREASES its frequency; filing INCREASES its frequency.'],
    ],
    formulas: [
      'Doppler Effect: f_app = f0 * [(v_sound +/- v_observer) / (v_sound -/+ v_source)]   (top sign = towards)',
      'Decibel Loudness Level: beta = 10 * log10(I / I0) dB,  where I0 = 10^-12 W/m^2',
      'End Correction in Resonance Tube: e = (L2 - 3*L1) / 2   |   v = 2 * f * (L2 - L1)',
      'Pressure Wave Amplitude: dP_0 = B * k * s_0 = rho * v * omega * s_0  (90 deg out of phase with displacement!)',
    ],
    traps: [
      'TRAP 1: At a displacement NODE in a sound wave, there is a pressure ANTINODE (maximum pressure variation)!',
      'TRAP 2: Sound speed INCREASES with humidity because water vapour (M=18) is lighter than dry air (M~29).',
    ],
    pyqs: [
      ['PYQ Check 1', 'Reflection from rigid/denser boundary causes phase shift of pi (crest becomes trough); free/rarer boundary causes 0 phase shift.'],
      ['PYQ Check 2', 'In Doppler effect with wind velocity w along sound direction, replace v_sound by (v_sound + w) in both numerator and denominator.'],
    ],
  },
  {
    file: 'PREPSKM_Phy_14_Electrostatics_JEE.pdf',
    num: '14',
    title: 'Electrostatics',
    subject: 'Physics',
    classLabel: 'Class 12 JEE',
    weightage: 8,
    difficulty: 'Moderate',
    summary: 'Coulomb Law, Continuous Charge E-Fields (Ring, Disc, Rod, Arc), Gauss Law (Sphere, Cylinder, Cube Flux, Cavity), Electrostatic Potential & Self-Energy, Electric Dipole, Conductors, Earthing & Facing Parallel Plates.',
    topics: [
      ['Continuous Charge E-Fields', 'Infinite wire: E = 2k*lambda/r. Infinite sheet: E = sigma/(2*eps0). Ring on axis: E = kQx/(R^2 + x^2)^(3/2) (max at x = R/sqrt(2)).'],
      ['Gauss Law & Cube Flux Tricks', 'Flux = q_in / eps0. Charge at cube corner: flux through cube = q/(8*eps0), through each of 3 non-adjacent faces = q/(24*eps0).'],
      ['Electric Dipole', 'Axial E = 2kp/r^3; Equatorial E = -kp/r^3; General E = (kp/r^3)*sqrt(1 + 3 cos^2 theta). Torque tau = p x E; PE U = -p . E.'],
      ['Conductors, Earthing & Concentric Shells', 'Inside conductor bulk: E = 0, V = constant. Facing plates: outermost faces carry identical charge (Q_total / 2); inner facing surfaces carry equal & opposite charges!'],
    ],
    formulas: [
      'Arc of Angle alpha & Radius R: E_center = (2 k lambda / R) * sin(alpha / 2)',
      'Solid Uniformly Charged Sphere (R): E_in = rho*r / (3*eps0)  |  V_center = 1.5 * kQ/R',
      'Electrostatic Pressure on Charged Conductor Surface: P_elec = sigma^2 / (2 * eps0)',
      'Self-Energy of Conducting Sphere: U = k Q^2 / (2R)  |  Solid Non-Conducting Sphere: U = 3 k Q^2 / (5R)',
    ],
    traps: [
      'TRAP 1: Gauss Law holds for ALL closed surfaces, and E in Integral(E.dA) is the NET electric field due to BOTH inside and outside charges!',
      'TRAP 2: Earthing a conductor sets its POTENTIAL V = 0, NOT necessarily its charge q = 0!',
    ],
    pyqs: [
      ['PYQ Check 1', 'Spherical cavity inside solid sphere of charge density rho: E_cavity = rho * (vector O -> O_cav) / (3*eps0) (UNIFORM field!).'],
      ['PYQ Check 2', 'Two small dipoles p1, p2 along axis at distance r: Force F = 6 k p1 p2 / r^4 (attractive if aligned).'],
    ],
  },
  {
    file: 'PREPSKM_Phy_15_Capacitors_JEE.pdf',
    num: '15',
    title: 'Capacitors & Dielectrics',
    subject: 'Physics',
    classLabel: 'Class 12 JEE',
    weightage: 4,
    difficulty: 'Moderate',
    summary: 'Parallel Plate, Spherical & Cylindrical Capacitors, Energy & Plate Force, Multi-Plate Method, Series-Parallel/Nodal/Cube Symmetry, Charge Sharing & Heat Loss, Dielectrics (Battery Connected vs Disconnected), Slab Pulling Force & RC Circuits.',
    topics: [
      ['Capacitor Geometries', 'Parallel plate: C = eps0*A/d. Isolated sphere: C = 4*pi*eps0*R. Spherical shell pair: 4*pi*eps0*ab/(b-a). Cylindrical: 2*pi*eps0*L / ln(b/a).'],
      ['Charge Sharing & Heat Loss', 'Two capacitors (C1,V1) & (C2,V2) connected: V_common = (C1 V1 +/- C2 V2)/(C1 + C2). Heat loss H = (1/2) * [C1 C2 / (C1 + C2)] * (V1 -/+ V2)^2.'],
      ['Dielectric Insertion Comparison', 'Battery Disconnected (Q=const): C -> KC, V -> V/K, E -> E/K, U -> U/K. Battery Connected (V=const): C -> KC, Q -> KQ, E unchanged, U -> KU.'],
      ['RC Transient Circuits', 'Charging: q(t) = q0(1 - e^(-t/tau)). Discharging: q(t) = q0 * e^(-t/tau). General time constant tau = R_eq * C (short all batteries!).'],
    ],
    formulas: [
      'Force Between Parallel Plates: F = Q^2 / (2 * A * eps0) = (1/2) C V^2 / d  (factor of 1/2 because plate cannot exert force on itself!)',
      'Slab Partially Filled (thickness t, K): C = eps0 * A / (d - t + t/K)',
      'Force Pulling Dielectric Slab into Capacitor (V=const): F = (1/2) * eps0 * b * (K - 1) * V^2 / d',
      'Energy Delivered by Battery = Q_flow * V_battery  |  Heat Dissipated = W_battery - Delta U_stored',
    ],
    traps: [
      'TRAP 1: At t = 0+ (just after closing switch), an UNCHARGED capacitor acts as a SHORT CIRCUIT (wire); at t = infinity (steady state), it acts as an OPEN CIRCUIT!',
      'TRAP 2: In a multi-plate capacitor with N plates, identify adjacent plate pairs and draw a nodal circuit to spot series/parallel combinations.',
    ],
    pyqs: [
      ['PYQ Check 1', 'Equivalent capacitance of a resistor-style cube of 12 identical capacitors C: across body diagonal = (6/5)C; face diagonal = (4/3)C; edge = (12/7)C.'],
      ['PYQ Check 2', 'In RC charging from 0 to V, exactly HALF of battery work (1/2 CV^2) is stored in capacitor and HALF is lost as heat in R (independent of R!).'],
    ],
  },
  {
    file: 'PREPSKM_Phy_16_Current_Electricity_JEE.pdf',
    num: '16',
    title: 'Current Electricity',
    subject: 'Physics',
    classLabel: 'Class 12 JEE',
    weightage: 8,
    difficulty: 'Easy',
    summary: 'Drift Velocity, Ohm Law, Wire Stretching & Truncated Cone Resistance, Kirchhoff Laws, Cell Grouping, Wheatstone Bridge, Mirror & Folding Symmetry, Bulb Power & Max Power Transfer, Ammeter/Voltmeter Conversion, Meter Bridge & Potentiometer.',
    topics: [
      ['Drift Velocity & Resistivity', 'I = n*e*A*v_d. Mobility mu = v_d / E = e*tau/m. Wire stretched to n times length (volume constant): R_new = n^2 * R_old (or R proportional to 1/r^4).'],
      ['Kirchhoff & Cell Combinations', 'Parallel cells: E_eq = (Sum E_i / r_i) / (Sum 1 / r_i), 1/r_eq = Sum(1/r_i). Max Power Transfer Theorem: P_max when R_load = r_internal.'],
      ['Circuit Symmetry Tricks', 'Mirror symmetry: currents mirror across perpendicular bisector (junctions can be detached). Folding symmetry: equipotential nodes folded together.'],
      ['Measuring Instruments', 'Ammeter: low shunt S = I_g * G / (I - I_g) in PARALLEL. Voltmeter: high R = (V / I_g) - G in SERIES. Potentiometer measures true EMF at null point (zero current drawn!).'],
    ],
    formulas: [
      'Truncated Cone Resistance (radii r1, r2, len L): R = rho * L / (pi * r1 * r2)',
      'Temperature Dependence: R(T) = R0(1 + alpha * dT)  (metals: alpha > 0; semiconductors: alpha < 0)',
      'Potentiometer Internal Resistance: r = R * (L1 - L2) / L2',
      'Bulb Resistance: R_bulb = V_rated^2 / P_rated  |  Series: lowest wattage glows brightest; Parallel: highest wattage glows brightest!',
    ],
    traps: [
      'TRAP 1: For small wire stretching (e.g. 0.1% increase in L), use dR/R = 2*(dL/L) = 0.2%. For large stretching (e.g. 100% increase), use R_new = (2)^2 R = 4R!',
      'TRAP 2: Fuse wire rating I_max is independent of fuse length (I_max proportional to r^(3/2)).',
    ],
    pyqs: [
      ['PYQ Check 1', 'Infinite ladder network with series R1 and shunt R2: R_eq = (R1 + sqrt(R1^2 + 4 R1 R2)) / 2.'],
      ['PYQ Check 2', 'In Meter Bridge, null point error is minimized when balance point is near 50 cm (middle of wire).'],
    ],
  },
  {
    file: 'PREPSKM_Phy_17_Magnetism_JEE.pdf',
    num: '17',
    title: 'Moving Charges & Magnetism',
    subject: 'Physics',
    classLabel: 'Class 12 JEE',
    weightage: 8,
    difficulty: 'Moderate',
    summary: 'Biot-Savart Law (Straight Wire, Circular Arc, Loop, Rotating Charge), Ampere Circuital Law (Cylinder, Solenoid, Toroid, Cavity), Lorentz Force (Circle, Helix, Magnetic Slab Deviation, Cycloid), Force on Current Wire, Parallel Wires & Moving Coil Galvanometer.',
    topics: [
      ['Biot-Savart Standard Fields', 'Finite wire: B = (mu0 I / 4*pi*d) * (sin theta1 + sin theta2). Circular arc (angle alpha): B = (mu0 I / 4*pi*R) * alpha. Loop axis: B = mu0 I R^2 / [2(R^2 + x^2)^(3/2)].'],
      ['Ampere Law & Cylindrical Cavity', 'Solid wire (r < R): B = mu0*J*r/2. Cavity inside solid current cylinder: B_cavity = (mu0/2) * (J x vector O -> O_cav) (UNIFORM!).'],
      ['Lorentz Force & Trajectories', 'F = q(E + v x B). Circular motion: R = mv/(qB), T = 2*pi*m/(qB) (independent of speed!). Helical pitch p = v cos(theta) * T.'],
      ['Force & Torque on Current Loop', 'F = I (L_eff x B), where L_eff is straight vector from start to end. Torque tau = M x B where M = N*I*A.'],
    ],
    formulas: [
      'Long Solenoid: B_inside = mu0 * n * I  |  B_end = (1/2) mu0 * n * I',
      'Magnetic Slab of Width d (particle enters perpendicular): sin(theta_dev) = d / R   (if d >= R, reflects back!)',
      'Force Per Unit Length Between Parallel Wires: F/L = mu0 * I1 * I2 / (2*pi*d)  (same dir => ATTRACT!)',
      'Gyromagnetic Ratio (any uniform charge/mass rotating body): M / L = q / (2m)',
    ],
    traps: [
      'TRAP 1: Magnetic force F = q(v x B) NEVER changes kinetic energy or speed of a charged particle (work done by magnetic force is always ZERO!).',
      'TRAP 2: Parallel currents ATTRACT while parallel electron beams REPEL (because electrostatic repulsion F_e > magnetic attraction F_m for v < c!).',
    ],
    pyqs: [
      ['PYQ Check 1', 'Velocity Selector (crossed E and B): undeflected particles satisfy v = E / B (independent of q and m).'],
      ['PYQ Check 2', 'MCG Current Sensitivity S_I = NBA / k; Voltage Sensitivity S_V = NBA / (k*R). Doubling turns N doubles S_I, but leaves S_V unchanged if R also doubles!'],
    ],
  },
  {
    file: 'PREPSKM_Phy_18_Magnetism_Matter_JEE.pdf',
    num: '18',
    title: 'Magnetism & Matter',
    subject: 'Physics',
    classLabel: 'Class 12 JEE',
    weightage: 4,
    difficulty: 'Easy',
    summary: 'Bar Magnet & Dipole Analogy, Cutting & Bending Magnets, Earth Magnetism (Declination, Angle of Dip, Apparent Dip), Oscillation & Deflection Magnetometers, B-H-I-chi Relations, Dia/Para/Ferromagnetic Materials, Curie Law & Hysteresis Loop.',
    topics: [
      ['Bar Magnet & Cutting/Bending', 'M = m * L_eff. Cutting along length into n slices: m -> m/n, M -> M/n. Cutting perpendicular to length: m unchanged, M -> M/n. Bent into semicircular arc: M_new = 2M / pi.'],
      ['Earth Magnetism & Apparent Dip', 'B_H = B_E cos(delta), B_V = B_E sin(delta), tan(delta) = B_V / B_H. In two perpendicular vertical planes: cot^2(delta1) + cot^2(delta2) = cot^2(delta_true).'],
      ['Dia, Para & Ferromagnetic Materials', 'Diamagnetic: chi small negative (-10^-5), repelled, temp-independent (Meissner effect: chi = -1 for superconductors!). Paramagnetic: chi small positive, Curie law chi = C/T.'],
      ['Hysteresis Loop', 'Area of B-H loop = energy loss per unit volume per cycle. Transformer core (Soft Iron): low coercivity, narrow loop, high permeability. Permanent magnet (Steel/Alnico): high retentivity & coercivity.'],
    ],
    formulas: [
      'Magnetization Relations: B = mu0(H + I) = mu0(1 + chi)H = mu_r * mu0 * H  =>  mu_r = 1 + chi',
      'Vibration Magnetometer Time Period: T = 2*pi * sqrt(I / (M * B_H))',
      'Apparent Dip in Plane at Angle alpha to Magnetic Meridian: tan(delta_app) = tan(delta) / cos(alpha)',
      'Curie-Weiss Law (Ferromagnetic above T_c): chi = C / (T - T_c)',
    ],
    traps: [
      'TRAP 1: At magnetic poles, dip delta = 90 deg and B_H = 0; at magnetic equator, dip delta = 0 deg and B_V = 0.',
      'TRAP 2: Magnetic field lines ALWAYS form closed loops (Gauss Law for magnetism: Integral(B.dA) = 0).',
    ],
    pyqs: [
      ['PYQ Check 1', 'Two magnets of moments M1, M2 in sum & difference positions: (M1 + M2)/(M1 - M2) = (T_diff^2 + T_sum^2) / (T_diff^2 - T_sum^2).'],
      ['PYQ Check 2', 'Superconductor is a perfect diamagnet: B_inside = 0, mu_r = 0, chi = -1.'],
    ],
  },
  {
    file: 'PREPSKM_Phy_19_EMI_JEE.pdf',
    num: '19',
    title: 'Electromagnetic Induction',
    subject: 'Physics',
    classLabel: 'Class 12 JEE',
    weightage: 8,
    difficulty: 'Moderate',
    summary: 'Magnetic Flux, Faraday & Lenz Laws, Induced Charge (independent of time!), Eddy Currents, Motional EMF (Rod on Rails, Faraday Rotating Disc, Terminal Velocity), Induced Electric Field in Cylindrical B(t), Self & Mutual Inductance, LR Transients & LC Oscillations.',
    topics: [
      ['Faraday Law & Induced Charge', 'e = -dPhi/dt. Total induced charge q = |Delta Phi| / R — depends ONLY on total flux change and R, NEVER on how fast flux changes!'],
      ['Motional EMF & Rotating Disc', 'Straight rod: e = (v x B) . L_eff. Rod/Disc rotating at omega in perpendicular B: e = (1/2) B * omega * L^2.'],
      ['Non-Conservative Induced Electric Field', 'Integral(E_ind . dl) = -dPhi/dt. For cylindrical B(t) region of radius R: E_in = (r/2)|dB/dt|, E_out = (R^2 / 2r)|dB/dt|.'],
      ['Inductance, LR Circuits & LC Oscillations', 'Solenoid: L = mu0 * n^2 * A * l. Mutual: M <= sqrt(L1 L2). LR current growth: i(t) = (V/R)(1 - e^(-t*R/L)). LC frequency: omega = 1/sqrt(LC).'],
    ],
    formulas: [
      'Motional EMF Terminal Velocity of Sliding Rod on Inclined Rails: v_T = m*g*R*sin(theta) / (B^2 * L^2 * cos^2(theta))',
      'Magnetic Energy Stored in Inductor: U = (1/2) L I^2   |   Energy Density: u_B = B^2 / (2 * mu0)',
      'Series Coupled Inductors: L_eq = L1 + L2 +/- 2M   (depending on aiding or opposing flux)',
      'Two Coaxial Loops (R >> r): M = mu0 * pi * r^2 / (2 * R)',
    ],
    traps: [
      'TRAP 1: At t = 0+ (just after closing switch), an inductor with zero initial current acts as an OPEN CIRCUIT; at t = infinity (steady state), ideal inductor acts as a SHORT CIRCUIT (zero voltage drop)!',
      'TRAP 2: Never confuse induced charge q = Delta Phi / R (time-independent) with heat dissipated H = Integral(e^2/R dt) (faster change => MORE heat!).',
    ],
    pyqs: [
      ['PYQ Check 1', 'In a rod of length L moving in uniform B, EMF depends only on component of L_eff perpendicular to both v and B.'],
      ['PYQ Check 2', 'In LC oscillations, q(t) = q_max cos(omega*t) and I_max = omega * q_max = q_max / sqrt(LC).'],
    ],
  },
  {
    file: 'PREPSKM_Phy_20_AC_Circuits_JEE.pdf',
    num: '20',
    title: 'Alternating Current',
    subject: 'Physics',
    classLabel: 'Class 12 JEE',
    weightage: 4,
    difficulty: 'Easy',
    summary: 'Average & RMS Values of AC Waveforms, Pure R-L-C Circuits (CIVIL Trick), Series LCR Phasors & Impedance, Power Factor & Wattless Current, Choke Coil, Resonance, Bandwidth & Q-Factor, and Ideal/Real Transformers.',
    topics: [
      ['RMS & Average Values', 'Sinusoid: I_rms = I0/sqrt(2), I_avg(half cycle) = 2*I0/pi. Composite wave I = I1 + I2 sin(wt) + I3 cos(wt) => I_rms = sqrt(I1^2 + I2^2/2 + I3^2/2).'],
      ['Series LCR & Phasors (CIVIL)', 'In C, I leads V by 90 deg; in L, V leads I by 90 deg. Impedance Z = sqrt(R^2 + (X_L - X_C)^2), tan(phi) = (X_L - X_C)/R.'],
      ['Resonance & Q-Factor', 'At resonance X_L = X_C => omega_0 = 1/sqrt(LC), Z_min = R, cos(phi) = 1. Voltage across L or C can exceed source voltage: V_L = V_C = Q * V_source!'],
      ['Power & Transformers', 'P_avg = V_rms * I_rms * cos(phi) = I_rms^2 * R. Transformer: V_s/V_p = N_s/N_p = I_p/I_s (ideal). Step-up reduces transmission I^2 R line loss.'],
    ],
    formulas: [
      'Quality Factor: Q = omega_0 * L / R = 1 / (omega_0 * C * R) = (1/R) * sqrt(L / C) = omega_0 / (Delta omega)',
      'Half-Power Bandwidth: Delta omega = omega_2 - omega_1 = R / L   |   omega_0 = sqrt(omega_1 * omega_2)',
      'Wattless Current Component: I_wattless = I_rms * sin(phi)',
      'AC Meter Readings: All standard AC ammeters & voltmeters ALWAYS read RMS values!',
    ],
    traps: [
      'TRAP 1: In series LCR, V_source != V_R + V_L + V_C! Always use vector sum: V_source = sqrt(V_R^2 + (V_L - V_C)^2).',
      'TRAP 2: Transformers NEVER work on DC because dPhi/dt = 0 after steady state (primary coil may burn out!).',
    ],
    pyqs: [
      ['PYQ Check 1', 'Half-wave rectified sinusoid has V_rms = V0 / 2 and V_avg = V0 / pi; full-wave rectified has V_rms = V0/sqrt(2) and V_avg = 2V0/pi.'],
      ['PYQ Check 2', 'Inserting an iron core into an inductor in series with a bulb increases L => increases X_L => bulb dims!'],
    ],
  },
  {
    file: 'PREPSKM_Phy_21_EM_Waves_JEE.pdf',
    num: '21',
    title: 'Electromagnetic Waves',
    subject: 'Physics',
    classLabel: 'Class 12 JEE',
    weightage: 4,
    difficulty: 'Easy',
    summary: 'Displacement Current & Maxwell 4 Equations, Plane EM Wave Structure (E x B direction), Speed & Refractive Index, Equal Energy Density, Poynting Vector, Radiation Pressure & Complete EM Spectrum Master Table.',
    topics: [
      ['Displacement Current', 'I_d = eps0 * (dPhi_E / dt). Inside charging capacitor, I_d between plates equals conduction current I_c in wires, maintaining continuity of Ampere-Maxwell law.'],
      ['Plane EM Wave Properties', 'E, B, and propagation direction k_hat are mutually perpendicular: (E_hat x B_hat) = k_hat. E and B oscillate IN PHASE! E0 / B0 = c (or v in medium).'],
      ['Energy Density & Intensity', 'Average electric energy density = average magnetic energy density: <u_E> = <u_B> = (1/4) eps0 E0^2 = (1/4) B0^2/mu0. Total <u> = (1/2) eps0 E0^2.'],
      ['EM Spectrum Order (Decreasing lambda)', 'Radio > Microwave > Infrared > Visible (700-400nm) > UV > X-Rays > Gamma Rays.'],
    ],
    formulas: [
      'Speed in Vacuum: c = 1 / sqrt(mu0 * eps0)   |   Medium Refractive Index: n = c / v = sqrt(mu_r * eps_r)',
      'Intensity & Poynting Vector: S = (E x B) / mu0   |   I = <S> = c * <u> = (1/2) * eps0 * c * E0^2 = E_rms^2 / (mu0 * c)',
      'Radiation Pressure (Normal Incidence): Absorbing P = I / c  |  Perfectly Reflecting P = 2*I / c',
      'General Reflection Coeff R: P_rad = (1 + R) * I * cos^2(theta) / c',
    ],
    traps: [
      'TRAP 1: E and B in a plane EM wave are IN PHASE (phase diff = 0, NOT 90 deg!) — they reach max and zero simultaneously.',
      'TRAP 2: Remember wave speed = omega / k, and direction sign: sin(kx - wt) travels along +x; sin(kx + wt) travels along -x.',
    ],
    pyqs: [
      ['PYQ Check 1', 'If E = E0 sin(kz - wt) j_hat (propagating along +z), then B must be along -i_hat so that (j_hat x -i_hat) = +k_hat!'],
      ['PYQ Check 2', 'Microwaves are used in RADAR & ovens; Infrared in greenhouse effect & remotes; UV in LASIK & water purifiers.'],
    ],
  },
  {
    file: 'PREPSKM_Phy_22_Ray_Optics_JEE.pdf',
    num: '22',
    title: 'Ray Optics & Optical Instruments',
    subject: 'Physics',
    classLabel: 'Class 12 JEE',
    weightage: 8,
    difficulty: 'Moderate',
    summary: 'Plane & Spherical Mirrors, Snell Law, Slab Apparent Shift, Total Internal Reflection & Circle of Illuminance, Spherical Refraction, Lens Maker Formula, Silvered Lens, Displacement Method, Prism & Dispersion, Microscopes, Telescopes & Eye Defects.',
    topics: [
      ['Mirrors & Velocity of Image', '1/v + 1/u = 1/f; m = -v/u = f/(f-u). Along principal axis: v_I,M = -m^2 * v_O,M. Newton formula: x1 * x2 = f^2.'],
      ['Refraction, Slab & TIR', 'Slab normal shift = t(1 - 1/n). Critical angle sin(C) = n_rarer / n_denser. Underwater fish sees world in cone of radius R = h / sqrt(n^2 - 1).'],
      ['Lenses & Silvered Lens', '1/f = (n_lens/n_med - 1)(1/R1 - 1/R2). Power of silvered lens (equivalent mirror): 1/F_eq = 1/f_mirror - 2/f_lens (use sign convention!).'],
      ['Prism & Optical Instruments', 'delta = i + e - A; r1 + r2 = A. At min deviation: i = e, r = A/2, n = sin((A + d_m)/2) / sin(A/2). Grazing/No-emergence: A > 2C.'],
    ],
    formulas: [
      'Refraction at Spherical Surface: n2/v - n1/u = (n2 - n1)/R',
      'Two Thin Lenses Separated by d: 1/F = 1/f1 + 1/f2 - d/(f1*f2)',
      'Bessel Displacement Method (screen distance D > 4f): f = (D^2 - d^2) / (4D)  |  O = sqrt(I1 * I2)',
      'Compound Microscope: M = -(L/f_o)*(D/f_e) [relaxed]  |  Astronomical Telescope: M = -f_o/f_e, L = f_o + f_e',
    ],
    traps: [
      'TRAP 1: Cutting a lens ALONG principal axis does NOT change focal length f (only reduces image brightness); cutting PERPENDICULAR to axis doubles f (2f for symmetric biconvex)!',
      'TRAP 2: If a glass lens (n=1.5) is immersed in liquid of n=1.6, a convex lens behaves as a DIVERGING lens!',
    ],
    pyqs: [
      ['PYQ Check 1', 'Achromatic doublet (zero chromatic aberration): omega1/f1 + omega2/f2 = 0.'],
      ['PYQ Check 2', 'Plane mirror rotated by theta rotates reflected ray by 2*theta; two mirrors at angle theta give N = 360/theta - 1 images (even) or check symmetry.'],
    ],
  },
  {
    file: 'PREPSKM_Phy_23_Wave_Optics_JEE.pdf',
    num: '23',
    title: 'Wave Optics',
    subject: 'Physics',
    classLabel: 'Class 12 JEE',
    weightage: 8,
    difficulty: 'Moderate',
    summary: 'Huygens Wavefronts, Coherent Interference, Doppler Shift in Light, YDSE Core (Fringe Width, Missing Wavelengths, Slab Shift, Oblique Incidence), Thin Film Interference, Lloyd Mirror, Single-Slit Diffraction, Resolving Power & Polarization (Malus, Brewster).',
    topics: [
      ['Coherent Interference', 'I = I1 + I2 + 2*sqrt(I1*I2)*cos(phi). For identical sources I0: I = 4 I0 cos^2(phi/2). Visibility V = (I_max - I_min)/(I_max + I_min).'],
      ['YDSE & Variations', 'Fringe width beta = lambda*D/d. Immersed in liquid n: beta\' = beta/n. Thin slab (t, mu) before one slit shifts central max towards that slit by (mu-1)t*D/d.'],
      ['Single-Slit Diffraction', 'Minima at a*sin(theta) = n*lambda (opposite of YDSE!). Central max width = 2*lambda*D/a (double the secondary maxima width!).'],
      ['Polarization (Malus & Brewster)', 'Unpolarized light through polarizer -> I0/2. Malus Law: I = I_max * cos^2(theta). Brewster angle: tan(i_p) = n (reflected & refracted rays are at 90 deg!).'],
    ],
    formulas: [
      'YDSE Path Difference: dx = d*sin(theta) ~ y*d/D   |   Missing Wavelengths opposite slit: lambda = d^2 / ((2n-1)D)',
      'Thin Film (air-film-air, reflection): 2*mu*t*cos(r) = (n - 1/2)lambda [Bright]  (extra lambda/2 shift at denser reflection!)',
      'Rayleigh Resolving Limit: Telescope d_theta = 1.22*lambda / D  |  Microscope d_min = lambda / (2*mu*sin(beta))',
      'Relativistic Light Doppler (v << c): d_lambda / lambda = +/- v_rel / c',
    ],
    traps: [
      'TRAP 1: In YDSE with white light, central fringe is WHITE, closest fringe is VIOLET, farthest is RED.',
      'TRAP 2: When passing unpolarized light I0 through N polarizers each rotated by theta: FIRST polarizer halves I0 -> I0/2, then each subsequent one multiplies by cos^2(theta)!',
    ],
    pyqs: [
      ['PYQ Check 1', 'Number of fringes shifted by slab (t, mu): N = (mu - 1)t / lambda (independent of D and d!).'],
      ['PYQ Check 2', 'In Lloyd Mirror, direct and reflected beams interfere with extra pi phase shift, so central fringe at mirror edge is DARK!'],
    ],
  },
  {
    file: 'PREPSKM_Phy_24_Dual_Nature_JEE.pdf',
    num: '24',
    title: 'Dual Nature of Radiation & Matter',
    subject: 'Physics',
    classLabel: 'Class 12 JEE',
    weightage: 4,
    difficulty: 'Easy',
    summary: 'Photon Theory, Einstein Photoelectric Equation & Master Graphs (I vs V, V0 vs f), Radiation Force on Flat & 3D Bodies (Sphere/Cone), de Broglie Matter Waves, Davisson-Germer Experiment & Heisenberg Uncertainty.',
    topics: [
      ['Photon Theory', 'E = hc/lambda = 12400 eV-A / lambda(A). Momentum p = h/lambda = E/c. Photon count per sec n = P*lambda / (hc).'],
      ['Photoelectric Effect Laws', 'K_max = e*V0 = h*f - phi0 = hc/lambda - hc/lambda0. Stopping potential V0 depends ONLY on frequency f (NOT intensity!). Saturation current depends on intensity.'],
      ['Radiation Force on 3D Objects', 'For parallel beam of intensity I hitting sphere of radius R: Force = (I/c) * (pi R^2) — SAME for both completely absorbing AND completely reflecting sphere!'],
      ['de Broglie Matter Waves', 'lambda = h / p = h / sqrt(2*m*K). Electron accelerated through V volts: lambda_e = 12.27 / sqrt(V) Angstrom.'],
    ],
    formulas: [
      'Einstein Equation Graph (V0 vs f): Slope = h/e (universal for ALL metals!)  |  y-intercept = -phi0/e',
      'de Broglie Wavelengths: Electron 12.27/sqrt(V) A | Proton 0.286/sqrt(V) A | Alpha 0.101/sqrt(V) A',
      'Thermal Neutron de Broglie: lambda = h / sqrt(3 * m * k_B * T) ~ 30.8 / sqrt(T) A',
      'Heisenberg Uncertainty: dx * dp >= h / (4*pi)   |   dE * dt >= h / (4*pi)',
    ],
    traps: [
      'TRAP 1: Changing intensity at constant frequency changes saturation current, NOT K_max or stopping potential V0.',
      'TRAP 2: For a sphere in a parallel light beam, reflection redirects momentum symmetrically so F_reflect = F_absorb = I * pi R^2 / c (classic JEE Advanced result!).',
    ],
    pyqs: [
      ['PYQ Check 1', 'If an electron and a photon have the SAME de Broglie wavelength lambda, they have the SAME momentum p = h/lambda!'],
      ['PYQ Check 2', 'Ratio of photocurrent to incident photon flux is Quantum Efficiency (eta = n_e / n_photon).'],
    ],
  },
  {
    file: 'PREPSKM_Phy_25_Atoms_XRays_JEE.pdf',
    num: '25',
    title: 'Atoms & X-Rays',
    subject: 'Physics',
    classLabel: 'Class 12 JEE',
    weightage: 4,
    difficulty: 'Easy',
    summary: 'Rutherford Scattering & Distance of Closest Approach, Bohr Model (Hydrogen-like Species & Reduced Mass), Hydrogen Spectral Series, Atomic Recoil, Continuous & Characteristic X-Rays (Coolidge Tube), Moseley Law & Bragg Diffraction.',
    topics: [
      ['Rutherford Scattering', 'Distance of closest approach r0 = 2 k Z e^2 / K_alpha. Impact parameter b = (k Z e^2 / K) * cot(theta / 2).'],
      ['Bohr Model Scaling (H-like Z)', 'r_n = 0.529 * n^2 / Z A; v_n = (c/137) * Z/n; E_n = -13.6 * Z^2 / n^2 eV. Note: K = -E, U = 2E.'],
      ['Spectral Series & Recoil', 'Lyman (n1=1, UV), Balmer (n1=2, Visible), Paschen (3, IR), Brackett (4), Pfund (5). Max lines from n -> 1 in a sample = n(n-1)/2.'],
      ['X-Rays, Moseley & Bragg Law', 'Cutoff wavelength lambda_min = 12400 / V(volts) A (depends ONLY on tube voltage!). Moseley Law: sqrt(f) = a(Z - b) (b=1 for K_alpha).'],
    ],
    formulas: [
      'Rydberg Formula: 1/lambda = R * Z^2 * (1/n1^2 - 1/n2^2),   where R = 1.097 x 10^7 m^-1',
      'Moseley K_alpha Wavelength: 1/lambda_Ka = (3/4) * R * (Z - 1)^2',
      'Bragg X-Ray Diffraction: 2 * d * sin(theta) = n * lambda',
      'Recoil KE of Emitting Atom: K_recoil = E_photon^2 / (2 * M * c^2)',
    ],
    traps: [
      'TRAP 1: Changing filament current in Coolidge tube changes X-ray INTENSITY, NOT lambda_min! Changing accelerating voltage V changes lambda_min (NOT characteristic wavelengths)!',
      'TRAP 2: For a SINGLE hydrogen atom at state n=4, max emitted photons is (n - 1) = 3, whereas for a LARGE SAMPLE it is n(n-1)/2 = 6!',
    ],
    pyqs: [
      ['PYQ Check 1', 'Positronium (e+ and e-) has reduced mass mu = m_e/2, so all energy levels are HALVED (E1 = -6.8 eV) and Bohr radius is DOUBLED!'],
      ['PYQ Check 2', 'First excitation energy of H is 10.2 eV; He+ (Z=2) n=4 -> n=2 transition has exact same wavelength as H n=2 -> n=1!'],
    ],
  },
  {
    file: 'PREPSKM_Phy_26_Nuclei_Radioactivity_JEE.pdf',
    num: '26',
    title: 'Nuclei & Radioactivity',
    subject: 'Physics',
    classLabel: 'Class 12 JEE',
    weightage: 4,
    difficulty: 'Easy',
    summary: 'Nuclear Radius & Constant Density, Mass Defect & Binding Energy Curve, Q-Value & Alpha/Beta/Gamma Decay, Threshold KE, Radioactive Decay Law (Half-Life, Mean Life, Carbon Dating), Parallel & Series Decay, Constant Production & Fission-Fusion.',
    topics: [
      ['Nuclear Size & Binding Energy', 'R = R0 * A^(1/3) (R0 ~ 1.2 fm). Nuclear density is INDEPENDENT of A (~ 2.3 x 10^17 kg/m^3). 1 amu = 931.5 MeV/c^2.'],
      ['Q-Value & Alpha/Beta Decay', 'Q = (m_reactants - m_products) c^2 = BE_products - BE_reactants. In alpha decay at rest: K_alpha = [(A - 4)/A] * Q.'],
      ['Radioactive Decay Law', 'N(t) = N0 e^(-lambda*t). Activity A = lambda*N. Half-life T_1/2 = ln(2)/lambda = 0.693 * tau_mean.'],
      ['Parallel Decay & Constant Production', 'Parallel decay: lambda_eff = lambda1 + lambda2 => 1/T_eff = 1/T1 + 1/T2. Constant production rate R: N(t) = (R/lambda)(1 - e^(-lambda*t)).'],
    ],
    formulas: [
      'Alpha Decay: (A, Z) -> (A-4, Z-2) + He4  |  Beta- : n -> p + e- + anti-nu  |  Beta+ : p -> n + e+ + nu',
      'Q-Value Using Atomic Masses (M): Beta- : Q = [M(P) - M(D)]c^2  |  Beta+ : Q = [M(P) - M(D) - 2*m_e]c^2',
      'Series Decay A -> B -> C (initially N_B=0): B peaks at t_max = ln(lambda_A / lambda_B) / (lambda_A - lambda_B)',
      'Probability of Survival = e^(-lambda*t)  |  Probability of Decay = 1 - e^(-lambda*t)',
    ],
    traps: [
      'TRAP 1: In Beta+ decay using ATOMIC masses, do NOT forget to subtract 2*m_e*c^2 (= 1.022 MeV)! In K-capture, 2*m_e is NOT subtracted.',
      'TRAP 2: Beta- spectrum is CONTINUOUS because energy is shared randomly between electron and antineutrino; Alpha & Gamma spectra are DISCRETE.',
    ],
    pyqs: [
      ['PYQ Check 1', 'In nuclear reaction, remember Q = BE_products - BE_reactants (products MINUS reactants for Binding Energy, opposite of mass!).'],
      ['PYQ Check 2', 'Fraction remaining after n half-lives is (1/2)^n; time between 90% and 99% decay equals T_90%.'],
    ],
  },
  {
    file: 'PREPSKM_Phy_27_Semiconductors_Logic_Gates_JEE.pdf',
    num: '27',
    title: 'Semiconductors & Logic Gates',
    subject: 'Physics',
    classLabel: 'Class 12 JEE',
    weightage: 4,
    difficulty: 'Easy',
    summary: 'Energy Bands, Intrinsic & Extrinsic Semiconductors (Mass Action Law), p-n Junction Diode, Half & Full Wave Rectifiers, Zener Voltage Regulator, Photodiode/LED/Solar Cell, BJT CE Amplifier, Boolean Algebra, De Morgan Laws & Universal Gates.',
    topics: [
      ['Intrinsic & Extrinsic Semiconductors', 'Mass Action Law: n_e * n_h = n_i^2. n-type (pentavalent P, As, Sb): n_e >> n_h. p-type (trivalent B, Al, In): n_h >> n_e. Both remain electrically NEUTRAL!'],
      ['p-n Junction & Rectifiers', 'Forward bias reduces barrier & depletion width; reverse bias increases both. Ripple freq: HWR = f, FWR = 2f.'],
      ['Zener Diode Regulator', 'Operates in reverse breakdown maintaining constant V_Z across load R_L. Always check V_open = V_in * R_L / (R_s + R_L) > V_Z first!'],
      ['Logic Gates & De Morgan Theorems', 'NAND & NOR are Universal Gates. De Morgan: ~(A + B) = ~A . ~B; ~(A . B) = ~A + ~B. XOR = ~A.B + A.~B.'],
    ],
    formulas: [
      'Conductivity of Semiconductor: sigma = e * (n_e * mu_e + n_h * mu_h)',
      'Zener Currents: I_series = (V_in - V_Z) / R_s   |   I_load = V_Z / R_L   |   I_zener = I_series - I_load',
      'BJT Transistor Relations: I_E = I_B + I_C  |  alpha = I_C / I_E  |  beta = I_C / I_B = alpha / (1 - alpha)',
      'CE Amplifier: Voltage Gain A_v = -beta * (R_out / R_in)  |  Power Gain = beta * |A_v|  |  Phase Shift = 180 deg',
    ],
    traps: [
      'TRAP 1: In a Zener regulator problem, FIRST check if open-circuit load voltage V_in * R_L / (R_s + R_L) exceeds V_Z. If NOT, Zener is OFF (I_Z = 0)!',
      'TRAP 2: Photodiodes operate in REVERSE bias (fractional change in minority current is huge), LEDs in FORWARD bias, Solar cells with NO external bias.',
    ],
    pyqs: [
      ['PYQ Check 1', 'Ideal silicon diode barrier voltage = 0.7 V (Ge = 0.3 V). Remember to check forward/reverse bias of each diode in multi-diode circuits.'],
      ['PYQ Check 2', 'To convert NAND gate into NOT gate, short both inputs together. Two NOTs + NAND = OR gate (De Morgan!).'],
    ],
  },
];

const CHEMISTRY_DOCS = [
  {
    file: 'PREPSKM_Chem_01_Mole_Concept_JEE.pdf',
    num: '01',
    title: 'Mole Concept & Stoichiometry',
    subject: 'Chemistry',
    classLabel: 'Class 11 JEE',
    weightage: 4,
    difficulty: 'Easy',
    summary: 'Mole Bridge, Atomic Mass Units, Laws of Chemical Combination, Empirical Formula, Limiting Reagent & % Yield, POAC (Principle of Atom Conservation), Concentration Interconversions, Volume Strength of H2O2, Oleum Labelling & Eudiometry.',
    topics: [
      ['Mole Bridge & Limiting Reagent', 'n = mass/M = N/N_A = V(STP)/22.4 L (or 22.7 L at 1 bar). Limiting reagent has minimum (moles / stoichiometric coeff).'],
      ['POAC Shortcut', 'Conserve atoms of an element without balancing the entire reaction: e.g. for KClO3 -> KCl + O2, moles of O atoms: 3*n(KClO3) = 2*n(O2).'],
      ['Concentration Terms', 'Molarity (M) & Normality (N) are temperature-DEPENDENT; Molality (m), Mole Fraction (X), %w/w are temperature-INDEPENDENT.'],
      ['H2O2 Volume Strength & Oleum', '100 g oleum labelled (100 + x)% contains x g water needed to convert free SO3 to H2SO4 => % free SO3 = (80/18) * x.'],
    ],
    formulas: [
      'Molarity-Molality Relation: m = (1000 * M) / (1000 * d - M * M_solute)   [d in g/mL]',
      'Molarity from %w/w & Density d: M = (10 * %w/w * d) / M_solute',
      'H2O2 Volume Strength (V): M = V / 11.2 (at 1 atm STP)  |  N = V / 5.6  |  %w/v = (17/56) * V',
      'Hydrocarbon Eudiometry: C_x H_y + (x + y/4) O2 -> x CO2 + (y/2) H2O(l)   |   Volume Contraction = 1 + y/4',
    ],
    traps: [
      'TRAP 1: In eudiometry, KOH absorbs CO2 (and SO2), alkaline pyrogallol absorbs O2, turpentine oil absorbs O3, and H2O(l) has negligible volume at room temp!',
      'TRAP 2: Average molar mass of a gas mixture = Sum(n_i * M_i) / Sum(n_i) (molar average, NOT mass average!).',
    ],
    pyqs: [
      ['PYQ Check 1', '20 V H2O2 has Molarity = 20/11.2 = 1.785 M (or 20/11.35 at 1 bar STP) and Normality = 20/5.6 = 3.57 N.'],
      ['PYQ Check 2', '109% Oleum has x = 9 g H2O => % free SO3 = (80/18) * 9 = 40% free SO3 and 60% H2SO4.'],
    ],
  },
  {
    file: 'PREPSKM_Chem_02_Atomic_Structure_JEE.pdf',
    num: '02',
    title: 'Atomic Structure',
    subject: 'Chemistry',
    classLabel: 'Class 11 JEE',
    weightage: 8,
    difficulty: 'Moderate',
    summary: 'Subatomic Particles, Planck Quantum Theory & Photoelectric Effect, Bohr Model & Hydrogen Spectrum, de Broglie & Heisenberg Principle, Quantum Numbers, Radial & Angular Nodes, Wavefunction Graphs & Electronic Configuration Exceptions.',
    topics: [
      ['Bohr Model & H-Spectrum', 'r_n = 0.529 n^2/Z A; E_n = -13.6 Z^2/n^2 eV; mvr = nh/(2*pi). Number of waves in nth Bohr orbit = n!'],
      ['Quantum Numbers (n, l, m, s)', 'l = 0..n-1; m = -l..+l; s = +/- 1/2. Orbital angular momentum = sqrt(l(l+1)) * h/(2*pi). Spin-only magnetic moment = sqrt(n(n+2)) BM.'],
      ['Nodes & Wavefunction Graphs', 'Total nodes = n - 1. Radial (spherical) nodes = n - l - 1. Angular (planar/conical) nodes = l.'],
      ['Config Exceptions (d5 / d10 Stability)', 'Cr(24): [Ar] 3d5 4s1; Cu(29): [Ar] 3d10 4s1; Mo(42), Ag(47), Pd(46: [Kr] 4d10 5s0!).'],
    ],
    formulas: [
      'Radial Probability Distribution: 4 * pi * r^2 * R(r)^2 dr  (always 0 at r = 0! For 1s, peak is at r = a0 = 0.529 A)',
      'Radial Wavefunction R_nl(r) vs r: Starts non-zero ONLY for s-orbitals (l=0); starts at 0 for p, d, f orbitals!',
      'Number of Orbitals in Shell n = n^2  |  Max Electrons = 2 n^2  |  Orbitals in Subshell = 2l + 1',
      'Heisenberg: dx * dv >= h / (4 * pi * m)',
    ],
    traps: [
      'TRAP 1: d_z2 orbital has NO nodal planes — it has TWO nodal CONES (angular nodes = l = 2)!',
      'TRAP 2: For hydrogen (1-electron) atom, orbital energy depends ONLY on n (2s = 2p, 3s = 3p = 3d); for multi-electron atoms, use (n + l) rule!',
    ],
    pyqs: [
      ['PYQ Check 1', 'Number of radial nodes in 3p = 3 - 1 - 1 = 1; in 4d = 4 - 2 - 1 = 1; in 2s = 1.'],
      ['PYQ Check 2', 'Exchange energy stabilizes half-filled (d5: 10 exchanges) and fully filled (d10: 20 exchanges) subshells.'],
    ],
  },
  {
    file: 'PREPSKM_Chem_03_Thermodynamics_JEE.pdf',
    num: '03',
    title: 'Thermodynamics & Thermochemistry',
    subject: 'Chemistry',
    classLabel: 'Class 11 JEE',
    weightage: 8,
    difficulty: 'Moderate',
    summary: 'State vs Path Functions, IUPAC Sign Convention (dU = q + w), Reversible vs Irreversible Work, Enthalpy, Entropy & Second/Third Law, Gibbs Energy Spontaneity, Hess Law, Kirchhoff Equation, Bond Enthalpy, Resonance Energy & Born-Haber Cycle.',
    topics: [
      ['IUPAC Sign Convention (Chemistry!)', 'dU = q + w, where w = -Integral(P_ext dV). Expansion => w < 0; Compression => w > 0.'],
      ['Reversible vs Irreversible Expansion', 'For same V1 -> V2: |W_rev| > |W_irrev|. In adiabatic expansion to same P2: T_final(irrev) > T_final(rev) and |W_rev| > |W_irrev|.'],
      ['Entropy & Gibbs Free Energy', 'dG = dH - T dS (at const T, P). Spontaneous if dG < 0. dS_total = dS_sys + dS_surr > 0.'],
      ['Thermochemistry & Bond Enthalpy', 'dH_rxn = Sum(dH_f products) - Sum(dH_f reactants) = Sum(BE_reactants) - Sum(BE_products) = Sum(dH_comb reactants) - Sum(dH_comb products).'],
    ],
    formulas: [
      'dH = dU + d(n_g) * R * T   (remember: only GASEOUS moles in delta n_g!)',
      'Entropy of Ideal Gas: dS = n*Cv*ln(T2/T1) + n*R*ln(V2/V1) = n*Cp*ln(T2/T1) - n*R*ln(P2/P1)',
      'Kirchhoff Equation: dH2 - dH1 = Delta(Cp) * (T2 - T1)',
      'Resonance Energy = dH_f(experimental) - dH_f(calculated) = dH_hyd(obs) - dH_hyd(calc)  (usually negative / stabilizing)',
    ],
    traps: [
      'TRAP 1: Bond Enthalpy formula is (REACTANTS - PRODUCTS), opposite of Enthalpy of Formation (PRODUCTS - REACTANTS)!',
      'TRAP 2: Standard enthalpy of formation dH_f of elements in reference state is 0: C(graphite)=0 (NOT diamond!), S(rhombic)=0, P(white)=0, Br2(l)=0, I2(s)=0!',
    ],
    pyqs: [
      ['PYQ Check 1', 'Enthalpy of neutralization of strong acid + strong base = -57.3 kJ/mol (-13.7 kcal/mol). Exception: HF gives MORE exothermic (~ -68.6 kJ/mol) due to high hydration energy of F-!'],
      ['PYQ Check 2', 'In adiabatic irreversible expansion against constant P_ext: n*Cv*(T2 - T1) = -P_ext * (V2 - V1).'],
    ],
  },
  {
    file: 'PREPSKM_Chem_04_Chemical_Equilibrium_JEE.pdf',
    num: '04',
    title: 'Chemical Equilibrium',
    subject: 'Chemistry',
    classLabel: 'Class 11 JEE',
    weightage: 4,
    difficulty: 'Easy',
    summary: 'Law of Mass Action, Kp/Kc/Kx Relations, Reaction Quotient Q, Degree of Dissociation (alpha) & Vapour Density Formula, Simultaneous Equilibrium, Le Chatelier Principle, van t Hoff Equation & Thermodynamics of Equilibrium.',
    topics: [
      ['Equilibrium Constants (Kp, Kc, Kx)', 'Kp = Kc * (RT)^(dn_g) = Kx * P^(dn_g). Pure solids & liquids have activity = 1 (excluded from K expression!).'],
      ['Vapour Density & Degree of Dissociation', 'For A(g) -> n B(g): alpha = (D - d) / [(n - 1) * d], where D = M_theo/2 and d = M_obs/2.'],
      ['Le Chatelier Principle', 'Inert gas at CONSTANT V: NO shift! Inert gas at CONSTANT P: shifts towards MORE gaseous moles (same as reducing P).'],
      ['Temperature Effect (van t Hoff)', 'K depends ONLY on Temperature! Endothermic (dH > 0): increasing T increases K; Exothermic (dH < 0): increasing T decreases K.'],
    ],
    formulas: [
      'Gibbs & Equilibrium: dG = dG0 + RT ln(Q)   |   At equilibrium: dG0 = -RT ln(K) = -2.303 RT log10(K)',
      'van t Hoff Equation: ln(K2 / K1) = (dH0 / R) * (1/T1 - 1/T2)',
      'Algebra of K: Reverse -> 1/K  |  Multiply eq by m -> K^m  |  Add two eqs -> K1 * K2',
      'Clausius-Clapeyron (Liquid-Vapour Eqm): ln(P2 / P1) = (dH_vap / R) * (1/T1 - 1/T2)',
    ],
    traps: [
      'TRAP 1: Adding a catalyst speeds up forward and backward rates equally — it NEVER changes K or equilibrium composition!',
      'TRAP 2: Adding more pure SOLID reactant (e.g. CaCO3 in CaCO3(s) <-> CaO(s) + CO2(g)) causes ZERO shift in P_CO2!',
    ],
    pyqs: [
      ['PYQ Check 1', 'For PCl5(g) <-> PCl3(g) + Cl2(g), Kp = alpha^2 * P / (1 - alpha^2). For N2O4 <-> 2 NO2, Kp = 4 alpha^2 P / (1 - alpha^2).'],
      ['PYQ Check 2', 'In simultaneous equilibria sharing a common gas species, use the SAME total equilibrium concentration/pressure of that species in both K expressions!'],
    ],
  },
  {
    file: 'PREPSKM_Chem_05_Ionic_Equilibrium_JEE.pdf',
    num: '05',
    title: 'Ionic Equilibrium',
    subject: 'Chemistry',
    classLabel: 'Class 11 JEE',
    weightage: 8,
    difficulty: 'Tough',
    summary: 'Ostwald Dilution Law, Ultra-Dilute Acid/Base pH, Acid/Base Mixtures & Polyprotic Acids, Amphiprotic Salts, Salt Hydrolysis (All 4 Types), Buffer Solutions (Henderson-Hasselbalch), Acid-Base Titration Curves, Indicators & Solubility Product Ksp.',
    topics: [
      ['Weak Acids, Ostwald & Ultra-Dilute pH', 'Ka = c*alpha^2 / (1 - alpha). For 10^-8 M HCl: include water H+ (10^-7 M) => [H+] ~ 1.05e-7 => pH = 6.98 (NEVER 8!).'],
      ['Salt Hydrolysis (4 Cases)', 'WA+SB (basic): pH = 7 + 1/2(pKa + log c). SA+WB (acidic): pH = 7 - 1/2(pKb + log c). WA+WB: pH = 7 + 1/2(pKa - pKb) (independent of c!).'],
      ['Buffer Solutions', 'Acidic buffer: pH = pKa + log([Salt]/[Acid]). Max buffer capacity when [Salt] = [Acid] (pH = pKa).'],
      ['Solubility Product (Ksp)', 'For A_x B_y: Ksp = x^x * y^y * s^(x+y). Precipitation starts when Ionic Product Q_sp > K_sp. Common ion suppresses solubility!'],
    ],
    formulas: [
      'Conjugate Pair: Ka * Kb = Kw = 10^-14 (at 25 C)  |  pKa + pKb = pKw = 14',
      'Amphiprotic Ion (e.g. NaHCO3, NaH2PO4): pH = (pKa1 + pKa2) / 2  (independent of concentration!)',
      'Mixture of Two Weak Acids: [H+] = sqrt(Ka1*c1 + Ka2*c2)',
      'Indicator Colour Change Range: pH = pK_In +/- 1  (Phenolphthalein: 8.3-10; Methyl Orange: 3.1-4.4)',
    ],
    traps: [
      'TRAP 1: At 90 deg C, Kw ~ 10^-12, so neutral water has pH = 6 (NOT 7!). Water is still neutral because [H+] = [OH-]!',
      'TRAP 2: For weak acid + strong base titration, equivalence point pH > 7 => use Phenolphthalein (NOT Methyl Orange!).',
    ],
    pyqs: [
      ['PYQ Check 1', 'Diluting a buffer solution by 10x does NOT change its pH (ratio [Salt]/[Acid] stays constant), though buffer capacity drops.'],
      ['PYQ Check 2', 'Selective precipitation: the salt requiring LOWER concentration of added common ion precipitates FIRST.'],
    ],
  },
  {
    file: 'PREPSKM_Chem_06_Redox_Reactions_JEE.pdf',
    num: '06',
    title: 'Redox & Volumetric Analysis',
    subject: 'Chemistry',
    classLabel: 'Class 11 JEE',
    weightage: 4,
    difficulty: 'Moderate',
    summary: 'Oxidation Numbers & Structural Exceptions (CrO5, H2SO5, S4O6^2-, Fe3O4), Balancing Redox Reactions, n-Factor Master Table (Including Disproportionation), Double Indicator Titration (NaOH/Na2CO3/NaHCO3), Back Titration, Iodometry vs Iodimetry & Water Hardness.',
    topics: [
      ['Oxidation State Structural Exceptions', 'CrO5 (butterfly, 2 peroxy linkages): Cr = +6. H2SO5 (Caro acid): S = +6. H2S2O8 (Marshall acid): S = +6. S4O6^2-: two S are 0, two S are +5 (avg +2.5).'],
      ['n-Factor Master Rules', 'KMnO4: Acidic n=5 (Mn2+), Neutral/Weakly basic n=3 (MnO2), Strongly basic n=1 (MnO4^2-). K2Cr2O7 (acidic): n=6. Na2S2O3 -> S4O6^2-: n=1.'],
      ['Disproportionation n-Factor', '1 / n_total = 1 / n_ox + 1 / n_red. Example: P4 -> PH3 + H2PO2- gives n_ox = 4, n_red = 12 => n_total = 3.'],
      ['Double Indicator & Iodometry', 'Phenolphthalein detects NaOH + (1/2)Na2CO3; Methyl Orange detects remaining (1/2)Na2CO3 + NaHCO3. Iodometry: I- oxidized to I2, titrated with hypo (Na2S2O3).'],
    ],
    formulas: [
      'Law of Equivalence: n_1 * M_1 * V_1 = n_2 * M_2 * V_2   (Gram equivalents of ALL reacting species are equal!)',
      'Equivalent Weight: E = Molar Mass / n-factor',
      'Water Hardness (ppm CaCO3) = [Mass of CaCO3 eq (g) / Mass of Water (g)] * 10^6',
      'Latimer Diagram (combining half-cells): E3_0 = (n1 * E1_0 + n2 * E2_0) / (n1 + n2)',
    ],
    traps: [
      'TRAP 1: In Latimer diagrams, NEVER add E0 values directly! Always add dG0 = -nFE0 (weighted by electrons n)!',
      'TRAP 2: Bleaching powder Ca(OCl)Cl has two Cl atoms with oxidation states +1 and -1 (avg 0).',
    ],
    pyqs: [
      ['PYQ Check 1', 'FeC2O4 (ferrous oxalate) oxidized by KMnO4 in acid: Fe2+ -> Fe3+ (1e) AND C2O4^2- -> 2CO2 (2e), so total n-factor of FeC2O4 = 3!'],
      ['PYQ Check 2', 'In KMnO4 titration, NEVER use HCl to acidify (MnO4- oxidizes Cl- to Cl2!); use dilute H2SO4.'],
    ],
  },
  {
    file: 'PREPSKM_Chem_07_Solutions_JEE.pdf',
    num: '07',
    title: 'Solutions & Colligative Properties',
    subject: 'Chemistry',
    classLabel: 'Class 12 JEE',
    weightage: 8,
    difficulty: 'Easy',
    summary: 'Concentration Terms, Henry Law, Vapour Pressure & Raoult Law (Ideal vs Positive/Negative Deviations), Minimum & Maximum Boiling Azeotropes, All 4 Colligative Properties (RLVP, dTb, dTf, Osmotic Pressure) & van t Hoff Factor i.',
    topics: [
      ['Henry Law & Raoult Law', 'p = K_H * X_gas. Higher K_H => LOWER solubility of gas (K_H increases with T). Raoult: P_total = P_A0 X_A + P_B0 X_B.'],
      ['Ideal vs Non-Ideal & Azeotropes', 'Positive dev (dH_mix > 0, dV_mix > 0, e.g. Ethanol+Water): Minimum-boiling azeotrope. Negative dev (dH < 0, e.g. CHCl3+Acetone, HNO3+H2O): Maximum-boiling azeotrope.'],
      ['Four Colligative Properties', 'Depend ONLY on number of solute particles! Always include van t Hoff factor i: RLVP, dTb = i*Kb*m, dTf = i*Kf*m, pi = i*C*R*T.'],
      ['van t Hoff Factor (i)', 'Dissociation (into n ions): i = 1 + (n - 1)alpha. Association (n molecules -> 1): i = 1 - (1 - 1/n)alpha.'],
    ],
    formulas: [
      'Vapour Phase Composition (y_A): y_A = P_A / P_total  |  1/P_total = y_A/P_A0 + y_B/P_B0',
      'Exact RLVP Formula: (P0 - P_s) / P_s = i * n_solute / n_solvent',
      'Molal Constants from Thermodynamics: Kb = R * M_solv * Tb^2 / (1000 * dH_vap)  |  Kf = R * M_solv * Tf^2 / (1000 * dH_fus)',
      'Abnormal Molar Mass: i = M_normal / M_observed',
    ],
    traps: [
      'TRAP 1: Osmotic pressure is the BEST colligative property for polymers/proteins because it is measurable at room temp and gives large values even at tiny molarity!',
      'TRAP 2: Adding a non-volatile solute DECREASES freezing point and vapour pressure, while INCREASING boiling point and osmotic pressure.',
    ],
    pyqs: [
      ['PYQ Check 1', 'Benzoic acid or acetic acid in benzene dimerizes (n=2): for 100% dimerization, i = 0.5 and observed molar mass doubles!'],
      ['PYQ Check 2', 'Isotonic solutions at same temperature have equal (i * C).'],
    ],
  },
  {
    file: 'PREPSKM_Chem_08_Electrochemistry_JEE.pdf',
    num: '08',
    title: 'Electrochemistry',
    subject: 'Chemistry',
    classLabel: 'Class 12 JEE',
    weightage: 8,
    difficulty: 'Moderate',
    summary: 'Galvanic Cells, SHE & Intensive SRP Rule, Nernst Equation, Concentration Cells, Equilibrium Constant Kc, Electrolytic Conductance (kappa, Lambda_m), Kohlrausch Law & Conductometric Titrations, Faraday Laws of Electrolysis, Batteries & Corrosion.',
    topics: [
      ['Galvanic Cell & Nernst Equation', 'LOAN rule: Left Oxidation Anode Negative. E0_cell = E0_cathode(SRP) - E0_anode(SRP). E0 is INTENSIVE (never multiply by stoichiometry!).'],
      ['Conductance & Dilution', 'Specific conductance kappa = (1/R)*(l/A) DECREASES on dilution; Molar conductance Lambda_m = kappa * 1000 / M INCREASES on dilution!'],
      ['Kohlrausch Law', 'Lambda_m0(A_x B_y) = x * lambda0(A) + y * lambda0(B). Used to find alpha = Lambda_m / Lambda_m0 and Ksp of sparingly soluble salts!'],
      ['Faraday Laws & Electrolysis Products', 'W = (E * I * t) / 96500. In aqueous NaCl: H2 at cathode, Cl2 at anode (overpotential!). In dilute H2SO4: H2 at cathode, O2 at anode.'],
    ],
    formulas: [
      'Nernst Equation (298 K): E_cell = E0_cell - (0.0591 / n) * log10(Q)',
      'Gibbs & Equilibrium: dG0 = -n F E0_cell  |  log10(Kc) = n * E0_cell / 0.0591',
      'Debye-Huckel-Onsager (Strong Electrolyte): Lambda_m = Lambda_m0 - A * sqrt(C)',
      'Solubility of Sparingly Soluble Salt: S = (kappa_salt * 1000) / Lambda_m0',
    ],
    traps: [
      'TRAP 1: For weak electrolytes (CH3COOH), Lambda_m vs sqrt(C) curves sharply upwards near C -> 0 so you CANNOT extrapolate graphically — use Kohlrausch Law!',
      'TRAP 2: Hydrogen electrode potential: E(H+/H2) = -0.0591 * pH (at P_H2 = 1 bar).',
    ],
    pyqs: [
      ['PYQ Check 1', 'Lead storage battery (discharging): Pb(anode) + PbO2(cathode) + 2 H2SO4 -> 2 PbSO4 + 2 H2O (density of H2SO4 decreases!).'],
      ['PYQ Check 2', 'H2-O2 Fuel Cell: theoretical efficiency = dG / dH ~ 83%, pollution-free product H2O.'],
    ],
  },
  {
    file: 'PREPSKM_Chem_09_Chemical_Kinetics_JEE.pdf',
    num: '09',
    title: 'Chemical Kinetics',
    subject: 'Chemistry',
    classLabel: 'Class 12 JEE',
    weightage: 8,
    difficulty: 'Easy',
    summary: 'Rate of Reaction, Order vs Molecularity, Units of k, Integrated Rate Laws (0th, 1st, 2nd, nth Order) & Half-Life Scaling, Gas-Phase Pressure, Titration & Optical Rotation First-Order Formulae, Parallel/Consecutive/Reversible Reactions & Arrhenius Equation.',
    topics: [
      ['Order vs Molecularity', 'Order is experimental (can be 0, fractional, negative); Molecularity is for elementary steps only (positive integer 1, 2, 3). Units of k: (mol/L)^(1-n) s^-1.'],
      ['Zero & First Order Kinetics', 'Zero order: [A] = [A]0 - kt, t_1/2 = [A]0/(2k), t_100% = [A]0/k. First order: k = (2.303/t) log([A]0/[A]), t_1/2 = 0.693/k (independent of [A]0!).'],
      ['First-Order Monitoring Tricks', 'Optical rotation (sucrose inversion): k = (2.303/t) log[(r0 - r_inf)/(r_t - r_inf)]. Gas A -> nB: k = (2.303/t) log[(n-1)P0 / (nP0 - P_t)].'],
      ['Arrhenius & Parallel Reactions', 'k = A * exp(-Ea / RT). Catalyst lowers Ea for BOTH forward & backward equally (dH unchanged!). Parallel A -> B(k1), C(k2): k_eff = k1 + k2, %B = k1/(k1+k2).'],
    ],
    formulas: [
      'nth Order Half-Life Scaling: t_1/2 proportional to [A]0^(1 - n)',
      'First-Order Milestones: t_75% = 2 * t_1/2  |  t_87.5% = 3 * t_1/2  |  t_99.9% ~ 10 * t_1/2',
      'Arrhenius Two-Temp Form: log10(k2 / k1) = (Ea / (2.303 * R)) * (1/T1 - 1/T2)',
      'Parallel Effective Activation Energy: Ea_eff = (k1*Ea1 + k2*Ea2) / (k1 + k2)',
    ],
    traps: [
      'TRAP 1: For a first-order reaction, reaction NEVER reaches 100% completion in finite time (unlike zero order!).',
      'TRAP 2: Pseudo-first-order reactions (ester hydrolysis, sucrose inversion) have water in huge excess so order wrt H2O is effectively 0.',
    ],
    pyqs: [
      ['PYQ Check 1', 'Plot of ln(k) vs 1/T is a straight line with slope = -Ea/R and y-intercept = ln(A).'],
      ['PYQ Check 2', 'In consecutive reaction A -> B -> C, [B] maximizes at t_max = ln(k1/k2) / (k1 - k2).'],
    ],
  },
  {
    file: 'PREPSKM_Chem_10_Solid_State_Surface_JEE.pdf',
    num: '10',
    title: 'Solid State & Surface Chemistry',
    subject: 'Chemistry',
    classLabel: 'Class 12 JEE',
    weightage: 4,
    difficulty: 'Easy',
    summary: 'Crystal Lattices, SC/BCC/FCC Unit Cells & Packing Efficiency, Bragg Law, Tetrahedral & Octahedral Voids, Radius Ratio Rules (NaCl, CsCl, ZnS, CaF2), Crystal Defects (Schottky, Frenkel, F-Centres), Adsorption (Freundlich) & Colloids (Hardy-Schulze, Gold Number).',
    topics: [
      ['Cubic Unit Cells & Packing', 'SC (Z=1, a=2r, 52.4%); BCC (Z=2, sqrt(3)a=4r, 68%); FCC/CCP (Z=4, sqrt(2)a=4r, 74%). HCP also has 74% packing & CN=12!'],
      ['Voids & Ionic Structures', 'For N atoms in CCP: N Octahedral voids (edge centers + body center), 2N Tetrahedral voids (2 on each body diagonal). NaCl (6:6), CsCl (8:8), ZnS (4:4), CaF2 (8:4).'],
      ['Point Defects', 'Schottky (equal cation+anion missing, density DECREASES: NaCl, KCl, CsCl, AgBr). Frenkel (cation to interstitial, density SAME: ZnS, AgCl, AgBr, AgI).'],
      ['Adsorption & Colloids', 'Physisorption decreases with T; Chemisorption first rises then falls. Hardy-Schulze: higher valency of oppositely charged ion => greater coagulating power!'],
    ],
    formulas: [
      'Unit Cell Density: rho = (Z * M) / (N_A * a^3)',
      'Radius Ratio: 0.155-0.225 (Triangular) | 0.225-0.414 (Tetrahedral) | 0.414-0.732 (Octahedral) | 0.732-1 (Cubic)',
      'Freundlich Adsorption Isotherm: x/m = k * P^(1/n)   =>   log(x/m) = log(k) + (1/n) log(P)   [0 <= 1/n <= 1]',
      'Gold Number: SMALLER the gold number, GREATER the protective power of lyophilic colloid (Gelatin best!)',
    ],
    traps: [
      'TRAP 1: AgBr shows BOTH Schottky AND Frenkel defects (classic NCERT/JEE favourite!).',
      'TRAP 2: F-centres (anionic vacancies occupied by unpaired electrons) impart colour (NaCl yellow, LiCl pink, KCl violet) and paramagnetism!',
    ],
    pyqs: [
      ['PYQ Check 1', 'Positive sols: Fe(OH)3, Al(OH)3, TiO2, basic dyes. Negative sols: As2S3, Au/Ag metals, starch, clay, acid dyes.'],
      ['PYQ Check 2', 'Micelle formation occurs ONLY above Kraft Temperature (T_k) and Critical Micelle Concentration (CMC).'],
    ],
  },
  {
    file: 'PREPSKM_Chem_11_Periodic_Table_JEE.pdf',
    num: '11',
    title: 'Periodic Table & Periodicity',
    subject: 'Chemistry',
    classLabel: 'Class 11 JEE',
    weightage: 4,
    difficulty: 'Easy',
    summary: 'Period/Block/Group Identification, IUPAC Nomenclature for Z > 100, Slater Rules & Z_eff, Atomic & Ionic Radii Exceptions, Hydrated Radius, Ionization Enthalpy (IE1 & IE2) Exceptions, Electron Gain Enthalpy (Cl > F!), Electronegativity, Nature of Oxides & Diagonal Relationship.',
    topics: [
      ['Atomic & Ionic Radii Exceptions', 'Lanthanoid contraction makes 4d ~ 5d (Zr ~ Hf, Nb ~ Ta)! Group 13 anomaly: r(Ga) < r(Al) due to poor 3d shielding! Isoelectronic radius decreases as Z increases.'],
      ['Ionization Enthalpy (IE1 & IE2)', 'Period 2 IE1 order: Li < B < Be < C < O < N < F < Ne (Be > B due to 2s2; N > O due to half-filled 2p3!). Period 3: Na < Al < Mg < Si < S < P < Cl < Ar.'],
      ['Electron Gain Enthalpy (EGE)', '3rd period > 2nd period in Groups 15-17 due to smaller 2p repulsion: Cl > F > Br > I; S > Se > Te > Po > O (O is LAST in Group 16!).'],
      ['Oxides & Amphoteric List', 'Amphoteric oxides: ZnO, Al2O3, BeO, PbO, SnO, Ga2O3, Cr2O3, V2O5, As2O3, Sb2O3. Neutral oxides: CO, NO, N2O.'],
    ],
    formulas: [
      'Slater Z_eff = Z - sigma   (same ns/np: 0.35; (n-1): 0.85; (n-2) or inner: 1.00; for d/f inner shells: 1.00)',
      'Mulliken-Pauling Electronegativity: EN_Pauling = EN_Mulliken / 2.8 = (IE + EA) / (5.6 eV)',
      'Hydrated Radius Order (Group 1): Li+(aq) > Na+(aq) > K+(aq) > Rb+(aq) > Cs+(aq)   [ionic mobility is REVERSE!]',
      'IUPAC Roots: 0=nil, 1=un, 2=bi, 3=tri, 4=quad, 5=pent, 6=hex, 7=sept, 8=oct, 9=enn (e.g. Z=118 Oganesson = Ununoctium)',
    ],
    traps: [
      'TRAP 1: IE2 of O > N and Cu > Zn and Cr > Mn because removing 2nd electron breaks half-filled/full-filled noble configuration!',
      'TRAP 2: Addition of 2nd electron (O- + e- -> O2-) is ALWAYS endothermic (positive dH_eg)!',
    ],
    pyqs: [
      ['PYQ Check 1', 'Most negative electron gain enthalpy in periodic table = Chlorine (Cl); highest electronegativity = Fluorine (F); highest IE1 = Helium (He).'],
      ['PYQ Check 2', 'Diagonal relationships (similar charge/radius ratio): Li-Mg, Be-Al, B-Si.'],
    ],
  },
  {
    file: 'PREPSKM_Chem_12_Chemical_Bonding_JEE.pdf',
    num: '12',
    title: 'Chemical Bonding & Molecular Structure',
    subject: 'Chemistry',
    classLabel: 'Class 11 JEE',
    weightage: 8,
    difficulty: 'Easy',
    summary: 'Lattice Energy & Fajan Rules, Formal Charge, VSEPR Theory & Hybridization Geometries, Bent Rule & Drago Rule, Back Bonding (BF3, Trisilylamine), Solid-State Structures (PCl5, PBr5, N2O5), Molecular Orbital Theory (MOT), Dipole Moment & Hydrogen Bonding.',
    topics: [
      ['Fajan Rules & Lattice Energy', 'Covalent character increases with small cation, large anion, high charge, and pseudo-noble gas config (d10: Cu+, Ag+, Zn2+).'],
      ['VSEPR Master Shapes', 'Steric No 5: 3bp+2lp (ClF3: T-shape), 2bp+3lp (XeF2, I3-: Linear), 4bp+1lp (SF4: See-saw). Steric No 6: 4bp+2lp (XeF4: Square planar), 5bp+1lp (BrF5: Square pyramidal).'],
      ['Bent Rule, Drago Rule & Back Bonding', 'Bent rule: more EN atoms prefer orbitals with LESS s-character (axial in TBP: PCl3F2 has F axial!). Drago rule: PH3, H2S, AsH3 have almost pure p-orbitals (~90 deg, no hybridization).'],
      ['MOT & CO+ Exception', 's-p mixing up to N2 (14e): pi_2p < sigma_2pz. From O2 (16e): sigma_2pz < pi_2p. O2, B2, S2 are paramagnetic! CO -> CO+ INCREASES bond order from 3.0 to 3.5!'],
    ],
    formulas: [
      'Steric Number (SN) = (1/2) * [Valence e- of Central Atom + Monovalent Atoms - Cation Charge + Anion Charge]',
      'Bond Order (MOT) = (N_b - N_a) / 2   |   14e (N2, CO, CN-, NO+): BO = 3  |  15e: 2.5  |  16e (O2): 2  |  17e (O2-): 1.5  |  18e (O2^2-): 1',
      'Percent Ionic Character = (mu_observed / mu_calculated) * 100%',
      'Solid-State Ionic Dimers: PCl5(s) = [PCl4]+[PCl6]-  |  PBr5(s) = [PBr4]+Br-  |  N2O5(s) = [NO2]+[NO3]-  |  I2Cl6(l) = [ICl2]+[ICl4]-',
    ],
    traps: [
      'TRAP 1: Back bonding makes N(SiH3)3 PLANAR (sp2, weak base) whereas N(CH3)3 is PYRAMIDAL (sp3, strong base)!',
      'TRAP 2: Dipole moment of NH3 > NF3 (lone pair & N-F dipoles oppose in NF3!); CH3Cl > CH3F (larger C-Cl bond length wins!).',
    ],
    pyqs: [
      ['PYQ Check 1', 'B2H6 (diborane) has 4 terminal 2c-2e B-H bonds and 2 bridged 3c-2e banana bonds (only 6 atoms are coplanar!).'],
      ['PYQ Check 2', 'o-Nitrophenol has intramolecular H-bonding (steam volatile, lower BP), whereas p-Nitrophenol has intermolecular H-bonding (higher BP).'],
    ],
  },
  {
    file: 'PREPSKM_Chem_13_Hydrogen_sBlock_Metallurgy_JEE.pdf',
    num: '13',
    title: 'Hydrogen, s-Block & Metallurgy',
    subject: 'Chemistry',
    classLabel: 'Class 11 & 12 JEE',
    weightage: 8,
    difficulty: 'Easy',
    summary: 'Hydrogen Isotopes, Hydrides, Hard Water Removal, H2O2 Structure & Reactions, s-Block Alkali & Alkaline Earth Metals (Liquid NH3 Solutions, Solvay Process, Plaster of Paris), Metallurgy Ores, Froth Floatation, Ellingham Diagram, Blast Furnace, Hall-Heroult & Refining.',
    topics: [
      ['Hydrogen, Water Hardness & H2O2', 'Temporary hardness (Ca/Mg bicarbonates): boiling or Clark method (Ca(OH)2). Permanent hardness (chlorides/sulphates): washing soda, Calgon, Zeolite. H2O2 has open-book structure.'],
      ['s-Block Anomalies & Liquid NH3', 'Alkali metals in liquid NH3 give deep blue, paramagnetic, conducting solution due to ammoniated electrons; concentrated (>3M) turns bronze & diamagnetic!'],
      ['Solvay Process & Important Compounds', 'Solvay makes Na2CO3 (NOT K2CO3 because KHCO3 is too soluble!). Plaster of Paris = CaSO4.1/2 H2O; Dead burnt plaster = anhydrous CaSO4.'],
      ['Metallurgy & Refining', 'Froth floatation for sulphide ores (NaCN depressant separates ZnS from PbS!). Ellingham diagram: lower metal reduces upper metal oxide.'],
    ],
    formulas: [
      'Key Ores: Haematite (Fe2O3), Magnetite (Fe3O4), Bauxite (Al2O3.2H2O), Copper Pyrites (CuFeS2), Malachite (CuCO3.Cu(OH)2), Calamine (ZnCO3)',
      'Hall-Heroult (Al): Al2O3 + Cryolite (Na3AlF6) + CaF2 (lowers MP & increases conductivity)',
      'MacArthur-Forrest Cyanide Process (Ag/Au): Au + CN- + O2 -> [Au(CN)2]-  --Zn-->  Au (leaching + displacement)',
      'Vapour Phase Refining: Mond Process (Ni via Ni(CO)4)  |  van Arkel Method (Zr, Ti via MI4)',
    ],
    traps: [
      'TRAP 1: Li is the STRONGEST reducing agent in aqueous solution (most negative E0 = -3.04 V) despite highest IE, because of huge hydration enthalpy of tiny Li+!',
      'TRAP 2: In Blast Furnace, C + O2 -> 2CO has negative slope on Ellingham diagram, so C reduces FeO at high temp (>1073 K) while CO reduces Fe2O3 at lower temp.',
    ],
    pyqs: [
      ['PYQ Check 1', 'Thermal stability of Group 1 & 2 carbonates increases down the group; Li2CO3 and BeCO3 decompose easily on heating.'],
      ['PYQ Check 2', 'Zone refining gives ultrapure semiconductors (Si, Ge, Ga, B, In) based on higher solubility of impurities in melt than solid!'],
    ],
  },
  {
    file: 'PREPSKM_Chem_14_p_Block_JEE.pdf',
    num: '14',
    title: 'p-Block Elements (Groups 13–18)',
    subject: 'Chemistry',
    classLabel: 'Class 11 & 12 JEE',
    weightage: 12,
    difficulty: 'Moderate',
    summary: 'Complete Group 13–18 JEE Compendium: Borax, Boric Acid, Diborane, Silicates & Silicones, Nitrogen Oxides & HNO3, Phosphorus Oxyacids, Ozone/SO2/Contact Process & Sulphur Oxyacids, Halogens/Interhalogens, and Xenon Fluorides/Oxides & Hydrolysis.',
    topics: [
      ['Group 13 & 14 (Class 11)', 'Boric acid H3BO3 is a weak MONOBASIC Lewis acid (accepts OH- from water!). Inert pair effect makes Tl+, Pb2+, Bi3+ stable. Borazine B3N3H6 = inorganic benzene.'],
      ['Group 15 (N & P)', 'NH3 > PH3 > AsH3 > SbH3 > BiH3 (basicity & thermal stability). Oxyacids of P: H3PO2 (1 OH, monobasic, strong reducing), H3PO3 (2 OH, dibasic), H3PO4 (3 OH, tribasic).'],
      ['Group 16 (O & S)', 'S-Oxyacids: Marshall acid H2S2O8 (peroxy O-O), Oleum H2S2O7 (S-O-S), Dithionic H2S2O6 (S-S). Contact process catalyst: V2O5.'],
      ['Group 17 & 18 (Halogens & Xenon)', 'Cl2 + cold dil NaOH -> NaCl + NaOCl; Cl2 + hot conc NaOH -> NaCl + NaClO3. XeF2 (linear), XeF4 (sq planar), XeF6 (distorted octahedral), XeO3 (pyramidal), XeOF4 (sq pyramidal).'],
    ],
    formulas: [
      'Borax Formula: Na2[B4O5(OH)4].8H2O  (two sp2 B and two sp3 B atoms!)',
      'Silicate Units: Ortho SiO4^4- | Pyro Si2O7^6- | Cyclic/Chain (SiO3^2-)_n | Sheet (Si2O5^2-)_n | 3D SiO2',
      'Xenon Hydrolysis: XeF4 + H2O -> Xe + XeO3 + HF + O2 (disproportionation!)  |  XeF6 + 3H2O -> XeO3 + 6HF (non-redox!)',
      'Acidic Strength of Halic Acids: HOCl < HClO2 < HClO3 < HClO4  |  HF < HCl < HBr < HI',
    ],
    traps: [
      'TRAP 1: Bond dissociation energy of halogens: Cl2 > Br2 > F2 > I2 (F2 is abnormally weak due to lone-pair repulsion!).',
      'TRAP 2: Boiling point of hydrides: H2O >> H2Te > H2Se > H2S and HF >> HI > HBr > HCl and NH3 > SbH3 > AsH3 > PH3 (H-bonding jumps 1st member!).',
    ],
    pyqs: [
      ['PYQ Check 1', 'Brown ring complex in nitrate test: [Fe(H2O)5(NO)]SO4 (iron is in +1 oxidation state with NO+, 3 unpaired e-!).'],
      ['PYQ Check 2', 'P4 (white) is reactive & soluble in CS2 with 60 deg angle strain; red P is polymeric; black P is thermodynamically most stable.'],
    ],
  },
  {
    file: 'PREPSKM_Chem_15_d_f_Block_JEE.pdf',
    num: '15',
    title: 'd & f-Block Elements',
    subject: 'Chemistry',
    classLabel: 'Class 12 JEE',
    weightage: 8,
    difficulty: 'Easy',
    summary: '3d Series Configurations, Radii, IE & E0 Trends, Magnetism & Colour (d-d vs LMCT), Interstitial Alloys, K2Cr2O7 Preparation/Chromate Equilibrium/Chromyl Chloride Test, KMnO4 Reactions in 3 Media, Lanthanoid Contraction & Actinoids.',
    topics: [
      ['3d Series Trends & Exceptions', 'Zn, Cd, Hg are NOT transition metals (full d10 in ground & common oxidation states). Highest OS in 3d: Mn (+7); overall: Os, Ru (+8). Copper has positive E0(Cu2+/Cu = +0.34 V).'],
      ['Colour & Magnetism', 'Colour arises from d-d transitions (partially filled d) OR Ligand-to-Metal Charge Transfer (LMCT) in d0 species: MnO4- (purple), CrO4^2- (yellow), Cr2O7^2- (orange)!'],
      ['K2Cr2O7 & KMnO4 Master Redox', 'CrO4^2- (yellow, basic) <-> Cr2O7^2- (orange, acidic). KMnO4 oxidizes I- to I2 in acidic medium, but I- to IO3- (iodate!) in neutral/faintly alkaline medium!'],
      ['Lanthanoids & Actinoids', 'Common OS of Lanthanoids: +3 (exceptions: Ce4+ strong oxidant, Eu2+ & Yb2+ strong reductants). Basicity of Ln(OH)3 DECREASES from La(OH)3 to Lu(OH)3!'],
    ],
    formulas: [
      'Spin-Only Magnetic Moment: mu = sqrt(n(n + 2)) BM   (Mn2+/Fe3+ d5 => 5.92 BM; Cr3+ d3 => 3.87 BM)',
      'Chromyl Chloride Test (for Cl-): K2Cr2O7 + 4 NaCl + 6 H2SO4 -> 2 CrO2Cl2 (red vapour) + ...',
      'KMnO4 Media: Acidic MnO4- -> Mn2+ (5e) | Neutral MnO4- -> MnO2 (3e) | Strong Base MnO4- -> MnO4^2- (1e)',
      'Mischmetal Alloy: ~95% Lanthanoid metal + ~5% Fe + traces of S, C, Ca, Al',
    ],
    traps: [
      'TRAP 1: Chromyl chloride test FAILS for covalent chlorides (HgCl2, AgCl, PbCl2, SnCl2) and bromides/iodides!',
      'TRAP 2: Acidified K2Cr2O7 + H2O2 gives deep blue CrO5 (soluble in ether), which decomposes quickly to green Cr3+.',
    ],
    pyqs: [
      ['PYQ Check 1', 'Why is Cr2+ a strong reducing agent while Mn3+ is oxidizing? Cr2+(d4) -> Cr3+(d3, half-filled t2g3!), while Mn3+(d4) -> Mn2+(d5, half-filled!).'],
      ['PYQ Check 2', 'Manganese has abnormally low melting point & enthalpy of atomization in 3d series due to stable half-filled 3d5 4s2 causing weak metallic bonding.'],
    ],
  },
  {
    file: 'PREPSKM_Chem_16_Coordination_Compounds_JEE.pdf',
    num: '16',
    title: 'Coordination Compounds',
    subject: 'Chemistry',
    classLabel: 'Class 12 JEE',
    weightage: 8,
    difficulty: 'Moderate',
    summary: 'Werner Theory, Ligands (Denticity, Ambidentate, Flexidentate), IUPAC Naming & EAN Rule, Structural & Stereoisomerism Master Table (GI & OI), Valence Bond Theory (VBT), Crystal Field Theory (CFT), Spectrochemical Series, CFSE, Jahn-Teller & Metal Carbonyl Synergic Bonding.',
    topics: [
      ['Ligands, IUPAC & EAN', 'EDTA^4- (hexadentate), en (bidentate), dmg- (bidentate), ambidentate (CN-/NC-, NO2-/ONO-, SCN-/NCS-). EAN = Z - OS + 2(CN).'],
      ['Stereoisomerism Shortcuts', 'Octahedral: [Ma4b2] (2 GI, 0 OI), [Ma3b3] (fac/mer, 2 GI, 0 OI), [M(AA)3] (0 GI, 2 OI), [M(AA)2a2] (cis is optically active => 3 total stereoisomers!), [Mabcdef] (15 GI, 30 total!).'],
      ['VBT & CFT Splitting', 'Spectrochemical series: I- < Br- < SCN- < Cl- < F- < OH- < C2O4^2- < H2O < NCS- < edta4- < NH3 < en < CN- < CO. Delta_t = (4/9) Delta_o.'],
      ['Synergic Bonding in Metal Carbonyls', 'Metal-to-ligand pi-back donation (filled d -> empty pi* of CO) STRENGTHENS M-C bond and WEAKENS C-O bond (longer C-O, lower stretching frequency)!'],
    ],
    formulas: [
      'Octahedral CFSE = (-0.4 * n_t2g + 0.6 * n_eg) * Delta_o + (extra pairing energy)',
      'Tetrahedral CFSE = (-0.6 * n_e + 0.4 * n_t2) * Delta_t   (almost ALWAYS high spin!)',
      'Special Pairing Exceptions: [Co(H2O)6]3+ and [Co(C2O4)3]3- are LOW SPIN diamagnetic (d2sp3) despite weak O-donor ligands!',
      '4d & 5d Complexes (e.g. [PtCl4]2-, [PdCl4]2-): ALWAYS low spin / square planar (dsp2) because Delta_o is very large!',
    ],
    traps: [
      'TRAP 1: [Ni(CO)4] is tetrahedral (sp3, diamagnetic, Ni0=3d10); [Ni(CN)4]2- is square planar (dsp2, diamagnetic); [NiCl4]2- is tetrahedral (sp3, paramagnetic, 2 unpaired e-)!',
      'TRAP 2: [Cu(NH3)4]2+ is square planar (dsp2) with 1 unpaired electron; Jahn-Teller distortion is strongest in unsymmetrical e_g configurations (d9 Cu2+, high-spin d4 Cr2+).',
    ],
    pyqs: [
      ['PYQ Check 1', 'CO bond length order: [V(CO)6]- > [Cr(CO)6] > [Mn(CO)6]+ (more negative charge on metal => stronger pi back-bonding => longer C-O bond!).'],
      ['PYQ Check 2', 'Wilkinson catalyst: [RhCl(PPh3)3]; Ziegler-Natta: TiCl4 + Al(C2H5)3; Cisplatin: cis-[Pt(NH3)2Cl2] (anti-cancer).'],
    ],
  },
  {
    file: 'PREPSKM_Chem_17_Salt_Analysis_JEE.pdf',
    num: '17',
    title: 'Qualitative Salt Analysis',
    subject: 'Chemistry',
    classLabel: 'Class 12 JEE',
    weightage: 4,
    difficulty: 'Moderate',
    summary: 'Dry Tests (Flame Test, Borax Bead, Cobalt Nitrate), Anion Groups A (dil H2SO4), B (conc H2SO4) & C (SO4^2-, PO4^3-), Cation Groups 0 to VI Separation Scheme, Selective Precipitation & Confirmatory Coloured Complexes.',
    topics: [
      ['Flame & Dry Tests', 'Flame colours: Na (golden yellow), K (violet), Ca (brick red), Sr (crimson red), Ba (apple green), Cu (bluish green).'],
      ['Anion Group A, B & C', 'Group A (dil H2SO4): CO3^2-, S^2- (rotten egg, black PbS, purple Na2[Fe(CN)5NOS]), SO3^2-, NO2- (brown NO2). Group B (conc H2SO4): Cl-, Br-, I-, NO3-, C2O4^2-, CH3COO-.'],
      ['Cation Separation Groups 0–VI', 'Gr I (dil HCl): Pb2+, Ag+, Hg2^2+. Gr II (H2S + dil HCl): Cu2+, Cd2+, Bi3+, Pb2+, Hg2+, As3+, Sb3+, Sn2+. Gr III (NH4OH + NH4Cl): Fe3+, Al3+, Cr3+. Gr IV (H2S + NH4OH): Zn2+, Mn2+, Co2+, Ni2+. Gr V ((NH4)2CO3): Ba2+, Sr2+, Ca2+. Gr VI: Mg2+.'],
      ['Iconic Confirmatory Complexes', 'Ni2+ + DMG (NH4OH) -> rosy red [Ni(DMG)2]. Fe3+ + [Fe(CN)6]4- -> Prussian blue Fe4[Fe(CN)6]3. NH4+ + Nessler reagent -> brown ppt of Millon base iodide.'],
    ],
    formulas: [
      'Nessler Reagent: Alkaline K2[HgI4]  |  Brown ppt with NH3: HgO.Hg(NH2)I',
      'Group III Role of NH4Cl: Suppresses [OH-] via common ion effect so ONLY Group III hydroxides (low Ksp) precipitate, NOT Mg(OH)2 or Zn(OH)2!',
      'Group II vs IV Role of HCl: Acid suppresses S2- so ONLY low-Ksp Gr II sulphides ppt; alkaline Gr IV gives high [S2-] for ZnS/MnS/CoS/NiS!',
      'Silver Halide Solubility in NH3: AgCl (white, soluble) | AgBr (pale yellow, partially soluble) | AgI (yellow, insoluble)',
    ],
    traps: [
      'TRAP 1: Cu2+ + CN- first forms yellow Cu(CN)2 which decomposes to CuCN + (CN)2 and dissolves as colourless [Cu(CN)4]3- (masks Cu2+ from H2S so CdS yellow precipitates selectively!).',
      'TRAP 2: Yellow ppt of Ammonium Phosphomolybdate (NH4)3[PMo12O40] confirms PO4^3- (and yellow Ag3PO4 dissolves in dil HNO3!).',
    ],
    pyqs: [
      ['PYQ Check 1', 'Cu2+ + K4[Fe(CN)6] gives chocolate-brown ppt of Cu2[Fe(CN)6]; Fe3+ + SCN- gives blood-red [Fe(SCN)(H2O)5]2+.'],
      ['PYQ Check 2', 'Sulphide colours: CdS & As2S3 (yellow), Sb2S3 (orange), ZnS (white), MnS (buff/pink), PbS/CuS/HgS/NiS/CoS (black).'],
    ],
  },
  {
    file: 'PREPSKM_Chem_18_Gaseous_State_Env_JEE.pdf',
    num: '18',
    title: 'Gaseous State & Environmental Chemistry',
    subject: 'Chemistry',
    classLabel: 'Class 11 JEE',
    weightage: 4,
    difficulty: 'Easy',
    summary: 'Ideal Gas Laws, Dalton Partial Pressures, Graham Law of Effusion, KTG & Maxwell-Boltzmann Distribution, Real Gases & van der Waals Equation, Compressibility Factor Z vs P, Boyle Temperature, Critical Constants, Joule-Thomson Effect & Environmental Chemistry.',
    topics: [
      ['Gas Laws & Graham Effusion', 'r1 / r2 = sqrt(M2 / M1) at const P, T; if P varies: r proportional to P / sqrt(M*T). Dalton Law: P_i = X_i * P_total (non-reacting gases only).'],
      ['Real Gases & Compressibility Z', 'Z = PV / (nRT). Z < 1 (attractive forces dominate, more compressible); Z > 1 (repulsive forces dominate). For H2 & He, Z > 1 at ALL pressures at 298 K!'],
      ['van der Waals & Critical Constants', '(P + a n^2 / V^2)(V - nb) = nRT. "a" measures intermolecular attraction (liquefaction ease); "b" = 4 * N_A * (4/3 pi r^3) (excluded volume).'],
      ['Environmental Chemistry (JEE Main Must-Read)', 'Classical (London) smog: SO2 + fog, REDUCING, cool/humid. Photochemical (LA) smog: NO2 + HC + sunlight -> O3, PAN, acrolein, OXIDIZING, warm/sunny.'],
    ],
    formulas: [
      'Critical Constants: V_c = 3b  |  P_c = a / (27 b^2)  |  T_c = 8a / (27 R b)  |  Z_c = P_c V_c / (R T_c) = 3/8 = 0.375',
      'Boyle Temperature: T_B = a / (R b)   |   Inversion Temperature (J-T): T_i = 2a / (R b) = 2 * T_B',
      'Drinking Water Limits (NCERT): F- <= 1 ppm (>2 ppm mottling, >10 ppm bones); Pb <= 50 ppb; NO3- <= 50 ppm (methemoglobinemia); SO4^2- <= 500 ppm',
      'BOD: Clean water < 5 ppm; Highly polluted >= 17 ppm  |  Acid Rain pH < 5.6',
    ],
    traps: [
      'TRAP 1: At LOW pressure, Z ~ 1 - a / (V_m R T) < 1; at HIGH pressure, Z ~ 1 + P*b / (R T) > 1.',
      'TRAP 2: CFCs release Cl radicals in stratosphere that catalytically destroy O3 (Polar Stratospheric Clouds in Antarctica accelerate spring ozone hole!).',
    ],
    pyqs: [
      ['PYQ Check 1', 'Gas with higher van der Waals constant "a" (e.g. NH3, SO2, CO2 > H2, He) has higher T_c and liquefies most easily!'],
      ['PYQ Check 2', 'In Maxwell-Boltzmann distribution, raising T shifts the peak to the RIGHT (higher speed) and LOWERS the peak height (area stays 1).'],
    ],
  },
  {
    file: 'PREPSKM_Chem_19_IUPAC_Isomerism_JEE.pdf',
    num: '19',
    title: 'IUPAC & Isomerism',
    subject: 'Chemistry',
    classLabel: 'Class 11 JEE',
    weightage: 4,
    difficulty: 'Easy',
    summary: 'Functional Group Priority Order, Principal Chain Selection & Lowest Locant Rule, Alkene vs Alkyne Tie-Breaker, Cyclic/Bicyclo/Spiro/Aromatic Naming, Degree of Unsaturation (DU / IHD), Structural Isomerism, Monochlorination Count & Tautomerism/Enol Content.',
    topics: [
      ['Functional Group Priority Ladder', '-COOH > -SO3H > Anhydride > Ester (-COOR) > Acid Halide (-COX) > Amide (-CONH2) > -CN > -CHO > Ketone (>C=O) > -OH > -SH > -NH2 > C=C = C#C > Halo/Nitro/Alkoxy.'],
      ['Chain & Numbering Tie-Breakers', 'Principal FG > Max multiple bonds > Longest chain > Max substituents > Lowest locant set > Alphabetical order. Double bond beats Triple bond ONLY on a strict tie!'],
      ['Bicyclo & Spiro Nomenclature', 'Bicyclo[a.b.c]alkane: bridgehead to bridgehead, descending [a >= b >= c]. Spiro[a.b]alkane: ascending [a <= b], number smaller ring first next to spiro C!'],
      ['Tautomerism & Enol Content', 'Requires acidic alpha-H (or gamma-H in conjugated systems). Enol content is HIGH in 1,3-diketones (acetylacetone ~76% due to intramolecular H-bond + conjugation) and Phenol (~100% aromatic!).'],
    ],
    formulas: [
      'Degree of Unsaturation (DU) = (C + 1) - (H + X - N) / 2   (O and S ignored!)',
      'Special Suffixes (when FG carbon is NOT in ring): -carboxylic acid, -carbaldehyde, -carbonitrile, -carboxamide',
      'Alkanes Structural Isomers Count: C4=2 | C5=3 | C6=5 | C7=9 | C8=18',
      'Functional Isomer Pairs: Alcohol-Ether | Aldehyde-Ketone | Acid-Ester | Cyanide-Isocyanide | Nitro-Nitrite | 1/2/3 deg Amines',
    ],
    traps: [
      'TRAP 1: Never use "di/tri/sec/tert" for alphabetical sorting, EXCEPT "iso", "neo", and "cyclo" which ARE alphabetized!',
      'TRAP 2: Bridgehead alpha-H does NOT participate in keto-enol tautomerism (Bredt Rule: double bond at small bridgehead is unstable!).',
    ],
    pyqs: [
      ['PYQ Check 1', 'In 3-methylpent-1-en-4-yne vs pent-1-en-4-yne: double bond gets locant 1 over triple bond on tie, but in pent-3-en-1-yne triple bond gets 1 (lowest locant wins first!).'],
      ['PYQ Check 2', 'Enol content order: Phenol > PhCOCH2COPh > CH3COCH2COCH3 > CH3COCH2COOEt > Cyclohexanone > Acetone.'],
    ],
  },
  {
    file: 'PREPSKM_Chem_20_GOC_JEE.pdf',
    num: '20',
    title: 'General Organic Chemistry (GOC)',
    subject: 'Chemistry',
    classLabel: 'Class 11 JEE',
    weightage: 8,
    difficulty: 'Moderate',
    summary: 'Inductive (+I/-I), Resonance/Mesomeric (+M/-M) & Canonical Stability Rules, Hyperconjugation, Carbocation/Carbanion/Radical Stability, Aromaticity/Anti-Aromaticity & Frost Circle, Master pKa Acidic Strength Ladder, Ortho Effect & Aliphatic/Aniline Basicity (SIR).',
    topics: [
      ['Electronic Effects Priority', 'Aromaticity > Resonance (M) > Hyperconjugation (H) > Inductive (I). Exception: Halogens (-F, -Cl, -Br, -I) on benzene are -I > +M (deactivating, yet ortho/para directing!).'],
      ['Reactive Intermediates', 'Carbocation stability: Cyclopropylmethyl > Tropylium > Ph3C+ > Allyl/Benzyl > 3 deg > 2 deg > 1 deg > CH3+ > Vinyl/Phenyl. Carbanion stability is opposite (stabilized by -M/-I).'],
      ['Aromaticity (Huckel Rule)', 'Cyclic, planar, fully conjugated: (4n+2) pi e- = Aromatic; (4n) pi e- = Anti-aromatic (extremely unstable!). Non-planar 4n (like COT) becomes Non-aromatic!'],
      ['Acidic & Basic Strength Traps', 'Ortho effect: ANY ortho-substituted benzoic acid (even o-toluic acid!) is STRONGER than benzoic acid! Ortho-substituted anilines are WEAKER bases than aniline (SIR/SIP)!'],
    ],
    formulas: [
      'Master pKa Acidic Ladder: RSO3H (-2) > Picric (0.4) > HCOOH (3.7) > PhCOOH (4.2) > CH3COOH (4.8) > H2CO3 (6.4) > PhOH (10) > H2O (15.7) > ROH (16-18) > RC#CH (25) > NH3 (38) > RH (50)',
      'Aqueous Amine Basicity (NCERT!): Methyl: 2 deg > 1 deg > 3 deg > NH3  |  Ethyl: 2 deg > 3 deg > 1 deg > NH3',
      'Gas-Phase Amine Basicity: 3 deg > 2 deg > 1 deg > NH3  (pure +I effect!)',
      'NaHCO3 Effervescence Test: Given ONLY by acids STRONGER than H2CO3 (pKa < 6.4): -COOH, -SO3H, Picric acid, Squaric acid (NOT simple phenol!)',
    ],
    traps: [
      'TRAP 1: For p-nitrophenol vs o-nitrophenol, p-nitrophenol is SLIGHTLY more acidic because intramolecular H-bonding in o-nitrophenol holds back the H+!',
      'TRAP 2: Pyrrole is a MUCH weaker base than Pyridine because pyrrole lone pair is part of the 6-pi aromatic sextet!',
    ],
    pyqs: [
      ['PYQ Check 1', 'Heat of hydrogenation (HOH) is INVERSELY proportional to alkene stability (more alpha-H => more stable => LOWER HOH!).'],
      ['PYQ Check 2', 'Acidity of haloacetic acids: FCH2COOH > ClCH2COOH > BrCH2COOH > ICH2COOH > CH3COOH (-I order!).'],
    ],
  },
  {
    file: 'PREPSKM_Chem_21_Stereochemistry_JEE.pdf',
    num: '21',
    title: 'Stereochemistry',
    subject: 'Chemistry',
    classLabel: 'Class 11 & 12 JEE',
    weightage: 8,
    difficulty: 'Moderate',
    summary: 'Geometrical Isomerism (C=C, C=N, Ring) & E-Z CIP Priority Rules, Conformational Analysis (Newman & Cyclohexane Chair), Optical Isomerism, R-S Configuration in Fischer/Wedge-Dash, Enantiomers/Diastereomers/Meso/Racemic/ee, Optical Activity Without Chiral Carbon & Total Stereoisomer Formulae.',
    topics: [
      ['Geometrical Isomerism & E-Z Rules', 'CIP priority by atomic number Z (higher Z = 1). Same side = Z (Zusammen); opposite = E (Entgegen). Cycloalkenes show GI only for ring size >= 8!'],
      ['Conformational Analysis', 'n-Butane stability: Anti > Gauche > Partially Eclipsed > Fully Eclipsed. Exception: Ethylene glycol / 2-fluoroethanol prefer GAUCHE due to intramolecular H-bonding!'],
      ['R-S, Enantiomers, Diastereomers & Meso', 'Fischer vertical low-priority (#4): CW=R, CCW=S. Horizontal #4: REVERSE! Meso compound has >=2 chiral centers AND a Plane/Center of Symmetry (POS/COS) => optically INACTIVE!'],
      ['Chirality Without Chiral Carbon', 'Even-cumulenes (abC=C=Cab, allenes), ortho-substituted biphenyls (atropisomerism), spiranes, and rigid bridgehead amines (Tröger base) are optically active!'],
    ],
    formulas: [
      'Unsymmetrical Molecule with n Stereocenters: Total Stereoisomers = 2^n',
      'Symmetrical with EVEN n Chiral Centers: Active (a) = 2^(n-1), Meso (m) = 2^(n/2 - 1), Total = a + m',
      'Symmetrical with ODD n Chiral Centers: Active (a) = 2^(n-1) - 2^((n-1)/2), Meso (m) = 2^((n-1)/2), Total = 2^(n-1)',
      'Optical Purity (% ee) = ([alpha]_obs / [alpha]_pure) * 100% = |%d - %l|',
    ],
    traps: [
      'TRAP 1: Simple chiral tertiary amines (R1R2R3N) are optically INACTIVE at room temp due to rapid umbrella (Walden) inversion — EXCEPT quaternary ammonium salts R1R2R3R4N+!',
      'TRAP 2: In substituted cyclohexane chair, the BULKIEST group (e.g. tert-butyl) locks itself in the EQUATORIAL position to avoid 1,3-diaxial repulsion!',
    ],
    pyqs: [
      ['PYQ Check 1', 'Tartaric acid (HOOC-CH(OH)-CH(OH)-COOH) has 3 stereoisomers: d-tartaric, l-tartaric (enantiomers), and meso-tartaric (diastereomer of d & l).'],
      ['PYQ Check 2', 'cis-1,2-dimethylcyclohexane is optically inactive (rapid ring flip interconverts mirror images), whereas cis-1,3-dimethylcyclohexane is meso!'],
    ],
  },
  {
    file: 'PREPSKM_Chem_22_Hydrocarbons_JEE.pdf',
    num: '22',
    title: 'Hydrocarbons',
    subject: 'Chemistry',
    classLabel: 'Class 11 JEE',
    weightage: 8,
    difficulty: 'Moderate',
    summary: 'Alkanes (Wurtz, Corey-House, Kolbe Electrolysis, Soda-Lime, Free Radical Halogenation Selectivity), Alkenes (Lindlar vs Birch, HX/OMDM/HBO, Peroxide Effect, Halonium Anti-Addition, Baeyer/OsO4 Syn-Hydroxylation, Ozonolysis), Alkynes (Kucherov, Red-Hot Fe) & Benzene EAS.',
    topics: [
      ['Alkanes & Halogenation Selectivity', 'Wurtz gives symmetrical alkanes (fails for 3 deg RX). Corey-House (R2CuLi + R\'X) makes unsymmetrical alkanes! Br2 is highly selective (3 deg:2 deg:1 deg = 1600:82:1); Cl2 is 5:3.8:1.'],
      ['Alkenes: 3 Hydration Pathways', 'H3O+: Markovnikov WITH carbocation rearrangement! Oxymercuration-Demercuration (Hg(OAc)2/H2O, NaBH4): Markovnikov NO rearrangement! Hydroboration-Oxidation (BH3/THF, H2O2/OH-): Anti-Markovnikov SYN, NO rearrangement!'],
      ['Alkenes Stereochemistry & Ozonolysis', 'Br2/CCl4: ANTI addition (cis -> racemic, trans -> meso!). Cold KMnO4 / OsO4: SYN dihydroxylation (cis -> meso, trans -> racemic!). Reductive ozonolysis (O3, Zn/H2O) -> aldehydes/ketones; Oxidative (O3, H2O2) -> acids/ketones.'],
      ['Alkynes & Benzene EAS', 'Lindlar (H2/Pd-BaSO4): CIS alkene; Birch (Na/liq NH3): TRANS alkene. Terminal alkyne gives white ppt with Tollens & red ppt with Cu2Cl2/NH4OH. Benzene + Friedel-Crafts: carbocation rearranges & fails on strongly deactivated rings (-NO2, -NR3+, and -NH2 due to salt formation!).'],
    ],
    formulas: [
      'Peroxide Effect (Kharasch): Works ONLY for HBr + Peroxide (free radical Anti-Markovnikov), NEVER for HCl or HI!',
      'Kucherov Hydration (Hg2+/H2SO4): Ethyne -> Acetaldehyde; All higher alkynes -> Ketones',
      'Red-Hot Fe Tube (873 K): 3 HC#CH -> Benzene  |  3 CH3-C#CH -> Mesitylene (1,3,5-trimethylbenzene)',
      'Soda-Lime Decarboxylation (NaOH + CaO): R-COONa -> R-H + Na2CO3 (rate proportional to carbanion stability!)',
    ],
    traps: [
      'TRAP 1: Friedel-Crafts alkylation of Benzene with n-propyl chloride + AlCl3 gives ISOPROPYLBENZENE (cumene) due to 1,2-hydride shift! Use Friedel-Crafts ACYLATION + Clemmensen/Wolff-Kishner to make n-propylbenzene!',
      'TRAP 2: Kolbe electrolysis of RCOONa gives R-R at ANODE and H2 + NaOH at CATHODE (solution pH increases!).',
    ],
    pyqs: [
      ['PYQ Check 1', 'Birch reduction of substituted benzene: EDG (-OMe, -Me) stays ON the double bond; EWG (-COOH) stays AWAY from double bond (on sp3 C).'],
      ['PYQ Check 2', 'NBS (N-bromosuccinimide) performs selective ALLYLIC and BENZYLIC bromination via free-radical mechanism!'],
    ],
  },
  {
    file: 'PREPSKM_Chem_23_Haloalkanes_Haloarenes_JEE.pdf',
    num: '23',
    title: 'Haloalkanes & Haloarenes',
    subject: 'Chemistry',
    classLabel: 'Class 12 JEE',
    weightage: 8,
    difficulty: 'Moderate',
    summary: 'Preparation (Lucas, Darzen SOCl2, Finkelstein, Swarts, Hunsdiecker, Sandmeyer), SN1 vs SN2 Master Comparison, NGP & SNi Retention, Bridgehead Traps, Elimination E1/E2/E1cb (Zaitsev vs Hofmann), SNAr & Benzyne Mechanisms, Polyhalogen Compounds & Grignard Reagent.',
    topics: [
      ['Key Named Preparations', 'Darzen (ROH + SOCl2/Pyridine): clean inversion; without pyridine: SNi RETENTION! Finkelstein (NaI/acetone -> RI). Swarts (AgF/SbF3 -> RF). Hunsdiecker (RCOOAg + Br2 -> RBr, 1 C less!).'],
      ['SN1 vs SN2 Master Table', 'SN1: 3 deg > 2 deg > 1 deg, polar protic solvent, carbocation rearrangement, racemization (+ slight inversion). SN2: CH3 > 1 deg > 2 deg (3 deg fails!), polar aprotic (DMSO, DMF, acetone), 100% Walden inversion!'],
      ['Elimination (E1, E2, E1cb)', 'E2 requires ANTI-periplanar H and X! Bulky base (t-BuOK) or poor leaving group (-F, -NR3+) gives HOFMANN (less substituted) alkene; small base gives ZAITSEV alkene.'],
      ['Aryl Halides (SNAr & Benzyne)', 'Aryl halides resist SN1/SN2 due to partial C=X double bond. Strong -M groups (-NO2) at ortho/para enable SNAr (addition-elimination); NaNH2/liq NH3 gives BENZYNE cine-substitution!'],
    ],
    formulas: [
      'Leaving Group Ability: I- > Br- > Cl- >> F-  (also TsO- > I-)',
      'Nucleophilicity Order: Polar Protic: I- > Br- > Cl- > F-  |  Polar Aprotic: F- > Cl- > Br- > I-',
      'Ambident Nucleophiles: KCN -> R-CN (cyanide), AgCN -> R-NC (isocyanide!) | KNO2 -> R-ONO, AgNO2 -> R-NO2',
      'Chloroform Storage: Dark bottle filled to brim + 1% ethanol to prevent oxidation to poisonous Phosgene (COCl2)!',
    ],
    traps: [
      'TRAP 1: Bridgehead halides (1-bromobicyclo[2.2.1]heptane) undergo NEITHER SN1 (cannot form planar carbocation) NOR SN2 (backside blocked)!',
      'TRAP 2: Grignard reagent RMgX is destroyed immediately by ANY active-H compound (H2O, ROH, RCOOH, NH3, terminal alkyne) giving alkane R-H!',
    ],
    pyqs: [
      ['PYQ Check 1', 'Reaction with AgNO3 (instant AgX ppt) follows SN1 carbocation stability: Tropylium-Br, Benzyl-Br, Allyl-Br, 3 deg-Br react fastest; Vinyl-Br & Aryl-Br give NO ppt!'],
      ['PYQ Check 2', 'DDT is prepared from Chloral (CCl3CHO) + 2 Chlorobenzene in conc H2SO4.'],
    ],
  },
  {
    file: 'PREPSKM_Chem_24_Alcohols_Phenols_Ethers_JEE.pdf',
    num: '24',
    title: 'Alcohols, Phenols & Ethers',
    subject: 'Chemistry',
    classLabel: 'Class 12 JEE',
    weightage: 8,
    difficulty: 'Moderate',
    summary: 'Alcohol Preparation & Acidic Strength, Lucas & Victor Meyer Distinction Tests, Acid-Catalyzed Dehydration & Pinacol-Pinacolone Rearrangement, Phenol Synthesis (Cumene/Dow) & Named Reactions (Reimer-Tiemann, Kolbe-Schmidt, Fries), Williamson Ether Synthesis, HI Cleavage & Epoxide Ring Opening.',
    topics: [
      ['Distinction Tests (1 deg, 2 deg, 3 deg Alcohols)', 'Lucas (conc HCl + anhy ZnCl2): 3 deg instant turbidity, 2 deg 5 min, 1 deg no turbidity at RT. Victor Meyer: 1 deg Red, 2 deg Blue, 3 deg Colourless (RBC!).'],
      ['Oxidation & Pinacol Rearrangement', 'PCC / PDC / Cu-573K oxidizes 1 deg ROH -> Aldehyde (stops!). KMnO4 / Jones (CrO3/H2SO4) -> Carboxylic acid. Pinacol-Pinacolone migratory aptitude: -H > -Ar(EDG) > -Ph > 3 deg > 2 deg > 1 deg > -Me.'],
      ['Phenol Named Reactions', 'Cumene process -> Phenol + Acetone. Reimer-Tiemann (CHCl3/NaOH, :CCl2 carbene) -> Salicylaldehyde (o-major!). Kolbe (CO2/NaOH, 4-7 atm) -> Salicylic acid. Br2/H2O -> 2,4,6-tribromophenol (white ppt); Br2/CS2 -> p-bromophenol!'],
      ['Williamson Synthesis & HI Cleavage', 'Williamson (R-O-Na+ + R\'-X): R\'-X MUST be 1 deg (3 deg R\'X gives E2 alkene!). HI cleavage: 1 deg/2 deg ethers -> SN2 (I- attacks LESS hindered C); 3 deg/benzyl/allyl ethers -> SN1 (I- attacks MORE stable carbocation C)!'],
    ],
    formulas: [
      'Epoxide Ring Opening: Basic/Neutral (RO-/RMgX) -> SN2 at LESS hindered C  |  Acidic (H+/ROH) -> SN1-like at MORE substituted C!',
      'Periodic Acid (HIO4) Cleavage: Cleaves vicinal diols, alpha-hydroxy carbonyls & 1,2-dicarbonyls (1 mole HIO4 per C-C bond cleaved!)',
      'Phenol Test: Neutral FeCl3 gives VIOLET coloration (enols also give colour!).',
      'Aspirin = Acetylsalicylic acid (Salicylic acid + Ac2O)  |  Oil of Wintergreen = Methyl salicylate',
    ],
    traps: [
      'TRAP 1: To make tert-butyl methyl ether via Williamson synthesis, ALWAYS use (CH3)3C-ONa + CH3-I (NEVER CH3-ONa + (CH3)3C-Br, which yields isobutene!).',
      'TRAP 2: Anisole (Ph-O-CH3) + HI ALWAYS gives Phenol + CH3I (NEVER iodobenzene + CH3OH, because aryl C-O bond has partial double-bond character!).',
    ],
    pyqs: [
      ['PYQ Check 1', 'In Reimer-Tiemann with CCl4 + NaOH instead of CHCl3, product is Salicylic acid (o-hydroxybenzoic acid).'],
      ['PYQ Check 2', 'Phenol + Zn dust (heat) -> Benzene; Phenol + Na2Cr2O7/H2SO4 -> p-Benzoquinone.'],
    ],
  },
  {
    file: 'PREPSKM_Chem_25_Aldehydes_Ketones_Acids_JEE.pdf',
    num: '25',
    title: 'Aldehydes, Ketones & Carboxylic Acids',
    subject: 'Chemistry',
    classLabel: 'Class 12 JEE',
    weightage: 12,
    difficulty: 'Moderate',
    summary: 'Carbonyl Preparations (Rosenmund, Stephen, DIBAL-H, Etard, Gattermann-Koch), Nucleophilic Addition & Reductions (Clemmensen, Wolff-Kishner), Aldol, Cannizzaro, Haloform, Perkin, Benzoin, Carboxylic Acids Acidity & Derivatives, HVZ, Decarboxylation & Distinction Tests (Tollens, Fehling, Schiff).',
    topics: [
      ['Selective Carbonyl Preparations', 'Rosenmund: RCOCl + H2/Pd-BaSO4 -> RCHO. Stephen: RCN + SnCl2/HCl -> RCHO. DIBAL-H reduces nitriles & esters to ALDEHYDES! Etard (CrO2Cl2/CS2) & Gattermann-Koch (CO+HCl/AlCl3) -> PhCHO.'],
      ['Named Condensations & Reductions', 'Clemmensen (Zn-Hg/HCl, acid-sensitive fail!) vs Wolff-Kishner (NH2NH2/KOH, base-sensitive fail!). Aldol requires alpha-H; Cannizzaro requires NO alpha-H (HCHO, PhCHO, (CH3)3CCHO).'],
      ['Haloform & Carbonyl Distinction Tests', 'Iodoform (I2/NaOH -> yellow CHI3): given by CH3-CO-R, CH3-CH(OH)-R, ethanol, acetaldehyde (NOT acetic acid/esters!). Tollens: ALL aldehydes + HCOOH + alpha-hydroxy ketones. Fehling: ONLY aliphatic aldehydes (PhCHO gives NEGATIVE Fehling!).'],
      ['Carboxylic Acids & HVZ', 'HVZ (X2 / Red P): alpha-halogenation of acids having alpha-H. Beta-keto acids & gem-dicarboxylic acids decarboxylate smoothly on gentle heating!'],
    ],
    formulas: [
      'Nucleophilic Addition Reactivity: HCHO > RCHO > ArCHO > R2CO > ArCOR > Ar2CO (sterics + electronics!)',
      'Acid Derivative Reactivity (Nucleophilic Acyl Substitution): RCOCl > (RCO)2O > RCOOR\' > RCONH2',
      'Dicarboxylic Acid Heating (Blanc Rule): Oxalic (CO+CO2), Malonic (Acetic+CO2), Succinic/Glutaric (Cyclic Anhydride), Adipic/Pimelic (Cyclic Ketone -1 C!)',
      'Cross-Cannizzaro with HCHO: Formaldehyde is ALWAYS oxidized to HCOO-, while the other aldehyde is reduced to alcohol!',
    ],
    traps: [
      'TRAP 1: Benzaldehyde gives POSITIVE Tollens test, but NEGATIVE Fehling & Benedict tests!',
      'TRAP 2: NaBH4 reduces aldehydes, ketones & acid chlorides ONLY (NOT esters, acids, amides, nitriles, or alkenes); LiAlH4 reduces almost everything EXCEPT isolated C=C!',
    ],
    pyqs: [
      ['PYQ Check 1', 'Perkin reaction: PhCHO + (CH3CO)2O / CH3COONa -> Cinnamic acid (Ph-CH=CH-COOH).'],
      ['PYQ Check 2', '2,4-DNP (Brady reagent) gives yellow/orange-red ppt with ALL aldehydes and ketones; NaHSO3 reacts with aldehydes and methyl ketones only.'],
    ],
  },
  {
    file: 'PREPSKM_Chem_26_Amines_JEE.pdf',
    num: '26',
    title: 'Amines & Diazonium Salts',
    subject: 'Chemistry',
    classLabel: 'Class 12 JEE',
    weightage: 8,
    difficulty: 'Moderate',
    summary: 'Amine Structure & Umbrella Inversion, Preparation (Gabriel Phthalimide, Hoffmann Bromamide, Mendius), Gas vs Aqueous Basicity & Aniline Ortho/SIR Effect, Hinsberg/Carbylamine/HNO2 Tests, Aniline EAS Traps (Nitration & Bromination) & Benzene Diazonium Reaction Map.',
    topics: [
      ['Signature Amine Preparations', 'Gabriel Phthalimide: gives pure 1 deg ALIPHATIC amines ONLY (never aniline — aryl halides don\'t do SN2!). Hoffmann Bromamide (RCONH2 + Br2/NaOH): 1 deg amine with 1 CARBON LESS (retention of configuration!).'],
      ['Distinction Tests (1 deg, 2 deg, 3 deg)', 'Carbylamine (CHCl3/KOH): foul-smelling isocyanide ONLY for 1 deg amines (aliphatic & aromatic!). Hinsberg (PhSO2Cl): 1 deg -> alkali-soluble sulfonamide; 2 deg -> alkali-insoluble; 3 deg -> no reaction!'],
      ['Aniline EAS Traps', 'Nitration of aniline (HNO3/H2SO4) gives 51% para, 47% META (due to -NH3+ anilinium ion!), 2% ortho! Acetylate (-NHCOCH3) first to get pure para-nitroaniline or para-bromoaniline! Aniline NEVER undergoes Friedel-Crafts (forms salt with AlCl3).'],
      ['Benzene Diazonium Chloride (PhN2+Cl-)', 'Prepared at 0-5 C (NaNO2 + HCl). Sandmeyer (CuCl/HCl, CuBr/HBr, CuCN) vs Gattermann (Cu/HCl). Balz-Schiemann (HBF4, heat -> PhF). H3PO2 or EtOH -> Benzene!'],
    ],
    formulas: [
      'Azo Coupling pH Control: PhN2+ + Phenol (mildly BASIC, pH 9-10 -> Orange dye) | PhN2+ + Aniline (mildly ACIDIC, pH 4-5 -> Yellow dye)',
      'Reaction with HNO2 (0-5 C): 1 deg Aliphatic -> ROH + N2 (carbocation rearrangement!) | 1 deg Aromatic -> Diazonium | 2 deg -> Yellow oily N-nitrosoamine',
      'Basicity Order: Guanidine > Aliphatic Amines > NH3 > Aniline > Pyridine > Pyrrole > Amides',
      'Selective Reduction of One -NO2 in m-Dinitrobenzene: Use (NH4)2S or Na2S (gives m-nitroaniline!)',
    ],
    traps: [
      'TRAP 1: Direct bromination of aniline with Br2/H2O immediately yields white ppt of 2,4,6-tribromoaniline — protect with Ac2O/Pyridine to get monobromo product!',
      'TRAP 2: Hoffmann Bromamide rearrangement is intramolecular with retention of chirality at the migrating carbon.',
    ],
    pyqs: [
      ['PYQ Check 1', 'Aniline + conc H2SO4 (453-473 K) -> Sulfanilic acid, which exists as a ZWITTERION (does not dissolve in organic solvents, high MP, no Friedel-Crafts!).'],
      ['PYQ Check 2', 'PhN2+Cl- + KI (warm) -> Iodobenzene (no Cu catalyst needed!); + warm H2O -> Phenol.'],
    ],
  },
  {
    file: 'PREPSKM_Chem_27_Biomolecules_Polymers_JEE.pdf',
    num: '27',
    title: 'Biomolecules & Polymers',
    subject: 'Chemistry',
    classLabel: 'Class 12 JEE',
    weightage: 8,
    difficulty: 'Easy',
    summary: 'Carbohydrates (D/L Glucose, Cyclic Anomers, Mutarotation, Osazone, Reducing vs Non-Reducing Sugars), Sucrose/Maltose/Lactose/Starch/Cellulose, Amino Acids (Zwitterion, Isoelectric Point pI, Essential List), Proteins, Vitamins, DNA/RNA & Polymers (Monomers, Vulcanization, Biodegradable).',
    topics: [
      ['Glucose & Carbohydrates', 'Glucose + HI/heat -> n-hexane; + Br2/H2O -> gluconic acid; + conc HNO3 -> saccharic acid; + 5 Ac2O -> pentaacetate. Glucose, Fructose & Mannose give the SAME yellow Osazone (C-1 & C-2 identical)!'],
      ['Disaccharides & Polysaccharides', 'Sucrose (alpha-D-Glc + beta-D-Fru, C1-C2): NON-REDUCING, no mutarotation, invert sugar! Maltose (alpha 1->4 Glc+Glc) & Lactose (beta 1->4 Gal+Glc): REDUCING! Starch = Amylose (alpha 1->4, water-soluble) + Amylopectin (alpha 1->4 & 1->6).'],
      ['Amino Acids, pI & Nucleic Acids', 'All natural alpha-amino acids are L-config & optically active EXCEPT Glycine (achiral!). Isoelectric point pI = (pKa1 + pKa2)/2 (neutral). DNA bases: A=T (2 H-bonds), G#C (3 H-bonds); RNA has Uracil instead of Thymine.'],
      ['Polymers Master List', 'Nylon-6,6 (HMDA + Adipic acid); Nylon-6 (Caprolactam); Terylene/Dacron (Ethylene glycol + Terephthalic acid); Bakelite (Phenol + HCHO, thermosetting); Buna-S (1,3-butadiene + Styrene); Buna-N (+ Acrylonitrile); Neoprene (Chloroprene).'],
    ],
    formulas: [
      'Natural Rubber: cis-1,4-Polyisoprene (monomer: 2-methyl-1,3-butadiene)  |  Gutta-Percha: trans-1,4-Polyisoprene',
      'Biodegradable Polymers: PHBV (3-hydroxybutanoic acid + 3-hydroxypentanoic acid) & Nylon-2-nylon-6 (Glycine + Aminocaproic acid)',
      'Vitamins: Fat-soluble = A, D, E, K  |  Water-soluble = B-complex & C (B12 contains Cobalt!)',
      'Number of Peptide Bonds in n-Amino Acid Chain = n - 1  |  Tripeptide has 3 amino acids & 2 peptide bonds!',
    ],
    traps: [
      'TRAP 1: Glucose does NOT give Schiff test or NaHSO3 addition test despite having an aldehyde group (proves cyclic hemiacetal pyranose structure!).',
      'TRAP 2: Fructose is a ketohexose yet REDUCES Tollens & Fehling reagents via Lobry de Bruyn-van Ekenstein enediol isomerization in alkaline medium!',
    ],
    pyqs: [
      ['PYQ Check 1', 'Alpha-D-(+)-Glucose ([alpha]=+112 deg) and Beta-D-(+)-Glucose (+19 deg) equilibrate in water to +52.5 deg (Mutarotation: C-1 anomers!).'],
      ['PYQ Check 2', '10 essential amino acids mnemonic: PVT TIM HALL (Phe, Val, Thr, Trp, Ile, Met, His, Arg, Leu, Lys).'],
    ],
  },
  {
    file: 'PREPSKM_Chem_28_POC_JEE.pdf',
    num: '28',
    title: 'Practical Organic Chemistry (POC)',
    subject: 'Chemistry',
    classLabel: 'Class 12 JEE',
    weightage: 4,
    difficulty: 'Easy',
    summary: 'Purification Techniques (Distillation, Steam Distillation, Chromatography Rf), Lassaigne Sodium Fusion Extract (N, S, Halogens, P), Quantitative Estimation (Liebig, Dumas, Kjeldahl, Carius), Functional Group Identification Master Table & Key Distinction Pairs.',
    topics: [
      ['Purification & Chromatography', 'Simple distillation (BP diff > 25 C); Fractional (crude oil, close BP); Reduced pressure (glycerol — decomposes at BP!); Steam distillation (water-immiscible steam-volatile: aniline, o-nitrophenol). Rf = dist travelled by substance / solvent front (<= 1).'],
      ['Lassaigne Test (Sodium Fusion Extract)', 'N -> NaCN -> Prussian blue Fe4[Fe(CN)6]3. S -> Na2S -> Violet Na4[Fe(CN)5NOS] (sodium nitroprusside) & black PbS. BOTH N & S -> NaSCN -> Blood-red [Fe(SCN)]2+!'],
      ['Quantitative Estimation (Dumas, Kjeldahl, Carius)', 'Kjeldahl FAILS for Nitro (-NO2), Azo (-N=N-), and Ring-N (Pyridine)! Use Dumas method for ALL nitrogen compounds. Carius estimates Halogens (as AgX), Sulphur (as BaSO4), and Phosphorus (as Mg2P2O7).'],
      ['Functional Group Distinctions', 'Ceric Ammonium Nitrate (CAN): red colour for alcohols. Bromine water decolourization: alkenes/alkynes/phenols/anilines. Ninhydrin: violet colour for alpha-amino acids (yellow for proline).'],
    ],
    formulas: [
      'Liebig Method: %C = (12/44) * (m_CO2 / m_org) * 100   |   %H = (2/18) * (m_H2O / m_org) * 100',
      'Kjeldahl Method: %N = (1.4 * M_acid * 2 * V_acid_used) / m_org   (or 1.4 * N * V / m_org)',
      'Dumas Method: %N = (28 / 22400) * (V_N2_STP / m_org) * 100',
      'Carius Method: %S = (32/233) * (m_BaSO4 / m_org) * 100  |  %Cl = (35.5/143.5) * (m_AgCl / m_org) * 100',
    ],
    traps: [
      'TRAP 1: In Lassaigne test for halogens when N or S is present, FIRST boil SFE with conc HNO3 to expel HCN and H2S (otherwise AgCN/Ag2S interfere with AgX ppt!).',
      'TRAP 2: Hydrazine (NH2-NH2) does NOT give Lassaigne test for Nitrogen because it contains NO Carbon to form NaCN!',
    ],
    pyqs: [
      ['PYQ Check 1', 'To separate a mixture of o-nitrophenol and p-nitrophenol, ALWAYS use Steam Distillation (o-nitrophenol is steam volatile due to intramolecular H-bonding!).'],
      ['PYQ Check 2', 'In Lassaigne test with excess Sodium, NaSCN breaks into NaCN + Na2S, so blood-red colour may disappear and separate N & S tests become positive!'],
    ],
  },
];

const allDocs = [...PHYSICS_DOCS, ...CHEMISTRY_DOCS];
for (const doc of allDocs) {
  const buf = buildPrepskmPdf(doc);
  fs.writeFileSync(path.join(OUT_DIR, doc.file), buf);
}
console.log(`Generated ${allDocs.length} PREPSKM JEE Concise Notes PDFs in ${OUT_DIR}`);
