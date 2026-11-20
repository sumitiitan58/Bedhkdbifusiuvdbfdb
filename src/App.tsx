import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingScreen } from './components/LoadingScreen';
import { ThemeProvider } from './context/ThemeProvider';
import { AuthProvider } from './context/AuthContext';
import { PlatformDataProvider } from './context/PlatformDataContext';

const HomePage = lazy(() => import('./pages/HomePage'));
const MaterialsPage = lazy(() => import('./pages/MaterialsPage'));
const LecturesPage = lazy(() => import('./pages/LecturesPage'));
const CbtMocksPage = lazy(() => import('./pages/CbtMocksPage'));
const DppPage = lazy(() => import('./pages/DppPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <PlatformDataProvider>
            <BrowserRouter>
              <Suspense fallback={<LoadingScreen fullScreen message="Loading PREPSKM.IN workspace..." />}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/materials" element={<MaterialsPage />} />
                  <Route path="/lectures" element={<LecturesPage />} />
                  <Route path="/cbt-mocks" element={<CbtMocksPage />} />
                  <Route path="/dpp" element={<DppPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </PlatformDataProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
