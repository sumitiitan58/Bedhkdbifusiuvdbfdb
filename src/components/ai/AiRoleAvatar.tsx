import mentorAvatarImg from '../../assets/images/ai_mentor_bot_1795789002603.jpg';
import tutorAvatarImg from '../../assets/images/ai_doubt_tutor_bot_1795789002833.jpg';
import analyticsAvatarImg from '../../assets/images/ai_analytics_bot_1795789004385.jpg';

export type AiCharacterRole = 'mentor' | 'tutor' | 'analytics';

interface AiRoleMeta {
  src: string;
  label: string;
  subtitle: string;
  ringClass: string;
}

export const AI_ROLE_META: Record<AiCharacterRole, AiRoleMeta> = {
  mentor: {
    src: mentorAvatarImg,
    label: 'PrepsAI Mentor',
    subtitle: 'Study Guidance & Strategy',
    ringClass: 'ring-[#00B4FF]/50 border-[#00B4FF]/50',
  },
  tutor: {
    src: tutorAvatarImg,
    label: 'Doubt Solver Tutor',
    subtitle: 'Step-by-Step Equation Solver',
    ringClass: 'ring-indigo-400/55 border-indigo-400/50',
  },
  analytics: {
    src: analyticsAvatarImg,
    label: 'AI Analytical Assistant',
    subtitle: 'Score & Accuracy Diagnostics',
    ringClass: 'ring-amber-400/55 border-amber-400/50',
  },
};

const SIZE_CLASSES = {
  xs: 'w-7 h-7 rounded-lg',
  sm: 'w-9 h-9 rounded-xl',
  md: 'w-11 h-11 rounded-xl',
  lg: 'w-14 h-14 rounded-2xl',
} as const;

export function AiRoleAvatar({
  role,
  size = 'md',
  animated = true,
  className = '',
}: {
  role: AiCharacterRole;
  size?: keyof typeof SIZE_CLASSES;
  animated?: boolean;
  className?: string;
}) {
  const meta = AI_ROLE_META[role];
  const isTutorAnimated = role === 'tutor' && animated;

  return (
    <div
      data-ai-role={role}
      className={`relative shrink-0 overflow-hidden bg-[#0B1222] border ${meta.ringClass} ${SIZE_CLASSES[size]} ${className}`}
    >
      <img
        src={meta.src}
        alt={meta.label}
        className={`w-full h-full object-cover object-top select-none ${
          isTutorAnimated ? 'animate-tutor-write' : ''
        }`}
        draggable={false}
      />
      {isTutorAnimated && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1 right-1 w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.9)] animate-pulse"
        />
      )}
    </div>
  );
}
