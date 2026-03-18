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

function mod(n, m) {
  return ((n % m) + m) % m;
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

    const estimatedHeight = 392;
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

/* ---------------- infinite wheel column ---------------- */

function InfiniteWheelColumn({
  options,
  value,
  onChange,
  formatOption,
  syncSignal,
}) {
  const ITEM_HEIGHT = 48;
  const VISIBLE_ROWS = 5;
  const CENTER_PAD = ITEM_HEIGHT * Math.floor(VISIBLE_ROWS / 2);
  const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;

  const scrollRef = useRef(null);
  const releaseTimerRef = useRef(null);
  const snapTimerRef = useRef(null);
  const programmaticRef = useRef(false);

  const repeated = useMemo(
    () => [...options, ...options, ...options],
    [options]
  );

  const baseLength = options.length;

  const scrollToRepeatedIndex = useCallback(
    (repeatedIndex, behavior = "smooth") => {
      const el = scrollRef.current;
      if (!el) return;

      programmaticRef.current = true;
      el.scrollTo({
        top: repeatedIndex * ITEM_HEIGHT,
        behavior,
      });

      window.clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = window.setTimeout(() => {
        programmaticRef.current = false;
      }, behavior === "smooth" ? 220 : 40);
    },
    []
  );

  const recenterIfNeeded = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return 0;

    const repeatedIndex = Math.round(el.scrollTop / ITEM_HEIGHT);
    let nextIndex = repeatedIndex;

    if (repeatedIndex < baseLength) {
      nextIndex = repeatedIndex + baseLength;
      el.scrollTop = nextIndex * ITEM_HEIGHT;
    } else if (repeatedIndex >= baseLength * 2) {
      nextIndex = repeatedIndex - baseLength;
      el.scrollTop = nextIndex * ITEM_HEIGHT;
    }

    return nextIndex;
  }, [baseLength]);

  const snapToNearest = useCallback(
    (behavior = "smooth") => {
      const el = scrollRef.current;
      if (!el) return;

      const repeatedIndex = recenterIfNeeded();
      const nearest = Math.round(el.scrollTop / ITEM_HEIGHT);
      const baseIndex = mod(nearest, baseLength);
      const nextValue = options[baseIndex];

      if (nextValue !== value) onChange?.(nextValue);
      scrollToRepeatedIndex(baseLength + baseIndex, behavior);
    },
    [baseLength, onChange, options, recenterIfNeeded, scrollToRepeatedIndex, value]
  );

  useEffect(() => {
    if (!syncSignal) return;

    const baseIndex = Math.max(0, options.indexOf(value));
    requestAnimationFrame(() => {
      scrollToRepeatedIndex(baseLength + baseIndex, "auto");
    });
  }, [syncSignal, value, options, baseLength, scrollToRepeatedIndex]);

  useEffect(() => {
    return () => {
      window.clearTimeout(releaseTimerRef.current);
      window.clearTimeout(snapTimerRef.current);
    };
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const repeatedIndex = recenterIfNeeded();
    const baseIndex = mod(repeatedIndex, baseLength);
    const nextValue = options[baseIndex];

    if (!programmaticRef.current && nextValue !== value) {
      onChange?.(nextValue);
    }

    window.clearTimeout(snapTimerRef.current);
    snapTimerRef.current = window.setTimeout(() => {
      snapToNearest("smooth");
    }, 90);
  }, [baseLength, onChange, options, recenterIfNeeded, snapToNearest, value]);

  return (
    <div className="relative" style={{ height: WHEEL_HEIGHT }}>
      <div className="pointer-events-none absolute inset-x-2 top-0 z-20 h-16 bg-gradient-to-b from-zinc-950 via-zinc-950/95 to-transparent" />
      <div className="pointer-events-none absolute inset-x-2 bottom-0 z-20 h-16 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent" />

      <div
        className="pointer-events-none absolute inset-x-2 top-1/2 z-20 -translate-y-1/2 rounded-2xl border border-white/12 bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_8px_24px_rgba(0,0,0,0.25)]"
        style={{ height: ITEM_HEIGHT }}
      />

      <div className="pointer-events-none absolute left-0 top-1/2 z-20 h-12 w-[3px] -translate-y-1/2 rounded-full bg-white/20" />
      <div className="pointer-events-none absolute right-0 top-1/2 z-20 h-12 w-[3px] -translate-y-1/2 rounded-full bg-white/20" />

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="tp-wheel-scroll relative h-full overflow-y-auto overscroll-contain px-2"
        style={{
          paddingTop: CENTER_PAD,
          paddingBottom: CENTER_PAD,
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {repeated.map((opt, i) => {
          const baseIndex = mod(i, baseLength);
          const active = options[baseIndex] === value;

          return (
            <button
              key={`${opt}-${i}`}
              type="button"
              onClick={() => {
                onChange?.(options[baseIndex]);
                scrollToRepeatedIndex(baseLength + baseIndex, "smooth");
              }}
              className={cn(
                "block w-full rounded-2xl px-3 text-center text-sm font-semibold tracking-[0.08em] transition-all duration-200",
                "snap-center",
                active
                  ? "scale-100 text-white"
                  : "scale-[0.96] text-white/38 hover:text-white/70"
              )}
              style={{
                height: ITEM_HEIGHT,
                lineHeight: `${ITEM_HEIGHT}px`,
              }}
            >
              {formatOption(opt)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- main component ---------------- */

export default function TimePickerInput({
  label,
  icon,
  value,
  onChange,
  dirty = false,
  minuteStep = 1,
  disabled = false,
  className = "",
  placeholder = "00:00",
}) {
  const [open, setOpen] = useState(false);

  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const isMobile = useIsMobile(640);
  const panelStyle = useFloatingPanel(triggerRef, open, {
    width: isMobile ? 340 : 390,
    gap: 10,
  });

  useClickOutside(panelRef, () => setOpen(false), open);

  const { hour, minute } = useMemo(() => parseHHMM(value), [value]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  const minutes = useMemo(() => {
    const safeStep = Math.max(1, Number(minuteStep) || 1);
    const arr = [];
    for (let i = 0; i < 60; i += safeStep) arr.push(i);
    return arr;
  }, [minuteStep]);

  const setHour = useCallback(
    (h) => onChange?.(formatHHMM(h, minute)),
    [minute, onChange]
  );

  const setMinute = useCallback(
    (m) => onChange?.(formatHHMM(hour, m)),
    [hour, onChange]
  );

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
                  initial={{ opacity: 0, y: 8, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.985 }}
                  transition={{ duration: 0.16 }}
                  style={panelStyle}
                  className="overflow-hidden rounded-[28px] border border-white/10 bg-zinc-950/98 shadow-[0_24px_80px_rgba(0,0,0,.55)] backdrop-blur-2xl"
                >
                  <style>
                    {`
                      .tp-wheel-scroll {
                        scrollbar-width: none;
                        -ms-overflow-style: none;
                      }
                      .tp-wheel-scroll::-webkit-scrollbar {
                        width: 0;
                        height: 0;
                      }
                    `}
                  </style>

                  <div className="border-b border-white/10 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                        Επιλογή ώρας
                      </div>
                      <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-white/70">
                        {value || placeholder}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-0">
                    <div className="border-r border-white/10 px-2 py-3">
                      <div className="mb-2 px-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                        Ώρα
                      </div>

                      <InfiniteWheelColumn
                        options={hours}
                        value={hour}
                        onChange={setHour}
                        syncSignal={open}
                        formatOption={(h) => pad2(h)}
                      />
                    </div>

                    <div className="px-2 py-3">
                      <div className="mb-2 px-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                        Λεπτά
                      </div>

                      <InfiniteWheelColumn
                        options={minutes}
                        value={minute}
                        onChange={setMinute}
                        syncSignal={open}
                        formatOption={(m) => pad2(m)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/10 px-3 py-3">
                    <div className="text-sm text-white/55">
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