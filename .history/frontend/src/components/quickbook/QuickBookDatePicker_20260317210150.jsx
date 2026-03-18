"use client"

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { Clock3, ChevronUp, ChevronDown } from "lucide-react"

/* ---------------- helpers ---------------- */

function cn(...classes) {
  return classes.filter(Boolean).join(" ")
}

function pad2(n) {
  return String(n).padStart(2, "0")
}

function parseTime(value) {
  const [h, m] = String(value || "09:00").split(":").map(Number)
  return {
    hour: Number.isFinite(h) ? h : 9,
    minute: Number.isFinite(m) ? m : 0,
  }
}

function toTimeString(hour, minute) {
  return `${pad2(hour)}:${pad2(minute)}`
}

function useIsMobile(bp = 640) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(`(max-width:${bp - 0.02}px)`).matches
      : false
  )

  useEffect(() => {
    if (typeof window === "undefined") return

    const mq = window.matchMedia(`(max-width:${bp - 0.02}px)`)
    const onChange = (e) => setIsMobile(e.matches)

    setIsMobile(mq.matches)

    if (mq.addEventListener) mq.addEventListener("change", onChange)
    else mq.addListener(onChange)

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange)
      else mq.removeListener(onChange)
    }
  }, [bp])

  return isMobile
}

function useClickOutside(ref, handler, when = true) {
  useEffect(() => {
    if (!when) return

    const onDown = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return
      handler?.()
    }

    document.addEventListener("mousedown", onDown)
    document.addEventListener("touchstart", onDown)

    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("touchstart", onDown)
    }
  }, [ref, handler, when])
}

function useFloatingPanel(triggerRef, open, { width = 360, gap = 10 } = {}) {
  const [style, setStyle] = useState(null)

  const update = useCallback(() => {
    if (!triggerRef.current || typeof window === "undefined") return

    const rect = triggerRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    const panelWidth = Math.min(width, vw - 16)
    let left = rect.left
    let top = rect.bottom + gap

    if (left + panelWidth > vw - 8) left = vw - panelWidth - 8
    if (left < 8) left = 8

    const estimatedHeight = 390
    const notEnoughBelow = top + estimatedHeight > vh - 8
    if (notEnoughBelow && rect.top > estimatedHeight / 2) {
      top = Math.max(8, rect.top - gap - estimatedHeight)
    }

    setStyle({
      position: "fixed",
      top,
      left,
      width: panelWidth,
      zIndex: 2000,
    })
  }, [triggerRef, width, gap])

  useEffect(() => {
    if (!open) return
    update()

    const handle = () => update()
    window.addEventListener("resize", handle)
    window.addEventListener("scroll", handle, true)

    return () => {
      window.removeEventListener("resize", handle)
      window.removeEventListener("scroll", handle, true)
    }
  }, [open, update])

  return style
}

function PickerPortal({ open, children }) {
  if (!open || typeof document === "undefined") return null
  return createPortal(children, document.body)
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
  const [open, setOpen] = useState(false)
  const [draftHour, setDraftHour] = useState(() => parseTime(value).hour)
  const [draftMinute, setDraftMinute] = useState(() => parseTime(value).minute)

  const triggerRef = useRef(null)
  const panelRef = useRef(null)

  const isMobile = useIsMobile(640)
  const panelStyle = useFloatingPanel(triggerRef, open, {
    width: isMobile
      ? (typeof window !== "undefined" ? window.innerWidth - 16 : 360)
      : 360,
    gap: 10,
  })

  useClickOutside(panelRef, () => setOpen(false), open)

  useEffect(() => {
    const parsed = parseTime(value)
    setDraftHour(parsed.hour)
    setDraftMinute(parsed.minute)
  }, [value])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false)
    }
    if (open) document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  const minuteOptions = useMemo(() => {
    const step = Math.max(1, Math.min(60, minuteStep))
    const list = []
    for (let m = 0; m < 60; m += step) list.push(m)
    return list
  }, [minuteStep])

  const displayValue = value || placeholder

  const commitValue = (hour, minute) => {
    const next = toTimeString(hour, minute)
    onChange?.(next)
  }

  const nudgeHour = (delta) => {
    setDraftHour((prev) => {
      const next = (prev + delta + 24) % 24
      commitValue(next, draftMinute)
      return next
    })
  }

  const nudgeMinute = (delta) => {
    setDraftMinute((prev) => {
      const idx = minuteOptions.indexOf(prev)
      const safeIdx = idx >= 0 ? idx : 0
      const nextIdx =
        (safeIdx + delta + minuteOptions.length) % minuteOptions.length
      const nextMinute = minuteOptions[nextIdx]
      commitValue(draftHour, nextMinute)
      return nextMinute
    })
  }

  const handleSelectHour = (hour) => {
    setDraftHour(hour)
    commitValue(hour, draftMinute)
  }

  const handleSelectMinute = (minute) => {
    setDraftMinute(minute)
    commitValue(draftHour, minute)
  }

  const handleNow = () => {
    const now = new Date()
    const hour = now.getHours()
    const minute =
      minuteOptions.find((m) => m >= now.getMinutes()) ?? minuteOptions[0]

    setDraftHour(hour)
    setDraftMinute(minute)
    commitValue(hour, minute)
    setOpen(false)
  }

  const handleDone = () => {
    commitValue(draftHour, draftMinute)
    setOpen(false)
  }

  return (
    <div className={cn("relative z-[20]", className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full rounded-2xl border border-white/20 bg-black/50 px-4 py-3 text-left text-white backdrop-blur-sm transition-all duration-200 focus:border-white focus:ring-2 focus:ring-white/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-between gap-3",
          buttonClassName
        )}
      >
        <span className="min-w-0 flex-1 truncate text-base font-medium">
          {displayValue}
        </span>

        <Clock3 className="h-5 w-5 shrink-0 text-white/80" />
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
                className={cn(
                  "overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/98 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,.55)]",
                  isMobile ? "max-h-[min(78vh,520px)]" : ""
                )}
              >
                <div className="border-b border-white/10 px-4 py-4">
                  <div className="text-sm font-semibold text-white">
                    Επιλογή ώρας
                  </div>
                  <div className="mt-1 text-xs text-white/55">
                    Διάλεξε ώρα σε format 24ώρου
                  </div>
                </div>

                <div className="p-4">
                  <div className="mb-4 grid grid-cols-2 gap-3">
                    {/* Hour */}
                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
                          Ώρα
                        </div>
                        <div className="text-lg font-bold text-white">
                          {pad2(draftHour)}
                        </div>
                      </div>

                      <div className="mb-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => nudgeHour(1)}
                          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-white transition hover:bg-white/10"
                        >
                          <ChevronUp className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => nudgeHour(-1)}
                          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-white transition hover:bg-white/10"
                        >
                          <ChevronDown className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="grid max-h-48 grid-cols-3 gap-2 overflow-y-auto pr-1">
                        {Array.from({ length: 24 }, (_, i) => i).map((hour) => {
                          const selected = hour === draftHour
                          return (
                            <button
                              key={hour}
                              type="button"
                              onClick={() => handleSelectHour(hour)}
                              className={cn(
                                "h-10 rounded-2xl text-sm font-semibold transition",
                                selected
                                  ? "bg-white text-black"
                                  : "bg-white/[0.04] text-white hover:bg-white/[0.08]"
                              )}
                            >
                              {pad2(hour)}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Minute */}
                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
                          Λεπτά
                        </div>
                        <div className="text-lg font-bold text-white">
                          {pad2(draftMinute)}
                        </div>
                      </div>

                      <div className="mb-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => nudgeMinute(1)}
                          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-white transition hover:bg-white/10"
                        >
                          <ChevronUp className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => nudgeMinute(-1)}
                          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-white transition hover:bg-white/10"
                        >
                          <ChevronDown className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {minuteOptions.map((minute) => {
                          const selected = minute === draftMinute
                          return (
                            <button
                              key={minute}
                              type="button"
                              onClick={() => handleSelectMinute(minute)}
                              className={cn(
                                "h-10 rounded-2xl text-sm font-semibold transition",
                                selected
                                  ? "bg-white text-black"
                                  : "bg-white/[0.04] text-white hover:bg-white/[0.08]"
                              )}
                            >
                              {pad2(minute)}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center">
                    <div className="text-xs uppercase tracking-[0.12em] text-white/45">
                      Επιλεγμένη ώρα
                    </div>
                    <div className="mt-1 text-2xl font-bold text-white">
                      {toTimeString(draftHour, draftMinute)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
                  <button
                    type="button"
                    onClick={handleNow}
                    className="text-sm font-medium text-white/75 transition hover:text-white"
                  >
                    Τώρα
                  </button>

                  <button
                    type="button"
                    onClick={handleDone}
                    className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
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
  )
}