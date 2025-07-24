/*  App.jsx – NO AUTH version (everything is public, incl. /goals) */
/* ---------------------------------------------------------------- */

"use client";
/* eslint-disable react/prop-types */
import React, { Suspense, lazy, Fragment } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthProvider from "./AuthProvider";

/* ---------------- lazy pages ---------------- */
const AuthPage                 = lazy(() => import("./pages/AuthPage"));
const ForgotPasswordPage       = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage        = lazy(() => import("./pages/ResetPasswordPage"));
const UserDashboard            = lazy(() => import("./pages/UserDashboard"));
const TrainerDashboard         = lazy(() => import("./pages/TrainerDashboard"));
const TrainerServicesPage      = lazy(() => import("./pages/TrainerServicesPage"));
const TrainerPostsPage         = lazy(() => import("./pages/TrainerPostsPage"));
const AllPostsPage             = lazy(() => import("./pages/AllPostsPage"));
const PostDetailPage           = lazy(() => import("./pages/PostDetailPage"));
const TrainerPostsViewPage     = lazy(() => import("./pages/TrainerPostsViewPage"));
const ServicesMarketplacePage  = lazy(() => import("./pages/ServicesMarketplacePage"));
const ServiceDetailPage        = lazy(() => import("./pages/ServiceDetailPage"));
const TrainerBookingsPage      = lazy(() => import("./pages/TrainerBookings"));
const TrainerPaymentsPage      = lazy(() => import("./pages/PaymentScreen"));
const EpicGoalsPage            = lazy(() => import("./pages/EpicGoalsPage"));

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

/* Dummy “guards” – they do nothing now */
function ProtectedRoute({ children }) {
  return <Shell>{children}</Shell>;
}
function PublicRoute({ children }) {
  return <Fragment>{children}</Fragment>;
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

            {/* ---------- user (now public) ---------- */}
            <Route
              path="/user"
              element={
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/goals"
              element={
                <ProtectedRoute>
                  <EpicGoalsPage />
                </ProtectedRoute>
              }
            />

            {/* ---------- trainer (also public) ---------- */}
            <Route
              path="/trainer"
              element={
                <ProtectedRoute>
                  <TrainerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trainer/services"
              element={
                <ProtectedRoute>
                  <TrainerServicesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trainer/posts"
              element={
                <ProtectedRoute>
                  <TrainerPostsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trainer/bookings"
              element={
                <ProtectedRoute>
                  <TrainerBookingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trainer/payments"
              element={
                <ProtectedRoute>
                  <TrainerPaymentsPage />
                </ProtectedRoute>
              }
            />

            {/* ---------- shared pages (public) ---------- */}
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
