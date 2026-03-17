"use client";

import React, { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  Clock3,
  Wifi,
  WifiOff,
  User,
  Mail,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Ban,
  BadgeInfo,
  Lock,
} from "lucide-react";

/* -------------------------------- helpers -------------------------------- */

const safeId = (b) =>
  (b && (b.id ?? b.booking_id ?? b.uid ?? b.pk ?? null)) || null;

const hhmm = (t) => {
  if (!t) return "—";
  const value = String(t);
  const m = value.match(/^(\d{1,2}:\d{2})/);
  return m?.[1] ?? value;
};

function toDateObject(input) {
  if (!input) return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateLabelFromBooking(booking) {
  const raw =
    booking?.date ||
    booking?.booking_date ||
    booking?.session_date ||
    booking?.start_at ||
    booking?.created_at;

  const d = toDateObject(
    raw && /^\d{4}-\d{2}-\d{2}$/.test(String(raw))
      ? `${raw}T00:00:00`
      : raw
  );

  if (!d) return "—";

  return d.toLocaleDateString("el-GR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function createdAtLabel(input) {
  const d = toDateObject(input);
  if (!d) return "—";

  return d.toLocaleString("el-GR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeStatus(s) {
  const v = String(s || "pending").toLowerCase();
  if (["accepted", "completed"].includes(v)) return "accepted";
  if (["declined", "cancelled"].includes(v)) return "declined";
  return "pending";
}

function statusMeta(status) {
  const key = normalizeStatus(status);

  if (key === "accepted") {
    return {
      key,
      label: "Εγκεκριμένη",
      title: "Η κράτηση εγκρίθηκε",
      Icon: CheckCircle2,
      color: "emerald",
      badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
      banner: "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-200",
      iconWrap: "bg-emerald-500/14 text-emerald-300",
      statBox: "border-emerald-500/20 bg-emerald-500/[0.06]",
      statLabel: "text-emerald-300",
      statValue: "text-emerald-100",
      card: "border-emerald-500/15 bg-emerald-500/[0.04]",
      infoIcon: "bg-emerald-500/10 text-emerald-300",
      infoLabel: "text-emerald-300",
      infoValue: "text-emerald-100",
      actionArea: "border-emerald-500/20 bg-emerald-500/[0.04]",
    };
  }

  if (key === "declined") {
    return {
      key,
      label: "Απορριφθείσα",
      title: "Η κράτηση απορρίφθηκε",
      Icon: Ban,
      color: "rose",
      badge: "border-rose-500/25 bg-rose-500/10 text-rose-300",
      banner: "border-rose-500/20 bg-rose-500/[0.08] text-rose-200",
      iconWrap: "bg-rose-500/14 text-rose-300",
      statBox: "border-rose-500/20 bg-rose-500/[0.06]",
      statLabel: "text-rose-300",
      statValue: "text-rose-100",
      card: "border-rose-500/15 bg-rose-500/[0.04]",
      infoIcon: "bg-rose-500/10 text-rose-300",
      infoLabel: "text-rose-300",
      infoValue: "text-rose-100",
      actionArea: "border-rose-500/20 bg-rose-500/[0.04]",
    };
  }

  // Pending - yellow/amber
  return {
    key,
    label: "Σε αναμονή",
    title: "Η κράτηση είναι σε αναμονή",
    Icon: Clock3,
    color: "amber",
    badge: "border-amber-500/25 bg-amber-500/10 text-amber-300",
    banner: "border-amber-500/20 bg-amber-500/[0.08] text-amber-200",
    iconWrap: "bg-amber-500/14 text-amber-300",
    statBox: "border-amber-500/20 bg-amber-500/[0.06]",
    statLabel: "text-amber-300",
    statValue: "text-amber-100",
    card: "border-amber-500/15 bg-amber-500/[0.04]",
    infoIcon: "bg-amber-500/10 text-amber-300",
    infoLabel: "text-amber-300",
    infoValue: "text-amber-100",
    actionArea: "border-amber-500/20 bg-amber-500/[0.04]",
  };
}

function getClientName(booking) {
  return (
    booking?.client_name ||
    booking?.customer_name ||
    booking?.user_name ||
    booking?.full_name ||
    booking?.customer_full_name ||
    booking?.booked_by_name ||
    "—"
  );
}

function getClientEmail(booking) {
  return (
    booking?.client_email ||
    booking?.customer_email ||
    booking?.user_email ||
    booking?.email ||
    booking?.booked_by_email ||
    "—"
  );
}

function getTrainerName(booking) {
  return (
    booking?.trainer_name ||
    booking?.provider_name ||
    booking?.coach_name ||
    "—"
  );
}

function getSessionType(booking) {
  if (booking?.session_type) return booking.session_type;
  if (booking?.is_online) return "Online συνεδρία";
  return "Offline συνεδρία";
}

function getStartTime(booking) {
  if (booking?.start_time) return hhmm(booking.start_time);

  const d = toDateObject(booking?.start_at);
  if (!d) return "—";

  return d.toLocaleTimeString("el-GR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getEndTime(booking) {
  if (booking?.end_time) return hhmm(booking.end_time);

  const d = toDateObject(booking?.end_at);
  if (!d) return null;

  return d.toLocaleTimeString("el-GR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getDurationMinutes(booking) {
  const direct = Number(booking?.duration_minutes ?? booking?.duration ?? NaN);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const start = toDateObject(booking?.start_at);
  const end = toDateObject(booking?.end_at);

  if (!start || !end) return null;

  const mins = Math.round((end.getTime() - start.getTime()) / 60000);
  return mins > 0 ? mins : null;
}

/* -------------------------------- skeleton -------------------------------- */

function Skeleton({ className = "" }) {
  return (
    <div
      className={[
        "animate-pulse rounded-md bg-white/10",
        className,
      ].join(" ")}
    />
  );
}

function SkeletonStatBox() {
  return (
    <div className="rounded-[18px] border border-white/10 bg-[#0c1016] px-4 py-3.5 shadow-[0_8px_20px_rgba(0,0,0,0.22)]">
      <Skeleton className="h-3 w-16 mb-2" />
      <Skeleton className="h-5 w-24" />
    </div>
  );
}

function SkeletonInfoRow() {
  return (
    <div className="flex items-start gap-3">
      <Skeleton className="h-11 w-11 shrink-0 rounded-[16px]" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-3 w-20 mb-2" />
        <Skeleton className="h-5 w-32" />
      </div>
    </div>
  );
}

function BookingModalSkeleton({ onClose }) {
  return (
    <div className="animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-40" />
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/[0.04] text-white/75 transition hover:bg-white/[0.08] hover:text-white"
              aria-label="Κλείσιμο"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Status banner skeleton */}
      <div className="mb-4 flex items-center gap-3 rounded-[20px] border border-white/10 bg-white/[0.04] px-3.5 py-3">
        <Skeleton className="h-10 w-10 shrink-0 rounded-[14px]" />
        <Skeleton className="h-5 w-48" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 gap-3">
        <SkeletonStatBox />
        <SkeletonStatBox />
        <SkeletonStatBox />
        <SkeletonStatBox />
      </div>

      {/* Cards skeleton */}
      <div className="mt-4 space-y-3">
        <div className="rounded-[22px] border border-white/10 bg-[#0a0e14] px-4 py-4 shadow-[0_12px_28px_rgba(0,0,0,0.34)]">
          <div className="flex items-start justify-between gap-3">
            <SkeletonInfoRow />
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
        </div>

        <div className="rounded-[22px] border border-white/10 bg-[#0a0e14] px-4 py-4 shadow-[0_12px_28px_rgba(0,0,0,0.34)]">
          <SkeletonInfoRow />
        </div>

        <div className="rounded-[22px] border border-white/10 bg-[#0a0e14] px-4 py-4 shadow-[0_12px_28px_rgba(0,0,0,0.34)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
      </div>

      {/* Action buttons skeleton */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Skeleton className="h-[52px] rounded-[18px]" />
        <Skeleton className="h-[52px] rounded-[18px]" />
      </div>
    </div>
  );
}

/* -------------------------------- small UI -------------------------------- */

function Card({ className = "", children, meta }) {
  return (
    <div
      className={[
        "rounded-[22px] border transition-colors duration-300",
        "shadow-[0_12px_28px_rgba(0,0,0,0.34)]",
        meta?.card || "border-white/10 bg-[#0a0e14]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function StatBox({ label, value, meta }) {
  return (
    <div
      className={[
        "rounded-[18px] border px-4 py-3.5 shadow-[0_8px_20px_rgba(0,0,0,0.22)] transition-colors duration-300",
        meta?.statBox || "border-white/10 bg-[#0c1016]",
      ].join(" ")}
    >
      <p
        className={[
          "text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors duration-300",
          meta?.statLabel || "text-white",
        ].join(" ")}
      >
        {label}
      </p>
      <p
        className={[
          "mt-1.5 text-[16px] font-semibold transition-colors duration-300",
          meta?.statValue || "text-white",
        ].join(" ")}
      >
        {value || "—"}
      </p>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, meta }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={[
          "grid h-11 w-11 shrink-0 place-items-center rounded-[16px] transition-colors duration-300",
          meta?.infoIcon || "bg-[#11161f] text-white/70",
        ].join(" ")}
      >
        <Icon className="h-[18px] w-[18px]" />
      </div>

      <div className="min-w-0">
        <p
          className={[
            "text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors duration-300",
            meta?.infoLabel || "text-white",
          ].join(" ")}
        >
          {label}
        </p>
        <p
          className={[
            "mt-1 break-words text-[15px] font-semibold leading-snug transition-colors duration-300",
            meta?.infoValue || "text-white",
          ].join(" ")}
        >
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

function ActionBtn({
  tone = "neutral",
  icon: Icon,
  children,
  onClick,
  disabled = false,
}) {
  const styles = {
    decline: "border-rose-500/55 text-rose-400 hover:bg-rose-500/10",
    accept: "border-emerald-500/55 text-emerald-400 hover:bg-emerald-500/10",
    neutral: "border-white/10 text-white/80 hover:bg-white/5",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[18px] border bg-transparent px-4 py-3 text-[15px] font-semibold transition",
        "disabled:cursor-not-allowed disabled:opacity-45",
        styles[tone] || styles.neutral,
      ].join(" ")}
    >
      {Icon ? <Icon className="h-[18px] w-[18px]" /> : null}
      {children}
    </button>
  );
}

function StatusBanner({ meta, animKey }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={`${meta.key}-${animKey}`}
        initial={{ opacity: 0, y: -8, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.985 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className={[
          "mb-4 flex items-center gap-3 rounded-[20px] border px-3.5 py-3",
          meta.banner,
        ].join(" ")}
      >
        <div
          className={[
            "grid h-10 w-10 shrink-0 place-items-center rounded-[14px]",
            meta.iconWrap,
          ].join(" ")}
        >
          <meta.Icon className="h-[18px] w-[18px]" />
        </div>

        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-white">{meta.title}</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function LockedNotice({ meta }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={[
        "mt-3 rounded-[18px] border px-4 py-3 transition-colors duration-300",
        meta?.actionArea || "border-white/10 bg-white/[0.04]",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div
          className={[
            "grid h-10 w-10 shrink-0 place-items-center rounded-[14px] transition-colors duration-300",
            meta?.infoIcon || "bg-white/[0.05] text-white/80",
          ].join(" ")}
        >
          <Lock className="h-[18px] w-[18px]" />
        </div>

        <div className="min-w-0">
          <p
            className={[
              "text-[14px] font-semibold transition-colors duration-300",
              meta?.infoValue || "text-white",
            ].join(" ")}
          >
            Η αλλαγή κατάστασης είναι απενεργοποιημένη
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-white/70">
            Ο χρήστης μπορεί να βλέπει μόνο τις λεπτομέρειες της κράτησης.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function MobileSheet({ onClose, children }) {
  return (
    <div className="sm:hidden">
      <motion.button
        type="button"
        aria-label="Κλείσιμο"
        className="fixed inset-0 z-[119] bg-black/68 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 bottom-0 z-[120] max-h-[92dvh] overflow-hidden rounded-t-[30px] bg-[#06080c] shadow-[0_-24px_60px_rgba(0,0,0,0.55)]"
      >
        <div className="flex justify-center pb-3 pt-1">
          <div className="h-1.5 w-12 rounded-full bg-white/12" />
        </div>

        <div className="max-h-[calc(92dvh-22px)] overflow-y-auto px-4 pb-5">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

function DesktopModal({ onClose, children }) {
  return (
    <div className="hidden sm:block">
      <motion.button
        type="button"
        aria-label="Κλείσιμο"
        className="fixed inset-0 z-[119] bg-black/68 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <div className="fixed inset-0 z-[120] overflow-y-auto">
        <div className="flex min-h-full items-start justify-center px-4 py-6 lg:px-6 lg:py-8">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.985 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-2xl rounded-[30px] bg-[#06080c] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.55)]"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ modal content ------------------------------ */

function BookingModalContent({ booking, meta, statusAnimKey, onClose }) {
  const [expanded, setExpanded] = useState(false);

  const id = safeId(booking);
  const clientName = getClientName(booking);
  const clientEmail = getClientEmail(booking);
  const trainerName = getTrainerName(booking);
  const sessionType = getSessionType(booking);
  const start = getStartTime(booking);
  const end = getEndTime(booking);
  const duration = getDurationMinutes(booking);
  const dateText = dateLabelFromBooking(booking);
  const submittedAt = createdAtLabel(
    booking?.created_at || booking?.submitted_at
  );
  const isOnline = Boolean(booking?.is_online);
  const note =
    booking?.note ||
    booking?.notes ||
    booking?.submission_note ||
    booking?.details ||
    "";

  const showLockedNotice = meta.key === "pending";

  const header = (
    <div className="mb-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[28px] font-bold leading-tight text-white">
            Λεπτομέρειες Κράτησης
          </h3>
          <p className="mt-1 text-[13px] text-white/70">
            {dateText}
            {start !== "—" ? ` • ${start}${end ? ` - ${end}` : ""}` : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/[0.04] text-white/75 transition hover:bg-white/[0.08] hover:text-white"
          aria-label="Κλείσιμο"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {header}

      <StatusBanner meta={meta} animKey={statusAnimKey} />

      <div className="grid grid-cols-2 gap-3">
        <StatBox label="Ημερομηνία" value={dateText} meta={meta} />
        <StatBox
          label="Ώρα"
          value={start !== "—" ? `${start}${end ? ` - ${end}` : ""}` : "—"}
          meta={meta}
        />
        <StatBox
          label="Διάρκεια"
          value={duration ? `${duration} λεπτά` : "—"}
          meta={meta}
        />
        <StatBox label="Τύπος" value={isOnline ? "Online" : "Offline"} meta={meta} />
      </div>

      <div className="mt-4 space-y-3">
        <Card className="px-4 py-4" meta={meta}>
          <div className="flex items-start justify-between gap-3">
            <InfoRow icon={User} label="Πελάτης" value={clientName} meta={meta} />

            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={`${meta.key}-${statusAnimKey}-badge`}
                initial={{ opacity: 0, scale: 0.92, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -6 }}
                transition={{ duration: 0.2 }}
                className={[
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold",
                  meta.badge,
                ].join(" ")}
              >
                <meta.Icon className="h-[14px] w-[14px]" />
                {meta.label}
              </motion.span>
            </AnimatePresence>
          </div>
        </Card>

        <Card className="px-4 py-4" meta={meta}>
          <InfoRow icon={Mail} label="Email Πελάτη" value={clientEmail} meta={meta} />
        </Card>

        <Card className="overflow-hidden px-4 py-4" meta={meta}>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div>
              <p
                className={[
                  "text-[20px] font-bold transition-colors duration-300",
                  meta?.infoValue || "text-white",
                ].join(" ")}
              >
                Περισσότερες λεπτομέρειες
              </p>
              <p className="mt-1 text-[13px] text-white/70">
                Σημείωση, προπονητής, υποβολή και ιστορικό
              </p>
            </div>

            <div
              className={[
                "grid h-10 w-10 place-items-center rounded-full transition-colors duration-300",
                meta?.infoIcon || "bg-white/[0.05] text-white/70",
              ].join(" ")}
            >
              {expanded ? (
                <ChevronUp className="h-[18px] w-[18px]" />
              ) : (
                <ChevronDown className="h-[18px] w-[18px]" />
              )}
            </div>
          </button>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 18 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <div className="space-y-5">
                  <InfoRow
                    icon={isOnline ? Wifi : WifiOff}
                    label="Τύπος συνεδρίας"
                    value={sessionType}
                    meta={meta}
                  />

                  <InfoRow
                    icon={User}
                    label="Προπονητής"
                    value={trainerName}
                    meta={meta}
                  />

                  <InfoRow
                    icon={CalendarDays}
                    label="Υποβλήθηκε"
                    value={submittedAt}
                    meta={meta}
                  />

                  {id ? (
                    <InfoRow
                      icon={BadgeInfo}
                      label="ID κράτησης"
                      value={String(id)}
                      meta={meta}
                    />
                  ) : null}

                  {note ? (
                    <div
                      className={[
                        "rounded-[18px] px-3.5 py-3 transition-colors duration-300",
                        meta?.actionArea || "bg-black/20",
                      ].join(" ")}
                    >
                      <p
                        className={[
                          "text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors duration-300",
                          meta?.infoLabel || "text-white",
                        ].join(" ")}
                      >
                        Σημείωση
                      </p>
                      <p
                        className={[
                          "mt-2 whitespace-pre-wrap break-words text-[14px] leading-relaxed transition-colors duration-300",
                          meta?.infoValue || "text-white/90",
                        ].join(" ")}
                      >
                        {note}
                      </p>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <ActionBtn tone="decline" icon={Ban} onClick={() => {}} disabled>
          Απόρριψη
        </ActionBtn>

        <ActionBtn tone="accept" icon={CheckCircle2} onClick={() => {}} disabled>
          Αποδοχή
        </ActionBtn>
      </div>

      {showLockedNotice ? <LockedNotice meta={meta} /> : null}
    </>
  );
}

/* ------------------------------- component ------------------------------- */

export default function BookingModal({
  open = true,
  booking,
  trainerId,
  onClose,
  onDone,
  loading = false,
}) {
  const [localStatus, setLocalStatus] = useState("pending");
  const [statusAnimKey, setStatusAnimKey] = useState(0);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    const next = normalizeStatus(booking?.status);
    setLocalStatus((prev) => {
      if (prev !== next) setStatusAnimKey((n) => n + 1);
      return next;
    });
  }, [booking?.status]);

  useEffect(() => {
    if (!booking) return;
    setLocalStatus(normalizeStatus(booking?.status));
  }, [booking]);

  const meta = useMemo(() => statusMeta(localStatus), [localStatus]);

  if (!open || typeof document === "undefined") return null;

  const content = loading ? (
    <BookingModalSkeleton onClose={onClose} />
  ) : (
    <Suspense fallback={<BookingModalSkeleton onClose={onClose} />}>
      <BookingModalContent
        booking={booking}
        meta={meta}
        statusAnimKey={statusAnimKey}
        onClose={onClose}
      />
    </Suspense>
  );

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <MobileSheet onClose={onClose}>{content}</MobileSheet>
          <DesktopModal onClose={onClose}>{content}</DesktopModal>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

// Export skeleton for external use
export { BookingModalSkeleton };
