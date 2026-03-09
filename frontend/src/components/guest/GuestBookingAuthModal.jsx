// FILE: src/components/guest/GuestBookingAuthModal.jsx
"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Shield, ArrowRight, X, Check, LogIn } from "lucide-react";

const LOGO_URL =
  "https://peakvelocity.gr/wp-content/uploads/2024/03/Logo-chris-black-1.png";

const benefits = [
  "Ασφαλής διαχείριση κρατήσεων",
  "Άμεση επιβεβαίωση",
  "Εύκολες αλλαγές αργότερα",
];

function ActionButton({ children, onClick, variant = "primary" }) {
  const base =
    "w-full h-11 sm:h-12 inline-flex items-center justify-center gap-2 " +
    "rounded-2xl text-[14px] sm:text-[15px] font-semibold transition-all duration-200 " +
    "active:scale-[0.985]";

  const variants = {
    primary:
      "bg-white text-black hover:bg-zinc-100 shadow-[0_8px_24px_rgba(255,255,255,0.12)]",
    secondary:
      "border border-white/10 bg-transparent text-zinc-300 hover:border-white/20 hover:text-white",
  };

  return (
    <button type="button" onClick={onClick} className={`${base} ${variants[variant]}`}>
      {children}
    </button>
  );
}

export default function GuestBookingAuthModal({
  open = false,
  onClose,
  onNavigate,
  nextPath = "/",
  authPath = "/signup",
  title = "Απαιτείται σύνδεση",
  description = "Για να ολοκληρώσεις την κράτησή σου, πρέπει πρώτα να συνδεθείς ή να δημιουργήσεις λογαριασμό.",
}) {
  const navigate = useNavigate();
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    if (!open) return;

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
  }, [open, onClose]);

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
      {open && (
        <motion.div
          className="fixed inset-0 z-[220] flex items-center justify-center p-3 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            onClick={onClose}
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
            style={{ maxHeight: "calc(100dvh - 24px)" }}
            className="
              relative w-full max-w-[380px] sm:max-w-md
              overflow-hidden rounded-[28px]
              border border-white/10 bg-zinc-950/95
              shadow-[0_24px_70px_rgba(0,0,0,0.82)]
            "
          >
            {/* subtle glow */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_42%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02),rgba(0,0,0,0.32))]" />
            </div>

            {/* close */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-20 text-zinc-400 transition-colors hover:text-white"
              aria-label="Κλείσιμο"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative z-10 px-4 py-4 sm:px-6 sm:py-6">
              {/* logo */}
              <div className="mb-3 flex justify-center sm:mb-4">
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

              

              {/* title */}
              <h2
                id="guest-booking-auth-title"
                className="mb-2 text-center text-xl font-bold leading-tight text-white sm:mb-3 sm:text-2xl"
              >
                {title}
              </h2>

              {/* description */}
              <p className="mx-auto mb-4 max-w-[30ch] text-center text-[13px] leading-relaxed text-zinc-400 sm:mb-5 sm:text-sm">
                {description}
              </p>

              {/* benefits */}
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

              {/* buttons */}
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

              {/* footer */}
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