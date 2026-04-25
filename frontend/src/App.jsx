import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import Navbar from './components/Navbar';
import { useAuth } from './context/AuthContext';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ResourcesPage from './pages/ResourcesPage';
import RequestsPage from './pages/RequestsPage';
import CreateRequestPage from './pages/CreateRequestPage';
import MatchingPage from './pages/MatchingPage';
import SafeStatusModulePage from './pages/SafeStatusModulePage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="text-sm font-semibold text-slate-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="text-sm font-semibold text-slate-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/safe-status" replace />;
  }

  return children;
}

function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="pt-0">{children}</div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />

        {/* Default route */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Navigate to="/safe-status" replace />
            </ProtectedRoute>
          }
        />

        {/* Main protected feature routes */}
        <Route
          path="/safe-status"
          element={
            <ProtectedRoute>
              <AppLayout>
                <SafeStatusModulePage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/resources"
          element={
            <ProtectedRoute>
              <AppLayout>
                <ResourcesPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/matching"
          element={
            <ProtectedRoute>
              <AppLayout>
                <MatchingPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/requests"
          element={
            <ProtectedRoute>
              <AppLayout>
                <RequestsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/requests/new"
          element={
            <ProtectedRoute>
              <AppLayout>
                <CreateRequestPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Old/alternate route redirects */}
        <Route path="/help-center" element={<Navigate to="/requests" replace />} />
        <Route path="/safe" element={<Navigate to="/safe-status" replace />} />
        <Route path="/resource" element={<Navigate to="/resources" replace />} />
        <Route path="/match" element={<Navigate to="/matching" replace />} />

        {/* 404 fallback */}
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <AppLayout>
                <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
                  <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
                    <h1 className="text-3xl font-bold text-slate-900">
                      Page not found
                    </h1>
                    <p className="mt-3 text-sm text-slate-500">
                      The page you are looking for does not exist.
                    </p>
                    <a
                      href="/safe-status"
                      className="mt-6 inline-flex rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      Go to Safe Status
                    </a>
                  </div>
                </div>
              </AppLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}