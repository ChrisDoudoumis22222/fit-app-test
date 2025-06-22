/*  App.jsx – router with lazy-loaded pages (+ /trainer/payments) */
/* -------------------------------------------------------------- */

"use client";
/* eslint-disable react/prop-types */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import AuthProvider, { useAuth } from "./AuthProvider";

/* ---------------- lazy pages ---------------- */
const AuthPage               = lazy(() => import("./pages/AuthPage"));
const ForgotPasswordPage     = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage      = lazy(() => import("./pages/ResetPasswordPage"));
const UserDashboard          = lazy(() => import("./pages/UserDashboard"));
const TrainerDashboard       = lazy(() => import("./pages/TrainerDashboard"));
const TrainerServicesPage    = lazy(() => import("./pages/TrainerServicesPage"));
const TrainerPostsPage       = lazy(() => import("./pages/TrainerPostsPage"));
const AllPostsPage           = lazy(() => import("./pages/AllPostsPage"));
const PostDetailPage         = lazy(() => import("./pages/PostDetailPage"));
const TrainerPostsViewPage   = lazy(() => import("./pages/TrainerPostsViewPage"));
const ServicesMarketplacePage= lazy(() => import("./pages/ServicesMarketplacePage"));
const ServiceDetailPage      = lazy(() => import("./pages/ServiceDetailPage"));
const TrainerBookingsPage    = lazy(() => import("./pages/TrainerBookings"));
const TrainerPaymentsPage    = lazy(() => import("./pages/PaymentScreen")); /* NEW */

/* fallback spinner */
const Loading = () => (
  <div className="flex h-screen items-center justify-center text-lg">
    Loading…
  </div>
);

/* -------- layout padding -------- */
function Shell({ children }) {
  return (
    <div className="pl-[calc(var(--side-w)+4px)] lg:pt-0 pt-14 transition-[padding]">
      {children}
    </div>
  );
}

/* -------- Guards -------- */
function ProtectedRoute({ children, role }) {
  const { session, profile, loading } = useAuth();
  if (loading) return <Loading />;

  if (!session) return <Navigate to="/" replace />;
  if (role && profile?.role !== role) return <Navigate to="/" replace />;

  return <Shell>{children}</Shell>;
}

function PublicRoute({ children }) {
  const { session, profile, loading } = useAuth();
  if (loading) return <Loading />;

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

/* -------- App -------- */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            {/* ---------- public ---------- */}
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

            {/* ---------- user ---------- */}
            <Route
              path="/user"
              element={
                <ProtectedRoute role="user">
                  <UserDashboard />
                </ProtectedRoute>
              }
            />

            {/* ---------- trainer ---------- */}
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
            <Route
              path="/trainer/bookings"
              element={
                <ProtectedRoute role="trainer">
                  <TrainerBookingsPage />
                </ProtectedRoute>
              }
            />
            {/* NEW payments page */}
            <Route
              path="/trainer/payments"
              element={
                <ProtectedRoute role="trainer">
                  <TrainerPaymentsPage />
                </ProtectedRoute>
              }
            />

            {/* ---------- shared authenticated ---------- */}
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
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
