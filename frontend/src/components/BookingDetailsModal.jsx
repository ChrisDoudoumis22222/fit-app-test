/* components/BookingDetailsModal.jsx – v4: fetch full booking + show all details */
"use client"

import { useState, useMemo, useEffect, lazy, Suspense } from "react"
import { createPortal } from "react-dom"
import { X, CalendarClock, CheckCircle, Ban, Clock, User, Mail, Wifi, MapPin } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { supabase } from "../supabaseClient"

const AcceptModal  = lazy(() => import("./AcceptBookingModal"))
const DeclineModal = lazy(() => import("./DeclineBookingModal"))

/* --------------------------------- utils --------------------------------- */
const safeId = (bOrId) => {
  if (!bOrId) return null
  if (typeof bOrId === "string") return bOrId
  return bOrId.id ?? bOrId.booking_id ?? bOrId.uid ?? bOrId.pk ?? null
}
const toLocalDate = (input) => {
  if (!input) return null
  const d = new Date(input)
  return isNaN(d.getTime()) ? null : d
}
const combineDateTime = (date, time) => {
  if (!date) return null
  const d = new Date(`${date}T${time ?? "00:00:00"}`)
  return isNaN(d.getTime()) ? null : d
}
const fmtDate = (d) =>
  d
    ? new Date(`${d}T00:00:00`).toLocaleDateString("el-GR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—"
const hhmm = (t) => (typeof t === "string" ? (t.match(/^(\d{1,2}:\d{2})/)?.[1] ?? t) : t)
const fmtTs = (ts) =>
  ts
    ? ts.toLocaleString("el-GR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—"

/* ------------------------------- main modal ------------------------------ */
export default function BookingDetailsModal({ booking, bookingId, trainerId, onDone, close }) {
  // lock body scroll
  useEffect(() => {
    const { body, documentElement } = document
    const scrollBarWidth = window.innerWidth - documentElement.clientWidth
    const originalOverflow = body.style.overflow
    const originalPadRight = body.style.paddingRight
    body.style.overflow = "hidden"
    if (scrollBarWidth > 0) body.style.paddingRight = `${scrollBarWidth}px`
    const onKey = (e) => e.key === "Escape" && close?.()
    window.addEventListener("keydown", onKey)
    return () => {
      body.style.overflow = originalOverflow
      body.style.paddingRight = originalPadRight
      window.removeEventListener("keydown", onKey)
    }
  }, [close])

  const id = useMemo(() => safeId(bookingId ?? booking), [bookingId, booking])

  /* ------------------------ fetch full booking (once) ------------------------ */
  const [full, setFull] = useState(() => (booking && id ? booking : null))
  const [loading, setLoading] = useState(!booking)
  const [err, setErr] = useState(null)

  useEffect(() => {
    let alive = true
    if (!id) return

    // If we already have all important fields, skip fetch
    const hasEverything =
      booking &&
      booking.date &&
      booking.start_time &&
      (booking.user_name || booking.user?.full_name) &&
      (booking.trainer_name || booking.trainer?.full_name)

    if (hasEverything) {
      setFull(booking)
      setLoading(false)
      return
    }

    ;(async () => {
      setLoading(true)
      setErr(null)
      // Join profiles for avatars/emails; also use denorm columns for names/emails
      const { data, error } = await supabase
        .from("trainer_bookings")
        .select(
          `
          id, trainer_id, user_id, date, start_time, end_time, duration_min, break_before_min, break_after_min,
          note, status, created_at, updated_at, is_online,
          user_name, user_email, trainer_name,
          accepted_at, declined_at, cancelled_at,
          user:profiles!trainer_bookings_user_id_fkey ( id, full_name, email, avatar_url ),
          trainer:profiles!trainer_bookings_trainer_id_fkey ( id, full_name, email, avatar_url )
        `
        )
        .eq("id", id)
        .single()

      if (!alive) return
      if (error) {
        setErr(error.message || "Σφάλμα ανάγνωσης κράτησης")
        setLoading(false)
        return
      }

      // normalize shape for UI
      const normalized = {
        ...data,
        client: {
          full_name: data.user_name || data.user?.full_name || "Χρήστης",
          email: data.user_email || data.user?.email || null,
          avatar_url: data.user?.avatar_url || null,
        },
        trainer_info: {
          full_name: data.trainer_name || data.trainer?.full_name || null,
          email: data.trainer?.email || null,
          avatar_url: data.trainer?.avatar_url || null,
        },
      }

      setFull(normalized)
      setLoading(false)
    })()

    return () => {
      alive = false
    }
  }, [id, booking])

  const status = useMemo(() => {
    const raw = (full?.status || "pending").toString().toLowerCase()
    if (raw === "confirmed" || raw === "approve" || raw === "approved" || raw === "accept") return "accepted"
    if (raw === "reject") return "declined"
    return raw
  }, [full?.status])

  const statusTone = {
    pending: "bg-amber-500/20 text-amber-300",
    accepted: "bg-emerald-600/20 text-emerald-300",
    declined: "bg-rose-600/20 text-rose-300",
    cancelled: "bg-rose-600/20 text-rose-300",
  }[status]

  const statusLabel = { pending: "Σε αναμονή", accepted: "Αποδεκτή", declined: "Απορρίφθηκε", cancelled: "Ακυρώθηκε" }[
    status
  ]
  const secondLabel = { accepted: "Αποδοχή", declined: "Απόρριψη", cancelled: "Ακύρωση", pending: null }[status]
  const SecondIcon = status === "accepted" ? CheckCircle : status === "pending" ? Clock : Ban

  const submittedAt =
    toLocalDate(full?.booking_date) ?? toLocalDate(full?.created_at) ?? combineDateTime(full?.date, full?.start_time)
  const decisionAt =
    toLocalDate(full?.accepted_at) ??
    toLocalDate(full?.declined_at) ??
    toLocalDate(full?.cancelled_at) ??
    (status !== "pending" ? toLocalDate(full?.updated_at) : null)

  const [showAccept, setAccept] = useState(false)
  const [showDecline, setDecline] = useState(false)

  const client = full?.client ?? booking?.client ?? null

  /* ---------------------------------- UI ---------------------------------- */
  const modalUi = (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        style={{ zIndex: 2147483646 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => e.target === e.currentTarget && close?.()}
      />

      {/* Dialog */}
      <motion.div
        style={{ zIndex: 2147483647 }}
        className="fixed inset-0 flex items-center justify-center p-3 sm:p-6"
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        aria-modal="true"
        role="dialog"
      >
        <div
          className="relative w-full max-w-[96vw] sm:max-w-3xl lg:max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl border border-white/10
                     bg-gradient-to-br from-[#1c1c1e]/90 to-[#111]/90 backdrop-blur-lg p-10 sm:p-12"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={close} className="absolute top-4 right-4 text-gray-400 hover:text-gray-200" aria-label="Κλείσιμο">
            <X className="h-6 w-6" />
          </button>

          {!id ? (
            <>
              <h2 className="text-2xl font-semibold text-gray-100 mb-2">Δεν βρέθηκε κράτηση</h2>
              <p className="text-gray-400">Δεν υπάρχει έγκυρο αναγνωριστικό κράτησης.</p>
              <div className="mt-6 flex justify-end">
                <Button onClick={close}>Κλείσιμο</Button>
              </div>
            </>
          ) : loading ? (
            <>
              <div className="animate-pulse">
                <div className="h-8 w-40 bg-zinc-700/40 rounded mb-6" />
                <div className="h-40 bg-zinc-700/30 rounded-xl mb-6" />
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-6 bg-zinc-700/30 rounded" />
                  ))}
                </div>
              </div>
            </>
          ) : err ? (
            <>
              <h2 className="text-2xl font-semibold text-gray-100 mb-2">Σφάλμα</h2>
              <p className="text-gray-400">{err}</p>
              <div className="mt-6 flex justify-end">
                <Button onClick={close}>Κλείσιμο</Button>
              </div>
            </>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-6 mb-10">
                {client?.avatar_url ? (
                  <img src={client.avatar_url} loading="lazy" alt="" className="h-24 w-24 rounded-full object-cover" />
                ) : (
                  <div className="grid h-24 w-24 place-items-center rounded-full bg-gray-700">
                    <CalendarClock className="h-10 w-10 text-gray-500" />
                  </div>
                )}
                <div>
                  <h2 className="text-3xl font-semibold text-gray-100">
                    {client?.full_name || client?.name || full?.user_name || "Χρήστης"}
                  </h2>
                  <Badge className={`mt-3 text-sm ${statusTone}`}>{statusLabel}</Badge>
                </div>
              </div>

              {/* Core Details */}
              <ul className="space-y-5 text-gray-300 text-lg">
                <Li icon={CalendarClock} label="Ημερομηνία" value={fmtDate(full?.date)} />
                <Li icon={Clock} label="Ώρες" value={`${hhmm(full?.start_time)} – ${hhmm(full?.end_time)}`} />
                <Li icon={Clock} label="Διάρκεια" value={`${full?.duration_min ?? 0} λεπτά`} />
                <Li icon={Wifi} label="Τύπος" value={full?.is_online ? "Online συνεδρία" : "Δια ζώσης"} />
                {!!full?.note && <Li icon={MapPin} label="Σημείωση" value={full.note} />}
                <div className="h-px bg-white/10 my-4" />
                <Li icon={User} label="Πελάτης" value={client?.full_name || full?.user_name || "—"} />
                {!!(client?.email || full?.user_email) && <Li icon={Mail} label="Email πελάτη" value={client?.email || full?.user_email} />}
                {!!full?.trainer_name && <Li icon={User} label="Προπονητής" value={full.trainer_name} />}
                <div className="h-px bg-white/10 my-4" />
                <Li icon={CalendarClock} label="Υποβλήθηκε" value={fmtTs(submittedAt)} />
                {secondLabel && decisionAt && <Li icon={SecondIcon} label={secondLabel} value={fmtTs(decisionAt)} />}
              </ul>

              {/* Actions */}
              {status === "pending" && (
                <div className="mt-12 flex justify-end gap-3">
                  <Button variant="secondary" onClick={() => setDecline(true)} className="px-5 py-3 text-base">
                    Απόρριψη
                  </Button>
                  <Button onClick={() => setAccept(true)} className="px-5 py-3 text-base">
                    Αποδοχή
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>

      {/* Accept / Decline */}
      {showAccept && (
        <Suspense fallback={null}>
          <AcceptModal
            trainerId={trainerId}
            bookingId={id}
            close={() => setAccept(false)}
            onDone={() => {
              setAccept(false)
              onDone?.()
              close?.()
            }}
          />
        </Suspense>
      )}
      {showDecline && (
        <Suspense fallback={null}>
          <DeclineModal
            trainerId={trainerId}
            bookingId={id}
            close={() => setDecline(false)}
            onDone={() => {
              setDecline(false)
              onDone?.()
              close?.()
            }}
          />
        </Suspense>
      )}
    </AnimatePresence>
  )

  // SSR guard + portal
  if (typeof document === "undefined") return null
  return createPortal(modalUi, document.body)
}

/* -------------------------------- subparts ------------------------------- */
const Li = ({ icon: Icon, label, value }) => (
  <li className="flex items-start gap-3">
    <Icon className="h-6 w-6 text-gray-500 mt-0.5" />
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-base text-gray-200 break-words">{value || "—"}</p>
    </div>
  </li>
)
