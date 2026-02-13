import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import AdminPanel from "./pages/AdminPanel";
import Dashboard from "./pages/Dashboard.jsx";
import MarketAnalyzer from "./pages/MarketAnalyzer.jsx";
import MarketOverview from "./pages/MarketOverview.jsx";
import Watchlist from "./pages/Watchlist.jsx";
// import StressMonitor from "./pages/StressMonitor.jsx"; // removed
import Profile from "./pages/Profile.jsx";
import Settings from "./pages/Settings";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import { ThemeProvider } from "./contexts/ThemeContext.jsx";
import { DataProvider } from "./contexts/DataContext.jsx";

// 1. Loading Wrapper
function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-gray-400">
        <LoaderSpinner />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// Helper for loading state
const LoaderSpinner = () => (
  <div className="flex flex-col items-center gap-4">
    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    <span className="text-sm font-medium">Loading application...</span>
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes (Wrapped in MainLayout) */}
            <Route
              path="/"
              element={
                <RequireAuth>
                  <MainLayout />
                </RequireAuth>
              }
            >
              {/* Default Redirect */}
              <Route index element={<Navigate to="/dashboard" replace />} />

              {/* Core Pages */}
              <Route path="admin" element={<AdminPanel />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="market" element={<MarketAnalyzer />} />
              <Route path="market-overview" element={<MarketOverview />} />
              <Route path="watchlist" element={<Watchlist />} />
              {/* <Route path="stress" element={<StressMonitor />} /> */}
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />

              {/* Fallback for unknown routes inside App */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>

            {/* Fallback for unknown routes outside App */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
