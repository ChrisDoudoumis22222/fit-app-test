"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  X,
  User as UserIcon,
  Wifi,
  WifiOff,
  Euro,
  BadgeCheck,
  Receipt,
} from "lucide-react";

/* ---------------- helpers ---------------- */
const hhmm = (t) => {
  if (!t) return "—";
  const m = String(t).match(/^(\d{1,2}:\d{2})/);
  return m?.[1] ?? String(t);
};

const toLocalDateLabel = (ymd) => {
  if (!ymd) return "—";
  const d = new Date(`${ymd}T00:00:00`);
  return d.toLocaleDateString("el-GR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function normalizeStatus(s) {
  const v = String(s || "pending").toLowerCase();
  if (["accepted", "completed"].includes(v)) return "accepted";
  if (["declined", "cancelled"].includes(v)) return "declined";
  return "pending";
}

function statusMeta(status) {
  const key = normalizeStatus(status);
  if (key === "accepted") {
    return { label: "Εγκεκριμένες/Ολοκληρωμένες", Icon: CheckCircle, tone: "emerald" };
  }
  if (key === "declined") {
    return { label: "Απορριφθείσες/Ακυρωμένες", Icon: AlertTriangle, tone: "rose" };
  }
  return { label: "Σε αναμονή", Icon: Clock, tone: "amber" };
}

function formatMoney(amount, currencyCode = "EUR") {
  const num = Number(amount);
  if (!Number.isFinite(num)) return null;
  const cc = String(currencyCode || "EUR").toUpperCase();
  if (cc !== "EUR") return `${num.toFixed(2)} ${cc}`;
  return `€${num.toFixed(2)}`;
}

function paymentMethodGR(m) {
  const v = String(m || "").toLowerCase();
  if (v === "cash") return "Μετρητά";
  if (v === "card") return "Κάρτα";
  if (v === "bank_transfer") return "Τραπεζική μεταφορά";
  if (v === "wallet") return "Ψηφιακό πορτοφόλι";
  if (v === "paypal") return "PayPal";
  return m || "—";
}

function paymentStatusGR(s) {
  const v = String(s || "unpaid").toLowerCase();
  if (v === "paid") return { label: "Πληρώθηκε", tone: "emerald" };
  if (v === "pending") return { label: "Σε εξέλιξη", tone: "amber" };
  if (v === "failed") return { label: "Απέτυχε", tone: "rose" };
  if (v === "refunded") return { label: "Επιστροφή χρημάτων", tone: "blue" };
  return { label: "Απλήρωτο", tone: "zinc" };
}

/* ---------------- UI ---------------- */
function Glass({ className = "", children }) {
  return (
    <div
      className={[
        "relative rounded-[26px] border border-white/10",
        "bg-[rgba(17,18,21,.74)] backdrop-blur-2xl",
        "shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_16px_50px_rgba(0,0,0,.5)]",
        className,
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[26px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[.06] via-white/[.02] to-transparent opacity-40" />
        <div className="absolute -top-1/2 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent opacity-35" />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

function Tile({ className = "", children }) {
  return (
    <div
      className={[
        "relative",
        "rounded-none border-0 bg-transparent shadow-none",
        "sm:rounded-[24px] sm:border sm:border-white/10",
        "sm:bg-white/[.04]",
        "sm:shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_8px_24px_rgba(0,0,0,.32)]",
        className,
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 hidden sm:block rounded-[24px] bg-gradient-to-br from-white/[.06] to-transparent opacity-25" />
      <div className="relative">{children}</div>
    </div>
  );
}

function Chip({ children, tone = "zinc", className = "" }) {
  const tones = {
    zinc: "bg-white/6 text-white/80 border-white/10",
    emerald: "bg-emerald-500/12 text-emerald-200 border-emerald-400/20",
    amber: "bg-amber-500/12 text-amber-200 border-amber-400/20",
    rose: "bg-rose-500/12 text-rose-200 border-rose-400/20",
    blue: "bg-blue-500/12 text-blue-200 border-blue-400/20",
  };

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] sm:text-xs font-semibold",
        tones[tone] || tones.zinc,
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

/* ---------------- component ---------------- */
export default function BookingModal({
  open,
  booking,
  counterpartyName,
  counterpartyAvatar,
  onClose,
}) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !booking || typeof document === "undefined") return null;

  const meta = statusMeta(booking.status);
  const statusKey = normalizeStatus(booking.status);
  const tone =
    statusKey === "accepted" ? "emerald" : statusKey === "declined" ? "rose" : "amber";

  const pay = paymentStatusGR(booking.payment_status);
  const money = formatMoney(booking.amount, booking.currency_code);
  const hasLongNote = Boolean(booking.note && String(booking.note).trim().length > 180);

  const content = (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-black/72 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4 md:p-6">
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.985 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[97vw] sm:max-w-2xl lg:max-w-3xl xl:max-w-4xl"
        >
          <Glass className="overflow-hidden px-0 py-0 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
            <div className="px-4 pt-4 pb-2 sm:px-0 sm:pt-0 sm:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 pr-2">
                  <h3 className="text-white font-bold text-[1.35rem] sm:text-2xl lg:text-[1.9rem] leading-tight">
                    Λεπτομέρειες κράτησης
                  </h3>
                  <p className="mt-1.5 text-white/60 text-[13px] sm:text-sm lg:text-base break-words">
                    {toLocalDateLabel(booking.date)} • {hhmm(booking.start_time)}–{hhmm(booking.end_time)}
                  </p>
                </div>

<button
  onClick={onClose}
  className="shrink-0 text-white/60 hover:text-white transition"
  aria-label="Κλείσιμο"
  title="Κλείσιμο"
>
  <X className="h-6 w-6" />
</button>
              </div>
            </div>

            <div className="mt-2 sm:mt-5 grid gap-3 sm:gap-4">
              <Tile className="w-full px-4 py-3.5 sm:p-4 lg:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-[20px] bg-white/6 border border-white/10 overflow-hidden grid place-items-center shrink-0">
                      {counterpartyAvatar ? (
                        <img
                          src={counterpartyAvatar}
                          alt={counterpartyName || "Χρήστης"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white/70" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-white font-semibold text-[15px] sm:text-base lg:text-lg truncate">
                        {counterpartyName || "—"}
                      </p>
                      <p className="text-white/55 text-[12px] sm:text-xs mt-1 break-all leading-relaxed">
                        ID κράτησης: <span className="text-white/75">{booking.id}</span>
                      </p>
                    </div>
                  </div>

                  <Chip tone={tone} className="self-start sm:self-center">
                    <meta.Icon className="h-3.5 w-3.5" />
                    {meta.label}
                  </Chip>
                </div>
              </Tile>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Tile className="w-full px-4 py-3.5 sm:p-4 lg:p-5 min-h-0 sm:min-h-[138px]">
                  <p className="text-white/50 text-[12px] sm:text-xs">Συνεδρία</p>
                  <p className="mt-2 text-white font-semibold text-[1.7rem] sm:text-[1.9rem] lg:text-[2.1rem] tracking-tight leading-none">
                    {hhmm(booking.start_time)}–{hhmm(booking.end_time)}
                  </p>
                  <p className="text-white/50 text-[13px] sm:text-sm mt-3 flex items-center gap-2">
                    {booking.is_online ? (
                      <>
                        <Wifi className="h-4 w-4" />
                        Online
                      </>
                    ) : (
                      <>
                        <WifiOff className="h-4 w-4" />
                        Offline
                      </>
                    )}
                  </p>
                </Tile>

                <Tile className="w-full px-4 py-3.5 sm:p-4 lg:p-5 min-h-0 sm:min-h-[138px]">
                  <p className="text-white/50 text-[12px] sm:text-xs">Πληρωμή</p>

                  <p className="mt-2 text-white font-semibold text-[1.7rem] sm:text-[1.9rem] lg:text-[2.1rem] tracking-tight leading-none break-words">
                    {money ? (
                      <span className="inline-flex items-center gap-2">
                        <Euro className="h-5 w-5 sm:h-6 sm:w-6" />
                        {money.replace("€", "")}
                      </span>
                    ) : (
                      "—"
                    )}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Chip tone={pay.tone}>
                      <BadgeCheck className="h-3.5 w-3.5" />
                      {pay.label}
                    </Chip>

                    <Chip tone="zinc">
                      <Receipt className="h-3.5 w-3.5" />
                      {paymentMethodGR(booking.payment_method)}
                    </Chip>
                  </div>
                </Tile>
              </div>

              {(booking.payment_reference || booking.paid_at) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  {booking.payment_reference && (
                    <Tile className="w-full px-4 py-3.5 sm:p-4 lg:p-5">
                      <p className="text-white/50 text-[12px] sm:text-xs">Αναφορά πληρωμής</p>
                      <p className="text-white/82 text-[13px] sm:text-sm mt-2 break-all leading-relaxed">
                        {booking.payment_reference}
                      </p>
                    </Tile>
                  )}

                  {booking.paid_at && (
                    <Tile className="w-full px-4 py-3.5 sm:p-4 lg:p-5">
                      <p className="text-white/50 text-[12px] sm:text-xs">Ημερομηνία πληρωμής</p>
                      <p className="text-white/82 text-[13px] sm:text-sm mt-2 break-words leading-relaxed">
                        {new Date(booking.paid_at).toLocaleString("el-GR")}
                      </p>
                    </Tile>
                  )}
                </div>
              )}

              {booking.note && (
                <Tile className="w-full px-4 py-3.5 sm:p-4 lg:p-5">
                  <p className="text-white/50 text-[12px] sm:text-xs">Σημείωση</p>

                  <div
                    className={[
                      "mt-2 text-white text-[13px] sm:text-sm leading-relaxed whitespace-pre-wrap break-words",
                      hasLongNote
                        ? "max-h-[120px] sm:max-h-[150px] overflow-y-auto pr-2 custom-note-scroll"
                        : "",
                    ].join(" ")}
                  >
                    {booking.note}
                  </div>
                </Tile>
              )}
            </div>
          </Glass>
        </motion.div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}