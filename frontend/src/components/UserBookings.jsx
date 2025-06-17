/*  UserBookings.jsx – Glass-Dark (monochrome) v3.3
    ------------------------------------------------
    • Read-only list for the signed-in user
    • “Pending” → «Σε αναμονή»
    • All accents converted to greyscale
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

/* ── tweak if you rely on RLS only ─────────────────────────────── */
const HAS_EXPLICIT_COLUMN = true;
const USER_COL            = "user_id";
/* ─────────────────────────────────────────────────────────────── */

export default function UserBookings() {
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [rows,    setRows]    = useState([]);

  /** Fetch user’s bookings once */
  useEffect(() => {
    (async () => {
      if (!profile) return;

      try {
        setLoading(true);
        setError("");

        let q = supabase
          .from("bookings")
          .select(`
            id,
            booking_date,
            status,
            slot:slot_id ( id, starts_at ),
            trainer:trainer_id ( id, full_name, avatar_url )
          `)
          .order("booking_date", { ascending: false });

        if (HAS_EXPLICIT_COLUMN) q = q.eq(USER_COL, profile.id);

        const { data, error } = await q;
        if (error) throw error;
        setRows(data ?? []);
      } catch (err) {
        console.warn("UserBookings →", err);
        setError("Αποτυχία φόρτωσης κρατήσεων.");
      } finally {
        setLoading(false);
      }
    })();
  }, [profile]);

  /* ── Loading skeleton ───────────────────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 w-full rounded-xl bg-gray-800/40 animate-pulse" />
        ))}
      </div>
    );
  }

  /* ── Error banner ──────────────────────────────────────────── */
  if (error) {
    return (
      <p className="flex items-center gap-2 text-red-400">
        <AlertTriangle className="h-5 w-5" /> {error}
      </p>
    );
  }

  /* ── Empty state ───────────────────────────────────────────── */
  if (rows.length === 0) {
    return (
      <Card className="border border-gray-800 bg-gradient-to-br from-black/80 to-black/60">
        <CardContent className="flex flex-col items-center gap-5 p-8 text-center">
          <CalendarPlus className="h-10 w-10 text-gray-400" />
          <p className="text-gray-300">Δεν έχετε κάνει καμία κράτηση ακόμη.</p>
          <Button asChild variant="secondary">
            <Link to="/services">Κάνε την πρώτη σου κράτηση</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  /* ── Booking list ──────────────────────────────────────────── */
  return (
    <div className="space-y-5">
      {rows.map((b) => (
        <BookingItem key={b.id} row={b} />
      ))}
    </div>
  );
}

/* ---------- Single Booking Card -------------------------------- */
function BookingItem({ row }) {
  const { trainer, slot, booking_date, status } = row;
  const when = slot?.starts_at || booking_date;

  /* greyscale badge palette + Greek label */
  const statusInfo = {
    confirmed : { tone: "bg-white/10 text-gray-100", label: "Επιβεβαιωμένη" },
    pending   : { tone: "bg-gray-500/20 text-gray-300", label: "Σε αναμονή" },
    cancelled : { tone: "bg-gray-700/30 text-gray-400", label: "Ακυρωμένη" },
  }[status] ?? { tone: "bg-gray-600/20 text-gray-300", label: status };

  return (
    <Card
      className="relative overflow-hidden border border-gray-800
                 transition-transform hover:-translate-y-0.5 hover:shadow-lg"
      style={{
        background:
          "linear-gradient(135deg,rgba(0,0,0,.88) 0%,rgba(25,25,25,.88) 100%)",
        backdropFilter: "blur(14px) saturate(140%)",
        WebkitBackdropFilter: "blur(14px) saturate(140%)",
      }}
    >
      {/* faint white blob for depth */}
      <div className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-white/5 blur-2xl" />

      <CardContent className="relative flex items-center gap-5 p-5">
        {/* Avatar */}
        {trainer?.avatar_url ? (
          <img
            src={trainer.avatar_url}
            alt="trainer avatar"
            loading="lazy"
            className="h-14 w-14 rounded-full object-cover ring-2 ring-gray-900"
          />
        ) : (
          <div className="h-14 w-14 rounded-full bg-gray-700 grid place-items-center">
            <UserIcon className="h-6 w-6 text-gray-400" />
          </div>
        )}

        {/* Meta */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-100 truncate">
            {trainer?.full_name || "Trainer"}
          </p>
          <p className="text-sm text-gray-400">
            {new Date(when).toLocaleString("el-GR", {
              weekday: "short",
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        {/* Status badge */}
        <Badge className={`flex items-center gap-1.5 text-xs capitalize ${statusInfo.tone}`}>
          <CalendarClock className="h-3.5 w-3.5" /> {statusInfo.label}
        </Badge>
      </CardContent>
    </Card>
  );
}
