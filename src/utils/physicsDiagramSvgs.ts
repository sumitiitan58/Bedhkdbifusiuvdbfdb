/**
 * Pure deterministic SVG Physics Diagram Generator for Class 11 JEE Main Chapter DPPs.
 * Generates composite Retina-sharp SVG cards (`data:image/svg+xml;charset=utf-8,...`)
 * containing BOTH the clean cropped question prompt AND the crisp physics diagram/graph,
 * so diagrams display seamlessly in CbtExamRunner (Image Format), ZoomModal, Mistake Notebook,
 * and ProTestAnalysisDashboard without hiding question text.
 */

import {
  escapeSvgXml,
  formatScientificNotation,
  wrapSvgLines,
} from './questionImageRenderer';

export type PhysicsDiagramKey =
  | 'ch01-q68'
  | 'ch01-q81'
  | 'ch01-q84'
  | 'ch01-q86'
  | 'ch01-q92'
  | 'ch01-q95'
  | 'ch02-q21'
  | 'ch02-q22'
  | 'ch02-q23'
  | 'ch02-q24'
  | 'ch03-q04'
  | 'ch03-q11'
  | 'ch03-q19'
  | 'ch04-q03'
  | 'ch04-q05'
  | 'ch05-q02'
  | 'ch05-q08'
  | 'ch06-q05'
  | 'ch09-q04'
  | 'ch11-q02'
  | 'ch13-q02'
  | 'ch14-q03';

interface DiagramSpec {
  height: number;
  caption: string;
  bodySvg: string;
}

const DIAGRAM_SPECS: Record<PhysicsDiagramKey, DiagramSpec> = {
  'ch01-q68': {
    height: 190,
    caption: 'Simple Pendulum: T² vs Length (l) Graph',
    bodySvg: `
      <line x1="90" y1="150" x2="360" y2="150" stroke="#334155" stroke-width="2" />
      <line x1="90" y1="150" x2="90" y2="25" stroke="#334155" stroke-width="2" />
      <polygon points="360,150 351,145 351,155" fill="#334155" />
      <polygon points="90,25 85,34 95,34" fill="#334155" />
      <line x1="90" y1="150" x2="310" y2="40" stroke="#2563EB" stroke-width="2.5" />
      <line x1="250" y1="70" x2="250" y2="150" stroke="#94A3B8" stroke-width="1.4" stroke-dasharray="5,4" />
      <line x1="90" y1="70" x2="250" y2="70" stroke="#94A3B8" stroke-width="1.4" stroke-dasharray="5,4" />
      <circle cx="250" cy="70" r="5" fill="#EA580C" />
      <text x="260" y="66" font-family="ui-monospace, monospace" font-size="13" font-weight="700" fill="#0F172A">(1.00 m, 4.0 s²)</text>
      <text x="242" y="168" font-family="ui-monospace, monospace" font-size="12" fill="#334155">1.00</text>
      <text x="58" y="74" font-family="ui-monospace, monospace" font-size="12" fill="#334155">4.0</text>
      <text x="74" y="166" font-family="ui-monospace, monospace" font-size="12" fill="#334155">0</text>
      <text x="366" y="154" font-family="sans-serif" font-size="13" font-weight="700" fill="#0F172A">l (m)</text>
      <text x="52" y="22" font-family="sans-serif" font-size="13" font-weight="700" fill="#0F172A">T² (s²)</text>
    `,
  },
  'ch01-q81': {
    height: 165,
    caption: 'Vernier Calipers Scale Reading (1 MSD = 1 mm, 10 VSD = 9 MSD)',
    bodySvg: `
      <rect x="65" y="28" width="380" height="40" rx="4" fill="#F8FAFC" stroke="#334155" stroke-width="1.8" />
      <text x="72" y="42" font-family="sans-serif" font-size="11" font-weight="700" fill="#475569">Main Scale (cm)</text>
      <line x1="95" y1="50" x2="95" y2="68" stroke="#0F172A" stroke-width="2" />
      <text x="91" y="48" font-family="ui-monospace, monospace" font-size="11" font-weight="700" fill="#0F172A">2</text>
      <line x1="120" y1="56" x2="120" y2="68" stroke="#0F172A" stroke-width="1.3" />
      <line x1="145" y1="56" x2="145" y2="68" stroke="#0F172A" stroke-width="1.3" />
      <line x1="170" y1="56" x2="170" y2="68" stroke="#0F172A" stroke-width="1.3" />
      <line x1="195" y1="56" x2="195" y2="68" stroke="#0F172A" stroke-width="1.3" />
      <line x1="220" y1="52" x2="220" y2="68" stroke="#0F172A" stroke-width="1.8" />
      <text x="210" y="48" font-family="ui-monospace, monospace" font-size="10" fill="#334155">2.5</text>
      <line x1="245" y1="56" x2="245" y2="68" stroke="#0F172A" stroke-width="1.3" />
      <line x1="270" y1="56" x2="270" y2="68" stroke="#0F172A" stroke-width="1.3" />
      <line x1="295" y1="56" x2="295" y2="68" stroke="#0F172A" stroke-width="1.3" />
      <line x1="320" y1="56" x2="320" y2="68" stroke="#0F172A" stroke-width="1.3" />
      <line x1="345" y1="50" x2="345" y2="68" stroke="#0F172A" stroke-width="2" />
      <text x="341" y="48" font-family="ui-monospace, monospace" font-size="11" font-weight="700" fill="#0F172A">3</text>
      <rect x="132" y="72" width="235" height="44" rx="4" fill="#EFF6FF" stroke="#2563EB" stroke-width="1.8" />
      <text x="140" y="109" font-family="sans-serif" font-size="11" font-weight="700" fill="#1D4ED8">Vernier Scale (6th div coincides)</text>
      <line x1="150" y1="72" x2="150" y2="90" stroke="#1D4ED8" stroke-width="2" />
      <text x="147" y="100" font-family="ui-monospace, monospace" font-size="10" font-weight="700" fill="#1D4ED8">0</text>
      <line x1="172.5" y1="72" x2="172.5" y2="85" stroke="#1D4ED8" stroke-width="1.2" />
      <line x1="195" y1="72" x2="195" y2="85" stroke="#1D4ED8" stroke-width="1.2" />
      <line x1="217.5" y1="72" x2="217.5" y2="85" stroke="#1D4ED8" stroke-width="1.2" />
      <line x1="240" y1="72" x2="240" y2="85" stroke="#1D4ED8" stroke-width="1.2" />
      <line x1="262.5" y1="72" x2="262.5" y2="85" stroke="#1D4ED8" stroke-width="1.2" />
      <line x1="285" y1="72" x2="285" y2="92" stroke="#EA580C" stroke-width="2.4" />
      <line x1="285" y1="54" x2="285" y2="68" stroke="#EA580C" stroke-width="2.4" />
      <text x="281" y="101" font-family="ui-monospace, monospace" font-size="11" font-weight="800" fill="#EA580C">6</text>
      <text x="136" y="138" font-family="ui-monospace, monospace" font-size="12" font-weight="700" fill="#0F172A">MSR = 2.2 cm | Coinciding VSD = 6</text>
    `,
  },
  'ch01-q84': {
    height: 165,
    caption: 'Vernier Calipers Negative Zero Error Diagram (Jaws Closed)',
    bodySvg: `
      <rect x="75" y="28" width="350" height="40" rx="4" fill="#F8FAFC" stroke="#334155" stroke-width="1.8" />
      <line x1="150" y1="48" x2="150" y2="68" stroke="#0F172A" stroke-width="2.2" />
      <text x="146" y="44" font-family="ui-monospace, monospace" font-size="12" font-weight="700" fill="#0F172A">0</text>
      <line x1="175" y1="55" x2="175" y2="68" stroke="#0F172A" stroke-width="1.3" />
      <line x1="200" y1="55" x2="200" y2="68" stroke="#0F172A" stroke-width="1.3" />
      <line x1="225" y1="55" x2="225" y2="68" stroke="#0F172A" stroke-width="1.3" />
      <line x1="250" y1="55" x2="250" y2="68" stroke="#0F172A" stroke-width="1.3" />
      <line x1="275" y1="50" x2="275" y2="68" stroke="#0F172A" stroke-width="1.8" />
      <line x1="300" y1="55" x2="300" y2="68" stroke="#0F172A" stroke-width="1.3" />
      <line x1="325" y1="55" x2="325" y2="68" stroke="#EA580C" stroke-width="2.4" />
      <rect x="120" y="72" width="245" height="44" rx="4" fill="#FFF7ED" stroke="#EA580C" stroke-width="1.8" />
      <line x1="138" y1="72" x2="138" y2="90" stroke="#EA580C" stroke-width="2" />
      <text x="134" y="102" font-family="ui-monospace, monospace" font-size="11" font-weight="700" fill="#EA580C">0</text>
      <line x1="325" y1="72" x2="325" y2="92" stroke="#EA580C" stroke-width="2.4" />
      <text x="321" y="103" font-family="ui-monospace, monospace" font-size="11" font-weight="800" fill="#EA580C">7</text>
      <text x="112" y="138" font-family="ui-monospace, monospace" font-size="12" font-weight="700" fill="#0F172A">Vernier 0 lies left of Main 0 · 7th VSD coincides</text>
    `,
  },
  'ch01-q86': {
    height: 175,
    caption: 'Micrometer Screw Gauge: Pitch = 0.5 mm, 50 Circular Divisions',
    bodySvg: `
      <rect x="75" y="45" width="185" height="72" rx="6" fill="#F8FAFC" stroke="#334155" stroke-width="2" />
      <line x1="85" y1="81" x2="255" y2="81" stroke="#0F172A" stroke-width="1.8" />
      <line x1="100" y1="67" x2="100" y2="81" stroke="#0F172A" stroke-width="1.8" />
      <text x="96" y="62" font-family="ui-monospace, monospace" font-size="11" fill="#0F172A">0</text>
      <line x1="125" y1="81" x2="125" y2="93" stroke="#334155" stroke-width="1.4" />
      <line x1="150" y1="67" x2="150" y2="81" stroke="#0F172A" stroke-width="1.8" />
      <text x="146" y="62" font-family="ui-monospace, monospace" font-size="11" fill="#0F172A">1</text>
      <line x1="175" y1="81" x2="175" y2="93" stroke="#334155" stroke-width="1.4" />
      <line x1="200" y1="67" x2="200" y2="81" stroke="#0F172A" stroke-width="1.8" />
      <text x="196" y="62" font-family="ui-monospace, monospace" font-size="11" fill="#0F172A">2</text>
      <line x1="225" y1="81" x2="225" y2="93" stroke="#334155" stroke-width="1.4" />
      <text x="214" y="107" font-family="ui-monospace, monospace" font-size="10" fill="#475569">2.5 mm</text>
      <polygon points="260,38 305,28 380,28 380,134 305,134 260,124" fill="#EFF6FF" stroke="#2563EB" stroke-width="2" />
      <line x1="260" y1="61" x2="288" y2="61" stroke="#1D4ED8" stroke-width="1.5" />
      <text x="294" y="65" font-family="ui-monospace, monospace" font-size="11" font-weight="700" fill="#1D4ED8">35</text>
      <line x1="260" y1="81" x2="294" y2="81" stroke="#EA580C" stroke-width="2.5" />
      <text x="300" y="85" font-family="ui-monospace, monospace" font-size="12" font-weight="800" fill="#EA580C">30</text>
      <line x1="260" y1="101" x2="288" y2="101" stroke="#1D4ED8" stroke-width="1.5" />
      <text x="294" y="105" font-family="ui-monospace, monospace" font-size="11" font-weight="700" fill="#1D4ED8">25</text>
      <text x="105" y="156" font-family="ui-monospace, monospace" font-size="12" font-weight="700" fill="#0F172A">MSR = 2.5 mm | Circular Scale = 30 div</text>
    `,
  },
  'ch01-q92': {
    height: 160,
    caption: 'Non-Standard Vernier Scale: (N + 1) VSD = N MSD',
    bodySvg: `
      <rect x="65" y="30" width="380" height="38" rx="4" fill="#F8FAFC" stroke="#334155" stroke-width="1.8" />
      <rect x="95" y="72" width="320" height="40" rx="4" fill="#EFF6FF" stroke="#2563EB" stroke-width="1.8" />
      <line x1="115" y1="45" x2="115" y2="68" stroke="#0F172A" stroke-width="2" />
      <line x1="115" y1="72" x2="115" y2="95" stroke="#2563EB" stroke-width="2" />
      <line x1="385" y1="45" x2="385" y2="68" stroke="#EA580C" stroke-width="2.2" />
      <line x1="385" y1="72" x2="385" y2="95" stroke="#EA580C" stroke-width="2.2" />
      <text x="180" y="54" font-family="ui-monospace, monospace" font-size="12" font-weight="700" fill="#0F172A">N Main Scale Divisions (a cm each)</text>
      <text x="175" y="96" font-family="ui-monospace, monospace" font-size="12" font-weight="700" fill="#1D4ED8">(N + 1) Vernier Scale Divisions</text>
      <text x="145" y="138" font-family="ui-monospace, monospace" font-size="12" font-weight="700" fill="#0F172A">LC = 1 MSD − 1 VSD = a / (N + 1)</text>
    `,
  },
  'ch01-q95': {
    height: 170,
    caption: 'Screw Gauge with Negative Zero Error (LC = 0.01 mm)',
    bodySvg: `
      <rect x="70" y="42" width="165" height="68" rx="6" fill="#F8FAFC" stroke="#334155" stroke-width="2" />
      <line x1="80" y1="76" x2="230" y2="76" stroke="#0F172A" stroke-width="1.8" />
      <line x1="100" y1="62" x2="100" y2="76" stroke="#0F172A" stroke-width="2" />
      <text x="96" y="56" font-family="ui-monospace, monospace" font-size="11" fill="#0F172A">0</text>
      <line x1="140" y1="62" x2="140" y2="76" stroke="#0F172A" stroke-width="1.8" />
      <text x="136" y="56" font-family="ui-monospace, monospace" font-size="11" fill="#0F172A">1</text>
      <line x1="180" y1="62" x2="180" y2="76" stroke="#0F172A" stroke-width="1.8" />
      <text x="176" y="56" font-family="ui-monospace, monospace" font-size="11" fill="#0F172A">2</text>
      <line x1="220" y1="62" x2="220" y2="76" stroke="#0F172A" stroke-width="1.8" />
      <text x="216" y="56" font-family="ui-monospace, monospace" font-size="11" fill="#0F172A">3</text>
      <polygon points="235,34 285,26 375,26 375,126 285,126 235,118" fill="#FFF7ED" stroke="#EA580C" stroke-width="2" />
      <line x1="235" y1="76" x2="275" y2="76" stroke="#EA580C" stroke-width="2.4" />
      <text x="282" y="80" font-family="ui-monospace, monospace" font-size="12" font-weight="800" fill="#EA580C">45</text>
      <text x="90" y="148" font-family="ui-monospace, monospace" font-size="12" font-weight="700" fill="#0F172A">Zero Error = −0.05 mm | MSR = 3 mm | CSR = 45</text>
    `,
  },
  'ch02-q21': {
    height: 190,
    caption: 'Velocity–Time (v–t) Trapezium Graph',
    bodySvg: `
      <line x1="80" y1="150" x2="395" y2="150" stroke="#334155" stroke-width="2" />
      <line x1="80" y1="150" x2="80" y2="25" stroke="#334155" stroke-width="2" />
      <polygon points="80,150 155,50 280,50 355,150" fill="#DBEAFE" fill-opacity="0.65" stroke="#2563EB" stroke-width="2.5" />
      <line x1="155" y1="50" x2="155" y2="150" stroke="#94A3B8" stroke-dasharray="4,4" />
      <line x1="280" y1="50" x2="280" y2="150" stroke="#94A3B8" stroke-dasharray="4,4" />
      <line x1="80" y1="50" x2="155" y2="50" stroke="#94A3B8" stroke-dasharray="4,4" />
      <text x="52" y="54" font-family="ui-monospace, monospace" font-size="12" font-weight="700" fill="#0F172A">20</text>
      <text x="72" y="168" font-family="ui-monospace, monospace" font-size="12" fill="#334155">0</text>
      <text x="150" y="168" font-family="ui-monospace, monospace" font-size="12" fill="#334155">4</text>
      <text x="272" y="168" font-family="ui-monospace, monospace" font-size="12" fill="#334155">10</text>
      <text x="347" y="168" font-family="ui-monospace, monospace" font-size="12" fill="#334155">14</text>
      <text x="402" y="154" font-family="sans-serif" font-size="13" font-weight="700" fill="#0F172A">t (s)</text>
      <text x="38" y="22" font-family="sans-serif" font-size="13" font-weight="700" fill="#0F172A">v (m/s)</text>
    `,
  },
  'ch02-q22': {
    height: 190,
    caption: 'Acceleration–Time (a–t) Step Graph',
    bodySvg: `
      <line x1="80" y1="108" x2="395" y2="108" stroke="#334155" stroke-width="2" />
      <line x1="80" y1="162" x2="80" y2="24" stroke="#334155" stroke-width="2" />
      <rect x="80" y="48" width="115" height="60" fill="#DCFCE7" fill-opacity="0.7" stroke="#16A34A" stroke-width="2.2" />
      <line x1="195" y1="108" x2="265" y2="108" stroke="#2563EB" stroke-width="3" />
      <rect x="265" y="108" width="95" height="34" fill="#FEE2E2" fill-opacity="0.7" stroke="#DC2626" stroke-width="2.2" />
      <text x="50" y="53" font-family="ui-monospace, monospace" font-size="12" font-weight="700" fill="#16A34A">+4</text>
      <text x="50" y="145" font-family="ui-monospace, monospace" font-size="12" font-weight="700" fill="#DC2626">−2</text>
      <text x="190" y="125" font-family="ui-monospace, monospace" font-size="12" fill="#334155">5</text>
      <text x="260" y="100" font-family="ui-monospace, monospace" font-size="12" fill="#334155">8</text>
      <text x="352" y="100" font-family="ui-monospace, monospace" font-size="12" fill="#334155">12</text>
      <text x="402" y="112" font-family="sans-serif" font-size="13" font-weight="700" fill="#0F172A">t (s)</text>
      <text x="28" y="22" font-family="sans-serif" font-size="13" font-weight="700" fill="#0F172A">a (m/s²)</text>
    `,
  },
  'ch02-q23': {
    height: 190,
    caption: 'Position–Time (x–t) Graph of a Particle',
    bodySvg: `
      <line x1="80" y1="150" x2="395" y2="150" stroke="#334155" stroke-width="2" />
      <line x1="80" y1="150" x2="80" y2="25" stroke="#334155" stroke-width="2" />
      <polyline points="80,150 180,50 280,50 355,150" fill="none" stroke="#2563EB" stroke-width="2.8" />
      <line x1="180" y1="50" x2="180" y2="150" stroke="#94A3B8" stroke-dasharray="4,4" />
      <line x1="280" y1="50" x2="280" y2="150" stroke="#94A3B8" stroke-dasharray="4,4" />
      <text x="52" y="54" font-family="ui-monospace, monospace" font-size="12" font-weight="700" fill="#0F172A">30</text>
      <text x="176" y="168" font-family="ui-monospace, monospace" font-size="12" fill="#334155">3</text>
      <text x="276" y="168" font-family="ui-monospace, monospace" font-size="12" fill="#334155">7</text>
      <text x="348" y="168" font-family="ui-monospace, monospace" font-size="12" fill="#334155">10</text>
      <text x="402" y="154" font-family="sans-serif" font-size="13" font-weight="700" fill="#0F172A">t (s)</text>
      <text x="42" y="22" font-family="sans-serif" font-size="13" font-weight="700" fill="#0F172A">x (m)</text>
    `,
  },
  'ch02-q24': {
    height: 190,
    caption: 'Velocity–Position (v–x) Linear Graph',
    bodySvg: `
      <line x1="80" y1="150" x2="380" y2="150" stroke="#334155" stroke-width="2" />
      <line x1="80" y1="150" x2="80" y2="25" stroke="#334155" stroke-width="2" />
      <line x1="80" y1="45" x2="320" y2="150" stroke="#EA580C" stroke-width="2.8" />
      <circle cx="200" cy="97.5" r="4.5" fill="#2563EB" />
      <line x1="200" y1="97.5" x2="200" y2="150" stroke="#94A3B8" stroke-dasharray="4,4" />
      <line x1="80" y1="97.5" x2="200" y2="97.5" stroke="#94A3B8" stroke-dasharray="4,4" />
      <text x="50" y="50" font-family="ui-monospace, monospace" font-size="12" font-weight="700" fill="#0F172A">20</text>
      <text x="50" y="102" font-family="ui-monospace, monospace" font-size="12" fill="#2563EB">10</text>
      <text x="192" y="168" font-family="ui-monospace, monospace" font-size="12" fill="#2563EB">20</text>
      <text x="312" y="168" font-family="ui-monospace, monospace" font-size="12" font-weight="700" fill="#0F172A">40</text>
      <text x="386" y="154" font-family="sans-serif" font-size="13" font-weight="700" fill="#0F172A">x (m)</text>
      <text x="38" y="22" font-family="sans-serif" font-size="13" font-weight="700" fill="#0F172A">v (m/s)</text>
    `,
  },
  'ch03-q04': {
    height: 185,
    caption: 'Parallelogram Law of Vector Addition (θ = 60°)',
    bodySvg: `
      <line x1="95" y1="145" x2="275" y2="145" stroke="#2563EB" stroke-width="2.8" />
      <polygon points="275,145 264,139 264,151" fill="#2563EB" />
      <line x1="95" y1="145" x2="165" y2="45" stroke="#16A34A" stroke-width="2.8" />
      <polygon points="165,45 154,52 164,58" fill="#16A34A" />
      <line x1="275" y1="145" x2="345" y2="45" stroke="#94A3B8" stroke-width="1.5" stroke-dasharray="5,4" />
      <line x1="165" y1="45" x2="345" y2="45" stroke="#94A3B8" stroke-width="1.5" stroke-dasharray="5,4" />
      <line x1="95" y1="145" x2="345" y2="45" stroke="#EA580C" stroke-width="2.8" />
      <polygon points="345,45 333,44 338,54" fill="#EA580C" />
      <path d="M 135,145 A 40,40 0 0,0 118,112" fill="none" stroke="#334155" stroke-width="1.6" />
      <text x="142" y="132" font-family="sans-serif" font-size="12" font-weight="700" fill="#334155">60°</text>
      <text x="175" y="166" font-family="sans-serif" font-size="13" font-weight="700" fill="#2563EB">A = 6 units</text>
      <text x="80" y="84" font-family="sans-serif" font-size="13" font-weight="700" fill="#16A34A">B = 8</text>
      <text x="235" y="78" font-family="sans-serif" font-size="13" font-weight="800" fill="#EA580C">R = A + B</text>
    `,
  },
  'ch03-q11': {
    height: 185,
    caption: 'Oblique Projectile Trajectory (u = 40 m/s, θ = 30°)',
    bodySvg: `
      <line x1="65" y1="150" x2="415" y2="150" stroke="#334155" stroke-width="2" />
      <path d="M 85,150 Q 235,15 385,150" fill="none" stroke="#2563EB" stroke-width="2.8" />
      <line x1="85" y1="150" x2="155" y2="85" stroke="#EA580C" stroke-width="2.4" />
      <polygon points="155,85 144,88 151,96" fill="#EA580C" />
      <line x1="235" y1="82" x2="235" y2="150" stroke="#16A34A" stroke-width="1.8" stroke-dasharray="5,4" />
      <text x="242" y="118" font-family="sans-serif" font-size="12" font-weight="700" fill="#16A34A">H_max</text>
      <text x="120" y="92" font-family="sans-serif" font-size="12" font-weight="700" fill="#EA580C">u = 40 m/s</text>
      <text x="128" y="143" font-family="sans-serif" font-size="12" font-weight="700" fill="#334155">30°</text>
      <text x="220" y="170" font-family="sans-serif" font-size="12" font-weight="700" fill="#0F172A">Range R</text>
    `,
  },
  'ch03-q19': {
    height: 185,
    caption: 'River–Boat Crossing (Width d = 200 m, v_b = 5 m/s, v_r = 3 m/s)',
    bodySvg: `
      <rect x="65" y="42" width="350" height="106" fill="#E0F2FE" stroke="none" />
      <line x1="65" y1="42" x2="415" y2="42" stroke="#0F172A" stroke-width="2.2" />
      <line x1="65" y1="148" x2="415" y2="148" stroke="#0F172A" stroke-width="2.2" />
      <line x1="200" y1="148" x2="200" y2="42" stroke="#16A34A" stroke-width="2.2" stroke-dasharray="5,4" />
      <line x1="200" y1="148" x2="145" y2="62" stroke="#2563EB" stroke-width="2.6" />
      <polygon points="145,62 146,74 155,68" fill="#2563EB" />
      <line x1="275" y1="95" x2="355" y2="95" stroke="#EA580C" stroke-width="2.2" />
      <polygon points="355,95 344,89 344,101" fill="#EA580C" />
      <text x="275" y="85" font-family="sans-serif" font-size="12" font-weight="700" fill="#EA580C">v_r = 3 m/s</text>
      <text x="92" y="102" font-family="sans-serif" font-size="12" font-weight="700" fill="#2563EB">v_b = 5 m/s</text>
      <text x="208" y="100" font-family="sans-serif" font-size="12" font-weight="700" fill="#16A34A">d = 200 m</text>
      <text x="172" y="122" font-family="sans-serif" font-size="11" font-weight="700" fill="#334155">θ</text>
    `,
  },
  'ch04-q03': {
    height: 195,
    caption: 'Atwood Machine: Frictionless Pulley (m₁ = 4 kg, m₂ = 6 kg)',
    bodySvg: `
      <line x1="160" y1="22" x2="320" y2="22" stroke="#0F172A" stroke-width="3" />
      <line x1="240" y1="22" x2="240" y2="54" stroke="#334155" stroke-width="2.5" />
      <circle cx="240" cy="64" r="22" fill="#E2E8F0" stroke="#334155" stroke-width="2.2" />
      <circle cx="240" cy="64" r="4" fill="#0F172A" />
      <line x1="218" y1="64" x2="218" y2="122" stroke="#334155" stroke-width="2" />
      <line x1="262" y1="64" x2="262" y2="140" stroke="#334155" stroke-width="2" />
      <rect x="196" y="122" width="44" height="36" rx="5" fill="#DBEAFE" stroke="#2563EB" stroke-width="2" />
      <text x="206" y="145" font-family="ui-monospace, monospace" font-size="12" font-weight="700" fill="#1D4ED8">4 kg</text>
      <rect x="240" y="140" width="44" height="40" rx="5" fill="#FFEDD5" stroke="#EA580C" stroke-width="2" />
      <text x="250" y="165" font-family="ui-monospace, monospace" font-size="12" font-weight="700" fill="#C2410C">6 kg</text>
      <text x="194" y="98" font-family="sans-serif" font-size="12" font-weight="700" fill="#334155">T ↑</text>
      <text x="272" y="108" font-family="sans-serif" font-size="12" font-weight="700" fill="#334155">↑ T</text>
      <text x="296" y="162" font-family="sans-serif" font-size="12" font-weight="700" fill="#EA580C">a ↓</text>
      <text x="166" y="144" font-family="sans-serif" font-size="12" font-weight="700" fill="#2563EB">↑ a</text>
    `,
  },
  'ch04-q05': {
    height: 190,
    caption: 'Block on Rough 37° Inclined Plane (m = 5 kg, μ = 0.25)',
    bodySvg: `
      <polygon points="85,155 375,155 375,38" fill="#F1F5F9" stroke="#334155" stroke-width="2.2" />
      <g transform="translate(230, 96) rotate(-22)">
        <rect x="-28" y="-32" width="56" height="32" rx="4" fill="#DBEAFE" stroke="#2563EB" stroke-width="2" />
        <text x="-16" y="-12" font-family="ui-monospace, monospace" font-size="12" font-weight="700" fill="#1D4ED8">5 kg</text>
      </g>
      <text x="135" y="146" font-family="sans-serif" font-size="13" font-weight="700" fill="#0F172A">37°</text>
      <text x="285" y="58" font-family="sans-serif" font-size="12" font-weight="700" fill="#EA580C">μ = 0.25</text>
      <text x="150" y="176" font-family="ui-monospace, monospace" font-size="12" fill="#334155">sin 37° = 3/5, cos 37° = 4/5</text>
    `,
  },
  'ch05-q02': {
    height: 190,
    caption: 'Force–Displacement (F–x) Graph',
    bodySvg: `
      <line x1="80" y1="150" x2="390" y2="150" stroke="#334155" stroke-width="2" />
      <line x1="80" y1="150" x2="80" y2="25" stroke="#334155" stroke-width="2" />
      <polygon points="80,150 155,55 280,55 355,150" fill="#DBEAFE" fill-opacity="0.7" stroke="#2563EB" stroke-width="2.5" />
      <line x1="155" y1="55" x2="155" y2="150" stroke="#94A3B8" stroke-dasharray="4,4" />
      <line x1="280" y1="55" x2="280" y2="150" stroke="#94A3B8" stroke-dasharray="4,4" />
      <text x="50" y="60" font-family="ui-monospace, monospace" font-size="12" font-weight="700" fill="#0F172A">10</text>
      <text x="150" y="168" font-family="ui-monospace, monospace" font-size="12" fill="#334155">3</text>
      <text x="275" y="168" font-family="ui-monospace, monospace" font-size="12" fill="#334155">7</text>
      <text x="347" y="168" font-family="ui-monospace, monospace" font-size="12" fill="#334155">10</text>
      <text x="396" y="154" font-family="sans-serif" font-size="13" font-weight="700" fill="#0F172A">x (m)</text>
      <text x="42" y="22" font-family="sans-serif" font-size="13" font-weight="700" fill="#0F172A">F (N)</text>
    `,
  },
  'ch05-q08': {
    height: 190,
    caption: 'Vertical Circular Motion of a Bob (Radius R)',
    bodySvg: `
      <circle cx="240" cy="95" r="64" fill="none" stroke="#94A3B8" stroke-width="2" stroke-dasharray="5,4" />
      <circle cx="240" cy="95" r="4" fill="#0F172A" />
      <line x1="240" y1="95" x2="240" y2="159" stroke="#2563EB" stroke-width="2.2" />
      <circle cx="240" cy="159" r="8" fill="#2563EB" />
      <circle cx="240" cy="31" r="7" fill="#EA580C" />
      <line x1="248" y1="159" x2="310" y2="159" stroke="#2563EB" stroke-width="2.2" />
      <polygon points="310,159 300,154 300,164" fill="#2563EB" />
      <text x="316" y="163" font-family="sans-serif" font-size="12" font-weight="700" fill="#2563EB">u = √(5gR)</text>
      <text x="255" y="36" font-family="sans-serif" font-size="12" font-weight="700" fill="#EA580C">Top (v_top)</text>
      <text x="247" y="130" font-family="sans-serif" font-size="12" font-weight="700" fill="#334155">R</text>
    `,
  },
  'ch06-q05': {
    height: 170,
    caption: 'Uniform Rod (Mass M, Length L) Hinged at One End',
    bodySvg: `
      <polygon points="95,55 112,80 78,80" fill="#CBD5E1" stroke="#334155" stroke-width="2" />
      <circle cx="95" cy="55" r="5" fill="#0F172A" />
      <rect x="95" y="49" width="240" height="12" rx="3" fill="#DBEAFE" stroke="#2563EB" stroke-width="2" />
      <line x1="215" y1="61" x2="215" y2="112" stroke="#EA580C" stroke-width="2.2" />
      <polygon points="215,112 210,102 220,102" fill="#EA580C" />
      <text x="224" y="96" font-family="sans-serif" font-size="13" font-weight="700" fill="#EA580C">Mg (at L/2)</text>
      <text x="195" y="40" font-family="sans-serif" font-size="12" font-weight="700" fill="#1D4ED8">Rod: Mass M, Length L</text>
      <text x="75" y="102" font-family="sans-serif" font-size="11" font-weight="700" fill="#334155">Hinge O</text>
    `,
  },
  'ch09-q04': {
    height: 195,
    caption: 'Torricelli Efflux from Open Tank (H = 5 m, h = 1.25 m)',
    bodySvg: `
      <rect x="85" y="36" width="120" height="128" fill="#E0F2FE" stroke="#0F172A" stroke-width="2.2" />
      <line x1="85" y1="164" x2="395" y2="164" stroke="#334155" stroke-width="2.5" />
      <circle cx="205" cy="68" r="4" fill="#FFFFFF" stroke="#2563EB" stroke-width="2" />
      <path d="M 205,68 Q 290,68 345,164" fill="none" stroke="#2563EB" stroke-width="2.5" stroke-dasharray="5,3" />
      <line x1="72" y1="36" x2="72" y2="164" stroke="#334155" stroke-width="1.5" />
      <text x="26" y="104" font-family="sans-serif" font-size="12" font-weight="700" fill="#0F172A">H = 5 m</text>
      <text x="215" y="56" font-family="sans-serif" font-size="12" font-weight="700" fill="#EA580C">h = 1.25 m</text>
      <text x="255" y="182" font-family="sans-serif" font-size="12" font-weight="700" fill="#1D4ED8">Range R = 2√(h(H−h))</text>
    `,
  },
  'ch11-q02': {
    height: 190,
    caption: 'P–V Rectangular Cyclic Process (A → B → C → D → A)',
    bodySvg: `
      <line x1="85" y1="152" x2="375" y2="152" stroke="#334155" stroke-width="2" />
      <line x1="85" y1="152" x2="85" y2="24" stroke="#334155" stroke-width="2" />
      <rect x="145" y="48" width="160" height="68" fill="#FEF3C7" fill-opacity="0.7" stroke="#EA580C" stroke-width="2.4" />
      <polygon points="230,48 220,43 220,53" fill="#EA580C" />
      <polygon points="305,86 300,76 310,76" fill="#EA580C" />
      <text x="132" y="42" font-family="sans-serif" font-size="12" font-weight="800" fill="#0F172A">A</text>
      <text x="310" y="42" font-family="sans-serif" font-size="12" font-weight="800" fill="#0F172A">B</text>
      <text x="310" y="128" font-family="sans-serif" font-size="12" font-weight="800" fill="#0F172A">C</text>
      <text x="132" y="128" font-family="sans-serif" font-size="12" font-weight="800" fill="#0F172A">D</text>
      <text x="48" y="54" font-family="ui-monospace, monospace" font-size="12" font-weight="700" fill="#0F172A">3P₀</text>
      <text x="52" y="120" font-family="ui-monospace, monospace" font-size="12" font-weight="700" fill="#0F172A">P₀</text>
      <text x="140" y="170" font-family="ui-monospace, monospace" font-size="12" font-weight="700" fill="#0F172A">V₀</text>
      <text x="296" y="170" font-family="ui-monospace, monospace" font-size="12" font-weight="700" fill="#0F172A">4V₀</text>
      <text x="382" y="156" font-family="sans-serif" font-size="13" font-weight="700" fill="#0F172A">V</text>
      <text x="66" y="22" font-family="sans-serif" font-size="13" font-weight="700" fill="#0F172A">P</text>
    `,
  },
  'ch13-q02': {
    height: 165,
    caption: 'Block of Mass m Between Two Parallel Horizontal Springs (k₁, k₂)',
    bodySvg: `
      <line x1="65" y1="35" x2="65" y2="120" stroke="#0F172A" stroke-width="4" />
      <line x1="415" y1="35" x2="415" y2="120" stroke="#0F172A" stroke-width="4" />
      <line x1="65" y1="120" x2="415" y2="120" stroke="#64748B" stroke-width="2" />
      <polyline points="65,88 85,88 93,74 105,102 117,74 129,102 141,74 153,102 161,88 180,88" fill="none" stroke="#2563EB" stroke-width="2.2" />
      <rect x="180" y="62" width="70" height="54" rx="6" fill="#DBEAFE" stroke="#1D4ED8" stroke-width="2.2" />
      <text x="208" y="94" font-family="sans-serif" font-size="15" font-weight="800" fill="#0F172A">m</text>
      <polyline points="250,88 270,88 278,74 290,102 302,74 314,102 326,74 338,102 346,88 415,88" fill="none" stroke="#EA580C" stroke-width="2.2" />
      <text x="115" y="56" font-family="sans-serif" font-size="13" font-weight="700" fill="#2563EB">k₁</text>
      <text x="315" y="56" font-family="sans-serif" font-size="13" font-weight="700" fill="#EA580C">k₂</text>
      <text x="155" y="144" font-family="ui-monospace, monospace" font-size="12" fill="#334155">Smooth horizontal floor</text>
    `,
  },
  'ch14-q03': {
    height: 170,
    caption: 'Standing Wave in 3rd Harmonic (3 Loops, Length L)',
    bodySvg: `
      <line x1="75" y1="32" x2="75" y2="128" stroke="#0F172A" stroke-width="3.5" />
      <line x1="405" y1="32" x2="405" y2="128" stroke="#0F172A" stroke-width="3.5" />
      <line x1="75" y1="80" x2="405" y2="80" stroke="#94A3B8" stroke-width="1.4" stroke-dasharray="4,4" />
      <path d="M 75,80 Q 130,25 185,80 T 295,80 T 405,80" fill="none" stroke="#2563EB" stroke-width="2.6" />
      <path d="M 75,80 Q 130,135 185,80 T 295,80 T 405,80" fill="none" stroke="#EA580C" stroke-width="2.2" stroke-dasharray="5,3" />
      <circle cx="75" cy="80" r="4" fill="#0F172A" />
      <circle cx="185" cy="80" r="4" fill="#0F172A" />
      <circle cx="295" cy="80" r="4" fill="#0F172A" />
      <circle cx="405" cy="80" r="4" fill="#0F172A" />
      <text x="122" y="148" font-family="ui-monospace, monospace" font-size="12" font-weight="700" fill="#0F172A">4 Nodes · 3 Antinodes · L = 3λ/2</text>
    `,
  },
};

export function renderPhysicsQuestionWithDiagramUrl(params: {
  questionNumber: number;
  subjectName: string;
  chapterName: string;
  questionText: string;
  diagramKey: PhysicsDiagramKey;
}): string {
  const spec = DIAGRAM_SPECS[params.diagramKey];
  const width = 760;
  const lineHeight = 28;
  const prettyText = formatScientificNotation(params.questionText);
  const lines = wrapSvgLines(prettyText, 64);

  const headerY = 36;
  const textStartY = 68;
  const diagramBoxY = textStartY + lines.length * lineHeight + 10;
  const diagramBoxHeight = spec.height + 26;
  const totalHeight = diagramBoxY + diagramBoxHeight + 20;

  const qBadge = `Q${params.questionNumber}`;
  const metaText = `${params.subjectName} · ${params.chapterName}`;

  const textEls = lines
    .map(
      (line, idx) =>
        `<text x="28" y="${textStartY + idx * lineHeight}" fill="#0F172A" font-family="'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="500">${escapeSvgXml(line)}</text>`
    )
    .join('');

  const svg = `<svg data-composite-question="1" xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}" viewBox="0 0 ${width} ${totalHeight}">
    <rect x="1" y="1" width="${width - 2}" height="${totalHeight - 2}" rx="14" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5" />
    <rect x="1" y="14" width="5" height="${totalHeight - 28}" rx="2.5" fill="#2563EB" />
    <rect x="24" y="18" width="56" height="26" rx="8" fill="#EFF6FF" />
    <text x="34" y="${headerY}" fill="#1D4ED8" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" font-weight="700">${escapeSvgXml(qBadge)}</text>
    <text x="90" y="${headerY}" fill="#64748B" font-family="'DM Sans', -apple-system, sans-serif" font-size="13" font-weight="600">${escapeSvgXml(metaText.slice(0, 74))}</text>
    ${textEls}
    <rect x="28" y="${diagramBoxY}" width="${width - 56}" height="${diagramBoxHeight}" rx="12" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.2" />
    <g transform="translate(140, ${diagramBoxY + 4})">
      ${spec.bodySvg}
    </g>
    <text x="${width / 2}" y="${diagramBoxY + diagramBoxHeight - 8}" text-anchor="middle" fill="#475569" font-family="'DM Sans', -apple-system, sans-serif" font-size="12" font-weight="600">${escapeSvgXml(spec.caption)}</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
