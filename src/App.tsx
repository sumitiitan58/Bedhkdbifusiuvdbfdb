import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingScreen } from './components/LoadingScreen';
import { ThemeProvider } from './context/ThemeProvider';
import { AuthProvider } from './context/AuthContext';
import { DownloadGateProvider } from './context/DownloadGateContext';
import { PlatformDataProvider } from './context/PlatformDataContext';
import { DownloadGateModal } from './components/monetization/DownloadGateModal';
import { PrepsAiFloatingOrb } from './components/ai/PrepsAiFloatingOrb';

const HomePage = lazy(() => import('./pages/HomePage'));
const MaterialsPage = lazy(() => import('./pages/MaterialsPage'));
const MaterialDetailPage = lazy(() => import('./pages/MaterialDetailPage'));
const LecturesPage = lazy(() => import('./pages/LecturesPage'));
const CbtMocksPage = lazy(() => import('./pages/CbtMocksPage'));
const CbtMockDetailPage = lazy(() => import('./pages/CbtMockDetailPage'));
const DppPage = lazy(() => import('./pages/DppPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const MistakeNotebookPage = lazy(() => import('./pages/MistakeNotebookPage'));
const PrepsAiPage = lazy(() => import('./pages/PrepsAiPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <DownloadGateProvider>
            <PlatformDataProvider>
              <BrowserRouter>
                <Suspense fallback={<LoadingScreen fullScreen message="Loading PREPSKM.IN workspace..." />}>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/materials" element={<MaterialsPage />} />
                    <Route
                      path="/materials/:classSlug/:subjectSlug/:chapterSlug"
                      element={<MaterialDetailPage />}
                    />
                    <Route path="/materials/:slug" element={<MaterialDetailPage />} />
                    <Route path="/pyqs/:slug" element={<MaterialDetailPage />} />
                    <Route path="/lectures" element={<LecturesPage />} />
                    <Route path="/cbt-mocks" element={<CbtMocksPage />} />
                    <Route path="/cbt-mocks/:examSlug/:testSlug" element={<CbtMockDetailPage />} />
                    <Route path="/cbt-mocks/:slug" element={<CbtMockDetailPage />} />
                    <Route path="/dpp" element={<DppPage />} />
                    <Route path="/dpp/:classSlug/:chapterSlug" element={<CbtMockDetailPage />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/mistakes" element={<MistakeNotebookPage />} />
                    <Route path="/preps-ai" element={<PrepsAiPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Suspense>
                <DownloadGateModal />
                <PrepsAiFloatingOrb />
              </BrowserRouter>
            </PlatformDataProvider>
          </DownloadGateProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
