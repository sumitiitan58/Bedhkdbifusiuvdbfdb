import { useEffect, useRef, useState } from 'react';
import {
  ImagePlus,
  Lightbulb,
  Loader2,
  Send,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import { usePrepskm2 } from '../../context/Prepskm2Context';
import { useAuth } from '../../context/AuthContext';
import { usePlatformData } from '../../context/PlatformDataContext';
import { requestPrepsAiChat } from '../../services/geminiClient';
import { playAiSparkle, playClick } from '../../utils/soundEffects';

interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  imagePreview?: string;
}

export function PrepsAiSlideOver() {
  const {
    copilotOpen,
    setCopilotOpen,
    pendingCopilotPrompt,
    clearPendingCopilotPrompt,
  } = usePrepskm2();
  const { cohortId } = useAuth();
  const { allCohorts } = usePlatformData();

  const cohortLabel =
    allCohorts.find((c) => c.id === cohortId)?.label ?? 'JEE / NEET Aspirant';

  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: `Hey! I’m Preps AI Copilot (${cohortLabel}). Upload a handwritten/printed doubt photo, ask for a step-by-step derivation, tap "Stuck on Step 2", or generate 3 similar PYQ-style practice questions anytime.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/png');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed && !imageBase64) return;
    setErrorMsg('');
    const currentImage = imageBase64;
    const currentMime = imageMime;

    const userMsg: CopilotMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed || 'Please solve this uploaded question step-by-step.',
      imagePreview: currentImage ? `data:${currentMime};base64,${currentImage}` : undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setImageBase64(null);
    setLoading(true);
    playAiSparkle();

    try {
      const result = await requestPrepsAiChat({
        message: currentImage
          ? `${userMsg.text}\n[Student attached a handwritten/printed doubt image (${currentMime})]`
          : userMsg.text,
        studentContext: {
          cohortLabel,
          source: 'prepskm2-slideover-copilot',
          hasUploadedImage: Boolean(currentImage),
        },
        history: messages.slice(-6).map((m) => ({
          role: m.role,
          text: m.text,
        })),
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: result.reply,
        },
      ]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to reach Preps AI right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (copilotOpen && pendingCopilotPrompt) {
      const prompt = pendingCopilotPrompt;
      clearPendingCopilotPrompt();
      void sendMessage(prompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copilotOpen, pendingCopilotPrompt]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleImagePick = (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select an image (PNG, JPG, or WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      const parts = dataUrl.split(',');
      if (parts.length === 2) {
        setImageMime(file.type || 'image/png');
        setImageBase64(parts[1]);
      }
    };
    reader.readAsDataURL(file);
  };

  if (!copilotOpen) return null;

  const lastTopicSnippet =
    [...messages].reverse().find((m) => m.role === 'user')?.text.slice(0, 120) ||
    'the current JEE/NEET problem';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Preps AI Study Copilot"
      className="fixed inset-0 z-[85] bg-black/60 backdrop-blur-xs flex justify-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) setCopilotOpen(false);
      }}
    >
      <div className="w-full max-w-md h-full bg-white dark:bg-[#111114] border-l border-slate-200 dark:border-white/[0.08] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white truncate">
                Preps AI Copilot
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                Vision doubts · Step-2 hints · Similar PYQ generator
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playClick();
              setCopilotOpen(false);
            }}
            aria-label="Close Preps AI Copilot"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* One-Click Copilot Actions */}
        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-white/[0.06] flex flex-wrap gap-2 bg-slate-50/70 dark:bg-[#09090B]/60">
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              void sendMessage(
                `Explain "${lastTopicSnippet}" like I am stuck on step 2 — give a clean intuitive hint first without skipping algebra.`
              )
            }
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.1] text-[11px] font-semibold text-slate-700 dark:text-zinc-200 hover:border-indigo-500 transition-colors"
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            Stuck on Step 2
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              void sendMessage(
                `Generate 3 similar JEE/NEET practice questions based on "${lastTopicSnippet}" with options A-D and concise final answers.`
              )
            }
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.1] text-[11px] font-semibold text-slate-700 dark:text-zinc-200 hover:border-indigo-500 transition-colors"
          >
            <Wand2 className="w-3.5 h-3.5 text-indigo-500" />
            3 Similar Questions
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-slate-100 dark:bg-[#18181D] text-slate-800 dark:text-zinc-100 border border-slate-200/80 dark:border-white/[0.06] rounded-bl-sm'
                }`}
              >
                {msg.imagePreview && (
                  <img
                    src={msg.imagePreview}
                    alt="Uploaded doubt screenshot"
                    referrerPolicy="no-referrer"
                    className="mb-2 max-h-40 rounded-lg border border-white/20 object-contain"
                  />
                )}
                {msg.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
              <span>Working out step-by-step solution...</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500 dark:text-rose-300">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage(input);
          }}
          className="p-3.5 border-t border-slate-200 dark:border-white/[0.08] space-y-2.5 bg-white dark:bg-[#111114]"
        >
          {imageBase64 && (
            <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-600 dark:text-indigo-300">
              <span>Doubt image attached</span>
              <button
                type="button"
                onClick={() => setImageBase64(null)}
                className="text-xs font-semibold hover:underline"
              >
                Remove
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImagePick(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label="Upload doubt image or screenshot"
              title="Upload handwritten or printed doubt photo"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-zinc-300 hover:border-indigo-500 transition-colors shrink-0"
            >
              <ImagePlus className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a JEE/NEET doubt or paste a question..."
              className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.1] text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={loading || (!input.trim() && !imageBase64)}
              aria-label="Send message to Preps AI"
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
