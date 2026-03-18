"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Clock } from "lucide-react";

/* ---------------- helpers ---------------- */

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function parseHHMM(v) {
  const safe = String(v || "00:00").slice(0, 5);
  const [h, m] = safe.split(":").map((x) => parseInt(x, 10));
  return {
    hour: Number.isFinite(h) ? Math.max(0, Math.min(23, h)) : 0,
    minute: Number.isFinite(m) ? Math.max(0, Math.min(59, m)) : 0,
  };
}

function formatHHMM(h, m) {
  return `${pad2(h)}:${pad2(m)}`;
}

function useIsMobile(bp = 640) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(`(max-width:${bp - 0.02}px)`).matches
      : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia(`(max-width:${bp - 0.02}px)`);
    const onChange = (e) => setIsMobile(e.matches);

    setIsMobile(mq.matches);

    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, [bp]);

  return isMobile;
}

function useClickOutside(ref, handler, when = true) {
  useEffect(() => {
    if (!when) return;

    const onDown = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler?.();
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [ref, handler, when]);
}

function useFloatingPanel(triggerRef, open, { width = 380, gap = 10 } = {}) {
  const [style, setStyle] = useState(null);

  const update = useCallback(() => {
    if (!triggerRef.current || typeof window === "undefined") return;

    const rect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const panelWidth = Math.min(width, vw - 16);
    let left = rect.left;
    let top = rect.bottom + gap;

    if (left + panelWidth > vw - 8) left = vw - panelWidth - 8;
    if (left < 8) left = 8;

    const estimatedHeight = 360;
    const notEnoughBelow = top + estimatedHeight > vh - 8;

    if (notEnoughBelow && rect.top > estimatedHeight / 2) {
      top = Math.max(8, rect.top - gap - estimatedHeight);
    }

    setStyle({
      position: "fixed",
      top,
      left,
      width: panelWidth,
      zIndex: 2000,
    });
  }, [triggerRef, width, gap]);

  useEffect(() => {
    if (!open) return;

    update();

    const handle = () => update();
    window.addEventListener("resize", handle);
    window.addEventListener("scroll", handle, true);

    return () => {
      window.removeEventListener("resize", handle);
      window.removeEventListener("scroll", handle, true);
    };
  }, [open, update]);

  return style;
}

/* ---------------- small UI bits ---------------- */

function PickerLabel({ label, icon }) {
  if (!label) return null;

  return (
    <label className="flex items-center gap-2 text-sm font-medium text-white">
      {icon && <span className="text-white">{icon}</span>}
      {label}
    </label>
  );
}

function PickerPortal({ open, children }) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

/* ---------------- main component ---------------- */

export default function TimePickerInput({
  label,
  icon,
  value,
  onChange,
  dirty = false,
  minuteStep = 5,
  disabled = false,
  className = "",
  placeholder = "00:00",
}) {
  const [open, setOpen] = useState(false);

  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const isMobile = useIsMobile(640);
  const panelStyle = useFloatingPanel(triggerRef, open, {
    width: isMobile ? 360 : 380,
    gap: 10,
  });

  useClickOutside(panelRef, () => setOpen(false), open);

  const { hour, minute } = useMemo(() => parseHHMM(value), [value]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 60; i += minuteStep) arr.push(i);
    return arr;
  }, [minuteStep]);

  const setHour = (h) => onChange?.(formatHHMM(h, minute));
  const setMinute = (m) => onChange?.(formatHHMM(hour, m));

  return (
    <div
      className={cn(
        "space-y-2",
        dirty ? "halo rounded-2xl p-2 -m-2" : "",
        className
      )}
    >
      <PickerLabel
        label={label}
        icon={icon || <Clock className="h-4 w-4" />}
      />

      <div className="relative z-[20]">
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-2xl border border-white/20 bg-black/50 px-4 py-3 text-left text-white backdrop-blur-sm transition-all duration-200",
            "focus:border-white focus:ring-2 focus:ring-white/20 focus:outline-none",
            disabled
              ? "cursor-not-allowed opacity-60"
              : "hover:border-white/30 hover:bg-black/60"
          )}
        >
          <span className="text-base font-medium">
            {value || placeholder}
          </span>

          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80">
            <Clock className="h-4 w-4" />
          </span>
        </button>

        <PickerPortal open={open && !!panelStyle}>
          <AnimatePresence>
            {open && panelStyle && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[1990] bg-transparent"
                  onClick={() => setOpen(false)}
                />

                <motion.div
                  ref={panelRef}
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.16 }}
                  style={panelStyle}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/98 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,.55)]"
                >
                  <div className="grid grid-cols-2 border-b border-white/10">
                    <div className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
                      Ώρα
                    </div>
                    <div className="border-l border-white/10 px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
                      Λεπτά
                    </div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="max-h-64 space-y-1 overflow-y-auto p-2">
                      {hours.map((h) => {
                        const active = h === hour;

                        return (
                          <button
                            key={h}
                            type="button"
                            onClick={() => setHour(h)}
                            className={cn(
                              "w-full rounded-2xl px-3 py-2.5 text-sm font-semibold transition",
                              active
                                ? "bg-white text-black"
                                : "bg-white/[0.04] text-white hover:bg-white/[0.08]"
                            )}
                          >
                            {pad2(h)}
                          </button>
                        );
                      })}
                    </div>

                    <div className="max-h-64 space-y-1 overflow-y-auto border-l border-white/10 p-2">
                      {minutes.map((m) => {
                        const active = m === minute;

                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setMinute(m)}
                            className={cn(
                              "w-full rounded-2xl px-3 py-2.5 text-sm font-semibold transition",
                              active
                                ? "bg-white text-black"
                                : "bg-white/[0.04] text-white hover:bg-white/[0.08]"
                            )}
                          >
                            {pad2(m)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/10 px-3 py-3">
                    <div className="text-sm text-white/60">
                      Επιλεγμένο:{" "}
                      <span className="font-semibold text-white">
                        {value || placeholder}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-zinc-100"
                    >
                      ΟΚ
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </PickerPortal>
      </div>
    </div>
  );
}