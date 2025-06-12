"use client"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import AuthProvider, { useAuth } from "./AuthProvider"

/* pages */
import AuthPage from "./pages/AuthPage"
import ForgotPasswordPage from "./pages/ForgotPasswordPage"
import ResetPasswordPage from "./pages/ResetPasswordPage"
import UserDashboard from "./pages/UserDashboard"
import TrainerDashboard from "./pages/TrainerDashboard"
import TrainerServicesPage from "./pages/TrainerServicesPage"
import TrainerPostsPage from "./pages/TrainerPostsPage"
import AllPostsPage from "./pages/AllPostsPage"
import PostDetailPage from "./pages/PostDetailPage"
import TrainerPostsViewPage from "./pages/TrainerPostsViewPage" // ✅ NEW import
import ServicesMarketplacePage from "./pages/ServicesMarketplacePage"
import ServiceDetailPage from "./pages/ServiceDetailPage"

/* ───────── Guard component ───────── */
function ProtectedRoute({ children, role }) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "1.1rem",
        }}
      >
        Loading…
      </div>
    )
  }

  if (!session) return <Navigate to="/" replace />
  if (role && profile?.role !== role) return <Navigate to="/" replace />
  return children
}

/* ───────── Public Route Guard ───────── */
function PublicRoute({ children }) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "1.1rem",
        }}
      >
        Loading…
      </div>
    )
  }

  // Redirect authenticated users to their dashboard
  if (session && profile) {
    if (profile.role === "trainer") {
      return <Navigate to="/trainer" replace />
    } else if (profile.role === "user") {
      return <Navigate to="/user" replace />
    }
  }

  return children
}

/* ───────── App ───────── */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ─── public routes ─── */}
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

          {/* ─── protected: user routes ─── */}
          <Route
            path="/user"
            element={
              <ProtectedRoute role="user">
                <UserDashboard />
              </ProtectedRoute>
            }
          />

          {/* ─── protected: trainer routes ─── */}
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

          {/* ─── protected: shared routes (all authenticated users) ─── */}
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

          {/* ─── catch all route ─── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
