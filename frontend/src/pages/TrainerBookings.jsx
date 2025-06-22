/*  pages/TrainerBookings.jsx – /trainer/bookings (rev 2025-06-22)
    -----------------------------------------------------------------
    ◦  max-w-3xl column (matches dash)
    ◦  Framer-motion fade-in for headline & list
    ◦  Centred adaptive spinner (full page if first paint, inline later)
    ◦  a11y:   <title> + polite live-region for auth failures
*/

"use client";

import { lazy, Suspense }   from "react";
import { Loader2 }          from "lucide-react";
import { useAuth }          from "../AuthProvider";
import { motion }           from "framer-motion";

const TrainerMenu     = lazy(() => import("../components/TrainerMenu"));
const TrainerBookings = lazy(() => import("../components/TrainerBookings"));

/* shared spinner – receive `full` flag */
function Spinner({ full = false }) {
  const classes = full
    ? "grid min-h-screen place-items-center bg-black"
    : "flex justify-center py-20";
  return (
    <div className={classes}>
      <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
    </div>
  );
}

export default function TrainerBookingsPage() {
  const { profile, loading } = useAuth();

  /* -------- first-paint loading -------- */
  if (loading) return <Spinner full />;

  /* -------- guard: role -------- */
  if (!profile || profile.role !== "trainer") {
    return (
      <div
        role="alert"
        className="grid min-h-screen place-items-center bg-black text-white"
      >
        Unauthorized
      </div>
    );
  }

  /* -------- main markup -------- */
  return (
    <>
      {/* Document title for better history / a11y */}
      <title>Κρατήσεις Πελατών • TrainerHub</title>

      <div
        className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-700
                   text-white pt-14 lg:pt-0 lg:pl-[var(--side-w)]"
      >
        {/* side-rail */}
        <Suspense fallback={<></>}>
          <TrainerMenu />
        </Suspense>

        {/* column */}
        <main className="mx-auto w-full max-w-3xl px-4 py-10">
          {/* fade-in headline */}
          <motion.h1
            className="mb-10 text-2xl font-bold"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          >
            Κρατήσεις Πελατών
          </motion.h1>

          {/* list (or empty panel) */}
          <Suspense fallback={<Spinner />}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.05 }}
            >
              <TrainerBookings trainerId={profile.id} />
            </motion.div>
          </Suspense>
        </main>
      </div>
    </>
  );
}
