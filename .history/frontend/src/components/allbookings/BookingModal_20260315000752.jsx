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
      badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
      banner:
        "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-200",
      iconWrap: "bg-emerald-500/14 text-emerald-300",
    };
  }

  if (key === "declined") {
    return {
      key,
      label: "Απορριφθείσα",
      title: "Η κράτηση απορρίφθηκε",
      Icon: Ban,
      badge: "border-rose-500/25 bg-rose-500/10 text-rose-300",
      banner: "border-rose-500/20 bg-rose-500/[0.08] text-rose-200",
      iconWrap: "bg-rose-500/14 text-rose-300",
    };
  }

  return {
    key,
    label: "Σε αναμονή",
    title: "Η κράτηση είναι σε αναμονή",
    Icon: Clock3,
    badge: "border-amber-500/25 bg-amber-500/10 text-amber-300",
    banner: "border-amber-500/20 bg-amber-500/[0.08] text-amber-200",
    iconWrap: "bg-amber-500/14 text-amber-300",
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

function Card({ className = "", children }) {
  return (
    <div
      className={[
        "rounded-[22px] border border-white/6 bg-[#111113]",
        "shadow-[0_14px_34px_rgba(0,0,0,0.42)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="rounded-[18px] border border-white/6 bg-[#151518] px-4 py-3.5 shadow-[0_10px_24px_rgba(0,0,0,0.26)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/62">
        {label}
      </p>
      <p className="mt-1.5 text-[16px] font-semibold text-white">
        {value || "—"}
      </p>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[16px] border border-white/6 bg-[#18181c] text-white/72">
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

function LockedNotice() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="mt-5 rounded-[22px] border border-white/8 bg-[#141417] px-4 py-4 shadow-[0_12px_28px_rgba(0,0,0,0.28)]"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[16px] border border-white/8 bg-white/[0.04] text-white/80">
          <Lock className="h-[18px] w-[18px]" />
        </div>

        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-white">
            Η αλλαγή κατάστασης δεν είναι διαθέσιμη
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-white/62">
            Ο χρήστης μπορεί μόνο να δει τις λεπτομέρειες της κράτησης. Δεν
            υπάρχει δυνατότητα αποδοχής ή απόρριψης μέσα από αυτό το modal.
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
        className="fixed inset-0 z-[119] bg-black/78 backdrop-blur-[3px]"
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
        className="fixed inset-x-0 bottom-0 z-[120] max-h-[92dvh] overflow-hidden rounded-t-[30px] border-t border-white/8 bg-[#0d0d10] shadow-[0_-24px_60px_rgba(0,0,0,0.68)]"
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
        className="fixed inset-0 z-[119] bg-black/78 backdrop-blur-[3px]"
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
            className="w-full max-w-2xl rounded-[30px] border border-white/8 bg-[#0d0d10] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.68)]"
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
  const [expanded, setExpanded] = useState(true);
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
    setExpanded(true);
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

  if (!open || typeof document === "undefined") return null;

  const header = (
    <div className="mb-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[28px] font-bold leading-tight text-white">
            Λεπτομέρειες Κράτησης
          </h3>
          <p className="mt-1 text-[13px] text-white/64">
            {dateText}
            {start !== "—" ? ` • ${start}${end ? ` - ${end}` : ""}` : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/8 bg-white/[0.04] text-white/72 transition hover:bg-white/[0.08] hover:text-white"
          aria-label="Κλείσιμο"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );

  const mainContent = (
    <>
      {header}

      <StatusBanner meta={meta} animKey={statusAnimKey} />

      <div className="grid grid-cols-2 gap-3">
        <StatBox label="Ημερομηνία" value={dateText} />
        <StatBox
          label="Ώρα"
          value={start !== "—" ? `${start}${end ? ` - ${end}` : ""}` : "—"}
        />
        <StatBox
          label="Διάρκεια"
          value={duration ? `${duration} λεπτά` : "—"}
        />
        <StatBox label="Τύπος" value={isOnline ? "Online" : "Offline"} />
      </div>

      <div className="mt-4 space-y-3">
        <Card className="px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <InfoRow icon={User} label="Πελάτης" value={clientName} />

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

        <Card className="px-4 py-4">
          <InfoRow icon={Mail} label="Email Πελάτη" value={clientEmail} />
        </Card>

        <Card className="overflow-hidden px-4 py-4">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div>
              <p className="text-[20px] font-bold text-white">
                Περισσότερες λεπτομέρειες
              </p>
              <p className="mt-1 text-[13px] text-white/64">
                Σημείωση, προπονητής, υποβολή και ιστορικό
              </p>
            </div>

            <div className="grid h-10 w-10 place-items-center rounded-full border border-white/8 bg-white/[0.04] text-white/72">
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
                  />

                  <InfoRow
                    icon={User}
                    label="Προπονητής"
                    value={trainerName}
                  />

                  <InfoRow
                    icon={CalendarDays}
                    label="Υποβλήθηκε"
                    value={submittedAt}
                  />

                  {id ? (
                    <InfoRow
                      icon={BadgeInfo}
                      label="ID κράτησης"
                      value={String(id)}
                    />
                  ) : null}

                  {note ? (
                    <div className="rounded-[18px] border border-white/6 bg-black/20 px-3.5 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/58">
                        Σημείωση
                      </p>
                      <p className="mt-2 whitespace-pre-wrap break-words text-[14px] leading-relaxed text-white/90">
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

      <LockedNotice />
    </>
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