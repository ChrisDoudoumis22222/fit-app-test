/* UserBookings.jsx – v4.4 (crisp hover + trainer hydrate)
   – Reads user's bookings from trainer_bookings
   – Hydrates trainer name/avatar from profiles (fallbacks to booking fields/placeholder)
   – No schema assumptions (select "*"); infers online flag safely
   – Glassy card with non-blurry hover effect
*/

"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

import {
  CalendarClock,
  User as UserIcon,
  AlertTriangle,
  CalendarPlus,
  Wifi,
  WifiOff,
} from "lucide-react";

import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";

/* Cache-bust helper for avatars so updates show immediately */
const withBust = (url) => (url ? `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}` : url);

export default function UserBookings() {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [rows, setRows]       = useState([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError("");

      try {
        // 1) current user
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;
        const userId = authData?.user?.id;
        if (!userId) {
          setRows([]);
          setError("Δεν είστε συνδεδεμένος/η.");
          return;
        }

        // 2) fetch user's bookings (no hard-coded columns to avoid schema mismatch)
        const { data: bookings, error: bErr } = await supabase
          .from("trainer_bookings")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (bErr) throw bErr;

        // 3) fetch trainers from profiles (non-fatal if blocked by RLS)
        const trainerIds = Array.from(new Set((bookings || []).map((b) => b.trainer_id).filter(Boolean)));
        let trainerMap = {};
        if (trainerIds.length > 0) {
          const { data: trainers, error: tErr } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", trainerIds);

          if (!tErr && trainers) {
            trainerMap = Object.fromEntries(trainers.map((t) => [t.id, t]));
          } else if (tErr) {
            console.warn("[UserBookings] profiles lookup skipped:", tErr.message);
          }
        }

        // 4) hydrate with trainer info (profiles -> booking columns -> placeholder)
        const hydrated = (bookings || []).map((b) => {
          const p = trainerMap[b.trainer_id] || {};
          const full_name =
            p.full_name ||
            b.trainer_name ||
            (typeof b.trainer_id === "string" ? `Προπονητής #${b.trainer_id.slice(0, 6)}` : "Προπονητής");

          const avatar_url = withBust(p.avatar_url || b.trainer_avatar_url || "");

          return { ...b, trainer: { id: b.trainer_id, full_name, avatar_url } };
        });

        if (!alive) return;
        setRows(hydrated);
      } catch (e) {
        console.error("UserBookings →", e);
        setError(e?.message || "Αποτυχία φόρτωσης κρατήσεων.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  /* ── states ─────────────────────────────────────────────────── */
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
      <div className="space-y-2">
        <p className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="h-6 w-6 shrink-0" /> {error}
        </p>
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <Card className="relative overflow-hidden rounded-3xl border border-gray-800 bg-gradient-to-br from-gray-900/85 to-gray-900/70">
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

  /* ── list ───────────────────────────────────────────────────── */
  return (
    <div className="space-y-9">
      {rows.map((b) => (
        <BookingCard key={b.id} booking={b} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */

function BookingCard({ booking }) {
  const {
    trainer,
    status = "pending",
    date,
    start_time,
    end_time,
    note,
    created_at,
    accepted_at,
  } = booking || {};

  const isOnline = inferOnline(booking);

  const fmtDate = (d) =>
    d
      ? new Date(`${d}T00:00:00`).toLocaleDateString("el-GR", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  const fmtDateTime = (ts) =>
    ts
      ? new Date(ts).toLocaleString("el-GR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  const whenRequested = fmtDateTime(created_at);
  const whenAccepted =
    (status === "accepted" || status === "confirmed") && accepted_at ? fmtDateTime(accepted_at) : null;

  const timeRange = [start_time, end_time].filter(Boolean).join("–");

  const badgeClass =
    {
      accepted : "bg-emerald-500/25 text-emerald-200",
      confirmed: "bg-emerald-500/25 text-emerald-200",
      pending  : "bg-amber-400/25  text-amber-200",
      rejected : "bg-rose-500/25   text-rose-200",
      cancelled: "bg-rose-500/25   text-rose-200",
      completed: "bg-sky-500/25    text-sky-200",
    }[status] || "bg-gray-600/25 text-gray-300";

  const statusLabel =
    status === "pending"
      ? "Σε αναμονή"
      : status === "accepted" || status === "confirmed"
      ? "Επιβεβαιωμένη"
      : status === "rejected"
      ? "Απορρίφθηκε"
      : status === "cancelled"
      ? "Ακυρώθηκε"
      : status === "completed"
      ? "Ολοκληρώθηκε"
      : status;

  const avatar = trainer?.avatar_url;

  return (
    <Card
      className="relative overflow-hidden rounded-3xl border border-gray-800/70
                 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-2xl
                 transform-gpu will-change-transform"
      style={{
        background: "linear-gradient(135deg,rgba(24,24,27,.92) 0%, rgba(9,9,11,.92) 100%)",
        backdropFilter: "blur(12px) saturate(160%)",
        WebkitBackdropFilter: "blur(12px) saturate(160%)",
      }}
    >
      {/* crisp outer ring */}
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-white/10" />

      {/* glow without filter-blur */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full opacity-50 -z-10"
        style={{
          background:
            "radial-gradient(closest-side, rgba(255,255,255,0.10), rgba(255,255,255,0.04) 60%, transparent 70%)",
        }}
      />

      <CardContent className="relative flex flex-col sm:flex-row sm:items-center gap-8 p-10">
        {/* avatar */}
        {avatar ? (
          <img
            src={avatar}
            alt="trainer avatar"
            loading="lazy"
            className="h-24 w-24 rounded-full object-cover ring-2 ring-gray-900 shrink-0"
            onError={(e) => {
              e.currentTarget.src = "/placeholder.svg?height=96&width=96&text=Avatar";
            }}
          />
        ) : (
          <div className="h-24 w-24 rounded-full bg-gray-700 grid place-items-center shrink-0">
            <UserIcon className="h-10 w-10 text-gray-400" />
          </div>
        )}

        {/* meta */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-2xl font-bold text-gray-100 truncate">
            {trainer?.full_name || "Προπονητής"}
          </p>

          {/* session date/time */}
          <p className="text-lg text-gray-400">
            {fmtDate(date)} {timeRange ? `• ${timeRange}` : ""}
            {isOnline === true && (
              <span className="inline-flex items-center gap-1 ml-2 text-emerald-300">
                <Wifi className="h-4 w-4" /> Online
              </span>
            )}
            {isOnline === false && (
              <span className="inline-flex items-center gap-1 ml-2 text-zinc-400">
                <WifiOff className="h-4 w-4" /> Δια ζώσης
              </span>
            )}
          </p>

          <div className="mt-3 space-y-1 text-sm text-gray-400">
            <p>
              <span className="inline-block w-24 text-gray-500">Αίτημα:</span> {whenRequested}
            </p>
            {whenAccepted && (
              <p>
                <span className="inline-block w-24 text-gray-500">Αποδοχή:</span> {whenAccepted}
              </p>
            )}
            {note && (
              <p>
                <span className="inline-block w-24 text-gray-500">Σημείωση:</span> {note}
              </p>
            )}
          </div>
        </div>

        {/* status */}
        <Badge className={`flex items-center gap-2 px-5 py-2 text-base capitalize ${badgeClass}`}>
          <CalendarClock className="h-5 w-5" />
          {statusLabel}
        </Badge>
      </CardContent>
    </Card>
  );
}

/* Infer "online" across different schemas (optional) */
function inferOnline(b) {
  if (typeof b?.is_online === "boolean") return b.is_online;
  if (typeof b?.online === "boolean") return b.online;
  if (typeof b?.isOnline === "boolean") return b.isOnline;
  if (typeof b?.mode === "string") return b.mode.toLowerCase() === "online";
  if (typeof b?.session_type === "string") return b.session_type.toLowerCase() === "online";
  if (typeof b?.meeting_url === "string" && b.meeting_url.trim()) return true;
  return undefined; // unknown → show nothing
}
