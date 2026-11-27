import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import prepsbotTeacherImg from '../../assets/images/prepsbot_teacher_transparent.png';
import type { VisemeSample } from '../../utils/lipSyncEngine';

export type AvatarViewMode = 'lipsync' | 'robot-squad' | '3d';
export type TutorPose = 'wave' | 'speaking' | 'idle' | 'listening';

export const PREPSBOT_SQUAD_IMAGE_URL = '/assets/aistudio/IMG_1608_9fc2c23c.png';

const ROBOT_SQUAD_PERSONAS = [
  { id: 'formula', label: 'Formula', pos: '5% 52%', accent: '#00B4FF' },
  { id: 'analytics', label: 'Stats', pos: '36% 52%', accent: '#F27B13' },
  { id: 'mentor', label: 'NCERT', pos: '65% 50%', accent: '#10B981' },
  { id: 'study', label: 'Focus', pos: '95% 52%', accent: '#A855F7' },
] as const;

interface LipSyncTutorAvatarProps {
  mode: AvatarViewMode;
  pose: TutorPose;
  visemeSample: VisemeSample;
  isPlaying: boolean;
  handRaised: boolean;
  micListening: boolean;
  stepPointOffsetY: number;
  stepPointTiltDeg: number;
  compact?: boolean;
}

const SPECTRUM_WEIGHTS = [
  0.28, 0.45, 0.68, 0.88, 1.0, 0.92, 0.78, 0.96, 0.84, 0.64, 0.76, 0.94, 0.82, 0.58, 0.42, 0.26,
];

function computeMouthGeometry(sample: VisemeSample) {
  const open = Math.max(0.04, Math.min(1, sample.openness));
  const widthScale = sample.width;
  const rx = 18 * widthScale;
  const ry = Math.max(1.8, open * 13.5);
  const showTeeth = sample.viseme === 'EE' || sample.viseme === 'FV' || sample.viseme === 'AA' || open > 0.35;
  const showTongue = sample.viseme === 'AA' || sample.viseme === 'OH' || sample.viseme === 'LTH' || open > 0.5;
  return { rx, ry, showTeeth, showTongue, jawDrop: sample.jawDropPx };
}

export function LipSyncTutorAvatar({
  mode,
  pose,
  visemeSample,
  isPlaying,
  handRaised,
  micListening,
  stepPointOffsetY,
  stepPointTiltDeg,
  compact = false,
}: LipSyncTutorAvatarProps) {
  const [blinking, setBlinking] = useState(false);
  const [pulseTick, setPulseTick] = useState(0);
  const [squadPersonaIdx, setSquadPersonaIdx] = useState(0);
  const activePersona = ROBOT_SQUAD_PERSONAS[squadPersonaIdx] ?? ROBOT_SQUAD_PERSONAS[0];

  // Natural autonomous eye blinking every ~3.4s
  useEffect(() => {
    let blinkTimeout: number | null = null;
    const interval = window.setInterval(() => {
      setBlinking(true);
      blinkTimeout = window.setTimeout(() => setBlinking(false), 140);
    }, 3400);
    return () => {
      window.clearInterval(interval);
      if (blinkTimeout !== null) window.clearTimeout(blinkTimeout);
    };
  }, []);

  // Gentle animation tick for voice spectrum bars when speaking or listening to mic
  useEffect(() => {
    if (!isPlaying && !micListening) return;
    const id = window.setInterval(() => {
      setPulseTick((t) => (t + 1) % 60);
    }, 90);
    return () => window.clearInterval(id);
  }, [isPlaying, micListening]);

  const mouth = computeMouthGeometry(visemeSample);
  const headTilt =
    pose === 'listening'
      ? 3.2
      : pose === 'speaking'
        ? Math.sin(pulseTick * 0.45) * 2.1 + visemeSample.openness * 1.4
        : 0;
  const eyebrowLift =
    pose === 'listening' ? -2.2 : pose === 'speaking' ? -visemeSample.openness * 2.8 : 0;

  if (compact) {
    return (
      <div className="flex flex-col items-center">
        {mode === 'lipsync' ? (
          <div className="relative w-[62px] h-[62px] rounded-full bg-[#0C172D] border border-[#00B4FF]/50 shadow-[0_8px_20px_rgba(0,180,255,0.3)] overflow-hidden">
            <svg viewBox="0 0 220 220" className="w-full h-full" role="img" aria-label="AI Tutor lip-sync face">
              <defs>
                <radialGradient id="tutorBgCompact" cx="50%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#16284D" />
                  <stop offset="100%" stopColor="#091022" />
                </radialGradient>
              </defs>
              <rect width="220" height="220" fill="url(#tutorBgCompact)" />
              <g transform={`translate(110 118) rotate(${headTilt.toFixed(1)})`}>
                <ellipse cx="0" cy="-6" rx="58" ry="66" fill="#F2C09B" />
                <path d="M -62 -24 C -58 -86, 58 -86, 62 -24 C 44 -56, -42 -58, -62 -24 Z" fill="#131926" />
                <path d="M -56 -34 Q 0 -52 56 -34" fill="none" stroke="#00B4FF" strokeWidth="7" strokeLinecap="round" />
                <ellipse cx="-22" cy="-12" rx="8" ry={blinking ? 1.5 : 8} fill="#0F172A" />
                <ellipse cx="22" cy="-12" rx="8" ry={blinking ? 1.5 : 8} fill="#0F172A" />
                <g transform={`translate(0 ${(24 + mouth.jawDrop * 0.45).toFixed(1)})`}>
                  <ellipse cx="0" cy="0" rx={mouth.rx} ry={mouth.ry} fill="#3B0F1A" stroke="#9B4D42" strokeWidth="2.4" />
                  {mouth.showTeeth && (
                    <rect x={-mouth.rx * 0.65} y={-mouth.ry * 0.82} width={mouth.rx * 1.3} height={Math.min(5, mouth.ry * 0.65)} rx="2" fill="#FFFFFF" />
                  )}
                </g>
              </g>
            </svg>
          </div>
        ) : (
          <img
            src={prepsbotTeacherImg}
            alt=""
            draggable={false}
            className={`w-[54px] sm:w-[68px] h-auto object-contain ${
              pose === 'listening'
                ? 'teacher-pose-listening'
                : isPlaying
                  ? 'teacher-pose-speaking drop-shadow-[0_8px_16px_rgba(0,180,255,0.4)]'
                  : 'teacher-pose-idle'
            }`}
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-h-0 w-full flex flex-col items-center justify-end gap-2 overflow-hidden">
      {mode === 'lipsync' ? (
        <div
          data-testid="lipsync-svg-avatar"
          data-viseme={visemeSample.viseme}
          className="relative flex-1 min-h-0 w-full flex items-center justify-center"
        >
          {/* Ambient audio-reactive halo ring behind avatar */}
          <div
            aria-hidden="true"
            style={{
              transform: `scale(${(0.95 + visemeSample.energy * 0.14).toFixed(3)})`,
              opacity: isPlaying || micListening ? 0.55 + visemeSample.energy * 0.35 : 0.2,
            }}
            className={`pointer-events-none absolute w-52 h-52 rounded-full blur-2xl transition-all duration-100 ${
              micListening
                ? 'bg-rose-500/35'
                : pose === 'listening'
                  ? 'bg-[#00B4FF]/40'
                  : 'bg-[#00B4FF]/30'
            }`}
          />

          <svg
            viewBox="0 0 280 310"
            className="relative z-10 h-full max-h-[340px] w-auto max-w-full select-none drop-shadow-[0_18px_28px_rgba(0,0,0,0.55)]"
            role="img"
            aria-label="PrepsBot AI Tutor with real-time audio-driven lip syncing"
          >
            <defs>
              <linearGradient id="armorSuit" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#1E3A8A" />
                <stop offset="50%" stopColor="#0E234E" />
                <stop offset="100%" stopColor="#091533" />
              </linearGradient>
              <linearGradient id="chestPlate" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F8FAFC" />
                <stop offset="100%" stopColor="#CBD5E1" />
              </linearGradient>
              <linearGradient id="skinTone" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F8CFAF" />
                <stop offset="100%" stopColor="#E6AE86" />
              </linearGradient>
              <linearGradient id="cyanGlow" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#00B4FF" />
                <stop offset="100%" stopColor="#38BDF8" />
              </linearGradient>
              <linearGradient id="saffronTrim" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#F27B13" />
              </linearGradient>
            </defs>

            {/* Shoulders & Prepskm Armor Torso */}
            <g transform={`translate(140 245) translate(0 ${(visemeSample.energy * -2.2).toFixed(1)})`}>
              <path
                d="M -92 65 C -90 12, -62 -12, -30 -18 L 30 -18 C 62 -12, 90 12, 92 65 Z"
                fill="url(#armorSuit)"
                stroke="#38BDF8"
                strokeOpacity="0.35"
                strokeWidth="2"
              />
              {/* Orange Collar */}
              <path
                d="M -28 -18 Q 0 -2 28 -18 L 22 -28 Q 0 -16 -22 -28 Z"
                fill="url(#saffronTrim)"
              />
              {/* White Tech Chest Plate */}
              <path
                d="M -46 6 L 46 6 L 38 56 L -38 56 Z"
                fill="url(#chestPlate)"
                stroke="#64748B"
                strokeWidth="1.5"
              />
              {/* Official Prepskm P-Arrow Emblem */}
              <g transform="translate(0 30)">
                <path d="M -14 14 L -14 -14 L 4 -14 C 12 -14 12 -1 4 -1 L -6 -1" fill="none" stroke="#1D56C6" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M -10 8 L 0 -2 L 5 3 L 15 -10" fill="none" stroke="#00B4FF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                <polygon points="18,-13 11,-11 16,-6" fill="#F27B13" />
              </g>
              {/* Shoulder Cyan Accents */}
              <ellipse cx="-68" cy="14" rx="14" ry="7" transform="rotate(-22 -68 14)" fill="#00B4FF" fillOpacity="0.7" />
              <ellipse cx="68" cy="14" rx="14" ry="7" transform="rotate(22 68 14)" fill="#00B4FF" fillOpacity="0.7" />
            </g>

            {/* Neck */}
            <rect x="122" y="196" width="36" height="32" rx="12" fill="#DCA077" />

            {/* Articulated Head Group with Prosody Tilt */}
            <g transform={`translate(140 132) rotate(${headTilt.toFixed(2)})`}>
              {/* Studio Headset Earcups */}
              <rect x="-76" y="-12" width="16" height="44" rx="8" fill="#0E234E" stroke="#00B4FF" strokeWidth="2.2" />
              <rect x="-72" y="-2" width="6" height="24" rx="3" fill="#00B4FF" />
              <rect x="60" y="-12" width="16" height="44" rx="8" fill="#0E234E" stroke="#00B4FF" strokeWidth="2.2" />
              <rect x="66" y="-2" width="6" height="24" rx="3" fill="#00B4FF" />

              {/* Face Contour + Jaw Bounce */}
              <path
                d={`M -58 -24 C -58 -68, 58 -68, 58 -24 L 55 24 C 52 ${(62 + mouth.jawDrop).toFixed(1)}, 24 ${(78 + mouth.jawDrop).toFixed(1)}, 0 ${(80 + mouth.jawDrop).toFixed(1)} C -24 ${(78 + mouth.jawDrop).toFixed(1)}, -52 ${(62 + mouth.jawDrop).toFixed(1)}, -55 24 Z`}
                fill="url(#skinTone)"
              />

              {/* Subtle Cheek Highlights */}
              <ellipse cx="-34" cy="24" rx="12" ry="6" fill="#F43F5E" fillOpacity="0.14" />
              <ellipse cx="34" cy="24" rx="12" ry="6" fill="#F43F5E" fillOpacity="0.14" />

              {/* Chin Strap Tech Frame */}
              <path
                d={`M -56 18 C -52 50, -30 ${(68 + mouth.jawDrop).toFixed(1)}, -12 ${(74 + mouth.jawDrop).toFixed(1)} L -12 ${(82 + mouth.jawDrop).toFixed(1)} C -36 ${(75 + mouth.jawDrop).toFixed(1)}, -58 56, -61 18 Z`}
                fill="#1E293B"
                stroke="#00B4FF"
                strokeOpacity="0.55"
                strokeWidth="1.2"
              />
              <path
                d={`M 56 18 C 52 50, 30 ${(68 + mouth.jawDrop).toFixed(1)}, 12 ${(74 + mouth.jawDrop).toFixed(1)} L 12 ${(82 + mouth.jawDrop).toFixed(1)} C 36 ${(75 + mouth.jawDrop).toFixed(1)}, 58 56, 61 18 Z`}
                fill="#1E293B"
                stroke="#00B4FF"
                strokeOpacity="0.55"
                strokeWidth="1.2"
              />

              {/* Spiky Stylized Hair */}
              <path
                d="M -64 -26 C -72 -62, -52 -92, -16 -96 C -6 -108, 18 -108, 28 -94 C 56 -90, 74 -62, 64 -26 C 48 -46, 28 -54, 0 -54 C -28 -54, -48 -46, -64 -26 Z"
                fill="#111827"
              />
              <path
                d="M -36 -90 L -18 -72 L -4 -98 L 12 -74 L 34 -90 L 24 -64 L -28 -64 Z"
                fill="#1F2937"
              />

              {/* Tech Headband with Glowing Cyan Diamond */}
              <path
                d="M -61 -30 Q 0 -48 61 -30 L 58 -18 Q 0 -35 -58 -18 Z"
                fill="#CBD5E1"
                stroke="#334155"
                strokeWidth="1.5"
              />
              <polygon
                points="0,-42 13,-34 8,-22 -8,-22 -13,-34"
                fill="url(#cyanGlow)"
                stroke="#E0F2FE"
                strokeWidth="1.4"
              />

              {/* Expressive Eyebrows */}
              <path
                d={`M -40 ${(-16 + eyebrowLift).toFixed(1)} Q -24 ${(-24 + eyebrowLift).toFixed(1)} -10 ${(-16 + eyebrowLift).toFixed(1)}`}
                fill="none"
                stroke="#111827"
                strokeWidth="4.6"
                strokeLinecap="round"
              />
              <path
                d={`M 10 ${(-16 + eyebrowLift).toFixed(1)} Q 24 ${(-24 + eyebrowLift).toFixed(1)} 40 ${(-16 + eyebrowLift).toFixed(1)}`}
                fill="none"
                stroke="#111827"
                strokeWidth="4.6"
                strokeLinecap="round"
              />

              {/* Animated Eyes with Autonomous Blink */}
              {blinking ? (
                <>
                  <path d="M -36 0 Q -24 5 -12 0" fill="none" stroke="#111827" strokeWidth="3.4" strokeLinecap="round" />
                  <path d="M 12 0 Q 24 5 36 0" fill="none" stroke="#111827" strokeWidth="3.4" strokeLinecap="round" />
                </>
              ) : (
                <>
                  {/* Left Eye */}
                  <ellipse cx="-24" cy="0" rx="11.5" ry="10.5" fill="#FFFFFF" />
                  <circle cx="-23" cy="0.5" r="6.5" fill="#0284C7" />
                  <circle cx="-23" cy="0.5" r="3.4" fill="#0F172A" />
                  <circle cx="-20.5" cy="-2.2" r="2.1" fill="#FFFFFF" />
                  {/* Right Eye */}
                  <ellipse cx="24" cy="0" rx="11.5" ry="10.5" fill="#FFFFFF" />
                  <circle cx="25" cy="0.5" r="6.5" fill="#0284C7" />
                  <circle cx="25" cy="0.5" r="3.4" fill="#0F172A" />
                  <circle cx="27.5" cy="-2.2" r="2.1" fill="#FFFFFF" />
                </>
              )}

              {/* Subtle Nose */}
              <path d="M 0 6 Q 4 16 0 22 Q -4 23 -6 21" fill="none" stroke="#C58B65" strokeWidth="2.4" strokeLinecap="round" />

              {/* REAL-TIME AUDIO-DRIVEN LIP-SYNC MOUTH */}
              <g
                data-testid="lipsync-mouth"
                transform={`translate(0 ${(42 + mouth.jawDrop * 0.55).toFixed(1)})`}
              >
                {visemeSample.viseme === 'rest' || visemeSample.viseme === 'MBP' ? (
                  <path
                    d={
                      visemeSample.viseme === 'MBP'
                        ? `M ${(-mouth.rx * 0.95).toFixed(1)} 0 Q 0 1.2 ${(mouth.rx * 0.95).toFixed(1)} 0`
                        : `M -16 -1 Q 0 6.5 16 -1`
                    }
                    fill="none"
                    stroke="#8C3F37"
                    strokeWidth="3.4"
                    strokeLinecap="round"
                  />
                ) : (
                  <>
                    {/* Inner Oral Cavity */}
                    <ellipse
                      cx="0"
                      cy="0"
                      rx={mouth.rx.toFixed(1)}
                      ry={mouth.ry.toFixed(1)}
                      fill="#4A111D"
                      stroke="#9F483E"
                      strokeWidth="2.8"
                    />
                    {/* Upper Teeth */}
                    {mouth.showTeeth && (
                      <path
                        d={`M ${(-mouth.rx * 0.72).toFixed(1)} ${(-mouth.ry * 0.75).toFixed(1)} Q 0 ${(-mouth.ry * 0.95).toFixed(1)} ${(mouth.rx * 0.72).toFixed(1)} ${(-mouth.ry * 0.75).toFixed(1)} L ${(mouth.rx * 0.65).toFixed(1)} ${(-mouth.ry * 0.25).toFixed(1)} Q 0 ${(-mouth.ry * 0.12).toFixed(1)} ${(-mouth.rx * 0.65).toFixed(1)} ${(-mouth.ry * 0.25).toFixed(1)} Z`}
                        fill="#FFFFFF"
                      />
                    )}
                    {/* Tongue */}
                    {mouth.showTongue && (
                      <ellipse
                        cx="0"
                        cy={(mouth.ry * 0.58).toFixed(1)}
                        rx={(mouth.rx * 0.56).toFixed(1)}
                        ry={Math.max(2.4, mouth.ry * 0.36).toFixed(1)}
                        fill="#E06377"
                      />
                    )}
                  </>
                )}
              </g>

              {/* Boom Mic Arm with Live Audio LED */}
              <path
                d="M 65 18 C 56 46, 36 52, 22 48"
                fill="none"
                stroke="#334155"
                strokeWidth="3.2"
                strokeLinecap="round"
              />
              <circle
                cx="20"
                cy="48"
                r="4.2"
                fill={micListening ? '#F43F5E' : isPlaying ? '#00B4FF' : '#64748B'}
              />
            </g>
          </svg>
        </div>
      ) : mode === 'robot-squad' ? (
        <div
          data-testid="robot-squad-avatar"
          className="relative flex-1 min-h-0 w-full flex flex-col items-center justify-between gap-2 py-1 overflow-hidden"
        >
          {/* Audio-reactive ambient halo matched to active PrepsBot persona */}
          <div
            aria-hidden="true"
            style={{
              backgroundColor: activePersona.accent,
              transform: `scale(${(0.92 + visemeSample.energy * 0.18).toFixed(3)})`,
              opacity: isPlaying || micListening ? 0.28 + visemeSample.energy * 0.28 : 0.14,
            }}
            className="pointer-events-none absolute top-8 w-44 h-44 rounded-full blur-2xl transition-all duration-100"
          />

          <motion.div
            animate={{
              y: isPlaying ? [-2, -6 - visemeSample.openness * 5, -2] : 0,
              rotate: stepPointTiltDeg * 0.65,
            }}
            transition={{ duration: 0.45, ease: 'easeInOut' }}
            className="relative z-10 w-[210px] h-[230px] rounded-2xl overflow-hidden border border-white/15 bg-gradient-to-b from-slate-100 via-sky-50 to-indigo-50 shadow-[0_18px_36px_-12px_rgba(0,180,255,0.4)]"
          >
            <img
              src={PREPSBOT_SQUAD_IMAGE_URL}
              alt={`PrepsBot ${activePersona.label} AI Tutor`}
              draggable={false}
              style={{
                objectPosition: activePersona.pos,
              }}
              className="w-full h-full object-cover scale-[1.06] transition-all duration-300 select-none"
            />
            {/* Live Audio-Reactive Voice Equalizer Pill on Robot Stage */}
            <div className="absolute bottom-2 inset-x-2 px-2.5 py-1 rounded-xl bg-[#070B14]/85 backdrop-blur-md border border-white/15 flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono font-bold text-white truncate">
                PrepsBot · {activePersona.label}
              </span>
              <span
                style={{
                  transform: `scaleY(${(0.55 + visemeSample.openness * 1.1).toFixed(2)})`,
                  backgroundColor: activePersona.accent,
                }}
                className="w-5 h-2 rounded-full transition-transform duration-75"
              />
            </div>
          </motion.div>

          {/* 4-Robot Squad Persona Selector */}
          <div className="relative z-10 grid grid-cols-4 gap-1 w-full">
            {ROBOT_SQUAD_PERSONAS.map((bot, idx) => (
              <button
                key={bot.id}
                type="button"
                onClick={() => setSquadPersonaIdx(idx)}
                className={`py-1 px-1 rounded-lg text-[10px] font-bold border transition-all ${
                  idx === squadPersonaIdx
                    ? 'bg-[#00B4FF]/20 border-[#00B4FF] text-white shadow-xs'
                    : 'bg-[#070C18]/80 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {bot.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="relative flex-1 min-h-0 w-full flex items-end justify-center pb-1 overflow-hidden">
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute bottom-0.5 w-36 h-4 rounded-full blur-md transition-colors duration-500 ${
              pose === 'listening' ? 'bg-[#00B4FF]/45' : 'bg-black/80'
            }`}
          />
          <motion.div
            animate={{
              y: handRaised ? 0 : stepPointOffsetY,
              x: isPlaying ? 6 : 0,
              rotate: stepPointTiltDeg,
            }}
            transition={{ type: 'spring', stiffness: 130, damping: 18 }}
            className="relative z-10 h-full max-h-[345px] w-full flex items-end justify-center"
          >
            <img
              src={prepsbotTeacherImg}
              alt="PrepsBot 3D Live Teacher pointing to blackboard"
              draggable={false}
              data-pose={pose}
              className={`h-full max-h-[340px] w-auto max-w-[220px] object-contain pointer-events-none ${
                pose === 'listening'
                  ? 'teacher-pose-listening'
                  : pose === 'wave'
                    ? 'teacher-pose-wave drop-shadow-[0_18px_28px_rgba(242,123,19,0.35)]'
                    : pose === 'speaking'
                      ? 'teacher-pose-speaking drop-shadow-[0_20px_30px_rgba(0,180,255,0.34)]'
                      : 'teacher-pose-idle drop-shadow-[0_16px_26px_rgba(0,0,0,0.65)]'
              }`}
            />
          </motion.div>
        </div>
      )}

      {/* REAL-TIME AUDIO-DRIVEN VOICE SPECTRUM BAR */}
      <div
        data-testid="lipsync-waveform"
        aria-label="Live tutor voice waveform"
        className="w-full shrink-0 rounded-xl bg-[#070C18]/90 border border-white/10 px-3 py-2 space-y-1.5"
      >
        <div className="h-6 flex items-end justify-center gap-1">
          {SPECTRUM_WEIGHTS.map((weight, idx) => {
            const waveMod = Math.abs(Math.sin(pulseTick * 0.55 + idx * 0.65));
            const baseHeight = isPlaying || micListening ? 18 + visemeSample.energy * weight * (45 + waveMod * 42) : 14;
            return (
              <span
                key={idx}
                style={{ height: `${Math.min(100, Math.round(baseHeight))}%` }}
                className={`w-1.5 rounded-full transition-all duration-75 ${
                  micListening
                    ? 'bg-rose-400'
                    : isPlaying
                      ? idx % 3 === 0
                        ? 'bg-[#F27B13]'
                        : 'bg-[#00B4FF]'
                      : 'bg-slate-600/60'
                }`}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>{micListening ? 'Mic Active' : isPlaying ? 'Lip-Sync Live' : 'Standby'}</span>
          <span className="text-[#00B4FF] font-semibold">
            Viseme {visemeSample.viseme} · {Math.round(visemeSample.openness * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
