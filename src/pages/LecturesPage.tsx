import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  Film,
  Play,
  PlayCircle,
  Search,
  Video,
} from 'lucide-react';
import { PageLayout } from '../layouts/PageLayout';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { ReusableCard } from '../components/ReusableCard';
import { ReusableButton } from '../components/ReusableButton';
import { SeoHead } from '../components/SeoHead';
import { usePlatformData } from '../context/PlatformDataContext';
import { resolveAssetUrl } from '../utils/instantUpload';
import { computeWeeklyScheduleStats, WEEK_DAY_LABELS } from '../utils/weeklySchedule';
import { playClick, playSuccess } from '../utils/soundEffects';
import type { VideoLectureRecord } from '../types';

function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.slice(1) || null;
    }
    if (parsed.hostname.includes('youtube.com')) {
      if (parsed.pathname.startsWith('/embed/')) return parsed.pathname.split('/')[2] || null;
      return parsed.searchParams.get('v');
    }
  } catch {
    return null;
  }
  return null;
}

export default function LecturesPage() {
  const {
    subjects,
    chapters,
    lectures,
    progress,
    toggleWeeklyTask,
    updateLectureWatchPosition,
  } = usePlatformData();

  const [activeTab, setActiveTab] = useState<'library' | 'schedule'>('library');
  const [selectedLecture, setSelectedLecture] = useState<VideoLectureRecord | null>(
    () => lectures[0] ?? null
  );
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string>('');
  const [libSubjectId, setLibSubjectId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let active = true;
    if (!selectedLecture) {
      setResolvedVideoUrl('');
      return;
    }
    resolveAssetUrl(selectedLecture.videoUrl).then((u) => {
      if (active) setResolvedVideoUrl(u || selectedLecture.videoUrl);
    });
    return () => {
      active = false;
    };
  }, [selectedLecture]);

  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s.name])), [subjects]);
  const chapterMap = useMemo(() => new Map(chapters.map((c) => [c.id, c.name])), [chapters]);

  const filteredLibrary = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return lectures.filter((lec) => {
      if (libSubjectId !== 'all' && lec.subjectId !== libSubjectId) return false;
      if (q) {
        const subName = (subjectMap.get(lec.subjectId) ?? '').toLowerCase();
        const chName = (chapterMap.get(lec.chapterId) ?? '').toLowerCase();
        return (
          lec.title.toLowerCase().includes(q) ||
          (lec.description ?? '').toLowerCase().includes(q) ||
          subName.includes(q) ||
          chName.includes(q)
        );
      }
      return true;
    });
  }, [chapterMap, lectures, libSubjectId, searchQuery, subjectMap]);

  const libraryStats = useMemo(() => {
    const total = lectures.length;
    let watched = 0;
    let watchedSec = 0;
    for (const l of lectures) {
      const rec = progress.lectureWatchState[l.id];
      if (rec?.watched) watched += 1;
      watchedSec += rec?.watchedSeconds ?? 0;
    }
    return {
      total,
      watched,
      percent: total > 0 ? Math.round((watched / total) * 100) : 0,
      watchedMinutes: Math.round(watchedSec / 60),
    };
  }, [lectures, progress.lectureWatchState]);

  const weeklyStats = useMemo(
    () => computeWeeklyScheduleStats(progress.weeklySchedule ?? []),
    [progress.weeklySchedule]
  );

  const activePlayerWatch = selectedLecture
    ? progress.lectureWatchState[selectedLecture.id]
    : undefined;
  const activeYoutubeId = selectedLecture ? extractYouTubeId(selectedLecture.videoUrl) : null;

  return (
    <PageLayout>
      <SeoHead
        title="Video Lectures & Weekly Schedule — PREPSKM.IN"
        description="Watch chapter-wise JEE, NEET, and Board video lectures with crisp thumbnails, descriptions, resume playback, and your Monday–Sunday weekly study timetable."
        canonicalPath="/lectures"
        keywords="JEE video lectures, NEET concept videos, chapter lectures, weekly study timetable, PREPSKM lectures"
      />

      <ResponsiveContainer className="py-8 sm:py-10 space-y-8">
        {/* Header + Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#F97316]">
              Chapter Video Library &amp; Weekly Routine
            </p>
            <h1 className="font-display text-3xl font-extrabold text-[#0B1B3B] dark:text-white mt-0.5">
              Video Lectures &amp; Weekly Schedule
            </h1>
            <p className="mt-1.5 text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Watch chapter concept videos with saved timestamps and stay on track with your Monday–Sunday study blocks.
            </p>
          </div>

          <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] p-1 self-start">
            <button
              type="button"
              onClick={() => {
                playClick();
                setActiveTab('library');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'library'
                  ? 'bg-[#0B1B3B] text-white dark:bg-[#2563EB]'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#0B1B3B]'
              }`}
            >
              Video Library ({libraryStats.total})
            </button>
            <button
              type="button"
              onClick={() => {
                playClick();
                setActiveTab('schedule');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'schedule'
                  ? 'bg-[#0B1B3B] text-white dark:bg-[#2563EB]'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#0B1B3B]'
              }`}
            >
              Weekly Schedule ({weeklyStats.completedTasks}/{weeklyStats.totalTasks})
            </button>
          </div>
        </div>

        {/* Summary KPI Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ReusableCard padding="sm">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Lectures Completed
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#0B1B3B] dark:text-white">
              {libraryStats.watched} / {libraryStats.total}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {libraryStats.percent}% completion
            </p>
          </ReusableCard>

          <ReusableCard padding="sm">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Watch-Time Logged
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#2563EB] dark:text-sky-400">
              {libraryStats.watchedMinutes} min
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Auto-resumes playback</p>
          </ReusableCard>

          <ReusableCard padding="sm">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Weekly Schedule
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#10B981]">
              {weeklyStats.completionPercent}%
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {weeklyStats.completedHours}h of {weeklyStats.plannedHours}h
            </p>
          </ReusableCard>

          <ReusableCard padding="sm">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Focus Sprints
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#F97316]">
              {progress.focusSessionsMinutes} min
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Logged deep study</p>
          </ReusableCard>
        </div>

        {/* TAB 1: COURSE VIDEO LIBRARY */}
        {activeTab === 'library' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Player Panel */}
            <div className="lg:col-span-7 space-y-4">
              {selectedLecture ? (
                <ReusableCard className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-[#F97316]">
                        Lecture #{selectedLecture.lectureNumber} ·{' '}
                        {subjectMap.get(selectedLecture.subjectId) ?? 'Course'}
                      </p>
                      <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white">
                        {selectedLecture.title}
                      </h2>
                    </div>
                    <ReusableButton
                      variant={activePlayerWatch?.watched ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={() => {
                        playSuccess();
                        updateLectureWatchPosition(
                          selectedLecture.id,
                          selectedLecture.durationMinutes * 60,
                          selectedLecture.durationMinutes * 60,
                          !activePlayerWatch?.watched
                        );
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {activePlayerWatch?.watched ? 'Watched' : 'Mark Watched'}
                    </ReusableButton>
                  </div>

                  <div className="aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                    {activeYoutubeId ? (
                      <iframe
                        title={selectedLecture.title}
                        src={`https://www.youtube.com/embed/${activeYoutubeId}?start=${activePlayerWatch?.lastPositionSeconds ?? 0}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    ) : (
                      <video
                        ref={videoRef}
                        src={resolvedVideoUrl || selectedLecture.videoUrl}
                        poster={selectedLecture.thumbnailUrl}
                        controls
                        className="w-full h-full"
                        onLoadedMetadata={(e) => {
                          const resumePos = activePlayerWatch?.lastPositionSeconds ?? 0;
                          if (resumePos > 2 && e.currentTarget.duration > resumePos) {
                            e.currentTarget.currentTime = resumePos;
                          }
                        }}
                        onTimeUpdate={(e) => {
                          const t = Math.floor(e.currentTarget.currentTime);
                          if (t > 0 && t % 5 === 0) {
                            updateLectureWatchPosition(
                              selectedLecture.id,
                              t,
                              e.currentTarget.duration || selectedLecture.durationMinutes * 60
                            );
                          }
                        }}
                        onEnded={(e) =>
                          updateLectureWatchPosition(
                            selectedLecture.id,
                            e.currentTarget.duration || selectedLecture.durationMinutes * 60,
                            e.currentTarget.duration || selectedLecture.durationMinutes * 60,
                            true
                          )
                        }
                      />
                    )}
                  </div>

                  {selectedLecture.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {selectedLecture.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span>
                      Chapter: {chapterMap.get(selectedLecture.chapterId) ?? 'Syllabus'} ·{' '}
                      {selectedLecture.durationMinutes} min
                    </span>
                    <div className="flex items-center gap-3">
                      {activePlayerWatch && activePlayerWatch.lastPositionSeconds > 0 && (
                        <span className="font-mono text-[#2563EB] dark:text-sky-400">
                          Saved: {Math.floor(activePlayerWatch.lastPositionSeconds / 60)}m{' '}
                          {activePlayerWatch.lastPositionSeconds % 60}s
                        </span>
                      )}
                      {selectedLecture.notesUrl && (
                        <a
                          href={selectedLecture.notesUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-[#F97316] hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Lecture Notes PDF
                        </a>
                      )}
                    </div>
                  </div>
                </ReusableCard>
              ) : (
                <ReusableCard className="py-16 text-center space-y-3">
                  <PlayCircle className="w-12 h-12 text-[#2563EB] mx-auto" />
                  <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white">
                    Select a Video Lecture to Start Watching
                  </h2>
                </ReusableCard>
              )}
            </div>

            {/* Lecture Playlist with Thumbnails */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    placeholder="Search lectures..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
                <select
                  aria-label="Filter course lectures by subject"
                  value={libSubjectId}
                  onChange={(e) => setLibSubjectId(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                >
                  <option value="all">All Subjects</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2.5">
                {filteredLibrary.map((lec) => {
                  const wRec = progress.lectureWatchState[lec.id];
                  const isCurrent = selectedLecture?.id === lec.id;
                  return (
                    <button
                      key={lec.id}
                      type="button"
                      onClick={() => {
                        playClick();
                        setSelectedLecture(lec);
                      }}
                      className={`w-full text-left p-3 rounded-2xl border transition-all flex items-start gap-3 ${
                        isCurrent
                          ? 'border-[#2563EB] bg-blue-50/60 dark:border-sky-400 dark:bg-sky-950/30'
                          : 'bg-white dark:bg-[#111A2E] border-slate-200 dark:border-slate-800 hover:border-[#2563EB]/50'
                      }`}
                    >
                      <div className="relative w-24 h-16 rounded-xl bg-slate-900 overflow-hidden shrink-0">
                        {lec.thumbnailUrl ? (
                          <img
                            src={lec.thumbnailUrl}
                            alt={lec.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#0B1B3B] text-white/80">
                            <Film className="w-5 h-5" />
                          </div>
                        )}
                        <span className="absolute inset-0 bg-black/25 flex items-center justify-center">
                          {wRec?.watched ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Play className="w-4 h-4 text-white fill-current" />
                          )}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          L{lec.lectureNumber} · {subjectMap.get(lec.subjectId) ?? 'Subject'} ·{' '}
                          {lec.durationMinutes} min
                        </p>
                        <p className="font-display text-sm font-bold text-[#0B1B3B] dark:text-white mt-0.5 line-clamp-2">
                          {lec.title}
                        </p>
                        <p className="text-[11px] text-[#2563EB] dark:text-sky-400 mt-0.5">
                          {wRec?.watched
                            ? 'Completed'
                            : wRec?.lastPositionSeconds
                              ? `Resume at ${Math.floor(wRec.lastPositionSeconds / 60)}m`
                              : 'Ready to watch'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: WEEKLY STUDY SCHEDULE OVERVIEW */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-[#2563EB]" />
                Your Monday–Sunday Study Blocks
              </h2>
              <ReusableButton variant="secondary" size="sm" to="/">
                <Video className="w-4 h-4" />
                Customize Blocks on Home
              </ReusableButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {(progress.weeklySchedule ?? []).map((item) => (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 flex items-center justify-between gap-4 transition-colors ${
                    item.completed
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                      : 'bg-white dark:bg-[#111A2E] border-slate-200/90 dark:border-slate-800'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span className="font-mono text-[#2563EB] dark:text-sky-400">
                        {WEEK_DAY_LABELS[item.day]}
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">·</span>
                      <span className="text-[#F97316]">{item.subject}</span>
                      <span className="text-slate-300 dark:text-slate-700">·</span>
                      <span className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.timeSlot}
                      </span>
                    </div>
                    <h3 className="mt-1 font-display text-sm sm:text-base font-bold text-[#0B1B3B] dark:text-white">
                      {item.topic}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!item.completed) playSuccess();
                      else playClick();
                      toggleWeeklyTask(item.id);
                    }}
                    aria-pressed={item.completed}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors shrink-0 ${
                      item.completed
                        ? 'bg-[#10B981] text-white border-[#10B981]'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-[#2563EB]'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {item.completed ? 'Done' : 'Check Off'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </ResponsiveContainer>
    </PageLayout>
  );
}
