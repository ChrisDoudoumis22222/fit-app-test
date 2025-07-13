/*  pages/TrainerBookings.jsx – /trainer/bookings  (v3.4 – solid‑black, no gaps)
    ---------------------------------------------------------------------------
    • Forces solid‑black background on <html> and <body> (same trick as the
      ServicesMarketplacePage) so *no white strip* can ever appear.
    • Wrapper has `overflow-x-hidden`.
    • Nothing else changed: lazy side‑rail, responsive grid inside
      <TrainerBookings>, motion fade‑ins, etc.
*/

"use client";

import { lazy, Suspense, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "../AuthProvider";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient";

/* lazy components */
const TrainerMenu     = lazy(() => import("../components/TrainerMenu"));
const TrainerBookings = lazy(() => import("../components/TrainerBookings"));

/* tiny spinner */
function Spinner({ full = false }) {
  const cls = full
    ? "grid min-h-screen place-items-center bg-black"
    : "flex justify-center py-20";
  return (
    <div className={cls}>
      <Loader2 className="h-8 w-8 animate-spin text-indigo-300" />
    </div>
  );
}

export default function TrainerBookingsPage() {
  /* ─── global black background (prevents any white flashes) ─── */
  useEffect(() => {
    document.documentElement.classList.add("bg-black");
    document.body.classList.add("bg-black");
    return () => {
      document.documentElement.classList.remove("bg-black");
      document.body.classList.remove("bg-black");
    };
  }, []);

  /* auth */
  const { profile, loading } = useAuth();
  const authUserId = supabase.auth.getUser()?.data?.user?.id;
  const trainerId  = profile?.id ?? authUserId;

  /* guards */
  if (loading) return <Spinner full />;

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

  /* page */
  return (
    <>
      <title>Κρατήσεις Πελατών • TrainerHub</title>

      {/* dark wrapper; overflow‑x‑hidden prevents side scroll / white edge */}
      <div
        className="min-h-screen overflow-x-hidden
                   bg-black text-white
                   pt-14 lg:pt-0 lg:pl-[var(--side-w)]"
      >
        {/* side‑rail */}
        <Suspense fallback={<></>}>
          <TrainerMenu />
        </Suspense>

        {/* content */}
        <main className="mx-auto w-full max-w-none px-4 py-10">
          <motion.h1
            className="mb-10 text-2xl font-bold"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          >
            Κρατήσεις Πελατών
          </motion.h1>

          <Suspense fallback={<Spinner />}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.05 }}
            >
              <TrainerBookings trainerId={trainerId} />
            </motion.div>
          </Suspense>
        </main>
      </div>
    </>
  );
}
