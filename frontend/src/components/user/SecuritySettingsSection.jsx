"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  AlertTriangle,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
  ShieldAlert,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../supabaseClient";

function cn(...c) {
  return c.filter(Boolean).join(" ");
}

function PageToast({ open, text, type = "success", onClose }) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => onClose?.(), 2600);
    return () => clearTimeout(t);
  }, [open, onClose]);

  const isWarning = type === "warning";
  const bg = isWarning
    ? "border-rose-400/25 bg-rose-500/15"
    : "border-emerald-400/25 bg-emerald-500/15";
  const iconWrap = isWarning ? "bg-rose-500/20" : "bg-emerald-500/20";
  const iconColor = isWarning ? "text-rose-300" : "text-emerald-300";
  const title = isWarning ? "Κάτι πήγε λάθος" : "Η ενημέρωση ολοκληρώθηκε";
  const Icon = isWarning ? AlertTriangle : CheckCircle2;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0, x: 40, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          exit={{ opacity: 0, x: 30, y: -6, scale: 0.98 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="
            fixed z-[9999]
            right-3 top-20 w-[calc(100%-24px)]
            sm:right-5 sm:top-5 sm:w-[380px]
          "
        >
          <div
            className={cn(
              "relative overflow-hidden rounded-[22px] border backdrop-blur-2xl",
              "shadow-[0_18px_50px_rgba(0,0,0,0.35)]",
              bg
            )}
          >
            <div className="pointer-events-none absolute inset-0 bg-white/[0.06]" />

            <div className="relative flex items-start gap-3 px-4 py-3.5">
              <div
                className={cn(
                  "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                  iconWrap
                )}
              >
                <Icon className={cn("h-5 w-5", iconColor)} />
              </div>

              <div className="min-w-0 flex-1 pr-2">
                <div className="text-[13px] font-semibold tracking-[-0.01em] text-white">
                  {title}
                </div>
                <div className="mt-0.5 text-sm leading-5 text-white/80">
                  {text}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onClose?.()}
                className="rounded-full p-1.5 text-white/55 transition hover:bg-white/10 hover:text-white"
                aria-label="Κλείσιμο"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 2.5, ease: "linear" }}
              className={cn(
                "h-[3px]",
                isWarning ? "bg-rose-300/80" : "bg-emerald-300/80"
              )}
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function getPasswordStrength(password) {
  const value = String(password || "");
  let score = 0;

  if (value.length >= 8) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  if (!value) {
    return {
      score: 0,
      level: "none",
      label: "—",
      activeBars: 0,
      colorClass: "bg-zinc-700",
      textClass: "text-zinc-500",
    };
  }

  if (score <= 1) {
    return {
      score,
      level: "weak",
      label: "Αδύναμος",
      activeBars: 1,
      colorClass: "bg-red-500",
      textClass: "text-red-400",
    };
  }

  if (score <= 3) {
    return {
      score,
      level: "medium",
      label: "Μέτριος",
      activeBars: 2,
      colorClass: "bg-amber-400",
      textClass: "text-amber-300",
    };
  }

  return {
    score,
    level: "strong",
    label: "Δυνατός",
    activeBars: 3,
    colorClass: "bg-emerald-500",
    textClass: "text-emerald-400",
  };
}

function PasswordStrength({ password }) {
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
          Ισχύς κωδικού
        </span>
        <span className={cn("text-xs font-semibold", strength.textClass)}>
          {strength.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => {
          const active = i < strength.activeBars;

          return (
            <div
              key={i}
              className={cn(
                "h-2 rounded-full transition-all duration-200",
                active ? strength.colorClass : "bg-white/10"
              )}
            />
          );
        })}
      </div>

      <p className="mt-2 text-xs leading-5 text-white/45">
        Για πιο δυνατό κωδικό βάλε τουλάχιστον 8 χαρακτήρες, κεφαλαία,
        πεζά, αριθμούς και σύμβολα
      </p>
    </div>
  );
}

export default function SecuritySettingsSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [saving, setSaving] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastText, setToastText] = useState("");
  const [toastType, setToastType] = useState("success");

  const showToast = useCallback((text, type = "success") => {
    setToastText(text);
    setToastType(type);
    setToastOpen(false);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setToastOpen(true);
      });
    });
  }, []);

  const isTooShort = nextPassword.length > 0 && nextPassword.length < 8;
  const passwordsMismatch =
    nextPassword.length > 0 && confirm.length > 0 && nextPassword !== confirm;
  const sameAsCurrent =
    currentPassword.length > 0 &&
    nextPassword.length > 0 &&
    currentPassword === nextPassword;

  const isFormEmpty = !currentPassword && !nextPassword && !confirm;

  const canSubmit =
    !saving &&
    !isFormEmpty &&
    currentPassword.trim().length > 0 &&
    nextPassword.length >= 8 &&
    confirm.length > 0 &&
    nextPassword === confirm &&
    currentPassword !== nextPassword;

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (!currentPassword.trim()) {
        showToast("Συμπλήρωσε τον προηγούμενο κωδικό.", "warning");
        return;
      }

      if (!nextPassword || nextPassword.length < 8) {
        showToast(
          "Ο νέος κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.",
          "warning"
        );
        return;
      }

      if (currentPassword === nextPassword) {
        showToast(
          "Ο νέος κωδικός πρέπει να είναι διαφορετικός από τον προηγούμενο.",
          "warning"
        );
        return;
      }

      if (nextPassword !== confirm) {
        showToast("Οι κωδικοί δεν ταιριάζουν.", "warning");
        return;
      }

      setSaving(true);

      try {
        const { error } = await supabase.auth.updateUser({
          password: nextPassword,
        });

        if (error) throw error;

        setCurrentPassword("");
        setNextPassword("");
        setConfirm("");
        setShowCurrent(false);
        setShowNext(false);
        setShowConfirm(false);

        showToast("Ο κωδικός πρόσβασης ενημερώθηκε με επιτυχία.", "success");
      } catch (err) {
        showToast(
          err?.message || "Δεν ήταν δυνατή η ενημέρωση του κωδικού.",
          "warning"
        );
      } finally {
        setSaving(false);
      }
    },
    [currentPassword, nextPassword, confirm, showToast]
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="w-full pb-24 sm:pb-0"
      >
        <div
          className={cn(
            "relative overflow-visible",
            "-mx-4 px-4 pb-16 sm:mx-0 sm:px-0 sm:pb-0",
            "sm:rounded-3xl",
            "sm:border sm:border-white/10 sm:bg-zinc-950/60",
            "sm:shadow-[0_12px_40px_rgba(0,0,0,0.45)] sm:backdrop-blur"
          )}
        >
          <div className="px-0 py-1 sm:p-6">
            <div className="mb-4 flex items-center gap-2 sm:mb-5">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
                <KeyRound className="h-5 w-5 text-white/85" />
              </div>

              <div>
                <div className="text-sm font-semibold text-white sm:text-base">
                  Αλλαγή κωδικού
                </div>
                <div className="text-xs text-white/55 sm:text-sm">
                  Ενημέρωση του κωδικού πρόσβασης.
                </div>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-8 sm:space-y-6">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
                  Προηγούμενος κωδικός
                </label>

                <div className="relative">
                  <input
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    type={showCurrent ? "text" : "password"}
                    className={cn(
                      "w-full rounded-2xl px-4 py-3 pr-12 text-sm text-white placeholder-white/30 outline-none transition",
                      "border border-white/10 bg-white/5",
                      "focus:bg-white/7 focus:ring-2 focus:ring-white/20",
                      saving && "cursor-not-allowed opacity-70"
                    )}
                    placeholder="Γράψε τον τωρινό σου κωδικό"
                    disabled={saving}
                  />

                  <button
                    type="button"
                    onClick={() => setShowCurrent((s) => !s)}
                    className={cn(
                      "absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-1.5 text-white/65 transition hover:bg-white/10 hover:text-white",
                      saving && "cursor-not-allowed opacity-50"
                    )}
                    disabled={saving}
                    aria-label={
                      showCurrent ? "Απόκρυψη κωδικού" : "Εμφάνιση κωδικού"
                    }
                  >
                    {showCurrent ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
                  Νέος κωδικός
                </label>

                <div className="relative">
                  <input
                    value={nextPassword}
                    onChange={(e) => setNextPassword(e.target.value)}
                    type={showNext ? "text" : "password"}
                    className={cn(
                      "w-full rounded-2xl px-4 py-3 pr-12 text-sm text-white placeholder-white/30 outline-none transition",
                      "border border-white/10 bg-white/5",
                      "focus:bg-white/7 focus:ring-2 focus:ring-white/20",
                      saving && "cursor-not-allowed opacity-70"
                    )}
                    placeholder="Τουλάχιστον 8 χαρακτήρες"
                    disabled={saving}
                  />

                  <button
                    type="button"
                    onClick={() => setShowNext((s) => !s)}
                    className={cn(
                      "absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-1.5 text-white/65 transition hover:bg-white/10 hover:text-white",
                      saving && "cursor-not-allowed opacity-50"
                    )}
                    disabled={saving}
                    aria-label={
                      showNext ? "Απόκρυψη κωδικού" : "Εμφάνιση κωδικού"
                    }
                  >
                    {showNext ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <PasswordStrength password={nextPassword} />

                {isTooShort ? (
                  <p className="mt-2 text-xs text-rose-300">
                    Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.
                  </p>
                ) : null}

                {sameAsCurrent ? (
                  <p className="mt-2 text-xs text-amber-300">
                    Ο νέος κωδικός πρέπει να είναι διαφορετικός από τον
                    προηγούμενο.
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
                  Επιβεβαίωση νέου κωδικού
                </label>

                <div className="relative">
                  <input
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    type={showConfirm ? "text" : "password"}
                    className={cn(
                      "w-full rounded-2xl px-4 py-3 pr-12 text-sm text-white placeholder-white/30 outline-none transition",
                      "border border-white/10 bg-white/5",
                      "focus:bg-white/7 focus:ring-2 focus:ring-white/20",
                      saving && "cursor-not-allowed opacity-70"
                    )}
                    placeholder="Επανάληψη νέου κωδικού"
                    disabled={saving}
                  />

                  <button
                    type="button"
                    onClick={() => setShowConfirm((s) => !s)}
                    className={cn(
                      "absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-1.5 text-white/65 transition hover:bg-white/10 hover:text-white",
                      saving && "cursor-not-allowed opacity-50"
                    )}
                    disabled={saving}
                    aria-label={
                      showConfirm ? "Απόκρυψη κωδικού" : "Εμφάνιση κωδικού"
                    }
                  >
                    {showConfirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {passwordsMismatch ? (
                  <p className="mt-2 text-xs text-rose-300">
                    Οι κωδικοί δεν ταιριάζουν.
                  </p>
                ) : null}
              </div>



              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={cn(
                    "inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition sm:w-auto",
                    canSubmit
                      ? "bg-white text-black hover:bg-white/90"
                      : "cursor-not-allowed bg-zinc-600 text-zinc-300"
                  )}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Αποθήκευση...
                    </>
                  ) : (
                    "Ενημέρωση"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>

      <PageToast
        open={toastOpen}
        text={toastText}
        type={toastType}
        onClose={() => setToastOpen(false)}
      />
    </>
  );
}