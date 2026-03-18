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
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

/* ---------------- constants ---------------- */

const GREEK_MONTHS = [
  "Ιανουάριος",
  "Φεβρουάριος",
  "Μάρτιος",
  "Απρίλιος",
  "Μάιος",
  "Ιούνιος",
  "Ιούλιος",
  "Αύγουστος",
  "Σεπτέμβριος",
  "Οκτώβριος",
  "Νοέμβριος",
  "Δεκέμβριος",
]

const GREEK_WEEKDAYS_SHORT = ["Δε", "Τρ", "Τε", "Πε", "Πα", "Σα", "Κυ"]

/* ---------------- helpers ---------------- */

function cn(...classes) {
  return classes.filter(Boolean).join(" ")
}

function pad2(n) {
  return String(n).padStart(2, "0")
}

function parseISODateLocal(value) {
  if (!value) return new Date()
  const [y, m, d] = String(value).split("-").map(Number)
  return new Date(y || new Date().getFullYear(), (m || 1) - 1, d || 1, 12, 0, 0)
}

function toISODateLocal(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0)
}

function startOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay() || 7
  d.setDate(d.getDate() - (day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

function buildCalendarGrid(anchorDate) {
  const first = startOfMonth(anchorDate)
  const gridStart = startOfWeek(first)
  const days = []

  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    days.push({
      date: d,
      key: toISODateLocal(d),
      day: d.getDate(),
      inMonth: d.getMonth() === anchorDate.getMonth(),
      isToday: toISODateLocal(d) === toISODateLocal(new Date()),
    })
  }

  return { days }
}

function formatDisplayDate(value) {
  if (!value) return "Επιλογή ημερομηνίας"
  const d = parseISODateLocal(value)
  return d.toLocaleDateString("el-GR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
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

    const estimatedHeight = 430
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

export default function QuickBookDatePicker({
  value,
  onChange,
  minDate,
  disabled = false,
  className = "",
  buttonClassName = "",
}) {
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState(() => parseISODateLocal(value))

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
    setAnchor(parseISODateLocal(value))
  }, [value])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false)
    }
    if (open) document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  const selectedDate = useMemo(() => parseISODateLocal(value), [value])
  const selectedKey = useMemo(() => toISODateLocal(selectedDate), [selectedDate])
  const minKey = minDate || ""
  const { days } = useMemo(() => buildCalendarGrid(anchor), [anchor])

  const prevMonth = () =>
    setAnchor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1, 12, 0, 0))

  const nextMonth = () =>
    setAnchor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1, 12, 0, 0))

  const handleSelect = (key) => {
    onChange?.(key)
    setOpen(false)
  }

  const handleToday = () => {
    const today = toISODateLocal(new Date())
    if (minKey && today < minKey) return
    onChange?.(today)
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
          "w-full rounded-2xl border border-white/20 bg-black/50 backdrop-blur-sm px-4 py-3 text-white transition-all duration-200 focus:border-white focus:ring-2 focus:ring-white/20 focus:outline-none flex items-center justify-between gap-3 text-left disabled:opacity-60 disabled:cursor-not-allowed",
          buttonClassName
        )}
      >
        <span className="min-w-0 flex-1 truncate text-base font-medium capitalize">
          {formatDisplayDate(value)}
        </span>

<Calendar className="h-5 w-5 text-white/80 shrink-0" />
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
                <div className="flex items-center justify-between border-b border-white/10 px-3 py-3">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-white hover:bg-white/10 transition"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <div className="text-sm font-semibold text-white">
                    {GREEK_MONTHS[anchor.getMonth()]} {anchor.getFullYear()}
                  </div>

                  <button
                    type="button"
                    onClick={nextMonth}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-white hover:bg-white/10 transition"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-3">
                  <div className="mb-2 grid grid-cols-7 gap-1">
                    {GREEK_WEEKDAYS_SHORT.map((w) => (
                      <div
                        key={w}
                        className="py-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-white/45"
                      >
                        {w}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {days.map((d) => {
                      const key = d.key
                      const disabledDay = minKey ? key < minKey : false
                      const selected = key === selectedKey

                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={disabledDay}
                          onClick={() => handleSelect(key)}
                          className={cn(
                            "h-10 rounded-2xl text-sm font-semibold transition",
                            selected
                              ? "bg-white text-black"
                              : d.inMonth
                              ? "bg-white/[0.04] text-white hover:bg-white/[0.08]"
                              : "bg-transparent text-white/35 hover:bg-white/[0.04]",
                            d.isToday && !selected ? "ring-1 ring-white/20" : "",
                            disabledDay ? "opacity-30 pointer-events-none" : ""
                          )}
                        >
                          {d.day}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/10 px-3 py-3">
                  <button
                    type="button"
                    onClick={handleToday}
                    className="text-sm font-medium text-white/75 hover:text-white transition"
                  >
                    Σήμερα
                  </button>

                  <div className="text-sm text-white/60 truncate max-w-[58%] text-right">
                    {value}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </PickerPortal>
    </div>
  )
}