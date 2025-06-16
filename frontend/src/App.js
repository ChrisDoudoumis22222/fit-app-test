/* eslint-disable react/prop-types */
"use client";

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthProvider, { useAuth } from "./AuthProvider";

/* pages */
import AuthPage from "./pages/AuthPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import UserDashboard from "./pages/UserDashboard";
import TrainerDashboard from "./pages/TrainerDashboard";
import TrainerServicesPage from "./pages/TrainerServicesPage";
import TrainerPostsPage from "./pages/TrainerPostsPage";
import AllPostsPage from "./pages/AllPostsPage";
import PostDetailPage from "./pages/PostDetailPage";
import TrainerPostsViewPage from "./pages/TrainerPostsViewPage";
import ServicesMarketplacePage from "./pages/ServicesMarketplacePage";
import ServiceDetailPage from "./pages/ServiceDetailPage";

/* ---------- layout that injects the rail-padding ---------- */
function Shell({ children }) {
  /*  4 px extra gap = the visual “GAP” you set in UserMenu.js  */
  return (
    <div className="pl-[calc(var(--side-w)+4px)] lg:pt-0 pt-14 transition-[padding]">
      {children}
    </div>
  );
}

/* ---------- Guard components ---------- */
function ProtectedRoute({ children, role }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-lg">
        Loading…
      </div>
    );
  }

  if (!session) return <Navigate to="/" replace />;
  if (role && profile?.role !== role) return <Navigate to="/" replace />;

  /* authenticated – wrap with Shell so every page has the left spacing */
  return <Shell>{children}</Shell>;
}

function PublicRoute({ children }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-lg">
        Loading…
      </div>
    );
  }

  if (session && profile) {
    return (
      <Navigate
        to={profile.role === "trainer" ? "/trainer" : "/user"}
        replace
      />
    );
  }

  return children;
}

/* ---------- App ---------- */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* public */}
          <Route
            path="/"
            element={
              <PublicRoute>
                <AuthPage />
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPasswordPage />
              </PublicRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <PublicRoute>
                <ResetPasswordPage />
              </PublicRoute>
            }
          />

          {/* user */}
          <Route
            path="/user"
            element={
              <ProtectedRoute role="user">
                <UserDashboard />
              </ProtectedRoute>
            }
          />

          {/* trainer */}
          <Route
            path="/trainer"
            element={
              <ProtectedRoute role="trainer">
                <TrainerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/services"
            element={
              <ProtectedRoute role="trainer">
                <TrainerServicesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/posts"
            element={
              <ProtectedRoute role="trainer">
                <TrainerPostsPage />
              </ProtectedRoute>
            }
          />

          {/* shared authenticated */}
          <Route
            path="/posts"
            element={
              <ProtectedRoute>
                <AllPostsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/post/:id"
            element={
              <ProtectedRoute>
                <PostDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer/:trainerId/posts"
            element={
              <ProtectedRoute>
                <TrainerPostsViewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/services"
            element={
              <ProtectedRoute>
                <ServicesMarketplacePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/service/:id"
            element={
              <ProtectedRoute>
                <ServiceDetailPage />
              </ProtectedRoute>
            }
          />

          {/* catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
