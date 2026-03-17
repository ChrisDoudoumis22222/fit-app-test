"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"

const WEEKDAYS = ["Δε", "Τρ", "Τε", "Πε", "Πα", "Σα", "Κυ"]

const pad = (n) => String(n).padStart(2, "0")

const isoFromParts = (year, monthIndex, day) =>
  `${year}-${pad(monthIndex + 1)}-${pad(day)}`

const parseIsoDate = (iso) => {
  if (!iso || typeof iso !== "string") return null
  const parts = iso.split("-").map(Number)
  if (parts.length !== 3) return null

  const [year, month, day] = parts
  if (!year || !month || !day) return null

  const d = new Date(year, month - 1, day, 12, 0, 0, 0)
  return Number.isNaN(d.getTime()) ? null : d
}

const formatLongDate = (iso) => {
  const d = parseIsoDate(iso)
  if (!d) return "Επιλογή ημερομηνίας"

  return d.toLocaleDateString("el-GR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

const sameIso = (a, b) => String(a || "") === String(b || "")

const isTodayIso = (iso) => {
  const now = new Date()
  const today = isoFromParts(now.getFullYear(), now.getMonth(), now.getDate())
  return sameIso(iso, today)
}

function buildCalendarDays(viewDate) {
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1, 12)
  const daysInMonth = new Date(year, month + 1, 0, 12).getDate()
  const daysInPrevMonth = new Date(year, month, 0, 12).getDate()

  const mondayBasedFirstDay = (firstDayOfMonth.getDay() + 6) % 7

  const cells = []

  for (let i = mondayBasedFirstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i
    const date = new Date(year, month - 1, day, 12)
    cells.push({
      iso: isoFromParts(date.getFullYear(), date.getMonth(), date.getDate()),
      day,
      isCurrentMonth: false,
    })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      iso: isoFromParts(year, month, day),
      day,
      isCurrentMonth: true,
    })
  }

  while (cells.length % 7 !== 0) {
    const nextIndex = cells.length - (mondayBasedFirstDay + daysInMonth) + 1
    const date = new Date(year, month + 1, nextIndex, 12)
    cells.push({
      iso: isoFromParts(date.getFullYear(), date.getMonth(), date.getDate()),
      day: nextIndex,
      isCurrentMonth: false,
    })
  }

  while (cells.length < 42) {
    const lastCell = cells[cells.length - 1]
    const lastDate = parseIsoDate(lastCell.iso)
    const nextDate = new Date(
      lastDate.getFullYear(),
      lastDate.getMonth(),
      lastDate.getDate() + 1,
      12
    )

    cells.push({
      iso: isoFromParts(
        nextDate.getFullYear(),
        nextDate.getMonth(),
        nextDate.getDate()
      ),
      day: nextDate.getDate(),
      isCurrentMonth: nextDate.getMonth() === month,
    })
  }

  return cells
}

export default function QuickBookDatePicker({
  value,
  onChange,
  minDate,
  disabled = false,
  variant = "desktop",
}) {
  const rootRef = useRef(null)

  const selectedDate = useMemo(() => parseIsoDate(value), [value])

  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(
    selectedDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12)
  )

  useEffect(() => {
    if (selectedDate) {
      setViewDate(
        new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12)
      )
    }
  }, [selectedDate])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!rootRef.current?.contains(e.target)) {
        setOpen(false)
      }
    }

    const handleEscape = (e) => {
      if (e.key === "Escape") setOpen(false)
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [])

  const monthLabel = useMemo(
    () =>
      viewDate.toLocaleDateString("el-GR", {
        month: "long",
        year: "numeric",
      }),
    [viewDate]
  )

  const days = useMemo(() => buildCalendarDays(viewDate), [viewDate])

  const buttonClass =
    variant === "mobile"
      ? "h-12 w-full rounded-2xl border border-zinc-700/80 bg-zinc-950 px-3 text-left text-base text-white transition hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-600/40 disabled:opacity-60"
      : "h-11 w-full rounded-2xl border border-zinc-700/80 bg-zinc-950/60 px-3 text-left text-base text-white transition hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-600/40 disabled:opacity-60"

  const panelClass =
    variant === "mobile"
      ? "absolute left-0 right-0 top-[calc(100%+10px)] z-50 rounded-[26px] border border-zinc-800 bg-black p-3 shadow-[0_24px_80px_rgba(0,0,0,.55)]"
      : "absolute left-0 right-0 top-[calc(100%+10px)] z-50 rounded-[26px] border border-zinc-800 bg-[rgba(10,10,12,.98)] p-3 shadow-[0_24px_80px_rgba(0,0,0,.55)] backdrop-blur-xl"

  const canPick = (iso) => {
    if (!minDate) return true
    return iso >= minDate
  }

  const handleSelect = (iso) => {
    if (!canPick(iso)) return
    onChange?.(iso)
    setOpen(false)
  }

  const goPrevMonth = () => {
    setViewDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1, 12)
    )
  }

  const goNextMonth = () => {
    setViewDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1, 12)
    )
  }

  const handleToday = () => {
    const now = new Date()
    const todayIso = isoFromParts(now.getFullYear(), now.getMonth(), now.getDate())
    if (!canPick(todayIso)) return

    onChange?.(todayIso)
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1, 12))
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={buttonClass}
      >
        <span className="flex items-center justify-between gap-3">
          <span className="min-w-0 truncate">
            {value ? formatLongDate(value) : "Επιλογή ημερομηνίας"}
          </span>
          <Calendar className="h-4 w-4 shrink-0 text-white/60" />
        </span>
      </button>

      {open ? (
        <div className={panelClass}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={goPrevMonth}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-white transition hover:bg-zinc-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="text-center text-sm font-semibold capitalize text-white">
              {monthLabel}
            </div>

            <button
              type="button"
              onClick={goNextMonth}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-white transition hover:bg-zinc-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-2">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="flex h-9 items-center justify-center text-xs font-medium text-white/45"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((item) => {
              const isSelected = sameIso(item.iso, value)
              const isToday = isTodayIso(item.iso)
              const isDisabled = !canPick(item.iso)

              let cls =
                "h-10 rounded-2xl border text-sm font-medium transition"

              if (isDisabled) {
                cls +=
                  " border-zinc-900 bg-zinc-950 text-white/20 cursor-not-allowed"
              } else if (isSelected) {
                cls +=
                  " border-emerald-400/35 bg-emerald-500/22 text-emerald-50 shadow-[0_10px_22px_rgba(16,185,129,.18)]"
              } else if (!item.isCurrentMonth) {
                cls +=
                  " border-zinc-900 bg-zinc-950/70 text-white/28 hover:bg-zinc-900"
              } else if (isToday) {
                cls +=
                  " border-white/20 bg-white/[0.06] text-white hover:bg-white/[0.1]"
              } else {
                cls +=
                  " border-zinc-800 bg-zinc-900/85 text-white/90 hover:bg-zinc-800"
              }

              return (
                <button
                  key={item.iso}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelect(item.iso)}
                  className={cls}
                  title={formatLongDate(item.iso)}
                >
                  {item.day}
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-800 pt-3">
            <button
              type="button"
              onClick={handleToday}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white transition hover:bg-zinc-800"
            >
              Σήμερα
            </button>

            <div className="truncate text-right text-xs text-white/50">
              {value ? formatLongDate(value) : "Δεν έχει επιλεγεί ημερομηνία"}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}