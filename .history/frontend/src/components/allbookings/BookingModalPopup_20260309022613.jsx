"use client"

import React, { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import {
  Wifi,
  X,
  CheckCircle2,
  Mail,
  CalendarIcon,
  Clock,
  AlertTriangle,
  Calendar as CalendarPlus,
  ExternalLink,
  MapPin,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"



const fmtDate = (d: string) => {
  if (!d) return ""
  try {
    return new Date(`${d}T00:00:00`).toLocaleDateString("el-GR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
  } catch {
    return d
  }
}

const fmtTime = (t: string) => {
  if (!t) return ""
  return String(t).slice(0, 5)
}

interface BookingDetails {
  date: string
  start_time: string
  end_time: string
  is_online: boolean
}

interface CompactBookingModalProps {
  isOpen: boolean
  status?: "success" | "error"
  onClose?: () => void
  onCancel?: () => void
  bookingDetails?: BookingDetails
  trainerName?: string
  errorMessage?: string
}

const generateGoogleCalendarUrl = (booking: BookingDetails & { trainerName: string }) => {
  const { date, start_time, end_time, trainerName, is_online } = booking

  const [year, month, day] = date.split("-").map(Number)
  const [startHour, startMin] = start_time.split(":").map(Number)
  const [endHour, endMin] = end_time.split(":").map(Number)

  const formatDateTime = (y: number, m: number, d: number, h: number, min: number) =>
    `${y}${String(m).padStart(2, "0")}${String(d).padStart(2, "0")}T${String(h).padStart(2, "0")}${String(min).padStart(2, "0")}00`

  const startDateTime = formatDateTime(year, month, day, startHour, startMin)
  const endDateTime = formatDateTime(year, month, day, endHour, endMin)

  const title = encodeURIComponent(`Προπόνηση με ${trainerName}`)
  const details = encodeURIComponent(
    is_online
      ? "Online συνεδρία προπόνησης. Θα λάβετε σύνδεσμο πριν την έναρξη."
      : "Προσωπική συνεδρία προπόνησης."
  )
  const location = encodeURIComponent(is_online ? "Online" : "Γυμναστήριο")

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateTime}/${endDateTime}&details=${details}&location=${location}`
}

export default function CompactBookingModal({
  isOpen,
  status = "success",
  onClose,
  onCancel,
  bookingDetails,
  trainerName = "Προπονητής",
  errorMessage,
}: CompactBookingModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.()
    }

    window.addEventListener("keydown", handleEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen, onClose])

  const handleGoogleCalendar = () => {
    if (!bookingDetails) return

    const url = generateGoogleCalendarUrl({
      date: bookingDetails.date,
      start_time: bookingDetails.start_time,
      end_time: bookingDetails.end_time,
      trainerName,
      is_online: bookingDetails.is_online,
    })

    window.open(url, "_blank", "noopener,noreferrer")
  }

  const handleCancel = () => {
    onCancel?.()
    onClose?.()
  }

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            type="button"
            aria-label="Κλείσιμο"
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-confirmation-title"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "relative w-full overflow-hidden rounded-2xl sm:rounded-3xl",
              "bg-gradient-to-b from-zinc-900 to-zinc-950",
              "border border-white/[0.08]",
              "shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)]",
              "max-w-[340px] sm:max-w-lg"
            )}
          >
            {/* Accent glow */}
            <div 
              className={cn(
                "pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full blur-3xl",
                status === "success" ? "bg-emerald-500/20" : "bg-red-500/20"
              )} 
            />

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-2.5 top-2.5 z-20 inline-flex size-8 items-center justify-center rounded-full text-zinc-500 transition-all hover:bg-white/10 hover:text-white sm:right-4 sm:top-4 sm:size-9"
              aria-label="Κλείσιμο"
            >
              <X className="size-4 sm:size-5" />
            </button>

            {/* Content */}
            <div className="relative z-10 px-4 py-4 sm:px-8 sm:py-8">
              {/* Close button spacer */}
              <div className="h-4 sm:h-6" />
              
              {/* Header Section - Centered */}
              <div className="flex flex-col items-center text-center">
                {/* Status Icon */}
                <div
                  className={cn(
                    "flex size-12 shrink-0 items-center justify-center rounded-2xl sm:size-16",
                    status === "success"
                      ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                      : "bg-red-500/15 text-red-400 ring-1 ring-red-500/30"
                  )}
                >
                  {status === "success" ? (
                    <CheckCircle2 className="size-6 sm:size-8" />
                  ) : (
                    <AlertTriangle className="size-6 sm:size-8" />
                  )}
                </div>

                {/* Title */}
                <h2
                  id="booking-confirmation-title"
                  className="mt-3 text-lg font-bold tracking-tight text-white sm:mt-4 sm:text-2xl"
                >
                  {status === "success" ? "Κράτηση καταχωρήθηκε" : "Αποτυχία κράτησης"}
                </h2>
                {status === "error" && (
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-400 sm:mt-1.5 sm:text-sm">
                    {errorMessage || "Δοκίμασε ξανά σε λίγο."}
                  </p>
                )}
              </div>

              {status === "success" && bookingDetails ? (
                <>
                  {/* Info Grid with Title */}
                  <div className="mt-4 rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/[0.06] sm:mt-7 sm:rounded-3xl sm:p-6">
                    <h3 className="mb-3 text-center text-[10px] font-medium uppercase tracking-wider text-zinc-500 sm:mb-4 sm:text-xs">
                      Στοιχεία Κράτησης
                    </h3>
                    <div className="grid grid-cols-4 gap-2 sm:gap-4">
                    {/* Date */}
                    <div className="text-center">
                      <div className="mx-auto flex size-8 items-center justify-center rounded-xl bg-white/[0.08] sm:size-12 sm:rounded-2xl">
                        <CalendarIcon className="size-4 text-zinc-300 sm:size-5" />
                      </div>
                      <div className="mt-1.5 text-[10px] font-semibold leading-tight text-white sm:mt-3 sm:text-sm">
                        {fmtDate(bookingDetails.date)}
                      </div>
                    </div>

                    {/* Time */}
                    <div className="text-center">
                      <div className="mx-auto flex size-8 items-center justify-center rounded-xl bg-white/[0.08] sm:size-12 sm:rounded-2xl">
                        <Clock className="size-4 text-zinc-300 sm:size-5" />
                      </div>
                      <div className="mt-1.5 text-[10px] font-semibold leading-tight text-white sm:mt-3 sm:text-sm">
                        {fmtTime(bookingDetails.start_time)}
                        <span className="text-zinc-600"> - </span>
                        {fmtTime(bookingDetails.end_time)}
                      </div>
                    </div>

                    {/* Type */}
                    <div className="text-center">
                      <div className="mx-auto flex size-8 items-center justify-center rounded-xl bg-white/[0.08] sm:size-12 sm:rounded-2xl">
                        {bookingDetails.is_online ? (
                          <Wifi className="size-4 text-zinc-300 sm:size-5" />
                        ) : (
                          <MapPin className="size-4 text-zinc-300 sm:size-5" />
                        )}
                      </div>
                      <div className="mt-1.5 text-[10px] font-semibold leading-tight text-white sm:mt-3 sm:text-sm">
                        {bookingDetails.is_online ? "Online" : "Δια ζώσης"}
                      </div>
                    </div>

                    {/* Trainer */}
                    <div className="text-center">
                      <div className="mx-auto flex size-8 items-center justify-center rounded-xl bg-white/[0.08] sm:size-12 sm:rounded-2xl">
                        <User className="size-4 text-zinc-300 sm:size-5" />
                      </div>
                      <div className="mt-1.5 truncate text-[10px] font-semibold leading-tight text-white sm:mt-3 sm:text-sm">
                        {trainerName}
                      </div>
                    </div>
                    </div>
                  </div>

                  {/* Email Notice */}
                  <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2 ring-1 ring-white/[0.04] sm:mt-6 sm:gap-3.5 sm:rounded-2xl sm:px-5 sm:py-4">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] sm:size-10 sm:rounded-xl">
                      <Mail className="size-3.5 text-zinc-300 sm:size-5" />
                    </div>
                    <span className="text-[10px] text-white sm:text-sm">
                      Θα λάβεις επιβεβαίωση μέσω email.
                    </span>
                  </div>

                  {/* Action Buttons - Stacked */}
                  <div className="mt-3 flex flex-col gap-1.5 sm:mt-5 sm:gap-2">
                    <button
                      type="button"
                      onClick={handleGoogleCalendar}
                      className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-white/90 text-[11px] font-medium text-zinc-800 transition-all hover:bg-white active:scale-[0.98] sm:h-11 sm:gap-2 sm:rounded-xl sm:text-sm"
                    >
                      <CalendarPlus className="size-3.5 sm:size-4" />
                      <span>Αποθήκευση στο Ημερολόγιο</span>
                      <ExternalLink className="size-2.5 opacity-40 sm:size-3" />
                    </button>

                    <button
                      type="button"
                      onClick={handleCancel}
                      className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg text-[11px] font-medium text-zinc-500 transition-all hover:bg-white/[0.05] hover:text-zinc-300 active:scale-[0.98] sm:h-11 sm:gap-2 sm:rounded-xl sm:text-sm"
                    >
                      <X className="size-3.5 sm:size-4" />
                      <span>Ακύρωση</span>
                    </button>
                  </div>

                  {/* Footer Notice */}
                  <div className="mt-4 flex items-center justify-center gap-2 pt-3 sm:mt-6 sm:gap-2.5 sm:pt-4">
                    <div className="size-2 shrink-0 animate-pulse rounded-full bg-amber-400 sm:size-2.5" />
                    <p className="text-[10px] font-medium text-zinc-400 sm:text-sm">
                      Η κράτηση αναμένει επιβεβαίωση
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Error state */}
                  <div className="mt-4 rounded-2xl bg-white/[0.04] p-4 text-center text-xs text-zinc-400 ring-1 ring-white/[0.06] sm:mt-6 sm:rounded-3xl sm:p-6 sm:text-sm">
                    Δεν ήταν δυνατή η ολοκλήρωση της κράτησης.
                  </div>

                  <div className="mt-4 flex flex-col gap-1.5 sm:mt-5 sm:gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-white/90 text-[11px] font-medium text-zinc-800 transition-all hover:bg-white active:scale-[0.98] sm:h-11 sm:rounded-xl sm:text-sm"
                    >
                      Δοκίμασε ξανά
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg text-[11px] font-medium text-zinc-500 transition-all hover:bg-white/[0.05] hover:text-zinc-300 active:scale-[0.98] sm:h-11 sm:gap-2 sm:rounded-xl sm:text-sm"
                    >
                      <X className="size-3.5 sm:size-4" />
                      <span>Κλείσιμο</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
