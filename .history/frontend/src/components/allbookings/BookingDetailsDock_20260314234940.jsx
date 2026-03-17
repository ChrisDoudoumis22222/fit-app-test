"use client";

import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CalendarPlus,
  CheckCircle,
  Ban,
  Clock,
  Wifi,
  User,
  Mail,
  MapPin,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "../../supabaseClient";

const AcceptModal = lazy(() => import("./AcceptBookingModal"));
const DeclineModal = lazy(() => import("./DeclineBookingModal"));

const safeId = (b) =>
  (b && (b.id ?? b.booking_id ?? b.uid ?? b.pk ?? null)) || null;

const hhmm = (t) =>
  typeof t === "string" ? t.match(/^(\d{1,2}:\d{2})/)?.[1] ?? t : t;

const pad2 = (n) => String(n).padStart(2, "0");

function toLocalDate(input) {
  if (!input) return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

function combineDateTime(date, time) {
  if (!date) return null;

  const normalizedTime =
    typeof time === "string" && /^\d{1,2}:\d{2}$/.test(time)
      ? `${time}:00`
      : time ?? "00:00:00";

  const d = new Date(`${date}T${normalizedTime}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const fmtDate = (d) => {
  if (!d) return "—";
  const obj = typeof d === "string" ? new Date(`${d}T00:00:00`) : d;

  return obj.toLocaleDateString("el-GR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const fmtTs = (ts) =>
  ts
    ? ts.toLocaleString("el-GR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

function withTimeout(promise, ms = 12000, msg = "Timeout") {
  let t;
  const timeout = new Promise((_, rej) =>
    (t = setTimeout(() => rej(new Error(msg)), ms))
  );

  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

function formatGoogleDate(dateValue) {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeICS(value = "") {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function sanitizeEmail(value = "") {
  const email = String(value || "").trim();
  if (!email || !email.includes("@")) return "";
  return email;
}

function formatGreekCalendarDate(dateValue) {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat("el-GR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}

function formatGreekCalendarTime(dateValue) {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat("el-GR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/**
 * Προτεραιότητα στο user_name από το trainer_bookings table
 */
function getPreferredClientDisplay(data = {}) {
  return (
    data?.user_name ||
    data?.client?.full_name ||
    data?.user?.full_name ||
    data?.user_username ||
    data?.client?.username ||
    data?.username ||
    data?.user_email ||
    data?.client?.email ||
    data?.user?.email ||
    "Χρήστης"
  );
}

/**
 * Προτεραιότητα στο user_email από το trainer_bookings table
 */
function getClientEmail(data = {}) {
  return (
    sanitizeEmail(data?.user_email) ||
    sanitizeEmail(data?.client?.email) ||
    sanitizeEmail(data?.user?.email) ||
    null
  );
}

function getTrainerDisplay(data = {}) {
  return (
    data?.trainer_name ||
    data?.trainer_info?.full_name ||
    data?.trainer?.full_name ||
    "Προπονητής"
  );
}

function buildLocalizedCalendarEvent(event = {}) {
  if (!event?.start || !event?.end) return null;

const trainerName = event.trainerName || "Προπονητής";
const userDisplay = event.userDisplay || "Χρήστης";
const userEmail = sanitizeEmail(event.userEmail || "");
const startTime = formatGreekCalendarTime(event.start);
const endTime = formatGreekCalendarTime(event.end);
const greekDate = formatGreekCalendarDate(event.start);

const title = userDisplay
  ? `Προπόνηση για τον/την ${userDisplay} στις ${startTime} μέσω του Peak Velocity`
  : `Προπόνηση στις ${startTime} μέσω του Peak Velocity`;

  const descriptionLines = [
    "Η κράτηση επιβεβαιώθηκε επιτυχώς μέσω του Peak Velocity.",
    greekDate ? `Ημερομηνία: ${greekDate}` : "",
    startTime && endTime ? `Ώρα: ${startTime} - ${endTime}` : "",
    trainerName ? `Προπονητής/Προπονήτρια: ${trainerName}` : "",
    userDisplay ? `Ασκούμενος/η: ${userDisplay}` : "",
    userEmail ? `Email ασκούμενου/ης: ${userEmail}` : "",
    event.sessionType ? `Τύπος: ${event.sessionType}` : "",
    event.location ? `Τοποθεσία: ${event.location}` : "",
    event.note ? `Σημείωση: ${event.note}` : "",
  ].filter(Boolean);

  return {
    ...event,
    title,
    description: descriptionLines.join("\n"),
    location: event.location || "Peak Velocity",
    filename: event.filename || "peak-velocity-booking.ics",
    attendeeEmail: userEmail || null,
    attendeeName: userDisplay || "Χρήστης",
  };
}

function buildGoogleCalendarUrl(event) {
  if (!event?.start || !event?.end) return null;

  const localizedEvent = buildLocalizedCalendarEvent(event);
  if (!localizedEvent) return null;

  const start = formatGoogleDate(localizedEvent.start);
  const end = formatGoogleDate(localizedEvent.end);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: localizedEvent.title || "Προπόνηση μέσω του Peak Velocity",
    dates: `${start}/${end}`,
    details: localizedEvent.description || "",
    location: localizedEvent.location || "",
    ctz: "Europe/Athens",
  });

  if (localizedEvent.attendeeEmail) {
    params.set("add", localizedEvent.attendeeEmail);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function downloadICS(event) {
  if (!event?.start || !event?.end) return;

  const localizedEvent = buildLocalizedCalendarEvent(event);
  if (!localizedEvent) return;

  const start = formatGoogleDate(localizedEvent.start);
  const end = formatGoogleDate(localizedEvent.end);
  const now = formatGoogleDate(new Date());
  const uid = `${Date.now()}@peakvelocity.gr`;

  const attendeeLine =
    localizedEvent.attendeeEmail
      ? `ATTENDEE;CN=${escapeICS(
          localizedEvent.attendeeName || "Χρήστης"
        )}:mailto:${localizedEvent.attendeeEmail}`
      : null;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Peak Velocity//Booking//EL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeICS(
      localizedEvent.title || "Προπόνηση μέσω του Peak Velocity"
    )}`,
    `DESCRIPTION:${escapeICS(localizedEvent.description || "")}`,
    `LOCATION:${escapeICS(localizedEvent.location || "")}`,
    attendeeLine,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = localizedEvent.filename || "peak-velocity-booking.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function getCalendarEventData(data) {
  if (!data?.date || !data?.start_time) return null;

  const start = combineDateTime(data.date, data.start_time);
  if (!start) return null;

  let end = data?.end_time ? combineDateTime(data.date, data.end_time) : null;

  const durationMin = Number(data?.duration_min);
  if (!end || end <= start) {
    const fallbackMinutes =
      Number.isFinite(durationMin) && durationMin > 0 ? durationMin : 60;
    end = new Date(start.getTime() + fallbackMinutes * 60 * 1000);
  }

  const trainerName = getTrainerDisplay(data);
  const userDisplay = getPreferredClientDisplay(data);
  const userEmail = getClientEmail(data);
  const sessionType = data?.is_online
    ? "Online προπόνηση"
    : "Δια ζώσης προπόνηση";

  return buildLocalizedCalendarEvent({
    start,
    end,
    trainerName,
    userDisplay,
    userEmail,
    sessionType,
    note: data?.note || "",
    location: data?.is_online ? "Online προπόνηση" : "Δια ζώσης",
    filename: `peak-velocity-booking-${data?.date || "event"}.ics`,
  });
}

function normalizeBookingData(data) {
  if (!data) return null;

  return {
    ...data,
    client: {
      username:
        data?.user_username ||
        data?.client?.username ||
        data?.username ||
        null,
      full_name:
        data?.user_name ||
        data?.client?.full_name ||
        data?.user?.full_name ||
        "Χρήστης",
      email:
        data?.user_email ||
        data?.client?.email ||
        data?.user?.email ||
        null,
      avatar_url: data?.client?.avatar_url || data?.user?.avatar_url || null,
    },
    trainer_info: {
      full_name:
        data?.trainer_name ||
        data?.trainer_info?.full_name ||
        data?.trainer?.full_name ||
        null,
      email: data?.trainer_info?.email || data?.trainer?.email || null,
      avatar_url:
        data?.trainer_info?.avatar_url || data?.trainer?.avatar_url || null,
    },
  };
}

const Glass = ({ className = "", children, tone = "default" }) => (
  <motion.div
    layout
    initial={false}
    animate={
      tone === "accepted"
        ? {
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,.04), 0 14px 34px rgba(16,185,129,.14)",
          }
        : tone === "declined" || tone === "cancelled"
        ? {
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,.03), 0 14px 34px rgba(244,63,94,.12)",
          }
        : {
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,.03), 0 10px 28px rgba(0,0,0,.35)",
          }
    }
    transition={{ duration: 0.19, ease: "easeOut" }}
    className={[
      "relative rounded-3xl border border-white/10",
      "bg-[rgba(17,18,21,.65)] backdrop-blur-xl",
      tone === "accepted"
        ? "ring-1 ring-emerald-400/20"
        : tone === "declined" || tone === "cancelled"
        ? "ring-1 ring-rose-400/20"
        : "",
      className,
    ].join(" ")}
  >
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
      <motion.div
        initial={false}
        animate={{ opacity: tone === "default" ? 0.28 : 0.85 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={
          tone === "accepted"
            ? "absolute inset-0 bg-gradient-to-br from-emerald-400/10 via-emerald-300/[0.04] to-transparent"
            : tone === "declined" || tone === "cancelled"
            ? "absolute inset-0 bg-gradient-to-br from-rose-400/10 via-rose-300/[0.04] to-transparent"
            : "absolute inset-0 bg-gradient-to-br from-white/[.04] via-white/[.01] to-transparent"
        }
      />
    </div>
    <div className="relative">{children}</div>
  </motion.div>
);

function Button({
  children,
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center rounded-2xl font-medium transition focus:outline-none focus:ring-2 focus:ring-white/15 disabled:cursor-not-allowed disabled:opacity-60";

  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-11 px-4 text-sm",
    lg: "min-h-[50px] px-5 text-sm sm:text-base",
  };

  const variants = {
    primary:
      "border border-emerald-400/40 bg-transparent text-emerald-400 hover:bg-emerald-400/10",
    secondary:
      "border border-white/8 bg-white/[0.05] text-white hover:bg-white/[0.08]",
    danger:
      "border border-rose-400/40 bg-transparent text-rose-400 hover:bg-rose-400/10",
    ghost:
      "border border-white/8 bg-transparent text-white hover:bg-white/[0.05]",
    calendar:
      "rounded-[18px] border border-white/80 bg-white text-black shadow-[0_10px_30px_rgba(255,255,255,0.06)] hover:bg-white/90",
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div
      className="
        flex items-start gap-3 py-2
        sm:rounded-2xl sm:border sm:border-white/10
        sm:bg-[rgba(17,18,21,.65)]
        sm:backdrop-blur-xl
        sm:shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_6px_20px_rgba(0,0,0,.35)]
        sm:px-3 sm:py-3
      "
    >
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.06]">
        <Icon className="h-4 w-4 text-white/70" />
      </div>

      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-[0.08em] text-white/35">
          {label}
        </div>
        <div className="mt-1 break-words text-sm font-medium text-white">
          {value || "—"}
        </div>
      </div>
    </div>
  );
}

function SummaryChip({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.08em] text-white/35">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-white/92">{value}</div>
    </div>
  );
}

function MobilePopup({ children, onClose }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="fixed inset-0 z-[90] bg-black/68 backdrop-blur-sm sm:hidden"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="fixed inset-0 z-[91] sm:hidden"
      >
        <div className="flex h-full w-full flex-col bg-[#090a0d]">
          <div className="sticky top-0 z-10 border-b border-transparent bg-[#090a0d]/96 px-4 pb-3 pt-4 backdrop-blur">
            <div className="mb-3 flex justify-center">
              <div className="h-1.5 w-11 rounded-full bg-white/10" />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-white">
                  Λεπτομέρειες Κράτησης
                </h3>
              </div>

              {onClose && (
                <button
                  onClick={onClose}
                  aria-label="Κλείσιμο"
                  className="grid h-10 w-10 place-items-center rounded-full text-white/70 transition hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-4">
            {children}
          </div>
        </div>
      </motion.div>
    </>
  );
}

export default function BookingDetailsDock({
  booking,
  bookingId,
  trainerId,
  onDone,
  onClose,
}) {
  const id = useMemo(
    () => (bookingId ? bookingId : safeId(booking)),
    [booking, bookingId]
  );

  const [full, setFull] = useState(() =>
    booking && id ? normalizeBookingData(booking) : null
  );
  const [loading, setLoading] = useState(!booking);
  const [err, setErr] = useState(null);
  const [showAccept, setAccept] = useState(false);
  const [showDecline, setDecline] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [savingCalendar, setSavingCalendar] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!id) return;

    const hasEverything =
      booking &&
      booking.date &&
      booking.start_time &&
      (booking.user_name || booking.user?.full_name) &&
      (booking.trainer_name || booking.trainer?.full_name);

    if (hasEverything && reloadKey === 0) {
      setFull(normalizeBookingData(booking));
      setLoading(false);
      setErr(null);

      return () => {
        alive = false;
      };
    }

    (async () => {
      setLoading(true);
      setErr(null);

const query = supabase
  .from("trainer_bookings")
  .select(
    `
    id,
    trainer_id,
    user_id,
    date,
    start_time,
    end_time,
    duration_min,
    note,
    status,
    created_at,
    updated_at,
    is_online,
    user_name,
    user_email,
    trainer_name,
    user:profiles!trainer_bookings_user_id_fkey ( id, full_name, email, avatar_url ),
    trainer:profiles!trainer_bookings_trainer_id_fkey ( id, full_name, email, avatar_url )
  `
  )
        .eq("id", id)
        .single();

      try {
        const { data, error } = await withTimeout(
          query,
          10000,
          "Timeout details"
        );

        if (!alive) return;

        if (error) {
          setErr(error.message || "Σφάλμα ανάγνωσης κράτησης");
          setLoading(false);
          return;
        }

        setFull(normalizeBookingData(data));
        setLoading(false);
      } catch (e) {
        if (!alive) return;
        setErr(e.message || "Σφάλμα ανάγνωσης κράτησης");
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id, booking, reloadKey]);

  const status = useMemo(() => {
    const raw = (full?.status || "pending").toString().toLowerCase();

    if (
      raw === "confirmed" ||
      raw === "approve" ||
      raw === "approved" ||
      raw === "accept"
    ) {
      return "accepted";
    }

    if (raw === "reject") return "declined";
    return raw;
  }, [full?.status]);

  const cardTone =
    status === "accepted"
      ? "accepted"
      : status === "declined" || status === "cancelled"
      ? "declined"
      : "default";

  const calendarEvent = useMemo(() => getCalendarEventData(full), [full]);
  const googleCalendarUrl = useMemo(
    () => buildGoogleCalendarUrl(calendarEvent),
    [calendarEvent]
  );

  const showCalendarButton = !!calendarEvent && status === "accepted";

  const statusTone =
    {
      pending: "border border-amber-400/40 bg-amber-500/14 text-amber-300",
      accepted:
        "border border-emerald-400/40 bg-emerald-600/14 text-emerald-300",
      declined: "border border-rose-400/40 bg-rose-600/14 text-rose-300",
      cancelled: "border border-rose-400/40 bg-rose-600/14 text-rose-300",
    }[status] || "border border-amber-400/40 bg-amber-500/14 text-amber-300";

  const statusLabel =
    {
      pending: "Σε αναμονή",
      accepted: "Αποδεκτή",
      declined: "Απορρίφθηκε",
      cancelled: "Ακυρώθηκε",
    }[status] || "Σε αναμονή";

  const secondLabel =
    {
      accepted: "Αποδοχή",
      declined: "Απόρριψη",
      cancelled: "Ακύρωση",
      pending: null,
    }[status];

  const SecondIcon =
    status === "accepted"
      ? CheckCircle
      : status === "pending"
      ? Clock
      : Ban;

  const handleActionDone = (payload) => {
    setAccept(false);
    setDecline(false);

    if (payload?.status) {
      setFull((prev) =>
        normalizeBookingData({
          ...(prev || booking || {}),
          ...(payload.row || {}),
          id: payload.bookingId ?? prev?.id ?? safeId(booking),
          trainer_id:
            payload.row?.trainer_id ?? prev?.trainer_id ?? trainerId ?? null,
          status: payload.status,
          updated_at: payload.row?.updated_at || new Date().toISOString(),
        })
      );
    }

    setReloadKey((k) => k + 1);
    onDone?.(payload);
  };

  const handleGoogleCalendar = async () => {
    if (!calendarEvent?.start || !calendarEvent?.end) return;

    try {
      setSavingCalendar(true);

      const ua = navigator.userAgent || "";
      const platform = navigator.platform || "";
      const isAndroid = /Android/i.test(ua);
      const isAppleDevice =
        /iPhone|iPad|iPod|Macintosh|Mac OS X/i.test(ua) ||
        /Mac/i.test(platform);

      if (isAppleDevice) {
        downloadICS(calendarEvent);
        return;
      }

      if (isAndroid && googleCalendarUrl) {
        const intentUrl =
          googleCalendarUrl.replace(/^https:\/\//, "intent://") +
          "#Intent;scheme=https;package=com.google.android.calendar;end";

        const fallbackTimer = setTimeout(() => {
          window.location.href = googleCalendarUrl;
        }, 900);

        window.location.href = intentUrl;

        setTimeout(() => {
          clearTimeout(fallbackTimer);
        }, 1500);

        return;
      }

      if (googleCalendarUrl) {
        window.open(googleCalendarUrl, "_blank", "noopener,noreferrer");
      }
    } finally {
      setTimeout(() => setSavingCalendar(false), 700);
    }
  };

  const clientAvatar =
    full?.client?.avatar_url || full?.user?.avatar_url || null;

  const desktopContent = (
    <Glass tone={cardTone} className="h-fit p-4 sm:p-5">
      <div className="mb-3 hidden items-center justify-between sm:flex">
        <h3 className="text-base font-semibold text-white sm:text-lg">
          Λεπτομέρειες Κράτησης
        </h3>

        {onClose && (
          <button
            onClick={onClose}
            aria-label="Κλείσιμο"
            className="shrink-0 text-white/60 transition hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {!id ? null : loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-7 w-40 rounded border border-white/10 bg-white/[.08]" />
          <div className="h-32 rounded-xl border border-white/10 bg-white/[.06]" />
          <div className="h-6 rounded border border-white/10 bg-white/[.06]" />
          <div className="h-6 rounded border border-white/10 bg-white/[.06]" />
        </div>
      ) : err ? (
        <div className="rounded-xl bg-red-900/30 p-3 text-sm text-red-300">
          {err}
        </div>
      ) : (
        <>
          <motion.div
            initial={false}
            animate={
              status === "accepted"
                ? {
                    backgroundColor: "rgba(16,185,129,0.08)",
                    borderColor: "rgba(52,211,153,0.16)",
                  }
                : status === "declined" || status === "cancelled"
                ? {
                    backgroundColor: "rgba(244,63,94,0.07)",
                    borderColor: "rgba(251,113,133,0.16)",
                  }
                : {
                    backgroundColor: "rgba(255,255,255,0)",
                    borderColor: "rgba(255,255,255,0)",
                  }
            }
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="mb-6 flex items-center gap-4 rounded-2xl border p-3 sm:p-4"
          >
            {clientAvatar ? (
              <div className="relative shrink-0">
                <img
                  src={clientAvatar}
                  alt={full?.client?.full_name || "Χρήστης"}
                  className="h-14 w-14 rounded-full object-cover shadow-[0_8px_24px_rgba(0,0,0,.35)] sm:h-16 sm:w-16"
                />
              </div>
            ) : (
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white/5 shadow-[0_8px_24px_rgba(0,0,0,.35)] sm:h-16 sm:w-16">
                <User className="h-6 w-6 text-white/70 sm:h-7 sm:w-7" />
              </div>
            )}

            <div className="min-w-0">
              <div className="truncate text-lg font-medium text-white sm:text-xl">
                {full?.client?.full_name || full?.user_name || "Χρήστης"}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <motion.span
                  initial={false}
                  animate={
                    status === "accepted" || status === "declined"
                      ? { scale: [1, 1.05, 1] }
                      : { scale: 1 }
                  }
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className={`inline-flex rounded-lg px-2.5 py-0.5 text-xs ${statusTone}`}
                >
                  {statusLabel}
                </motion.span>

                {status === "accepted" && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/10 bg-emerald-500/12 px-2.5 py-0.5 text-xs text-emerald-300"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Επιβεβαιωμένη
                  </motion.span>
                )}

                {status === "declined" && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-400/10 bg-rose-500/12 px-2.5 py-0.5 text-xs text-rose-300"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Απορρίφθηκε
                  </motion.span>
                )}
              </div>
            </div>
          </motion.div>

          <div className="space-y-2">
            <InfoRow
              icon={CalendarClock}
              label="Ημερομηνία"
              value={fmtDate(full?.date)}
            />
            <InfoRow
              icon={Clock}
              label="Ώρες"
              value={`${hhmm(full?.start_time)} – ${hhmm(full?.end_time)}`}
            />
            <InfoRow
              icon={Clock}
              label="Διάρκεια"
              value={`${full?.duration_min ?? 0} λεπτά`}
            />
            <InfoRow
              icon={Wifi}
              label="Τύπος"
              value={full?.is_online ? "Online συνεδρία" : "Δια ζώσης"}
            />
            {!!full?.note && (
              <InfoRow icon={MapPin} label="Σημείωση" value={full.note} />
            )}
            <InfoRow
              icon={User}
              label="Πελάτης"
              value={full?.client?.full_name || full?.user_name || "—"}
            />
            {!!(full?.client?.email || full?.user_email) && (
              <InfoRow
                icon={Mail}
                label="Email πελάτη"
                value={full?.user_email || full?.client?.email}
              />
            )}
            {!!(full?.trainer_info?.full_name || full?.trainer_name) && (
              <InfoRow
                icon={User}
                label="Προπονητής"
                value={full?.trainer_info?.full_name || full?.trainer_name}
              />
            )}
            <InfoRow
              icon={CalendarClock}
              label="Υποβλήθηκε"
              value={fmtTs(
                toLocalDate(full?.created_at) ??
                  combineDateTime(full?.date, full?.start_time)
              )}
            />
            {secondLabel && full?.updated_at && (
              <InfoRow
                icon={SecondIcon}
                label={secondLabel}
                value={fmtTs(toLocalDate(full.updated_at))}
              />
            )}
          </div>

          {showCalendarButton && (
            <div className="mt-6 overflow-hidden rounded-[26px] bg-[#0f1113] shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
              <div className="pointer-events-none relative">
                <div className="absolute left-1/2 top-0 h-[140px] w-[140px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
                <div className="absolute inset-x-0 top-0 h-[110px] bg-gradient-to-b from-emerald-500/[0.06] to-transparent" />
              </div>

              <div className="relative z-10 px-5 pb-5 pt-5">
                <div className="rounded-[20px] border border-emerald-500/15 bg-[#13211c] px-4 py-4 text-left">
                  <div className="text-[12px] font-medium text-emerald-200/65">
                    Κατάσταση
                  </div>
                  <div className="mt-1 text-[14px] font-semibold text-emerald-300">
                    Η κράτηση επιβεβαιώθηκε επιτυχώς 🎉
                  </div>
                </div>

                <div className="mt-4">
                  <Button
                    variant="calendar"
                    size="lg"
                    onClick={handleGoogleCalendar}
                    disabled={savingCalendar}
                    className="w-full gap-2.5 px-6 text-[15px] font-semibold"
                    title="Αποθήκευση στο ημερολόγιο"
                  >
                    <CalendarPlus className="h-4 w-4" />
                    {savingCalendar
                      ? "Άνοιγμα ημερολογίου..."
                      : "Αποθήκευση στο ημερολόγιο"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col items-stretch justify-end gap-3 sm:flex-row sm:items-center">
            {status === "pending" && (
              <>
                <Button
                  variant="danger"
                  size="md"
                  onClick={() => setDecline(true)}
                  className="w-full gap-2 sm:w-auto"
                >
                  <Ban className="h-4 w-4" />
                  Απόρριψη
                </Button>

                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setAccept(true)}
                  className="w-full gap-2 sm:w-auto"
                >
                  <CheckCircle className="h-4 w-4" />
                  Αποδοχή
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </Glass>
  );

  const mobileContent = (
    <div className="space-y-4">
      {!id ? null : loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-24 rounded-3xl bg-white/[.05]" />
          <div className="h-16 rounded-2xl bg-white/[.05]" />
          <div className="h-16 rounded-2xl bg-white/[.05]" />
          <div className="h-16 rounded-2xl bg-white/[.05]" />
        </div>
      ) : err ? (
        <div className="rounded-2xl border border-red-400/10 bg-red-900/30 p-4 text-sm text-red-300">
          {err}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            <div className="px-1">
              <div className="flex items-center gap-3">
                {clientAvatar ? (
                  <img
                    src={clientAvatar}
                    alt={full?.client?.full_name || "Χρήστης"}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-white/5">
                    <User className="h-6 w-6 text-white/70" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold text-white">
                    {full?.client?.full_name || full?.user_name || "Χρήστης"}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${statusTone}`}
                    >
                      {statusLabel}
                    </span>

                    {status === "accepted" && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/10 bg-emerald-500/12 px-2.5 py-1 text-[11px] text-emerald-300">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Επιβεβαιωμένη
                      </span>
                    )}

                    {status === "declined" && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/10 bg-rose-500/12 px-2.5 py-1 text-[11px] text-rose-300">
                        <Ban className="h-3.5 w-3.5" />
                        Απορρίφθηκε
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <SummaryChip label="Ημερομηνία" value={fmtDate(full?.date)} />
              <SummaryChip
                label="Ώρα"
                value={`${hhmm(full?.start_time)} – ${hhmm(full?.end_time)}`}
              />
              <SummaryChip
                label="Διάρκεια"
                value={`${full?.duration_min ?? 0} λεπτά`}
              />
              <SummaryChip
                label="Τύπος"
                value={full?.is_online ? "Online" : "Δια ζώσης"}
              />
            </div>

            <div className="space-y-2">
              <InfoRow
                icon={User}
                label="Πελάτης"
                value={full?.client?.full_name || full?.user_name || "—"}
              />

              {!!(full?.client?.email || full?.user_email) && (
                <InfoRow
                  icon={Mail}
                  label="Email πελάτη"
                  value={full?.user_email || full?.client?.email}
                />
              )}
            </div>

            {showCalendarButton && (
              <div className="overflow-hidden rounded-[26px] bg-[#0f1113] shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
                <div className="pointer-events-none relative">
                  <div className="absolute left-1/2 top-0 h-[120px] w-[120px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
                  <div className="absolute inset-x-0 top-0 h-[96px] bg-gradient-to-b from-emerald-500/[0.06] to-transparent" />
                </div>

                <div className="relative z-10 px-4 pb-4 pt-4">
                  <div className="rounded-[20px] border border-emerald-500/15 bg-[#13211c] px-4 py-4 text-left">
                    <div className="text-[12px] font-medium text-emerald-200/65">
                      Κατάσταση
                    </div>
                    <div className="mt-1 text-[14px] font-semibold text-emerald-300">
                      Η κράτηση επιβεβαιώθηκε επιτυχώς 🎉
                    </div>
                  </div>

                  <div className="mt-4">
                    <Button
                      variant="calendar"
                      size="lg"
                      onClick={handleGoogleCalendar}
                      disabled={savingCalendar}
                      className="w-full gap-2 px-6 text-[15px] font-semibold"
                      title="Αποθήκευση στο ημερολόγιο"
                    >
                      <CalendarPlus className="h-4 w-4" />
                      {savingCalendar
                        ? "Άνοιγμα ημερολογίου..."
                        : "Αποθήκευση στο ημερολόγιο"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-2xl bg-white/[0.03]">
              <button
                type="button"
                onClick={() => setMobileExpanded((v) => !v)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div>
                  <div className="text-sm font-medium text-white">
                    Περισσότερες λεπτομέρειες
                  </div>
                  <div className="mt-0.5 text-xs text-white/45">
                    Σημείωση, προπονητής, υποβολή και ιστορικό
                  </div>
                </div>

                <div className="grid h-9 w-9 place-items-center rounded-full border border-transparent bg-white/[0.04]">
                  {mobileExpanded ? (
                    <ChevronUp className="h-4 w-4 text-white/70" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-white/70" />
                  )}
                </div>
              </button>

              <AnimatePresence initial={false}>
                {mobileExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 px-4 pb-4">
                      {!!full?.note && (
                        <InfoRow
                          icon={MapPin}
                          label="Σημείωση"
                          value={full.note}
                        />
                      )}

                      <InfoRow
                        icon={Wifi}
                        label="Τύπος συνεδρίας"
                        value={
                          full?.is_online ? "Online συνεδρία" : "Δια ζώσης"
                        }
                      />

                      {!!(full?.trainer_info?.full_name ||
                        full?.trainer_name) && (
                        <InfoRow
                          icon={User}
                          label="Προπονητής"
                          value={
                            full?.trainer_info?.full_name || full?.trainer_name
                          }
                        />
                      )}

                      <InfoRow
                        icon={CalendarClock}
                        label="Υποβλήθηκε"
                        value={fmtTs(
                          toLocalDate(full?.created_at) ??
                            combineDateTime(full?.date, full?.start_time)
                        )}
                      />

                      {secondLabel && full?.updated_at && (
                        <InfoRow
                          icon={SecondIcon}
                          label={secondLabel}
                          value={fmtTs(toLocalDate(full.updated_at))}
                        />
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="sticky bottom-0 -mx-1 mt-4 bg-gradient-to-t from-[#090a0d] via-[#090a0d]/96 to-transparent px-1 pb-1 pt-4">
              <div className="space-y-2">
                {status === "pending" && (
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="danger"
                      size="md"
                      onClick={() => setDecline(true)}
                      className="w-full gap-2"
                    >
                      <Ban className="h-4 w-4" />
                      Απόρριψη
                    </Button>

                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => setAccept(true)}
                      className="w-full gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Αποδοχή
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      <AnimatePresence mode="wait">
        <div className="hidden sm:block">
          <div className="mx-auto max-w-3xl px-4">
            <motion.div
              key={id || "desktop-details"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {desktopContent}
            </motion.div>
          </div>
        </div>
      </AnimatePresence>

      <div className="sm:hidden">
        <AnimatePresence>
          <MobilePopup onClose={onClose}>{mobileContent}</MobilePopup>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showAccept && id && (
          <Suspense fallback={null}>
            <AcceptModal
              key={`accept-${id}`}
              trainerId={trainerId}
              bookingId={id}
              close={() => setAccept(false)}
              onDone={handleActionDone}
            />
          </Suspense>
        )}

        {showDecline && id && (
          <Suspense fallback={null}>
            <DeclineModal
              key={`decline-${id}`}
              trainerId={trainerId}
              bookingId={id}
              close={() => setDecline(false)}
              onDone={handleActionDone}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </>
  );
}