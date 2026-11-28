import { useCallback, useEffect, useRef, useState } from 'react';
import {
  cleanTextForSpeech,
  detectPrepsWakePhrase,
} from '../utils/speechUtils';
import {
  getPreferredGeminiVoice,
  setPreferredGeminiVoice,
  speakText as speakWithGeminiVoice,
  stopSpeaking as stopGeminiVoice,
  subscribeGeminiVoice,
  type GeminiVoiceName,
} from '../utils/speakText';
import { playWakeChime } from '../utils/soundEffects';

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
  };
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const AUTO_SEND_SILENCE_MS = 2000;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface UsePrepsVoiceOptions {
  onTranscriptReady: (transcript: string, viaVoice: boolean) => void;
  onWakeWordDetected?: (commandAfterWake: string) => void;
  autoSendSilenceMs?: number;
}

export function usePrepsVoice({
  onTranscriptReady,
  onWakeWordDetected,
  autoSendSilenceMs = AUTO_SEND_SILENCE_MS,
}: UsePrepsVoiceOptions) {
  const [speechSupported] = useState<boolean>(() => Boolean(getSpeechRecognitionCtor()));
  const [ttsSupported] = useState<boolean>(true);
  const [geminiVoice, setGeminiVoiceState] = useState<GeminiVoiceName>(() => getPreferredGeminiVoice());

  const [isListening, setIsListening] = useState(false);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false);
  const [wakeActivatedRecently, setWakeActivatedRecently] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [voiceError, setVoiceError] = useState('');

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const wakeRecRef = useRef<SpeechRecognitionLike | null>(null);
  const wakeEnabledRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const silenceTimerRef = useRef<number | null>(null);
  const wakeFlashTimerRef = useRef<number | null>(null);
  const resumeWakeRef = useRef<() => void>(() => {});
  const onTranscriptRef = useRef(onTranscriptReady);
  const onWakeRef = useRef(onWakeWordDetected);

  useEffect(() => {
    onTranscriptRef.current = onTranscriptReady;
  }, [onTranscriptReady]);

  useEffect(() => {
    onWakeRef.current = onWakeWordDetected;
  }, [onWakeWordDetected]);

  useEffect(() => {
    return subscribeGeminiVoice(setGeminiVoiceState);
  }, []);

  const setGeminiVoice = useCallback((voice: GeminiVoiceName) => {
    const saved = setPreferredGeminiVoice(voice);
    setGeminiVoiceState(saved);
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current !== null) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    stopGeminiVoice();
    isSpeakingRef.current = false;
    setIsSpeaking(false);
  }, []);

  const speakText = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      const cleaned = cleanTextForSpeech(text);
      if (!cleaned) return;

      // Pause background wake listener while speaking so Gemini audio never triggers itself
      try {
        wakeRecRef.current?.stop();
      } catch {
        // ignore
      }

      isSpeakingRef.current = true;
      setIsSpeaking(true);

      void speakWithGeminiVoice(cleaned, {
        language: 'hinglish',
        voiceName: geminiVoice,
        onStart: () => {
          isSpeakingRef.current = true;
          setIsSpeaking(true);
        },
        onEnd: () => {
          isSpeakingRef.current = false;
          setIsSpeaking(false);
          if (wakeEnabledRef.current && !recognitionRef.current) {
            window.setTimeout(() => resumeWakeRef.current(), 450);
          }
        },
        onError: () => {
          isSpeakingRef.current = false;
          setIsSpeaking(false);
          if (wakeEnabledRef.current && !recognitionRef.current) {
            window.setTimeout(() => resumeWakeRef.current(), 450);
          }
        },
      });
    },
    [geminiVoice]
  );

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    recognitionRef.current = null;
    setIsListening(false);
  }, [clearSilenceTimer]);

  const startListening = useCallback(
    (initialPrefix = '') => {
      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor) {
        setVoiceError('Voice recognition is not supported in this browser. Try Chrome or Edge.');
        return;
      }

      stopSpeaking();
      clearSilenceTimer();
      setVoiceError('');
      setLiveTranscript(initialPrefix.trim());

      // Pause background wake-word listener while actively capturing the student's question
      try {
        wakeRecRef.current?.stop();
      } catch {
        // ignore
      }

      const rec = new Ctor();
      rec.lang = 'en-IN';
      rec.continuous = true;
      rec.interimResults = true;

      let finalBuffer = initialPrefix.trim() ? `${initialPrefix.trim()} ` : '';
      let latestCombined = initialPrefix.trim();
      let submitted = false;

      const finishAndSubmit = () => {
        if (submitted) return;
        submitted = true;
        clearSilenceTimer();
        try {
          rec.stop();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
        setIsListening(false);
        const captured = latestCombined.trim();
        setLiveTranscript('');
        if (captured) {
          onTranscriptRef.current(captured, true);
        } else if (wakeEnabledRef.current && !isSpeakingRef.current) {
          window.setTimeout(() => resumeWakeRef.current(), 500);
        }
      };

      const scheduleAutoSend = () => {
        clearSilenceTimer();
        if (!latestCombined.trim()) return;
        silenceTimerRef.current = window.setTimeout(() => {
          finishAndSubmit();
        }, autoSendSilenceMs);
      };

      rec.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const chunk = event.results[i][0]?.transcript ?? '';
          if (event.results[i].isFinal) {
            finalBuffer += `${chunk} `;
          } else {
            interim += chunk;
          }
        }
        latestCombined = (finalBuffer + interim).trim();
        setLiveTranscript(latestCombined);
        scheduleAutoSend();
      };

      rec.onerror = (ev) => {
        clearSilenceTimer();
        if (ev.error !== 'no-speech' && ev.error !== 'aborted') {
          setVoiceError(
            ev.error === 'not-allowed'
              ? 'Microphone permission denied. Allow mic access in browser settings.'
              : `Mic error: ${ev.error}`
          );
        }
        recognitionRef.current = null;
        setIsListening(false);
        if (wakeEnabledRef.current && !isSpeakingRef.current && ev.error !== 'not-allowed') {
          window.setTimeout(() => resumeWakeRef.current(), 600);
        }
      };

      rec.onend = () => {
        if (!submitted) {
          finishAndSubmit();
        }
      };

      recognitionRef.current = rec;
      try {
        rec.start();
        setIsListening(true);
        if (latestCombined) {
          scheduleAutoSend();
        }
      } catch {
        recognitionRef.current = null;
        setIsListening(false);
        setVoiceError('Could not start microphone listener.');
      }
    },
    [autoSendSilenceMs, clearSilenceTimer, stopSpeaking]
  );

  // Hands-Free Wake Word ("Preps AI" / "Prep AI" / "Preps") listener
  const bootWakeListener = useCallback(() => {
    if (!wakeEnabledRef.current || recognitionRef.current || isSpeakingRef.current) return;
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    const rec = new Ctor();
    rec.lang = 'en-IN';
    rec.continuous = true;
    rec.interimResults = true;

    let wakeTriggered = false;

    rec.onresult = (event) => {
      if (wakeTriggered || !wakeEnabledRef.current) return;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const raw = (event.results[i][0]?.transcript ?? '').trim();
        const wake = detectPrepsWakePhrase(raw);
        if (!wake.detected) continue;

        const isFinal = Boolean(event.results[i].isFinal);
        const after = wake.commandAfterWake;

        // Trigger immediately once final OR once a clear wake phrase is heard
        if (isFinal || after.length >= 4 || /^preps?\s*a\.?\s*i\.?$/i.test(wake.matchedPhrase)) {
          wakeTriggered = true;
          try {
            rec.stop();
          } catch {
            // ignore
          }
          wakeRecRef.current = null;

          // Subtle listening chime + open/focus Preps AI UI
          playWakeChime();
          setWakeActivatedRecently(true);
          if (wakeFlashTimerRef.current !== null) {
            window.clearTimeout(wakeFlashTimerRef.current);
          }
          wakeFlashTimerRef.current = window.setTimeout(() => {
            setWakeActivatedRecently(false);
          }, 3000);

          if (onWakeRef.current) {
            onWakeRef.current(after);
          }

          if (isFinal && after.length >= 3) {
            // Full question was spoken right after "Preps AI" -> submit automatically!
            onTranscriptRef.current(after, true);
          } else {
            // Capture the student's spoken question right after the wake word (with 2s silence auto-send)
            startListening(after);
          }
          break;
        }
      }
    };

    rec.onerror = (ev) => {
      if (ev.error === 'not-allowed') {
        wakeEnabledRef.current = false;
        setWakeWordEnabled(false);
        setVoiceError('Allow microphone permission to use Hands-Free "Preps AI" Voice Mode.');
      }
    };

    rec.onend = () => {
      if (wakeRecRef.current === rec) {
        wakeRecRef.current = null;
      }
      if (wakeEnabledRef.current && !recognitionRef.current && !isSpeakingRef.current) {
        window.setTimeout(() => {
          resumeWakeRef.current();
        }, 650);
      }
    };

    wakeRecRef.current = rec;
    try {
      rec.start();
    } catch {
      // ignore duplicate start race
    }
  }, [startListening]);

  resumeWakeRef.current = bootWakeListener;

  const toggleWakeWord = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setVoiceError('Hands-Free "Preps AI" wake word requires Chrome or Edge Web Speech API.');
      return;
    }

    if (wakeEnabledRef.current) {
      wakeEnabledRef.current = false;
      setWakeWordEnabled(false);
      setWakeActivatedRecently(false);
      try {
        wakeRecRef.current?.abort();
      } catch {
        // ignore
      }
      wakeRecRef.current = null;
      return;
    }

    wakeEnabledRef.current = true;
    setWakeWordEnabled(true);
    setVoiceError('');
    bootWakeListener();
  }, [bootWakeListener]);

  useEffect(() => {
    return () => {
      wakeEnabledRef.current = false;
      clearSilenceTimer();
      if (wakeFlashTimerRef.current !== null) {
        window.clearTimeout(wakeFlashTimerRef.current);
      }
      try {
        recognitionRef.current?.abort();
        wakeRecRef.current?.abort();
      } catch {
        // ignore
      }
      stopGeminiVoice();
    };
  }, [clearSilenceTimer]);

  return {
    speechSupported,
    ttsSupported,
    geminiVoice,
    setGeminiVoice,
    isListening,
    wakeWordEnabled,
    wakeActivatedRecently,
    autoSpeak,
    setAutoSpeak,
    isSpeaking,
    liveTranscript,
    voiceError,
    setVoiceError,
    startListening,
    stopListening,
    toggleWakeWord,
    speakText,
    stopSpeaking,
  };
}
