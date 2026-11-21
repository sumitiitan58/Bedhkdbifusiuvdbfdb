import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { resolveAssetUrl } from '../utils/instantUpload';
import {
  evaluateDownloadRequest,
  FREE_DOWNLOADS_STORAGE_KEY,
  readOrInitGuestCredits,
  unlockGuestCreditsAfterAd,
  writeGuestCredits,
} from '../utils/downloadGate';
import { playClick, playSuccess } from '../utils/soundEffects';

export interface PdfDownloadRequest {
  url: string;
  fileName?: string;
  title: string;
  materialId?: string;
  onApproved?: () => void;
}

export interface DownloadGateContextValue {
  guestCredits: number;
  isUnlimited: boolean;
  gateOpen: boolean;
  pendingDownload: PdfDownloadRequest | null;
  requestPdfDownload: (req: PdfDownloadRequest) => Promise<boolean>;
  completeAdUnlock: () => number;
  triggerPendingDownloadAfterUnlock: () => Promise<void>;
  closeGate: () => void;
}

const DownloadGateContext = createContext<DownloadGateContextValue | null>(null);

async function executeDirectFileDownload(req: PdfDownloadRequest): Promise<void> {
  const resolved = (await resolveAssetUrl(req.url)) || req.url;
  if (!resolved) return;

  req.onApproved?.();

  const link = document.createElement('a');
  link.href = resolved;
  link.download = req.fileName || `${req.title}.pdf`;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function DownloadGateProvider({ children }: { children: ReactNode }) {
  const { firebaseUser } = useAuth();
  const isLoggedIn = Boolean(firebaseUser);

  const [guestCredits, setGuestCredits] = useState<number>(() =>
    readOrInitGuestCredits()
  );
  const [gateOpen, setGateOpen] = useState(false);
  const [pendingDownload, setPendingDownload] = useState<PdfDownloadRequest | null>(
    null
  );

  // Sync guest credits across tabs or external localStorage updates
  useEffect(() => {
    const syncCredits = () => {
      setGuestCredits(readOrInitGuestCredits());
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === FREE_DOWNLOADS_STORAGE_KEY || e.key === null) {
        syncCredits();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // If the user signs in with Google while the gate modal is open, unlock immediately and download
  useEffect(() => {
    if (isLoggedIn && gateOpen && pendingDownload) {
      const toDownload = pendingDownload;
      setGateOpen(false);
      setPendingDownload(null);
      playSuccess();
      void executeDirectFileDownload(toDownload);
    }
  }, [isLoggedIn, gateOpen, pendingDownload]);

  const requestPdfDownload = useCallback(
    async (req: PdfDownloadRequest): Promise<boolean> => {
      const latestCredits = readOrInitGuestCredits();
      const decision = evaluateDownloadRequest({
        isLoggedIn,
        currentCredits: latestCredits,
      });

      if (!decision.allowed) {
        playClick();
        setGuestCredits(0);
        setPendingDownload(req);
        setGateOpen(true);
        return false;
      }

      if (!isLoggedIn) {
        const persisted = writeGuestCredits(decision.nextCredits);
        setGuestCredits(persisted);
      }

      playClick();
      await executeDirectFileDownload(req);
      return true;
    },
    [isLoggedIn]
  );

  const completeAdUnlock = useCallback((): number => {
    const unlocked = unlockGuestCreditsAfterAd();
    setGuestCredits(unlocked);
    playSuccess();
    return unlocked;
  }, []);

  const triggerPendingDownloadAfterUnlock = useCallback(async () => {
    if (!pendingDownload) {
      setGateOpen(false);
      return;
    }

    const req = pendingDownload;
    const latestCredits = readOrInitGuestCredits();
    const decision = evaluateDownloadRequest({
      isLoggedIn,
      currentCredits: latestCredits,
    });

    if (decision.allowed) {
      if (!isLoggedIn) {
        const persisted = writeGuestCredits(decision.nextCredits);
        setGuestCredits(persisted);
      }
      setPendingDownload(null);
      setGateOpen(false);
      playClick();
      await executeDirectFileDownload(req);
    }
  }, [isLoggedIn, pendingDownload]);

  const closeGate = useCallback(() => {
    playClick();
    setGateOpen(false);
    setPendingDownload(null);
  }, []);

  const value = useMemo<DownloadGateContextValue>(
    () => ({
      guestCredits,
      isUnlimited: isLoggedIn,
      gateOpen,
      pendingDownload,
      requestPdfDownload,
      completeAdUnlock,
      triggerPendingDownloadAfterUnlock,
      closeGate,
    }),
    [
      guestCredits,
      isLoggedIn,
      gateOpen,
      pendingDownload,
      requestPdfDownload,
      completeAdUnlock,
      triggerPendingDownloadAfterUnlock,
      closeGate,
    ]
  );

  return (
    <DownloadGateContext.Provider value={value}>
      {children}
    </DownloadGateContext.Provider>
  );
}

export function useDownloadGate(): DownloadGateContextValue {
  const ctx = useContext(DownloadGateContext);
  if (!ctx) {
    throw new Error('useDownloadGate must be used inside DownloadGateProvider');
  }
  return ctx;
}
