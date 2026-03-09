"use client"

import { useState } from "react"
import { X, ChevronDown, Calendar, Clock, User, Mail, MapPin, Wifi, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
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
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

export function BookingPopup({
  booking,
  isOpen,
  onClose,
  onAccept,
  onDecline,
}: BookingPopupProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)

  if (!isOpen) return null

  const statusConfig = {
    pending: {
      bg: "bg-amber-500/15",
      text: "text-amber-600 dark:text-amber-400",
      label: "Pending",
    },
    accepted: {
      bg: "bg-emerald-500/15",
      text: "text-emerald-600 dark:text-emerald-400",
      label: "Accepted",
    },
    declined: {
      bg: "bg-red-500/15",
      text: "text-red-600 dark:text-red-400",
      label: "Declined",
    },
  }

  const status = statusConfig[booking.status]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Popup Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="popup-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 id="popup-title" className="text-base font-semibold text-foreground">
              Booking Request
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close popup"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-4 py-4">
            {/* Essential Info - Client & Time */}
            <div className="flex items-center gap-3 mb-4">
              {booking.clientAvatar ? (
                <img
                  src={booking.clientAvatar}
                  alt={booking.clientName}
                  className="size-12 rounded-full border-2 border-border object-cover"
                />
              ) : (
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <User className="size-6 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">
                  {booking.clientName}
                </p>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", status.bg, status.text)}>
                    {status.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Primary Details - Date & Time */}
            <div className="mb-4 rounded-xl bg-muted/50 p-3 space-y-2">
              <div className="flex items-center gap-2.5">
                <Calendar className="size-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground">
                  {formatDate(booking.date)}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="size-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground">
                  {booking.startTime} – {booking.endTime} ({booking.duration} min)
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                {booking.isOnline ? (
                  <>
                    <Wifi className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground">Online Session</span>
                  </>
                ) : (
                  <>
                    <MapPin className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground">
                      {booking.location || "In Person"}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Expandable Details */}
            <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <span>View more details</span>
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform duration-200",
                    detailsOpen && "rotate-180"
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                <div className="mt-2 space-y-3 rounded-xl border border-border bg-muted/30 p-3">
                  {booking.clientEmail && (
                    <div className="flex items-start gap-2.5">
                      <Mail className="mt-0.5 size-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="text-sm text-foreground break-all">
                          {booking.clientEmail}
                        </p>
                      </div>
                    </div>
                  )}
                  {booking.note && (
                    <div className="flex items-start gap-2.5">
                      <MapPin className="mt-0.5 size-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Note</p>
                        <p className="text-sm text-foreground">{booking.note}</p>
                      </div>
                    </div>
                  )}
                  {booking.createdAt && (
                    <div className="flex items-start gap-2.5">
                      <Calendar className="mt-0.5 size-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Submitted</p>
                        <p className="text-sm text-foreground">
                          {new Date(booking.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Footer Actions */}
          {booking.status === "pending" && (
            <div className="flex gap-3 border-t border-border px-4 py-3">
              <Button
                variant="outline"
                className="flex-1 gap-2 border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300"
                onClick={onDecline}
              >
                <X className="size-4" />
                Decline
              </Button>
              <Button
                className="flex-1 gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={onAccept}
              >
                <CheckCircle className="size-4" />
                Accept
              </Button>
            </div>
          )}

          {booking.status === "accepted" && (
            <div className="border-t border-border px-4 py-3">
              <Button variant="outline" className="w-full" onClick={onClose}>
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
