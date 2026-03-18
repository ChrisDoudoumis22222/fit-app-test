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
import { Clock3, ChevronUp, ChevronDown } from "lucide-react";

/* ---------------- helpers ---------------- */

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function parseTime(value) {
  const [h, m] = String(value || "09:00").split(":").map(Number);
  return {
    hour: Number.isFinite(h) ? h : 9,
    minute: Number.isFinite(m) ? m : 0,
  };
}

function toTimeString(hour, minute) {
  return `${pad2(hour)}:${pad2(minute)}`;
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

function useFloatingPanel(triggerRef, open, { width = 340, gap = 8 } = {}) {
  const [style, setStyle] = useState(null);

  const update = useCallback(() => {
    if (!triggerRef.current || typeof window === "undefined") return;

    const rect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;

    const panelWidth = Math.min(width, vw - 16);
    let left = rect.left;
    const top = rect.bottom + gap;

    if (left + panelWidth > vw - 8) left = vw - panelWidth - 8;
    if (left < 8) left = 8;

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

function PickerPortal({ open, children }) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

/* ---------------- wheel constants ---------------- */

const ITEM_HEIGHT = 40;
const VISIBLE_ROWS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const CENTER_OFFSET = ITEM_HEIGHT * Math.floor(VISIBLE_ROWS / 2);

/* ---------------- wheel column ---------------- */

function WheelColumn({
  label,
  items,
  selectedValue,
  onSelect,
  innerRef,
  onIncrement,
  onDecrement,
  onScrollEnd,
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/34">
          {label}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onIncrement}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08] hover:text-white"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDecrement}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08] hover:text-white"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          className="pointer-events-none absolute left-0 right-0 z-[3] rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(110,110,120,0.22),rgba(80,80,90,0.18))] shadow-[0_8px_30px_rgba(0,0,0,.22),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md"
          style={{
            top: CENTER_OFFSET,
            height: ITEM_HEIGHT,
          }}
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-[4] h-10 rounded-t-[18px] bg-gradient-to-b from-zinc-950 via-zinc-950/85 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] h-10 rounded-b-[18px] bg-gradient-to-t from-zinc-950 via-zinc-950/85 to-transparent" />

        <div
          ref={innerRef}
          onScroll={onScrollEnd}
          className="timepicker-scroll relative z-[2] overflow-y-auto overscroll-contain snap-y snap-mandatory"
          style={{
            height: WHEEL_HEIGHT,
            paddingTop: CENTER_OFFSET,
            paddingBottom: CENTER_OFFSET,
            WebkitOverflowScrolling: "touch",
            scrollBehavior: "smooth",
          }}
        >
          {items.map((item) => {
            const selected = item === selectedValue;

            return (
              <button
                key={item}
                type="button"
                onClick={() => onSelect(item)}
                className={cn(
                  "flex w-full snap-center items-center justify-center rounded-2xl text-base font-semibold tracking-[0.02em] transition-all duration-150",
                  selected
                    ? "text-white"
                    : "text-[#7d7d86] hover:text-[#bcbcc5]"
                )}
                style={{ height: ITEM_HEIGHT }}
              >
                {pad2(item)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------- component ---------------- */

export default function QuickBookTimePicker({
  value,
  onChange,
  disabled = false,
  className = "",
  buttonClassName = "",
  minuteStep = 15,
  placeholder = "Επιλογή ώρας",
}) {
  const [open, setOpen] = useState(false);

  const minuteOptions = useMemo(() => {
    const step = Math.max(1, Math.min(60, minuteStep));
    const list = [];
    for (let m = 0; m < 60; m += step) list.push(m);
    return list;
  }, [minuteStep]);

  const hourOptions = useMemo(
    () => Array.from({ length: 24 }, (_, i) => i),
    []
  );

  const normalizeMinute = useCallback(
    (minute) => {
      if (minuteOptions.includes(minute)) return minute;
      return minuteOptions.reduce((closest, current) => {
        return Math.abs(current - minute) < Math.abs(closest - minute)
          ? current
          : closest;
      }, minuteOptions[0] ?? 0);
    },
    [minuteOptions]
  );

  const [draftHour, setDraftHour] = useState(() => parseTime(value).hour);
  const [draftMinute, setDraftMinute] = useState(() =>
    normalizeMinute(parseTime(value).minute)
  );

  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const hourWheelRef = useRef(null);
  const minuteWheelRef = useRef(null);
  const hourScrollTimer = useRef(null);
  const minuteScrollTimer = useRef(null);

  const isMobile = useIsMobile(640);

  const desktopPanelStyle = useFloatingPanel(triggerRef, open && !isMobile, {
    width: 332,
    gap: 8,
  });

  const panelStyle = isMobile
    ? {
        position: "fixed",
        left: 8,
        right: 8,
        bottom: 8,
        zIndex: 2000,
      }
    : desktopPanelStyle;

  useClickOutside(panelRef, () => setOpen(false), open && !isMobile);

  useEffect(() => {
    const parsed = parseTime(value);
    setDraftHour(parsed.hour);
    setDraftMinute(normalizeMinute(parsed.minute));
  }, [value, normalizeMinute]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const commitValue = useCallback(
    (hour, minute) => {
      onChange?.(toTimeString(hour, minute));
    },
    [onChange]
  );

  const scrollWheelToValue = useCallback((ref, items, selected) => {
    const el = ref.current;
    if (!el) return;

    const index = items.indexOf(selected);
    if (index < 0) return;

    el.scrollTo({
      top: index * ITEM_HEIGHT,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    if (!open) return;

    const id = setTimeout(() => {
      scrollWheelToValue(hourWheelRef, hourOptions, draftHour);
      scrollWheelToValue(minuteWheelRef, minuteOptions, draftMinute);
    }, 20);

    return () => clearTimeout(id);
  }, [
    open,
    draftHour,
    draftMinute,
    hourOptions,
    minuteOptions,
    scrollWheelToValue,
  ]);

  const snapWheel = useCallback((ref, items, onPicked) => {
    const el = ref.current;
    if (!el || !items.length) return;

    const rawIndex = Math.round(el.scrollTop / ITEM_HEIGHT);
    const index = clamp(rawIndex, 0, items.length - 1);
    const nextValue = items[index];

    el.scrollTo({
      top: index * ITEM_HEIGHT,
      behavior: "smooth",
    });

    onPicked(nextValue);
  }, []);

  const handleHourWheelScroll = () => {
    clearTimeout(hourScrollTimer.current);
    hourScrollTimer.current = setTimeout(() => {
      snapWheel(hourWheelRef, hourOptions, (nextHour) => {
        setDraftHour(nextHour);
        commitValue(nextHour, draftMinute);
      });
    }, 80);
  };

  const handleMinuteWheelScroll = () => {
    clearTimeout(minuteScrollTimer.current);
    minuteScrollTimer.current = setTimeout(() => {
      snapWheel(minuteWheelRef, minuteOptions, (nextMinute) => {
        setDraftMinute(nextMinute);
        commitValue(draftHour, nextMinute);
      });
    }, 80);
  };

  useEffect(() => {
    return () => {
      clearTimeout(hourScrollTimer.current);
      clearTimeout(minuteScrollTimer.current);
    };
  }, []);

  const nudgeHour = (delta) => {
    setDraftHour((prev) => {
      const next = (prev + delta + 24) % 24;
      commitValue(next, draftMinute);
      requestAnimationFrame(() =>
        scrollWheelToValue(hourWheelRef, hourOptions, next)
      );
      return next;
    });
  };

  const nudgeMinute = (delta) => {
    setDraftMinute((prev) => {
      const idx = minuteOptions.indexOf(prev);
      const safeIdx = idx >= 0 ? idx : 0;
      const nextIdx =
        (safeIdx + delta + minuteOptions.length) % minuteOptions.length;
      const nextMinute = minuteOptions[nextIdx];
      commitValue(draftHour, nextMinute);
      requestAnimationFrame(() =>
        scrollWheelToValue(minuteWheelRef, minuteOptions, nextMinute)
      );
      return nextMinute;
    });
  };

  const handleSelectHour = (hour) => {
    setDraftHour(hour);
    commitValue(hour, draftMinute);
    scrollWheelToValue(hourWheelRef, hourOptions, hour);
  };

  const handleSelectMinute = (minute) => {
    setDraftMinute(minute);
    commitValue(draftHour, minute);
    scrollWheelToValue(minuteWheelRef, minuteOptions, minute);
  };

  const handleNow = () => {
    const now = new Date();
    let hour = now.getHours();
    let minute = minuteOptions.find((m) => m >= now.getMinutes());

    if (minute == null) {
      minute = minuteOptions[0] ?? 0;
      hour = (hour + 1) % 24;
    }

    setDraftHour(hour);
    setDraftMinute(minute);
    commitValue(hour, minute);

    requestAnimationFrame(() => {
      scrollWheelToValue(hourWheelRef, hourOptions, hour);
      scrollWheelToValue(minuteWheelRef, minuteOptions, minute);
    });
  };

  const handleDone = () => {
    commitValue(draftHour, draftMinute);
    setOpen(false);
  };

  const displayValue = value || placeholder;

  return (
    <div className={cn("relative z-[20]", className)}>
      <style>{`
        .timepicker-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(160,160,170,.45) transparent;
        }

        .timepicker-scroll::-webkit-scrollbar {
          width: 8px;
        }

        .timepicker-scroll::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 999px;
        }

        .timepicker-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(
            180deg,
            rgba(145,145,155,.55),
            rgba(100,100,110,.55)
          );
          border-radius: 999px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        .timepicker-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(
            180deg,
            rgba(185,185,195,.7),
            rgba(120,120,130,.7)
          );
          border: 2px solid transparent;
          background-clip: padding-box;
        }
      `}</style>

      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "group flex w-full items-center justify-between gap-3 rounded-2xl border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] px-4 py-3 text-left shadow-[0_10px_30px_rgba(0,0,0,.22)] backdrop-blur-xl transition-all duration-200 hover:border-white/20 focus:border-white/25 focus:outline-none focus:ring-2 focus:ring-white/10 disabled:cursor-not-allowed disabled:opacity-60",
          buttonClassName
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-white/38">
            Ώρα
          </div>
          <div className="truncate text-[15px] font-semibold text-white">
            {displayValue}
          </div>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/78 transition group-hover:bg-white/[0.06] group-hover:text-white">
          <Clock3 className="h-[18px] w-[18px]" />
        </div>
      </button>

      <PickerPortal open={open && !!panelStyle}>
        <AnimatePresence>
          {open && panelStyle && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[1990] bg-black/45 backdrop-blur-[2px]"
                onClick={() => setOpen(false)}
              />

              <motion.div
                ref={panelRef}
                initial={
                  isMobile
                    ? { opacity: 0, y: 28 }
                    : { opacity: 0, y: 14, scale: 0.985 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  isMobile
                    ? { opacity: 0, y: 28 }
                    : { opacity: 0, y: 10, scale: 0.985 }
                }
                transition={{ duration: 0.16 }}
                style={panelStyle}
                className={cn(
                  "overflow-hidden border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_35%),linear-gradient(180deg,rgba(10,10,14,0.98),rgba(5,5,8,0.985))] shadow-[0_30px_80px_rgba(0,0,0,.58)] backdrop-blur-2xl",
                  isMobile
                    ? "z-[2000] rounded-[26px] max-w-[420px] mx-auto"
                    : "z-[2000] rounded-[26px]"
                )}
              >
                <div className="border-b border-white/10 px-4 pb-3.5 pt-4">
                  {isMobile && (
                    <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/14" />
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white">
                        Επιλογή ώρας
                      </div>
                      <div className="mt-1 text-xs text-white/52">
                        Native-style picker με 24ωρη μορφή
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 backdrop-blur-md">
                      <div className="text-[10px] uppercase tracking-[0.14em] text-white/34">
                        Τρέχουσα επιλογή
                      </div>
                      <div className="mt-0.5 text-xl font-bold text-white">
                        {toTimeString(draftHour, draftMinute)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 sm:p-4">
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                    <WheelColumn
                      label="Ώρα"
                      items={hourOptions}
                      selectedValue={draftHour}
                      onSelect={handleSelectHour}
                      innerRef={hourWheelRef}
                      onIncrement={() => nudgeHour(1)}
                      onDecrement={() => nudgeHour(-1)}
                      onScrollEnd={handleHourWheelScroll}
                    />

                    <WheelColumn
                      label="Λεπτά"
                      items={minuteOptions}
                      selectedValue={draftMinute}
                      onSelect={handleSelectMinute}
                      innerRef={minuteWheelRef}
                      onIncrement={() => nudgeMinute(1)}
                      onDecrement={() => nudgeMinute(-1)}
                      onScrollEnd={handleMinuteWheelScroll}
                    />
                  </div>

                  <div className="mt-3.5 rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-md">
                    <div className="text-[10px] uppercase tracking-[0.15em] text-white/34">
                      Preview
                    </div>
                    <div className="mt-1.5 text-center text-[38px] font-bold leading-none tracking-[0.03em] text-white sm:text-[42px]">
                      {toTimeString(draftHour, draftMinute)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-white/10 px-3.5 py-3 sm:px-4">
                  <button
                    type="button"
                    onClick={handleNow}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/78 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    Τώρα
                  </button>

                  <button
                    type="button"
                    onClick={handleDone}
                    className="rounded-2xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:opacity-90"
                  >
                    Επιλογή
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </PickerPortal>
    </div>
  );
}