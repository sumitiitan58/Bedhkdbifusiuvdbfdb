import { useMemo, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  LogIn,
  LogOut,
  Save,
  ShieldCheck,
  UserCircle2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { PageLayout } from '../layouts/PageLayout';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { ReusableCard } from '../components/ReusableCard';
import { ReusableButton } from '../components/ReusableButton';
import { ClassSubClassPicker } from '../components/ClassSubClassPicker';
import { SeoHead } from '../components/SeoHead';
import { useAuth } from '../context/AuthContext';
import { usePlatformData } from '../context/PlatformDataContext';
import { instantUploadAsset } from '../utils/instantUpload';
import { computeWeeklyScheduleStats } from '../utils/weeklySchedule';
import {
  isSoundEnabled,
  playClick,
  playSuccess,
  playToggle,
  setSoundEnabled,
} from '../utils/soundEffects';

export default function ProfilePage() {
  const {
    firebaseUser,
    profile,
    cohortId,
    isAdmin,
    updateProfileDetails,
    signInWithGoogle,
    logout,
  } = useAuth();
  const { allCohorts, progress, attempts } = usePlatformData();

  const [displayName, setDisplayName] = useState(
    profile?.displayName ?? firebaseUser?.displayName ?? 'PREPSKM Student'
  );
  const [bio, setBio] = useState(
    profile?.bio ?? 'Focused on consistent daily problem solving and high-accuracy mock analysis.'
  );
  const [targetExam, setTargetExam] = useState(profile?.targetExam ?? 'JEE Main & Advanced');
  const [targetYear, setTargetYear] = useState(profile?.targetYear ?? '2027');
  const [pickedCohort, setPickedCohort] = useState(cohortId);
  const [avatarUrl, setAvatarUrl] = useState(profile?.photoURL ?? firebaseUser?.photoURL ?? '');

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState<boolean>(() => isSoundEnabled());
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const weeklyStats = useMemo(
    () => computeWeeklyScheduleStats(progress.weeklySchedule ?? []),
    [progress.weeklySchedule]
  );

  const avgAccuracy = useMemo(() => {
    if (attempts.length === 0) return 0;
    return Math.round(
      attempts.reduce((sum, a) => sum + a.accuracyPercent, 0) / attempts.length
    );
  }, [attempts]);

  const activeCohortLabel =
    allCohorts.find((c) => c.id === pickedCohort)?.label ?? pickedCohort;

  const handleAvatarUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploadingAvatar(true);
    setStatusMessage(null);
    try {
      const uploaded = await instantUploadAsset({
        file,
        folder: 'avatars',
        kind: 'avatar',
      });
      setAvatarUrl(uploaded.downloadUrl);
      await updateProfileDetails({ photoURL: uploaded.downloadUrl });
      playSuccess();
      setStatusMessage('Profile photo updated instantaneously!');
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : 'Could not process image. Please try another photo.'
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);
    try {
      await updateProfileDetails({
        displayName: displayName.trim() || 'PREPSKM Student',
        bio: bio.trim(),
        targetExam: targetExam.trim(),
        targetYear: targetYear.trim(),
        cohortId: pickedCohort,
        photoURL: avatarUrl || undefined,
      });
      playSuccess();
      setStatusMessage('Profile saved cleanly.');
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout>
      <SeoHead
        title="Student Profile & Preferences — PREPSKM.IN"
        description="Manage your PREPSKM.IN student profile photo, target JEE/NEET/Board class, weekly routine stats, and sound preferences."
        canonicalPath="/profile"
        noIndex
      />

      <ResponsiveContainer className="py-8 sm:py-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#F97316]">
              Personal Workspace
            </p>
            <h1 className="font-display text-3xl font-extrabold text-[#0B1B3B] dark:text-white mt-0.5">
              Student Profile
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Upload your profile photo instantaneously, customize your JEE/NEET track, and review your study metrics.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {firebaseUser ? (
              <ReusableButton
                variant="secondary"
                size="sm"
                onClick={() => {
                  playClick();
                  void logout();
                }}
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </ReusableButton>
            ) : (
              <ReusableButton
                variant="primary"
                size="sm"
                onClick={() => {
                  playClick();
                  void signInWithGoogle(pickedCohort);
                }}
              >
                <LogIn className="w-4 h-4" />
                Sync with Google
              </ReusableButton>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Avatar Upload + Account Summary + Live Stats */}
          <div className="lg:col-span-4 space-y-5">
            <ReusableCard className="text-center space-y-4">
              <div className="relative inline-block">
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg mx-auto bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserCircle2 className="w-16 h-16 text-slate-400" />
                  )}
                </div>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  aria-label="Upload profile picture"
                  className="hidden"
                  onChange={(e) => void handleAvatarUpload(e.target.files?.[0])}
                />
                <button
                  type="button"
                  disabled={uploadingAvatar}
                  onClick={() => avatarInputRef.current?.click()}
                  aria-label="Change profile photo"
                  className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white shadow-md inline-flex items-center justify-center border-2 border-white dark:border-slate-900 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h2 className="font-display text-xl font-bold text-[#0B1B3B] dark:text-white">
                  {displayName}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {firebaseUser ? firebaseUser.email : 'Guest Mode · Local Profile'}
                </p>
                {isAdmin && (
                  <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[#F97316]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Platform Admin
                  </p>
                )}
              </div>

              <button
                type="button"
                disabled={uploadingAvatar}
                onClick={() => avatarInputRef.current?.click()}
                className="w-full px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-[#0B1B3B] dark:text-white hover:border-[#2563EB] transition-colors"
              >
                {uploadingAvatar ? 'Optimizing photo...' : 'Upload New Profile Photo (Instant)'}
              </button>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3 text-left">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Weekly Routine</p>
                  <p className="font-mono text-lg font-bold text-[#10B981] tabular-nums">
                    {weeklyStats.completionPercent}%
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">CBT Accuracy</p>
                  <p className="font-mono text-lg font-bold text-[#2563EB] dark:text-sky-400 tabular-nums">
                    {avgAccuracy}%
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Tests Taken</p>
                  <p className="font-mono text-lg font-bold text-[#0B1B3B] dark:text-white tabular-nums">
                    {attempts.length}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Focus Time</p>
                  <p className="font-mono text-lg font-bold text-[#F97316] tabular-nums">
                    {progress.focusSessionsMinutes}m
                  </p>
                </div>
              </div>
            </ReusableCard>

            {/* Sound Effects Preference */}
            <ReusableCard padding="sm" className="flex items-center justify-between gap-3">
              <div>
                <p className="font-display text-sm font-bold text-[#0B1B3B] dark:text-white">
                  UI &amp; Exam Sound Effects
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tactile clicks, completion chimes, and CBT warning alerts
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !soundOn;
                  setSoundEnabled(next);
                  setSoundOn(next);
                  if (next) playToggle(true);
                }}
                aria-pressed={soundOn}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  soundOn
                    ? 'bg-[#2563EB] text-white border-[#2563EB]'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                {soundOn ? 'On' : 'Muted'}
              </button>
            </ReusableCard>
          </div>

          {/* Right Column: Editable Profile Details + Dynamic Class -> Sub-Class Picker */}
          <ReusableCard className="lg:col-span-8">
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="profile-name"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Full Name
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    required
                    maxLength={120}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="profile-target-exam"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                    >
                      Target Exam
                    </label>
                    <select
                      id="profile-target-exam"
                      value={targetExam}
                      onChange={(e) => setTargetExam(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    >
                      <option value="JEE Main & Advanced">JEE Main &amp; Adv</option>
                      <option value="NEET UG">NEET UG</option>
                      <option value="Class 12 Boards">Class 12 Boards</option>
                      <option value="Class 11 Boards">Class 11 Boards</option>
                      <option value="Class 9-10 Foundation">Foundation / Olympiad</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="profile-target-year"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                    >
                      Exam Year
                    </label>
                    <select
                      id="profile-target-year"
                      value={targetYear}
                      onChange={(e) => setTargetYear(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    >
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                      <option value="2028">2028</option>
                      <option value="2029">2029</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="profile-bio"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Study Goal / Bio
                </label>
                <textarea
                  id="profile-bio"
                  rows={2}
                  maxLength={300}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Active Class &amp; Sub-Class Track
                  </p>
                  <span className="text-xs font-bold text-[#2563EB] dark:text-sky-400">
                    Selected: {activeCohortLabel}
                  </span>
                </div>
                <ClassSubClassPicker
                  selectedCohortId={pickedCohort}
                  onSelect={setPickedCohort}
                  compact
                />
              </div>

              {statusMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{statusMessage}</span>
                </div>
              )}

              <div className="flex justify-end">
                <ReusableButton type="submit" variant="primary" disabled={saving}>
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Profile Changes'}
                </ReusableButton>
              </div>
            </form>
          </ReusableCard>
        </div>
      </ResponsiveContainer>
    </PageLayout>
  );
}
