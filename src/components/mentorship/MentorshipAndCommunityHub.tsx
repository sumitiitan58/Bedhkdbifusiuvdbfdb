import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowBigUp,
  CheckCircle2,
  ImagePlus,
  MessageSquare,
  Mic,
  MicOff,
  PhoneOff,
  Send,
  ShieldCheck,
  Star,
  Ticket,
  Users,
  Video,
  VideoOff,
} from 'lucide-react';
import {
  INITIAL_BATCH_MESSAGES,
  INITIAL_FORUM_POSTS,
  PEER_ASPIRANTS,
  VERIFIED_MENTORS,
  type BatchChatMessage,
  type ForumPost,
  type MentorProfile,
} from '../../data/prepskm2Data';
import { usePrepskm2, type MentorshipPassRecord } from '../../context/Prepskm2Context';
import { useAuth } from '../../context/AuthContext';
import { generateMentorshipPassToken } from '../../utils/arenaProgression';
import { playClick, playSuccess } from '../../utils/soundEffects';

export function MentorshipAndCommunityHub() {
  const { mentorshipPasses, addMentorshipPass } = usePrepskm2();
  const { profile, firebaseUser } = useAuth();
  const currentUserName = profile?.displayName || firebaseUser?.displayName || 'Aspirant';

  const [section, setSection] = useState<'mentors' | 'forum' | 'stream'>('mentors');

  // 1:1 Mentorship state
  const [examFilter, setExamFilter] = useState<'All' | 'JEE' | 'NEET' | 'Foundation'>('All');
  const [bookingMentor, setBookingMentor] = useState<MentorProfile | null>(null);
  const [durationMins, setDurationMins] = useState<number>(30);
  const [upiId, setUpiId] = useState('student@okaxis');
  const [activePass, setActivePass] = useState<MentorshipPassRecord | null>(null);

  // Live WebRTC Call + Direct Mentor Chat state
  const [callActive, setCallActive] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [callSeconds, setCallSeconds] = useState(0);
  const [mediaNotice, setMediaNotice] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mentorChat, setMentorChat] = useState<Array<{ id: string; sender: 'you' | 'mentor'; text: string; image?: string }>>([
    {
      id: 'mc-1',
      sender: 'mentor',
      text: 'Welcome to your 1:1 consultation room! Drop your mock scorecard or doubt photo here while we connect.',
    },
  ]);
  const [mentorChatInput, setMentorChatInput] = useState('');

  // Forum state
  const [forumPosts, setForumPosts] = useState<ForumPost[]>(INITIAL_FORUM_POSTS);
  const [forumCategory, setForumCategory] = useState<string>('All');
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostBody, setNewPostBody] = useState('');
  const [newPostCategory, setNewPostCategory] = useState<ForumPost['category']>('Physics');
  const [newPostImage, setNewPostImage] = useState<string>('');
  const [upvotedIds, setUpvotedIds] = useState<Record<string, boolean>>({});

  // Batch Stream & Peer Finder state
  const [activeRoom, setActiveRoom] = useState<'JEE 2027' | 'NEET 2027' | 'Dropper Batch'>('JEE 2027');
  const [batchMessages, setBatchMessages] = useState<BatchChatMessage[]>(INITIAL_BATCH_MESSAGES);
  const [batchInput, setBatchInput] = useState('');
  const [peerExamFilter, setPeerExamFilter] = useState<string>('All');
  const [peerMinHours, setPeerMinHours] = useState<number>(6);
  const [peerCityQuery, setPeerCityQuery] = useState<string>('');
  const [connectedPeers, setConnectedPeers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!callActive) return;
    const id = window.setInterval(() => setCallSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [callActive]);

  const stopMedia = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => stopMedia, []);

  const startWebRtcCall = async (pass: MentorshipPassRecord) => {
    playSuccess();
    setActivePass(pass);
    setCallActive(true);
    setCallSeconds(0);
    setMediaNotice('');
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } else {
        setMediaNotice('Audio/Video signaling ready (camera preview unavailable in headless mode).');
      }
    } catch {
      setMediaNotice('Connected in Audio-Ready Consultation mode (grant browser camera/mic permission to stream video).');
    }
  };

  const endWebRtcCall = () => {
    stopMedia();
    setCallActive(false);
    playClick();
  };

  const filteredMentors = useMemo(
    () =>
      VERIFIED_MENTORS.filter((m) => (examFilter === 'All' ? true : m.examFocus === examFilter)),
    [examFilter]
  );

  const filteredPosts = useMemo(
    () =>
      forumPosts.filter((p) => (forumCategory === 'All' ? true : p.category === forumCategory)),
    [forumPosts, forumCategory]
  );

  const filteredPeers = useMemo(() => {
    const cityQ = peerCityQuery.trim().toLowerCase();
    return PEER_ASPIRANTS.filter((p) => {
      if (peerExamFilter !== 'All' && p.targetExam !== peerExamFilter) return false;
      if (p.dailyHoursGoal < peerMinHours) return false;
      if (cityQ && !`${p.city} ${p.state}`.toLowerCase().includes(cityQ)) return false;
      return true;
    });
  }, [peerExamFilter, peerMinHours, peerCityQuery]);

  const handleConfirmUpiPass = () => {
    if (!bookingMentor) return;
    const prefix =
      bookingMentor.examFocus === 'NEET'
        ? 'NEET'
        : bookingMentor.examFocus === 'Foundation'
          ? 'FND'
          : 'JEE';
    const token = generateMentorshipPassToken(prefix);
    const amountInr = Math.round((durationMins / 15) * bookingMentor.pricePer15MinInr);
    const pass: MentorshipPassRecord = {
      token,
      mentorId: bookingMentor.id,
      mentorName: bookingMentor.name,
      mentorCollege: bookingMentor.collegeBadge,
      durationMinutes: durationMins,
      amountInr,
      upiRef: `UPI${Date.now().toString().slice(-8)}`,
      issuedAtIso: new Date().toISOString(),
      status: 'Active',
    };
    addMentorshipPass(pass);
    setActivePass(pass);
    setBookingMentor(null);
    playSuccess();
  };

  return (
    <div className="space-y-6">
      {/* Primary Section Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            Mentorship &amp; Aspirant Community
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5">
            1:1 IIT/AIIMS Mentors, Doubt Forum &amp; Peer Finder
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08]">
          {[
            { id: 'mentors', label: '1:1 Mentorship Passes' },
            { id: 'forum', label: 'Doubt Forum' },
            { id: 'stream', label: 'Batch Stream & Peers' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                playClick();
                setSection(tab.id as typeof section);
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                section === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1: 1:1 MENTORSHIP DIRECTORY + UPI PASSES + LIVE WEBRTC ROOM */}
      {section === 'mentors' && (
        <div className="space-y-6">
          {/* Active Digital Passes Strip */}
          {mentorshipPasses.length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-[#111114] border border-emerald-500/30 p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-emerald-500" />
                  Your Cryptographic Digital Mentorship Passes ({mentorshipPasses.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {mentorshipPasses.slice(0, 4).map((pass) => (
                  <div
                    key={pass.token}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {pass.token}
                      </p>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        {pass.mentorName} · {pass.durationMinutes} min pass (₹{pass.amountInr})
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void startWebRtcCall(pass)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                    >
                      <Video className="w-3.5 h-3.5" />
                      Join Live Room
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live WebRTC Consultation Room + Direct Mentor Chat */}
          {callActive && activePass && (
            <div className="rounded-2xl bg-[#111114] text-zinc-100 border border-indigo-500/40 p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-emerald-400 font-semibold">
                    LIVE 1:1 ROOM · {activePass.token} · {activePass.mentorName}
                  </span>
                  <span>
                    {String(Math.floor(callSeconds / 60)).padStart(2, '0')}:
                    {String(callSeconds % 60).padStart(2, '0')} / {activePass.durationMinutes}:00
                  </span>
                </div>

                <div className="relative aspect-video rounded-xl bg-[#09090B] border border-white/[0.08] overflow-hidden flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`w-full h-full object-cover ${camOn ? 'opacity-100' : 'opacity-0'}`}
                  />
                  {!camOn && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 text-xs">
                      <VideoOff className="w-8 h-8 mb-2" />
                      Camera paused · Audio consultation active
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-black/70 text-[11px] font-mono text-zinc-200">
                    {currentUserName} (WebRTC P2P)
                  </div>
                </div>

                {mediaNotice && <p className="text-[11px] text-amber-300">{mediaNotice}</p>}

                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMicOn((m) => !m)}
                    className={`p-3 rounded-xl border ${
                      micOn ? 'bg-white/[0.06] border-white/[0.12]' : 'bg-rose-600 border-rose-500'
                    }`}
                    aria-label="Toggle microphone"
                  >
                    {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCamOn((c) => !c)}
                    className={`p-3 rounded-xl border ${
                      camOn ? 'bg-white/[0.06] border-white/[0.12]' : 'bg-rose-600 border-rose-500'
                    }`}
                    aria-label="Toggle camera"
                  >
                    {camOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={endWebRtcCall}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                  >
                    <PhoneOff className="w-4 h-4" />
                    End Session
                  </button>
                </div>
              </div>

              {/* Direct Mentor Chat with Image Sharing */}
              <div className="lg:col-span-5 flex flex-col rounded-xl bg-[#09090B] border border-white/[0.08] overflow-hidden min-h-[300px]">
                <div className="px-4 py-3 border-b border-white/[0.08] text-xs font-bold">
                  Direct Mentor Chat · Image Sharing Enabled
                </div>
                <div className="flex-1 p-3 space-y-2.5 overflow-y-auto max-h-60 text-xs">
                  {mentorChat.map((m) => (
                    <div
                      key={m.id}
                      className={`p-2.5 rounded-xl ${
                        m.sender === 'you'
                          ? 'bg-indigo-600 text-white ml-8'
                          : 'bg-[#18181D] text-zinc-200 mr-8'
                      }`}
                    >
                      {m.image && (
                        <img
                          src={m.image}
                          alt="Shared doubt"
                          referrerPolicy="no-referrer"
                          className="mb-1.5 max-h-28 rounded-md"
                        />
                      )}
                      {m.text}
                    </div>
                  ))}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!mentorChatInput.trim()) return;
                    const txt = mentorChatInput.trim();
                    setMentorChat((prev) => [
                      ...prev,
                      { id: `u-${Date.now()}`, sender: 'you', text: txt },
                      {
                        id: `m-${Date.now() + 1}`,
                        sender: 'mentor',
                        text: `Got it — let's break down "${txt.slice(0, 60)}" step-by-step on screen right now.`,
                      },
                    ]);
                    setMentorChatInput('');
                  }}
                  className="p-2.5 border-t border-white/[0.08] flex items-center gap-2"
                >
                  <label className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] cursor-pointer">
                    <ImagePlus className="w-4 h-4 text-zinc-300" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const r = new FileReader();
                        r.onload = () => {
                          setMentorChat((prev) => [
                            ...prev,
                            {
                              id: `img-${Date.now()}`,
                              sender: 'you',
                              text: 'Shared question image',
                              image: String(r.result ?? ''),
                            },
                          ]);
                        };
                        r.readAsDataURL(file);
                      }}
                    />
                  </label>
                  <input
                    type="text"
                    value={mentorChatInput}
                    onChange={(e) => setMentorChatInput(e.target.value)}
                    placeholder="Message mentor..."
                    className="flex-1 bg-transparent text-xs text-white placeholder:text-zinc-500 focus:outline-none"
                  />
                  <button type="submit" className="p-2 rounded-lg bg-indigo-600 text-white">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {(['All', 'JEE', 'NEET', 'Foundation'] as const).map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setExamFilter(ex)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  examFilter === ex
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-zinc-400 hover:border-indigo-500/60'
                }`}
              >
                {ex === 'All' ? 'All Verified Mentors' : `${ex} Mentors`}
              </button>
            ))}
          </div>

          {/* Mentor Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredMentors.map((mentor) => (
              <div
                key={mentor.id}
                className="rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] p-5 flex flex-col justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-800 border border-white/[0.1] shrink-0">
                    <img
                      src={mentor.avatarUrl}
                      alt={mentor.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-zinc-400">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {mentor.airLabel}
                      </span>
                      <span>·</span>
                      <span>{mentor.collegeBadge}</span>
                    </div>
                    <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      {mentor.name}
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-zinc-300">{mentor.headline}</p>
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                  {mentor.bio}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-white/[0.06] text-xs">
                  <div className="flex items-center gap-3 font-mono tabular-nums text-slate-600 dark:text-zinc-300">
                    <span className="inline-flex items-center gap-1 text-amber-500 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                      {mentor.rating}
                    </span>
                    <span>{mentor.sessionsCompleted}+ sessions</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      ₹{mentor.pricePer15MinInr}/15m
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      setBookingMentor(mentor);
                      setDurationMins(30);
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                  >
                    Book 1:1 Pass
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* On-Demand Duration Pass + UPI Checkout Modal */}
          {bookingMentor && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Book mentorship pass"
              className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) setBookingMentor(null);
              }}
            >
              <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.1] p-6 space-y-4 shadow-2xl">
                <div>
                  <p className="text-xs font-semibold text-indigo-500">On-Demand Duration Pass</p>
                  <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                    Book {bookingMentor.name} ({bookingMentor.airLabel})
                  </h3>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-600 dark:text-zinc-300">
                    Select Duration ({durationMins} min)
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {[15, 30, 45, 60].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDurationMins(m)}
                        className={`py-2 rounded-lg font-mono text-xs font-bold border ${
                          durationMins === m
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-zinc-300'
                        }`}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={90}
                    step={5}
                    value={durationMins}
                    onChange={(e) => setDurationMins(Number(e.target.value))}
                    aria-label="Custom mentorship pass minutes"
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="upi-input" className="text-xs font-semibold text-slate-600 dark:text-zinc-300">
                    UPI ID (Simulated Instant Pass Verification)
                  </label>
                  <input
                    id="upi-input"
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.1] text-sm font-mono"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.08] flex items-center justify-between text-xs font-mono">
                  <span>Payable via UPI ({durationMins} min)</span>
                  <strong className="text-base text-emerald-500">
                    ₹{Math.round((durationMins / 15) * bookingMentor.pricePer15MinInr)}
                  </strong>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setBookingMentor(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmUpiPass}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                  >
                    Pay &amp; Generate Pass Token
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: STRUCTURED DOUBT & DISCUSSION FORUM */}
      {section === 'forum' && (
        <div className="space-y-5">
          {/* Category Filter */}
          <div className="flex flex-wrap items-center gap-2">
            {['All', 'Physics', 'Chemistry', 'Maths', 'NEET Biology', 'Strategy', 'General'].map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setForumCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    forumCategory === cat
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-zinc-400'
                  }`}
                >
                  {cat}
                </button>
              )
            )}
          </div>

          {/* Ask New Doubt Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newPostTitle.trim() || !newPostBody.trim()) return;
              const post: ForumPost = {
                id: `fp-${Date.now()}`,
                category: newPostCategory,
                title: newPostTitle.trim(),
                body: newPostBody.trim(),
                authorName: currentUserName,
                authorCohort: 'Prepskm 2.0',
                createdAtLabel: 'Just now',
                upvotes: 1,
                imageUrl: newPostImage || undefined,
                replies: [],
              };
              setForumPosts((prev) => [post, ...prev]);
              setNewPostTitle('');
              setNewPostBody('');
              setNewPostImage('');
              playSuccess();
            }}
            className="rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] p-5 space-y-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                placeholder="Post a JEE / NEET doubt or strategy question..."
                className="flex-1 min-w-[200px] px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.1] text-sm"
              />
              <select
                aria-label="Doubt category"
                value={newPostCategory}
                onChange={(e) => setNewPostCategory(e.target.value as ForumPost['category'])}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.1] text-xs font-semibold"
              >
                {(['Physics', 'Chemistry', 'Maths', 'NEET Biology', 'Strategy', 'General'] as const).map(
                  (c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  )
                )}
              </select>
            </div>

            <textarea
              rows={2}
              value={newPostBody}
              onChange={(e) => setNewPostBody(e.target.value)}
              placeholder="Explain where you got stuck or mention your approach..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.1] text-xs"
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-500 cursor-pointer">
                <ImagePlus className="w-4 h-4" />
                {newPostImage ? 'Question image attached' : 'Attach Question Image'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => setNewPostImage(String(reader.result ?? ''));
                    reader.readAsDataURL(file);
                  }}
                />
              </label>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Post to Doubt Forum
              </button>
            </div>
          </form>

          {/* Threads */}
          <div className="space-y-4">
            {filteredPosts.map((post) => {
              const upvoted = Boolean(upvotedIds[post.id]);
              return (
                <article
                  key={post.id}
                  className="rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs text-slate-500 dark:text-zinc-400">
                        <strong className="text-indigo-600 dark:text-indigo-400">{post.category}</strong> · {post.authorName} ({post.authorCohort}) · {post.createdAtLabel}
                      </p>
                      <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                        {post.title}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        setUpvotedIds((prev) => ({ ...prev, [post.id]: !prev[post.id] }));
                      }}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-mono text-xs font-bold border shrink-0 ${
                        upvoted
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-zinc-300'
                      }`}
                    >
                      <ArrowBigUp className="w-4 h-4" />
                      {post.upvotes + (upvoted ? 1 : 0)}
                    </button>
                  </div>

                  <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
                    {post.body}
                  </p>

                  {post.imageUrl && (
                    <img
                      src={post.imageUrl}
                      alt="Doubt attachment"
                      referrerPolicy="no-referrer"
                      className="max-h-52 rounded-xl border border-slate-200 dark:border-white/[0.08]"
                    />
                  )}

                  {post.replies.map((rep) => (
                    <div
                      key={rep.id}
                      className="p-3.5 rounded-xl bg-emerald-500/8 border border-emerald-500/25 space-y-1"
                    >
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {rep.authorName}
                        {rep.isVerifiedMentor && (
                          <span className="font-mono font-normal opacity-90">
                            · Verified Mentor ({rep.mentorBadge})
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-700 dark:text-zinc-200 leading-relaxed">
                        {rep.body}
                      </p>
                    </div>
                  ))}
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: LIVE ASPIRANT STREAM & PEER STUDY FINDER */}
      {section === 'stream' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Batch Chat Rooms */}
          <div className="xl:col-span-6 rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-500" />
                Live Batch Stream
              </h2>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#09090B]">
                {(['JEE 2027', 'NEET 2027', 'Dropper Batch'] as const).map((rm) => (
                  <button
                    key={rm}
                    type="button"
                    onClick={() => setActiveRoom(rm)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                      activeRoom === rm
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 dark:text-zinc-400'
                    }`}
                  >
                    {rm}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {batchMessages
                .filter((m) => m.room === activeRoom)
                .map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200/80 dark:border-white/[0.06] space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`font-bold ${
                          m.isMentor ? 'text-emerald-500' : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {m.sender} · <span className="font-normal opacity-75">{m.cohortTag}</span>
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">{m.timestamp}</span>
                    </div>
                    <p className="text-slate-600 dark:text-zinc-300 leading-relaxed">{m.text}</p>
                  </div>
                ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!batchInput.trim()) return;
                setBatchMessages((prev) => [
                  ...prev,
                  {
                    id: `bc-${Date.now()}`,
                    room: activeRoom,
                    sender: currentUserName,
                    cohortTag: activeRoom,
                    text: batchInput.trim(),
                    timestamp: 'Now',
                  },
                ]);
                setBatchInput('');
                playClick();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={batchInput}
                onChange={(e) => setBatchInput(e.target.value)}
                placeholder={`Post an update to ${activeRoom}...`}
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.1] text-xs"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
              >
                Send
              </button>
            </form>
          </div>

          {/* Peer Study Finder */}
          <div className="xl:col-span-6 rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] p-5 space-y-4">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              Peer Study Finder (Match by Exam, Hours &amp; City)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <select
                aria-label="Filter peers by target exam"
                value={peerExamFilter}
                onChange={(e) => setPeerExamFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.1]"
              >
                <option value="All">All Exams</option>
                <option value="JEE Main 2027">JEE Main 2027</option>
                <option value="JEE Adv 2027">JEE Adv 2027</option>
                <option value="NEET UG 2027">NEET UG 2027</option>
                <option value="Dropper Batch">Dropper Batch</option>
              </select>

              <input
                type="text"
                value={peerCityQuery}
                onChange={(e) => setPeerCityQuery(e.target.value)}
                placeholder="City or state..."
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.1]"
              />

              <label className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.1] font-mono">
                <span>≥{peerMinHours}h/d</span>
                <input
                  type="range"
                  min={4}
                  max={12}
                  value={peerMinHours}
                  onChange={(e) => setPeerMinHours(Number(e.target.value))}
                  className="w-20 accent-indigo-500"
                />
              </label>
            </div>

            <div className="space-y-2.5">
              {filteredPeers.map((peer) => {
                const connected = Boolean(connectedPeers[peer.id]);
                return (
                  <div
                    key={peer.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200/80 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {peer.name} ·{' '}
                        <span className="font-normal text-indigo-600 dark:text-indigo-400">
                          {peer.targetExam}
                        </span>
                      </p>
                      <p className="text-slate-500 dark:text-zinc-400 mt-0.5">
                        {peer.city}, {peer.state} · {peer.dailyHoursGoal}h/day goal · Strong:{' '}
                        {peer.strongSubject} · {peer.streakDays}d streak
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        playSuccess();
                        setConnectedPeers((prev) => ({ ...prev, [peer.id]: !prev[peer.id] }));
                      }}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                        connected
                          ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-500/40'
                          : 'bg-indigo-600 text-white hover:bg-indigo-500'
                      }`}
                    >
                      {connected ? 'Buddy Paired' : 'Pair Buddy'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
