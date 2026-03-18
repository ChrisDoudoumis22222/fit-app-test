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
import { Clock3 } from "lucide-react";

/* ---------------- helpers ---------------- */

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function pad2(n) {
  return String(n).padStart(2, "0");
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

function normalizeLoopIndex(index, length) {
  return ((index % length) + length) % length;
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

function PickerPortal({ open, children }) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

/* ---------------- wheel constants ---------------- */

const ITEM_HEIGHT = 40;
const VISIBLE_ROWS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const CENTER_OFFSET = ITEM_HEIGHT * Math.floor(VISIBLE_ROWS / 2);

const LOOP_MULTIPLIER = 7;
const LOOP_CENTER_SET = Math.floor(LOOP_MULTIPLIER / 2);

/* ---------------- infinite wheel utils ---------------- */

function getCenteredLoopIndex(items, selectedValue) {
  const baseIndex = items.indexOf(selectedValue);
  const safeIndex = baseIndex >= 0 ? baseIndex : 0;
  return LOOP_CENTER_SET * items.length + safeIndex;
}

function recenterInfiniteScroll(el, items) {
  if (!el || !items.length) return;

  const rawIndex = Math.round(el.scrollTop / ITEM_HEIGHT);
  const normalizedIndex = normalizeLoopIndex(rawIndex, items.length);
  const centeredIndex = LOOP_CENTER_SET * items.length + normalizedIndex;

  const minIndex = items.length;
  const maxIndex = items.length * (LOOP_MULTIPLIER - 2);

  if (rawIndex <= minIndex || rawIndex >= maxIndex) {
    el.scrollTop = centeredIndex * ITEM_HEIGHT;
  }
}

/* ---------------- wheel column ---------------- */

function WheelColumn({
  label,
  items,
  selectedValue,
  onSelect,
  innerRef,
  onScrollEnd,
}) {
  const loopedItems = useMemo(
    () =>
      Array.from({ length: LOOP_MULTIPLIER }, () => items).flat(),
    [items]
  );

  return (
    <div className="min-w-0">
      <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/78">
        {label}
      </div>

      <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,8,12,0.98),rgba(5,5,8,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div
          className="pointer-events-none absolute left-2 right-2 z-[3] rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(130,130,145,0.24),rgba(90,90,105,0.18))] shadow-[0_10px_28px_rgba(0,0,0,.24),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md"
          style={{
            top: CENTER_OFFSET,
            height: ITEM_HEIGHT,
          }}
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-[4] h-11 bg-gradient-to-b from-[#04050a] via-[#04050a]/92 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] h-11 bg-gradient-to-t from-[#04050a] via-[#04050a]/92 to-transparent" />

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
          {loopedItems.map((item, index) => {
            const selected = item === selectedValue;

            return (
              <button
                key={`${label}-${item}-${index}`}
                type="button"
                onClick={() => onSelect(item)}
                className={cn(
                  "flex w-full snap-center items-center justify-center px-2 text-base font-semibold tracking-[0.02em] transition-all duration-150",
                  selected ? "text-white" : "text-white/48 hover:text-white/78"
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

  const scrollWheelToValue = useCallback(
    (ref, items, selected, behavior = "smooth") => {
      const el = ref.current;
      if (!el || !items.length) return;

      const centeredIndex = getCenteredLoopIndex(items, selected);

      el.scrollTo({
        top: centeredIndex * ITEM_HEIGHT,
        behavior,
      });
    },
    []
  );

  useEffect(() => {
    if (!open) return;

    const id = setTimeout(() => {
      scrollWheelToValue(hourWheelRef, hourOptions, draftHour, "auto");
      scrollWheelToValue(minuteWheelRef, minuteOptions, draftMinute, "auto");
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

  const snapLoopWheel = useCallback((ref, items, onPicked) => {
    const el = ref.current;
    if (!el || !items.length) return;

    recenterInfiniteScroll(el, items);

    const rawIndex = Math.round(el.scrollTop / ITEM_HEIGHT);
    const normalizedIndex = normalizeLoopIndex(rawIndex, items.length);
    const centeredIndex = LOOP_CENTER_SET * items.length + normalizedIndex;
    const nextValue = items[normalizedIndex];

    el.scrollTo({
      top: centeredIndex * ITEM_HEIGHT,
      behavior: "smooth",
    });

    onPicked(nextValue);
  }, []);

  const handleHourWheelScroll = () => {
    recenterInfiniteScroll(hourWheelRef.current, hourOptions);

    clearTimeout(hourScrollTimer.current);
    hourScrollTimer.current = setTimeout(() => {
      snapLoopWheel(hourWheelRef, hourOptions, (nextHour) => {
        setDraftHour(nextHour);
        commitValue(nextHour, draftMinute);
      });
    }, 70);
  };

  const handleMinuteWheelScroll = () => {
    recenterInfiniteScroll(minuteWheelRef.current, minuteOptions);

    clearTimeout(minuteScrollTimer.current);
    minuteScrollTimer.current = setTimeout(() => {
      snapLoopWheel(minuteWheelRef, minuteOptions, (nextMinute) => {
        setDraftMinute(nextMinute);
        commitValue(draftHour, nextMinute);
      });
    }, 70);
  };

  useEffect(() => {
    return () => {
      clearTimeout(hourScrollTimer.current);
      clearTimeout(minuteScrollTimer.current);
    };
  }, []);

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
          scrollbar-color: rgba(255,255,255,.16) transparent;
        }

        .timepicker-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .timepicker-scroll::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 999px;
        }

        .timepicker-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.14);
          border-radius: 999px;
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
          <div className="mb-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-white/75">
            Ώρα
          </div>
          <div className="truncate text-[15px] font-semibold text-white">
            {displayValue}
          </div>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white transition group-hover:bg-white/[0.06]">
          <Clock3 className="h-[18px] w-[18px]" />
        </div>
      </button>

      <PickerPortal open={open}>
        <AnimatePresence>
          {open && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[1990] bg-black/50 backdrop-blur-[2px]"
                onClick={() => setOpen(false)}
              />

              <motion.div
                ref={panelRef}
                initial={
                  isMobile
                    ? { opacity: 0, y: 28 }
                    : { opacity: 0, y: 16, scale: 0.985 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  isMobile
                    ? { opacity: 0, y: 28 }
                    : { opacity: 0, y: 10, scale: 0.985 }
                }
                transition={{ duration: 0.18 }}
                className={cn(
                  "overflow-hidden border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_34%),linear-gradient(180deg,rgba(7,8,12,0.985),rgba(4,5,8,0.99))] shadow-[0_30px_80px_rgba(0,0,0,.58)] backdrop-blur-2xl",
                  isMobile
                    ? "fixed inset-x-2 bottom-2 z-[2000] mx-auto max-w-[400px] rounded-[24px]"
                    : "fixed left-1/2 top-1/2 z-[2000] w-[min(92vw,380px)] -translate-x-1/2 -translate-y-1/2 rounded-[26px]"
                )}
              >
                <div className="border-b border-white/10 px-4 pb-3.5 pt-4">
                  {isMobile && (
                    <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/14" />
                  )}

                  <div className="text-sm font-semibold text-white">
                    Επιλογή ώρας
                  </div>
                  <div className="mt-1 text-xs text-white/68">
                    24ωρη μορφή
                  </div>
                </div>

                <div className="p-3.5 sm:p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <WheelColumn
                      label="Ώρα"
                      items={hourOptions}
                      selectedValue={draftHour}
                      onSelect={handleSelectHour}
                      innerRef={hourWheelRef}
                      onScrollEnd={handleHourWheelScroll}
                    />

                    <WheelColumn
                      label="Λεπτά"
                      items={minuteOptions}
                      selectedValue={draftMinute}
                      onSelect={handleSelectMinute}
                      innerRef={minuteWheelRef}
                      onScrollEnd={handleMinuteWheelScroll}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-white/10 px-3.5 py-3 sm:px-4">
                  <button
                    type="button"
                    onClick={handleNow}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08]"
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