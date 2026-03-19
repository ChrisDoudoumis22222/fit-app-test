"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  FileText,
  Heart,
  XCircle,
  Ban,
  RefreshCw,
  X,
  Clock,
  Wifi,
  User,
  Mail,
  MapPin,
  Euro,
  CheckCircle,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Link as LinkIcon,
} from "lucide-react";
import { supabase } from "../../supabaseClient";

const POST_TABLE_CANDIDATES = ["trainer_posts", "posts"];
const LIKE_TABLE_CANDIDATES = ["post_likes", "likes", "trainer_post_likes"];

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

/* ---------------- FEED HELPERS ---------------- */

function formatDateTime(value) {
  if (!value) return "";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat("el-GR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function toTs(value) {
  const t = new Date(value || 0).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function truncateText(value, max = 80) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

function isMissingTableError(error) {
  const message = String(error?.message || "").toLowerCase();
  const details = String(error?.details || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();

  return (
    code === "42p01" ||
    message.includes("does not exist") ||
    message.includes("could not find") ||
    message.includes("schema cache") ||
    details.includes("does not exist")
  );
}

async function queryFirstWorkingTable(candidates, buildQuery) {
  let lastError = null;

  for (const table of candidates) {
    try {
      const { data, error } = await buildQuery(supabase.from(table));
      if (error) {
        if (isMissingTableError(error)) continue;
        lastError = error;
        continue;
      }

      return {
        table,
        data: Array.isArray(data) ? data : [],
        error: null,
      };
    } catch (err) {
      if (isMissingTableError(err)) continue;
      lastError = err;
    }
  }

  return {
    table: null,
    data: [],
    error: lastError,
  };
}

function dedupeAndSortNotifications(items) {
  const seen = new Set();

  return [...items]
    .sort((a, b) => toTs(b.created_at) - toTs(a.created_at))
    .filter((item) => {
      const key = `${item.type}-${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function getDisplayName(entity) {
  return (
    entity?.trainer_name ||
    entity?.author_name ||
    entity?.user_name ||
    entity?.full_name ||
    entity?.client_name ||
    entity?.customer_name ||
    entity?.name ||
    "Ενημέρωση"
  );
}

function getPostOwnerId(post) {
  return (
    post?.trainer_id ||
    post?.trainerId ||
    post?.user_id ||
    post?.userId ||
    post?.author_id ||
    post?.authorId ||
    post?.owner_id ||
    post?.ownerId ||
    post?.profile_id ||
    post?.profileId ||
    null
  );
}

function getLikePostId(like) {
  return (
    like?.post_id ||
    like?.postId ||
    like?.trainer_post_id ||
    like?.trainerPostId ||
    like?.content_id ||
    like?.contentId ||
    null
  );
}

/* ---------------- BOOKING DETAILS HELPERS ---------------- */

const hhmm = (t) =>
  typeof t === "string" ? t.match(/^(\d{1,2}:\d{2})/)?.[1] ?? t : t;

const safeId = (b) =>
  (b && (b.id ?? b.booking_id ?? b.uid ?? b.pk ?? null)) || null;

function normalizeProfile(profile) {
  if (!profile) return null;

  return {
    ...profile,
    id: profile.id ?? null,
    full_name: profile.full_name ?? null,
    email: profile.email ?? null,
    avatar_url: profile.avatar_url ?? null,
    location: profile.location ?? null,
    offline_location: profile.offline_location ?? profile.location ?? null,
    online_link: profile.online_link ?? null,
    is_online:
      typeof profile.is_online === "boolean" ? profile.is_online : undefined,
  };
}

function normalizeBookingRecord(data) {
  if (!data) return null;

  const trainer = Array.isArray(data.trainer)
    ? data.trainer[0]
    : data.trainer || null;

  return {
    ...data,
    trainer: normalizeProfile(
      trainer ||
        (data.trainer_id ||
        data.trainer_name ||
        data.trainer_email ||
        data.avatar_url ||
        data.location ||
        data.offline_location ||
        data.online_link
          ? {
              id: data.trainer_id ?? null,
              full_name: data.trainer_name ?? null,
              email: data.trainer_email ?? null,
              avatar_url: data.avatar_url ?? null,
              location: data.location ?? null,
              offline_location: data.offline_location ?? data.location ?? null,
              online_link: data.online_link ?? null,
            }
          : null)
    ),
    location: data.location ?? null,
    offline_location: data.offline_location ?? data.location ?? null,
    online_link: data.online_link ?? null,
  };
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

function addMinutes(date, minutes = 0) {
  if (!date) return null;
  const next = new Date(date.getTime());
  next.setMinutes(next.getMinutes() + Number(minutes || 0));
  return next;
}

function toGoogleCalendarDate(date) {
  if (!date) return "";
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function buildGoogleCalendarUrl({ title, start, end, details, location }) {
  if (!title || !start || !end) return "";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${toGoogleCalendarDate(start)}/${toGoogleCalendarDate(end)}`,
    details: details || "",
    location: location || "",
    ctz: "Europe/Athens",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escapeICS(value = "") {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function downloadICS(event) {
  if (!event?.start || !event?.end) return;

  const uid = `${Date.now()}@peakvelocity.gr`;
  const now = toGoogleCalendarDate(new Date());

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Peak Velocity//Booking//EL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${toGoogleCalendarDate(event.start)}`,
    `DTEND:${toGoogleCalendarDate(event.end)}`,
    `SUMMARY:${escapeICS(event.title || "Προπόνηση μέσω του Peak Velocity")}`,
    `DESCRIPTION:${escapeICS(event.details || "")}`,
    `LOCATION:${escapeICS(event.location || "")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = event.filename || "peak-velocity-booking.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function withTimeout(promise, ms = 12000, msg = "Timeout") {
  let t;
  const timeout = new Promise((_, rej) => {
    t = setTimeout(() => rej(new Error(msg)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

const formatMoney = (value, currency = "EUR") => {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return `${n.toLocaleString("el-GR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
};

const paymentStatusLabel = (status) => {
  switch ((status || "").toLowerCase()) {
    case "paid":
      return "Πληρωμένο";
    case "pending":
      return "Σε αναμονή";
    case "failed":
      return "Απέτυχε";
    case "refunded":
      return "Επιστροφή χρημάτων";
    case "unpaid":
      return "Απλήρωτο";
    default:
      return status || "—";
  }
};

const paymentMethodLabel = (method) => {
  switch ((method || "").toLowerCase()) {
    case "cash":
      return "Μετρητά";
    case "card":
      return "Κάρτα";
    case "bank_transfer":
      return "Τραπεζική μεταφορά";
    case "wallet":
      return "Wallet";
    case "paypal":
      return "PayPal";
    default:
      return method || "—";
  }
};

function normalizeUrl(value = "") {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function getDisplayUrl(value = "") {
  try {
    const url = new URL(normalizeUrl(value));
    return `${url.hostname}${url.pathname !== "/" ? url.pathname : ""}`;
  } catch {
    return value || "—";
  }
}

/* ---------------- STATUS STYLE ---------------- */

function getStatusMeta(status) {
  const s = String(status || "").toLowerCase();

  if (s === "accepted") {
    return {
      label: "Αποδεκτή",
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-500/[0.05]",
      border: "border-emerald-500/20",
      hover: "hover:bg-emerald-500/[0.07]",
    };
  }

  if (s === "pending") {
    return {
      label: "Εκκρεμής",
      icon: Clock3,
      color: "text-amber-400",
      bg: "bg-amber-500/[0.05]",
      border: "border-amber-500/20",
      hover: "hover:bg-amber-500/[0.07]",
    };
  }

  if (s === "declined") {
    return {
      label: "Απορρίφθηκε",
      icon: XCircle,
      color: "text-rose-400",
      bg: "bg-rose-500/[0.05]",
      border: "border-rose-500/20",
      hover: "hover:bg-rose-500/[0.07]",
    };
  }

  if (s === "cancelled") {
    return {
      label: "Ακυρώθηκε",
      icon: Ban,
      color: "text-zinc-400",
      bg: "bg-zinc-500/[0.05]",
      border: "border-zinc-500/20",
      hover: "hover:bg-zinc-500/[0.07]",
    };
  }

  return {
    label: "Κράτηση",
    icon: Clock3,
    color: "text-zinc-300",
    bg: "bg-zinc-500/[0.05]",
    border: "border-zinc-500/20",
    hover: "hover:bg-zinc-500/[0.07]",
  };
}

/* ---------------- MAPPERS ---------------- */

function mapBookingNotification(b) {
  const trainerName = getDisplayName(b);
  const status = String(b?.status || "").toLowerCase();

  let subtitle = "Υπάρχει ενημέρωση για την κράτησή σου.";
  if (status === "accepted") subtitle = "Η κράτησή σου έγινε αποδεκτή.";
  if (status === "pending") subtitle = "Η κράτησή σου είναι σε εκκρεμότητα.";
  if (status === "declined") subtitle = "Η κράτησή σου απορρίφθηκε.";
  if (status === "cancelled") subtitle = "Η κράτησή σου ακυρώθηκε.";

  return {
    ...b,
    type: "booking",
    trainer_name: trainerName,
    subtitle,
    target_id: b.id,
    target_type: "booking",
  };
}

function mapPostNotification(p) {
  const trainerName = getDisplayName(p);
  const safeTrainerName =
    trainerName && trainerName !== "Ενημέρωση" ? trainerName : "Trainer";

  return {
    ...p,
    type: "post",
    trainer_name: safeTrainerName,
    subtitle: safeTrainerName,
    target_id: p.id,
    target_type: "post",
    post_id: p.id,
  };
}

function mapLikeNotification(like, postMap) {
  const postId = getLikePostId(like);
  const relatedPost = postId ? postMap.get(String(postId)) : null;

  return {
    ...like,
    type: "like",
    trainer_name: getDisplayName(like) || "Κάποιος",
    subtitle: relatedPost
      ? `Έγινε like σε ${truncateText(
          relatedPost?.title ||
            relatedPost?.caption ||
            relatedPost?.headline ||
            "ανάρτηση",
          45
        )}.`
      : "Έγινε like σε μία ανάρτηση.",
    target_id: postId || like.id,
    target_type: "like",
    post_id: postId || null,
    related_post: relatedPost || null,
  };
}

/* ---------------- UI PRIMITIVES ---------------- */

function Glass({ className = "", children }) {
  return (
    <div
      className={[
        "relative rounded-3xl border border-white/10",
        "bg-[rgba(17,18,21,.78)] backdrop-blur-xl",
        "shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_10px_30px_rgba(0,0,0,.45)]",
        className,
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[.06] via-white/[.02] to-transparent opacity-40" />
        <div className="absolute -top-1/2 left-0 right-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent opacity-50" />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

function DetailButton({
  children,
  variant = "secondary",
  className = "",
  ...props
}) {
  const variants = {
    primary:
      "border border-emerald-400/20 bg-emerald-600/90 text-white shadow-[0_6px_18px_rgba(16,185,129,.25)]",
    secondary: "border border-white/10 bg-white/6 text-white",
    ghost: "border border-white/10 bg-transparent text-white",
  };

  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium transition-none focus:outline-none focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function Li({ icon: Icon, label, value }) {
  return (
    <li className="flex items-start gap-3">
      <Icon className="mt-0.5 h-5 w-5 text-gray-500" />
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="break-words text-[15px] text-gray-200">{value || "—"}</p>
      </div>
    </li>
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
      className={`rounded-2xl border p-3 sm:p-3.5 ${toneClasses} shadow-[inset_0_1px_0_rgba(255,255,255,.03)]`}
    >
      <div className="mb-2 flex items-center gap-2 text-white/55">
        <Icon className="h-4 w-4" />
        <span className="text-[11px] sm:text-xs">{label}</span>
      </div>
      <div className="text-sm font-medium text-white sm:text-[15px]">
        {value}
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

function SessionAccessCard({
  isOnline,
  onlineLink,
  offlineLocation,
  canRevealAccess,
  status,
}) {
  const isDeclinedLike = status === "declined" || status === "cancelled";

  if (!canRevealAccess) {
    return (
      <div
        className={`mb-4 rounded-2xl border p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.03)] ${
          isDeclinedLike
            ? "border-rose-400/15 bg-rose-500/10"
            : "border-amber-400/15 bg-amber-500/10"
        }`}
      >
        <div
          className={`mb-3 flex items-center gap-2 ${
            isDeclinedLike ? "text-rose-200/85" : "text-amber-200/85"
          }`}
        >
          {isOnline ? (
            <Wifi className="h-4 w-4" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
          <span className="text-xs font-medium tracking-[0.08em]">
            {isOnline ? "Σύνδεσμος online συνεδρίας" : "Τοποθεσία συνεδρίας"}
          </span>
        </div>

        <p className="text-sm leading-6 text-white/75">
          {isDeclinedLike
            ? "Τα στοιχεία πρόσβασης δεν είναι διαθέσιμα, γιατί η κράτηση δεν εγκρίθηκε."
            : "Τα στοιχεία πρόσβασης θα εμφανιστούν μόλις η κράτηση γίνει αποδεκτή."}
        </p>
      </div>
    );
  }

  if (isOnline) {
    return (
      <div className="mb-4 rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.03)]">
        <div className="mb-3 flex items-center gap-2 text-emerald-200/85">
          <Wifi className="h-4 w-4" />
          <span className="text-xs font-medium tracking-[0.08em]">
            Σύνδεσμος online συνεδρίας
          </span>
        </div>

        {onlineLink ? (
          <>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
              <div className="mb-1 flex items-center gap-2 text-white/50">
                <LinkIcon className="h-4 w-4" />
                <span className="text-[11px] uppercase tracking-[0.14em]">
                  Link
                </span>
              </div>
              <a
                href={onlineLink}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-sm font-medium text-white underline decoration-white/20 underline-offset-4"
              >
                {getDisplayUrl(onlineLink)}
              </a>
            </div>

            <a
              href={onlineLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white text-sm font-semibold text-black transition hover:bg-zinc-100"
            >
              <ExternalLink className="h-4 w-4" />
              Άνοιγμα συνδέσμου
            </a>
          </>
        ) : (
          <p className="text-sm leading-6 text-white/75">
            Δεν έχει προστεθεί ακόμη σύνδεσμος από τον προπονητή.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-2xl border border-white/10 bg-white/[.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.03)]">
      <div className="mb-3 flex items-center gap-2 text-white/60">
        <MapPin className="h-4 w-4" />
        <span className="text-xs font-medium tracking-[0.08em]">
          Τοποθεσία συνεδρίας
        </span>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
        <p className="break-words text-sm leading-6 text-white/90">
          {offlineLocation || "Δεν έχει προστεθεί ακόμη τοποθεσία."}
        </p>
      </div>
    </div>
  );
}

/* ---------------- CARD ---------------- */

function NotificationCard({ item, isActive, onClick }) {
  if (item.type === "booking") {
    const meta = getStatusMeta(item.status);
    const Icon = meta.icon;

    return (
      <button
        type="button"
        onClick={() => onClick?.(item)}
        className="w-[240px] min-w-[240px] flex-shrink-0 snap-start text-left"
      >
        <div
          className={cn(
            "rounded-lg border p-3 backdrop-blur-md transition min-h-[120px]",
            meta.bg,
            meta.border,
            meta.hover,
            isActive && "ring-1 ring-white/15"
          )}
        >
          <div className="flex items-start gap-2">
            <Icon className={cn("mt-[2px] h-5 w-5 shrink-0", meta.color)} />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-200">
                {meta.label}
              </p>

              <p className="mt-[2px] truncate text-xs font-medium text-zinc-400">
                {item.trainer_name || "Trainer"}
              </p>

              <p className="mt-[4px] line-clamp-2 text-[11px] leading-4 text-zinc-500">
                {item.subtitle}
              </p>

              <p className="mt-[6px] text-[11px] text-zinc-500">
                {formatDateTime(item.created_at)}
              </p>
            </div>
          </div>
        </div>
      </button>
    );
  }

  if (item.type === "post") {
    return (
      <button
        type="button"
        onClick={() => onClick?.(item)}
        className="w-[240px] min-w-[240px] flex-shrink-0 snap-start text-left"
      >
        <div
          className={cn(
            "rounded-lg border p-3 backdrop-blur-md transition min-h-[120px]",
            "border-blue-500/20 bg-blue-500/[0.04] hover:bg-blue-500/[0.06]",
            isActive && "ring-1 ring-white/15"
          )}
        >
          <div className="flex items-start gap-2">
            <FileText className="mt-[2px] h-5 w-5 shrink-0 text-blue-400" />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-200">
                Νέα ανάρτηση
              </p>

              <p className="mt-[2px] truncate text-xs font-medium text-zinc-400">
                {item.trainer_name || "Trainer"}
              </p>

              <p className="mt-[4px] line-clamp-2 text-[11px] leading-4 text-zinc-500">
                {item.subtitle}
              </p>

              <p className="mt-[6px] text-[11px] text-zinc-500">
                {formatDateTime(item.created_at)}
              </p>
            </div>
          </div>
        </div>
      </button>
    );
  }

  if (item.type === "like") {
    return (
      <button
        type="button"
        onClick={() => onClick?.(item)}
        className="w-[240px] min-w-[240px] flex-shrink-0 snap-start text-left"
      >
        <div
          className={cn(
            "rounded-lg border p-3 backdrop-blur-md transition min-h-[120px]",
            "border-rose-500/20 bg-rose-500/[0.04] hover:bg-rose-500/[0.06]",
            isActive && "ring-1 ring-white/15"
          )}
        >
          <div className="flex items-start gap-2">
            <Heart className="mt-[2px] h-5 w-5 shrink-0 text-rose-400" />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-200">
                Νέο like
              </p>

              <p className="mt-[2px] truncate text-xs font-medium text-zinc-400">
                {item.trainer_name || "Κάποιος"}
              </p>

              <p className="mt-[4px] line-clamp-2 text-[11px] leading-4 text-zinc-500">
                {item.subtitle}
              </p>

              <p className="mt-[6px] text-[11px] text-zinc-500">
                {formatDateTime(item.created_at)}
              </p>
            </div>
          </div>
        </div>
      </button>
    );
  }

  return null;
}

/* ---------------- SKELETON ---------------- */

function NotificationSkeleton() {
  return (
    <div className="w-[240px] min-w-[240px] flex-shrink-0 snap-start rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-start gap-2">
        <div className="skeleton-shimmer mt-[2px] h-4 w-4 rounded-full bg-white/[0.06]" />

        <div className="flex-1">
          <div className="skeleton-shimmer h-3 w-24 rounded-md bg-white/[0.06]" />
          <div className="skeleton-shimmer mt-2 h-3 w-20 rounded-md bg-white/[0.05]" />
          <div className="skeleton-shimmer mt-2 h-2.5 w-28 rounded-md bg-white/[0.04]" />
          <div className="skeleton-shimmer mt-2 h-2.5 w-16 rounded-md bg-white/[0.04]" />
        </div>
      </div>
    </div>
  );
}

/* ---------------- BOOKING DETAILS MODAL ---------------- */

function BookingNotificationDetailsModal({ open, booking, onClose }) {
  const incomingBooking = useMemo(
    () => normalizeBookingRecord(booking),
    [booking]
  );

  const id = useMemo(() => safeId(incomingBooking), [incomingBooking]);

  const [full, setFull] = useState(() => {
    if (incomingBooking && safeId(incomingBooking)) return incomingBooking;
    return null;
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [savingCalendar, setSavingCalendar] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (!id) {
      setFull(null);
      setLoading(false);
      setErr(null);
      return;
    }

    let alive = true;

    const seededBooking =
      incomingBooking && safeId(incomingBooking) === id ? incomingBooking : null;

    if (seededBooking) {
      setFull(seededBooking);
      setLoading(false);
      setErr(null);
    } else {
      setFull(null);
      setLoading(true);
      setErr(null);
    }

    (async () => {
      try {
        const bookingQuery = supabase
          .from("trainer_bookings")
          .select(`
            id,
            trainer_id,
            user_id,
            date,
            start_time,
            end_time,
            duration_min,
            break_before_min,
            break_after_min,
            note,
            status,
            created_at,
            updated_at,
            is_online,
            user_email,
            user_name,
            trainer_name,
            amount,
            currency_code,
            payment_method,
            payment_status,
            paid_at,
            payment_reference,
            sale
          `)
          .eq("id", id)
          .maybeSingle();

        const { data: bookingData, error: bookingError } = await withTimeout(
          bookingQuery,
          12000,
          "Timeout details"
        );

        if (!alive) return;

        if (bookingError) {
          setErr(bookingError.message || "Σφάλμα ανάγνωσης κράτησης");
          setLoading(false);
          return;
        }

        if (!bookingData) {
          setErr("Δεν βρέθηκε η κράτηση.");
          setLoading(false);
          return;
        }

        const trainerId =
          bookingData?.trainer_id ||
          seededBooking?.trainer_id ||
          seededBooking?.trainer?.id ||
          null;

        let trainerProfile = normalizeProfile(seededBooking?.trainer || null);

        if (trainerId) {
          const profileQuery = supabase
            .from("profiles")
            .select(`
              id,
              email,
              full_name,
              avatar_url,
              location,
              offline_location,
              online_link,
              is_online
            `)
            .eq("id", trainerId)
            .maybeSingle();

          const { data: profileData, error: profileError } = await withTimeout(
            profileQuery,
            12000,
            "Timeout trainer profile"
          );

          if (!alive) return;

          if (!profileError && profileData) {
            trainerProfile = normalizeProfile({
              ...trainerProfile,
              ...profileData,
            });
          } else {
            console.warn("Trainer profile fetch failed:", profileError);
          }
        }

        const merged = normalizeBookingRecord({
          ...bookingData,
          trainer: trainerProfile,
          offline_location:
            trainerProfile?.offline_location ||
            trainerProfile?.location ||
            seededBooking?.offline_location ||
            seededBooking?.location ||
            bookingData?.offline_location ||
            bookingData?.location ||
            null,
          online_link:
            trainerProfile?.online_link ||
            seededBooking?.online_link ||
            bookingData?.online_link ||
            null,
          location:
            trainerProfile?.location ||
            seededBooking?.location ||
            bookingData?.location ||
            null,
        });

        setFull(merged);
        setLoading(false);
        setErr(null);
      } catch (e) {
        if (!alive) return;
        setErr(e.message || "Σφάλμα ανάγνωσης κράτησης");
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [open, id, incomingBooking]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const status = useMemo(() => {
    const raw = (full?.status || "pending").toString().toLowerCase();

    if (
      ["confirmed", "approve", "approved", "accept", "accepted"].includes(raw)
    ) {
      return "accepted";
    }

    if (["reject", "rejected", "declined"].includes(raw)) return "declined";

    return raw;
  }, [full?.status]);

  const canRevealSessionAccess =
    status === "accepted" || status === "completed";

  const statusTone =
    {
      pending: "bg-amber-500/15 text-amber-300 border border-amber-400/20",
      accepted:
        "bg-emerald-600/15 text-emerald-300 border border-emerald-400/20",
      completed:
        "bg-emerald-600/15 text-emerald-300 border border-emerald-400/20",
      declined: "bg-rose-600/15 text-rose-300 border border-rose-400/20",
      cancelled: "bg-rose-600/15 text-rose-300 border border-rose-400/20",
    }[status] || "bg-zinc-700/30 text-zinc-200 border border-white/10";

  const statusLabel =
    {
      pending: "Σε αναμονή",
      accepted: "Αποδεκτή",
      completed: "Ολοκληρώθηκε",
      declined: "Απορρίφθηκε",
      cancelled: "Ακυρώθηκε",
    }[status] || "Ενημερώθηκε";

  const paymentStatus = paymentStatusLabel(full?.payment_status);
  const paymentMethod = paymentMethodLabel(full?.payment_method);
  const showPaymentStatusPill =
    !!full?.payment_status &&
    (full?.payment_status || "").toLowerCase() !== "unpaid";

  const priceLabel = formatMoney(full?.amount, full?.currency_code || "EUR");
  const sessionType = full?.is_online ? "Online συνεδρία" : "Δια ζώσης";
  const durationLabel =
    Number(full?.duration_min || 0) > 0 ? `${full.duration_min} λεπτά` : "—";
  const timeLabel =
    full?.start_time || full?.end_time
      ? `${hhmm(full?.start_time)} – ${hhmm(full?.end_time)}`
      : "—";

  const trainerOnlineLink = useMemo(() => {
    return normalizeUrl(full?.trainer?.online_link || full?.online_link || "");
  }, [full?.trainer?.online_link, full?.online_link]);

  const trainerOfflineLocation = useMemo(() => {
    return (
      full?.trainer?.offline_location ||
      full?.trainer?.location ||
      full?.offline_location ||
      full?.location ||
      "Δεν έχει προστεθεί τοποθεσία."
    );
  }, [
    full?.trainer?.offline_location,
    full?.trainer?.location,
    full?.offline_location,
    full?.location,
  ]);

  const calendarEvent = useMemo(() => {
    if (status !== "accepted") return null;

    const start = combineDateTime(full?.date, full?.start_time);

    let end = full?.end_time
      ? combineDateTime(full?.date, full?.end_time)
      : null;

    if (!end && start) {
      end = addMinutes(start, Number(full?.duration_min || 60));
    }

    if (!start || !end) return null;

    const trainerName =
      full?.trainer?.full_name || full?.trainer_name || "Προπονητής";

    const sessionLocation = full?.is_online
      ? trainerOnlineLink || "Online συνεδρία"
      : trainerOfflineLocation || "Peak Velocity";

    const details = [
      "Κράτηση μέσω Peak Velocity",
      `Προπονητής: ${trainerName}`,
      `Ημερομηνία: ${fmtDate(full?.date)}`,
      `Ώρα: ${hhmm(full?.start_time)} – ${
        hhmm(full?.end_time) ||
        end.toLocaleTimeString("el-GR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      }`,
      full?.is_online ? "Τύπος: Online συνεδρία" : "Τύπος: Δια ζώσης",
      full?.is_online
        ? `Σύνδεσμος: ${trainerOnlineLink || "Δεν έχει προστεθεί"}`
        : `Τοποθεσία: ${trainerOfflineLocation || "Δεν έχει προστεθεί"}`,
      full?.note ? `Σημείωση: ${full.note}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      title: `Peak Velocity • Προπόνηση με ${trainerName}`,
      start,
      end,
      details,
      location: sessionLocation,
      filename: `peak-velocity-booking-${full?.date || "event"}.ics`,
    };
  }, [
    status,
    full?.date,
    full?.start_time,
    full?.end_time,
    full?.duration_min,
    full?.trainer_name,
    full?.trainer?.full_name,
    full?.note,
    full?.is_online,
    trainerOnlineLink,
    trainerOfflineLocation,
  ]);

  const calendarUrl = useMemo(() => {
    if (!calendarEvent) return "";
    return buildGoogleCalendarUrl(calendarEvent);
  }, [calendarEvent]);

  const handleAddToCalendar = async () => {
    if (typeof window === "undefined" || !calendarEvent) return;

    try {
      setSavingCalendar(true);

      const ua = navigator.userAgent || "";
      const isAndroid = /Android/i.test(ua);
      const isIOS = /iPhone|iPad|iPod/i.test(ua);

      if (isIOS) {
        downloadICS(calendarEvent);
        return;
      }

      if (isAndroid && calendarUrl) {
        const intentUrl =
          calendarUrl.replace(/^https:\/\//, "intent://") +
          "#Intent;scheme=https;package=com.google.android.calendar;end";

        const fallbackTimer = setTimeout(() => {
          window.location.href = calendarUrl;
        }, 900);

        window.location.href = intentUrl;

        setTimeout(() => {
          clearTimeout(fallbackTimer);
        }, 1500);

        return;
      }

      if (calendarUrl) {
        window.open(calendarUrl, "_blank", "noopener,noreferrer");
      }
    } finally {
      setTimeout(() => setSavingCalendar(false), 700);
    }
  };

  if (!open) return null;
  if (!id && !loading) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/70 p-3 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative mx-auto mt-8 max-w-2xl sm:mt-12">
        <Glass className="max-h-[calc(100vh-4rem)] overflow-y-auto p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              Λεπτομέρειες Κράτησης
            </h3>

            <button
              type="button"
              onClick={onClose}
              aria-label="Κλείσιμο"
              className="inline-flex h-8 w-8 items-center justify-center bg-transparent p-0 text-white/85 outline-none transition-none"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-7 w-40 rounded border border-white/10 bg-white/[.08]" />
              <div className="h-28 rounded-2xl border border-white/10 bg-white/[.06]" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-20 rounded-2xl border border-white/10 bg-white/[.06]" />
                <div className="h-20 rounded-2xl border border-white/10 bg-white/[.06]" />
                <div className="h-20 rounded-2xl border border-white/10 bg-white/[.06]" />
                <div className="h-20 rounded-2xl border border-white/10 bg-white/[.06]" />
              </div>
            </div>
          ) : err ? (
            <div className="rounded-xl bg-red-900/30 p-3 text-sm text-red-300">
              {err}
            </div>
          ) : (
            <>
              <div className="mb-4 rounded-3xl border border-white/10 bg-white/[.04] p-4 sm:p-5">
                <div className="flex items-start gap-4">
                  {full?.trainer?.avatar_url ? (
                    <img
                      src={full.trainer.avatar_url}
                      alt=""
                      className="h-14 w-14 rounded-full object-cover sm:h-16 sm:w-16"
                    />
                  ) : (
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-gray-700 sm:h-16 sm:w-16">
                      <CalendarClock className="h-7 w-7 text-gray-500" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-lg font-semibold text-white sm:text-xl">
                      {full?.trainer?.full_name ||
                        full?.trainer_name ||
                        "Προπονητής"}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTone}`}
                      >
                        {statusLabel}
                      </span>

                      {showPaymentStatusPill && (
                        <span className="inline-flex rounded-full border border-white/10 bg-white/[.05] px-2.5 py-1 text-xs text-white/65">
                          {paymentStatus}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 text-sm text-white/60">
                      {fmtDate(full?.date)}
                    </div>
                  </div>
                </div>
              </div>

              {status === "accepted" && !!calendarUrl && (
                <div className="mb-4">
                  <DetailButton
                    type="button"
                    onClick={handleAddToCalendar}
                    disabled={savingCalendar}
                    className="flex h-12 w-full items-center justify-center gap-3 border border-white/20 bg-white text-black"
                  >
                    <CalendarClock className="h-5 w-5 !text-black" />
                    <span className="text-sm font-semibold tracking-[0.12em] !text-black">
                      {savingCalendar
                        ? "Άνοιγμα ημερολογίου..."
                        : "Βάλ’ το στο ημερολόγιο"}
                    </span>
                  </DetailButton>
                </div>
              )}

              <div className="mb-4 grid grid-cols-2 gap-3">
                <InfoTile icon={Clock} label="Ώρα" value={timeLabel} />
                <InfoTile icon={Clock} label="Διάρκεια" value={durationLabel} />
                <InfoTile icon={Wifi} label="Τύπος" value={sessionType} />
                <InfoTile
                  icon={Euro}
                  label="Ποσό"
                  value={priceLabel}
                  tone={Number(full?.amount || 0) > 0 ? "success" : "default"}
                />
              </div>

              <SessionAccessCard
                isOnline={!!full?.is_online}
                onlineLink={trainerOnlineLink}
                offlineLocation={trainerOfflineLocation}
                canRevealAccess={canRevealSessionAccess}
                status={status}
              />

              {!!full?.note && (
                <div className="mb-4 rounded-2xl border border-white/10 bg-white/[.035] p-4">
                  <div className="mb-2 flex items-center gap-2 text-white/55">
                    <MapPin className="h-4 w-4" />
                    <span className="text-xs">Σημείωση</span>
                  </div>
                  <p className="break-words text-sm leading-6 text-white/90">
                    {full.note}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setDetailsOpen((v) => !v)}
                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[.04] px-4 py-3 text-left transition hover:bg-white/[.06]"
              >
                <div>
                  <div className="text-sm font-medium text-white">
                    Περισσότερες λεπτομέρειες
                  </div>
                  <div className="mt-1 text-xs text-white/50">
                    Στοιχεία προπονητή, πληρωμής και καταγραφής
                  </div>
                </div>

                <div className="text-white/65">
                  {detailsOpen ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </div>
              </button>

              {detailsOpen && (
                <div className="mt-4 space-y-6 rounded-2xl border border-white/10 bg-white/[.025] p-4 sm:p-5">
                  <div>
                    <SectionTitle>Προπονητής</SectionTitle>
                    <ul className="space-y-3 text-gray-300">
                      <Li
                        icon={User}
                        label="Όνομα"
                        value={
                          full?.trainer?.full_name ||
                          full?.trainer_name ||
                          "—"
                        }
                      />

                      {!!full?.trainer?.email && (
                        <Li
                          icon={Mail}
                          label="Email προπονητή"
                          value={full?.trainer?.email}
                        />
                      )}

                      {canRevealSessionAccess &&
                        !full?.is_online &&
                        !!trainerOfflineLocation && (
                          <Li
                            icon={MapPin}
                            label="Τοποθεσία συνεδρίας"
                            value={trainerOfflineLocation}
                          />
                        )}

                      {canRevealSessionAccess &&
                        !!full?.is_online &&
                        !!trainerOnlineLink && (
                          <Li
                            icon={LinkIcon}
                            label="Online link"
                            value={getDisplayUrl(trainerOnlineLink)}
                          />
                        )}
                    </ul>
                  </div>

                  <div className="h-px bg-white/10" />

                  <div>
                    <SectionTitle>Πληρωμή</SectionTitle>
                    <ul className="space-y-3 text-gray-300">
                      <Li
                        icon={CheckCircle}
                        label="Κατάσταση πληρωμής"
                        value={paymentStatus}
                      />
                      <Li
                        icon={Euro}
                        label="Τρόπος πληρωμής"
                        value={paymentMethod}
                      />
                      <Li
                        icon={Euro}
                        label="Ποσό"
                        value={priceLabel}
                      />
                      {!!full?.paid_at && (
                        <Li
                          icon={CheckCircle}
                          label="Πληρώθηκε στις"
                          value={fmtTs(toLocalDate(full.paid_at))}
                        />
                      )}
                      {!!full?.payment_reference && (
                        <Li
                          icon={CheckCircle}
                          label="Payment reference"
                          value={full.payment_reference}
                        />
                      )}
                      {Number(full?.sale || 0) > 0 && (
                        <Li
                          icon={Euro}
                          label="Έκπτωση"
                          value={formatMoney(
                            full?.sale,
                            full?.currency_code || "EUR"
                          )}
                        />
                      )}
                    </ul>
                  </div>

                  <div className="h-px bg-white/10" />

                  <div>
                    <SectionTitle>Καταγραφή</SectionTitle>
                    <ul className="space-y-3 text-gray-300">
                      <Li
                        icon={CalendarClock}
                        label="Υποβλήθηκε"
                        value={fmtTs(
                          toLocalDate(full?.created_at) ||
                            combineDateTime(full?.date, full?.start_time)
                        )}
                      />
                      {!!full?.updated_at && (
                        <Li
                          icon={CheckCircle}
                          label="Τελευταία ενημέρωση"
                          value={fmtTs(toLocalDate(full.updated_at))}
                        />
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}
        </Glass>
      </div>
    </div>
  );
}

/* ---------------- MAIN COMPONENT ---------------- */

export default function UserNotificationsFeed({
  userId,
  pageSize = 8,
  onNotificationClick,
  onBookingClick,
  onPostClick,
  onLikeClick,
}) {
  const [items, setItems] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [activePostTable, setActivePostTable] = useState(null);
  const [activeLikeTable, setActiveLikeTable] = useState(null);

  const scrollContainerRef = useRef(null);
  const sentinelRef = useRef(null);
  const observerRef = useRef(null);

  const hasMoreRef = useRef(true);
  const fetchingRef = useRef(false);
  const loadedCountRef = useRef(0);
  const itemsRef = useRef([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const fetchMergedNotifications = useCallback(
    async (targetCount) => {
      const sourceFetchLimit = Math.max(targetCount * 4, 24);

      const { data: bookingRows, error: bookingError } = await supabase
        .from("trainer_bookings")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(sourceFetchLimit);

      if (bookingError) throw bookingError;

      const rawBookings = Array.isArray(bookingRows) ? bookingRows : [];
      const bookingItems = rawBookings.map(mapBookingNotification);

      const relatedTrainerIds = [
        ...new Set(
          rawBookings
            .map((b) => b?.trainer_id || b?.trainerId || b?.provider_id || null)
            .filter(Boolean)
            .map(String)
        ),
      ];

      let postItems = [];
      let likeItems = [];
      let resolvedPostTable = null;
      let resolvedLikeTable = null;

      if (relatedTrainerIds.length > 0) {
        const postsResult = await queryFirstWorkingTable(
          POST_TABLE_CANDIDATES,
          (q) =>
            q
              .select("*")
              .order("created_at", { ascending: false })
              .limit(sourceFetchLimit)
        );

        resolvedPostTable = postsResult.table;

        const filteredPosts = (postsResult.data || []).filter((post) => {
          const ownerId = getPostOwnerId(post);
          return ownerId && relatedTrainerIds.includes(String(ownerId));
        });

        const postMap = new Map(
          filteredPosts.map((post) => [String(post.id), post])
        );

        postItems = filteredPosts.map(mapPostNotification);

        if (filteredPosts.length > 0) {
          const relevantPostIds = new Set(filteredPosts.map((p) => String(p.id)));

          const likesResult = await queryFirstWorkingTable(
            LIKE_TABLE_CANDIDATES,
            (q) =>
              q
                .select("*")
                .order("created_at", { ascending: false })
                .limit(Math.max(targetCount * 6, 32))
          );

          resolvedLikeTable = likesResult.table;

          const filteredLikes = (likesResult.data || []).filter((like) => {
            const postId = getLikePostId(like);
            return postId && relevantPostIds.has(String(postId));
          });

          likeItems = filteredLikes.map((like) =>
            mapLikeNotification(like, postMap)
          );
        }
      }

      return {
        merged: dedupeAndSortNotifications([
          ...bookingItems,
          ...postItems,
          ...likeItems,
        ]),
        resolvedPostTable,
        resolvedLikeTable,
      };
    },
    [userId]
  );

  const loadNotifications = useCallback(
    async ({ reset = false } = {}) => {
      if (!userId) {
        setItems([]);
        setSelectedKey("");
        setSelectedBooking(null);
        setInitialLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        setHasMore(false);
        setErrorText("");
        setActivePostTable(null);
        setActiveLikeTable(null);
        hasMoreRef.current = false;
        loadedCountRef.current = 0;
        return;
      }

      if (fetchingRef.current) return;
      if (!reset && !hasMoreRef.current) return;

      fetchingRef.current = true;
      setErrorText("");

      const targetCount = reset
        ? pageSize
        : loadedCountRef.current + pageSize;

      try {
        if (reset) {
          if (itemsRef.current.length > 0) {
            setRefreshing(true);
          } else {
            setInitialLoading(true);
          }
        } else {
          setLoadingMore(true);
        }

        const { merged, resolvedPostTable, resolvedLikeTable } =
          await fetchMergedNotifications(targetCount);

        const nextItems = merged.slice(0, targetCount);
        const nextHasMore = merged.length > nextItems.length;

        setItems(nextItems);
        setHasMore(nextHasMore);
        setActivePostTable(resolvedPostTable || null);
        setActiveLikeTable(resolvedLikeTable || null);

        hasMoreRef.current = nextHasMore;
        loadedCountRef.current = nextItems.length;
      } catch (err) {
        console.error("Notifications fetch error:", err);
        setErrorText(err?.message || "Κάτι πήγε στραβά στη φόρτωση.");
      } finally {
        fetchingRef.current = false;
        setInitialLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [userId, pageSize, fetchMergedNotifications]
  );

  useEffect(() => {
    setItems([]);
    setSelectedKey("");
    setSelectedBooking(null);
    setErrorText("");
    setInitialLoading(true);
    setRefreshing(false);
    setLoadingMore(false);
    setHasMore(true);

    hasMoreRef.current = true;
    loadedCountRef.current = 0;

    loadNotifications({ reset: true });
  }, [userId, pageSize, loadNotifications]);

  useEffect(() => {
    const root = scrollContainerRef.current;
    const target = sentinelRef.current;

    if (!root || !target || !hasMore) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry?.isIntersecting && !fetchingRef.current && hasMoreRef.current) {
          loadNotifications({ reset: false });
        }
      },
      {
        root,
        rootMargin: "0px 160px 0px 0px",
        threshold: 0.1,
      }
    );

    observerRef.current.observe(target);

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [hasMore, items.length, loadNotifications]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(
      `user-notifications-${userId}-${activePostTable || "posts"}-${activeLikeTable || "likes"}`
    );

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "trainer_bookings",
        filter: `user_id=eq.${userId}`,
      },
      () => {
        loadNotifications({ reset: true });
      }
    );

    if (activePostTable) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: activePostTable,
        },
        () => {
          loadNotifications({ reset: true });
        }
      );
    }

    if (activeLikeTable) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: activeLikeTable,
        },
        () => {
          loadNotifications({ reset: true });
        }
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, activePostTable, activeLikeTable, loadNotifications]);

  const handleNotificationClick = useCallback(
    (item) => {
      const key = `${item.type}-${item.id}`;
      setSelectedKey(key);

      if (item.type === "booking") {
        setSelectedBooking(item);
        onBookingClick?.(item);
      } else if (item.type === "post") {
        onPostClick?.(item);
      } else if (item.type === "like") {
        onLikeClick?.(item);
      }

      onNotificationClick?.(item);

      if (
        !onNotificationClick &&
        !onBookingClick &&
        !onPostClick &&
        !onLikeClick &&
        item.type !== "booking" &&
        typeof window !== "undefined"
      ) {
        window.dispatchEvent(
          new CustomEvent("user-notification:open", {
            detail: item,
          })
        );
      }
    },
    [onNotificationClick, onBookingClick, onPostClick, onLikeClick]
  );

  const count = useMemo(() => items.length, [items]);

  return (
    <>
      <section
        className="
          w-screen -mx-4 px-4 py-4
          sm:w-screen sm:-mx-4 sm:px-4
        "
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <h3 className="text-[16px] font-medium tracking-[-0.02em] text-white sm:text-[26px] sm:font-semibold">
              Οι ενημερώσεις μου
            </h3>

            <span className="text-[15px] font-medium text-white/50 sm:text-[26px] sm:font-semibold sm:text-white/60">
              ({count})
            </span>
          </div>

          <button
            type="button"
            onClick={() => loadNotifications({ reset: true })}
            disabled={refreshing || initialLoading}
            className="flex items-center justify-center disabled:opacity-50"
            aria-label="Ανανέωση ενημερώσεων"
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5 text-zinc-400 transition",
                (refreshing || initialLoading) && "animate-spin"
              )}
            />
          </button>
        </div>

        {initialLoading ? (
          <div className="flex gap-2 overflow-x-auto pb-2 subtle-scroll">
            {Array.from({ length: 4 }).map((_, i) => (
              <NotificationSkeleton key={i} />
            ))}
          </div>
        ) : errorText ? (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/[0.05] px-3 py-4 text-xs text-rose-300">
            {errorText}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-4 text-xs text-zinc-500">
            Δεν υπάρχουν ενημερώσεις ακόμη.
          </div>
        ) : (
          <div
            ref={scrollContainerRef}
            className="flex gap-2 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 subtle-scroll -mx-4 px-4 sm:mx-0 sm:px-0"
          >
            {items.map((item) => (
              <NotificationCard
                key={`${item.type}-${item.id}`}
                item={item}
                isActive={selectedKey === `${item.type}-${item.id}`}
                onClick={handleNotificationClick}
              />
            ))}

            {loadingMore &&
              Array.from({ length: 2 }).map((_, i) => (
                <NotificationSkeleton key={`more-${i}`} />
              ))}

            {hasMore && (
              <div
                ref={sentinelRef}
                className="w-4 min-w-[16px] flex-shrink-0"
                aria-hidden="true"
              />
            )}
          </div>
        )}

        <style>{`
          .subtle-scroll::-webkit-scrollbar {
            height: 4px;
          }

          .subtle-scroll::-webkit-scrollbar-track {
            background: transparent;
          }

          .subtle-scroll::-webkit-scrollbar-thumb {
            background: rgba(160, 160, 160, 0.22);
            border-radius: 999px;
          }

          .subtle-scroll::-webkit-scrollbar-thumb:hover {
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
        `}</style>
      </section>

      <BookingNotificationDetailsModal
        open={!!selectedBooking}
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
      />
    </>
  );
}