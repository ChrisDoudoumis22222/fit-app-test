/*  TrainerBookings.jsx – glass‑masonry list  v2.5 (UI refresh)
    ---------------------------------------------------------
    • Elevated glassmorphism cards with subtle motion
    • Soft shimmer skeletons while loading
    • Responsive masonry – 1 col on mobile / 2+ on md+
    • Accept / Decline modals (lazy‑loaded)
    • Preserves original colour palette
*/

"use client";

import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "../supabaseClient";
import {
  Loader2,
  User as UserIcon,
  AlertTriangle,
  CalendarClock,
  CheckCircle,
  Clock,
  Ban,
  CalendarX,
} from "lucide-react";
import { useAuth }   from "../AuthProvider";
import { Button }    from "./ui/button";
import { Badge }     from "./ui/badge";

/* lazy modals */
const AcceptModal  = lazy(() => import("./AcceptBookingModal"));
const DeclineModal = lazy(() => import("./DeclineBookingModal"));

/* util */
const Spinner = () => (
  <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
);

/* status → tone / icon map  */
const badgeTone = {
  confirmed: "bg-emerald-500/15 text-emerald-200",
  pending:   "bg-amber-400/15  text-amber-200",
  cancelled: "bg-rose-500/15   text-rose-200",
};
const badgeIcon = {
  confirmed: CheckCircle,
  pending:   Clock,
  cancelled: Ban,
};

/* ────────────────────────────────────────────────────────── */
export default function TrainerBookings({ trainerId }) {
  /* auth */
  const { profile } = useAuth();
  const trainer     = trainerId || profile?.id;

  /* state */
  const [rows,  setRows]  = useState([]);
  const [load,  setLoad]  = useState(true);
  const [error, setError] = useState("");

  /* fetch bookings once we know the trainer id */
  useEffect(() => {
    if (!trainer) return;
    fetchRows();
  }, [trainer]);

  async function fetchRows() {
    try {
      setLoad(true);
      setError("");

      /* 1) bookings */
      const { data: bookings, error: bErr } = await supabase
        .from("bookings")
        .select("*")
        .eq("trainer_id", trainer)
        .order("booking_date", { ascending: false });
      if (bErr) throw bErr;

      if (!bookings.length) { setRows([]); return; }

      /* 2) profiles */
      const ids = [...new Set(bookings.map((b) => b.user_id))];
      const { data: users, error: uErr } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", ids);
      if (uErr) throw uErr;

      const map = Object.fromEntries(users.map((u) => [u.id, u]));
      setRows(bookings.map((b) => ({ ...b, client: map[b.user_id] || null })));
    } catch (e) {
      console.error(e);
      setError(import.meta.env.DEV ? e.message : "Σφάλμα φόρτωσης.");
    } finally {
      setLoad(false);
    }
  }

  /* ---------- UI states ---------- */
  if (load) {
    /* shimmer skeleton cards */
    return (
      <div className="grid gap-8 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="relative h-44 overflow-hidden rounded-3xl bg-gray-700/40 sm:h-52"
          >
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-gray-600/40 to-transparent" />
          </div>
        ))}
        {/* shimmer keyframes (tailwind arbitrary) */}
        <style jsx>{`
          @keyframes shimmer {
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <p className="flex items-center gap-2 text-red-400">
        <AlertTriangle className="h-6 w-6" /> {error}
      </p>
    );
  }

  /* -------- empty state (full‑width panel) -------- */
  if (!rows.length) {
    return (
      <div
        className="flex min-h-[260px] w-full items-center justify-center rounded-3xl border border-white/10 bg-gradient-to-br from-[#1a1c21]/85 to-[#121417]/85 backdrop-blur-lg"
      >
        <div className="flex flex-col items-center gap-6">
          <CalendarX className="h-16 w-16 text-gray-500" />
          <p className="text-center text-lg leading-relaxed text-gray-300">
            Δεν υπάρχουν κρατήσεις ακόμη.
          </p>
        </div>
      </div>
    );
  }

  /* -------- masonry list -------- */
  return (
    <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((b) => (
        <BookingCard key={b.id} booking={b} refresh={fetchRows} />
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
function BookingCard({ booking, refresh }) {
  const {
    id,
    client,
    status,
    booking_date,
    accepted_at,
    slot_time,
  } = booking;

  /* helper – date formatter */
  const fmt = (ts, opts) =>
    ts
      ? new Date(ts).toLocaleString("el-GR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          ...opts,
        })
      : "—";

  const whenReq = fmt(booking_date);
  const whenAcc = status === "confirmed" ? fmt(accepted_at) : null;
  const session = slot_time ? fmt(slot_time, { weekday: "short" }) : null;

  /* badge */
  const Icon = badgeIcon[status] || CalendarClock;
  const tone = badgeTone[status] || "bg-gray-600/15 text-gray-300";

  /* dialogs */
  const [showAccept,  setAccept]  = useState(false);
  const [showDecline, setDecline] = useState(false);

  return (
    <>
      {/* card */}
      <div
        className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#28282a]/90 to-[#141416]/90 backdrop-blur-lg transition-transform duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl hover:ring-1 hover:ring-indigo-500/40"
      >
        {/* subtle inner ring */}
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-white/5" />

        <div className="flex flex-col gap-8 p-8 sm:flex-row sm:items-center">
          {/* avatar */}
          {client?.avatar_url ? (
            <img
              src={client.avatar_url}
              alt="avatar"
              loading="lazy"
              className="h-24 w-24 shrink-0 rounded-full object-cover ring-2 ring-indigo-500/40 group-hover:ring-indigo-400/60"
            />
          ) : (
            <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-gray-700">
              <UserIcon className="h-10 w-10 text-gray-400" />
            </div>
          )}

          {/* meta */}
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-2xl font-semibold text-gray-100">
              {client?.full_name || "Χρήστης"}
            </p>
            {session && (
              <p className="text-lg capitalize text-gray-400">{session}</p>
            )}

            <div className="mt-3 space-y-1 text-sm text-gray-400">
              <p>
                <span className="inline-block w-24 text-gray-500">Αίτημα:</span>{" "}
                {whenReq}
              </p>
              {whenAcc && (
                <p>
                  <span className="inline-block w-24 text-gray-500">Αποδοχή:</span>{" "}
                  {whenAcc}
                </p>
              )}
            </div>
          </div>

          {/* badge + actions */}
          <div className="flex shrink-0 flex-col items-end gap-3">
            <Badge className={`flex items-center gap-2 px-4 py-1.5 ${tone}`}>
              <Icon className="h-5 w-5" />
              {status === "confirmed"
                ? "Επιβεβαιωμένη"
                : status === "pending"
                ? "Σε αναμονή"
                : "Ακυρώθηκε"}
            </Badge>

            {status === "pending" && (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setAccept(true)}>
                  Αποδοχή
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setDecline(true)}
                >
                  Απόρριψη
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* dialogs */}
      {showAccept && (
        <Suspense fallback={null}>
          <AcceptModal
            bookingId={id}
            close={() => setAccept(false)}
            onDone={refresh}
          />
        </Suspense>
      )}
      {showDecline && (
        <Suspense fallback={null}>
          <DeclineModal
            bookingId={id}
            close={() => setDecline(false)}
            onDone={refresh}
          />
        </Suspense>
      )}
    </>
  );
}
