import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AD_UNLOCK_DOWNLOAD_CREDITS,
  ADSTERRA_NATIVE_CONTAINER_ID,
  ADSTERRA_NATIVE_SCRIPT_SRC,
  ADSTERRA_SMARTLINK_URL,
  evaluateDownloadRequest,
  FREE_DOWNLOADS_STORAGE_KEY,
  INITIAL_GUEST_DOWNLOAD_CREDITS,
  parseStoredGuestCredits,
  readOrInitGuestCredits,
  unlockGuestCreditsAfterAd,
  writeGuestCredits,
  type StorageLike,
} from './downloadGate';

function createMemoryStorage(initial: Record<string, string> = {}): StorageLike & {
  data: Record<string, string>;
} {
  const data: Record<string, string> = { ...initial };
  return {
    data,
    getItem: (key: string) => (key in data ? data[key] : null),
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
}

test('constants match exact Adsterra & localStorage specification', () => {
  assert.equal(FREE_DOWNLOADS_STORAGE_KEY, 'prepskm_free_downloads');
  assert.equal(INITIAL_GUEST_DOWNLOAD_CREDITS, 1);
  assert.equal(AD_UNLOCK_DOWNLOAD_CREDITS, 3);
  assert.equal(
    ADSTERRA_SMARTLINK_URL,
    'https://araplhn.org/4/ad4e2feb46f5aaef517104f2cf3cd26b'
  );
  assert.equal(
    ADSTERRA_NATIVE_SCRIPT_SRC,
    'https://bauval.org/21/86a8a2957646419fc65cd69a6f034684'
  );
  assert.equal(
    ADSTERRA_NATIVE_CONTAINER_ID,
    'container-86a8a2957646419fc65cd69a6f034684'
  );
});

test('readOrInitGuestCredits initializes missing or invalid key to 1', () => {
  const emptyStorage = createMemoryStorage();
  assert.equal(readOrInitGuestCredits(emptyStorage), 1);
  assert.equal(emptyStorage.data[FREE_DOWNLOADS_STORAGE_KEY], '1');

  const corruptedStorage = createMemoryStorage({
    [FREE_DOWNLOADS_STORAGE_KEY]: 'not-a-number',
  });
  assert.equal(readOrInitGuestCredits(corruptedStorage), 1);
  assert.equal(corruptedStorage.data[FREE_DOWNLOADS_STORAGE_KEY], '1');
});

test('readOrInitGuestCredits respects existing 0 and positive counts', () => {
  const zeroStorage = createMemoryStorage({ [FREE_DOWNLOADS_STORAGE_KEY]: '0' });
  assert.equal(readOrInitGuestCredits(zeroStorage), 0);

  const threeStorage = createMemoryStorage({ [FREE_DOWNLOADS_STORAGE_KEY]: '3' });
  assert.equal(readOrInitGuestCredits(threeStorage), 3);
});

test('parseStoredGuestCredits rejects negatives and non-integers', () => {
  assert.equal(parseStoredGuestCredits(null), null);
  assert.equal(parseStoredGuestCredits('-1'), null);
  assert.equal(parseStoredGuestCredits('1.5'), null);
  assert.equal(parseStoredGuestCredits('0'), 0);
  assert.equal(parseStoredGuestCredits('3'), 3);
});

test('evaluateDownloadRequest allows logged-in users directly even at 0 guest credits', () => {
  const res = evaluateDownloadRequest({ isLoggedIn: true, currentCredits: 0 });
  assert.deepEqual(res, { allowed: true, requiresGate: false, nextCredits: 0 });
});

test('evaluateDownloadRequest allows first free guest download and decrements to 0', () => {
  const first = evaluateDownloadRequest({ isLoggedIn: false, currentCredits: 1 });
  assert.deepEqual(first, { allowed: true, requiresGate: false, nextCredits: 0 });

  const second = evaluateDownloadRequest({ isLoggedIn: false, currentCredits: 0 });
  assert.deepEqual(second, { allowed: false, requiresGate: true, nextCredits: 0 });
});

test('unlockGuestCreditsAfterAd sets prepskm_free_downloads to 3', () => {
  const storage = createMemoryStorage({ [FREE_DOWNLOADS_STORAGE_KEY]: '0' });
  const unlocked = unlockGuestCreditsAfterAd(storage);
  assert.equal(unlocked, 3);
  assert.equal(storage.data[FREE_DOWNLOADS_STORAGE_KEY], '3');

  // Verify subsequent write clamping
  assert.equal(writeGuestCredits(-5, storage), 0);
  assert.equal(storage.data[FREE_DOWNLOADS_STORAGE_KEY], '0');
});
