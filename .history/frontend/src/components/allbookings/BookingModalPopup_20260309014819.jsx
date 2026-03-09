"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Wifi,
  X,
  CheckCircle2,
  Mail,
  CalendarIcon,
  Clock,
  AlertTriangle,
  Calendar as CalendarPlus,
  ExternalLink,
  MapPin,
} from "lucide-react";

const LOGO_URL =
  "https://peakvelocity.gr/wp-content/uploads/2024/03/Logo-chris-black-1.png";

const cn = (...classes) => classes.filter(Boolean).join(" ");

const fmtDate = (d) => {
  if (!d) return "";
  try {
    return new Date(`${d}T00:00:00`).toLocaleDateString("el-GR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return d;
  }
};

const fmtTime = (t) => {
  if (!t) return "";
  return String(t).slice(0, 5);
};

const generateGoogleCalendarUrl = (booking) => {
  const { date, start_time, end_time, trainerName, is_online } = booking;

  const [year, month, day] = date.split("-").map(Number);
  const [startHour, startMin] = start_time.split(":").map(Number);
  const [endHour, endMin] = end_time.split(":").map(Number);

  const formatDateTime = (y, m, d, h, min) =>
    `${y}${String(m).padStart(2, "0")}${String(d).padStart(
      2,
      "0"
    )}T${String(h).padStart(2, "0")}${String(min).padStart(2, "0")}00`;

  const startDateTime = formatDateTime(year, month, day, startHour, startMin);
  const endDateTime = formatDateTime(year, month, day, endHour, endMin);

  const title = encodeURIComponent(`Προπόνηση με ${trainerName}`);
  const details = encodeURIComponent(
    is_online
      ? "Online συνεδρία προπόνησης. Θα λάβετε σύνδεσμο πριν την έναρξη."
      : "Προσωπική συνεδρία προπόνησης."
  );
  const location = encodeURIComponent(is_online ? "Online" : "Γυμναστήριο");

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateTime}/${endDateTime}&details=${details}&location=${location}`;
};

function ActionButton({
  children,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
  disabled = false,
}) {
  const base =
    "inline-flex h-11 sm:h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 text-[14px] sm:text-[15px] font-semibold transition-all duration-200 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50";

  const variants = {
    primary:
      "bg-white text-black hover:bg-zinc-100 shadow-[0_8px_24px_rgba(255,255,255,0.10)]",
    secondary:
      "border border-white/10 bg-transparent text-zinc-300 hover:border-white/20 hover:text-white",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

function CompactInfoItem({ icon, label, value }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 text-zinc-500">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-zinc-300">
          {icon}
        </span>
        <span className="truncate text-[10px] font-medium uppercase tracking-[0.14em]">
          {label}
        </span>
      </div>

      <div className="mt-2 truncate pl-9 text-[13px] font-medium text-white sm:text-[14px]">
        {value}
      </div>
    </div>
  );
}

export default function BookingModalPopup({
  isOpen,
  status = "success",
  onClose,
  onCancel,
  bookingDetails,
  trainerName = "Προπονητής",
  errorMessage,
}) {
  const [mounted, setMounted] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const handleGoogleCalendar = () => {
    if (!bookingDetails) return;

    const url = generateGoogleCalendarUrl({
      date: bookingDetails.date,
      start_time: bookingDetails.start_time,
      end_time: bookingDetails.end_time,
      trainerName,
      is_online: bookingDetails.is_online,
    });

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCancel = () => {
    onCancel?.();
    onClose?.();
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            type="button"
            aria-label="Κλείσιμο"
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-confirmation-title"
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.985 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: "calc(100dvh - 24px)" }}
            className={cn(
              "relative w-full overflow-hidden rounded-[28px] border border-white/10 bg-zinc-950/95 shadow-[0_24px_70px_rgba(0,0,0,0.82)]",
              status === "success"
                ? "max-w-[400px] sm:max-w-[500px]"
                : "max-w-[380px] sm:max-w-[430px]"
            )}
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_42%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02),rgba(0,0,0,0.30))]" />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Κλείσιμο"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative z-10 max-h-[calc(100dvh-24px)] overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
              <div className="mb-4 flex justify-center sm:mb-5">
                {!logoFailed ? (
                  <div className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 sm:px-6 sm:py-4">
                    <img
                      src={LOGO_URL}
                      alt="Peak Velocity"
                      onError={() => setLogoFailed(true)}
                      className="h-11 w-auto object-contain brightness-0 sm:h-12"
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl bg-white px-5 py-3 font-semibold text-black sm:px-6 sm:py-4">
                    Peak Velocity
                  </div>
                )}
              </div>

              <div className="mb-4 flex justify-center sm:mb-5">
                <div
                  className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-2xl ring-1 sm:h-[70px] sm:w-[70px]",
                    status === "success"
                      ? "bg-emerald-500/12 text-emerald-300 ring-emerald-500/20"
                      : "bg-red-500/12 text-red-300 ring-red-500/20"
                  )}
                >
                  {status === "success" ? (
                    <CheckCircle2 className="h-8 w-8 sm:h-9 sm:w-9" />
                  ) : (
                    <AlertTriangle className="h-8 w-8 sm:h-9 sm:w-9" />
                  )}
                </div>
              </div>

              <h2
                id="booking-confirmation-title"
                className="text-center text-xl font-bold leading-tight text-white sm:text-2xl"
              >
                {status === "success"
                  ? "Η κράτηση καταχωρήθηκε"
                  : "Η κράτηση δεν ολοκληρώθηκε"}
              </h2>

              <p className="mx-auto mt-2 max-w-[34ch] text-center text-[13px] leading-relaxed text-zinc-400 sm:text-sm">
                {status === "success"
                  ? "Το αίτημά σου στάλθηκε επιτυχώς. Δες τις βασικές πληροφορίες παρακάτω."
                  : errorMessage || "Κάτι πήγε στραβά. Δοκίμασε ξανά σε λίγο."}
              </p>

              {status === "success" && bookingDetails ? (
                <>
                  <div className="mt-5 rounded-2xl bg-white/[0.04] p-3.5 sm:mt-6 sm:p-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                      <CompactInfoItem
                        icon={<CalendarIcon className="h-4 w-4" />}
                        label="Ημερομηνία"
                        value={fmtDate(bookingDetails.date)}
                      />

                      <CompactInfoItem
                        icon={<Clock className="h-4 w-4" />}
                        label="Ώρα"
                        value={`${fmtTime(bookingDetails.start_time)} - ${fmtTime(
                          bookingDetails.end_time
                        )}`}
                      />

                      <CompactInfoItem
                        icon={
                          bookingDetails.is_online ? (
                            <Wifi className="h-4 w-4" />
                          ) : (
                            <MapPin className="h-4 w-4" />
                          )
                        }
                        label="Τύπος"
                        value={
                          bookingDetails.is_online
                            ? "Online"
                            : "Δια ζώσης"
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-white/[0.04] px-3.5 py-3.5 sm:mt-5 sm:px-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-zinc-300">
                        <Mail className="h-4 w-4" />
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-white">
                          Επιβεβαίωση μέσω email
                        </div>
                        <div className="mt-1 text-[13px] leading-relaxed text-zinc-400 sm:text-sm">
                          Θα λάβεις ενημέρωση στο email σου μέσα στις επόμενες
                          ώρες.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-2.5 sm:mt-6 sm:space-y-3">
                    <ActionButton
                      onClick={handleGoogleCalendar}
                      variant="primary"
                    >
                      <CalendarPlus className="h-4 w-4 opacity-80" />
                      <span>Προσθήκη στο Google Calendar</span>
                      <ExternalLink className="h-4 w-4 opacity-60" />
                    </ActionButton>

                    <ActionButton onClick={handleCancel} variant="secondary">
                      <X className="h-4 w-4" />
                      <span>Ακύρωση κράτησης</span>
                    </ActionButton>
                  </div>

                  <div className="mt-4 border-t border-white/10 pt-3 sm:mt-5 sm:pt-4">
                    <p className="text-center text-[11px] leading-relaxed text-zinc-500 sm:text-xs">
                      Η κράτησή σου έχει καταχωρηθεί και βρίσκεται σε αναμονή
                      επιβεβαίωσης.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-5 rounded-2xl bg-white/[0.04] px-4 py-4 sm:mt-6">
                    <div className="text-center text-sm leading-relaxed text-zinc-300">
                      Δεν ήταν δυνατή η ολοκλήρωση της ενέργειας αυτή τη στιγμή.
                    </div>
                  </div>

                  <div className="mt-5 space-y-2.5 sm:mt-6 sm:space-y-3">
                    <ActionButton onClick={onClose} variant="primary">
                      Δοκίμασε ξανά
                    </ActionButton>

                    <ActionButton onClick={onClose} variant="secondary">
                      <X className="h-4 w-4" />
                      <span>Κλείσιμο</span>
                    </ActionButton>
                  </div>

                  <div className="mt-4 border-t border-white/10 pt-3 sm:mt-5 sm:pt-4">
                    <p className="text-center text-[11px] leading-relaxed text-zinc-500 sm:text-xs">
                      Αν το πρόβλημα παραμένει, δοκίμασε ξανά αργότερα.
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}