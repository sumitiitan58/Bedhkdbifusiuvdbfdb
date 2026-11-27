import { motion } from 'motion/react';
import type { LiveTeacherSvgType } from '../../utils/liveTeacherEngine';

interface LiveTeacherSvgBoardProps {
  svgType: LiveTeacherSvgType;
  activeStep: number; // 1..4
}

export function LiveTeacherSvgBoard({ svgType, activeStep }: LiveTeacherSvgBoardProps) {
  const isStep2Plus = activeStep >= 2;
  const isStep3Plus = activeStep >= 3;
  const isStep4 = activeStep >= 4;

  return (
    <div className="rounded-xl border border-[#00B4FF]/25 bg-[#070D1B]/90 p-2.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-wider">
        <span className="text-[#00B4FF] font-bold">
          Animated Board Diagram · {svgType.toUpperCase()}
        </span>
        <span className="text-amber-300 font-semibold">Step {activeStep}/4 Highlight</span>
      </div>

      <div className="w-full flex items-center justify-center overflow-hidden rounded-lg bg-[#060B16] border border-white/5 py-1.5 max-h-[152px]">
        {svgType === 'vectors' && (
          <svg viewBox="0 0 320 170" className="w-full max-w-[320px] h-auto" role="img" aria-label="Inclined plane free-body vector diagram">
            {/* Incline triangle */}
            <polygon points="35,148 280,148 280,46" fill="rgba(0,180,255,0.06)" stroke="#334155" strokeWidth="2" />
            <path d="M 78,148 A 42,42 0 0 0 72,132" fill="none" stroke="#F27B13" strokeWidth="1.8" />
            <text x="84" y="142" fill="#F27B13" fontSize="12" fontFamily="monospace" fontWeight="bold">θ</text>

            {/* Block on slope */}
            <g transform="translate(172,88) rotate(-22.5)">
              <rect x="-20" y="-18" width="40" height="24" rx="4" fill="#1D56C6" fillOpacity="0.45" stroke="#00B4FF" strokeWidth="2" />
              <text x="-5" y="-3" fill="#FFFFFF" fontSize="11" fontFamily="monospace" fontWeight="bold">m</text>

              {/* Normal vector N */}
              <motion.line
                x1="0" y1="-18" x2="0" y2="-56"
                stroke="#10B981" strokeWidth="2.5"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }}
              />
              <polygon points="0,-60 -4,-51 4,-51" fill="#10B981" />
              <text x="6" y="-48" fill="#10B981" fontSize="11" fontFamily="monospace" fontWeight="bold">N</text>

              {/* Friction f_k up slope */}
              {isStep2Plus && (
                <g>
                  <line x1="20" y1="-6" x2="58" y2="-6" stroke="#F27B13" strokeWidth="2.2" />
                  <polygon points="62,-6 54,-10 54,-2" fill="#F27B13" />
                  <text x="36" y="-13" fill="#F27B13" fontSize="10" fontFamily="monospace" fontWeight="bold">f = μN</text>
                </g>
              )}

              {/* mg sinθ down slope */}
              <motion.line
                x1="-20" y1="-6" x2="-68" y2="-6"
                stroke="#00B4FF" strokeWidth={isStep2Plus ? 3 : 2}
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7 }}
              />
              <polygon points="-73,-6 -64,-10 -64,-2" fill="#00B4FF" />
              <text x="-82" y="-14" fill="#00B4FF" fontSize="10" fontFamily="monospace" fontWeight="bold">mg sinθ</text>

              {/* mg cosθ perpendicular */}
              {isStep2Plus && (
                <g>
                  <line x1="0" y1="6" x2="0" y2="44" stroke="#94A3B8" strokeWidth="2" strokeDasharray="4 3" />
                  <polygon points="0,49 -4,40 4,40" fill="#94A3B8" />
                  <text x="6" y="42" fill="#CBD5E1" fontSize="10" fontFamily="monospace">mg cosθ</text>
                </g>
              )}
            </g>

            {/* Vertical weight mg */}
            <motion.line
              x1="172" y1="90" x2="172" y2="145"
              stroke="#F43F5E" strokeWidth="2.5"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }}
            />
            <polygon points="172,150 168,141 176,141" fill="#F43F5E" />
            <text x="178" y="142" fill="#F43F5E" fontSize="11" fontFamily="monospace" fontWeight="bold">mg</text>

            {/* Acceleration indicator */}
            {isStep3Plus && (
              <g>
                <line x1="115" y1="52" x2="68" y2="71" stroke="#10B981" strokeWidth="2.2" strokeDasharray="5 3" className="arcade-dash-flow" />
                <polygon points="62,74 71,74 68,66" fill="#10B981" />
                <text x="58" y="48" fill="#10B981" fontSize="10" fontFamily="monospace" fontWeight="bold">
                  {isStep4 ? 'a = g(sinθ − μcosθ)' : 'Net a ↓'}
                </text>
              </g>
            )}
          </svg>
        )}

        {svgType === 'circuit' && (
          <svg viewBox="0 0 320 165" className="w-full max-w-[320px] h-auto" role="img" aria-label="Animated Kirchhoff RC circuit diagram">
            {/* Outer loop wire */}
            <rect x="44" y="34" width="232" height="98" rx="8" fill="none" stroke="#334155" strokeWidth="2.5" />
            {/* Animated cyan current flow */}
            <rect
              x="44" y="34" width="232" height="98" rx="8" fill="none"
              stroke={isStep2Plus ? '#00B4FF' : '#38BDF8'} strokeWidth="2.2" strokeDasharray="8 8"
              className="arcade-dash-flow"
            />
            {/* Battery on left */}
            <rect x="34" y="68" width="20" height="28" fill="#060B16" />
            <line x1="34" y1="74" x2="54" y2="74" stroke="#F27B13" strokeWidth="3" />
            <line x1="39" y1="86" x2="49" y2="86" stroke="#F27B13" strokeWidth="2" />
            <text x="12" y="84" fill="#F27B13" fontSize="11" fontFamily="monospace" fontWeight="bold">E</text>

            {/* Top Resistor R1 */}
            <rect x="115" y="25" width="54" height="18" fill="#060B16" />
            <polyline points="115,34 121,26 129,42 137,26 145,42 153,26 161,42 169,34" fill="none" stroke="#10B981" strokeWidth="2.2" />
            <text x="132" y="19" fill="#10B981" fontSize="11" fontFamily="monospace" fontWeight="bold">R₁</text>

            {/* Middle Branch R2 */}
            <line x1="205" y1="34" x2="205" y2="132" stroke="#475569" strokeWidth="2" />
            <rect x="196" y="62" width="18" height="40" fill="#060B16" />
            <polyline points="205,62 197,68 213,75 197,82 213,89 197,96 205,102" fill="none" stroke="#00B4FF" strokeWidth="2.2" />
            <text x="172" y="86" fill="#00B4FF" fontSize="10" fontFamily="monospace" fontWeight="bold">R₂</text>

            {/* Right Capacitor C */}
            <rect x="266" y="72" width="20" height="20" fill="#060B16" />
            <line x1="264" y1="77" x2="288" y2="77" stroke="#F59E0B" strokeWidth="2.5" />
            <line x1="264" y1="87" x2="288" y2="87" stroke="#F59E0B" strokeWidth="2.5" />
            <text x="292" y="86" fill="#F59E0B" fontSize="11" fontFamily="monospace" fontWeight="bold">C</text>

            {/* Current label */}
            <text x="64" y="24" fill="#00B4FF" fontSize="11" fontFamily="monospace" fontWeight="bold">
              {isStep3Plus ? 'I = E / R_eq →' : 'I →'}
            </text>
            <text x="108" y="152" fill="#94A3B8" fontSize="10" fontFamily="monospace">
              {isStep4 ? 'KVL Loop Verified · ΣΔV = 0' : 'Kirchhoff Closed Loop'}
            </text>
          </svg>
        )}

        {svgType === 'optics' && (
          <svg viewBox="0 0 320 165" className="w-full max-w-[320px] h-auto" role="img" aria-label="Animated convex lens ray diagram">
            {/* Principal axis */}
            <line x1="16" y1="88" x2="304" y2="88" stroke="#475569" strokeWidth="1.5" strokeDasharray="4 4" />
            {/* Convex lens */}
            <path d="M 160,24 Q 178,88 160,152 Q 142,88 160,24 Z" fill="rgba(0,180,255,0.16)" stroke="#00B4FF" strokeWidth="2" />
            {/* Foci */}
            <circle cx="105" cy="88" r="3" fill="#F27B13" />
            <text x="98" y="103" fill="#F27B13" fontSize="10" fontFamily="monospace">F₁</text>
            <circle cx="215" cy="88" r="3" fill="#F27B13" />
            <text x="208" y="103" fill="#F27B13" fontSize="10" fontFamily="monospace">F₂</text>
            {/* Object arrow */}
            <line x1="62" y1="88" x2="62" y2="46" stroke="#10B981" strokeWidth="2.5" />
            <polygon points="62,40 58,49 66,49" fill="#10B981" />
            <text x="44" y="42" fill="#10B981" fontSize="10" fontFamily="monospace" fontWeight="bold">Obj</text>
            {/* Ray 1: Parallel then through F2 */}
            <motion.polyline
              points="62,46 160,46 272,134"
              fill="none" stroke="#00B4FF" strokeWidth="2"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }}
            />
            {/* Ray 2: Through Optical Center */}
            {isStep2Plus && (
              <motion.line
                x1="62" y1="46" x2="272" y2="134"
                stroke="#F59E0B" strokeWidth="2"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }}
              />
            )}
            {/* Real Inverted Image */}
            {isStep2Plus && (
              <g>
                <line x1="272" y1="88" x2="272" y2="130" stroke="#F43F5E" strokeWidth="2.5" />
                <polygon points="272,136 268,127 276,127" fill="#F43F5E" />
                <text x="255" y="150" fill="#F43F5E" fontSize="10" fontFamily="monospace" fontWeight="bold">Image (v)</text>
              </g>
            )}
            <text x="22" y="152" fill="#94A3B8" fontSize="10" fontFamily="monospace">
              u &lt; 0 (Real) · f &gt; 0 (Convex)
            </text>
          </svg>
        )}

        {svgType === 'reaction' && (
          <svg viewBox="0 0 320 160" className="w-full max-w-[320px] h-auto" role="img" aria-label="Animated organic reaction mechanism diagram">
            {/* Substrate node */}
            <rect x="14" y="52" width="84" height="48" rx="10" fill="#0D1830" stroke="#00B4FF" strokeWidth="1.8" />
            <text x="56" y="73" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontFamily="monospace" fontWeight="bold">R-CHO</text>
            <text x="56" y="89" textAnchor="middle" fill="#94A3B8" fontSize="9" fontFamily="monospace">δ⁺ Carbonyl</text>

            {/* Curved electron attack arrow */}
            <motion.path
              d="M 56,122 Q 44,106 52,96"
              fill="none" stroke="#F27B13" strokeWidth="2"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7 }}
            />
            <text x="36" y="138" fill="#F27B13" fontSize="10" fontFamily="monospace" fontWeight="bold">Nu⁻ / H⁻</text>

            {/* Reagent arrow 1 */}
            <line x1="100" y1="76" x2="148" y2="76" stroke="#00B4FF" strokeWidth="2.2" strokeDasharray="5 3" className="arcade-dash-flow" />
            <polygon points="153,76 145,72 145,80" fill="#00B4FF" />
            <text x="126" y="65" textAnchor="middle" fill="#00B4FF" fontSize="9" fontFamily="monospace" fontWeight="bold">Reagent</text>

            {/* Intermediate */}
            <rect x="155" y="52" width="60" height="48" rx="10" fill={isStep2Plus ? 'rgba(242,123,19,0.16)' : '#0D1830'} stroke="#F27B13" strokeWidth="1.8" />
            <text x="185" y="73" textAnchor="middle" fill="#FDE68A" fontSize="10" fontFamily="monospace" fontWeight="bold">[T.S.]</text>
            <text x="185" y="89" textAnchor="middle" fill="#F27B13" fontSize="9" fontFamily="monospace">Step 2</text>

            {/* Arrow 2 */}
            <line x1="217" y1="76" x2="242" y2="76" stroke="#10B981" strokeWidth="2.2" />
            <polygon points="247,76 239,72 239,80" fill="#10B981" />

            {/* Major Product */}
            <rect x="249" y="48" width="62" height="56" rx="10" fill={isStep3Plus ? 'rgba(16,185,129,0.18)' : '#0D1830'} stroke="#10B981" strokeWidth="2" />
            <text x="280" y="73" textAnchor="middle" fill="#10B981" fontSize="10" fontFamily="monospace" fontWeight="bold">Major</text>
            <text x="280" y="88" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontFamily="monospace">Product</text>

            <text x="160" y="144" textAnchor="middle" fill="#94A3B8" fontSize="10" fontFamily="monospace">
              {isStep4 ? 'Chemoselective Pathway Verified' : 'Nucleophilic Addition / Selectivity'}
            </text>
          </svg>
        )}

        {svgType === 'calculus' && (
          <svg viewBox="0 0 320 160" className="w-full max-w-[320px] h-auto" role="img" aria-label="Animated definite integral curve diagram">
            {/* Axes */}
            <line x1="34" y1="132" x2="294" y2="132" stroke="#475569" strokeWidth="1.8" />
            <line x1="48" y1="20" x2="48" y2="144" stroke="#475569" strokeWidth="1.8" />
            {/* Shaded area under curve */}
            <motion.path
              d="M 88,132 L 88,78 Q 160,26 232,78 L 232,132 Z"
              fill="rgba(0,180,255,0.22)"
              initial={{ opacity: 0.2 }} animate={{ opacity: isStep2Plus ? 0.9 : 0.45 }} transition={{ duration: 0.6 }}
            />
            {/* Function curve */}
            <motion.path
              d="M 54,116 Q 160,12 276,108"
              fill="none" stroke="#00B4FF" strokeWidth="2.8"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9 }}
            />
            {/* Symmetry axis */}
            {isStep2Plus && (
              <line x1="160" y1="30" x2="160" y2="132" stroke="#F27B13" strokeWidth="1.8" strokeDasharray="4 3" />
            )}
            <text x="84" y="147" fill="#CBD5E1" fontSize="11" fontFamily="monospace">a</text>
            <text x="228" y="147" fill="#CBD5E1" fontSize="11" fontFamily="monospace">b</text>
            <text x="148" y="24" fill="#F27B13" fontSize="10" fontFamily="monospace" fontWeight="bold">a+b−x</text>
            <text x="128" y="106" fill="#10B981" fontSize="11" fontFamily="monospace" fontWeight="bold">Area = I</text>
          </svg>
        )}

        {(svgType === 'mechanics' || svgType === 'biology' || svgType === 'generic') && (
          <svg viewBox="0 0 320 160" className="w-full max-w-[320px] h-auto" role="img" aria-label="Animated concept blueprint diagram">
            {svgType === 'mechanics' ? (
              <>
                {/* Rotating disc / orbit */}
                <circle cx="160" cy="82" r="46" fill="rgba(0,180,255,0.1)" stroke="#00B4FF" strokeWidth="2.2" />
                <circle cx="160" cy="82" r="5" fill="#F27B13" />
                {/* Radius vector */}
                <line x1="160" y1="82" x2="206" y2="82" stroke="#F59E0B" strokeWidth="2" />
                <text x="176" y="76" fill="#F59E0B" fontSize="11" fontFamily="monospace" fontWeight="bold">R</text>
                {/* Tangential velocity */}
                <motion.line
                  x1="206" y1="82" x2="206" y2="34"
                  stroke="#10B981" strokeWidth="2.5"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7 }}
                />
                <polygon points="206,28 202,37 210,37" fill="#10B981" />
                <text x="214" y="42" fill="#10B981" fontSize="11" fontFamily="monospace" fontWeight="bold">v = ωR</text>
                {/* Angular velocity arc */}
                <path d="M 130,52 A 42,42 0 0 1 188,50" fill="none" stroke="#F27B13" strokeWidth="2" strokeDasharray="4 3" className="arcade-dash-flow" />
                <text x="150" y="26" fill="#F27B13" fontSize="11" fontFamily="monospace" fontWeight="bold">ω, L = Iω</text>
                <text x="160" y="148" textAnchor="middle" fill="#94A3B8" fontSize="10" fontFamily="monospace">
                  {isStep3Plus ? 'Conservation & Axis Theorem Active' : 'Rotational / Field Geometry'}
                </text>
              </>
            ) : svgType === 'biology' ? (
              <>
                {/* NCERT Genetics / Gel Band visual */}
                <rect x="30" y="24" width="260" height="106" rx="12" fill="rgba(16,185,129,0.08)" stroke="#10B981" strokeWidth="1.8" />
                <text x="52" y="46" fill="#00B4FF" fontSize="10" fontFamily="monospace" fontWeight="bold">Cathode (−)</text>
                <text x="216" y="46" fill="#F27B13" fontSize="10" fontFamily="monospace" fontWeight="bold">Anode (+)</text>
                {/* DNA / Trait bands */}
                {[78, 128, 186, 236].map((x, idx) => (
                  <motion.rect
                    key={x}
                    x={x}
                    y={60 + idx * 4}
                    width={10}
                    height={46 - idx * 8}
                    rx="3"
                    fill={idx >= 2 ? '#F27B13' : '#00B4FF'}
                    initial={{ opacity: 0.3 }}
                    animate={{ opacity: activeStep >= idx + 1 ? 1 : 0.4 }}
                    transition={{ duration: 0.4 }}
                  />
                ))}
                <line x1="66" y1="116" x2="254" y2="116" stroke="#10B981" strokeWidth="2" strokeDasharray="5 3" className="arcade-dash-flow" />
                <polygon points="260,116 252,112 252,120" fill="#10B981" />
                <text x="160" y="148" textAnchor="middle" fill="#94A3B8" fontSize="10" fontFamily="monospace">
                  NCERT Concept Mapping &amp; Exception Check
                </text>
              </>
            ) : (
              <>
                {[
                  { x: 16, label: '1. Given', color: '#00B4FF', step: 1 },
                  { x: 92, label: '2. Law', color: '#F27B13', step: 2 },
                  { x: 168, label: '3. Derive', color: '#38BDF8', step: 3 },
                  { x: 244, label: '4. Lock', color: '#10B981', step: 4 },
                ].map((node, i) => (
                  <g key={node.label}>
                    <rect
                      x={node.x}
                      y="54"
                      width="62"
                      height="46"
                      rx="10"
                      fill={activeStep === node.step ? 'rgba(0,180,255,0.2)' : '#0D1830'}
                      stroke={activeStep >= node.step ? node.color : '#334155'}
                      strokeWidth={activeStep === node.step ? 2.4 : 1.5}
                    />
                    <text
                      x={node.x + 31}
                      y="81"
                      textAnchor="middle"
                      fill={activeStep >= node.step ? '#FFFFFF' : '#64748B'}
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {node.label}
                    </text>
                    {i < 3 && (
                      <line
                        x1={node.x + 62}
                        y1="77"
                        x2={node.x + 76}
                        y2="77"
                        stroke={activeStep > node.step ? '#10B981' : '#334155'}
                        strokeWidth="2"
                      />
                    )}
                  </g>
                ))}
                <text x="160" y="136" textAnchor="middle" fill="#94A3B8" fontSize="10" fontFamily="monospace">
                  4-Step Structured Faculty Derivation
                </text>
              </>
            )}
          </svg>
        )}
      </div>
    </div>
  );
}
