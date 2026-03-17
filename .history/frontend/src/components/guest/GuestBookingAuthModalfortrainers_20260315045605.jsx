// FILE: src/components/guest/GuestBookingAuthModalfortrainers.jsx
"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  X,
  Check,
  LogIn,
  CalendarDays,
  Clock,
  MapPin,
  Wifi,
  Lock,
} from "lucide-react";

const LOGO_URL =
  "https://peakvelocity.gr/wp-content/uploads/2024/03/Logo-chris-black-1.png";

const benefits = [
  "Ασφαλής διαχείριση κρατήσεων",
  "Άμεση επιβεβαίωση",
  "Εύκολες αλλαγές αργότερα",
];

const hhmm = (t) =>
  String(t || "").match(/^(\d{1,2}:\d{2})/)?.[1] ?? String(t || "");

const fmtDateShort = (d) => {
  if (!d) return "";
  try {
    return new Date(`${d}T00:00:00`).toLocaleDateString("el-GR", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return d;
  }
};

const cn = (...classes) => classes.filter(Boolean).join(" ");

function ActionButton({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled = false,
}) {
  const base =
    "w-full h-11 sm:h-12 inline-flex items-center justify-center gap-2 " +
    "rounded-2xl text-[14px] sm:text-[15px] font-semibold transition-all duration-200 " +
    "active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50";

  const variants = {
    primary:
      "bg-white text-black hover:bg-zinc-100 shadow-[0_8px_24px_rgba(255,255,255,0.12)]",
    secondary:
      "border border-white/10 bg-transparent text-zinc-300 hover:border-white/20 hover:text-white",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export default function GuestBookingAuthModal({
  open = false,
  isOpen,
  onClose,
  onNavigate,
  nextPath = "/",
  authPath = "/signup",
  title = "Απαιτείται σύνδεση",
  description = "Για να ολοκληρώσεις την κράτησή σου, πρέπει πρώτα να συνδεθείς ή να δημιουργήσεις λογαριασμό.",
  trainerName = "Προπονητής",
  bookingDetails = null,
  embedded = false,
  closeOnBackdrop = true,
}) {
  const navigate = useNavigate();
  const [logoFailed, setLogoFailed] = useState(false);

  const visible = open ?? isOpen ?? false;

  useEffect(() => {
    if (!visible) return;

    const handleEscape = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleEscape);

    if (!embedded) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      return () => {
        document.body.style.overflow = previousOverflow;
        window.removeEventListener("keydown", handleEscape);
      };
    }

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [visible, onClose, embedded]);

  const handleGoToAuth = () => {
    const safeNext =
      nextPath ||
      `${window.location.pathname}${window.location.search}${window.location.hash}`;

    const target = `${authPath}?next=${encodeURIComponent(safeNext)}`;

    onClose?.();

    if (typeof onNavigate === "function") {
      onNavigate(target);
    } else {
      navigate(target);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={cn(
            embedded
              ? "absolute inset-0 z-[140] flex items-center justify-center rounded-[inherit] p-3 sm:p-4"
              : "fixed inset-0 z-[220] flex items-center justify-center p-3 sm:p-4"
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={cn(
              "absolute inset-0",
              embedded
                ? "rounded-[inherit] bg-black/45 backdrop-blur-md"
                : "bg-black/85 backdrop-blur-md"
            )}
            onClick={closeOnBackdrop ? onClose : undefined}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="guest-booking-auth-title"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxHeight: embedded ? "min(92%, 720px)" : "calc(100dvh - 24px)",
            }}
            className={cn(
              "relative w-full overflow-hidden rounded-[28px]",
              embedded ? "max-w-[360px] sm:max-w-[380px]" : "max-w-[380px] sm:max-w-md",
              "border border-white/10 bg-zinc-950/88 backdrop-blur-2xl",
              "shadow-[0_24px_70px_rgba(0,0,0,0.82)]"
            )}
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_42%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02),rgba(0,0,0,0.32))]" />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-white"
              aria-label="Κλείσιμο"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative z-10 px-4 py-4 sm:px-6 sm:py-6">
              <div className="mb-4 flex items-center justify-center">
                {!logoFailed ? (
                  <div className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 sm:px-6 sm:py-4">
                    <img
                      src={LOGO_URL}
                      alt="Peak Velocity"
                      onError={() => setLogoFailed(true)}
                      className="h-12 w-auto object-contain brightness-0 sm:h-14"
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl bg-white px-5 py-3 font-semibold text-black sm:px-6 sm:py-4">
                    Peak Velocity
                  </div>
                )}
              </div>

              <div className="mb-4 flex items-center justify-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-black shadow-[0_10px_24px_rgba(255,255,255,0.14)]">
                  <Lock className="h-5 w-5" />
                </div>
              </div>

              <h2
                id="guest-booking-auth-title"
                className="mb-2 text-center text-xl font-bold leading-tight text-white sm:mb-3 sm:text-2xl"
              >
                {title}
              </h2>

              <p className="mx-auto mb-4 max-w-[34ch] text-center text-[13px] leading-relaxed text-zinc-400 sm:mb-5 sm:text-sm">
                {description}
              </p>

              {bookingDetails && (
                <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Επιλεγμένο ραντεβού
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-xl bg-white/[0.06] p-2">
                        <CalendarDays className="h-4 w-4 text-zinc-300" />
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500">Ημερομηνία</div>
                        <div className="text-sm font-semibold text-white">
                          {fmtDateShort(bookingDetails.date)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-xl bg-white/[0.06] p-2">
                        <Clock className="h-4 w-4 text-zinc-300" />
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500">Ώρα</div>
                        <div className="text-sm font-semibold text-white">
                          {hhmm(bookingDetails.start_time)} -{" "}
                          {hhmm(bookingDetails.end_time)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-xl bg-white/[0.06] p-2">
                        {bookingDetails.is_online ? (
                          <Wifi className="h-4 w-4 text-zinc-300" />
                        ) : (
                          <MapPin className="h-4 w-4 text-zinc-300" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500">Τύπος</div>
                        <div className="text-sm font-semibold text-white">
                          {bookingDetails.is_online ? "Online" : "Δια ζώσης"}
                        </div>
                      </div>
                    </div>

                    {trainerName ? (
                      <div className="pt-1 text-xs text-zinc-500">
                        με <span className="font-medium text-zinc-300">{trainerName}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              <div className="mb-4 space-y-2.5 sm:mb-5 sm:space-y-3">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-2.5">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.08]">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-[13px] text-zinc-300 sm:text-sm">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2.5 sm:space-y-3">
                <ActionButton onClick={handleGoToAuth} variant="primary">
                  <LogIn className="h-4 w-4 opacity-80" />
                  <span>Σύνδεση / Εγγραφή</span>
                  <ArrowRight className="h-4 w-4 opacity-80" />
                </ActionButton>

                <ActionButton onClick={onClose} variant="secondary">
                  <X className="h-4 w-4" />
                  <span>Ακύρωση</span>
                </ActionButton>
              </div>

              <div className="mt-4 border-t border-white/10 pt-3 sm:mt-5 sm:pt-4">
                <p className="text-center text-[11px] leading-relaxed text-zinc-500 sm:text-xs">
                  Η σύνδεση βοηθά στην ασφαλή διαχείριση των κρατήσεων.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}