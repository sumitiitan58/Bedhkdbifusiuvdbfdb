import fs from 'node:fs';
import path from 'node:path';

/**
 * Generates an exact-fidelity HTML sheet representing all 75 cropped questions
 * and 75 cropped solutions from the "JEE MAIN 2027 FULL SYLLABUS MOCK TEST" PDF,
 * ready to be screenshotted per card into public/assets/mocks/full-mock-test-1/.
 */

const frac = (num, den) =>
  `<span class="frac"><span class="num">${num}</span><span class="den">${den}</span></span>`;
const sqrt = (inner) =>
  `<span class="sqrt"><span class="rad">&radic;</span><span class="radicand">${inner}</span></span>`;
const vec = (v) => `<span class="vec">${v}</span>`;
const hat = (v) => `<span class="hat">${v}</span>`;
const overbar = (v) => `<span class="overbar">${v}</span>`;
const intg = (lo, hi) =>
  lo !== undefined && hi !== undefined
    ? `<span class="int-wrap"><span class="int-sym">&int;</span><span class="int-lim"><span class="hi">${hi}</span><span class="lo">${lo}</span></span></span>`
    : `<span class="int-sym">&int;</span>`;
const lim = (sub) =>
  `<span class="lim-wrap"><span class="lim-word">lim</span><span class="lim-sub">${sub}</span></span>`;
const det3 = (rows) =>
  `<span class="det"><span class="det-bar"></span><span class="det-grid">${rows
    .map((r) => r.map((c) => `<span>${c}</span>`).join(''))
    .join('')}</span><span class="det-bar"></span></span>`;

export const QUESTIONS_DATA = [
  // ===================== PHYSICS SECTION A (Q1-Q20) =====================
  {
    n: 1,
    subject: 'Physics',
    chapter: 'Units, Dimensions & Errors',
    type: 'single-mcq',
    page: 1,
    ansIdx: 2,
    ansLabel: '(C)',
    qHtml: `A physical quantity <i>X</i> is given by <i>X</i> = ${frac('<i>A</i><sup>2</sup><i>B</i><sup>1/2</sup>', '<i>C</i><sup>1/3</sup><i>D</i><sup>3</sup>')}. If the percentage errors in the measurement of <i>A</i>, <i>B</i>, <i>C</i>, and <i>D</i> are 1%, 2%, 3%, and 4% respectively, the maximum percentage error in <i>X</i> is:`,
    optsHtml: ['10%', '12%', '16%', '18%'],
    sHtml: `Maximum percentage error = 2(&Delta;<i>A</i>/<i>A</i>) + ${frac('1', '2')}(&Delta;<i>B</i>/<i>B</i>) + ${frac('1', '3')}(&Delta;<i>C</i>/<i>C</i>) + 3(&Delta;<i>D</i>/<i>D</i>)<br/>= 2(1%) + ${frac('1', '2')}(2%) + ${frac('1', '3')}(3%) + 3(4%) = 2 + 1 + 1 + 12 = <b>16%</b>.`,
  },
  {
    n: 2,
    subject: 'Physics',
    chapter: 'Kinematics',
    type: 'single-mcq',
    page: 1,
    ansIdx: 0,
    ansLabel: '(A)',
    qHtml: `A projectile is launched from horizontal ground such that its horizontal range <i>R</i> is twice the maximum height <i>H</i> attained. If the initial speed is <i>u</i>, its speed at the highest point is:`,
    optsHtml: [frac('<i>u</i>', sqrt('5')), frac('2<i>u</i>', sqrt('5')), frac('<i>u</i>', '2'), frac('<i>u</i>', sqrt('2'))],
    sHtml: `<i>R</i> = 4<i>H</i> cot &theta; &rArr; 2<i>H</i> = 4<i>H</i> cot &theta; &rArr; tan &theta; = 2.<br/>Thus cos &theta; = ${frac('1', sqrt('5'))}. Speed at highest point: <i>v</i> = <i>u</i> cos &theta; = ${frac('<i>u</i>', sqrt('5'))}.`,
  },
  {
    n: 3,
    subject: 'Physics',
    chapter: 'Laws of Motion',
    type: 'single-mcq',
    page: 1,
    ansIdx: 3,
    ansLabel: '(D)',
    qHtml: `A block of mass 2 kg rests on a rough inclined plane making an angle of 37&deg; with the horizontal (&mu; = 0.5). The minimum force parallel to the plane required to just move the block up the incline is (<i>g</i> = 10 m/s<sup>2</sup>, sin 37&deg; = 0.6):`,
    optsHtml: ['4 N', '12 N', '16 N', '20 N'],
    sHtml: `<i>F</i><sub>min</sub> = <i>mg</i> sin 37&deg; + &mu;<i>mg</i> cos 37&deg;<br/>= 2(10)(0.6) + 0.5(2)(10)(0.8) = 12 + 8 = <b>20 N</b>.`,
  },
  {
    n: 4,
    subject: 'Physics',
    chapter: 'Work, Energy & Power',
    type: 'single-mcq',
    page: 1,
    ansIdx: 1,
    ansLabel: '(B)',
    qHtml: `An engine delivers constant power <i>P</i> to a particle of mass <i>m</i> starting from rest along a straight line. The distance <i>s</i> covered in time <i>t</i> is given by:`,
    optsHtml: [
      `${sqrt(frac('2<i>P</i>', '<i>m</i>'))} <i>t</i><sup>3/2</sup>`,
      `${sqrt(frac('8<i>P</i>', '9<i>m</i>'))} <i>t</i><sup>3/2</sup>`,
      `${sqrt(frac('9<i>P</i>', '8<i>m</i>'))} <i>t</i><sup>3/2</sup>`,
      `${frac('2<i>P</i>', '3<i>m</i>')} <i>t</i><sup>2</sup>`,
    ],
    sHtml: `<i>P</i> = <i>mv</i> ${frac('<i>dv</i>', '<i>dt</i>')} &rArr; ${frac('<i>v</i><sup>2</sup>', '2')} = ${frac('<i>Pt</i>', '<i>m</i>')} &rArr; <i>v</i> = ${sqrt(frac('2<i>P</i>', '<i>m</i>'))} <i>t</i><sup>1/2</sup>.<br/>Integrating: <i>s</i> = ${frac('2', '3')}${sqrt(frac('2<i>P</i>', '<i>m</i>'))} <i>t</i><sup>3/2</sup> = ${sqrt(frac('8<i>P</i>', '9<i>m</i>'))} <i>t</i><sup>3/2</sup>.`,
  },
  {
    n: 5,
    subject: 'Physics',
    chapter: 'Rotational Motion',
    type: 'single-mcq',
    page: 1,
    ansIdx: 1,
    ansLabel: '(B)',
    qHtml: `A solid sphere rolls without slipping on a horizontal surface with linear speed <i>v</i>. The ratio of its rotational kinetic energy to its total kinetic energy is:`,
    optsHtml: ['2 : 5', '2 : 7', '5 : 7', '1 : 3'],
    sHtml: `<i>I</i> = ${frac('2', '5')}<i>mR</i><sup>2</sup> &rArr; <i>K</i><sub>rot</sub> = ${frac('1', '2')}<i>I</i>&omega;<sup>2</sup> = ${frac('1', '5')}<i>mv</i><sup>2</sup>.<br/><i>K</i><sub>total</sub> = ${frac('1', '2')}<i>mv</i><sup>2</sup> + ${frac('1', '5')}<i>mv</i><sup>2</sup> = ${frac('7', '10')}<i>mv</i><sup>2</sup> &rArr; Ratio = ${frac('1/5', '7/10')} = ${frac('2', '7')}.`,
  },
  {
    n: 6,
    subject: 'Physics',
    chapter: 'Gravitation',
    type: 'single-mcq',
    page: 2,
    ansIdx: 2,
    ansLabel: '(C)',
    qHtml: `The escape velocity from the surface of Earth is 11.2 km/s. The escape velocity from the surface of a planet having twice the mass and half the radius of Earth is:`,
    optsHtml: ['11.2 km/s', '15.8 km/s', '22.4 km/s', '44.8 km/s'],
    sHtml: `<i>v</i><sub>e</sub> = ${sqrt(frac('2<i>GM</i>', '<i>R</i>'))}. For the planet, <i>v</i><sub>p</sub> = ${sqrt(frac('2<i>G</i>(2<i>M</i><sub>e</sub>)', '<i>R</i><sub>e</sub>/2'))} = 2<i>v</i><sub>e</sub><br/>= 2 &times; 11.2 = <b>22.4 km/s</b>.`,
  },
  {
    n: 7,
    subject: 'Physics',
    chapter: 'Elasticity & Solids',
    type: 'single-mcq',
    page: 2,
    ansIdx: 1,
    ansLabel: '(B)',
    qHtml: `A uniform wire of length <i>L</i>, radius <i>r</i>, and Young's modulus <i>Y</i> is stretched by a force <i>F</i>. The elastic potential energy stored per unit volume of the wire is:`,
    optsHtml: [
      frac('<i>F</i><sup>2</sup>', '2&pi;<i>r</i><sup>2</sup><i>Y</i>'),
      frac('<i>F</i><sup>2</sup>', '2&pi;<sup>2</sup><i>r</i><sup>4</sup><i>Y</i>'),
      frac('<i>F</i><sup>2</sup>', '&pi;<sup>2</sup><i>r</i><sup>4</sup><i>Y</i>'),
      frac('<i>F</i><sup>2</sup><i>L</i>', '2&pi;<i>r</i><sup>2</sup><i>Y</i>'),
    ],
    sHtml: `Energy density <i>u</i> = ${frac('(Stress)<sup>2</sup>', '2<i>Y</i>')} = ${frac('(<i>F</i>/&pi;<i>r</i><sup>2</sup>)<sup>2</sup>', '2<i>Y</i>')} = ${frac('<i>F</i><sup>2</sup>', '2&pi;<sup>2</sup><i>r</i><sup>4</sup><i>Y</i>')}.`,
  },
  {
    n: 8,
    subject: 'Physics',
    chapter: 'Thermodynamics',
    type: 'single-mcq',
    page: 2,
    ansIdx: 2,
    ansLabel: '(C)',
    qHtml: `A Carnot engine operates between a source at 600 K and a sink at 300 K. If it absorbs 1000 J of heat per cycle from the source, the net work done per cycle is:`,
    optsHtml: ['250 J', '400 J', '500 J', '750 J'],
    sHtml: `Efficiency &eta; = 1 &minus; ${frac('<i>T</i><sub>2</sub>', '<i>T</i><sub>1</sub>')} = 1 &minus; ${frac('300', '600')} = 0.5.<br/>Work done <i>W</i> = &eta;<i>Q</i><sub>1</sub> = 0.5 &times; 1000 = <b>500 J</b>.`,
  },
  {
    n: 9,
    subject: 'Physics',
    chapter: 'Kinetic Theory of Gases',
    type: 'single-mcq',
    page: 2,
    ansIdx: 0,
    ansLabel: '(A)',
    qHtml: `The ratio of the root mean square (rms) speed of oxygen (O<sub>2</sub>) molecules to that of hydrogen (H<sub>2</sub>) molecules at the same temperature of 300 K is:`,
    optsHtml: ['1 : 4', '4 : 1', '1 : 16', '1 : 2'],
    sHtml: `<i>v</i><sub>rms</sub> &prop; ${frac('1', sqrt('<i>M</i>'))} &rArr; ${frac('<i>v</i><sub>O<sub>2</sub></sub>', '<i>v</i><sub>H<sub>2</sub></sub>')} = ${sqrt(frac('<i>M</i><sub>H<sub>2</sub></sub>', '<i>M</i><sub>O<sub>2</sub></sub>'))} = ${sqrt(frac('2', '32'))} = ${frac('1', '4')}.`,
  },
  {
    n: 10,
    subject: 'Physics',
    chapter: 'Simple Harmonic Motion',
    type: 'single-mcq',
    page: 2,
    ansIdx: 1,
    ansLabel: '(B)',
    qHtml: `A particle executes simple harmonic motion (SHM) with amplitude <i>A</i>. The displacement from the mean position at which its kinetic energy equals its potential energy is:`,
    optsHtml: [
      `&plusmn;${frac('<i>A</i>', '2')}`,
      `&plusmn;${frac('<i>A</i>', sqrt('2'))}`,
      `&plusmn;${frac('<i>A</i>', '4')}`,
      `&plusmn;${frac(`${sqrt('3')}<i>A</i>`, '2')}`,
    ],
    sHtml: `<i>K</i> = <i>U</i> &rArr; ${frac('1', '2')}<i>k</i>(<i>A</i><sup>2</sup> &minus; <i>x</i><sup>2</sup>) = ${frac('1', '2')}<i>kx</i><sup>2</sup> &rArr; 2<i>x</i><sup>2</sup> = <i>A</i><sup>2</sup> &rArr; <i>x</i> = &plusmn;${frac('<i>A</i>', sqrt('2'))}.`,
  },
  {
    n: 11,
    subject: 'Physics',
    chapter: 'Electrostatics',
    type: 'single-mcq',
    page: 3,
    ansIdx: 1,
    ansLabel: '(B)',
    qHtml: `Two point charges +4<i>q</i> and &minus;<i>q</i> are fixed at a separation <i>d</i>. A third charge placed on the line joining them experiences zero net electrostatic force at a distance:`,
    optsHtml: [
      '<i>d</i>/3 from &minus;<i>q</i> between them',
      '<i>d</i> from &minus;<i>q</i> away from +4<i>q</i>',
      '<i>d</i>/2 from +4<i>q</i>',
      '2<i>d</i> from +4<i>q</i>',
    ],
    optsLayout: 'grid2',
    sHtml: `Null point lies outside near the smaller magnitude charge (&minus;<i>q</i>).<br/>${frac('<i>k</i>(4<i>q</i>)', '(<i>d</i> + <i>x</i>)<sup>2</sup>')} = ${frac('<i>kq</i>', '<i>x</i><sup>2</sup>')} &rArr; ${frac('2', '<i>d</i> + <i>x</i>')} = ${frac('1', '<i>x</i>')} &rArr; <b><i>x</i> = <i>d</i></b> from &minus;<i>q</i>.`,
  },
  {
    n: 12,
    subject: 'Physics',
    chapter: 'Capacitors',
    type: 'single-mcq',
    page: 3,
    ansIdx: 0,
    ansLabel: '(A)',
    qHtml: `A 10 &mu;F parallel plate capacitor is charged to 100 V and then disconnected from the battery. A dielectric slab of dielectric constant <i>K</i> = 4 is then inserted to completely fill the space. The final energy stored is:`,
    optsHtml: ['12.5 mJ', '25 mJ', '50 mJ', '200 mJ'],
    sHtml: `Initial energy <i>U</i><sub>i</sub> = ${frac('1', '2')}<i>CV</i><sup>2</sup> = ${frac('1', '2')}(10 &times; 10<sup>&minus;6</sup>)(100)<sup>2</sup> = 50 mJ.<br/>Battery disconnected &rArr; <i>Q</i> constant &rArr; <i>U</i><sub>f</sub> = <i>U</i><sub>i</sub>/<i>K</i> = 50/4 = <b>12.5 mJ</b>.`,
  },
  {
    n: 13,
    subject: 'Physics',
    chapter: 'Current Electricity',
    type: 'single-mcq',
    page: 3,
    ansIdx: 1,
    ansLabel: '(B)',
    qHtml: `A uniform metallic wire of resistance 16 &Omega; is stretched uniformly to double its original length without any change in volume. Its new resistance is:`,
    optsHtml: ['32 &Omega;', '64 &Omega;', '8 &Omega;', '128 &Omega;'],
    sHtml: `Volume <i>V</i> = <i>Al</i> is constant. When <i>l</i>&prime; = 2<i>l</i>, <i>A</i>&prime; = <i>A</i>/2.<br/><i>R</i>&prime; = &rho;(2<i>l</i>)/(<i>A</i>/2) = 4<i>R</i> = 4 &times; 16 = <b>64 &Omega;</b>.`,
  },
  {
    n: 14,
    subject: 'Physics',
    chapter: 'Moving Charges & Magnetism',
    type: 'single-mcq',
    page: 3,
    ansIdx: 2,
    ansLabel: '(C)',
    qHtml: `A proton and an &alpha;-particle enter a uniform magnetic field perpendicularly with the same kinetic energy. The ratio of the radii of their circular paths (<i>r</i><sub>p</sub> : <i>r</i><sub>&alpha;</sub>) is:`,
    optsHtml: ['1 : 2', '2 : 1', '1 : 1', '1 : 4'],
    sHtml: `<i>r</i> = ${frac(sqrt('2<i>mK</i>'), '<i>qB</i>')} &rArr; ${frac('<i>r</i><sub>p</sub>', '<i>r</i><sub>&alpha;</sub>')} = ${sqrt(frac('<i>m</i><sub>p</sub>', '<i>m</i><sub>&alpha;</sub>'))} &middot; ${frac('<i>q</i><sub>&alpha;</sub>', '<i>q</i><sub>p</sub>')} = ${sqrt(frac('1', '4'))} &middot; ${frac('2', '1')} = <b>1 : 1</b>.`,
  },
  {
    n: 15,
    subject: 'Physics',
    chapter: 'Alternating Current',
    type: 'single-mcq',
    page: 3,
    ansIdx: 1,
    ansLabel: '(B)',
    qHtml: `In a series LCR circuit, <i>R</i> = 30 &Omega;, <i>X</i><sub>L</sub> = 80 &Omega;, and <i>X</i><sub>C</sub> = 40 &Omega; connected across a 200 V AC source. The power factor of the circuit is:`,
    optsHtml: ['0.5', '0.6', '0.8', '1.0'],
    sHtml: `Impedance <i>Z</i> = ${sqrt('<i>R</i><sup>2</sup> + (<i>X</i><sub>L</sub> &minus; <i>X</i><sub>C</sub>)<sup>2</sup>')} = ${sqrt('30<sup>2</sup> + 40<sup>2</sup>')} = 50 &Omega;.<br/>Power factor cos &phi; = <i>R</i>/<i>Z</i> = 30/50 = <b>0.6</b>.`,
  },
  {
    n: 16,
    subject: 'Physics',
    chapter: 'Electromagnetic Waves',
    type: 'single-mcq',
    page: 4,
    ansIdx: 0,
    ansLabel: '(A)',
    qHtml: `The electric field amplitude of a plane electromagnetic wave propagating in vacuum is <i>E</i><sub>0</sub> = 60 V/m. The magnetic field amplitude <i>B</i><sub>0</sub> is (<i>c</i> = 3 &times; 10<sup>8</sup> m/s):`,
    optsHtml: ['2 &times; 10<sup>&minus;7</sup> T', '1.8 &times; 10<sup>&minus;7</sup> T', '2 &times; 10<sup>&minus;8</sup> T', '5 &times; 10<sup>&minus;7</sup> T'],
    sHtml: `<i>B</i><sub>0</sub> = ${frac('<i>E</i><sub>0</sub>', '<i>c</i>')} = ${frac('60', '3 &times; 10<sup>8</sup>')} = <b>2 &times; 10<sup>&minus;7</sup> T</b>.`,
  },
  {
    n: 17,
    subject: 'Physics',
    chapter: 'Ray Optics',
    type: 'single-mcq',
    page: 4,
    ansIdx: 2,
    ansLabel: '(C)',
    qHtml: `A convex lens of focal length 20 cm forms a real image twice the size of the object. The distance of the object from the lens is:`,
    optsHtml: ['10 cm', '20 cm', '30 cm', '40 cm'],
    sHtml: `For a real magnified image, <i>m</i> = &minus;2. Using <i>m</i> = ${frac('<i>f</i>', '<i>f</i> + <i>u</i>')}:<br/>&minus;2 = ${frac('20', '20 + <i>u</i>')} &rArr; &minus;40 &minus; 2<i>u</i> = 20 &rArr; <i>u</i> = &minus;30 cm (distance = <b>30 cm</b>).`,
  },
  {
    n: 18,
    subject: 'Physics',
    chapter: 'Wave Optics',
    type: 'single-mcq',
    page: 4,
    ansIdx: 1,
    ansLabel: '(B)',
    qHtml: `In Young's double slit experiment (YDSE), slit separation <i>d</i> = 1 mm, screen distance <i>D</i> = 1 m, and wavelength &lambda; = 600 nm. The fringe width is:`,
    optsHtml: ['0.3 mm', '0.6 mm', '1.2 mm', '6.0 mm'],
    sHtml: `Fringe width &beta; = ${frac('&lambda;<i>D</i>', '<i>d</i>')} = ${frac('600 &times; 10<sup>&minus;9</sup> &times; 1', '1 &times; 10<sup>&minus;3</sup>')} = 6 &times; 10<sup>&minus;4</sup> m = <b>0.6 mm</b>.`,
  },
  {
    n: 19,
    subject: 'Physics',
    chapter: 'Dual Nature of Matter',
    type: 'single-mcq',
    page: 4,
    ansIdx: 1,
    ansLabel: '(B)',
    qHtml: `The de Broglie wavelength of an electron accelerated from rest through a potential difference of 100 V is approximately:`,
    optsHtml: ['0.123 &Aring;', '1.227 &Aring;', '12.27 &Aring;', '0.614 &Aring;'],
    sHtml: `&lambda; = ${frac('12.27', sqrt('<i>V</i>'))} &Aring; = ${frac('12.27', sqrt('100'))} &Aring; = <b>1.227 &Aring;</b>.`,
  },
  {
    n: 20,
    subject: 'Physics',
    chapter: 'Semiconductors & Logic Gates',
    type: 'single-mcq',
    page: 4,
    ansIdx: 2,
    ansLabel: '(C)',
    qHtml: `The output of a two-input NAND gate is connected to the input of a NOT gate. The resulting combination acts as a:`,
    optsHtml: ['OR gate', 'NOR gate', 'AND gate', 'XOR gate'],
    sHtml: `NAND output is ${overbar('<i>A</i> &middot; <i>B</i>')}. Passing through NOT gives <i>Y</i> = ${overbar(overbar('<i>A</i> &middot; <i>B</i>'))} = <i>A</i> &middot; <i>B</i>, which is an <b>AND gate</b>.`,
  },

  // ===================== PHYSICS SECTION B (Q21-Q25) =====================
  {
    n: 21,
    subject: 'Physics',
    chapter: 'Rotational Motion',
    type: 'integer',
    page: 5,
    numAns: '50',
    ansLabel: '50',
    qHtml: `A uniform circular disc of mass 2 kg and radius 0.5 m rotates about its central perpendicular axis at 20 rad/s. Find its rotational kinetic energy (in J).`,
    sHtml: `<i>I</i> = ${frac('1', '2')}<i>mr</i><sup>2</sup> = ${frac('1', '2')}(2)(0.5)<sup>2</sup> = 0.25 kg m<sup>2</sup>.<br/><i>K</i> = ${frac('1', '2')}<i>I</i>&omega;<sup>2</sup> = ${frac('1', '2')}(0.25)(20)<sup>2</sup> = <b>50 J</b>.`,
  },
  {
    n: 22,
    subject: 'Physics',
    chapter: 'Current Electricity',
    type: 'integer',
    page: 5,
    numAns: '30',
    ansLabel: '30',
    qHtml: `In a balanced Wheatstone bridge, three resistances are <i>P</i> = 10 &Omega;, <i>Q</i> = 20 &Omega;, and <i>R</i> = 15 &Omega;. Find the fourth resistance <i>S</i> (in &Omega;).`,
    sHtml: `Balance condition: ${frac('<i>P</i>', '<i>Q</i>')} = ${frac('<i>R</i>', '<i>S</i>')} &rArr; ${frac('10', '20')} = ${frac('15', '<i>S</i>')} &rArr; <i>S</i> = <b>30 &Omega;</b>.`,
  },
  {
    n: 23,
    subject: 'Physics',
    chapter: 'Thermodynamics & KTG',
    type: 'integer',
    page: 5,
    numAns: '2490',
    ansLabel: '2490',
    qHtml: `2 moles of an ideal monoatomic gas are heated at constant volume from 300 K to 400 K. Find the heat supplied (in J). (Take <i>R</i> = 8.3 J mol<sup>&minus;1</sup>K<sup>&minus;1</sup>)`,
    sHtml: `<i>Q</i><sub>V</sub> = <i>nC</i><sub>V</sub>&Delta;<i>T</i> = 2 &times; (${frac('3', '2')}<i>R</i>) &times; (400 &minus; 300) = 3 &times; 8.3 &times; 100 = <b>2490 J</b>.`,
  },
  {
    n: 24,
    subject: 'Physics',
    chapter: 'Nuclei & Radioactivity',
    type: 'integer',
    page: 5,
    numAns: '20',
    ansLabel: '20',
    qHtml: `The half-life of a radioactive nuclide is 10 days. Find the time (in days) required for 75% of the initial sample to decay.`,
    sHtml: `75% decayed &rArr; 25% = ${frac('1', '4')} = (${frac('1', '2')})<sup>2</sup> remains.<br/>Number of half-lives <i>n</i> = 2 &rArr; <i>t</i> = 2 &times; 10 = <b>20 days</b>.`,
  },
  {
    n: 25,
    subject: 'Physics',
    chapter: 'Ray Optics',
    type: 'integer',
    page: 5,
    numAns: '30',
    ansLabel: '30',
    qHtml: `An equilateral glass prism (<i>A</i> = 60&deg;) has refractive index &mu; = ${sqrt('2')}. Find the angle of minimum deviation &delta;<sub>m</sub> (in degrees).`,
    sHtml: `&mu; = ${frac('sin((<i>A</i> + &delta;<sub>m</sub>)/2)', 'sin(<i>A</i>/2)')} &rArr; ${sqrt('2')} = ${frac('sin((60&deg; + &delta;<sub>m</sub>)/2)', 'sin 30&deg;')}<br/>sin(${frac('60&deg; + &delta;<sub>m</sub>', '2')}) = ${frac('1', sqrt('2'))} = sin 45&deg; &rArr; &delta;<sub>m</sub> = <b>30&deg;</b>.`,
  },

  // ===================== CHEMISTRY SECTION A (Q26-Q45) =====================
  {
    n: 26,
    subject: 'Chemistry',
    chapter: 'Mole Concept',
    type: 'single-mcq',
    page: 6,
    ansIdx: 1,
    ansLabel: '(B)',
    qHtml: `The mass of CO<sub>2</sub> produced by complete thermal decomposition of 50 g of 80% pure CaCO<sub>3</sub> is (Atomic masses: Ca = 40, C = 12, O = 16):`,
    optsHtml: ['8.8 g', '17.6 g', '22.0 g', '35.2 g'],
    sHtml: `Pure CaCO<sub>3</sub> = 0.80 &times; 50 = 40 g = ${frac('40', '100')} = 0.4 mol.<br/>CaCO<sub>3</sub> &rarr; CaO + CO<sub>2</sub> gives 0.4 mol CO<sub>2</sub> = 0.4 &times; 44 = <b>17.6 g</b>.`,
  },
  {
    n: 27,
    subject: 'Chemistry',
    chapter: 'Atomic Structure',
    type: 'single-mcq',
    page: 6,
    ansIdx: 1,
    ansLabel: '(B)',
    qHtml: `The energy of an electron in the 2nd Bohr orbit of the He<sup>+</sup> ion is:`,
    optsHtml: ['&minus;3.4 eV', '&minus;13.6 eV', '&minus;27.2 eV', '&minus;54.4 eV'],
    sHtml: `<i>E</i><sub>n</sub> = &minus;13.6 &times; ${frac('<i>Z</i><sup>2</sup>', '<i>n</i><sup>2</sup>')} eV.<br/>For He<sup>+</sup> (<i>Z</i> = 2, <i>n</i> = 2): <i>E</i><sub>2</sub> = &minus;13.6 &times; ${frac('4', '4')} = <b>&minus;13.6 eV</b>.`,
  },
  {
    n: 28,
    subject: 'Chemistry',
    chapter: 'Chemical Bonding',
    type: 'single-mcq',
    page: 6,
    ansIdx: 2,
    ansLabel: '(C)',
    qHtml: `According to VSEPR theory, the hybridisation of Xenon and the molecular geometry of XeF<sub>4</sub> are respectively:`,
    optsHtml: [
      '<i>sp</i><sup>3</sup>, tetrahedral',
      '<i>dsp</i><sup>2</sup>, square planar',
      '<i>sp</i><sup>3</sup><i>d</i><sup>2</sup>, square planar',
      '<i>sp</i><sup>3</sup><i>d</i>, see-saw',
    ],
    optsLayout: 'grid2',
    sHtml: `Xe has 8 valence electrons: 4 bond pairs + 2 lone pairs &rArr; steric number 6 (<i>sp</i><sup>3</sup><i>d</i><sup>2</sup>).<br/>Two lone pairs occupy axial sites &rArr; <b>square planar</b> shape.`,
  },
  {
    n: 29,
    subject: 'Chemistry',
    chapter: 'Chemical Thermodynamics',
    type: 'single-mcq',
    page: 6,
    ansIdx: 0,
    ansLabel: '(A)',
    qHtml: `For a reaction, &Delta;<i>H</i> = &minus;40 kJ mol<sup>&minus;1</sup> and &Delta;<i>S</i> = &minus;100 J K<sup>&minus;1</sup>mol<sup>&minus;1</sup>. Assuming both are temperature independent, the reaction is spontaneous at:`,
    optsHtml: ['<i>T</i> &lt; 400 K', '<i>T</i> &gt; 400 K', '<i>T</i> = 500 K', 'All temperatures'],
    sHtml: `For spontaneity, &Delta;<i>G</i> = &Delta;<i>H</i> &minus; <i>T</i>&Delta;<i>S</i> &lt; 0.<br/>&minus;40000 &minus; <i>T</i>(&minus;100) &lt; 0 &rArr; 100<i>T</i> &lt; 40000 &rArr; <b><i>T</i> &lt; 400 K</b>.`,
  },
  {
    n: 30,
    subject: 'Chemistry',
    chapter: 'Ionic Equilibrium',
    type: 'single-mcq',
    page: 6,
    ansIdx: 2,
    ansLabel: '(C)',
    qHtml: `The pH of a 0.1 M aqueous solution of acetic acid (<i>K</i><sub>a</sub> = 1.0 &times; 10<sup>&minus;5</sup>) at 298 K is:`,
    optsHtml: ['1', '2', '3', '5'],
    sHtml: `[H<sup>+</sup>] = ${sqrt('<i>K</i><sub>a</sub> &middot; <i>C</i>')} = ${sqrt('10<sup>&minus;5</sup> &times; 0.1')} = 10<sup>&minus;3</sup> M.<br/>pH = &minus;log(10<sup>&minus;3</sup>) = <b>3</b>.`,
  },
  {
    n: 31,
    subject: 'Chemistry',
    chapter: 'Solutions',
    type: 'single-mcq',
    page: 7,
    ansIdx: 1,
    ansLabel: '(B)',
    qHtml: `The relative lowering of vapour pressure when 18 g of glucose (<i>M</i> = 180) is dissolved in 178.2 g of water (<i>M</i> = 18) is:`,
    optsHtml: ['0.001', '0.01', '0.02', '0.1'],
    sHtml: `<i>n</i><sub>2</sub> = 18/180 = 0.1 mol; <i>n</i><sub>1</sub> = 178.2/18 = 9.9 mol.<br/>&Delta;<i>P</i>/<i>P</i><sup>&deg;</sup> = &chi;<sub>2</sub> = 0.1/(0.1 + 9.9) = 0.1/10 = <b>0.01</b>.`,
  },
  {
    n: 32,
    subject: 'Chemistry',
    chapter: 'Electrochemistry',
    type: 'single-mcq',
    page: 7,
    ansIdx: 2,
    ansLabel: '(C)',
    qHtml: `For the cell Zn(<i>s</i>)|Zn<sup>2+</sup>(0.1 M)||Cu<sup>2+</sup>(1.0 M)|Cu(<i>s</i>) at 298 K, given <i>E</i><sup>&deg;</sup><sub>cell</sub> = 1.10 V and 2.303<i>RT</i>/<i>F</i> &approx; 0.06 V, the cell EMF is:`,
    optsHtml: ['1.07 V', '1.10 V', '1.13 V', '1.16 V'],
    sHtml: `<i>E</i> = <i>E</i><sup>&deg;</sup> &minus; ${frac('0.06', '2')} log ${frac('[Zn<sup>2+</sup>]', '[Cu<sup>2+</sup>]')} = 1.10 &minus; 0.03 log(0.1/1.0)<br/>= 1.10 &minus; 0.03(&minus;1) = <b>1.13 V</b>.`,
  },
  {
    n: 33,
    subject: 'Chemistry',
    chapter: 'Chemical Kinetics',
    type: 'single-mcq',
    page: 7,
    ansIdx: 1,
    ansLabel: '(B)',
    qHtml: `A first-order reaction is 75% completed in 40 minutes. Its half-life period (<i>t</i><sub>1/2</sub>) is:`,
    optsHtml: ['10 min', '20 min', '30 min', '40 min'],
    sHtml: `For first-order kinetics, <i>t</i><sub>75%</sub> = 2<i>t</i><sub>1/2</sub>.<br/>Hence 2<i>t</i><sub>1/2</sub> = 40 min &rArr; <i>t</i><sub>1/2</sub> = <b>20 min</b>.`,
  },
  {
    n: 34,
    subject: 'Chemistry',
    chapter: 'Periodic Table & Properties',
    type: 'single-mcq',
    page: 7,
    ansIdx: 1,
    ansLabel: '(B)',
    qHtml: `The correct increasing order of first ionisation enthalpy (&Delta;<sub>i</sub><i>H</i><sub>1</sub>) among B, C, N, and O is:`,
    optsHtml: ['B &lt; C &lt; N &lt; O', 'B &lt; C &lt; O &lt; N', 'C &lt; B &lt; O &lt; N', 'B &lt; O &lt; C &lt; N'],
    sHtml: `Ionisation enthalpy increases across period 2, but N (2<i>p</i><sup>3</sup>, half-filled stable configuration) has higher &Delta;<sub>i</sub><i>H</i><sub>1</sub> than O (2<i>p</i><sup>4</sup>): <b>B &lt; C &lt; O &lt; N</b>.`,
  },
  {
    n: 35,
    subject: 'Chemistry',
    chapter: 'd- and f-Block Elements',
    type: 'single-mcq',
    page: 7,
    ansIdx: 3,
    ansLabel: '(D)',
    qHtml: `The spin-only magnetic moment of Mn<sup>2+</sup> ion (<i>Z</i> = 25) in Bohr Magnetons (BM) is:`,
    optsHtml: ['1.73 BM', '3.87 BM', '4.90 BM', '5.92 BM'],
    sHtml: `Mn<sup>2+</sup> has configuration [Ar] 3<i>d</i><sup>5</sup> &rArr; <i>n</i> = 5 unpaired electrons.<br/>&mu; = ${sqrt('<i>n</i>(<i>n</i> + 2)')} = ${sqrt('5(7)')} = ${sqrt('35')} &approx; <b>5.92 BM</b>.`,
  },
  {
    n: 36,
    subject: 'Chemistry',
    chapter: 'Coordination Compounds',
    type: 'single-mcq',
    page: 8,
    ansIdx: 1,
    ansLabel: '(B)',
    qHtml: `The IUPAC name of the coordination compound [Co(NH<sub>3</sub>)<sub>5</sub>Cl]Cl<sub>2</sub> is:`,
    optsHtml: [
      'Pentaamminechloridocobalt(II) chloride',
      'Pentaamminechloridocobalt(III) chloride',
      'Pentamminecobalt(III) trichloride',
      'Chloridopentaamminecobalt(III) chloride',
    ],
    optsLayout: 'stack',
    sHtml: `Oxidation state of Co: <i>x</i> + 5(0) + (&minus;1) = +2 &rArr; <i>x</i> = +3. Ligands alphabetically: ammine before chlorido &rArr; <b>Pentaamminechloridocobalt(III) chloride</b>.`,
  },
  {
    n: 37,
    subject: 'Chemistry',
    chapter: 'Alcohols, Phenols & Ethers',
    type: 'single-mcq',
    page: 8,
    ansIdx: 3,
    ansLabel: '(D)',
    qHtml: `Which of the following is the strongest acid?`,
    optsHtml: ['Ethanol', 'Phenol', '<i>p</i>-Methylphenol', '<i>p</i>-Nitrophenol'],
    sHtml: `The &minus;NO<sub>2</sub> group at the <i>para</i> position exerts strong &minus;<i>M</i> and &minus;<i>I</i> effects, strongly stabilising the phenoxide conjugate base.`,
  },
  {
    n: 38,
    subject: 'Chemistry',
    chapter: 'Haloalkanes & Haloarenes',
    type: 'single-mcq',
    page: 8,
    ansIdx: 1,
    ansLabel: '(B)',
    qHtml: `Heating 2-bromobutane with alcoholic KOH predominantly yields:`,
    optsHtml: ['But-1-ene', 'But-2-ene', 'Butan-2-ol', 'But-1-yne'],
    sHtml: `Alcoholic KOH promotes E2 dehydrohalogenation following Zaitsev's rule, forming the more substituted alkene <b>But-2-ene</b> as major product.`,
  },
  {
    n: 39,
    subject: 'Chemistry',
    chapter: 'Aldehydes, Ketones & Acids',
    type: 'single-mcq',
    page: 8,
    ansIdx: 1,
    ansLabel: '(B)',
    qHtml: `Which of the following aldehydes gives a yellow precipitate upon warming with I<sub>2</sub> and aqueous NaOH (iodoform test)?`,
    optsHtml: ['HCHO', 'CH<sub>3</sub>CHO', 'CH<sub>3</sub>CH<sub>2</sub>CHO', 'C<sub>6</sub>H<sub>5</sub>CHO'],
    sHtml: `Iodoform test requires a CH<sub>3</sub>C(=O)&minus; group. Only acetaldehyde (<b>CH<sub>3</sub>CHO</b>) possesses this group among aldehydes.`,
  },
  {
    n: 40,
    subject: 'Chemistry',
    chapter: 'Biomolecules',
    type: 'single-mcq',
    page: 8,
    ansIdx: 3,
    ansLabel: '(D)',
    qHtml: `Which of the following carbohydrates is a non-reducing sugar?`,
    optsHtml: ['Glucose', 'Maltose', 'Lactose', 'Sucrose'],
    sHtml: `In <b>sucrose</b>, the glycosidic linkage connects C1 of &alpha;-D-glucose and C2 of &beta;-D-fructose, leaving no free hemiacetal/hemiketal group.`,
  },
  {
    n: 41,
    subject: 'Chemistry',
    chapter: 'Redox Reactions',
    type: 'single-mcq',
    page: 9,
    ansIdx: 1,
    ansLabel: '(B)',
    qHtml: `The oxidation states of chromium in K<sub>2</sub>Cr<sub>2</sub>O<sub>7</sub> and CrO<sub>5</sub> are respectively:`,
    optsHtml: ['+6 and +10', '+6 and +6', '+7 and +6', '+3 and +6'],
    sHtml: `In K<sub>2</sub>Cr<sub>2</sub>O<sub>7</sub>, Cr is +6. In CrO<sub>5</sub> (butterfly structure), two peroxo (&minus;O&minus;O&minus;) linkages exist: <i>x</i> + 4(&minus;1) + (&minus;2) = 0 &rArr; <b>+6</b>.`,
  },
  {
    n: 42,
    subject: 'Chemistry',
    chapter: 'd- and f-Block Elements',
    type: 'single-mcq',
    page: 9,
    ansIdx: 0,
    ansLabel: '(A)',
    qHtml: `Which of the following transition metal ions is colourless in aqueous solution?`,
    optsHtml: ['Ti<sup>4+</sup>', 'V<sup>3+</sup>', 'Cr<sup>3+</sup>', 'Fe<sup>2+</sup>'],
    sHtml: `Ti<sup>4+</sup> has a 3<i>d</i><sup>0</sup> configuration with zero unpaired electrons; hence no <i>d</i>&minus;<i>d</i> transitions occur and it is <b>colourless</b>.`,
  },
  {
    n: 43,
    subject: 'Chemistry',
    chapter: 'Amines',
    type: 'single-mcq',
    page: 9,
    ansIdx: 2,
    ansLabel: '(C)',
    qHtml: `Gabriel phthalimide synthesis is specifically used for the preparation of:`,
    optsHtml: [
      'Primary aromatic amines',
      'Secondary aliphatic amines',
      'Primary aliphatic amines',
      'Tertiary aliphatic amines',
    ],
    optsLayout: 'grid2',
    sHtml: `Phthalimide anion undergoes S<sub>N</sub>2 with alkyl halides (not aryl halides) to cleanly yield <b>primary aliphatic amines</b>.`,
  },
  {
    n: 44,
    subject: 'Chemistry',
    chapter: 'Alcohols, Phenols & Ethers',
    type: 'single-mcq',
    page: 9,
    ansIdx: 1,
    ansLabel: '(B)',
    qHtml: `Treatment of phenol with CHCl<sub>3</sub> and aqueous NaOH at 340 K followed by acidification yields:`,
    optsHtml: ['Salicylic acid', 'Salicylaldehyde', 'Benzoic acid', 'Picric acid'],
    sHtml: `This is the <b>Reimer&ndash;Tiemann reaction</b>, introducing a &minus;CHO group predominantly at the <i>ortho</i> position to give <b>salicylaldehyde</b>.`,
  },
  {
    n: 45,
    subject: 'Chemistry',
    chapter: 'Practical Organic Chemistry',
    type: 'single-mcq',
    page: 9,
    ansIdx: 1,
    ansLabel: '(B)',
    qHtml: `In Lassaigne's test for nitrogen in an organic compound, the Prussian blue colour is due to the formation of:`,
    optsHtml: [
      'Na<sub>4</sub>[Fe(CN)<sub>6</sub>]',
      'Fe<sub>4</sub>[Fe(CN)<sub>6</sub>]<sub>3</sub>',
      'Fe<sub>3</sub>[Fe(CN)<sub>6</sub>]<sub>2</sub>',
      'Fe(SCN)<sub>3</sub>',
    ],
    optsLayout: 'grid2',
    sHtml: `Sodium ferrocyanide reacts with Fe<sup>3+</sup> ions to produce ferric ferrocyanide, <b>Fe<sub>4</sub>[Fe(CN)<sub>6</sub>]<sub>3</sub></b> (Prussian blue).`,
  },

  // ===================== CHEMISTRY SECTION B (Q46-Q50) =====================
  {
    n: 46,
    subject: 'Chemistry',
    chapter: 'Mole Concept & Volumetric Analysis',
    type: 'integer',
    page: 10,
    numAns: '50',
    ansLabel: '50',
    qHtml: `Find the volume (in mL) of 0.5 M H<sub>2</sub>SO<sub>4</sub> required to completely neutralise 50 mL of 1.0 M NaOH solution.`,
    sHtml: `<i>N</i><sub>1</sub><i>V</i><sub>1</sub> = <i>N</i><sub>2</sub><i>V</i><sub>2</sub>. For H<sub>2</sub>SO<sub>4</sub>, <i>N</i><sub>1</sub> = 2 &times; 0.5 = 1.0 N; for NaOH, <i>N</i><sub>2</sub> = 1.0 N.<br/>1.0 &times; <i>V</i><sub>1</sub> = 1.0 &times; 50 &rArr; <i>V</i><sub>1</sub> = <b>50 mL</b>.`,
  },
  {
    n: 47,
    subject: 'Chemistry',
    chapter: 'Chemical Thermodynamics',
    type: 'integer',
    page: 10,
    numAns: '890',
    ansLabel: '890',
    qHtml: `The standard internal energy change &Delta;<i>U</i><sup>&deg;</sup> for combustion of 1 mole of CH<sub>4</sub>(<i>g</i>) at 300 K is &minus;885 kJ mol<sup>&minus;1</sup>. Find the magnitude of &Delta;<i>H</i><sup>&deg;</sup> (in kJ mol<sup>&minus;1</sup>, rounded to nearest integer). (<i>R</i> = 8.3 J K<sup>&minus;1</sup>mol<sup>&minus;1</sup>)`,
    sHtml: `CH<sub>4</sub>(<i>g</i>) + 2O<sub>2</sub>(<i>g</i>) &rarr; CO<sub>2</sub>(<i>g</i>) + 2H<sub>2</sub>O(<i>l</i>) &rArr; &Delta;<i>n</i><sub>g</sub> = 1 &minus; 3 = &minus;2.<br/>&Delta;<i>H</i><sup>&deg;</sup> = &minus;885 + (&minus;2)(8.3 &times; 10<sup>&minus;3</sup>)(300) = &minus;889.98 &approx; <b>890</b> (magnitude).`,
  },
  {
    n: 48,
    subject: 'Chemistry',
    chapter: 'Chemical Equilibrium',
    type: 'integer',
    page: 10,
    numAns: '2',
    ansLabel: '2',
    qHtml: `For <i>A</i>(<i>g</i>) &rlhar; 2<i>B</i>(<i>g</i>), <i>K</i><sub>c</sub> = 4 mol L<sup>&minus;1</sup>. Starting with 2 moles of <i>A</i> in a 1 L vessel, find the equilibrium concentration of <i>B</i> (in mol L<sup>&minus;1</sup>).`,
    sHtml: `At eq.: [<i>A</i>] = 2 &minus; <i>x</i>, [<i>B</i>] = 2<i>x</i>. <i>K</i><sub>c</sub> = ${frac('(2<i>x</i>)<sup>2</sup>', '2 &minus; <i>x</i>')} = 4<br/>&rArr; <i>x</i><sup>2</sup> + <i>x</i> &minus; 2 = 0 &rArr; <i>x</i> = 1 &rArr; [<i>B</i>]<sub>eq</sub> = 2<i>x</i> = <b>2</b>.`,
  },
  {
    n: 49,
    subject: 'Chemistry',
    chapter: 'Coordination Compounds',
    type: 'integer',
    page: 10,
    numAns: '2',
    ansLabel: '2',
    qHtml: `Find the total number of geometrical isomers possible for the square planar complex [Pt(NH<sub>3</sub>)<sub>2</sub>Cl<sub>2</sub>].`,
    sHtml: `Square planar [Ma<sub>2</sub>b<sub>2</sub>] exhibits exactly <b>2</b> geometrical isomers: <i>cis</i>-platin and <i>trans</i>-platin.`,
  },
  {
    n: 50,
    subject: 'Chemistry',
    chapter: 'IUPAC & Isomerism',
    type: 'integer',
    page: 10,
    numAns: '4',
    ansLabel: '4',
    qHtml: `Find the total number of structural isomers with molecular formula C<sub>4</sub>H<sub>10</sub>O containing an alcoholic (&minus;OH) functional group.`,
    sHtml: `The <b>4</b> alcoholic isomers are: Butan-1-ol, Butan-2-ol, 2-Methylpropan-1-ol, and 2-Methylpropan-2-ol.`,
  },

  // ===================== MATHEMATICS SECTION A (Q51-Q70) =====================
  {
    n: 51,
    subject: 'Mathematics',
    chapter: 'Relations & Functions',
    type: 'single-mcq',
    page: 11,
    ansIdx: 1,
    ansLabel: '(B)',
    qHtml: `The domain of the real-valued function <i>f</i>(<i>x</i>) = ${sqrt('9 &minus; <i>x</i><sup>2</sup>')} + ${frac('1', 'ln(<i>x</i> &minus; 1)')} is:`,
    optsHtml: ['(1, 3]', '(1, 2) &cup; (2, 3]', '[&minus;3, 3]', '(1, 2) &cup; (2, 3)'],
    sHtml: `9 &minus; <i>x</i><sup>2</sup> &ge; 0 &rArr; <i>x</i> &isin; [&minus;3, 3].<br/>Also <i>x</i> &minus; 1 &gt; 0 &rArr; <i>x</i> &gt; 1, and ln(<i>x</i> &minus; 1) &ne; 0 &rArr; <i>x</i> &ne; 2.<br/>Intersection: <b>(1, 2) &cup; (2, 3]</b>.`,
  },
  {
    n: 52,
    subject: 'Mathematics',
    chapter: 'Complex Numbers',
    type: 'single-mcq',
    page: 11,
    ansIdx: 1,
    ansLabel: '(B)',
    qHtml: `The modulus of the complex number <i>z</i> = ${frac('(1 + <i>i</i>)<sup>3</sup>', '(1 &minus; <i>i</i>)<sup>2</sup>')} is:`,
    optsHtml: ['1', sqrt('2'), '2', `2${sqrt('2')}`],
    sHtml: `|<i>z</i>| = ${frac('|1 + <i>i</i>|<sup>3</sup>', '|1 &minus; <i>i</i>|<sup>2</sup>')} = ${frac(`(${sqrt('2')})<sup>3</sup>`, `(${sqrt('2')})<sup>2</sup>`)} = <b>${sqrt('2')}</b>.`,
  },
  {
    n: 53,
    subject: 'Mathematics',
    chapter: 'Quadratic Equations',
    type: 'single-mcq',
    page: 11,
    ansIdx: 1,
    ansLabel: '(B)',
    qHtml: `If &alpha; and &beta; are the roots of <i>x</i><sup>2</sup> &minus; 5<i>x</i> + 6 = 0, then the value of &alpha;<sup>3</sup> + &beta;<sup>3</sup> is:`,
    optsHtml: ['25', '35', '65', '125'],
    sHtml: `&alpha; + &beta; = 5, &alpha;&beta; = 6.<br/>&alpha;<sup>3</sup> + &beta;<sup>3</sup> = (&alpha; + &beta;)<sup>3</sup> &minus; 3&alpha;&beta;(&alpha; + &beta;) = 125 &minus; 3(6)(5) = <b>35</b>.`,
  },
  {
    n: 54,
    subject: 'Mathematics',
    chapter: 'Matrices & Determinants',
    type: 'single-mcq',
    page: 11,
    ansIdx: 3,
    ansLabel: '(D)',
    qHtml: `If <i>A</i> is a 3 &times; 3 matrix with |<i>A</i>| = 4, then the value of |adj(2<i>A</i>)| is:`,
    optsHtml: ['64', '256', '512', '1024'],
    sHtml: `|2<i>A</i>| = 2<sup>3</sup>|<i>A</i>| = 8 &times; 4 = 32.<br/>|adj(2<i>A</i>)| = |2<i>A</i>|<sup>3&minus;1</sup> = 32<sup>2</sup> = <b>1024</b>.`,
  },
  {
    n: 55,
    subject: 'Mathematics',
    chapter: 'Permutations & Combinations',
    type: 'single-mcq',
    page: 11,
    ansIdx: 1,
    ansLabel: '(B)',
    qHtml: `The number of distinct arrangements of all the letters of the word <b>LEADER</b> is:`,
    optsHtml: ['180', '360', '720', '120'],
    sHtml: `6 letters with 'E' repeated twice: ${frac('6!', '2!')} = ${frac('720', '2')} = <b>360</b>.`,
  },
  {
    n: 56,
    subject: 'Mathematics',
    chapter: 'Binomial Theorem',
    type: 'single-mcq',
    page: 12,
    ansIdx: 2,
    ansLabel: '(C)',
    qHtml: `The coefficient of <i>x</i><sup>3</sup> in the binomial expansion of (2<i>x</i> &minus; ${frac('1', '<i>x</i>')})<sup>7</sup> is:`,
    optsHtml: ['336', '&minus;672', '672', '448'],
    sHtml: `<i>T</i><sub><i>r</i>+1</sub> = <sup>7</sup><i>C</i><sub><i>r</i></sub>(2<i>x</i>)<sup>7&minus;<i>r</i></sup>(&minus;<i>x</i><sup>&minus;1</sup>)<sup><i>r</i></sup>. Set 7 &minus; 2<i>r</i> = 3 &rArr; <i>r</i> = 2.<br/>Coeff = <sup>7</sup><i>C</i><sub>2</sub>(2<sup>5</sup>)(&minus;1)<sup>2</sup> = 21 &times; 32 = <b>672</b>.`,
  },
  {
    n: 57,
    subject: 'Mathematics',
    chapter: 'Sequence & Series',
    type: 'single-mcq',
    page: 12,
    ansIdx: 1,
    ansLabel: '(B)',
    qHtml: `The sum of an infinite geometric progression is 15 and the sum of the squares of its terms is 45. The first term of the series is:`,
    optsHtml: ['3', '5', '6', '10'],
    sHtml: `${frac('<i>a</i>', '1 &minus; <i>r</i>')} = 15 and ${frac('<i>a</i><sup>2</sup>', '1 &minus; <i>r</i><sup>2</sup>')} = 45. Dividing: ${frac('<i>a</i>', '1 + <i>r</i>')} = 3.<br/>Hence ${frac('1 + <i>r</i>', '1 &minus; <i>r</i>')} = 5 &rArr; <i>r</i> = ${frac('2', '3')} &rArr; <i>a</i> = 15(1 &minus; ${frac('2', '3')}) = <b>5</b>.`,
  },
  {
    n: 58,
    subject: 'Mathematics',
    chapter: 'Limits & Continuity',
    type: 'single-mcq',
    page: 12,
    ansIdx: 2,
    ansLabel: '(C)',
    qHtml: `The value of ${lim('<i>x</i>&rarr;0')} ${frac('1 &minus; cos 2<i>x</i>', '<i>x</i><sup>2</sup>')} is:`,
    optsHtml: ['0', '1', '2', '4'],
    sHtml: `${lim('<i>x</i>&rarr;0')} ${frac('2 sin<sup>2</sup> <i>x</i>', '<i>x</i><sup>2</sup>')} = 2(${lim('<i>x</i>&rarr;0')} ${frac('sin <i>x</i>', '<i>x</i>')})<sup>2</sup> = 2(1)<sup>2</sup> = <b>2</b>.`,
  },
  {
    n: 59,
    subject: 'Mathematics',
    chapter: 'Application of Derivatives',
    type: 'single-mcq',
    page: 12,
    ansIdx: 1,
    ansLabel: '(B)',
    qHtml: `The absolute minimum value of <i>f</i>(<i>x</i>) = <i>x</i><sup>3</sup> &minus; 3<i>x</i> + 5 on the closed interval [0, 3] is:`,
    optsHtml: ['1', '3', '5', '23'],
    sHtml: `<i>f</i>&prime;(<i>x</i>) = 3<i>x</i><sup>2</sup> &minus; 3 = 0 &rArr; <i>x</i> = 1 &isin; [0, 3].<br/><i>f</i>(0) = 5, <i>f</i>(1) = 3, <i>f</i>(3) = 23 &rArr; Minimum = <b>3</b>.`,
  },
  {
    n: 60,
    subject: 'Mathematics',
    chapter: 'Indefinite Integration',
    type: 'single-mcq',
    page: 12,
    ansIdx: 0,
    ansLabel: '(A)',
    qHtml: `The indefinite integral ${intg()} ${frac('<i>e</i><sup><i>x</i></sup>(1 + <i>x</i>)', 'cos<sup>2</sup>(<i>xe</i><sup><i>x</i></sup>)')} <i>dx</i> equals:`,
    optsHtml: [
      'tan(<i>xe</i><sup><i>x</i></sup>) + <i>C</i>',
      'cot(<i>xe</i><sup><i>x</i></sup>) + <i>C</i>',
      '&minus;tan(<i>xe</i><sup><i>x</i></sup>) + <i>C</i>',
      'sec(<i>xe</i><sup><i>x</i></sup>) + <i>C</i>',
    ],
    optsLayout: 'grid2',
    sHtml: `Let <i>t</i> = <i>xe</i><sup><i>x</i></sup> &rArr; <i>dt</i> = <i>e</i><sup><i>x</i></sup>(1 + <i>x</i>) <i>dx</i>.<br/><i>I</i> = ${intg()} sec<sup>2</sup><i>t</i> <i>dt</i> = tan <i>t</i> + <i>C</i> = <b>tan(<i>xe</i><sup><i>x</i></sup>) + <i>C</i></b>.`,
  },
  {
    n: 61,
    subject: 'Mathematics',
    chapter: 'Definite Integration',
    type: 'single-mcq',
    page: 13,
    ansIdx: 1,
    ansLabel: '(B)',
    qHtml: `The value of the definite integral ${intg('0', '&pi;/2')} ${frac('sin <i>x</i>', 'sin <i>x</i> + cos <i>x</i>')} <i>dx</i> is:`,
    optsHtml: [frac('&pi;', '2'), frac('&pi;', '4'), frac('&pi;', '8'), '&pi;'],
    sHtml: `Using King's property (<i>x</i> &rarr; &pi;/2 &minus; <i>x</i>): <i>I</i> = ${intg('0', '&pi;/2')} ${frac('cos <i>x</i>', 'cos <i>x</i> + sin <i>x</i>')} <i>dx</i>.<br/>Adding: 2<i>I</i> = ${intg('0', '&pi;/2')} 1 <i>dx</i> = ${frac('&pi;', '2')} &rArr; <i>I</i> = <b>${frac('&pi;', '4')}</b>.`,
  },
  {
    n: 62,
    subject: 'Mathematics',
    chapter: 'Area Under Curves',
    type: 'single-mcq',
    page: 13,
    ansIdx: 2,
    ansLabel: '(C)',
    qHtml: `The area of the region bounded by the parabola <i>y</i> = <i>x</i><sup>2</sup> and the straight line <i>y</i> = <i>x</i> is:`,
    optsHtml: [frac('1', '2'), frac('1', '3'), frac('1', '6'), frac('2', '3')],
    sHtml: `Intersection at <i>x</i> = 0, 1.<br/>Area = ${intg('0', '1')} (<i>x</i> &minus; <i>x</i><sup>2</sup>) <i>dx</i> = [${frac('<i>x</i><sup>2</sup>', '2')} &minus; ${frac('<i>x</i><sup>3</sup>', '3')}]<sub>0</sub><sup>1</sup> = ${frac('1', '2')} &minus; ${frac('1', '3')} = <b>${frac('1', '6')}</b>.`,
  },
  {
    n: 63,
    subject: 'Mathematics',
    chapter: 'Differential Equations',
    type: 'single-mcq',
    page: 13,
    ansIdx: 0,
    ansLabel: '(A)',
    qHtml: `The integrating factor of the linear differential equation ${frac('<i>dy</i>', '<i>dx</i>')} + ${frac('<i>y</i>', '<i>x</i>')} = <i>x</i><sup>2</sup> (<i>x</i> &gt; 0) is:`,
    optsHtml: ['<i>x</i>', '<i>x</i><sup>2</sup>', '<i>e</i><sup><i>x</i></sup>', 'ln <i>x</i>'],
    sHtml: `Here <i>P</i>(<i>x</i>) = ${frac('1', '<i>x</i>')}.<br/>I.F. = <i>e</i><sup>&int; (1/<i>x</i>) <i>dx</i></sup> = <i>e</i><sup>ln <i>x</i></sup> = <b><i>x</i></b>.`,
  },
  {
    n: 64,
    subject: 'Mathematics',
    chapter: 'Circles',
    type: 'single-mcq',
    page: 13,
    ansIdx: 2,
    ansLabel: '(C)',
    qHtml: `The radius of the circle given by <i>x</i><sup>2</sup> + <i>y</i><sup>2</sup> &minus; 4<i>x</i> + 6<i>y</i> &minus; 3 = 0 is:`,
    optsHtml: ['2', '3', '4', '5'],
    sHtml: `<i>g</i> = &minus;2, <i>f</i> = 3, <i>c</i> = &minus;3.<br/><i>r</i> = ${sqrt('<i>g</i><sup>2</sup> + <i>f</i><sup>2</sup> &minus; <i>c</i>')} = ${sqrt('(&minus;2)<sup>2</sup> + 3<sup>2</sup> &minus; (&minus;3)')} = ${sqrt('16')} = <b>4</b>.`,
  },
  {
    n: 65,
    subject: 'Mathematics',
    chapter: 'Ellipse',
    type: 'single-mcq',
    page: 13,
    ansIdx: 1,
    ansLabel: '(B)',
    qHtml: `The eccentricity of the ellipse 9<i>x</i><sup>2</sup> + 25<i>y</i><sup>2</sup> = 225 is:`,
    optsHtml: [frac('3', '5'), frac('4', '5'), frac('3', '4'), frac('5', '4')],
    sHtml: `Standard form: ${frac('<i>x</i><sup>2</sup>', '25')} + ${frac('<i>y</i><sup>2</sup>', '9')} = 1 &rArr; <i>a</i><sup>2</sup> = 25, <i>b</i><sup>2</sup> = 9.<br/><i>e</i> = ${sqrt(`1 &minus; ${frac('9', '25')}`)} = ${sqrt(frac('16', '25'))} = <b>${frac('4', '5')}</b>.`,
  },
  {
    n: 66,
    subject: 'Mathematics',
    chapter: 'Vector Algebra',
    type: 'single-mcq',
    page: 14,
    ansIdx: 2,
    ansLabel: '(C)',
    qHtml: `If |${vec('<i>a</i>')}| = 3, |${vec('<i>b</i>')}| = 4, and |${vec('<i>a</i>')} + ${vec('<i>b</i>')}| = 5, then the value of |${vec('<i>a</i>')} &minus; ${vec('<i>b</i>')}| is:`,
    optsHtml: ['3', '4', '5', '7'],
    sHtml: `Parallelogram law: |${vec('<i>a</i>')} + ${vec('<i>b</i>')}|<sup>2</sup> + |${vec('<i>a</i>')} &minus; ${vec('<i>b</i>')}|<sup>2</sup> = 2(|${vec('<i>a</i>')}|<sup>2</sup> + |${vec('<i>b</i>')}|<sup>2</sup>).<br/>5<sup>2</sup> + |${vec('<i>a</i>')} &minus; ${vec('<i>b</i>')}|<sup>2</sup> = 2(9 + 16) = 50 &rArr; |${vec('<i>a</i>')} &minus; ${vec('<i>b</i>')}| = <b>5</b>.`,
  },
  {
    n: 67,
    subject: 'Mathematics',
    chapter: '3D Geometry',
    type: 'single-mcq',
    page: 14,
    ansIdx: 3,
    ansLabel: '(D)',
    qHtml: `The angle between the lines ${frac('<i>x</i> &minus; 1', '2')} = ${frac('<i>y</i> &minus; 2', '1')} = ${frac('<i>z</i> + 1', '&minus;2')} and ${frac('<i>x</i> + 2', '1')} = ${frac('<i>y</i> &minus; 1', '2')} = ${frac('<i>z</i>', '2')} is:`,
    optsHtml: [frac('&pi;', '6'), frac('&pi;', '4'), frac('&pi;', '3'), frac('&pi;', '2')],
    sHtml: `Direction ratios: ${vec('<i>d</i>')}<sub>1</sub> = (2, 1, &minus;2), ${vec('<i>d</i>')}<sub>2</sub> = (1, 2, 2).<br/>${vec('<i>d</i>')}<sub>1</sub> &middot; ${vec('<i>d</i>')}<sub>2</sub> = 2(1) + 1(2) + (&minus;2)(2) = 0 &rArr; &theta; = <b>${frac('&pi;', '2')}</b>.`,
  },
  {
    n: 68,
    subject: 'Mathematics',
    chapter: 'Probability',
    type: 'single-mcq',
    page: 14,
    ansIdx: 1,
    ansLabel: '(B)',
    qHtml: `Two fair six-sided dice are thrown simultaneously. The probability that the sum of the numbers obtained is 8 is:`,
    optsHtml: [frac('1', '9'), frac('5', '36'), frac('1', '6'), frac('7', '36')],
    sHtml: `Favourable pairs: (2,6), (3,5), (4,4), (5,3), (6,2) &rArr; 5 outcomes.<br/>Total = 36 &rArr; Probability = <b>${frac('5', '36')}</b>.`,
  },
  {
    n: 69,
    subject: 'Mathematics',
    chapter: 'Statistics',
    type: 'single-mcq',
    page: 14,
    ansIdx: 1,
    ansLabel: '(B)',
    qHtml: `The variance of the first five natural numbers 1, 2, 3, 4, 5 is:`,
    optsHtml: ['1', '2', '3', '4'],
    sHtml: `Variance of first <i>n</i> natural numbers = ${frac('<i>n</i><sup>2</sup> &minus; 1', '12')}.<br/>For <i>n</i> = 5: &sigma;<sup>2</sup> = ${frac('25 &minus; 1', '12')} = <b>2</b>.`,
  },
  {
    n: 70,
    subject: 'Mathematics',
    chapter: 'Inverse Trigonometric Functions',
    type: 'single-mcq',
    page: 14,
    ansIdx: 2,
    ansLabel: '(C)',
    qHtml: `The principal value of tan<sup>&minus;1</sup>(1) + cos<sup>&minus;1</sup>(&minus;${frac('1', '2')}) + sin<sup>&minus;1</sup>(&minus;${frac('1', '2')}) is:`,
    optsHtml: [frac('&pi;', '2'), frac('2&pi;', '3'), frac('3&pi;', '4'), '&pi;'],
    sHtml: `= ${frac('&pi;', '4')} + (${frac('2&pi;', '3')}) + (&minus;${frac('&pi;', '6')}) = ${frac('3&pi; + 8&pi; &minus; 2&pi;', '12')} = ${frac('9&pi;', '12')} = <b>${frac('3&pi;', '4')}</b>.`,
  },

  // ===================== MATHEMATICS SECTION B (Q71-Q75) =====================
  {
    n: 71,
    subject: 'Mathematics',
    chapter: 'Sequence & Series',
    type: 'integer',
    page: 15,
    numAns: '120',
    ansLabel: '120',
    qHtml: `In an arithmetic progression (AP), the 3rd term is 7 and the 7th term is 15. Find the sum of the first 10 terms.`,
    sHtml: `<i>a</i> + 2<i>d</i> = 7, <i>a</i> + 6<i>d</i> = 15 &rArr; <i>d</i> = 2, <i>a</i> = 3.<br/><i>S</i><sub>10</sub> = ${frac('10', '2')}[2(3) + 9(2)] = 5(24) = <b>120</b>.`,
  },
  {
    n: 72,
    subject: 'Mathematics',
    chapter: 'Permutations & Combinations',
    type: 'integer',
    page: 15,
    numAns: '24',
    ansLabel: '24',
    qHtml: `Find the total number of 3-digit even numbers that can be formed from the digits 1, 2, 3, 4, 5 without repetition.`,
    sHtml: `Units digit must be 2 or 4 (2 choices). Remaining 2 places from 4 digits: 4 &times; 3 = 12.<br/>Total = 12 &times; 2 = <b>24</b>.`,
  },
  {
    n: 73,
    subject: 'Mathematics',
    chapter: 'Definite Integration',
    type: 'integer',
    page: 15,
    numAns: '4',
    ansLabel: '4',
    qHtml: `Evaluate the definite integral ${intg('&minus;2', '2')} |<i>x</i>| <i>dx</i>.`,
    sHtml: `|<i>x</i>| is an even function &rArr; 2${intg('0', '2')} <i>x</i> <i>dx</i> = 2[${frac('<i>x</i><sup>2</sup>', '2')}]<sub>0</sub><sup>2</sup> = 2(2) = <b>4</b>.`,
  },
  {
    n: 74,
    subject: 'Mathematics',
    chapter: 'Hyperbola',
    type: 'integer',
    page: 15,
    numAns: '24',
    ansLabel: '24',
    qHtml: `Find the length of the latus rectum of the hyperbola ${frac('<i>x</i><sup>2</sup>', '9')} &minus; ${frac('<i>y</i><sup>2</sup>', '36')} = 1.`,
    sHtml: `Here <i>a</i><sup>2</sup> = 9 &rArr; <i>a</i> = 3, and <i>b</i><sup>2</sup> = 36.<br/>Latus rectum = ${frac('2<i>b</i><sup>2</sup>', '<i>a</i>')} = ${frac('2(36)', '3')} = <b>24</b>.`,
  },
  {
    n: 75,
    subject: 'Mathematics',
    chapter: 'Vector Algebra',
    type: 'integer',
    page: 15,
    numAns: '11',
    ansLabel: '11',
    qHtml: `If ${vec('<i>a</i>')} = ${hat('<i>i</i>')} + 2${hat('<i>j</i>')}, ${vec('<i>b</i>')} = 3${hat('<i>j</i>')} + 4${hat('<i>k</i>')}, and ${vec('<i>c</i>')} = ${hat('<i>i</i>')} + ${hat('<i>k</i>')}, find the scalar triple product [${vec('<i>a</i>')} ${vec('<i>b</i>')} ${vec('<i>c</i>')}].`,
    sHtml: `[${vec('<i>a</i>')} ${vec('<i>b</i>')} ${vec('<i>c</i>')}] = ${det3([
      ['1', '2', '0'],
      ['0', '3', '4'],
      ['1', '0', '1'],
    ])} = 1(3 &minus; 0) &minus; 2(0 &minus; 4) + 0 = 3 + 8 = <b>11</b>.`,
  },
];

const LETTERS = ['A', 'B', 'C', 'D'];

function renderQuestionCard(q) {
  let optsBlock = '';
  if (q.type === 'single-mcq' && q.optsHtml) {
    const layoutClass =
      q.optsLayout === 'stack'
        ? 'opts-stack'
        : q.optsLayout === 'grid2'
          ? 'opts-grid2'
          : 'opts-row';
    optsBlock = `<div class="opts ${layoutClass}">${q.optsHtml
      .map((o, idx) => `<div class="opt"><span class="opt-key">(${LETTERS[idx]})</span> <span class="opt-val">${o}</span></div>`)
      .join('')}</div>`;
  }
  return `
    <div id="q-${q.n}" class="q-crop">
      <div class="q-stem"><span class="q-num">Q${q.n}.</span> ${q.qHtml}</div>
      ${optsBlock}
    </div>
  `;
}

function renderSolutionCard(q) {
  return `
    <div id="s-${q.n}" class="s-crop">
      <div class="s-box">
        <div class="s-head"><span class="s-title">Solution (Q${q.n}):</span> <span class="s-ans">Ans: ${q.ansLabel}</span></div>
        <div class="s-body">${q.sHtml}</div>
      </div>
    </div>
  `;
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Full Mock Test 1 Crops</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px;
    background: #e2e8f0;
    font-family: "Liberation Serif", "DejaVu Serif", "Times New Roman", Georgia, serif;
    color: #0f172a;
    -webkit-font-smoothing: antialiased;
  }
  .sheet {
    display: flex;
    flex-direction: column;
    gap: 18px;
    align-items: flex-start;
  }
  .q-crop {
    width: 740px;
    background: #ffffff;
    padding: 20px 26px 22px 26px;
    font-size: 21px;
    line-height: 1.58;
    color: #0f172a;
  }
  .q-num {
    font-weight: 700;
    color: #0B1B3B;
    margin-right: 4px;
  }
  .opts {
    margin-top: 14px;
    padding-left: 12px;
  }
  .opts-row {
    display: flex;
    flex-wrap: wrap;
    column-gap: 28px;
    row-gap: 10px;
    align-items: center;
  }
  .opts-grid2 {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 24px;
    row-gap: 10px;
    align-items: center;
  }
  .opts-stack {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .opt {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 20px;
  }
  .opt-key {
    font-weight: 600;
    color: #1e293b;
  }

  .s-crop {
    width: 680px;
    background: #ffffff;
    padding: 8px;
  }
  .s-box {
    background: #f8fafc;
    border: 1.5px solid #cbd5e1;
    border-radius: 10px;
    padding: 16px 20px;
    font-size: 19px;
    line-height: 1.62;
    color: #1e293b;
  }
  .s-head {
    margin-bottom: 6px;
    font-size: 19.5px;
  }
  .s-title {
    font-weight: 700;
    color: #ea580c;
  }
  .s-ans {
    font-weight: 700;
    color: #0f172a;
    margin-left: 4px;
  }
  .s-body {
    color: #1e293b;
  }

  /* Mathematical notation CSS */
  .frac {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    vertical-align: middle;
    margin: 0 3px;
    line-height: 1.15;
    font-size: 0.9em;
  }
  .frac > .num {
    border-bottom: 1.4px solid currentColor;
    padding: 0 4px 2px 4px;
    text-align: center;
  }
  .frac > .den {
    padding: 2px 4px 0 4px;
    text-align: center;
  }
  .sqrt {
    display: inline-flex;
    align-items: stretch;
    vertical-align: middle;
    margin: 0 2px;
  }
  .sqrt > .rad {
    font-size: 1.15em;
    line-height: 1.05;
    margin-right: -1px;
    transform: translateY(1px);
  }
  .sqrt > .radicand {
    border-top: 1.4px solid currentColor;
    padding: 1px 4px 0 3px;
    display: inline-flex;
    align-items: center;
  }
  .vec {
    position: relative;
    display: inline-block;
    padding-top: 2px;
  }
  .vec::before {
    content: "\\2192";
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%) scale(0.75);
    font-style: normal;
    line-height: 1;
  }
  .hat {
    position: relative;
    display: inline-block;
  }
  .hat::before {
    content: "^";
    position: absolute;
    top: -9px;
    left: 50%;
    transform: translateX(-50%);
    font-style: normal;
    font-size: 0.78em;
    line-height: 1;
  }
  .overbar {
    display: inline-block;
    border-top: 1.4px solid currentColor;
    padding-top: 1px;
    line-height: 1.1;
  }
  .int-wrap {
    display: inline-flex;
    align-items: center;
    vertical-align: middle;
    margin: 0 2px;
  }
  .int-sym {
    font-size: 1.45em;
    line-height: 1;
    margin-right: 1px;
  }
  .int-lim {
    display: inline-flex;
    flex-direction: column;
    justify-content: space-between;
    font-size: 0.65em;
    line-height: 1.05;
    margin-right: 4px;
  }
  .lim-wrap {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    vertical-align: middle;
    line-height: 1.0;
    margin: 0 4px;
  }
  .lim-sub {
    font-size: 0.68em;
    margin-top: 2px;
  }
  .det {
    display: inline-flex;
    align-items: stretch;
    vertical-align: middle;
    margin: 0 4px;
  }
  .det-bar {
    width: 1.5px;
    background: currentColor;
    margin: 2px 4px;
  }
  .det-grid {
    display: grid;
    grid-template-columns: repeat(3, 1.35em);
    text-align: center;
    line-height: 1.25;
    font-size: 0.88em;
  }
  sup, sub {
    font-size: 0.72em;
    line-height: 0;
  }
</style>
</head>
<body>
  <div class="sheet">
    ${QUESTIONS_DATA.map((q) => renderQuestionCard(q) + renderSolutionCard(q)).join('\n')}
  </div>
</body>
</html>`;

fs.mkdirSync(path.resolve('public/assets/mocks/full-mock-test-1'), { recursive: true });
fs.writeFileSync('/tmp/full-mock-1-sheet.html', html, 'utf8');
console.log(`Generated /tmp/full-mock-1-sheet.html with ${QUESTIONS_DATA.length} questions and ${QUESTIONS_DATA.length} solutions.`);
