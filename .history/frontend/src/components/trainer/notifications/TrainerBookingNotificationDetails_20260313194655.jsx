"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  CheckCircle2,
  Clock3,
  XCircle,
  Ban,
  CalendarDays,
  CalendarClock,
  User,
  MapPin,
  Wifi,
  BadgeEuro,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function hhmm(t) {
  if (!t) return "";
  if (typeof t === "string") {
    const match = t.match(/^(\d{1,2}:\d{2})/);
    return match?.[1] || t;
  }
  return String(t);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(
    typeof value === "string" && !value.includes("T")
      ? `${value}T00:00:00`
      : value
  );
  if (Number.isNaN(d.getTime())) return String(value);

  return new Intl.DateTimeFormat("el-GR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return new Intl.DateTimeFormat("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function formatCurrency(value) {
  if (value == null || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);

  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(num);
}

function getTrainerDisplayName(b) {
  return (
    b?.trainer_name ||
    b?.provider_name ||
    b?.coach_name ||
    b?.trainer_full_name ||
    b?.provider_full_name ||
    "Trainer"
  );
}

function getClientDisplayName(b) {
  return (
    b?.user_name ||
    b?.client_name ||
    b?.customer_name ||
    b?.athlete_name ||
    b?.booked_by_name ||
    b?.member_name ||
    b?.full_name ||
    b?.name ||
    "Πελάτης"
  );
}

function getBookingTitle(b) {
  return (
    b?.service_name ||
    b?.booking_title ||
    b?.title ||
    b?.session_title ||
    b?.workout_name ||
    b?.training_name ||
    "Κράτηση"
  );
}

function getBookingNotes(b) {
  return (
    b?.notes ||
    b?.note ||
    b?.message ||
    b?.description ||
    b?.special_requests ||
    ""
  );
}

function getPrice(b) {
  return b?.total_price ?? b?.amount ?? b?.price ?? b?.price_eur ?? null;
}

function getDurationMinutes(b) {
  if (b?.duration_min) return Number(b.duration_min) || 0;

  const start = hhmm(b?.start_time);
  const end = hhmm(b?.end_time);

  if (!start || !end) return 0;

  const [sh, sm] = String(start).split(":").map(Number);
  const [eh, em] = String(end).split(":").map(Number);

  if (
    Number.isNaN(sh) ||
    Number.isNaN(sm) ||
    Number.isNaN(eh) ||
    Number.isNaN(em)
  ) {
    return 0;
  }

  return eh * 60 + em - (sh * 60 + sm);
}

function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return "—";

  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}ω ${m}λ` : `${h}ω`;
  }

  return `${minutes}λ`;
}

function getStatusKey(status) {
  const s = String(status || "").toLowerCase();

  if (
    s === "accepted" ||
    s === "approved" ||
    s === "confirmed" ||
    s === "accept"
  ) {
    return "accepted";
  }

  if (s === "declined" || s === "rejected" || s === "reject") {
    return "declined";
  }

  if (s === "cancelled" || s === "canceled") {
    return "cancelled";
  }

  return "pending";
}

function getStatusMeta(status) {
  const s = getStatusKey(status);

  if (s === "accepted") {
    return {
      key: s,
      label: "Αποδεκτή",
      icon: CheckCircle2,
      tone: "accepted",
      color: "text-emerald-300",
      pill: "border border-emerald-400/40 bg-emerald-600/14 text-emerald-300",
    };
  }

  if (s === "pending") {
    return {
      key: s,
      label: "Εκκρεμής",
      icon: Clock3,
      tone: "pending",
      color: "text-amber-300",
      pill: "border border-amber-400/40 bg-amber-500/14 text-amber-300",
    };
  }

  if (s === "declined") {
    return {
      key: s,
      label: "Απορρίφθηκε",
      icon: XCircle,
      tone: "declined",
      color: "text-rose-300",
      pill: "border border-rose-400/40 bg-rose-600/14 text-rose-300",
    };
  }

  return {
    key: "cancelled",
    label: "Ακυρώθηκε",
    icon: Ban,
    tone: "cancelled",
    color: "text-zinc-300",
    pill: "border border-zinc-400/30 bg-zinc-500/14 text-zinc-300",
  };
}

/* ---------------- calendar helpers ---------------- */

function getLocalDatePart(value) {
  if (!value) return "";

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());

  return `${year}-${month}-${day}`;
}

function parseLocalDateTime(datePart, timePart = "00:00") {
  const [year, month, day] = String(datePart).split("-").map(Number);
  const [hours, minutes] = String(timePart).split(":").map(Number);

  return new Date(
    year,
    (month || 1) - 1,
    day || 1,
    Number.isNaN(hours) ? 0 : hours,
    Number.isNaN(minutes) ? 0 : minutes,
    0,
    0
  );
}

function toGoogleCalendarDate(date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function escapeICS(value = "") {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function formatICSDate(date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function buildCalendarEvent(booking) {
  const datePart = getLocalDatePart(booking?.date || booking?.booking_date);
  const startTime = hhmm(booking?.start_time);
  const endTime = hhmm(booking?.end_time);

  if (!datePart || !startTime) return null;

  const start = parseLocalDateTime(datePart, startTime);

  let end = null;

  if (endTime) {
    end = parseLocalDateTime(datePart, endTime);
    if (end <= start) {
      end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    }
  } else {
    const durationMin =
      Number(booking?.duration_min) > 0 ? Number(booking?.duration_min) : 60;
    end = new Date(start.getTime() + durationMin * 60 * 1000);
  }

  const clientName = getClientDisplayName(booking);
  const trainerName = getTrainerDisplayName(booking);
  const bookingTitle = getBookingTitle(booking);
  const notes = getBookingNotes(booking);
  const isOnline = !!booking?.is_online;

  const details = [
    `Πελάτης: ${clientName}`,
    trainerName ? `Trainer: ${trainerName}` : "",
    `Τύπος: ${isOnline ? "Online" : "Δια ζώσης"}`,
    notes ? `Σημειώσεις: ${notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const location = isOnline
    ? "Online session"
    : booking?.location ||
      booking?.address ||
      booking?.venue ||
      booking?.place ||
      "Δια ζώσης";

  return {
    title: `${bookingTitle} • ${clientName}`,
    details,
    location,
    start,
    end,
  };
}

function buildGoogleCalendarWebUrl(event) {
  if (!event) return "";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toGoogleCalendarDate(event.start)}/${toGoogleCalendarDate(
      event.end
    )}`,
    details: event.details || "",
    location: event.location || "",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildGoogleCalendarAndroidIntentUrl(webUrl) {
  try {
    const url = new URL(webUrl);
    return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;package=com.google.android.calendar;end`;
  } catch {
    return webUrl;
  }
}

function buildICSContent(event) {
  const uid = `booking-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}@peakvelocity`;
  const now = formatICSDate(new Date());

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Peak Velocity//Trainer Booking Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatICSDate(event.start)}`,
    `DTEND:${formatICSDate(event.end)}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `DESCRIPTION:${escapeICS(event.details || "")}`,
    `LOCATION:${escapeICS(event.location || "")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function downloadICSFile(event) {
  if (typeof window === "undefined" || !event) return;

  const ics = buildICSContent(event);
  const blob = new Blob([ics], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${String(event.title || "booking")
    .replace(/[^a-zA-Z0-9\s-_]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase() || "booking"}.ics`;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function getMobileOS() {
  if (typeof window === "undefined") return "other";

  const ua = navigator.userAgent || navigator.vendor || window.opera || "";

  if (/android/i.test(ua)) return "android";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  return "other";
}

function isMobileDevice() {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent || navigator.vendor || window.opera || "";
  return /android|iphone|ipad|ipod|mobile/i.test(ua) || window.innerWidth < 768;
}

function openWithFallback(primaryUrl, fallbackFn) {
  if (typeof window === "undefined") return;

  let handled = false;

  const cleanup = () => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    if (timer) window.clearTimeout(timer);
  };

  const onVisibilityChange = () => {
    if (document.hidden) {
      handled = true;
      cleanup();
    }
  };

  document.addEventListener("visibilitychange", onVisibilityChange);

  const timer = window.setTimeout(() => {
    if (handled) return;
    handled = true;
    cleanup();
    fallbackFn?.();
  }, 900);

  window.location.href = primaryUrl;
}

/* ---------------- UI ---------------- */

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
    className={cn(
      "relative border border-white/10",
      "bg-[rgba(17,18,21,.72)] backdrop-blur-xl",
      tone === "accepted" && "ring-1 ring-emerald-400/20",
      (tone === "declined" || tone === "cancelled") && "ring-1 ring-rose-400/20",
      className
    )}
  >
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
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
    lg: "h-12 px-5 text-sm sm:text-base",
  };
  const variants = {
    primary:
      "border border-emerald-400/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-400/15",
    secondary:
      "border border-white/8 bg-white/[0.05] text-white hover:bg-white/[0.08]",
    danger:
      "border border-rose-400/40 bg-rose-500/10 text-rose-300 hover:bg-rose-400/15",
    calendar:
      "border border-white/80 bg-white text-black shadow-[0_10px_24px_rgba(255,255,255,.12)] hover:bg-zinc-200",
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
      <div className="mt-1 text-sm font-medium text-white/92">{value || "—"}</div>
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
        className="fixed inset-0 z-[9998] bg-black/68 backdrop-blur-sm sm:hidden"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="fixed inset-0 z-[9999] sm:hidden"
      >
        <div className="flex h-full w-full flex-col bg-[#090a0d]">
          <div className="sticky top-0 z-10 border-b border-white/10 bg-[#090a0d]/96 px-4 pb-3 pt-4 backdrop-blur">
            <div className="mb-3 flex justify-center">
              <div className="h-1.5 w-11 rounded-full bg-white/10" />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-white">
                  Λεπτομέρειες Κράτησης
                </h3>
              </div>

              <button
                onClick={onClose}
                aria-label="Κλείσιμο"
                className="grid h-10 w-10 place-items-center rounded-full text-white/70 transition hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
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

/* ---------------- Skeleton ---------------- */

function SkeletonLine({ className = "" }) {
  return <div className={cn("skeleton-shimmer rounded-xl bg-white/[0.06]", className)} />;
}

function DetailsSkeletonDesktop() {
  return (
    <Glass tone="default" className="rounded-[28px] p-4 sm:p-5">
      <div className="mb-4 hidden items-center justify-between sm:flex">
        <SkeletonLine className="h-6 w-48" />
        <SkeletonLine className="h-10 w-10 rounded-full" />
      </div>

      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-white/10 p-4">
        <SkeletonLine className="h-16 w-16 rounded-full" />
        <div className="min-w-0 flex-1">
          <SkeletonLine className="h-6 w-40" />
          <div className="mt-3 flex gap-2">
            <SkeletonLine className="h-6 w-24 rounded-full" />
            <SkeletonLine className="h-6 w-28 rounded-full" />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/10 bg-[rgba(17,18,21,.65)] px-3 py-3"
          >
            <div className="flex items-start gap-3">
              <SkeletonLine className="h-9 w-9 rounded-xl" />
              <div className="flex-1">
                <SkeletonLine className="h-3 w-24" />
                <SkeletonLine className="mt-2 h-4 w-40" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <SkeletonLine className="h-12 w-full sm:w-36" />
        <SkeletonLine className="h-12 w-full sm:w-36" />
        <SkeletonLine className="h-12 w-full sm:w-28" />
      </div>
    </Glass>
  );
}

function DetailsSkeletonMobile() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <SkeletonLine className="h-14 w-14 rounded-full" />
        <div className="flex-1">
          <SkeletonLine className="h-5 w-40" />
          <div className="mt-3 flex gap-2">
            <SkeletonLine className="h-6 w-24 rounded-full" />
            <SkeletonLine className="h-6 w-24 rounded-full" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-white/[0.04] px-3 py-2">
            <SkeletonLine className="h-3 w-16" />
            <SkeletonLine className="mt-2 h-4 w-20" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 py-2">
            <SkeletonLine className="h-9 w-9 rounded-xl" />
            <div className="flex-1">
              <SkeletonLine className="h-3 w-24" />
              <SkeletonLine className="mt-2 h-4 w-36" />
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 -mx-4 bg-gradient-to-t from-[#090a0d] via-[#090a0d]/96 to-transparent px-4 pb-2 pt-4">
        <div className="space-y-2">
          <SkeletonLine className="h-12 w-full rounded-2xl" />
          <SkeletonLine className="h-12 w-full rounded-2xl" />
          <SkeletonLine className="h-12 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

/* ---------------- MAIN ---------------- */

export default function TrainerBookingNotificationDetails({
  open,
  booking,
  onClose,
  onStatusChange,
  onAccept,
  onDecline,
  onBookingUpdated,
}) {
  const [mounted, setMounted] = useState(false);
  const [currentBooking, setCurrentBooking] = useState(booking || null);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const bodyRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    setCurrentBooking(booking || null);
    setError("");
    setActionLoading("");
    if (!open) setMobileExpanded(false);
  }, [booking, open]);

  useEffect(() => {
    if (!open) {
      setContentReady(false);
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    setContentReady(false);

    const readyTimer = window.setTimeout(() => {
      setContentReady(true);
    }, 180);

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        onCloseRef.current?.();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(readyTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, booking?.id]);

  useEffect(() => {
    if (!open) return;

    const id = requestAnimationFrame(() => {
      if (bodyRef.current) bodyRef.current.scrollTop = 0;
    });

    return () => cancelAnimationFrame(id);
  }, [open]);

  const statusMeta = useMemo(
    () => getStatusMeta(currentBooking?.status),
    [currentBooking?.status]
  );

  const durationMinutes = useMemo(
    () => getDurationMinutes(currentBooking),
    [currentBooking]
  );

  const duration = useMemo(
    () => formatDuration(durationMinutes),
    [durationMinutes]
  );

  const calendarEvent = useMemo(
    () => buildCalendarEvent(currentBooking),
    [currentBooking]
  );

  const canAddToCalendar = useMemo(() => {
    return statusMeta.key === "accepted" && !!calendarEvent;
  }, [statusMeta.key, calendarEvent]);

  const canShowDecisionActions = useMemo(() => {
    return statusMeta.key === "pending";
  }, [statusMeta.key]);

  const showSkeleton = !contentReady || !currentBooking;

  const handleAddToCalendar = useCallback(() => {
    if (!calendarEvent) return;

    const webUrl = buildGoogleCalendarWebUrl(calendarEvent);

    if (!isMobileDevice()) {
      window.open(webUrl, "_blank", "noopener,noreferrer");
      return;
    }

    const os = getMobileOS();

    if (os === "android") {
      const intentUrl = buildGoogleCalendarAndroidIntentUrl(webUrl);
      openWithFallback(intentUrl, () => {
        window.open(webUrl, "_blank", "noopener,noreferrer");
      });
      return;
    }

    if (os === "ios") {
      downloadICSFile(calendarEvent);
      return;
    }

    window.open(webUrl, "_blank", "noopener,noreferrer");
  }, [calendarEvent]);

  const handleStatusAction = useCallback(
    async (nextStatus) => {
      if (!currentBooking || actionLoading) return;

      setActionLoading(nextStatus);
      setError("");

      try {
        let updatedBooking = null;

        if (typeof onStatusChange === "function") {
          updatedBooking = await onStatusChange(currentBooking, nextStatus);
        } else if (nextStatus === "accepted" && typeof onAccept === "function") {
          updatedBooking = await onAccept(currentBooking);
        } else if (nextStatus === "declined" && typeof onDecline === "function") {
          updatedBooking = await onDecline(currentBooking);
        }

        const merged =
          updatedBooking && typeof updatedBooking === "object"
            ? { ...currentBooking, ...updatedBooking }
            : {
                ...currentBooking,
                status: nextStatus,
                updated_at: new Date().toISOString(),
              };

        setCurrentBooking(merged);
        onBookingUpdated?.(merged, nextStatus);
      } catch (err) {
        setError(
          err?.message || "Δεν έγινε ενημέρωση της κράτησης. Προσπάθησε ξανά."
        );
      } finally {
        setActionLoading("");
      }
    },
    [
      actionLoading,
      currentBooking,
      onStatusChange,
      onAccept,
      onDecline,
      onBookingUpdated,
    ]
  );

  if (!mounted || !open) return null;

  const StatusIcon = statusMeta.icon;
  const trainerName = getTrainerDisplayName(currentBooking);
  const clientName = getClientDisplayName(currentBooking);
  const bookingTitle = getBookingTitle(currentBooking);
  const notes = getBookingNotes(currentBooking);
  const price = formatCurrency(getPrice(currentBooking));
  const start = hhmm(currentBooking?.start_time);
  const end = hhmm(currentBooking?.end_time);
  const sessionType = currentBooking?.is_online ? "Online συνεδρία" : "Δια ζώσης";
  const dateValue = formatDate(
    currentBooking?.date || currentBooking?.booking_date
  );
  const timeValue = start && end ? `${start} – ${end}` : start || end || "—";

  const desktopContent = showSkeleton ? (
    <DetailsSkeletonDesktop />
  ) : (
    <Glass tone={statusMeta.key} className="rounded-[28px] p-4 sm:p-5">
      <div className="mb-3 hidden items-center justify-between sm:flex">
        <h3 className="text-base font-semibold text-white sm:text-lg">
          Λεπτομέρειες Κράτησης
        </h3>

        <button
          onClick={onClose}
          aria-label="Κλείσιμο"
          className="shrink-0 text-white/60 transition hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <motion.div
        initial={false}
        animate={
          statusMeta.key === "accepted"
            ? {
                backgroundColor: "rgba(16,185,129,0.08)",
                borderColor: "rgba(52,211,153,0.16)",
              }
            : statusMeta.key === "declined" || statusMeta.key === "cancelled"
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
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white/5 shadow-[0_8px_24px_rgba(0,0,0,.35)] sm:h-16 sm:w-16">
          <StatusIcon className={cn("h-6 w-6 sm:h-7 sm:w-7", statusMeta.color)} />
        </div>

        <div className="min-w-0">
          <div className="truncate text-lg font-medium text-white sm:text-xl">
            {clientName}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <motion.span
              initial={false}
              animate={
                statusMeta.key === "accepted" || statusMeta.key === "declined"
                  ? { scale: [1, 1.05, 1] }
                  : { scale: 1 }
              }
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`inline-flex rounded-lg px-2.5 py-0.5 text-xs ${statusMeta.pill}`}
            >
              {statusMeta.label}
            </motion.span>

            {statusMeta.key === "accepted" && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/10 bg-emerald-500/12 px-2.5 py-0.5 text-xs text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Επιβεβαιωμένη
              </span>
            )}

            {statusMeta.key === "declined" && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-rose-400/10 bg-rose-500/12 px-2.5 py-0.5 text-xs text-rose-300">
                <Ban className="h-3.5 w-3.5" />
                Απορρίφθηκε
              </span>
            )}
          </div>
        </div>
      </motion.div>

      <div className="space-y-2">
        <InfoRow icon={FileText} label="Τίτλος κράτησης" value={bookingTitle} />
        <InfoRow icon={CalendarClock} label="Ημερομηνία" value={dateValue} />
        <InfoRow icon={Clock3} label="Ώρες" value={timeValue} />
        <InfoRow icon={Clock3} label="Διάρκεια" value={duration} />
        <InfoRow
          icon={currentBooking?.is_online ? Wifi : MapPin}
          label="Τύπος"
          value={sessionType}
        />
        <InfoRow icon={BadgeEuro} label="Κόστος" value={price} />
        <InfoRow icon={User} label="Πελάτης" value={clientName} />
        <InfoRow icon={User} label="Trainer" value={trainerName} />

        {(currentBooking?.location ||
          currentBooking?.address ||
          currentBooking?.venue ||
          currentBooking?.place) && (
          <InfoRow
            icon={MapPin}
            label="Τοποθεσία"
            value={
              currentBooking?.location ||
              currentBooking?.address ||
              currentBooking?.venue ||
              currentBooking?.place
            }
          />
        )}

        {!!notes && <InfoRow icon={FileText} label="Σημείωση" value={notes} />}

        <InfoRow
          icon={CalendarClock}
          label="Υποβλήθηκε"
          value={formatDateTime(currentBooking?.created_at)}
        />

        {!!currentBooking?.updated_at && (
          <InfoRow
            icon={CheckCircle2}
            label="Τελευταία ενημέρωση"
            value={formatDateTime(currentBooking?.updated_at)}
          />
        )}
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col items-stretch justify-end gap-3 sm:flex-row sm:items-center">
        {canShowDecisionActions && (
          <Button
            variant="primary"
            size="md"
            onClick={() => handleStatusAction("accepted")}
            className="w-full gap-2 sm:w-auto"
            disabled={!!actionLoading}
          >
            {actionLoading === "accepted" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Αποδοχή
          </Button>
        )}

        {canShowDecisionActions && (
          <Button
            variant="danger"
            size="md"
            onClick={() => handleStatusAction("declined")}
            className="w-full gap-2 sm:w-auto"
            disabled={!!actionLoading}
          >
            {actionLoading === "declined" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Ban className="h-4 w-4" />
            )}
            Απόρριψη
          </Button>
        )}

        {canAddToCalendar && (
          <Button
            variant="calendar"
            size="lg"
            onClick={handleAddToCalendar}
            className="w-full gap-2.5 font-semibold sm:w-auto"
            disabled={!!actionLoading}
          >
            <CalendarDays className="h-5 w-5" />
            Ημερολόγιο
          </Button>
        )}

        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={onClose}
          className="w-full sm:w-auto"
          disabled={!!actionLoading}
        >
          Κλείσιμο
        </Button>
      </div>
    </Glass>
  );

  const mobileContent = showSkeleton ? (
    <DetailsSkeletonMobile />
  ) : (
    <div className="space-y-4">
      <div className="space-y-4">
        <div className="px-1">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-white/5">
              <StatusIcon className={cn("h-6 w-6", statusMeta.color)} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-semibold text-white">
                {clientName}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${statusMeta.pill}`}
                >
                  {statusMeta.label}
                </span>

                {statusMeta.key === "accepted" && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/10 bg-emerald-500/12 px-2.5 py-1 text-[11px] text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Επιβεβαιωμένη
                  </span>
                )}

                {statusMeta.key === "declined" && (
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
          <SummaryChip label="Ημερομηνία" value={dateValue} />
          <SummaryChip label="Ώρα" value={timeValue} />
          <SummaryChip label="Διάρκεια" value={duration} />
          <SummaryChip
            label="Τύπος"
            value={currentBooking?.is_online ? "Online" : "Δια ζώσης"}
          />
        </div>

        <div className="space-y-2">
          <InfoRow icon={FileText} label="Τίτλος κράτησης" value={bookingTitle} />
          <InfoRow icon={User} label="Πελάτης" value={clientName} />
          <InfoRow icon={User} label="Trainer" value={trainerName} />
        </div>

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
                Σημείωση, κόστος, τοποθεσία και ιστορικό
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
                  <InfoRow icon={BadgeEuro} label="Κόστος" value={price} />

                  {!!notes && (
                    <InfoRow icon={FileText} label="Σημείωση" value={notes} />
                  )}

                  {(currentBooking?.location ||
                    currentBooking?.address ||
                    currentBooking?.venue ||
                    currentBooking?.place) && (
                    <InfoRow
                      icon={MapPin}
                      label="Τοποθεσία"
                      value={
                        currentBooking?.location ||
                        currentBooking?.address ||
                        currentBooking?.venue ||
                        currentBooking?.place
                      }
                    />
                  )}

                  <InfoRow
                    icon={CalendarClock}
                    label="Υποβλήθηκε"
                    value={formatDateTime(currentBooking?.created_at)}
                  />

                  {!!currentBooking?.updated_at && (
                    <InfoRow
                      icon={CheckCircle2}
                      label="Τελευταία ενημέρωση"
                      value={formatDateTime(currentBooking?.updated_at)}
                    />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="sticky bottom-0 -mx-4 mt-4 bg-gradient-to-t from-[#090a0d] via-[#090a0d]/96 to-transparent px-4 pb-2 pt-4">
          <div className="space-y-2">
            {canShowDecisionActions && (
              <Button
                variant="primary"
                size="md"
                onClick={() => handleStatusAction("accepted")}
                className="w-full gap-2"
                disabled={!!actionLoading}
              >
                {actionLoading === "accepted" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Αποδοχή
              </Button>
            )}

            {canShowDecisionActions && (
              <Button
                variant="danger"
                size="md"
                onClick={() => handleStatusAction("declined")}
                className="w-full gap-2"
                disabled={!!actionLoading}
              >
                {actionLoading === "declined" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Ban className="h-4 w-4" />
                )}
                Απόρριψη
              </Button>
            )}

            {canAddToCalendar && (
              <Button
                variant="calendar"
                size="lg"
                onClick={handleAddToCalendar}
                className="w-full gap-2.5 font-semibold"
                disabled={!!actionLoading}
              >
                <CalendarDays className="h-5 w-5" />
                Ημερολόγιο
              </Button>
            )}

            <Button
              variant="secondary"
              size="md"
              onClick={onClose}
              className="w-full"
              disabled={!!actionLoading}
            >
              Κλείσιμο
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="trainer-booking-details-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999]"
        >
          <button
            type="button"
            aria-label="Κλείσιμο"
            onClick={onClose}
            className="absolute inset-0 hidden bg-black/70 backdrop-blur-[18px] sm:block"
          >
            <span className="sr-only">Κλείσιμο</span>
          </button>

          <div className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_35%),linear-gradient(to_bottom,rgba(0,0,0,0.28),rgba(0,0,0,0.5))] sm:block" />

          <div className="pointer-events-none absolute inset-0 hidden overflow-hidden sm:block">
            <div className="absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-white/[0.05] blur-3xl" />
            <div className="absolute bottom-0 left-0 h-44 w-44 rounded-full bg-white/[0.04] blur-3xl" />
            <div className="absolute right-0 top-1/3 h-48 w-48 rounded-full bg-white/[0.04] blur-3xl" />
          </div>

          <div className="hidden sm:block">
            <div className="absolute inset-0 z-10 flex items-center justify-center p-3 sm:p-6">
              <div
                ref={bodyRef}
                className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[28px]"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {desktopContent}
              </div>
            </div>
          </div>

          <div className="sm:hidden">
            <MobilePopup onClose={onClose}>{mobileContent}</MobilePopup>
          </div>

          <style>{`
            .skeleton-shimmer {
              position: relative;
              overflow: hidden;
            }

            .skeleton-shimmer::after {
              content: "";
              position: absolute;
              inset: 0;
              transform: translateX(-100%);
              background: linear-gradient(
                90deg,
                transparent,
                rgba(255, 255, 255, 0.08),
                transparent
              );
              animation: skeleton-slide 1.15s ease-in-out infinite;
            }

            @keyframes skeleton-slide {
              100% {
                transform: translateX(100%);
              }
            }

            .sm\\:block *::-webkit-scrollbar {
              width: 7px;
            }

            .sm\\:block *::-webkit-scrollbar-track {
              background: transparent;
            }

            .sm\\:block *::-webkit-scrollbar-thumb {
              background: rgba(160, 160, 160, 0.22);
              border-radius: 999px;
            }

            .sm\\:block *::-webkit-scrollbar-thumb:hover {
              background: rgba(190, 190, 190, 0.32);
            }
          `}</style>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}