import { useMemo, useRef, useState } from 'react';
import {
  ArrowUpDown,
  Award,
  CheckCircle2,
  Flame,
  Hash,
  ImagePlus,
  MessageSquare,
  Send,
  Sparkles,
  ThumbsUp,
  Timer,
  University,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { PageLayout } from '../layouts/PageLayout';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { SeoHead } from '../components/SeoHead';
import { RichMathText } from '../components/math/KatexFormula';
import {
  COMMUNITY_ROOMS,
  COUNSELLING_CUTOFFS,
  FOCUS_LEADERBOARD_TOP5,
  INITIAL_COMMUNITY_POSTS,
  STUDY_PEERS_DIRECTORY,
  type CommunityPost,
  type CounsellingCategory,
} from '../data/prepskm2UpgradeData';
import { useAuth } from '../context/AuthContext';
import { useExam } from '../context/ExamContext';
import { useLanguage } from '../context/LanguageContext';
import { usePrepskm2 } from '../context/Prepskm2Context';
import { playClick, playSuccess } from '../utils/soundEffects';

type CommunityHubTab = 'chat' | 'peers' | 'counselling';

const POSTS_STORAGE_KEY = 'prepskm_community_posts_v1';
const CONNECTED_PEERS_KEY = 'prepskm_connected_peers_v1';

export default function Community() {
  const { profile, firebaseUser } = useAuth();
  const { trackConfig } = useExam();
  const { t } = useLanguage();
  const { setZenMode } = usePrepskm2();

  const [activeHub, setActiveHub] = useState<CommunityHubTab>('chat');
  const [activeRoomId, setActiveRoomId] = useState<string>('all');

  // Doubt feed & composer state
  const [posts, setPosts] = useState<CommunityPost[]>(() => {
    try {
      const raw = window.localStorage.getItem(POSTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CommunityPost[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_COMMUNITY_POSTS;
  });
  const [upvotedIds, setUpvotedIds] = useState<Record<string, boolean>>({});
  const [draftText, setDraftText] = useState('');
  const [draftRoom, setDraftRoom] = useState('physics-doubts');
  const [draftImage, setDraftImage] = useState<string | null>(null);
  const [modalImage, setModalImage] = useState<{ src: string; caption: string } | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // Study Peers state
  const [peerExamFilter, setPeerExamFilter] = useState<'All' | 'JEE Main/Adv' | 'NEET UG'>('All');
  const [peerGoalFilter, setPeerGoalFilter] = useState<'All' | 6 | 8 | 10>('All');
  const [peerStageFilter, setPeerStageFilter] = useState<'All' | 'Class 11' | 'Class 12' | 'Dropper'>('All');
  const [connectedPeers, setConnectedPeers] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem(CONNECTED_PEERS_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  // JoSAA & MCC Counselling state
  const [authority, setAuthority] = useState<'JoSAA' | 'MCC'>(() => trackConfig.counsellingAuthority);
  const [targetAir, setTargetAir] = useState<number>(authority === 'MCC' ? 4500 : 8500);
  const [category, setCategory] = useState<CounsellingCategory>('General');
  const [stateFilter, setStateFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'rank-asc' | 'rank-desc' | 'institute'>('rank-asc');

  const displayName = profile?.displayName || firebaseUser?.displayName || 'Guest Aspirant';
  const initials = displayName
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const visiblePosts = useMemo(() => {
    if (activeRoomId === 'all') return posts;
    return posts.filter((p) => p.roomId === activeRoomId);
  }, [posts, activeRoomId]);

  const handleAttachImage = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setDraftImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreatePost = () => {
    const body = draftText.trim();
    if (!body) return;
    playSuccess();
    const nextPost: CommunityPost = {
      id: `cp-${Date.now()}`,
      roomId: activeRoomId === 'all' ? draftRoom : activeRoomId,
      authorName: displayName,
      authorInitials: initials || 'GA',
      examTag: trackConfig.id === 'neet' ? 'NEET 27' : 'JEE 27',
      timestamp: 'Just now',
      content: body,
      attachmentCaption: draftImage ?? undefined,
      upvotes: 1,
      repliesCount: 0,
    };
    const next = [nextPost, ...posts].slice(0, 40);
    setPosts(next);
    try {
      window.localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore quota
    }
    setDraftText('');
    setDraftImage(null);
  };

  const toggleUpvote = (postId: string) => {
    playClick();
    const already = !!upvotedIds[postId];
    setUpvotedIds((prev) => ({ ...prev, [postId]: !already }));
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, upvotes: Math.max(0, p.upvotes + (already ? -1 : 1)) } : p
      )
    );
  };

  const togglePeerConnect = (peerId: string) => {
    playSuccess();
    setConnectedPeers((prev) => {
      const next = prev.includes(peerId) ? prev.filter((id) => id !== peerId) : [...prev, peerId];
      try {
        window.localStorage.setItem(CONNECTED_PEERS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const filteredPeers = useMemo(() => {
    return STUDY_PEERS_DIRECTORY.filter((p) => {
      if (peerExamFilter !== 'All' && p.exam !== peerExamFilter) return false;
      if (peerGoalFilter !== 'All' && p.dailyFocusGoalHours !== peerGoalFilter) return false;
      if (peerStageFilter !== 'All' && p.stage !== peerStageFilter) return false;
      return true;
    });
  }, [peerExamFilter, peerGoalFilter, peerStageFilter]);

  const availableStates = useMemo(() => {
    const states = new Set<string>();
    COUNSELLING_CUTOFFS.filter((c) => c.authority === authority).forEach((c) => states.add(c.state));
    return ['All', ...Array.from(states).sort()];
  }, [authority]);

  const counsellingRows = useMemo(() => {
    const rows = COUNSELLING_CUTOFFS.filter((entry) => {
      if (entry.authority !== authority) return false;
      if (stateFilter !== 'All' && entry.state !== stateFilter) return false;
      return true;
    }).map((entry) => {
      const closingRank = entry.closingRanks[category];
      const chance: 'Safe' | 'Target' | 'Ambitious' =
        targetAir <= closingRank * 0.85
          ? 'Safe'
          : targetAir <= closingRank * 1.15
          ? 'Target'
          : 'Ambitious';
      return { ...entry, closingRank, chance };
    });

    return rows.sort((a, b) => {
      if (sortBy === 'rank-asc') return a.closingRank - b.closingRank;
      if (sortBy === 'rank-desc') return b.closingRank - a.closingRank;
      return a.institute.localeCompare(b.institute);
    });
  }, [authority, category, stateFilter, targetAir, sortBy]);

  return (
    <PageLayout>
      <SeoHead
        title="Live Peer Community, Doubt Rooms & JoSAA/MCC Counselling | Prepskm 2.0"
        description="Ask KaTeX doubts verified by IIT/AIIMS mentors, find serious JEE & NEET study partners, and explore JoSAA & MCC college cut-offs."
        canonicalPath="/community"
      />

      <ResponsiveContainer className="py-6 sm:py-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#0284C7] dark:text-[#06B6D4]">
              PREPSKM 2.0 · PEER COMMUNITY
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1F3A] dark:text-[#F8FAFC] mt-0.5">
              {t('community.title')}
            </h1>
          </div>
          <span className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-[#15803D] dark:text-[#22C55E]">
            <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
            855 Aspirants Online Now
          </span>
        </div>

        {/* 3-Column Community Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_280px] gap-5 items-start">
          {/* LEFT COLUMN (220px): Hub Switcher + Exam Rooms */}
          <aside className="space-y-4 lg:sticky lg:top-20">
            {/* Hub Switcher */}
            <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08] p-2.5 space-y-1">
              <p className="px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
                Community Spaces
              </p>
              {(
                [
                  { id: 'chat', label: t('community.tabChat'), icon: MessageSquare },
                  { id: 'peers', label: t('community.tabPeers'), icon: Users },
                  { id: 'counselling', label: t('community.tabCounselling'), icon: University },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const active = activeHub === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      playClick();
                      setActiveHub(tab.id);
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
                      active
                        ? 'bg-[#0284C7] dark:bg-[#06B6D4] text-white dark:text-[#070B14]'
                        : 'text-[#475569] dark:text-[#94A3B8] hover:bg-[#F4F8FF] dark:hover:bg-[#162033] hover:text-[#0B1F3A] dark:hover:text-[#F8FAFC]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* 6 Exam Rooms List */}
            <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08] p-2.5 space-y-1">
              <p className="px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
                Exam Rooms
              </p>
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setActiveHub('chat');
                  setActiveRoomId('all');
                }}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                  activeHub === 'chat' && activeRoomId === 'all'
                    ? 'bg-[#EEF4FF] dark:bg-[#162033] text-[#0284C7] dark:text-[#22D3EE]'
                    : 'text-[#475569] dark:text-[#94A3B8] hover:bg-[#F4F8FF] dark:hover:bg-[#162033]'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" />
                  all-rooms
                </span>
                <span className="font-mono text-[10px] tabular-nums">{posts.length}</span>
              </button>

              {COMMUNITY_ROOMS.map((room) => {
                const active = activeHub === 'chat' && activeRoomId === room.id;
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => {
                      playClick();
                      setActiveHub('chat');
                      setActiveRoomId(room.id);
                      setDraftRoom(room.id);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 transition-colors ${
                      active
                        ? 'bg-[#EEF4FF] dark:bg-[#162033] text-[#0284C7] dark:text-[#22D3EE]'
                        : 'text-[#475569] dark:text-[#94A3B8] hover:bg-[#F4F8FF] dark:hover:bg-[#162033]'
                    }`}
                  >
                    <span className="truncate">{room.slug}</span>
                    <span className="font-mono text-[10px] text-[#15803D] dark:text-[#22C55E] tabular-nums shrink-0">
                      {room.activeOnline}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* CENTER COLUMN: Dynamic Active Hub */}
          <div className="space-y-4 min-w-0">
            {/* HUB 1: LIVE CHAT & DOUBTS */}
            {activeHub === 'chat' && (
              <>
                {/* Doubt Post Composer with KaTeX & Image Preview */}
                <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-[#0B1F3A] dark:text-[#F8FAFC]">
                      Post a Doubt or Study Update (KaTeX supported: e.g. <span className="font-mono text-[#0284C7] dark:text-[#22D3EE]">$E = kQ/r^2$</span>)
                    </p>
                    {activeRoomId === 'all' && (
                      <select
                        aria-label="Room for post"
                        value={draftRoom}
                        onChange={(e) => setDraftRoom(e.target.value)}
                        className="px-2.5 py-1 rounded-lg text-xs font-mono bg-[#F4F8FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08] text-[#0B1F3A] dark:text-[#F8FAFC]"
                      >
                        {COMMUNITY_ROOMS.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.slug}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <textarea
                    rows={3}
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    placeholder="Ask a Physics/Chemistry/Maths/Bio doubt with $LaTeX$ formulas or share your daily study streak..."
                    className="w-full rounded-xl bg-[#F4F8FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08] px-3.5 py-2.5 text-sm text-[#0B1F3A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0284C7] dark:focus:border-[#06B6D4]"
                  />

                  {draftText.includes('$') && (
                    <div className="rounded-xl bg-[#EEF4FF] dark:bg-[#162033]/70 border border-[#E2E8F0] dark:border-white/[0.08] px-3 py-2 text-xs text-[#0B1F3A] dark:text-[#F8FAFC]">
                      <span className="font-mono text-[10px] font-bold uppercase text-[#0284C7] dark:text-[#06B6D4] block mb-0.5">
                        Live KaTeX Preview
                      </span>
                      <RichMathText text={draftText} />
                    </div>
                  )}

                  {draftImage && (
                    <div className="relative inline-block">
                      <img
                        src={draftImage}
                        alt="Attached question diagram"
                        className="h-24 rounded-xl border border-[#E2E8F0] dark:border-white/10 object-cover"
                      />
                      <button
                        type="button"
                        aria-label="Remove attached image"
                        onClick={() => setDraftImage(null)}
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[#0B1F3A] text-white flex items-center justify-center"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleAttachImage(e.target.files?.[0])}
                      />
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F4F8FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08] text-[#475569] dark:text-[#94A3B8] hover:text-[#0B1F3A] dark:hover:text-[#F8FAFC]"
                      >
                        <ImagePlus className="w-3.5 h-3.5 text-[#0284C7] dark:text-[#06B6D4]" />
                        Attach Question Image
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={!draftText.trim()}
                      onClick={handleCreatePost}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#0284C7] dark:bg-[#06B6D4] hover:opacity-95 text-white dark:text-[#070B14] disabled:opacity-40"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Post to Room
                    </button>
                  </div>
                </div>

                {/* Posts Feed */}
                <div className="space-y-3.5">
                  {visiblePosts.map((post) => {
                    const isUpvoted = !!upvotedIds[post.id];
                    const roomSlug =
                      COMMUNITY_ROOMS.find((r) => r.id === post.roomId)?.slug ?? `#${post.roomId}`;
                    return (
                      <article
                        key={post.id}
                        className="rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08] p-5 space-y-3.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="h-8 w-8 rounded-full bg-[#0284C7]/15 dark:bg-[#06B6D4]/20 text-[#0284C7] dark:text-[#22D3EE] font-mono text-xs font-bold flex items-center justify-center shrink-0">
                              {post.authorInitials}
                            </span>
                            <div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-sm font-bold text-[#0B1F3A] dark:text-[#F8FAFC]">
                                  {post.authorName}
                                </span>
                                <span className="text-[11px] font-mono font-semibold text-[#0284C7] dark:text-[#06B6D4]">
                                  {post.examTag}
                                </span>
                                <span className="text-[#94A3B8]">·</span>
                                <span className="text-xs text-[#475569] dark:text-[#94A3B8]">
                                  {post.timestamp}
                                </span>
                              </div>
                              <p className="font-mono text-[11px] text-[#475569] dark:text-[#94A3B8]">
                                {roomSlug}
                              </p>
                            </div>
                          </div>

                          {post.solvedByMentor && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/35 text-[#15803D] dark:text-[#22C55E] text-[11px] font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Solved by Mentor
                            </span>
                          )}
                        </div>

                        <div className="text-sm leading-relaxed text-[#0B1F3A] dark:text-[#F8FAFC]">
                          <RichMathText text={post.content} />
                        </div>

                        {post.attachmentCaption && (
                          <button
                            type="button"
                            onClick={() =>
                              setModalImage({
                                src: post.attachmentCaption!,
                                caption: `${post.authorName} · ${roomSlug}`,
                              })
                            }
                            className="block rounded-xl overflow-hidden border border-[#E2E8F0] dark:border-white/10 hover:opacity-90 transition-opacity"
                          >
                            <img
                              src={post.attachmentCaption}
                              alt="Question attachment"
                              className="max-h-56 object-contain bg-[#F4F8FF] dark:bg-[#162033]"
                            />
                          </button>
                        )}

                        {post.solvedByMentor && (
                          <div className="rounded-xl bg-[#22C55E]/[0.08] border border-[#22C55E]/25 p-3.5 space-y-1.5">
                            <p className="text-xs font-bold text-[#15803D] dark:text-[#22C55E] flex items-center gap-1.5">
                              <Award className="w-3.5 h-3.5" />
                              {post.solvedByMentor.mentorName} ({post.solvedByMentor.college})
                            </p>
                            <div className="text-xs sm:text-sm text-[#0B1F3A] dark:text-[#F8FAFC] leading-relaxed">
                              <RichMathText text={post.solvedByMentor.solutionSnippet} />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-4 pt-1 text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                          <button
                            type="button"
                            onClick={() => toggleUpvote(post.id)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors font-mono tabular-nums ${
                              isUpvoted
                                ? 'bg-[#0284C7]/12 dark:bg-[#06B6D4]/15 border-[#0284C7]/40 dark:border-[#06B6D4]/40 text-[#0284C7] dark:text-[#22D3EE]'
                                : 'bg-[#F4F8FF] dark:bg-[#162033] border-[#E2E8F0] dark:border-white/[0.08] hover:border-[#0284C7]'
                            }`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            {post.upvotes}
                          </button>
                          <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                            <MessageSquare className="w-3.5 h-3.5" />
                            {post.repliesCount} replies
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}

            {/* HUB 2: FIND STUDY PEERS */}
            {activeHub === 'peers' && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08] p-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <select
                    aria-label="Filter peers by exam"
                    value={peerExamFilter}
                    onChange={(e) => setPeerExamFilter(e.target.value as 'All' | 'JEE Main/Adv' | 'NEET UG')}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#F4F8FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08] text-[#0B1F3A] dark:text-[#F8FAFC]"
                  >
                    <option value="All">All Exams</option>
                    <option value="JEE Main/Adv">JEE Main/Adv</option>
                    <option value="NEET UG">NEET UG</option>
                  </select>

                  <select
                    aria-label="Filter peers by focus goal"
                    value={String(peerGoalFilter)}
                    onChange={(e) =>
                      setPeerGoalFilter(e.target.value === 'All' ? 'All' : (Number(e.target.value) as 6 | 8 | 10))
                    }
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#F4F8FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08] text-[#0B1F3A] dark:text-[#F8FAFC]"
                  >
                    <option value="All">Daily Focus Goal: Any</option>
                    <option value="6">6 hrs / day</option>
                    <option value="8">8 hrs / day</option>
                    <option value="10">10 hrs / day</option>
                  </select>

                  <select
                    aria-label="Filter peers by stage"
                    value={peerStageFilter}
                    onChange={(e) =>
                      setPeerStageFilter(e.target.value as 'All' | 'Class 11' | 'Class 12' | 'Dropper')
                    }
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#F4F8FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08] text-[#0B1F3A] dark:text-[#F8FAFC]"
                  >
                    <option value="All">All Batches</option>
                    <option value="Class 11">Class 11</option>
                    <option value="Class 12">Class 12</option>
                    <option value="Dropper">Dropper</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPeers.map((peer) => {
                    const connected = connectedPeers.includes(peer.id);
                    return (
                      <div
                        key={peer.id}
                        className="rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08] p-5 flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <span className="h-10 w-10 rounded-full bg-[#0284C7]/15 dark:bg-[#06B6D4]/20 text-[#0284C7] dark:text-[#22D3EE] font-mono text-sm font-bold flex items-center justify-center shrink-0">
                                {peer.initials}
                              </span>
                              <div>
                                <h3 className="font-display text-sm font-bold text-[#0B1F3A] dark:text-[#F8FAFC]">
                                  {peer.name}
                                </h3>
                                <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
                                  {peer.stateCity} · {peer.stage}
                                </p>
                              </div>
                            </div>
                            <span className="font-mono text-xs font-bold text-[#EA580C] dark:text-[#F97316] inline-flex items-center gap-1 tabular-nums">
                              <Flame className="w-3.5 h-3.5 fill-current" />
                              {peer.streakDays}d
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono font-semibold">
                            <span className="px-2 py-0.5 rounded-lg bg-[#EEF4FF] dark:bg-[#162033] text-[#0284C7] dark:text-[#22D3EE]">
                              {peer.exam}
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-[#EEF4FF] dark:bg-[#162033] text-[#15803D] dark:text-[#22C55E]">
                              {peer.dailyFocusGoalHours}h/day goal
                            </span>
                          </div>

                          <p className="text-xs text-[#475569] dark:text-[#94A3B8] leading-relaxed">
                            <strong className="text-[#0B1F3A] dark:text-[#F8FAFC]">Studying: </strong>
                            {peer.currentChapter}
                          </p>
                          <p className="text-xs text-[#475569] dark:text-[#94A3B8] italic">
                            “{peer.statusNote}”
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => togglePeerConnect(peer.id)}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors ${
                            connected
                              ? 'bg-[#22C55E]/15 border border-[#22C55E]/40 text-[#15803D] dark:text-[#22C55E]'
                              : 'bg-[#0284C7] dark:bg-[#06B6D4] text-white dark:text-[#070B14] hover:opacity-95'
                          }`}
                        >
                          {connected ? (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              Study Partner Connected
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-3.5 h-3.5" />
                              Connect for Accountability
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* HUB 3: JoSAA & MCC COUNSELLING EXPLORER */}
            {activeHub === 'counselling' && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08] p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-display text-lg font-bold text-[#0B1F3A] dark:text-[#F8FAFC]">
                        Rank-to-College Cut-off Explorer
                      </h2>
                      <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
                        Compare closing AIRs across premier IITs, NITs, IIITs (JoSAA) and AIIMS / Govt MBBS (MCC).
                      </p>
                    </div>

                    <div className="inline-flex p-1 rounded-xl bg-[#EEF4FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08]">
                      {(['JoSAA', 'MCC'] as const).map((auth) => (
                        <button
                          key={auth}
                          type="button"
                          onClick={() => {
                            playClick();
                            setAuthority(auth);
                            setStateFilter('All');
                            setTargetAir(auth === 'MCC' ? 4500 : 8500);
                          }}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            authority === auth
                              ? 'bg-[#0284C7] dark:bg-[#06B6D4] text-white dark:text-[#070B14]'
                              : 'text-[#475569] dark:text-[#94A3B8]'
                          }`}
                        >
                          {auth === 'JoSAA' ? 'JoSAA (JEE)' : 'MCC (NEET)'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="space-y-1 text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                      <span>Your Target / Mock AIR</span>
                      <input
                        type="number"
                        min={1}
                        max={200000}
                        value={targetAir}
                        onChange={(e) => setTargetAir(Math.max(1, Number(e.target.value) || 1))}
                        className="w-full px-3 py-2 rounded-xl font-mono text-sm font-bold bg-[#F4F8FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08] text-[#0B1F3A] dark:text-[#F8FAFC]"
                      />
                    </label>

                    <label className="space-y-1 text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                      <span>Category</span>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as CounsellingCategory)}
                        className="w-full px-3 py-2 rounded-xl text-sm font-semibold bg-[#F4F8FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08] text-[#0B1F3A] dark:text-[#F8FAFC]"
                      >
                        {(['General', 'OBC-NCL', 'EWS', 'SC', 'ST'] as const).map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1 text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                      <span>Home State / Region</span>
                      <select
                        value={stateFilter}
                        onChange={(e) => setStateFilter(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-sm font-semibold bg-[#F4F8FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08] text-[#0B1F3A] dark:text-[#F8FAFC]"
                      >
                        {availableStates.map((st) => (
                          <option key={st} value={st}>
                            {st === 'All' ? 'All States (AIQ + HS)' : st}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                {/* Sortable Table */}
                <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-[#F4F8FF] dark:bg-[#162033] border-b border-[#E2E8F0] dark:border-white/[0.08] text-[#475569] dark:text-[#94A3B8] text-xs">
                          <th className="py-3 px-4 font-bold">
                            <button
                              type="button"
                              onClick={() => setSortBy('institute')}
                              className="inline-flex items-center gap-1 hover:text-[#0B1F3A] dark:hover:text-[#F8FAFC]"
                            >
                              Institute &amp; Program
                              <ArrowUpDown className="w-3.5 h-3.5" />
                            </button>
                          </th>
                          <th className="py-3 px-3 font-bold">Quota / State</th>
                          <th className="py-3 px-3 font-bold text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setSortBy((prev) => (prev === 'rank-asc' ? 'rank-desc' : 'rank-asc'))
                              }
                              className="inline-flex items-center gap-1 hover:text-[#0B1F3A] dark:hover:text-[#F8FAFC]"
                            >
                              {category} Closing AIR
                              <ArrowUpDown className="w-3.5 h-3.5" />
                            </button>
                          </th>
                          <th className="py-3 px-4 font-bold text-right">Outlook</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] dark:divide-white/[0.08]">
                        {counsellingRows.map((row) => (
                          <tr
                            key={row.id}
                            className="hover:bg-[#F4F8FF]/70 dark:hover:bg-[#162033]/50 transition-colors"
                          >
                            <td className="py-3.5 px-4">
                              <p className="font-bold text-[#0B1F3A] dark:text-[#F8FAFC]">
                                {row.institute}
                              </p>
                              <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
                                {row.program} · {row.avgPackageOrSeats}
                              </p>
                            </td>
                            <td className="py-3.5 px-3 text-xs text-[#475569] dark:text-[#94A3B8]">
                              <p className="font-semibold text-[#0B1F3A] dark:text-[#F8FAFC]">
                                {row.quota}
                              </p>
                              <p>{row.state}</p>
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono font-bold tabular-nums text-[#0B1F3A] dark:text-[#F8FAFC]">
                              AIR {row.closingRank.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <span
                                className={`inline-block px-2.5 py-1 rounded-full font-mono text-[11px] font-bold ${
                                  row.chance === 'Safe'
                                    ? 'bg-[#22C55E]/15 text-[#15803D] dark:text-[#22C55E]'
                                    : row.chance === 'Target'
                                    ? 'bg-[#06B6D4]/15 text-[#0284C7] dark:text-[#22D3EE]'
                                    : 'bg-[#F97316]/15 text-[#EA580C] dark:text-[#F97316]'
                                }`}
                              >
                                {row.chance}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN (280px): Live Focus-Hour Leaderboard Top 5 + CTA */}
          <aside className="space-y-4 lg:sticky lg:top-20">
            <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08] p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-sm font-bold text-[#0B1F3A] dark:text-[#F8FAFC] flex items-center gap-1.5">
                  <Timer className="w-4 h-4 text-[#0284C7] dark:text-[#06B6D4]" />
                  Live Focus-Hour Top 5
                </h2>
                <span className="font-mono text-[10px] font-bold text-[#15803D] dark:text-[#22C55E]">
                  TODAY
                </span>
              </div>

              <div className="divide-y divide-[#E2E8F0] dark:divide-white/[0.08]">
                {FOCUS_LEADERBOARD_TOP5.map((entry) => (
                  <div
                    key={entry.rank}
                    className="py-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`font-mono font-bold w-5 tabular-nums ${
                          entry.rank === 1
                            ? 'text-[#EA580C] dark:text-[#F97316]'
                            : 'text-[#475569] dark:text-[#94A3B8]'
                        }`}
                      >
                        #{entry.rank}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#0B1F3A] dark:text-[#F8FAFC] truncate">
                          {entry.name}
                        </p>
                        <p className="text-[11px] text-[#475569] dark:text-[#94A3B8]">
                          {entry.exam}
                        </p>
                      </div>
                    </div>

                    <div className="text-right font-mono tabular-nums shrink-0">
                      <p className="font-bold text-[#0284C7] dark:text-[#22D3EE]">
                        {entry.hoursToday}h
                      </p>
                      <p className="text-[10px] text-[#15803D] dark:text-[#22C55E]">
                        {entry.delta === '0' ? '—' : `${entry.delta} ▲`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  playClick();
                  setZenMode(true);
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#F97316] hover:bg-[#FB923C] text-white inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Start Focus Mode to Rank
              </button>
            </div>
          </aside>
        </div>
      </ResponsiveContainer>

      {/* Image Preview Modal */}
      {modalImage && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setModalImage(null)}
        >
          <div
            className="max-w-2xl w-full rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/10 p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-mono font-bold text-[#0B1F3A] dark:text-[#F8FAFC]">
                {modalImage.caption}
              </p>
              <button
                type="button"
                aria-label="Close image preview"
                onClick={() => setModalImage(null)}
                className="p-1.5 rounded-lg text-[#475569] dark:text-[#94A3B8] hover:bg-[#EEF4FF] dark:hover:bg-[#162033]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={modalImage.src}
              alt={modalImage.caption}
              className="w-full max-h-[70vh] object-contain rounded-xl bg-[#F4F8FF] dark:bg-[#070B14]"
            />
          </div>
        </div>
      )}
    </PageLayout>
  );
}
