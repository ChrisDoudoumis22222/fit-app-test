"use client"

import React, { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Check, X, CalendarPlus } from "lucide-react"

function formatGoogleDate(dateValue) {
  const d = new Date(dateValue)
  if (Number.isNaN(d.getTime())) return ""
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
}

function escapeICS(value = "") {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
}

function buildGoogleCalendarUrl(event) {
  const start = formatGoogleDate(event.start)
  const end = formatGoogleDate(event.end)

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title || "Peak Velocity Booking",
    dates: `${start}/${end}`,
    details: event.description || "",
    location: event.location || "",
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function downloadICS(event) {
  const start = formatGoogleDate(event.start)
  const end = formatGoogleDate(event.end)
  const now = formatGoogleDate(new Date())
  const uid = `${Date.now()}@peakvelocity.gr`

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Peak Velocity//Booking//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeICS(event.title || "Peak Velocity Booking")}`,
    `DESCRIPTION:${escapeICS(event.description || "")}`,
    `LOCATION:${escapeICS(event.location || "")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n")

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)

  const a = document.createElement("a")
  a.href = url
  a.download = event.filename || "peak-velocity-booking.ics"
  document.body.appendChild(a)
  a.click()
  a.remove()

  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function SuccessMessage({
  message,
  onClose,
  title = "Επιτυχής ενέργεια",
  subtitle = "Η ενέργεια ολοκληρώθηκε με επιτυχία.",
  calendarEvent = null,
}) {
  const [mounted, setMounted] = useState(false)
  const [savingCalendar, setSavingCalendar] = useState(false)

  useEffect(() => {
    setMounted(true)

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.()
    }

    document.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = message ? "hidden" : ""

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [message, onClose])

  const handleAddToCalendar = async () => {
    if (!calendarEvent?.start || !calendarEvent?.end) return

    try {
      setSavingCalendar(true)

      const ua = navigator.userAgent || ""
      const isAndroid = /Android/i.test(ua)
      const isIOS =
        /iPhone|iPad|iPod/i.test(ua) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)

      const googleUrl = buildGoogleCalendarUrl(calendarEvent)

      if (isIOS) {
        // Best browser-friendly path for Apple Calendar
        downloadICS(calendarEvent)
        return
      }

      if (isAndroid) {
        // Try Google Calendar app first, fallback to web
        const intentUrl =
          googleUrl.replace(/^https:\/\//, "intent://") +
          "#Intent;scheme=https;package=com.google.android.calendar;end"

        const fallbackTimer = setTimeout(() => {
          window.location.href = googleUrl
        }, 900)

        window.location.href = intentUrl

        setTimeout(() => {
          clearTimeout(fallbackTimer)
        }, 1500)

        return
      }

      // Desktop
      window.open(googleUrl, "_blank", "noopener,noreferrer")
    } finally {
      setTimeout(() => setSavingCalendar(false), 700)
    }
  }

  if (!message || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <div
        className="absolute inset-0 bg-black/78 backdrop-blur-[12px]"
        onClick={onClose}
      />

      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
        <div
          onClick={(e) => e.stopPropagation()}
          className="
            relative w-full max-w-[420px]
            overflow-hidden rounded-[26px]
            bg-[#0f1113]
            shadow-[0_24px_80px_rgba(0,0,0,0.62)]
          "
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-0 h-[170px] w-[170px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="absolute inset-x-0 top-0 h-[130px] bg-gradient-to-b from-emerald-500/[0.06] to-transparent" />
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close success message"
            className="
              absolute right-4 top-4 z-20
              inline-flex h-8 w-8 items-center justify-center
              text-white/60 transition
              hover:text-white
            "
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative z-10 px-5 pb-6 pt-8 sm:px-7 sm:pb-7 sm:pt-9">
            <div className="flex flex-col items-center text-center">
              <div className="relative flex h-[108px] w-[108px] items-center justify-center sm:h-[118px] sm:w-[118px]">
                <div className="absolute h-[108px] w-[108px] rounded-full bg-emerald-400/8" />
                <div className="absolute h-[82px] w-[82px] rounded-full bg-emerald-400/14" />
                <div className="absolute h-[60px] w-[60px] rounded-full bg-emerald-400/22" />
                <div className="absolute flex h-[50px] w-[50px] items-center justify-center rounded-full bg-emerald-500 shadow-[0_8px_24px_rgba(16,185,129,0.28)]">
                  <Check className="h-6 w-6 text-white" strokeWidth={3} />
                </div>
              </div>

              <h3 className="mt-4 text-[22px] font-semibold tracking-[-0.02em] text-emerald-400 sm:text-[24px]">
                {title}
              </h3>

              <p className="mt-2 max-w-[300px] text-[13px] leading-5 text-white sm:text-[14px]">
                {subtitle}
              </p>

              <p className="mt-5 max-w-[320px] text-[15px] leading-6 font-medium text-emerald-300 sm:text-[16px]">
                {message}
              </p>
            </div>

            <div className="mt-6 rounded-[20px] border border-emerald-500/15 bg-[#13211c] px-4 py-4 text-left">
              <div className="text-[12px] font-medium text-emerald-200/65">
                Κατάσταση
              </div>
              <div className="mt-1 text-[14px] font-semibold text-emerald-300">
                Η ενέργεια ολοκληρώθηκε επιτυχώς
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              {calendarEvent?.start && calendarEvent?.end && (
                <button
                  type="button"
                  onClick={handleAddToCalendar}
                  className="
                    inline-flex min-h-[50px] w-full
                    items-center justify-center gap-2
                    rounded-[18px] bg-white px-6
                    text-[15px] font-semibold text-black
                    shadow-[0_10px_30px_rgba(255,255,255,0.06)]
                    transition hover:bg-white/90
                  "
                >
                  <CalendarPlus className="h-4 w-4" />
                  {savingCalendar ? "Άνοιγμα ημερολογίου..." : "Αποθήκευση στο ημερολόγιο"}
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="
                  inline-flex min-h-[46px] w-full
                  items-center justify-center
                  rounded-[18px] border border-white/10 bg-white/5 px-6
                  text-[14px] font-semibold text-white
                  transition hover:bg-white/10
                "
              >
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}