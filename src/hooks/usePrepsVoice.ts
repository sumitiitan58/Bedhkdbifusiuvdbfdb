import { useCallback, useEffect, useRef, useState } from 'react';

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
}

export function usePrepsVoice({
  onTranscriptReady,
  onWakeWordDetected,
}: UsePrepsVoiceOptions) {
  const [speechSupported] = useState<boolean>(() => Boolean(getSpeechRecognitionCtor()));
  const [ttsSupported] = useState<boolean>(
    () => typeof window !== 'undefined' && 'speechSynthesis' in window
  );

  const [isListening, setIsListening] = useState(false);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [voiceError, setVoiceError] = useState('');

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const wakeRecRef = useRef<SpeechRecognitionLike | null>(null);
  const wakeEnabledRef = useRef(false);
  const onTranscriptRef = useRef(onTranscriptReady);
  const onWakeRef = useRef(onWakeWordDetected);

  useEffect(() => {
    onTranscriptRef.current = onTranscriptReady;
  }, [onTranscriptReady]);

  useEffect(() => {
    onWakeRef.current = onWakeWordDetected;
  }, [onWakeWordDetected]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const speakText = useCallback(
    (text: string) => {
      if (!ttsSupported || !text.trim()) return;
      try {
        window.speechSynthesis.cancel();
        const clean = text.replace(/[*#`_]/g, '').replace(/\s+/g, ' ').trim();
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.lang = 'en-IN';
        utterance.rate = 1.03;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      } catch {
        setIsSpeaking(false);
      }
    },
    [ttsSupported]
  );

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setVoiceError('Voice recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    stopSpeaking();
    setVoiceError('');
    setLiveTranscript('');

    // Pause wake-word listener while active push-to-talk is running
    try {
      wakeRecRef.current?.stop();
    } catch {
      // ignore
    }

    const rec = new Ctor();
    rec.lang = 'en-IN';
    rec.continuous = false;
    rec.interimResults = true;

    let finalBuffer = '';

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
      setLiveTranscript((finalBuffer + interim).trim());
    };

    rec.onerror = (ev) => {
      if (ev.error !== 'no-speech' && ev.error !== 'aborted') {
        setVoiceError(
          ev.error === 'not-allowed'
            ? 'Microphone permission denied. Allow mic access in browser settings.'
            : `Mic error: ${ev.error}`
        );
      }
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      const captured = finalBuffer.trim();
      setLiveTranscript('');
      if (captured) {
        onTranscriptRef.current(captured, true);
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
      setVoiceError('Could not start microphone listener.');
    }
  }, [stopSpeaking]);

  // Optional Hands-Free Wake Word ("Hello Preps" / "Preps") listener
  const toggleWakeWord = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setVoiceError('Wake-word listening requires Chrome or Edge Web Speech API.');
      return;
    }

    if (wakeEnabledRef.current) {
      wakeEnabledRef.current = false;
      setWakeWordEnabled(false);
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

    const bootWakeListener = () => {
      if (!wakeEnabledRef.current) return;
      const rec = new Ctor();
      rec.lang = 'en-IN';
      rec.continuous = true;
      rec.interimResults = true;

      rec.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const raw = (event.results[i][0]?.transcript ?? '').trim();
          const lower = raw.toLowerCase();
          const match = lower.match(/\b(?:hello\s+preps|hey\s+preps|preps)\b(.*)$/i);
          if (match) {
            const after = (match[1] ?? '').trim();
            if (event.results[i].isFinal || after.length > 4) {
              try {
                rec.stop();
              } catch {
                // ignore
              }
              if (onWakeRef.current) {
                onWakeRef.current(after);
              }
              if (after.length > 2) {
                onTranscriptRef.current(after, true);
              } else {
                startListening();
              }
              break;
            }
          }
        }
      };

      rec.onerror = (ev) => {
        if (ev.error === 'not-allowed') {
          wakeEnabledRef.current = false;
          setWakeWordEnabled(false);
          setVoiceError('Allow microphone permission to use "Hello Preps" wake word.');
        }
      };

      rec.onend = () => {
        if (wakeEnabledRef.current && !recognitionRef.current) {
          window.setTimeout(bootWakeListener, 650);
        }
      };

      wakeRecRef.current = rec;
      try {
        rec.start();
      } catch {
        // ignore duplicate start
      }
    };

    bootWakeListener();
  }, [startListening]);

  useEffect(() => {
    return () => {
      wakeEnabledRef.current = false;
      try {
        recognitionRef.current?.abort();
        wakeRecRef.current?.abort();
      } catch {
        // ignore
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    speechSupported,
    ttsSupported,
    isListening,
    wakeWordEnabled,
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
