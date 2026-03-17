"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

function getStatusMeta(status) {
  const s = String(status || "").toLowerCase();

  if (
    s === "accepted" ||
    s === "approved" ||
    s === "confirmed" ||
    s === "accept"
  ) {
    return {
      key: "accepted",
      label: "Αποδεκτή",
      icon: CheckCircle2,
      tone: "success",
      color: "text-emerald-300",
      pill:
        "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20 backdrop-blur-md",
    };
  }

  if (s === "pending") {
    return {
      key: "pending",
      label: "Εκκρεμής",
      icon: Clock3,
      tone: "warn",
      color: "text-amber-300",
      pill:
        "bg-amber-500/15 text-amber-300 border border-amber-400/20 backdrop-blur-md",
    };
  }

  if (s === "declined" || s === "rejected" || s === "reject") {
    return {
      key: "declined",
      label: "Απορρίφθηκε",
      icon: XCircle,
      tone: "danger",
      color: "text-rose-300",
      pill:
        "bg-rose-500/15 text-rose-300 border border-rose-400/20 backdrop-blur-md",
    };
  }

  if (s === "cancelled" || s === "canceled") {
    return {
      key: "cancelled",
      label: "Ακυρώθηκε",
      icon: Ban,
      tone: "danger",
      color: "text-zinc-300",
      pill:
        "bg-zinc-500/15 text-zinc-300 border border-zinc-400/20 backdrop-blur-md",
    };
  }

  return {
    key: "default",
    label: "Κράτηση",
    icon: Clock3,
    tone: "default",
    color: "text-zinc-300",
    pill:
      "bg-zinc-500/15 text-zinc-300 border border-zinc-400/20 backdrop-blur-md",
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
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

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

  return (
    /android|iphone|ipad|ipod|mobile/i.test(ua) || window.innerWidth < 768
  );
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

/* ---------------- ui ---------------- */

function Glass({ className = "", children }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden border border-white/10",
        "rounded-none sm:rounded-[30px]",
        "bg-[rgba(10,12,16,.78)] backdrop-blur-3xl",
        "shadow-[inset_0_1px_0_rgba(255,255,255,.05),0_22px_70px_rgba(0,0,0,.62)]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[.06] via-white/[.03] to-transparent opacity-60" />
        <div className="absolute -top-1/2 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent opacity-40" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[.07] to-transparent opacity-50" />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

function Button({
  children,
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl font-medium transition focus:outline-none focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-60 backdrop-blur-xl";
  const sizes = {
    sm: "h-10 px-4 text-sm",
    md: "h-12 px-5 text-[15px] sm:h-10 sm:px-4 sm:text-sm",
  };
  const variants = {
    success:
      "border border-emerald-400/25 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20",
    danger:
      "border border-rose-400/25 bg-rose-500/15 text-rose-300 hover:bg-rose-500/20",
    secondary:
      "border border-white/10 bg-white/[.06] text-white hover:bg-white/[.1]",
    ghost:
      "border border-white/10 bg-white/[.03] text-white hover:bg-white/[.07]",
    calendar:
      "border border-white bg-white text-black hover:bg-gray-100",
  };

  return (
    <button
      className={cn(base, sizes[size], variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}

function InfoTile({ icon: Icon, label, value, tone = "default" }) {
  const toneClasses =
    tone === "success"
      ? "bg-emerald-500/10 border-emerald-400/15"
      : tone === "warn"
      ? "bg-amber-500/10 border-amber-400/15"
      : tone === "danger"
      ? "bg-rose-500/10 border-rose-400/15"
      : "bg-white/[.04] border-white/10";

  return (
    <div
      className={cn(
        "rounded-2xl border p-3 sm:p-3.5 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,.03)]",
        toneClasses
      )}
    >
      <div className="mb-2 flex items-center gap-2 text-white/55">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="text-[11px] sm:text-xs">{label}</span>
      </div>
      <div className="break-words text-sm font-medium text-white sm:text-[15px]">
        {value || "—"}
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
      {children}
    </div>
  );
}

function Li({ icon: Icon, label, value }) {
  return (
    <li className="flex items-start gap-3">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" />
      <div className="min-w-0">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="break-words text-[15px] text-gray-200">{value || "—"}</p>
      </div>
    </li>
  );
}

function SkeletonBlock({ className = "" }) {
  return <div className={cn("skeleton-shimmer rounded-xl bg-white/[0.06]", className)} />;
}

function MobileSkeleton() {
  return (
    <div className="px-4 py-4">
      <div className="mb-4 rounded-[24px] border border-white/10 bg-white/[.05] p-4 backdrop-blur-xl">
        <div className="flex items-start gap-4">
          <SkeletonBlock className="h-14 w-14 rounded-full" />
          <div className="min-w-0 flex-1">
            <SkeletonBlock className="h-5 w-40" />
            <SkeletonBlock className="mt-3 h-6 w-24 rounded-full" />
            <SkeletonBlock className="mt-3 h-4 w-32" />
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/10 bg-white/[.04] p-3"
          >
            <SkeletonBlock className="h-3 w-16" />
            <SkeletonBlock className="mt-3 h-4 w-24" />
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-2xl border border-white/10 bg-white/[.04] p-4">
        <SkeletonBlock className="h-3 w-24" />
        <SkeletonBlock className="mt-3 h-4 w-full" />
        <SkeletonBlock className="mt-2 h-4 w-5/6" />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4">
        <SkeletonBlock className="h-4 w-44" />
        <SkeletonBlock className="mt-2 h-3 w-32" />
      </div>
    </div>
  );
}

function DesktopSkeleton() {
  return (
    <div className="px-4 py-4 sm:px-5 sm:py-5">
      <div className="mb-4 rounded-[24px] border border-white/10 bg-white/[.05] p-4 backdrop-blur-xl sm:rounded-3xl sm:p-5">
        <div className="flex items-start gap-4">
          <SkeletonBlock className="h-16 w-16 rounded-full" />
          <div className="min-w-0 flex-1">
            <SkeletonBlock className="h-6 w-48" />
            <SkeletonBlock className="mt-3 h-6 w-24 rounded-full" />
            <SkeletonBlock className="mt-3 h-4 w-40" />
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/10 bg-white/[.04] p-4"
          >
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="mt-3 h-4 w-28" />
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-2xl border border-white/10 bg-white/[.04] p-4">
        <SkeletonBlock className="h-3 w-28" />
        <SkeletonBlock className="mt-3 h-4 w-full" />
        <SkeletonBlock className="mt-2 h-4 w-4/5" />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4">
        <SkeletonBlock className="h-4 w-48" />
        <SkeletonBlock className="mt-2 h-3 w-36" />
      </div>
    </div>
  );
}

/* ---------------- main ---------------- */

export default function TrainerBookingNotificationDetails({
  open,
  booking,
  onClose,
  onStatusChange,
  onAccept,
  onDecline,
  onBookingUpdated,
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentBooking, setCurrentBooking] = useState(booking || null);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [showLazyContent, setShowLazyContent] = useState(false);
  const scrollRef = useRef(null);
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
    if (!open) setDetailsOpen(false);
  }, [booking, open]);

  useEffect(() => {
    if (!open) {
      setDetailsOpen(false);
      setShowLazyContent(false);
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    setShowLazyContent(false);

    const lazyTimer = window.setTimeout(() => {
      setShowLazyContent(true);
    }, 180);

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        onCloseRef.current?.();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(lazyTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, booking?.id]);

  useEffect(() => {
    if (!open) return;

    const id = requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
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
        } else if (
          nextStatus === "declined" &&
          typeof onDecline === "function"
        ) {
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
  const sessionType = currentBooking?.is_online ? "Online" : "Δια ζώσης";
  const dateValue = formatDate(currentBooking?.date || currentBooking?.booking_date);
  const timeValue = start && end ? `${start} – ${end}` : start || end || "—";

  const showSkeleton = !showLazyContent || !currentBooking;

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <button
        type="button"
        aria-label="Κλείσιμο"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-[18px]"
      >
        <span className="sr-only">Κλείσιμο</span>
      </button>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_35%),linear-gradient(to_bottom,rgba(0,0,0,0.28),rgba(0,0,0,0.5))]" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-white/[0.05] blur-3xl" />
        <div className="absolute bottom-0 left-0 h-44 w-44 rounded-full bg-white/[0.04] blur-3xl" />
        <div className="absolute right-0 top-1/3 h-48 w-48 rounded-full bg-white/[0.04] blur-3xl" />
      </div>

      <div
        ref={scrollRef}
        className={cn(
          "absolute inset-0 z-10 overflow-y-auto overflow-x-hidden overscroll-contain",
          "px-0 pt-0 pb-0 sm:px-4 sm:py-5"
        )}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="flex min-h-full items-start justify-center sm:pt-4">
          <Glass className="relative w-full sm:max-w-2xl sm:min-h-0 min-h-screen">
            <div className="sticky top-0 z-20 border-b border-white/10 bg-[rgba(10,12,16,.76)] backdrop-blur-3xl">
              <div className="px-4 pt-3 sm:hidden">
                <div className="mx-auto h-1.5 w-12 rounded-full bg-white/15" />
              </div>

              <div className="px-4 py-4 sm:px-5 sm:py-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col">
                      <h3 className="break-words text-lg font-semibold tracking-[-0.03em] text-white sm:text-[2rem]">
                        {showSkeleton ? "Λεπτομέρειες κράτησης" : bookingTitle}
                      </h3>

<span className="mt-2 text-sm text-white/55">
  Διαχείριση κράτησης
</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Κλείσιμο"
                    className="shrink-0 text-white/40 hover:text-white/70 transition"
                  >
                    <X className="h-5 w-5 sm:h-5 sm:w-5" />
                  </button>
                </div>
              </div>
            </div>

            {showSkeleton ? (
              <>
                <div className="sm:hidden">
                  <MobileSkeleton />
                </div>
                <div className="hidden sm:block">
                  <DesktopSkeleton />
                </div>
              </>
            ) : (
              <div className="px-4 py-4 sm:px-5 sm:py-5">
                <div className="mb-4 rounded-[24px] border border-white/10 bg-white/[.05] p-4 backdrop-blur-xl sm:rounded-3xl sm:p-5">
                  <div className="flex items-start gap-4">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white/[.07] backdrop-blur-xl sm:h-16 sm:w-16">
                      <StatusIcon className={cn("h-7 w-7", statusMeta.color)} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="break-words text-lg font-semibold text-white sm:text-xl">
                        {clientName}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                            statusMeta.pill
                          )}
                        >
                          {statusMeta.label}
                        </span>
                      </div>

                      <div className="mt-3 text-sm text-white/60">{dateValue}</div>
                    </div>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-2">
                  <InfoTile
                    icon={Clock3}
                    label="Ώρα"
                    value={timeValue}
                    tone={statusMeta.tone}
                  />
                  <InfoTile icon={Clock3} label="Διάρκεια" value={duration} />
                  <InfoTile
                    icon={currentBooking?.is_online ? Wifi : MapPin}
                    label="Τύπος"
                    value={sessionType}
                  />
                  <InfoTile
                    icon={BadgeEuro}
                    label="Κόστος"
                    value={price}
                    tone={getPrice(currentBooking) ? "success" : "default"}
                  />
                </div>

                {notes ? (
                  <div className="mb-4 rounded-2xl border border-white/10 bg-white/[.04] p-4 backdrop-blur-xl">
                    <div className="mb-2 flex items-center gap-2 text-white/55">
                      <FileText className="h-4 w-4 shrink-0" />
                      <span className="text-xs">Σημειώσεις πελάτη</span>
                    </div>
                    <p className="break-words text-sm leading-6 text-white/90">
                      {notes}
                    </p>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => setDetailsOpen((v) => !v)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.04] px-4 py-3 text-left backdrop-blur-xl transition hover:bg-white/[.06]"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white">
                      Περισσότερες λεπτομέρειες
                    </div>
                    <div className="mt-1 text-xs text-white/50">
                      Στοιχεία κράτησης και καταγραφής
                    </div>
                  </div>

                  <div className="shrink-0 text-white/65">
                    {detailsOpen ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </div>
                </button>

                {detailsOpen ? (
                  <div className="mt-4 space-y-6 rounded-2xl border border-white/10 bg-white/[.03] p-4 backdrop-blur-2xl sm:p-5">
                    <div>
                      <SectionTitle>Κράτηση</SectionTitle>
                      <ul className="space-y-3">
                        <Li icon={User} label="Πελάτης" value={clientName} />
                        <Li icon={User} label="Trainer" value={trainerName} />
                        <Li
                          icon={CalendarDays}
                          label="Ημερομηνία"
                          value={dateValue}
                        />
                        <Li
                          icon={Clock3}
                          label="Ώρα"
                          value={
                            start && end
                              ? `${start} – ${end}${duration ? ` • ${duration}` : ""}`
                              : duration || "—"
                          }
                        />
                        <Li
                          icon={currentBooking?.is_online ? Wifi : MapPin}
                          label="Τρόπος"
                          value={sessionType}
                        />
                        <Li icon={BadgeEuro} label="Κόστος" value={price} />
                        {currentBooking?.location ||
                        currentBooking?.address ||
                        currentBooking?.venue ||
                        currentBooking?.place ? (
                          <Li
                            icon={MapPin}
                            label="Τοποθεσία"
                            value={
                              currentBooking?.location ||
                              currentBooking?.address ||
                              currentBooking?.venue ||
                              currentBooking?.place
                            }
                          />
                        ) : null}
                      </ul>
                    </div>

                    <div className="h-px bg-white/10" />

                    <div>
                      <SectionTitle>Καταγραφή</SectionTitle>
                      <ul className="space-y-3">
                        <Li
                          icon={CalendarClock}
                          label="Δημιουργήθηκε"
                          value={formatDateTime(currentBooking?.created_at)}
                        />

                        {currentBooking?.updated_at ? (
                          <Li
                            icon={CheckCircle2}
                            label="Τελευταία ενημέρωση"
                            value={formatDateTime(currentBooking?.updated_at)}
                          />
                        ) : null}
                      </ul>
                    </div>
                  </div>
                ) : null}

                <div
                  className={cn(
                    canShowDecisionActions
                      ? "h-[208px] pb-[env(safe-area-inset-bottom)]"
                      : canAddToCalendar
                      ? "h-[148px] pb-[env(safe-area-inset-bottom)]"
                      : "h-[90px] pb-[env(safe-area-inset-bottom)]",
                    "sm:h-0 sm:pb-0"
                  )}
                />
              </div>
            )}

            <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[rgba(10,12,16,.92)] px-4 py-4 backdrop-blur-3xl sm:sticky sm:bottom-0 sm:left-auto sm:right-auto sm:z-20 sm:bg-[rgba(10,12,16,.76)] sm:px-5">
              {error ? (
                <div className="mb-3 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                {!showSkeleton && canShowDecisionActions ? (
                  <Button
                    type="button"
                    onClick={() => handleStatusAction("accepted")}
                    className="w-full sm:w-auto"
                    variant="success"
                    disabled={!!actionLoading}
                  >
                    {actionLoading === "accepted" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Αποδοχή
                  </Button>
                ) : null}

                {!showSkeleton && canShowDecisionActions ? (
                  <Button
                    type="button"
                    onClick={() => handleStatusAction("declined")}
                    className="w-full sm:w-auto"
                    variant="danger"
                    disabled={!!actionLoading}
                  >
                    {actionLoading === "declined" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="mr-2 h-4 w-4" />
                    )}
                    Απόρριψη
                  </Button>
                ) : null}

                {!showSkeleton && canAddToCalendar ? (
                  <Button
                    type="button"
                    onClick={handleAddToCalendar}
                    className="w-full sm:w-auto"
                    variant="calendar"
                    disabled={!!actionLoading}
                  >
                    <CalendarDays className="mr-2 h-4 w-4 text-black" />
                    Προσθήκη στο ημερολόγιο
                  </Button>
                ) : null}

                <Button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto"
                  variant="secondary"
                  disabled={!!actionLoading}
                >
                  Κλείσιμο
                </Button>
              </div>
            </div>
          </Glass>
        </div>
      </div>

      <style>{`
        .overscroll-contain {
          overscroll-behavior: contain;
        }

        .overscroll-contain::-webkit-scrollbar {
          width: 7px;
        }

        .overscroll-contain::-webkit-scrollbar-track {
          background: transparent;
        }

        .overscroll-contain::-webkit-scrollbar-thumb {
          background: rgba(160, 160, 160, 0.22);
          border-radius: 999px;
        }

        .overscroll-contain::-webkit-scrollbar-thumb:hover {
          background: rgba(190, 190, 190, 0.32);
        }

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
            rgba(255,255,255,0.08),
            transparent
          );
          animation: skeleton-slide 1.15s ease-in-out infinite;
        }

        @keyframes skeleton-slide {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>,
    document.body
  );
}