// src/components/BookingDetailsDock.jsx
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
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "../supabaseClient";

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

function toGoogleUtcStamp(date) {
  return [
    date.getUTCFullYear(),
    pad2(date.getUTCMonth() + 1),
    pad2(date.getUTCDate()),
    "T",
    pad2(date.getUTCHours()),
    pad2(date.getUTCMinutes()),
    pad2(date.getUTCSeconds()),
    "Z",
  ].join("");
}

function getGoogleCalendarUrl(data) {
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

  const clientName = data?.client?.full_name || data?.user_name || "Πελάτης";
  const trainerName =
    data?.trainer_info?.full_name || data?.trainer_name || "Προπονητής";

  const title = `Προπόνηση με ${clientName}`;

  const details = [
    `Πελάτης: ${clientName}`,
    trainerName ? `Προπονητής: ${trainerName}` : null,
    `Τύπος: ${data?.is_online ? "Online συνεδρία" : "Δια ζώσης"}`,
    data?.note ? `Σημείωση: ${data.note}` : null,
    data?.client?.email || data?.user_email
      ? `Email πελάτη: ${data?.client?.email || data?.user_email}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const location = data?.is_online ? "Online" : "Δια ζώσης";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${toGoogleUtcStamp(start)}/${toGoogleUtcStamp(end)}`,
    details,
    location,
    ctz: "Europe/Athens",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function normalizeBookingData(data) {
  if (!data) return null;

  return {
    ...data,
    client: {
      full_name:
        data?.client?.full_name ||
        data?.user_name ||
        data?.user?.full_name ||
        "Χρήστης",
      email:
        data?.client?.email ||
        data?.user_email ||
        data?.user?.email ||
        null,
      avatar_url: data?.client?.avatar_url || data?.user?.avatar_url || null,
    },
    trainer_info: {
      full_name:
        data?.trainer_info?.full_name ||
        data?.trainer_name ||
        data?.trainer?.full_name ||
        null,
      email: data?.trainer_info?.email || data?.trainer?.email || null,
      avatar_url:
        data?.trainer_info?.avatar_url || data?.trainer?.avatar_url || null,
    },
  };
}

const Glass = ({ className = "", children, accepted = false }) => (
  <motion.div
    layout
    initial={false}
    animate={
      accepted
        ? {
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,.05), 0 16px 40px rgba(16,185,129,.18)",
          }
        : {
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,.04), 0 10px 30px rgba(0,0,0,.45)",
          }
    }
    transition={{ duration: 0.35, ease: "easeOut" }}
    className={[
      "relative rounded-3xl border border-white/10",
      "bg-[rgba(17,18,21,.65)] backdrop-blur-xl",
      accepted ? "ring-1 ring-emerald-400/25" : "",
      className,
    ].join(" ")}
  >
    <div className="pointer-events-none absolute inset-0 rounded-3xl overflow-hidden">
      <motion.div
        initial={false}
        animate={{ opacity: accepted ? 0.9 : 0.4 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className={
          accepted
            ? "absolute inset-0 bg-gradient-to-br from-emerald-400/12 via-emerald-300/[0.06] to-transparent"
            : "absolute inset-0 bg-gradient-to-br from-white/[.06] via-white/[.02] to-transparent"
        }
      />
      <div className="absolute -top-1/2 left-0 right-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent opacity-50" />
      {accepted && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-emerald-400/10 to-transparent"
        />
      )}
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
    "inline-flex items-center justify-center rounded-xl font-medium transition focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-60 disabled:cursor-not-allowed";

  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-5 text-sm sm:text-base",
  };

  const variants = {
    primary:
      "bg-emerald-600/90 hover:bg-emerald-600 text-white border border-emerald-400/20 shadow-[0_6px_18px_rgba(16,185,129,.25)]",
    secondary:
      "bg-white/6 hover:bg-white/10 text-white border border-white/10",
    danger:
      "bg-rose-600/90 hover:bg-rose-600 text-white border border-rose-400/20 shadow-[0_6px_18px_rgba(244,63,94,.25)]",
    ghost:
      "bg-transparent hover:bg-white/5 text-white border border-white/10",
    calendar:
      "bg-white text-black border border-white/80 hover:bg-zinc-200 shadow-[0_12px_30px_rgba(255,255,255,.15)]",
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

const Li = ({ icon: Icon, label, value }) => (
  <li className="flex items-start gap-3">
    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-gray-500 sm:h-6 sm:w-6" />
    <div className="min-w-0">
      <p className="text-xs text-gray-500 sm:text-sm">{label}</p>
      <p className="break-words text-sm text-gray-200 sm:text-base">
        {value || "—"}
      </p>
    </div>
  </li>
);

function MobilePopup({ children, onClose }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] bg-black/75 backdrop-blur-sm sm:hidden"
      />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.985 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="fixed inset-0 z-[91] sm:hidden"
      >
        <div className="flex h-full w-full flex-col bg-[#0b0c0f]">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0b0c0f]/95 px-4 py-4 backdrop-blur">
            <h3 className="text-base font-semibold text-white">
              Λεπτομέρειες Κράτησης
            </h3>

            {onClose && (
              <button
                onClick={onClose}
                aria-label="Κλείσιμο"
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4">
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

  useEffect(() => {
    let alive = true;
    if (!id) return;

    const hasEverything =
      booking &&
      booking.date &&
      booking.start_time &&
      (booking.user_name || booking.user?.full_name) &&
      (booking.trainer_name || booking.trainer?.full_name);

    if (hasEverything) {
      setFull(normalizeBookingData(booking));
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      setErr(null);

      const query = supabase
        .from("trainer_bookings")
        .select(
          `
          id, trainer_id, user_id, date, start_time, end_time, duration_min,
          note, status, created_at, updated_at, is_online,
          user_name, user_email, trainer_name,
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

  const googleCalendarUrl = useMemo(() => getGoogleCalendarUrl(full), [full]);

  const showCalendarButton =
    !!googleCalendarUrl &&
    status !== "pending" &&
    status !== "declined" &&
    status !== "cancelled";

  const statusTone =
    {
      pending: "bg-amber-500/20 text-amber-300",
      accepted: "bg-emerald-600/20 text-emerald-300",
      declined: "bg-rose-600/20 text-rose-300",
      cancelled: "bg-rose-600/20 text-rose-300",
    }[status] || "bg-amber-500/20 text-amber-300";

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
    status === "accepted" ? CheckCircle : status === "pending" ? Clock : Ban;

  const handleActionDone = () => {
    setAccept(false);
    setDecline(false);
    setReloadKey((k) => k + 1);
    onDone?.();
  };

  const handleGoogleCalendar = () => {
    if (!googleCalendarUrl) return;
    window.open(googleCalendarUrl, "_blank", "noopener,noreferrer");
  };

  const clientAvatar =
    full?.client?.avatar_url || full?.user?.avatar_url || null;

  const innerContent = (
    <Glass accepted={status === "accepted"} className="h-fit p-4 sm:p-5">
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
                : {
                    backgroundColor: "rgba(255,255,255,0)",
                    borderColor: "rgba(255,255,255,0)",
                  }
            }
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="mb-6 flex items-center gap-4 rounded-2xl border p-3 sm:p-4"
          >
            {clientAvatar ? (
              <div className="relative shrink-0">
                <img
                  src={clientAvatar}
                  alt={full?.client?.full_name || "Χρήστης"}
                  className={`h-14 w-14 rounded-full border object-cover shadow-[0_8px_24px_rgba(0,0,0,.35)] sm:h-16 sm:w-16 ${
                    status === "accepted"
                      ? "border-emerald-300/30 ring-2 ring-emerald-300/15"
                      : "border-white/15 ring-2 ring-white/10"
                  }`}
                />
              </div>
            ) : (
              <div
                className={`grid h-14 w-14 place-items-center rounded-full border shadow-[0_8px_24px_rgba(0,0,0,.35)] shrink-0 sm:h-16 sm:w-16 ${
                  status === "accepted"
                    ? "border-emerald-300/20 bg-emerald-500/10 ring-2 ring-emerald-300/10"
                    : "border-white/10 bg-white/8 ring-2 ring-white/10"
                }`}
              >
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
                    status === "accepted"
                      ? { scale: [1, 1.05, 1] }
                      : { scale: 1 }
                  }
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className={`inline-flex rounded-lg px-2.5 py-0.5 text-xs ${statusTone}`}
                >
                  {statusLabel}
                </motion.span>

                {status === "accepted" && (
                  <motion.span
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/10 bg-emerald-500/12 px-2.5 py-0.5 text-xs text-emerald-300"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Επιβεβαιωμένη
                  </motion.span>
                )}
              </div>
            </div>
          </motion.div>

          <ul className="space-y-3 text-gray-300">
            <Li
              icon={CalendarClock}
              label="Ημερομηνία"
              value={fmtDate(full?.date)}
            />

            <Li
              icon={Clock}
              label="Ώρες"
              value={`${hhmm(full?.start_time)} – ${hhmm(full?.end_time)}`}
            />

            <Li
              icon={Clock}
              label="Διάρκεια"
              value={`${full?.duration_min ?? 0} λεπτά`}
            />

            <Li
              icon={Wifi}
              label="Τύπος"
              value={full?.is_online ? "Online συνεδρία" : "Δια ζώσης"}
            />

            {!!full?.note && (
              <Li icon={MapPin} label="Σημείωση" value={full.note} />
            )}

            <div className="my-2 h-px bg-white/10" />

            <Li
              icon={User}
              label="Πελάτης"
              value={full?.client?.full_name || full?.user_name || "—"}
            />

            {!!(full?.client?.email || full?.user_email) && (
              <Li
                icon={Mail}
                label="Email πελάτη"
                value={full?.client?.email || full?.user_email}
              />
            )}

            {!!(full?.trainer_info?.full_name || full?.trainer_name) && (
              <Li
                icon={User}
                label="Προπονητής"
                value={full?.trainer_info?.full_name || full?.trainer_name}
              />
            )}

            <div className="my-2 h-px bg-white/10" />

            <Li
              icon={CalendarClock}
              label="Υποβλήθηκε"
              value={fmtTs(
                toLocalDate(full?.created_at) ??
                  combineDateTime(full?.date, full?.start_time)
              )}
            />

            {secondLabel && full?.updated_at && (
              <Li
                icon={SecondIcon}
                label={secondLabel}
                value={fmtTs(toLocalDate(full.updated_at))}
              />
            )}
          </ul>

          <div className="mt-6 flex flex-col items-stretch justify-end gap-3 sm:flex-row sm:items-center">
            {showCalendarButton && (
              <Button
                variant="calendar"
                size="lg"
                onClick={handleGoogleCalendar}
                className="w-full gap-2.5 font-semibold sm:w-auto"
                title="Ημερολόγιο"
              >
                <CalendarPlus className="h-5 w-5" />
                Ημερολόγιο
              </Button>
            )}

            {status === "pending" && (
              <>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setDecline(true)}
                  className="w-full sm:w-auto"
                >
                  Απόρριψη
                </Button>

                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setAccept(true)}
                  className="w-full sm:w-auto"
                >
                  Αποδοχή
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </Glass>
  );

  return (
    <>
      <div className="hidden sm:block">{innerContent}</div>

      <div className="sm:hidden">
        <AnimatePresence>{<MobilePopup onClose={onClose}>{innerContent}</MobilePopup>}</AnimatePresence>
      </div>

      <AnimatePresence>
        {showAccept && (
          <Suspense fallback={null}>
            <AcceptModal
              trainerId={trainerId}
              bookingId={id}
              close={() => setAccept(false)}
              onDone={handleActionDone}
            />
          </Suspense>
        )}

        {showDecline && (
          <Suspense fallback={null}>
            <DeclineModal
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