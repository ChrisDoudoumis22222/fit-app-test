// FILE: src/App.js
"use client";
/* eslint-disable react/prop-types */
import React, { Suspense, lazy, Fragment, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthProvider, { useAuth } from "./AuthProvider";

/* ---------------- lazy pages ---------------- */
const AuthPage                 = lazy(() => import("./pages/AuthPage"));
const ForgotPasswordPage      = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage       = lazy(() => import("./pages/ResetPasswordPage"));
const UserDashboard           = lazy(() => import("./pages/UserDashboard"));
const TrainerDashboard        = lazy(() => import("./pages/TrainerDashboard"));
const TrainerServicesPage     = lazy(() => import("./pages/TrainerServicesPage"));
const TrainerPostsPage        = lazy(() => import("./pages/TrainerPostsPage"));
const AllPostsPage            = lazy(() => import("./pages/AllPostsPage"));
const PostDetailPage          = lazy(() => import("./pages/PostDetailPage"));
const TrainerPostsViewPage    = lazy(() => import("./pages/TrainerPostsViewPage"));
const ServicesMarketplacePage = lazy(() => import("./pages/ServicesMarketplacePage"));
const ServiceDetailPage       = lazy(() => import("./pages/ServiceDetailPage"));
const TrainerBookingsPage     = lazy(() => import("./pages/TrainerBookings"));
const TrainerPaymentsPage     = lazy(() => import("./pages/PaymentScreen"));
const EpicGoalsPage           = lazy(() => import("./pages/EpicGoalsPage"));
const TrainerSchedulePage     = lazy(() => import("./pages/TrainerSchedulePage"));
const UserFAQPage             = lazy(() => import("./pages/UserFAQPage")); // <-- fixed
const UserLikesPage           = lazy(() => import("./pages/UserLikesPage")); // <-- NEW

/* ───────── NEW: users bookings page ───────── */
const UserBookingsPage        = lazy(() => import("./pages/UserBookingsPage"));

/* ───────── NEW: trainers marketplace + trainer detail ───────── */
const TrainersMarketplacePage = lazy(() => import("./pages/ServicesMarketplacePage"));
const TrainerDetailPage       = lazy(() => import("./pages/TrainerDetailPage"));

/* ───────── NEW: Trainer FAQ (public) ───────── */
const TrainerFAQPage          = lazy(() => import("./pages/TrainerFAQPage"));

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

/* -------- small auth popup -------- */
function AuthPopup({ message, actionHref = "/", actionLabel = "Μετάβαση στη Σύνδεση" }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white text-black p-6 rounded shadow-xl max-w-sm w-[92%] text-center space-y-4">
        <p className="font-semibold">
          {message || "Χρειάζεσαι σύνδεση για να συνεχίσεις."}
        </p>
        <a href={actionHref} className="inline-block bg-blue-600 text-white px-4 py-2 rounded">
          {actionLabel}
        </a>
      </div>
    </div>
  );
}

/* -------- public wrapper (no-op) -------- */
function PublicRoute({ children }) {
  return <Fragment>{children}</Fragment>;
}

/* -------- protected (light-pass) -------- */
function ProtectedRoute({ children }) {
  const { session } = useAuth();
  const [showPopup] = useState(!session); // show once on first paint if not authed

  if (!session) {
    return <>{showPopup && <AuthPopup />}</>;
  }
  return <Shell>{children}</Shell>;
}

/* -------- trainer schedule wrapper (role gate + light-pass) -------- */
function TrainerScheduleWrapper() {
  const { session, profile, profileLoaded } = useAuth();

  // 1) Not logged in: show light-pass login popup (no redirect).
  if (!session) {
    return <AuthPopup />;
  }

  // 2) Waiting for profile load — avoid flicker / double popups.
  if (!profileLoaded) {
    return <p className="p-6">Έλεγχος ρόλου…</p>;
  }

  // 3) If session exists but profile is null:
  if (!profile) {
    return <Shell><div /></Shell>;
  }

  // 4) If profile exists but role is not trainer: show light-pass no-access popup.
  if (profile.role !== "trainer") {
    return (
      <>
        <AuthPopup message="Δεν έχεις πρόσβαση στη σελίδα προγράμματος γυμναστή." actionHref="/user" actionLabel="Μετάβαση στο Προφίλ" />
      </>
    );
  }

  // 5) Authorized trainer:
  return (
    <Shell>
      <TrainerSchedulePage />
    </Shell>
  );
}

/* -------- App -------- */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            {/* ---------- public ---------- */}
            <Route path="/" element={<PublicRoute><AuthPage /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
            <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
            {/* NEW: public Trainer FAQ */}
            <Route path="/faq" element={<PublicRoute><TrainerFAQPage /></PublicRoute>} />
            {/* NEW: public User FAQ (optional) */}
            <Route path="/faq/users" element={<PublicRoute><UserFAQPage /></PublicRoute>} />

            {/* ---------- user (auth required, light-pass popup if not) ---------- */}
            <Route path="/user" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
            <Route path="/user/bookings" element={<ProtectedRoute><UserBookingsPage /></ProtectedRoute>} />
            <Route path="/user/likes" element={<ProtectedRoute><UserLikesPage /></ProtectedRoute>} /> {/* NEW */}
            <Route path="/goals" element={<ProtectedRoute><EpicGoalsPage /></ProtectedRoute>} />

            {/* ---------- trainer (auth required; these remain simple protected) ---------- */}
            <Route path="/trainer" element={<ProtectedRoute><TrainerDashboard /></ProtectedRoute>} />
            <Route path="/trainer/services" element={<ProtectedRoute><TrainerServicesPage /></ProtectedRoute>} />
            <Route path="/trainer/posts" element={<ProtectedRoute><TrainerPostsPage /></ProtectedRoute>} />
            <Route path="/trainer/bookings" element={<ProtectedRoute><TrainerBookingsPage /></ProtectedRoute>} />
            <Route path="/trainer/payments" element={<ProtectedRoute><TrainerPaymentsPage /></ProtectedRoute>} />

            {/* ---------- trainer schedule (role-gated light-pass) ---------- */}
            <Route path="/trainer/schedule" element={<TrainerScheduleWrapper />} />

            {/* ---------- shared (auth required) ---------- */}
            <Route path="/posts" element={<ProtectedRoute><AllPostsPage /></ProtectedRoute>} />
            <Route path="/post/:id" element={<ProtectedRoute><PostDetailPage /></ProtectedRoute>} />
            <Route path="/trainer/:trainerId/posts" element={<ProtectedRoute><TrainerPostsViewPage /></ProtectedRoute>} />
            <Route path="/services" element={<ProtectedRoute><ServicesMarketplacePage /></ProtectedRoute>} />
            <Route path="/service/:id" element={<ProtectedRoute><ServiceDetailPage /></ProtectedRoute>} />

            {/* ───────── NEW: trainers marketplace + trainer detail (auth required) ───────── */}
            <Route path="/trainers" element={<ProtectedRoute><TrainersMarketplacePage /></ProtectedRoute>} />
            {/* NOTE: Your cards navigate to `/trainer/${trainer.id}`. This route will match that */}
            <Route path="/trainer/:trainerId" element={<ProtectedRoute><TrainerDetailPage /></ProtectedRoute>} />

            {/* catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
