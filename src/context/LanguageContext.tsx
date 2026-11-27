import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type AppLanguage = 'en' | 'hi';

const LANGUAGE_STORAGE_KEY = 'prepskm_language_v1';

const TRANSLATIONS: Record<string, { en: string; hi: string }> = {
  // Primary 5-Space Navigation
  'nav.home': { en: 'Home', hi: 'होम' },
  'nav.learn': { en: 'Learn & PYQs', hi: 'लर्न व PYQs' },
  'nav.mocks': { en: 'CBT Mocks', hi: 'CBT मॉक्स' },
  'nav.community': { en: 'Community', hi: 'कम्युनिटी' },
  'nav.mentors': { en: 'Mentors & Arena', hi: 'मेंटर्स व एरिना' },
  'nav.pricing': { en: 'Pricing', hi: 'प्राइसिंग' },

  // Mobile Short Tabs
  'mobile.home': { en: 'Home', hi: 'होम' },
  'mobile.learn': { en: 'Learn', hi: 'लर्न' },
  'mobile.mocks': { en: 'Mocks', hi: 'मॉक्स' },
  'mobile.community': { en: 'Peers', hi: 'कम्युनिटी' },
  'mobile.mentors': { en: 'Mentors', hi: 'मेंटर्स' },

  // Sidebar Deep Tools
  'sidebar.deepTools': { en: 'Deep Tools', hi: 'डीप टूल्स' },
  'sidebar.dpp': { en: 'Chapter DPPs', hi: 'चैप्टर DPP' },
  'sidebar.ncert': { en: 'NCERT-to-PYQ', hi: 'NCERT से PYQ' },
  'sidebar.predictor': { en: '2027 Predictor', hi: '2027 प्रिडिक्टर' },
  'sidebar.mistakes': { en: 'Mistake Notebook', hi: 'मिस्टेक नोटबुक' },
  'sidebar.analysis': { en: 'Test Analysis', hi: 'टेस्ट एनालिसिस' },
  'sidebar.ai': { en: 'Preps AI Chat', hi: 'प्रेप्स AI चैट' },
  'sidebar.arena': { en: 'Apex Arena', hi: 'एपेक्स एरिना' },
  'sidebar.profile': { en: 'Profile & Streaks', hi: 'प्रोफ़ाइल व स्ट्रीक' },

  // Top Bar Controls
  'top.search': { en: 'Search chapters, PYQs, mocks...', hi: 'चैप्टर, PYQ, मॉक खोजें...' },
  'top.guest': { en: 'Guest Mode', hi: 'गेस्ट मोड' },
  'top.signIn': { en: 'Sign In', hi: 'साइन इन' },
  'top.zen': { en: 'Zen', hi: 'ज़ेन' },

  // Homepage Hero
  'hero.eyebrow': { en: 'PREPSKM 2.0 · JEE + NEET + CLASS 9–12', hi: 'PREPSKM 2.0 · JEE + NEET + कक्षा 9–12' },
  'hero.title': {
    en: 'Master JEE & NEET with Concept-Mapped PYQs, Real NTA Mocks & 1:1 IIT/AIIMS Mentors.',
    hi: 'कॉन्सेप्ट-मैप्ड PYQs, असली NTA मॉक्स और 1:1 IIT/AIIMS मेंटर्स के साथ JEE और NEET में टॉप करें।',
  },
  'hero.subtitle': {
    en: 'Zero-login Guest Mode lets you start practicing immediately with NCERT-to-PYQ mapping, 2027 weightage prediction, and authentic +4/-1 CBT testing.',
    hi: 'बिना लॉगिन के गेस्ट मोड में तुरंत अभ्यास शुरू करें — NCERT-से-PYQ मैपिंग, 2027 वेटेज प्रिडिक्टर और असली +4/-1 CBT टेस्ट के साथ।',
  },
  'hero.ctaMock': { en: 'Start Free CBT Mock (Guest Mode)', hi: 'फ्री CBT मॉक शुरू करें (गेस्ट मोड)' },
  'hero.ctaMentor': { en: 'Book 1:1 IIT/AIIMS Mentor', hi: '1:1 IIT/AIIMS मेंटर बुक करें' },
  'hero.metricCbt': { en: 'NTA CBT Engine (+4/-1)', hi: 'NTA CBT इंजन (+4/-1)' },
  'hero.metricNcert': { en: 'NCERT-to-PYQ & 2027 Predictor', hi: 'NCERT-से-PYQ व 2027 प्रिडिक्टर' },
  'hero.metricMentor': { en: '1:1 Human Mentors (₹129/15m)', hi: '1:1 ह्यूमन मेंटर्स (₹129/15m)' },

  // Homepage Study Deck Tabs
  'deck.title': { en: 'Interactive Study Workspace', hi: 'इंटरैक्टिव स्टडी वर्कस्पेस' },
  'deck.subtitle': {
    en: 'Switch cleanly between formula drills, timed focus blocks, 5-stage mastery, and live rank prediction.',
    hi: 'फ़ॉर्मूला ड्रिल, फोकस ब्लॉक, 5-स्टेज मास्टरी और लाइव रैंक प्रिडिक्टर के बीच आसानी से स्विच करें।',
  },
  'deck.tabPractice': { en: 'Quick Practice', hi: 'क्विक प्रैक्टिस' },
  'deck.tabFocus': { en: 'Focus & Planner', hi: 'फोकस व प्लानर' },
  'deck.tabMastery': { en: 'Mastery Tracker', hi: 'मास्टरी ट्रैकर' },
  'deck.tabPredictor': { en: 'Percentile Predictor', hi: 'पर्सेंटाइल प्रिडिक्टर' },

  // Homepage Quick Launch Bento
  'bento.title': { en: '5-Space Quick Launch', hi: '5-स्पेस क्विक लॉन्च' },
  'bento.subtitle': {
    en: 'Jump directly into any deep preparation workspace with zero clutter.',
    hi: 'किसी भी तैयारी मॉड्यूल में सीधे प्रवेश करें।',
  },

  // Learn Hub
  'learn.title': { en: 'Concept-Mapped PYQ Hub & 2027 Predictor', hi: 'कॉन्सेप्ट-मैप्ड PYQ हब व 2027 प्रिडिक्टर' },
  'learn.tabPyq': { en: 'Concept-Mapped PYQs', hi: 'कॉन्सेप्ट PYQ बैंक' },
  'learn.tabPredictor': { en: '2027 High-Yield Predictor', hi: '2027 हाई-यील्ड प्रिडिक्टर' },
  'learn.tabNcert': { en: 'NCERT-to-PYQ Mapper', hi: 'NCERT-से-PYQ मैपर' },

  // Community Hub
  'community.title': { en: 'Live Peer Community & Counselling Hub', hi: 'लाइव पीयर कम्युनिटी व काउंसलिंग हब' },
  'community.tabChat': { en: 'Live Chat & Doubts', hi: 'लाइव चैट व डाउट्स' },
  'community.tabPeers': { en: 'Find Study Peers', hi: 'स्टडी पार्टनर खोजें' },
  'community.tabCounselling': { en: 'JoSAA & MCC Counselling', hi: 'JoSAA व MCC काउंसलिंग' },

  // Pricing
  'pricing.title': {
    en: 'Start Free Forever. Upgrade Only When You Need More.',
    hi: 'हमेशा फ्री शुरू करें। ज़रूरत पड़ने पर ही अपग्रेड करें।',
  },
  'pricing.subtitle': {
    en: 'Zero paywalls on core mocks, community, or Guest Mode. Transparent plans for serious JEE & NEET aspirants.',
    hi: 'मॉक्स, कम्युनिटी और गेस्ट मोड पर कोई रोक नहीं। JEE और NEET छात्रों के लिए पारदर्शी प्लान।',
  },
};

interface LanguageContextValue {
  lang: AppLanguage;
  setLang: (next: AppLanguage) => void;
  toggleLang: () => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readInitialLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'en' || saved === 'hi') return saved;
  } catch {
    // ignore storage limits
  }
  return 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<AppLanguage>(readInitialLanguage);

  useEffect(() => {
    document.documentElement.lang = lang === 'hi' ? 'hi' : 'en';
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // ignore storage limits
    }
  }, [lang]);

  const setLang = useCallback((next: AppLanguage) => {
    setLangState(next);
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => (prev === 'en' ? 'hi' : 'en'));
  }, []);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const entry = TRANSLATIONS[key];
      if (!entry) return fallback ?? key;
      return entry[lang] ?? entry.en;
    },
    [lang]
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, setLang, toggleLang, t }),
    [lang, setLang, toggleLang, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
