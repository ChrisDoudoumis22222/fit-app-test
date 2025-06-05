import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthProvider, { useAuth } from "./AuthProvider";

import AuthPage from "./pages/AuthPage";
import UserDashboard from "./pages/UserDashboard";
import TrainerDashboard from "./pages/TrainerDashboard";
import TrainerServicesPage from "./pages/TrainerServicesPage";
import ServicesMarketplacePage from "./pages/ServicesMarketplacePage";

/* Guard component */
function ProtectedRoute({ children, role }) {
  const { session, profile, loading } = useAuth();
  if (loading)          return <p>Loading…</p>;
  if (!session)         return <Navigate to="/" />;
  if (role && profile?.role !== role) return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* public */}
          <Route path="/" element={<AuthPage />} />

          {/* user-only dashboard */}
          <Route
            path="/user"
            element={
              <ProtectedRoute role="user">
                <UserDashboard />
              </ProtectedRoute>
            }
          />

          {/* trainer-only dashboard */}
          <Route
            path="/trainer"
            element={
              <ProtectedRoute role="trainer">
                <TrainerDashboard />
              </ProtectedRoute>
            }
          />

          {/* trainer-only services CRUD */}
          <Route
            path="/trainer/services"
            element={
              <ProtectedRoute role="trainer">
                <TrainerServicesPage />
              </ProtectedRoute>
            }
          />

          {/* marketplace – any logged-in user */}
          <Route
            path="/services"
            element={
              <ProtectedRoute>
                <ServicesMarketplacePage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
