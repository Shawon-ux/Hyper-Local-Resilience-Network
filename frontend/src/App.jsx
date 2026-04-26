import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import NotificationListener from "./components/NotificationListener";
import EmergencyBanner from "./components/EmergencyBanner";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages from both branches - ALL imports
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import SafeStatusModulePage from "./pages/SafeStatusModulePage.jsx";

// Community pages (sadia-final-plus)
import MyCommunityPage from "./pages/MyCommunityPage.jsx";
import CommunityPage from "./pages/CommunityPage.jsx";
import CommunityJoinPage from "./pages/CommunityJoinPage.jsx";
import CommunityDetailPage from "./pages/CommunityDetailPage.jsx";

// Task pages (main)
import CreateTaskPage from "./pages/CreateTaskPage.jsx";
import MyTasksPage from "./pages/MyTasksPage.jsx";
import AvailableTasksPage from "./pages/AvailableTasksPage.jsx";
import CompletedTasksPage from "./pages/CompletedTasksPage.jsx";

// Weather & Alerts (main)
import WeatherAlertsPage from "./pages/WeatherAlertsPage.jsx";

// Resources & Notifications (main)
import ResourcesPage from "./pages/ResourcesPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";

// Requests & Matching (main)
import CreateRequestPage from "./pages/CreateRequestPage.jsx";
import RequestsPage from "./pages/RequestsPage.jsx";
import MatchingPage from "./pages/MatchingPage.jsx";

// Reputation (main)
import ReputationProfilePage from "./pages/ReputationProfilePage.jsx";

// Inline Pages - removed unused DashboardPage

function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <NotificationListener />
      <EmergencyBanner />

      <main className="flex-grow">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Profile & Reputation */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reputation/:userId"
            element={
              <ProtectedRoute>
                <ReputationProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Safe Status (sadia-final-plus) */}
          <Route
            path="/safe-status"
            element={
              <ProtectedRoute>
                <SafeStatusModulePage />
              </ProtectedRoute>
            }
          />

          {/* Crisis & Weather Alerts (main) */}
          <Route
            path="/crisis-center"
            element={
              <ProtectedRoute>
                <WeatherAlertsPage mode="crisis-center" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/weather-alerts"
            element={
              <ProtectedRoute>
                <WeatherAlertsPage mode="alerts" />
              </ProtectedRoute>
            }
          />

          {/* Tasks (main) */}
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
            path="/tasks/available"
            element={
              <ProtectedRoute>
                <AvailableTasksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks/completed"
            element={
              <ProtectedRoute>
                <CompletedTasksPage />
              </ProtectedRoute>
            }
          />

          {/* Requests (main) */}
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

          {/* Matching (main) */}
          <Route
            path="/matching"
            element={
              <ProtectedRoute>
                <MatchingPage />
              </ProtectedRoute>
            }
          />

          {/* Resources (main) */}
          <Route
            path="/resources"
            element={
              <ProtectedRoute>
                <ResourcesPage />
              </ProtectedRoute>
            }
          />

          {/* Notifications (main) */}
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />

          {/* Community Routes (sadia-final-plus) */}
          <Route
            path="/community"
            element={
              <ProtectedRoute>
                <CommunityPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community/:communityId"
            element={
              <ProtectedRoute>
                <CommunityDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-community"
            element={
              <ProtectedRoute>
                <MyCommunityPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community-join/:communityId"
            element={
              <ProtectedRoute>
                <CommunityJoinPage />
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
