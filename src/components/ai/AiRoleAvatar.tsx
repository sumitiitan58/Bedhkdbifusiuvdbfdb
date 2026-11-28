import { motion } from 'motion/react';
import prepsbotCutoutImg from '../../assets/images/bot_prepsbot_cutout.png';
import mentorCutoutImg from '../../assets/images/bot_mentor_cutout.png';
import tutorCutoutImg from '../../assets/images/bot_tutor_cutout.png';
import analyticsCutoutImg from '../../assets/images/bot_analytics_cutout.png';

export type AiCharacterRole = 'prepsbot' | 'mentor' | 'tutor' | 'analytics';

interface AiRoleMeta {
  src: string;
  label: string;
  subtitle: string;
  ringClass: string;
  motionClass: string;
}

export const AI_ROLE_META: Record<AiCharacterRole, AiRoleMeta> = {
  prepsbot: {
    src: prepsbotCutoutImg,
    label: 'PrepsBot',
    subtitle: 'Instant AI Study Companion',
    ringClass: '',
    motionClass: 'bot-motion-prepsbot',
  },
  mentor: {
    src: mentorCutoutImg,
    label: 'PrepsAI Mentor',
    subtitle: 'Study Guidance & Strategy',
    ringClass: '',
    motionClass: 'bot-motion-mentor',
  },
  tutor: {
    src: tutorCutoutImg,
    label: 'Doubt Solver Tutor',
    subtitle: 'Step-by-Step Equation Solver',
    ringClass: '',
    motionClass: 'bot-motion-tutor',
  },
  analytics: {
    src: analyticsCutoutImg,
    label: 'AI Analytical Assistant',
    subtitle: 'Score & Accuracy Diagnostics',
    ringClass: '',
    motionClass: 'bot-motion-analytics',
  },
};

const SIZE_CLASSES = {
  xs: 'w-9 h-9',
  sm: 'w-11 h-11',
  md: 'w-14 h-14',
  lg: 'w-20 h-20',
  xl: 'w-24 h-24',
} as const;

export function AiRoleAvatar({
  role,
  size = 'md',
  animated = true,
  motionOverride,
  showShadow = false,
  className = '',
}: {
  role: AiCharacterRole;
  size?: keyof typeof SIZE_CLASSES;
  animated?: boolean;
  motionOverride?: string;
  showShadow?: boolean;
  className?: string;
}) {
  const meta = AI_ROLE_META[role];
  const activeMotionClass = motionOverride ?? (animated ? meta.motionClass : '');

  return (
    <motion.div
      data-ai-role={role}
      whileHover={{ scale: 1.1, y: -3, rotate: role === 'analytics' ? -3 : 3 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 360, damping: 20 }}
      className={`relative shrink-0 overflow-visible bg-transparent border-0 flex items-center justify-center select-none ${SIZE_CLASSES[size]} ${className}`}
    >
      <img
        src={meta.src}
        alt={meta.label}
        className={`w-full h-full object-contain select-none pointer-events-none ${activeMotionClass}`}
        draggable={false}
      />
      {showShadow && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 w-[62%] h-1.5 rounded-full bg-black/45 dark:bg-cyan-400/25 blur-[3px] prepsbot-shadow"
        />
      )}
    </motion.div>
  );
}
