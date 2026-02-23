import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthProvider";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-zinc-400 text-sm">Φόρτωση…</div>
    </div>
  );
}

// Προαιρετικό: το card που δείχνεις ΜΟΝΟ όταν είμαστε σίγουροι ότι δεν υπάρχει user
function LoginRequiredCard() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-lg">
        <div className="text-sm font-medium text-zinc-900">
          Χρειάζεσαι σύνδεση για να συνεχίσεις.
        </div>
        <a
          href="/auth"
          className="inline-flex mt-4 items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Μετάβαση στη Σύνδεση
        </a>
      </div>
    </div>
  );
}

export default function RequireAuth({ children, role }) {
  const { ready, user, profile } = useAuth();
  const location = useLocation();

  
  if (!ready) return <LoadingScreen />;

  // ✅ Τώρα είμαστε σίγουροι
  if (!user) {


    // είτε δείξε το card σου (χωρίς flicker πια):
    return <LoginRequiredCard />;
  }

  // ✅ Optional role gate
  const resolvedRole = profile?.role ?? user?.user_metadata?.role ?? null;
  if (role && resolvedRole !== role) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  return children;
}