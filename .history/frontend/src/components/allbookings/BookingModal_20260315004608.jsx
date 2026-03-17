"use client";

import React, { useEffect, useMemo, useState } from "react";
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

      shellBorder:
        "border-emerald-500/18 shadow-[0_0_0_1px_rgba(16,185,129,0.08),0_28px_80px_rgba(0,0,0,0.58)]",
      shellGlow:
        "bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.07),transparent_34%)]",

      topStrip: "from-emerald-300 via-emerald-400 to-emerald-500",
      badge:
        "border-emerald-500/35 bg-emerald-500/14 text-emerald-300 shadow-[0_0_0_1px_rgba(16,185,129,0.05)]",
      banner:
        "border-emerald-500/28 bg-emerald-500/10 text-emerald-100 shadow-[0_14px_34px_rgba(16,185,129,0.08)]",
      iconWrap:
        "bg-emerald-500/16 text-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
      card:
        "border-emerald-500/14 bg-[linear-gradient(180deg,rgba(16,185,129,0.045),rgba(255,255,255,0.02))]",
      stat:
        "border-emerald-500/12 bg-[linear-gradient(180deg,rgba(16,185,129,0.05),rgba(255,255,255,0.02))]",
      infoIcon: "bg-emerald-500/10 text-emerald-300/90",
      accentGlow: "bg-emerald-400/18",
      accentGlass:
        "from-emerald-500/18 via-emerald-400/10 to-transparent border-emerald-400/18",
      accentLine: "from-emerald-300/75 to-transparent",
      closeBtn:
        "border-emerald-400/12 bg-emerald-400/8 text-white/80 hover:bg-emerald-400/14 hover:text-white",
      detailsBox: "bg-emerald-500/[0.06] border border-emerald-500/12",
      actionAccept:
        "border-emerald-500/35 bg-emerald-500/[0.06] text-emerald-300 hover:bg-emerald-500/[0.12] hover:border-emerald-500/55",
      actionDecline:
        "border-white/10 bg-white/[0.025] text-white/70 hover:bg-white/[0.06]",
    };
  }

  if (key === "declined") {
    return {
      key,
      label: "Απορριφθείσα",
      title: "Η κράτηση απορρίφθηκε",
      Icon: Ban,

      shellBorder:
        "border-rose-500/18 shadow-[0_0_0_1px_rgba(244,63,94,0.08),0_28px_80px_rgba(0,0,0,0.58)]",
      shellGlow:
        "bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(244,63,94,0.07),transparent_34%)]",

      topStrip: "from-rose-300 via-rose-400 to-rose-500",
      badge:
        "border-rose-500/35 bg-rose-500/14 text-rose-300 shadow-[0_0_0_1px_rgba(244,63,94,0.05)]",
      banner:
        "border-rose-500/28 bg-rose-500/10 text-rose-100 shadow-[0_14px_34px_rgba(244,63,94,0.08)]",
      iconWrap:
        "bg-rose-500/16 text-rose-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
      card:
        "border-rose-500/14 bg-[linear-gradient(180deg,rgba(244,63,94,0.045),rgba(255,255,255,0.02))]",
      stat:
        "border-rose-500/12 bg-[linear-gradient(180deg,rgba(244,63,94,0.05),rgba(255,255,255,0.02))]",
      infoIcon: "bg-rose-500/10 text-rose-300/90",
      accentGlow: "bg-rose-400/18",
      accentGlass:
        "from-rose-500/18 via-rose-400/10 to-transparent border-rose-400/18",
      accentLine: "from-rose-300/75 to-transparent",
      closeBtn:
        "border-rose-400/12 bg-rose-400/8 text-white/80 hover:bg-rose-400/14 hover:text-white",
      detailsBox: "bg-rose-500/[0.06] border border-rose-500/12",
      actionAccept:
        "border-white/10 bg-white/[0.025] text-white/70 hover:bg-white/[0.06]",
      actionDecline:
        "border-rose-500/35 bg-rose-500/[0.06] text-rose-300 hover:bg-rose-500/[0.12] hover:border-rose-500/55",
    };
  }

  return {
    key,
    label: "Σε αναμονή",
    title: "Η κράτηση είναι σε αναμονή",
    Icon: Clock3,

    shellBorder:
      "border-amber-500/16 shadow-[0_0_0_1px_rgba(245,158,11,0.07),0_28px_80px_rgba(0,0,0,0.58)]",
    shellGlow:
      "bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.14),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.06),transparent_34%)]",

    topStrip: "from-amber-200 via-amber-400 to-yellow-500",
    badge:
      "border-amber-500/35 bg-amber-500/14 text-amber-300 shadow-[0_0_0_1px_rgba(245,158,11,0.05)]",
    banner:
      "border-amber-500/26 bg-amber-500/[0.09] text-amber-100 shadow-[0_14px_34px_rgba(245,158,11,0.06)]",
    iconWrap:
      "bg-amber-500/16 text-amber-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
    card:
      "border-amber-500/12 bg-[linear-gradient(180deg,rgba(245,158,11,0.04),rgba(255,255,255,0.02))]",
    stat:
      "border-amber-500/12 bg-[linear-gradient(180deg,rgba(245,158,11,0.045),rgba(255,255,255,0.02))]",
    infoIcon: "bg-amber-500/10 text-amber-300/90",
    accentGlow: "bg-amber-400/18",
    accentGlass:
      "from-amber-500/18 via-amber-400/10 to-transparent border-amber-400/18",
    accentLine: "from-amber-300/70 to-transparent",
    closeBtn:
      "border-amber-400/10 bg-amber-400/8 text-white/80 hover:bg-amber-400/14 hover:text-white",
    detailsBox: "bg-amber-500/[0.05] border border-amber-500/12",
    actionAccept:
      "border-emerald-500/28 bg-emerald-500/[0.05] text-emerald-300 hover:bg-emerald-500/[0.1] hover:border-emerald-500/45",
    actionDecline:
      "border-rose-500/28 bg-rose-500/[0.05] text-rose-300 hover:bg-rose-500/[0.1] hover:border-rose-500/45",
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

/* -------------------------------- small UI -------------------------------- */

function Card({ className = "", tone = "", children }) {
  return (
    <div
      className={[
        "rounded-[22px] border bg-[#0b1016]/95 backdrop-blur-xl",
        "shadow-[0_12px_30px_rgba(0,0,0,0.28)]",
        tone || "border-white/[0.05]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function StatBox({ label, value, tone = "" }) {
  return (
    <div
      className={[
        "rounded-[18px] border px-4 py-3.5 shadow-[0_8px_20px_rgba(0,0,0,0.22)]",
        tone || "border-white/[0.05] bg-[#0c1016]",
      ].join(" ")}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-white/58">
        {label}
      </p>
      <p className="mt-1.5 text-[16px] font-semibold text-white">
        {value || "—"}
      </p>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, iconTone = "" }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={[
          "grid h-11 w-11 shrink-0 place-items-center rounded-[16px] border border-white/[0.04]",
          iconTone || "bg-[#11161f] text-white/70",
        ].join(" ")}
      >
        <Icon className="h-[18px] w-[18px]" />
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/58">
          {label}
        </p>
        <p className="mt-1 break-words text-[15px] font-semibold leading-snug text-white">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

function ActionBtn({
  className = "",
  icon: Icon,
  children,
  onClick,
  disabled = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[18px] border px-4 py-3 text-[15px] font-semibold transition",
        "disabled:cursor-not-allowed disabled:opacity-45",
        className,
      ].join(" ")}
    >
      {Icon ? <Icon className="h-[18px] w-[18px]" /> : null}
      {children}
    </button>
  );
}

function StatusTopStrip({ meta, animKey }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={`strip-${meta.key}-${animKey}`}
        initial={{ opacity: 0, scaleX: 0.92 }}
        animate={{ opacity: 1, scaleX: 1 }}
        exit={{ opacity: 0, scaleX: 0.92 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className={[
          "absolute inset-x-0 top-0 z-[1] h-[3px] rounded-t-[28px] bg-gradient-to-r",
          meta.topStrip,
        ].join(" ")}
      />
    </AnimatePresence>
  );
}

function StatusCornerAccent({ meta, animKey }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={`corner-${meta.key}-${animKey}`}
        initial={{ opacity: 0, scale: 0.92, x: 12, y: -12 }}
        animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, x: 12, y: -12 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none absolute right-0 top-0 z-0 h-40 w-40"
      >
        <div
          className={[
            "absolute -right-5 -top-5 h-28 w-28 rounded-full blur-3xl",
            meta.accentGlow,
          ].join(" ")}
        />

        <div
          className={[
            "absolute right-0 top-0 h-24 w-24 rounded-bl-[30px] border-l border-b bg-gradient-to-bl backdrop-blur-[2px]",
            meta.accentGlass,
          ].join(" ")}
        />

        <div
          className={[
            "absolute right-0 top-0 h-[2px] w-24 bg-gradient-to-l",
            meta.accentLine,
          ].join(" ")}
        />

        <div
          className={[
            "absolute right-0 top-0 h-24 w-[2px] bg-gradient-to-b",
            meta.accentLine,
          ].join(" ")}
        />
      </motion.div>
    </AnimatePresence>
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
          <p className="mt-0.5 text-[12px] text-white/60">
            Η εμφάνιση προσαρμόζεται δυναμικά βάσει της κατάστασης.
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function LockedNotice() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="mt-3 rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-white/[0.05] text-white/80">
          <Lock className="h-[18px] w-[18px]" />
        </div>

        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-white">
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
        className="fixed inset-0 z-[119] bg-black/72 backdrop-blur-[3px]"
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
        className="fixed inset-x-0 bottom-0 z-[120] max-h-[92dvh] overflow-hidden rounded-t-[30px] border border-white/[0.05] bg-[#030508] shadow-[0_-24px_60px_rgba(0,0,0,0.65)]"
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
        className="fixed inset-0 z-[119] bg-black/72 backdrop-blur-[3px]"
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
            className="w-full max-w-2xl rounded-[30px] border border-white/[0.05] bg-[#030508] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.62)]"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- component ------------------------------- */

export default function BookingModal({
  open = true,
  booking,
  trainerId,
  onClose,
  onDone,
}) {
  const [expanded, setExpanded] = useState(false);
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
    setExpanded(false);
  }, [booking]);

  const id = safeId(booking);
  const meta = useMemo(() => statusMeta(localStatus), [localStatus]);

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

  const showLockedNotice = localStatus === "pending";

  if (!open || typeof document === "undefined") return null;

  const header = (
    <div className="relative z-[2] mb-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 pr-10">
          <div className="mb-2">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={`header-badge-${meta.key}-${statusAnimKey}`}
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className={[
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em]",
                  meta.badge,
                ].join(" ")}
              >
                <meta.Icon className="h-[14px] w-[14px]" />
                {meta.label}
              </motion.span>
            </AnimatePresence>
          </div>

          <h3 className="text-[28px] font-bold leading-tight text-white">
            Λεπτομέρειες Κράτησης
          </h3>

          <p className="mt-1 text-[13px] text-white/60">
            {dateText}
            {start !== "—" ? ` • ${start}${end ? ` - ${end}` : ""}` : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className={[
            "relative z-[3] grid h-11 w-11 shrink-0 place-items-center rounded-full border transition",
            meta.closeBtn,
          ].join(" ")}
          aria-label="Κλείσιμο"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );

  const mainContent = (
    <div
      className={[
        "relative isolate overflow-hidden rounded-[28px] border bg-[#06090d]/95 p-4 backdrop-blur-xl sm:p-5",
        meta.shellBorder,
      ].join(" ")}
    >
      <div className={["absolute inset-0 z-0", meta.shellGlow].join(" ")} />
      <div className="absolute inset-0 z-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_18%,transparent)]" />

      <StatusTopStrip meta={meta} animKey={statusAnimKey} />
      <StatusCornerAccent meta={meta} animKey={statusAnimKey} />

      <div className="relative z-[1]">
        {header}

        <StatusBanner meta={meta} animKey={statusAnimKey} />

        <div className="grid grid-cols-2 gap-3">
          <StatBox label="Ημερομηνία" value={dateText} tone={meta.stat} />
          <StatBox
            label="Ώρα"
            value={start !== "—" ? `${start}${end ? ` - ${end}` : ""}` : "—"}
            tone={meta.stat}
          />
          <StatBox
            label="Διάρκεια"
            value={duration ? `${duration} λεπτά` : "—"}
            tone={meta.stat}
          />
          <StatBox
            label="Τύπος"
            value={isOnline ? "Online" : "Offline"}
            tone={meta.stat}
          />
        </div>

        <div className="mt-4 space-y-3">
          <Card className="px-4 py-4" tone={meta.card}>
            <div className="flex items-start justify-between gap-3">
              <InfoRow
                icon={User}
                label="Πελάτης"
                value={clientName}
                iconTone={meta.infoIcon}
              />

              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={`${meta.key}-${statusAnimKey}-badge-right`}
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

          <Card className="px-4 py-4" tone={meta.card}>
            <InfoRow
              icon={Mail}
              label="Email Πελάτη"
              value={clientEmail}
              iconTone={meta.infoIcon}
            />
          </Card>

          <Card className="overflow-hidden px-4 py-4" tone={meta.card}>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <div>
                <p className="text-[20px] font-bold text-white">
                  Περισσότερες λεπτομέρειες
                </p>
                <p className="mt-1 text-[13px] text-white/60">
                  Σημείωση, προπονητής, υποβολή και ιστορικό
                </p>
              </div>

              <div className="grid h-10 w-10 place-items-center rounded-full border border-white/[0.06] bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08] hover:text-white">
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
                      iconTone={meta.infoIcon}
                    />

                    <InfoRow
                      icon={User}
                      label="Προπονητής"
                      value={trainerName}
                      iconTone={meta.infoIcon}
                    />

                    <InfoRow
                      icon={CalendarDays}
                      label="Υποβλήθηκε"
                      value={submittedAt}
                      iconTone={meta.infoIcon}
                    />

                    {id ? (
                      <InfoRow
                        icon={BadgeInfo}
                        label="ID κράτησης"
                        value={String(id)}
                        iconTone={meta.infoIcon}
                      />
                    ) : null}

                    {note ? (
                      <div className={["rounded-[18px] px-3.5 py-3", meta.detailsBox].join(" ")}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/60">
                          Σημείωση
                        </p>
                        <p className="mt-2 whitespace-pre-wrap break-words text-[14px] leading-relaxed text-white/92">
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
          <ActionBtn
            className={meta.actionDecline}
            icon={Ban}
            onClick={() => {}}
            disabled
          >
            Απόρριψη
          </ActionBtn>

          <ActionBtn
            className={meta.actionAccept}
            icon={CheckCircle2}
            onClick={() => {}}
            disabled
          >
            Αποδοχή
          </ActionBtn>
        </div>

        {showLockedNotice ? <LockedNotice /> : null}
      </div>
    </div>
  );

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <MobileSheet onClose={onClose}>{mainContent}</MobileSheet>
          <DesktopModal onClose={onClose}>{mainContent}</DesktopModal>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}