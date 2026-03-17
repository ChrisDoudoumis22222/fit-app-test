"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
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
      auraPrimary: "bg-emerald-400/14",
      auraSecondary: "bg-emerald-300/8",
      auraCore: "bg-emerald-300/18",
    };
  }

  if (key === "declined") {
    return {
      key,
      label: "Απορριφθείσα",
      title: "Η κράτηση απορρίφθηκε",
      Icon: Ban,
      auraPrimary: "bg-rose-400/14",
      auraSecondary: "bg-rose-300/8",
      auraCore: "bg-rose-300/18",
    };
  }

  return {
    key,
    label: "Σε αναμονή",
    title: "Η κράτηση είναι σε αναμονή",
    Icon: Clock3,
    auraPrimary: "bg-amber-400/12",
    auraSecondary: "bg-amber-300/7",
    auraCore: "bg-amber-300/16",
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
      className={["animate-pulse rounded-md bg-zinc-700/60", className].join(" ")}
    />
  );
}

function SkeletonStatBox() {
  return (
    <div className="rounded-[18px] border border-zinc-700 bg-zinc-800 px-4 py-3.5 shadow-[0_8px_20px_rgba(0,0,0,0.28)]">
      <Skeleton className="mb-2 h-3 w-16" />
      <Skeleton className="h-5 w-24" />
    </div>
  );
}

function SkeletonInfoRow() {
  return (
    <div className="flex items-start gap-3">
      <Skeleton className="h-11 w-11 shrink-0 rounded-[16px]" />
      <div className="min-w-0 flex-1">
        <Skeleton className="mb-2 h-3 w-20" />
        <Skeleton className="h-5 w-32" />
      </div>
    </div>
  );
}

function BookingModalSkeleton({ onClose }) {
  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Skeleton className="mb-2 h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-zinc-700 bg-zinc-800 text-white/75 transition hover:bg-zinc-700 hover:text-white"
              aria-label="Κλείσιμο"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3 rounded-[20px] border border-zinc-700 bg-zinc-800 px-3.5 py-3">
        <Skeleton className="h-10 w-10 shrink-0 rounded-[14px]" />
        <Skeleton className="h-5 w-48" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SkeletonStatBox />
        <SkeletonStatBox />
        <SkeletonStatBox />
        <SkeletonStatBox />
      </div>

      <div className="mt-4 space-y-3">
        <div className="rounded-[22px] border border-zinc-700 bg-zinc-800 px-4 py-4 shadow-[0_12px_28px_rgba(0,0,0,0.38)]">
          <div className="flex items-start justify-between gap-3">
            <SkeletonInfoRow />
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
        </div>

        <div className="rounded-[22px] border border-zinc-700 bg-zinc-800 px-4 py-4 shadow-[0_12px_28px_rgba(0,0,0,0.38)]">
          <SkeletonInfoRow />
        </div>

        <div className="rounded-[22px] border border-zinc-700 bg-zinc-800 px-4 py-4 shadow-[0_12px_28px_rgba(0,0,0,0.38)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <Skeleton className="mb-2 h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Skeleton className="h-[52px] rounded-[18px]" />
        <Skeleton className="h-[52px] rounded-[18px]" />
      </div>
    </div>
  );
}

/* -------------------------------- small UI -------------------------------- */

function Card({ className = "", children }) {
  return (
    <div
      className={[
        "rounded-[22px] border border-zinc-700 bg-zinc-800 transition-colors duration-300",
        "shadow-[0_12px_28px_rgba(0,0,0,0.38)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="rounded-[18px] border border-zinc-700 bg-zinc-800 px-4 py-3.5 shadow-[0_8px_20px_rgba(0,0,0,0.28)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
        {label}
      </p>
      <p className="mt-1.5 text-[16px] font-semibold text-white">{value || "—"}</p>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[16px] border border-zinc-700 bg-zinc-700/70 text-zinc-200">
        <Icon className="h-[18px] w-[18px]" />
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
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
  tone = "neutral",
  icon: Icon,
  children,
  onClick,
  disabled = false,
}) {
  const styles = {
    decline:
      "border-zinc-700 bg-zinc-800 text-white/80 hover:bg-zinc-700",
    accept:
      "border-zinc-700 bg-zinc-800 text-white/90 hover:bg-zinc-700",
    neutral:
      "border-zinc-700 bg-zinc-800 text-white/80 hover:bg-zinc-700",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[18px] border px-4 py-3 text-[15px] font-semibold transition",
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
        className="mb-4 flex items-center gap-3 rounded-[20px] border border-zinc-700 bg-zinc-800 px-3.5 py-3"
      >
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border border-zinc-700 bg-zinc-700/70 text-zinc-100">
          <meta.Icon className="h-[18px] w-[18px]" />
        </div>

        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-white">{meta.title}</p>
          <p className="mt-0.5 text-[12px] text-zinc-400">{meta.label}</p>
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
      className="mt-3 rounded-[18px] border border-zinc-700 bg-zinc-800 px-4 py-3"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border border-zinc-700 bg-zinc-700/70 text-zinc-100">
          <Lock className="h-[18px] w-[18px]" />
        </div>

        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-white">
            Η αλλαγή κατάστασης είναι απενεργοποιημένη
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-zinc-300">
            Ο χρήστης μπορεί να βλέπει μόνο τις λεπτομέρειες της κράτησης.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------- subtle background aura ------------------------- */

function StatusAuraBackground({ meta }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={meta.key}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none absolute right-0 top-0 z-0 overflow-hidden"
      >
        <div className="relative h-[220px] w-[240px]">
          <div
            className={[
              "absolute right-[-40px] top-[-34px] h-[180px] w-[180px] rounded-full blur-3xl",
              meta.auraPrimary,
            ].join(" ")}
          />
          <div
            className={[
              "absolute right-[10px] top-[12px] h-[120px] w-[120px] rounded-full blur-2xl",
              meta.auraSecondary,
            ].join(" ")}
          />
          <div
            className={[
              "absolute right-[52px] top-[48px] h-[42px] w-[42px] rounded-full blur-xl",
              meta.auraCore,
            ].join(" ")}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ------------------------------ modal shells ------------------------------ */

function MobileSheet({ onClose, children, meta }) {
  return (
    <div className="sm:hidden">
      <motion.button
        type="button"
        aria-label="Κλείσιμο"
        className="fixed inset-0 z-[119] bg-black/90"
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
        className="fixed inset-x-0 bottom-0 z-[120] max-h-[92dvh] overflow-hidden rounded-t-[30px] border border-zinc-800 bg-black shadow-[0_-24px_80px_rgba(0,0,0,0.95)]"
      >
        <StatusAuraBackground meta={meta} />

        <div className="absolute inset-0 bg-black" />

        <div className="relative flex justify-center pb-3 pt-1">
          <div className="h-1.5 w-12 rounded-full bg-zinc-600" />
        </div>

        <div className="relative max-h-[calc(92dvh-22px)] overflow-y-auto px-4 pb-5">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

function DesktopModal({ onClose, children, meta }) {
  return (
    <div className="hidden sm:block">
      <motion.button
        type="button"
        aria-label="Κλείσιμο"
        className="fixed inset-0 z-[119] bg-black/90"
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
            className="relative w-full max-w-2xl overflow-hidden rounded-[30px] border border-zinc-800 bg-black p-5 shadow-[0_28px_90px_rgba(0,0,0,0.95)]"
          >
            <StatusAuraBackground meta={meta} />

            <div className="absolute inset-0 bg-black" />

            <div className="relative">{children}</div>
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

  return (
    <>
      <div className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[28px] font-bold leading-tight text-white">
              Λεπτομέρειες Κράτησης
            </h3>
            <p className="mt-1 text-[13px] text-zinc-400">
              {dateText}
              {start !== "—" ? ` • ${start}${end ? ` - ${end}` : ""}` : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-zinc-700 bg-zinc-800 text-white/75 transition hover:bg-zinc-700 hover:text-white"
            aria-label="Κλείσιμο"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

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
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-700/70 px-3 py-1.5 text-[11px] font-semibold text-white/90"
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
              <p className="mt-1 text-[13px] text-zinc-400">
                Σημείωση, προπονητής, υποβολή και ιστορικό
              </p>
            </div>

            <div className="grid h-10 w-10 place-items-center rounded-full border border-zinc-700 bg-zinc-700/70 text-zinc-200">
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
                    <div className="rounded-[18px] border border-zinc-700 bg-zinc-900 px-3.5 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
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
        <ActionBtn tone="decline" icon={Ban} onClick={() => {}} disabled>
          Απόρριψη
        </ActionBtn>

        <ActionBtn tone="accept" icon={CheckCircle2} onClick={() => {}} disabled>
          Αποδοχή
        </ActionBtn>
      </div>

      {showLockedNotice ? <LockedNotice /> : null}
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
          <MobileSheet onClose={onClose} meta={meta}>
            {content}
          </MobileSheet>

          <DesktopModal onClose={onClose} meta={meta}>
            {content}
          </DesktopModal>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

export { BookingModalSkeleton };