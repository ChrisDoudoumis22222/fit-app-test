/*  UserBookings.jsx – Glass-Dark list  v3.5
    ────────────────────────────────────────
    – 96-px avatar, glossy card
    – vivid amber “Σε αναμονή”
    – Shows “Αίτημα:”  &  “Αποδοχή:” timestamps
*/

"use client";

import { useEffect, useState } from "react";
import { Link }                from "react-router-dom";
import { supabase }            from "../supabaseClient";
import { useAuth }             from "../AuthProvider";

import {
  CalendarClock,
  User as UserIcon,
  AlertTriangle,
  CalendarPlus,
} from "lucide-react";

import { Card, CardContent } from "../components/ui/card";
import { Badge }             from "../components/ui/badge";
import { Button }            from "../components/ui/button";

/* Flip to false if RLS already scopes by user_id */
const FILTER_BY_USER = true;
const USER_COL       = "user_id";

export default function UserBookings() {
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [rows,    setRows]    = useState([]);

  /* ── fetch once on mount ─────────────────────────────────────── */
  useEffect(() => {
    if (!profile) return;

    (async () => {
      try {
        setLoading(true);
        setError("");

        let q = supabase
          .from("bookings")
          /* * expands to every column of bookings so we catch typos quickly.   */
          /* We still pull related trainer + slot via implicit joins.          */
          .select(`
            *,
            trainer:trainer_id ( id, full_name, avatar_url ),
            slot:slot_id       ( id, starts_at )
          `)
          .order("booking_date", { ascending: false });

        if (FILTER_BY_USER) q = q.eq(USER_COL, profile.id);

        const { data, error } = await q;
        if (error) throw error;

        setRows(data ?? []);
      } catch (e) {
        /* Dev → show full Supabase error, Prod → Greek fallback   */
        console.warn("UserBookings →", e);
        setError(
          import.meta.env?.DEV && e?.message
            ? `Σφάλμα: ${e.message}`
            : "Αποτυχία φόρτωσης κρατήσεων."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [profile]);

  /* ── loading / error / empty states ──────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 rounded-3xl bg-gray-800/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="flex items-center gap-2 text-red-400">
        <AlertTriangle className="h-6 w-6 shrink-0" /> {error}
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="relative overflow-hidden rounded-3xl border border-gray-800
                       bg-gradient-to-br from-gray-900/85 to-gray-900/70">
        <CardContent className="flex flex-col items-center gap-6 py-14 px-12 text-center">
          <CalendarPlus className="h-14 w-14 text-gray-400" />
          <p className="text-lg text-gray-300">Δεν έχετε κάνει καμία κράτηση ακόμη.</p>
          <Button asChild size="lg">
            <Link to="/services">Κάνε την πρώτη σου κράτηση</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  /* ── list of bookings ─────────────────────────────────────────── */
  return (
    <div className="space-y-9">
      {rows.map((b) => (
        <BookingCard key={b.id} {...b} />
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- */
function BookingCard({
  trainer,
  slot,
  status,
  booking_date,
  accepted_at,
}) {
  /* ---------- friendly timestamps ---------- */
  const format = (ts) =>
    ts
      ? new Date(ts).toLocaleString("el-GR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  const whenRequested = format(booking_date);
  const whenAccepted  = status === "confirmed" ? format(accepted_at) : null;
  const whenSession   = slot?.starts_at
    ? new Date(slot.starts_at).toLocaleString("el-GR", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  /* ---------- badge tones ---------- */
  const badgeClass = {
    confirmed : "bg-emerald-500/25 text-emerald-200",
    pending   : "bg-amber-400/25  text-amber-200",
    cancelled : "bg-rose-500/25   text-rose-200",
  }[status] ?? "bg-gray-600/25 text-gray-300";

  return (
    <Card
      className="relative overflow-hidden rounded-3xl border border-gray-800
                 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      style={{
        background:
          "linear-gradient(135deg,rgba(35,35,37,.92)0%,rgba(20,20,22,.92)100%)",
        backdropFilter: "blur(24px) saturate(170%)",
        WebkitBackdropFilter: "blur(24px) saturate(170%)",
      }}
    >
      {/* subtle outer ring & glow */}
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-white/6" />
      <div className="pointer-events-none absolute -top-16 -right-16 h-72 w-72 rounded-full bg-white/6 blur-3xl" />

      <CardContent className="relative flex flex-col sm:flex-row sm:items-center gap-8 p-10">
        {/* avatar */}
        {trainer?.avatar_url ? (
          <img
            src={trainer.avatar_url}
            alt="avatar"
            loading="lazy"
            className="h-24 w-24 rounded-full object-cover ring-2 ring-gray-900 shrink-0"
          />
        ) : (
          <div className="h-24 w-24 rounded-full bg-gray-700 grid place-items-center shrink-0">
            <UserIcon className="h-10 w-10 text-gray-400" />
          </div>
        )}

        {/* meta */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-2xl font-bold text-gray-100 truncate">
            {trainer?.full_name || "Trainer"}
          </p>
          {whenSession && <p className="text-lg text-gray-400">{whenSession}</p>}

          <div className="mt-3 space-y-1 text-sm text-gray-400">
            <p>
              <span className="inline-block w-24 text-gray-500">Αίτημα:</span>{" "}
              {whenRequested}
            </p>
            {whenAccepted && (
              <p>
                <span className="inline-block w-24 text-gray-500">Αποδοχή:</span>{" "}
                {whenAccepted}
              </p>
            )}
          </div>
        </div>

        {/* status badge */}
        <Badge
          className={`flex items-center gap-2 px-5 py-2 text-base capitalize ${badgeClass}`}
        >
          <CalendarClock className="h-5 w-5" />
          {status === "pending" ? "Σε αναμονή" : status}
        </Badge>
      </CardContent>
    </Card>
  );
}
