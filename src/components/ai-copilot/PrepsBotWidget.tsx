import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Mic, MicOff, Sparkles, Trophy, Volume2, X } from 'lucide-react';
import { AiRoleAvatar } from '../ai/AiRoleAvatar';
import { usePrepskm2 } from '../../context/Prepskm2Context';
import { useAuth } from '../../context/AuthContext';
import { useExam } from '../../context/ExamContext';
import { usePlatformData } from '../../context/PlatformDataContext';
import { requestPrepsAiChat, requestTutorTtsAudio } from '../../services/geminiClient';
import {
  BUDDY_FIRST_WAKE_GREETING,
  BUDDY_ONBOARDED_STORAGE_KEY,
  PENDING_TIMER_CMD_KEY,
  extractHelloBuddyWake,
  parseBuddyIntent,
} from '../../utils/helloBuddyEngine';
import { playAiSparkle, playClick, playSuccess } from '../../utils/soundEffects';
import { detectTutorResponseLanguage } from '../../utils/tutorLanguagePolicy';
import { selectBestIndianVoice } from '../../utils/speakText';

type BuddyState = 'idle' | 'awake-listening' | 'thinking' | 'speaking';

interface SpeechRecognitionEventLike {
  resultIndex?: number;
  results: ArrayLike<{
    isFinal?: boolean;
    0: { transcript: string };
  }>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function PrepsBotWidget() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    zenMode,
    prepsbotVictory,
    triggerPrepsBotVictory,
    clearPrepsBotVictory,
    liveTeacherRequest,
    openLiveTeacher,
  } = usePrepskm2();
  const { cohortId, updateProfileDetails } = useAuth();
  const { setExamTrack } = useExam();
  const { allCohorts, attempts } = usePlatformData();

  const cohortLabel = useMemo(
    () => allCohorts.find((c) => c.id === cohortId)?.label ?? 'JEE Main / NEET UG',
    [allCohorts, cohortId]
  );

  // Detect live NTA CBT Exam Mode so Buddy hides automatically during an exam
  const [inLiveCbtExam, setInLiveCbtExam] = useState(false);

  useEffect(() => {
    const checkExamMode = () => {
      setInLiveCbtExam(document.documentElement.dataset.ntaExamMode === 'light');
    };
    checkExamMode();
    const observer = new MutationObserver(checkExamMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-nta-exam-mode'],
    });
    return () => observer.disconnect();
  }, [location.pathname]);

  const isArenaFightMode = location.pathname.startsWith('/arena');

  // Hands-Free "Hey Buddy / AI Buddy / Preps" Voice State (STRICT NO-CHAT-POPUP RULE!)
  const [buddyState, setBuddyState] = useState<BuddyState>('idle');
  const [wakeWordArmed, setWakeWordArmed] = useState(false);
  const [buddyDismissed, setBuddyDismissed] = useState(false);
  const [statusCaption, setStatusCaption] = useState<string | null>(null);

  const buddyDismissedRef = useRef(false);
  buddyDismissedRef.current = buddyDismissed;

  const prevAttemptsCountRef = useRef<number | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const wakeRecRef = useRef<SpeechRecognitionLike | null>(null);
  const commandRecRef = useRef<SpeechRecognitionLike | null>(null);
  const captionTimerRef = useRef<number | null>(null);
  const speechSessionRef = useRef(0);

  const showBriefCaption = useCallback((text: string, durationMs = 4500) => {
    setStatusCaption(text);
    if (captionTimerRef.current !== null) {
      window.clearTimeout(captionTimerRef.current);
    }
    captionTimerRef.current = window.setTimeout(() => {
      setStatusCaption(null);
    }, durationMs);
  }, []);

  const stopBuddyVoice = useCallback(() => {
    speechSessionRef.current += 1;
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.src = '';
      } catch {
        // ignore
      }
      activeAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    setBuddyState((prev) => (prev === 'speaking' ? 'idle' : prev));
  }, []);

  // Speak back with natural 17-18yo male Gemini TTS + live animated lip-sync mouth on the corner mascot!
  const speakBuddyReply = useCallback(
    async (text: string, displayNote?: string, language: 'hinglish' | 'english' = 'hinglish') => {
      const clean = text
        .replace(/\$\$?[^$]+\$\$?/g, 'formula')
        .replace(/[*_`#]/g, '')
        .trim();
      if (!clean) return;

      stopBuddyVoice();
      const sessionId = speechSessionRef.current;
      setBuddyState('speaking');
      showBriefCaption(displayNote || clean.slice(0, 96), Math.max(4500, clean.length * 68));

      const finish = () => {
        if (speechSessionRef.current !== sessionId) return;
        setBuddyState('idle');
      };

      const runBrowserVoice = () => {
        if (speechSessionRef.current !== sessionId) return;
        const estMs = Math.max(2600, Math.min(11000, clean.length * 55));
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try {
            window.speechSynthesis.cancel();
            const utt = new SpeechSynthesisUtterance(clean);
            const voices = window.speechSynthesis.getVoices();
            const preferred = selectBestIndianVoice(voices, language);
            if (preferred) utt.voice = preferred;
            utt.lang = language === 'english' ? 'en-US' : 'en-IN';
            utt.rate = 1.02;
            utt.pitch = 0.96;
            utt.onend = finish;
            utt.onerror = finish;
            window.speechSynthesis.speak(utt);
            window.setTimeout(finish, estMs + 1500);
            return;
          } catch {
            // fallback timer
          }
        }
        window.setTimeout(finish, estMs);
      };

      try {
        const audioPayload = await requestTutorTtsAudio({ text: clean, language });
        if (speechSessionRef.current !== sessionId) return;
        if (!audioPayload) {
          runBrowserVoice();
          return;
        }
        const audio = new Audio(`data:${audioPayload.mimeType};base64,${audioPayload.audioBase64}`);
        activeAudioRef.current = audio;
        audio.onended = finish;
        audio.onerror = runBrowserVoice;
        await audio.play();
      } catch {
        if (speechSessionRef.current !== sessionId) return;
        runBrowserVoice();
      }
    },
    [showBriefCaption, stopBuddyVoice]
  );

  // Execute full-permission Voice-to-Action command without opening any chat modal!
  const executeBuddyTranscript = useCallback(
    async (transcript: string) => {
      const clean = transcript.trim();
      if (!clean) return;

      const intent = parseBuddyIntent(clean, location.pathname);

      if (intent.type === 'dismiss') {
        stopBuddyVoice();
        if (commandRecRef.current) {
          try {
            commandRecRef.current.stop();
          } catch {
            // ignore
          }
          commandRecRef.current = null;
        }
        setBuddyState('idle');
        setStatusCaption(null);
        setBuddyDismissed(true);
        setWakeWordArmed(true);
        return;
      }

      if (intent.type === 'recall') {
        setBuddyDismissed(false);
        playAiSparkle();
        await speakBuddyReply(intent.spokenReply, 'Buddy is back!', 'hinglish');
        return;
      }

      if (buddyDismissedRef.current) {
        setBuddyDismissed(false);
      }

      switch (intent.type) {
        case 'onboarding': {
          try {
            window.localStorage.setItem(BUDDY_ONBOARDED_STORAGE_KEY, '1');
          } catch {
            // ignore
          }
          await speakBuddyReply(intent.spokenReply, 'Buddy is ready to help!', 'hinglish');
          return;
        }
        case 'update_name': {
          await updateProfileDetails({ displayName: intent.newName });
          playSuccess();
          await speakBuddyReply(intent.spokenReply, `Name updated to ${intent.newName}`, 'hinglish');
          return;
        }
        case 'switch_track': {
          setExamTrack(intent.track);
          playSuccess();
          await speakBuddyReply(intent.spokenReply, `Switched track to ${intent.label}`, 'hinglish');
          return;
        }
        case 'navigate': {
          navigate(intent.path);
          playSuccess();
          await speakBuddyReply(intent.spokenReply, `Opening ${intent.destinationLabel}`, 'hinglish');
          return;
        }
        case 'focus_timer': {
          const payload = { action: intent.action, minutes: intent.minutes };
          try {
            window.sessionStorage.setItem(PENDING_TIMER_CMD_KEY, JSON.stringify(payload));
          } catch {
            // ignore
          }
          if (!location.pathname.startsWith('/workspace')) {
            navigate('/workspace?tab=focus');
          }
          window.dispatchEvent(new CustomEvent('buddy:focus-timer', { detail: payload }));
          playSuccess();
          await speakBuddyReply(
            intent.spokenReply,
            intent.action === 'start'
              ? `Focus Timer started (${intent.minutes ?? 25}m)`
              : `Focus Timer ${intent.action}`,
            'hinglish'
          );
          return;
        }
        case 'open_tutor': {
          const tutorLang = detectTutorResponseLanguage(intent.questionText);
          openLiveTeacher({
            chapterName: intent.topic,
            questionText: intent.questionText,
            source: 'preps-ai',
            preferredLanguage: tutorLang,
          });
          await speakBuddyReply(intent.spokenReply, `Launching Live Teacher: ${intent.topic}`, 'hinglish');
          return;
        }
        case 'page_help': {
          await speakBuddyReply(intent.spokenReply, 'Buddy explaining this page…', 'hinglish');
          return;
        }
        case 'general_doubt': {
          const replyLang = detectTutorResponseLanguage(intent.query);
          setBuddyState('thinking');
          showBriefCaption(`Thinking: "${intent.query.slice(0, 48)}"…`, 8000);
          try {
            const res = await requestPrepsAiChat({
              message:
                replyLang === 'english'
                  ? `[Hands-Free Voice Buddy Reply — answer warmly like a realistic 17-18 year-old Indian male JEE/NEET study friend in 2 crisp sentences of natural English, easy to speak aloud]: ${intent.query}`
                  : `[Hands-Free Voice Buddy Reply — answer warmly like a realistic 17-18 year-old Indian male JEE/NEET study friend in 2 crisp sentences of natural Hinglish, easy to speak aloud]: ${intent.query}`,
              studentContext: {
                cohortLabel,
                source: 'hello-buddy-voice',
                currentRoute: location.pathname,
                preferredLanguage: replyLang,
              },
              history: [],
            });
            await speakBuddyReply(res.reply, res.reply.slice(0, 90), replyLang);
          } catch {
            await speakBuddyReply(
              replyLang === 'english'
                ? 'Network looks a bit slow right now — say that once more or open Live Teacher!'
                : 'Abhi network thoda slow lag raha hai, ek baar phir se bolo ya Live Teacher open kar lo!',
              'Try again in a moment',
              replyLang
            );
          }
        }
      }
    },
    [
      cohortLabel,
      location.pathname,
      navigate,
      openLiveTeacher,
      setExamTrack,
      showBriefCaption,
      speakBuddyReply,
      stopBuddyVoice,
      updateProfileDetails,
    ]
  );

  // Trigger hands-free wake sequence (ZERO chat popup opens!)
  const wakeBuddyHandsFree = useCallback(
    (inlineCommand?: string) => {
      setBuddyDismissed(false);
      playAiSparkle();
      stopBuddyVoice();

      if (inlineCommand && inlineCommand.trim()) {
        void executeBuddyTranscript(inlineCommand);
        return;
      }

      // Check first-wake friendly onboarding
      let alreadyOnboarded = false;
      try {
        alreadyOnboarded = window.localStorage.getItem(BUDDY_ONBOARDED_STORAGE_KEY) === '1';
      } catch {
        alreadyOnboarded = false;
      }

      if (!alreadyOnboarded) {
        try {
          window.localStorage.setItem(BUDDY_ONBOARDED_STORAGE_KEY, '1');
        } catch {
          // ignore
        }
        void speakBuddyReply(BUDDY_FIRST_WAKE_GREETING, 'Hey! Main hoon Buddy — bolo kya help karun?');
        return;
      }

      // Listen for one direct spoken command right from the corner mascot
      const SpeechRecCtor =
        (
          window as unknown as {
            SpeechRecognition?: new () => SpeechRecognitionLike;
            webkitSpeechRecognition?: new () => SpeechRecognitionLike;
          }
        ).SpeechRecognition ||
        (
          window as unknown as {
            webkitSpeechRecognition?: new () => SpeechRecognitionLike;
          }
        ).webkitSpeechRecognition;

      if (!SpeechRecCtor) {
        void speakBuddyReply(
          'Haan dost, main sun raha hoon! Tum mujhse track switch, focus timer, ya koi bhi page khulwa sakte ho.',
          'Buddy Awake · Say a command'
        );
        return;
      }

      try {
        if (commandRecRef.current) {
          commandRecRef.current.stop();
        }
        const rec = new SpeechRecCtor();
        rec.lang = 'en-IN';
        rec.continuous = false;
        rec.interimResults = false;
        setBuddyState('awake-listening');
        showBriefCaption('Listening… bolo dost!', 6500);

        rec.onresult = (event) => {
          const spoken = event.results?.[0]?.[0]?.transcript?.trim();
          if (spoken) {
            void executeBuddyTranscript(spoken);
          } else {
            setBuddyState('idle');
          }
        };
        rec.onerror = () => {
          setBuddyState('idle');
          showBriefCaption('Mic unavailable — tap Buddy again anytime', 3200);
        };
        rec.onend = () => {
          setBuddyState((prev) => (prev === 'awake-listening' ? 'idle' : prev));
        };
        commandRecRef.current = rec;
        rec.start();
      } catch {
        setBuddyState('idle');
      }
    },
    [executeBuddyTranscript, showBriefCaption, speakBuddyReply, stopBuddyVoice]
  );

  // Continuous background "Hello Buddy" wake-word listener when armed
  useEffect(() => {
    if (!wakeWordArmed || inLiveCbtExam || zenMode || liveTeacherRequest) {
      if (wakeRecRef.current) {
        try {
          wakeRecRef.current.stop();
        } catch {
          // ignore
        }
        wakeRecRef.current = null;
      }
      return;
    }

    const SpeechRecCtor =
      (
        window as unknown as {
          SpeechRecognition?: new () => SpeechRecognitionLike;
          webkitSpeechRecognition?: new () => SpeechRecognitionLike;
        }
      ).SpeechRecognition ||
      (
        window as unknown as {
          webkitSpeechRecognition?: new () => SpeechRecognitionLike;
        }
      ).webkitSpeechRecognition;

    if (!SpeechRecCtor) {
      setWakeWordArmed(false);
      return;
    }

    let stopped = false;
    const rec = new SpeechRecCtor();
    rec.lang = 'en-IN';
    rec.continuous = true;
    rec.interimResults = false;

    rec.onresult = (event) => {
      const idx = event.resultIndex ?? event.results.length - 1;
      const transcript = event.results?.[idx]?.[0]?.transcript?.trim() ?? '';
      if (!transcript) return;
      const wake = extractHelloBuddyWake(transcript);
      if (wake.woke) {
        if (wake.triggerKind === 'dismiss' || wake.triggerKind === 'recall') {
          void executeBuddyTranscript(transcript);
        } else {
          wakeBuddyHandsFree(wake.command);
        }
      }
    };

    rec.onerror = (ev) => {
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
        stopped = true;
        setWakeWordArmed(false);
      }
    };

    rec.onend = () => {
      if (!stopped && wakeWordArmed) {
        window.setTimeout(() => {
          if (!stopped && wakeWordArmed) {
            try {
              rec.start();
            } catch {
              // ignore restart error
            }
          }
        }, 600);
      }
    };

    wakeRecRef.current = rec;
    try {
      rec.start();
    } catch {
      setWakeWordArmed(false);
    }

    return () => {
      stopped = true;
      try {
        rec.stop();
      } catch {
        // ignore
      }
      wakeRecRef.current = null;
    };
  }, [
    wakeWordArmed,
    inLiveCbtExam,
    zenMode,
    liveTeacherRequest,
    wakeBuddyHandsFree,
    executeBuddyTranscript,
  ]);

  // Trigger .prepsbot-triumphant automatically when a user completes a new mock test / DPP attempt
  useEffect(() => {
    if (prevAttemptsCountRef.current === null) {
      prevAttemptsCountRef.current = attempts.length;
      return;
    }
    if (attempts.length > prevAttemptsCountRef.current) {
      const latest = attempts[0];
      triggerPrepsBotVictory({
        title: 'Mock Test Completed!',
        subtitle: latest
          ? `${latest.testTitle} (${latest.score}/${latest.maxScore}) — Awesome effort!`
          : 'Prep Score & Percentile updated!',
        badge: 'TRIUMPHANT',
      });
    }
    prevAttemptsCountRef.current = attempts.length;
  }, [attempts, triggerPrepsBotVictory]);

  // Listen for custom global events: mock victory, Hello Buddy wake/command, and KBT "Ask Buddy" lifeline!
  useEffect(() => {
    const onVictoryEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ title?: string; subtitle?: string; badge?: string }>).detail;
      triggerPrepsBotVictory({
        title: detail?.title || 'Mock Test Completed!',
        subtitle: detail?.subtitle || 'PrepsBot celebrates your victory!',
        badge: detail?.badge || 'TRIUMPHANT',
      });
    };

    const onBuddyWake = (event: Event) => {
      const detail = (event as CustomEvent<{ command?: string }>).detail;
      wakeBuddyHandsFree(detail?.command);
    };

    const onBuddyCommand = (event: Event) => {
      const detail = (event as CustomEvent<{ transcript?: string }>).detail;
      if (detail?.transcript) {
        playAiSparkle();
        void executeBuddyTranscript(detail.transcript);
      }
    };

    const onBuddyAskHint = (event: Event) => {
      const detail = (event as CustomEvent<{ hint?: string }>).detail;
      if (detail?.hint) {
        playAiSparkle();
        void speakBuddyReply(detail.hint, 'Buddy Hint Active…');
      }
    };

    window.addEventListener('prepsbot:victory', onVictoryEvent);
    window.addEventListener('buddy:wake', onBuddyWake);
    window.addEventListener('buddy:command', onBuddyCommand);
    window.addEventListener('buddy:ask-hint', onBuddyAskHint);
    return () => {
      window.removeEventListener('prepsbot:victory', onVictoryEvent);
      window.removeEventListener('buddy:wake', onBuddyWake);
      window.removeEventListener('buddy:command', onBuddyCommand);
      window.removeEventListener('buddy:ask-hint', onBuddyAskHint);
    };
  }, [triggerPrepsBotVictory, wakeBuddyHandsFree, executeBuddyTranscript, speakBuddyReply]);

  useEffect(() => {
    if (!prepsbotVictory) return;
    playSuccess();
    const timer = window.setTimeout(() => {
      clearPrepsBotVictory();
    }, 5500);
    return () => window.clearTimeout(timer);
  }, [prepsbotVictory, clearPrepsBotVictory]);

  // Hide completely during live NTA CBT Exam Mode, Zen Study Mode, or active Live Teacher Classroom
  if (inLiveCbtExam || zenMode || liveTeacherRequest) return null;

  // REQ-05: When dismissed by voice ("door ho jao", "gayab ho jao", etc.), hide AI Buddy from active screen
  // while keeping lightweight background wake/recall listening active + tiny recall trigger dot.
  if (buddyDismissed) {
    return (
      <div
        data-testid="hello-buddy-dock"
        data-buddy-state="dismissed"
        data-buddy-dismissed="true"
        className="fixed bottom-16 right-3 lg:bottom-5 lg:right-5 z-[75] pointer-events-auto"
      >
        <button
          type="button"
          data-testid="buddy-dismissed-recall-dot"
          aria-label='Recall AI Buddy — say "Hey buddy, please aa jao" or click to bring Buddy back'
          title='AI Buddy hidden · Say "Hey buddy, please aa jao" or click to recall'
          onClick={() => {
            playAiSparkle();
            void executeBuddyTranscript('Hey buddy, please aa jao');
          }}
          className="h-8 w-8 rounded-full bg-[#0b1120]/70 hover:bg-[#0b1120] border border-sky-400/35 hover:border-sky-400 text-sky-300/80 hover:text-sky-200 shadow-lg backdrop-blur-md inline-flex items-center justify-center transition-all"
        >
          <Mic className={`w-3.5 h-3.5 ${wakeWordArmed ? 'animate-pulse text-emerald-400' : ''}`} />
        </button>
      </div>
    );
  }

  const isVictoryActive = Boolean(prepsbotVictory);
  const isBuddyActive = buddyState !== 'idle';

  return (
    <div
      data-testid="hello-buddy-dock"
      data-buddy-state={buddyState}
      data-buddy-dismissed="false"
      className="fixed bottom-16 right-3 lg:bottom-5 lg:right-5 z-[75] flex flex-col items-end pointer-events-none"
    >
      {/* TINY NON-BLOCKING STATUS TOAST (ZERO CHAT MODAL OR POPUP!) */}
      <div className="flex flex-col items-end gap-1.5 pointer-events-auto">
        <AnimatePresence mode="wait">
          {prepsbotVictory ? (
            <motion.div
              key={`victory-${prepsbotVictory.id}`}
              role="status"
              aria-live="polite"
              data-testid="prepsbot-victory-banner"
              initial={{ opacity: 0, y: 10, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 360, damping: 24 }}
              className="flex items-start gap-2 max-w-[260px] pl-3 pr-2 py-2 rounded-2xl rounded-br-sm bg-[#0b1120]/95 backdrop-blur-xl border border-amber-400/60 shadow-xl text-xs text-slate-100"
            >
              <Trophy className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-xs font-extrabold text-white leading-snug">
                  {prepsbotVictory.title}
                </p>
                <p className="text-[11px] text-slate-300 leading-snug">
                  {prepsbotVictory.subtitle}
                </p>
              </div>
              <button
                type="button"
                aria-label="Dismiss victory celebration"
                onClick={clearPrepsBotVictory}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ) : statusCaption ? (
            <motion.div
              key="buddy-caption"
              role="status"
              aria-live="polite"
              data-testid="buddy-voice-pill"
              initial={{ opacity: 0, y: 8, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.94 }}
              className="flex items-center gap-2 max-w-[250px] px-3 py-1.5 rounded-full bg-[#0b1120]/92 backdrop-blur-xl border border-sky-400/40 shadow-[0_8px_28px_rgba(56,189,248,0.22)] text-[11px] font-semibold text-sky-100"
            >
              {buddyState === 'speaking' ? (
                <Volume2 className="w-3.5 h-3.5 text-sky-400 animate-pulse shrink-0" />
              ) : (
                <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
              )}
              <span className="truncate">{statusCaption}</span>
              {buddyState === 'speaking' && (
                <button
                  type="button"
                  onClick={stopBuddyVoice}
                  aria-label="Stop Buddy voice"
                  className="p-0.5 text-slate-400 hover:text-white shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="flex items-end gap-2">

        {/* Subtle Hands-Free "Hey Buddy / AI Buddy / Preps" Wake-Word Mic Arm Button */}
        <button
          type="button"
          data-testid="buddy-wake-mic-toggle"
          aria-pressed={wakeWordArmed}
          aria-label={
            wakeWordArmed
              ? 'Disable background Hey Buddy / AI Buddy / Preps wake listener'
              : 'Enable background Hey Buddy / AI Buddy / Preps wake listener'
          }
          title={
            wakeWordArmed
              ? 'Wake-word active ("Hey buddy", "AI buddy", "Preps buddy", "Preps") — click to pause'
              : 'Arm hands-free wake listener ("Hey buddy", "AI buddy", "Preps buddy", "Preps")'
          }
          onClick={() => {
            playClick();
            setWakeWordArmed((prev) => {
              const next = !prev;
              showBriefCaption(
                next ? 'Say "Hey buddy", "AI buddy", or "Preps" anytime!' : 'Wake-word paused — tap Buddy to talk',
                2800
              );
              return next;
            });
          }}
          className={`mb-2 h-8 w-8 rounded-full border inline-flex items-center justify-center transition-all ${
            wakeWordArmed
              ? 'bg-sky-400/20 border-sky-400 text-sky-300 shadow-[0_0_16px_rgba(56,189,248,0.45)]'
              : 'bg-[#0b1120]/80 border-slate-400/20 text-slate-400 hover:text-sky-300 hover:border-sky-400/40'
          }`}
        >
          {wakeWordArmed ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
        </button>

        {/* FLOATING CORNER BUDDY MASCOT (NO CHAT POPUP ON WAKE + .prepsbot-triumphant ON MOCK COMPLETE) */}
        <button
          type="button"
          onClick={() => {
            if (buddyState === 'speaking') {
              stopBuddyVoice();
              return;
            }
            wakeBuddyHandsFree();
          }}
          data-testid="prepsbot-corner-launcher"
          data-victory={isVictoryActive ? 'true' : 'false'}
          data-triumphant={isVictoryActive ? 'true' : 'false'}
          aria-label='Wake Hey Buddy / AI Buddy / Preps hands-free voice assistant'
          title={
            isVictoryActive
              ? 'PrepsBot • Mock Test Triumphant!'
              : 'Tap or say "Hey buddy", "AI buddy", "Preps buddy", or "Preps"'
          }
          className={`group relative w-16 h-16 sm:w-[70px] sm:h-[70px] bg-transparent border-0 p-0 select-none flex items-center justify-center focus:outline-none ${
            isVictoryActive ? 'prepsbot-triumphant' : ''
          }`}
        >
          {/* Glowing Cyan Wake Aura Rings when Buddy is Listening or Speaking */}
          {isBuddyActive && (
            <>
              <span
                aria-hidden="true"
                data-testid="buddy-wake-aura"
                className="pointer-events-none absolute inset-0 rounded-full border-2 border-sky-400/70 buddy-wake-aura"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-1 rounded-full bg-sky-400/20 blur-md"
              />
            </>
          )}

          <AiRoleAvatar
            role="prepsbot"
            size="md"
            showShadow={true}
            motionOverride={
              isVictoryActive
                ? 'prepsbot-triumphant'
                : isArenaFightMode
                  ? 'prepsbot-fight'
                  : 'bot-motion-prepsbot'
            }
            className="w-full h-full"
          />

          {/* Real-Time Animated Lip-Sync Mouth Overlay when Buddy Speaks! */}
          {buddyState === 'speaking' && (
            <span
              aria-hidden="true"
              data-testid="buddy-lip-sync-mouth"
              className="pointer-events-none absolute left-1/2 top-[43%] -translate-x-1/2 -translate-y-1/2 w-3.5 h-2 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(56,189,248,0.95)] buddy-lip-sync-mouth"
            />
          )}

          {/* Status Indicator Dot */}
          <span
            aria-hidden="true"
            className={`absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#0b1120] ${
              isVictoryActive
                ? 'bg-amber-400 animate-ping'
                : buddyState === 'speaking'
                  ? 'bg-sky-400 animate-pulse'
                  : buddyState === 'awake-listening' || wakeWordArmed
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-emerald-400'
            }`}
          />

          {isVictoryActive && (
            <Sparkles
              aria-hidden="true"
              className="pointer-events-none absolute -top-1.5 -left-1.5 w-4 h-4 text-amber-300 animate-bounce"
            />
          )}
        </button>
        </div>
      </div>
    </div>
  );
}
