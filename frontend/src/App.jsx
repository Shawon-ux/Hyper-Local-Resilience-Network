import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import SafeStatusModulePage from './pages/SafeStatusModulePage.jsx';
import WeatherAlertsPage from './pages/WeatherAlertsPage.jsx';
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import SafeStatusModulePage from "./pages/SafeStatusModulePage.jsx";
import CreateTaskPage from "./pages/CreateTaskPage.jsx";
import MyTasksPage from "./pages/MyTasksPage.jsx";
import ResourcesPage from "./pages/ResourcesPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import CreateRequestPage from "./pages/CreateRequestPage.jsx";
import RequestsPage from "./pages/RequestsPage.jsx";
import MatchingPage from "./pages/MatchingPage.jsx";


const DashboardPage = () => (
  <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
    <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
    <p className="mt-4 text-gray-600">
      Welcome to your dashboard. Other modules and summaries can appear here.
    </p>
  </div>
);

const CommunityPage = () => (
  <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
    <h1 className="text-3xl font-bold text-gray-900">Community</h1>
    <p className="mt-4 text-gray-600">Find neighbors and resources near you.</p>
  </div>
);

function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tasks/new"
            element={
              <ProtectedRoute>
                <CreateTaskPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tasks/mine"
            element={
              <ProtectedRoute>
                <MyTasksPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/requests/new"
            element={
              <ProtectedRoute>
                <CreateRequestPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/requests"
            element={
              <ProtectedRoute>
                <RequestsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/matching"
            element={
              <ProtectedRoute>
                <MatchingPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/safe-status"
            element={
              <ProtectedRoute>
                <SafeStatusModulePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/weather-alerts"
            element={
              <ProtectedRoute>
                <WeatherAlertsPage />
            path="/resources"
            element={
              <ProtectedRoute>
                <ResourcesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/community"
            element={
              <ProtectedRoute>
                <CommunityPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>

      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} HyperLocal Resilience Network. All
            rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
