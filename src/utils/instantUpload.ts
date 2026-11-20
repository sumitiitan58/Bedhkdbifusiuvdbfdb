import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { storage } from '../firebase/config';

const IDB_NAME = 'prepskm_instant_assets_v1';
const IDB_STORE = 'blobs';
const BLOB_PREFIX = 'prepskm-blob://';
const MAX_INLINE_DOC_BYTES = 460 * 1024; // ~460 KB -> ~620 KB base64 (safely inside Firestore 750 KB rule)

const resolvedBlobCache = new Map<string, string>();

function openAssetDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

async function saveBlobToIndexedDb(id: string, blob: Blob): Promise<void> {
  const db = await openAssetDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
  });
}

async function loadBlobFromIndexedDb(id: string): Promise<Blob | null> {
  try {
    const db = await openAssetDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(id);
      req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function resolveAssetUrl(url: string | undefined): Promise<string> {
  if (!url) return '';
  if (!url.startsWith(BLOB_PREFIX)) return url;

  const cached = resolvedBlobCache.get(url);
  if (cached) return cached;

  const id = url.slice(BLOB_PREFIX.length);
  const blob = await loadBlobFromIndexedDb(id);
  if (!blob) return '';
  const objectUrl = URL.createObjectURL(blob);
  resolvedBlobCache.set(url, objectUrl);
  return objectUrl;
}

export function isLocalBlobUri(url?: string): boolean {
  return Boolean(url && url.startsWith(BLOB_PREFIX));
}

function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}

export async function compressImageToDataUrl(
  file: Blob,
  maxDimension = 900,
  maxChars = 220000
): Promise<{ dataUrl: string; mimeType: string; sizeBytes: number }> {
  const rawDataUrl = await readFileAsDataUrl(file);
  if (rawDataUrl.length <= maxChars && file.type.startsWith('image/')) {
    return { dataUrl: rawDataUrl, mimeType: file.type, sizeBytes: file.size };
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let width = img.naturalWidth || maxDimension;
      let height = img.naturalHeight || maxDimension;
      if (width > maxDimension || height > maxDimension) {
        const scale = Math.min(maxDimension / width, maxDimension / height);
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ dataUrl: rawDataUrl.slice(0, maxChars), mimeType: 'image/jpeg', sizeBytes: file.size });
        return;
      }

      const qualities = [0.82, 0.68, 0.54, 0.4];
      for (let step = 0; step < 3; step += 1) {
        canvas.width = Math.max(80, Math.round(width * Math.pow(0.75, step)));
        canvas.height = Math.max(80, Math.round(height * Math.pow(0.75, step)));
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        for (const q of qualities) {
          const out = canvas.toDataURL('image/jpeg', q);
          if (out.length <= maxChars) {
            resolve({
              dataUrl: out,
              mimeType: 'image/jpeg',
              sizeBytes: Math.round((out.length * 3) / 4),
            });
            return;
          }
        }
      }

      const fallback = canvas.toDataURL('image/jpeg', 0.32);
      resolve({
        dataUrl: fallback,
        mimeType: 'image/jpeg',
        sizeBytes: Math.round((fallback.length * 3) / 4),
      });
    };
    img.onerror = () => reject(new Error('Could not decode image for compression.'));
    img.src = rawDataUrl;
  });
}

function tryStorageUploadWithTimeout(
  file: File,
  folder: string,
  timeoutMs: number,
  onProgress?: (percent: number) => void
): Promise<{ downloadUrl: string; storagePath: string }> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${folder}/${Date.now()}_${safeName}`;
  const fileRef = ref(storage, storagePath);

  return new Promise((resolve, reject) => {
    let settled = false;
    let lastBytes = 0;

    const task = uploadBytesResumable(fileRef, file, {
      contentType: file.type || 'application/octet-stream',
    });

    const timer = window.setTimeout(() => {
      if (!settled && lastBytes === 0) {
        settled = true;
        try {
          task.cancel();
        } catch {
          // ignore
        }
        reject(new Error('Storage upload timed out at 0% — switching to instant fallback.'));
      }
    }, timeoutMs);

    task.on(
      'state_changed',
      (snap) => {
        lastBytes = snap.bytesTransferred;
        if (snap.totalBytes > 0) {
          onProgress?.(Math.min(95, Math.round((snap.bytesTransferred / snap.totalBytes) * 100)));
        }
      },
      (err) => {
        if (!settled) {
          settled = true;
          window.clearTimeout(timer);
          reject(err);
        }
      },
      async () => {
        if (!settled) {
          settled = true;
          window.clearTimeout(timer);
          try {
            const downloadUrl = await getDownloadURL(task.snapshot.ref);
            onProgress?.(100);
            resolve({ downloadUrl, storagePath });
          } catch (e) {
            reject(e);
          }
        }
      }
    );
  });
}

export interface InstantUploadResult {
  downloadUrl: string;
  storagePath: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  mode: 'inline-compressed' | 'inline-document' | 'cloud-storage' | 'local-indexeddb';
}

export async function instantUploadAsset(params: {
  file: File;
  folder: 'materials' | 'lectures' | 'questions' | 'avatars' | 'thumbnails';
  kind?: 'image' | 'avatar' | 'thumbnail' | 'document' | 'video';
  onProgress?: (percent: number) => void;
}): Promise<InstantUploadResult> {
  const { file, folder, onProgress } = params;
  const kind =
    params.kind ??
    (file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('video/')
        ? 'video'
        : 'document');

  onProgress?.(25);

  // 1. All images (avatars, video thumbnails, cropped questions, notes images) -> Instant canvas compression (<80ms)
  if (kind === 'image' || kind === 'avatar' || kind === 'thumbnail' || file.type.startsWith('image/')) {
    const maxDim = kind === 'avatar' ? 400 : kind === 'thumbnail' ? 840 : 1200;
    const maxChars = kind === 'avatar' ? 140000 : 250000;
    const compressed = await compressImageToDataUrl(file, maxDim, maxChars);
    onProgress?.(100);
    return {
      downloadUrl: compressed.dataUrl,
      storagePath: '',
      fileName: file.name,
      fileSizeBytes: compressed.sizeBytes,
      mimeType: compressed.mimeType,
      mode: 'inline-compressed',
    };
  }

  // 2. Documents/PDFs <= 460KB -> Instant Base64 Data URL stored right inside Firestore (<100ms, works on every device!)
  if (kind === 'document' && file.size <= MAX_INLINE_DOC_BYTES) {
    const dataUrl = await readFileAsDataUrl(file);
    onProgress?.(100);
    return {
      downloadUrl: dataUrl,
      storagePath: '',
      fileName: file.name,
      fileSizeBytes: file.size,
      mimeType: file.type || 'application/pdf',
      mode: 'inline-document',
    };
  }

  // 3. Larger PDFs or Videos -> Try Cloud Storage with strict 3.5s stall guard, then instant IndexedDB fallback
  try {
    onProgress?.(40);
    const cloud = await tryStorageUploadWithTimeout(file, folder, 3500, onProgress);
    return {
      downloadUrl: cloud.downloadUrl,
      storagePath: cloud.storagePath,
      fileName: file.name,
      fileSizeBytes: file.size,
      mimeType: file.type || 'application/octet-stream',
      mode: 'cloud-storage',
    };
  } catch {
    onProgress?.(85);
    const blobId = `${folder}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await saveBlobToIndexedDb(blobId, file);
    const uri = `${BLOB_PREFIX}${blobId}`;
    resolvedBlobCache.set(uri, URL.createObjectURL(file));
    onProgress?.(100);
    return {
      downloadUrl: uri,
      storagePath: '',
      fileName: file.name,
      fileSizeBytes: file.size,
      mimeType: file.type || 'application/octet-stream',
      mode: 'local-indexeddb',
    };
  }
}
