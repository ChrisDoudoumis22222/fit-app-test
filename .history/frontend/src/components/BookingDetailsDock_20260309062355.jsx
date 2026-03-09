"use client"

import { useState } from "react"
import { X, ChevronDown, Calendar, Clock, User, Mail, MapPin, Wifi, CheckCircle, CalendarPlus, Ban } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

interface BookingData {
  id: string
  clientName: string
  clientEmail?: string
  clientAvatar?: string
  date: string
  startTime: string
  endTime: string
  duration: number
  isOnline: boolean
  location?: string
  note?: string
  status: "pending" | "accepted" | "declined"
  createdAt?: string
  trainerName?: string
}

interface BookingPopupProps {
  booking: BookingData
  isOpen: boolean
  onClose: () => void
  onAccept?: () => void
  onDecline?: () => void
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString("el-GR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString("el-GR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Desktop Glass card with full details
function DesktopView({
  booking,
  onClose,
  onAccept,
  onDecline,
}: Omit<BookingPopupProps, "isOpen">) {
  const statusConfig = {
    pending: { bg: "bg-amber-500/20", text: "text-amber-300", label: "Σε αναμονή" },
    accepted: { bg: "bg-emerald-600/20", text: "text-emerald-300", label: "Αποδεκτή" },
    declined: { bg: "bg-rose-600/20", text: "text-rose-300", label: "Απορρίφθηκε" },
  }
  const status = statusConfig[booking.status]
  const isAccepted = booking.status === "accepted"

  const Li = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) => (
    <li className="flex items-start gap-3">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-gray-500 sm:h-6 sm:w-6" />
      <div className="min-w-0">
        <p className="text-xs text-gray-500 sm:text-sm">{label}</p>
        <p className="break-words text-sm text-gray-200 sm:text-base">{value || "—"}</p>
      </div>
    </li>
  )

  return (
    <div
      className={cn(
        "relative rounded-3xl border border-white/10 bg-[rgba(17,18,21,0.65)] backdrop-blur-xl p-5",
        isAccepted 
          ? "ring-1 ring-emerald-400/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_16px_40px_rgba(16,185,129,0.18)]"
          : "shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_30px_rgba(0,0,0,0.45)]"
      )}
    >
      {/* Glass overlay effects */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl overflow-hidden">
        <div className={cn(
          "absolute inset-0",
          isAccepted
            ? "bg-gradient-to-br from-emerald-400/[0.12] via-emerald-300/[0.06] to-transparent"
            : "bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent"
        )} />
        <div className="absolute -top-1/2 left-0 right-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent opacity-50" />
        {isAccepted && (
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-emerald-400/10 to-transparent" />
        )}
      </div>

      <div className="relative">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-white sm:text-lg">
            Λεπτομέρειες Κράτησης
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Κλείσιμο"
              className="shrink-0 text-white/60 transition hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Client info with status */}
        <div className={cn(
          "mb-6 flex items-center gap-4 rounded-2xl border p-4",
          isAccepted
            ? "border-emerald-400/16 bg-emerald-500/[0.08]"
            : "border-transparent bg-transparent"
        )}>
          {booking.clientAvatar ? (
            <img
              src={booking.clientAvatar}
              alt={booking.clientName}
              className={cn(
                "h-16 w-16 rounded-full border object-cover shadow-[0_8px_24px_rgba(0,0,0,0.35)]",
                isAccepted
                  ? "border-emerald-300/30 ring-2 ring-emerald-300/15"
                  : "border-white/15 ring-2 ring-white/10"
              )}
            />
          ) : (
            <div className={cn(
              "grid h-16 w-16 place-items-center rounded-full border shadow-[0_8px_24px_rgba(0,0,0,0.35)] shrink-0",
              isAccepted
                ? "border-emerald-300/20 bg-emerald-500/10 ring-2 ring-emerald-300/10"
                : "border-white/10 bg-white/[0.08] ring-2 ring-white/10"
            )}>
              <User className="h-7 w-7 text-white/70" />
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate text-xl font-medium text-white">
              {booking.clientName}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={cn("inline-flex rounded-lg px-2.5 py-0.5 text-xs", status.bg, status.text)}>
                {status.label}
              </span>
              {isAccepted && (
                <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/10 bg-emerald-500/12 px-2.5 py-0.5 text-xs text-emerald-300">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Επιβεβαιωμένη
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Full details list */}
        <ul className="space-y-3 text-gray-300">
          <Li icon={Calendar} label="Ημερομηνία" value={formatDate(booking.date)} />
          <Li icon={Clock} label="Ώρες" value={`${booking.startTime} – ${booking.endTime}`} />
          <Li icon={Clock} label="Διάρκεια" value={`${booking.duration} λεπτά`} />
          <Li icon={Wifi} label="Τύπος" value={booking.isOnline ? "Online συνεδρία" : "Δια ζώσης"} />
          {booking.note && <Li icon={MapPin} label="Σημείωση" value={booking.note} />}
          
          <div className="my-2 h-px bg-white/10" />
          
          <Li icon={User} label="Πελάτης" value={booking.clientName} />
          {booking.clientEmail && <Li icon={Mail} label="Email πελάτη" value={booking.clientEmail} />}
          {booking.trainerName && <Li icon={User} label="Προπονητής" value={booking.trainerName} />}
          
          <div className="my-2 h-px bg-white/10" />
          
          {booking.createdAt && <Li icon={Calendar} label="Υποβλήθηκε" value={formatDateTime(booking.createdAt)} />}
        </ul>

        {/* Action buttons */}
        <div className="mt-6 flex items-center justify-end gap-3">
          {isAccepted && (
            <button className="inline-flex items-center justify-center gap-2.5 h-12 px-5 text-sm font-semibold rounded-xl bg-white text-black border border-white/80 hover:bg-zinc-200 shadow-[0_12px_30px_rgba(255,255,255,0.15)] transition">
              <CalendarPlus className="h-5 w-5" />
              Ημερολόγιο
            </button>
          )}
          {booking.status === "pending" && (
            <>
              <button
                onClick={onDecline}
                className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium rounded-xl bg-white/[0.06] hover:bg-white/10 text-white border border-white/10 transition"
              >
                Απόρριψη
              </button>
              <button
                onClick={onAccept}
                className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white border border-emerald-400/20 shadow-[0_6px_18px_rgba(16,185,129,0.25)] transition"
              >
                Αποδοχή
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Simplified mobile popup overlay
function MobilePopup({
  booking,
  onClose,
  onAccept,
  onDecline,
}: Omit<BookingPopupProps, "isOpen">) {
  const [detailsOpen, setDetailsOpen] = useState(false)

  const statusConfig = {
    pending: { bg: "bg-amber-500/20", text: "text-amber-300", label: "Σε αναμονή" },
    accepted: { bg: "bg-emerald-500/20", text: "text-emerald-300", label: "Αποδεκτή" },
    declined: { bg: "bg-rose-500/20", text: "text-rose-300", label: "Απορρίφθηκε" },
  }
  const status = statusConfig[booking.status]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Popup - centered overlay, not full screen */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-[320px] rounded-2xl border border-white/10 bg-[#0b0c0f] shadow-[0_10px_40px_rgba(0,0,0,0.6)] animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-3 duration-200"
          role="dialog"
          aria-modal="true"
        >
          {/* Header - minimal */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h2 className="text-sm font-semibold text-white">Κράτηση</h2>
            <button
              onClick={onClose}
              className="grid size-8 place-items-center rounded-lg bg-rose-500/20 text-rose-400 transition-colors hover:bg-rose-500/30"
              aria-label="Κλείσιμο"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Content - simplified */}
          <div className="px-4 py-3">
            {/* Client row */}
            <div className="flex items-center gap-3 mb-3">
              {booking.clientAvatar ? (
                <img
                  src={booking.clientAvatar}
                  alt={booking.clientName}
                  className="size-11 rounded-full border border-white/10 object-cover"
                />
              ) : (
                <div className="grid size-11 place-items-center rounded-full border border-white/10 bg-white/5">
                  <User className="size-5 text-white/50" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium text-white">{booking.clientName}</p>
                <span className={cn("inline-flex mt-1 rounded px-2 py-0.5 text-[11px] font-medium", status.bg, status.text)}>
                  {status.label}
                </span>
              </div>
            </div>

            {/* Essential info - compact */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2.5 text-gray-300">
                <Calendar className="size-4 text-gray-500 shrink-0" />
                <span>{formatDate(booking.date)}</span>
              </div>
              <div className="flex items-center gap-2.5 text-gray-300">
                <Clock className="size-4 text-gray-500 shrink-0" />
                <span>{booking.startTime} – {booking.endTime} ({booking.duration} λεπτά)</span>
              </div>
              <div className="flex items-center gap-2.5 text-gray-300">
                <Wifi className="size-4 text-gray-500 shrink-0" />
                <span>{booking.isOnline ? "Online" : "Δια ζώσης"}</span>
              </div>
            </div>

            {/* Dropdown for more details */}
            <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen} className="mt-3">
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-xs text-gray-400 transition-colors hover:bg-white/8">
                <span>Περισσότερα</span>
                <ChevronDown className={cn("size-3.5 transition-transform duration-200", detailsOpen && "rotate-180")} />
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                <div className="mt-2 space-y-2 rounded-lg bg-white/[0.03] p-3 text-sm">
                  {booking.clientEmail && (
                    <div className="flex items-start gap-2">
                      <Mail className="mt-0.5 size-4 text-gray-500 shrink-0" />
                      <p className="text-gray-300 break-all text-xs">{booking.clientEmail}</p>
                    </div>
                  )}
                  {booking.note && (
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 size-4 text-gray-500 shrink-0" />
                      <p className="text-gray-300 text-xs">{booking.note}</p>
                    </div>
                  )}
                  {booking.createdAt && (
                    <div className="flex items-start gap-2">
                      <Calendar className="mt-0.5 size-4 text-gray-500 shrink-0" />
                      <p className="text-gray-400 text-xs">{formatDateTime(booking.createdAt)}</p>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Footer actions - compact */}
          {booking.status === "pending" && (
            <div className="flex gap-2.5 px-4 py-3 border-t border-white/10">
              <button
                onClick={onDecline}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-600/90 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-600"
              >
                <X className="size-4" />
                Απόρριψη
              </button>
              <button
                onClick={onAccept}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600/90 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
              >
                <CheckCircle className="size-4" />
                Αποδοχή
              </button>
            </div>
          )}

          {booking.status !== "pending" && (
            <div className="px-4 py-3 border-t border-white/10">
              <button
                onClick={onClose}
                className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                Κλείσιμο
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export function BookingPopup({
  booking,
  isOpen,
  onClose,
  onAccept,
  onDecline,
}: BookingPopupProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Desktop view - unchanged full layout */}
      <div className="hidden sm:block">
        <DesktopView
          booking={booking}
          onClose={onClose}
          onAccept={onAccept}
          onDecline={onDecline}
        />
      </div>

      {/* Mobile view - simplified popup overlay */}
      <div className="sm:hidden">
        <MobilePopup
          booking={booking}
          onClose={onClose}
          onAccept={onAccept}
          onDecline={onDecline}
        />
      </div>
    </>
  )
}
