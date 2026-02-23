// FILE: src/App.js
/* eslint-disable react/prop-types */
import React, { Suspense, lazy, Fragment } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import AuthProvider, { useAuth } from "./AuthProvider";

/* ---------------- lazy pages ---------------- */
const AuthPage = lazy(() => import("./pages/AuthPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));
const TrainerDashboard = lazy(() => import("./pages/TrainerDashboard"));
const TrainerServicesPage = lazy(() => import("./pages/TrainerServicesPage"));
const TrainerPostsPage = lazy(() => import("./pages/TrainerPostsPage"));
const AllPostsPage = lazy(() => import("./pages/AllPostsPage"));
const PostDetailPage = lazy(() => import("./pages/PostDetailPage"));
const TrainerPostsViewPage = lazy(() => import("./pages/TrainerPostsViewPage"));
const ServicesMarketplacePage = lazy(() => import("./pages/ServicesMarketplacePage"));
const ServiceDetailPage = lazy(() => import("./pages/ServiceDetailPage"));
const TrainerBookingsPage = lazy(() => import("./pages/TrainerBookings"));
const TrainerPaymentsPage = lazy(() => import("./pages/PaymentScreen"));
const EpicGoalsPage = lazy(() => import("./pages/EpicGoalsPage"));
const TrainerSchedulePage = lazy(() => import("./pages/TrainerSchedulePage"));
const UserFAQPage = lazy(() => import("./pages/UserFAQPage"));
const UserLikesPage = lazy(() => import("./pages/UserLikesPage"));
const TrainerLikesPage = lazy(() => import("./pages/TrainerLikesPage"));
const UserBookingsPage = lazy(() => import("./pages/UserBookingsPage"));
const TrainersMarketplacePage = lazy(() => import("./pages/ServicesMarketplacePage"));
const TrainerDetailPage = lazy(() => import("./pages/TrainerDetailPage"));
const TrainerFAQPage = lazy(() => import("./pages/TrainerFAQPage"));

const Loading = () => (
  <div className="flex h-screen items-center justify-center text-lg">Loading…</div>
);

function Shell({ children }) {
  return (
    <div className="pl-[calc(var(--side-w)+4px)] lg:pt-0 pt-14 transition-[padding]">
      {children}
    </div>
  );
}

function AuthPopup({
  message,
  actionTo = "/",
  actionLabel = "Μετάβαση στη Σύνδεση",
}) {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white text-black p-6 rounded shadow-xl max-w-sm w-[92%] text-center space-y-4">
        <p className="font-semibold">{message || "Χρειάζεσαι σύνδεση για να συνεχίσεις."}</p>
        <button
          type="button"
          onClick={() => navigate(actionTo, { replace: true })}
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

function PublicRoute({ children }) {
  return <Fragment>{children}</Fragment>;
}

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();

  // ✅ prevents “popup for a split second”
  if (loading) return <Loading />;

  if (!session) return <AuthPopup />;

  return <Shell>{children}</Shell>;
}

function TrainerScheduleWrapper() {
  const { session, loading, profile, profileLoaded } = useAuth();

  if (loading) return <Loading />;
  if (!session) return <AuthPopup />;

  if (!profileLoaded) {
    return (
      <Shell>
        <div className="p-6">Έλεγχος ρόλου…</div>
      </Shell>
    );
  }

  if (!profile) {
    return (
      <Shell>
        <div className="p-6">Ολοκληρώνουμε τον λογαριασμό σου…</div>
      </Shell>
    );
  }

  if (profile.role !== "trainer") {
    return (
      <AuthPopup
        message="Δεν έχεις πρόσβαση στη σελίδα προγράμματος γυμναστή."
        actionTo="/user"
        actionLabel="Μετάβαση στο Προφίλ"
      />
    );
  }

  return (
    <Shell>
      <TrainerSchedulePage />
    </Shell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            {/* public */}
            <Route path="/" element={<PublicRoute><AuthPage /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
            <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
            <Route path="/faq" element={<PublicRoute><TrainerFAQPage /></PublicRoute>} />
            <Route path="/faq/users" element={<PublicRoute><UserFAQPage /></PublicRoute>} />

            {/* user protected */}
            <Route path="/user" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
            <Route path="/user/bookings" element={<ProtectedRoute><UserBookingsPage /></ProtectedRoute>} />
            <Route path="/user/likes" element={<ProtectedRoute><UserLikesPage /></ProtectedRoute>} />
            <Route path="/userlikes" element={<ProtectedRoute><UserLikesPage /></ProtectedRoute>} />
            <Route path="/goals" element={<ProtectedRoute><EpicGoalsPage /></ProtectedRoute>} />

            {/* trainer protected */}
            <Route path="/trainer" element={<ProtectedRoute><TrainerDashboard /></ProtectedRoute>} />
            <Route path="/trainer/services" element={<ProtectedRoute><TrainerServicesPage /></ProtectedRoute>} />
            <Route path="/trainer/posts" element={<ProtectedRoute><TrainerPostsPage /></ProtectedRoute>} />
            <Route path="/trainer/bookings" element={<ProtectedRoute><TrainerBookingsPage /></ProtectedRoute>} />
            <Route path="/trainer/payments" element={<ProtectedRoute><TrainerPaymentsPage /></ProtectedRoute>} />
            <Route path="/trainer/schedule" element={<TrainerScheduleWrapper />} />
            <Route path="/trainer/likes" element={<ProtectedRoute><TrainerLikesPage /></ProtectedRoute>} />

            {/* shared protected */}
            <Route path="/posts" element={<ProtectedRoute><AllPostsPage /></ProtectedRoute>} />
            <Route path="/post/:id" element={<ProtectedRoute><PostDetailPage /></ProtectedRoute>} />
            <Route path="/trainer/:trainerId/posts" element={<ProtectedRoute><TrainerPostsViewPage /></ProtectedRoute>} />

            {/* public marketplace */}
            <Route path="/services" element={<PublicRoute><ServicesMarketplacePage /></PublicRoute>} />
            <Route path="/service/:id" element={<PublicRoute><ServiceDetailPage /></PublicRoute>} />
            <Route path="/trainers" element={<PublicRoute><TrainersMarketplacePage /></PublicRoute>} />
            <Route path="/trainer/:trainerId" element={<PublicRoute><TrainerDetailPage /></PublicRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}