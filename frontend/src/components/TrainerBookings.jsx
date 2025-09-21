/*  components/TrainerBookings.jsx – trainer_bookings only  v4.0
    -------------------------------------------------------------------------
    • Διαβάζει ΜΟΝΟ από public.trainer_bookings
    • Ενώνει προφίλ χρηστών (avatar_url) και χρησιμοποιεί user_name/user_email αν υπάρχουν
    • Κουμπιά Αποδοχή/Απόρριψη ανοίγουν τα lazy modals
    • Μετά την ενέργεια, γίνεται refresh ΜΟΝΟ της συγκεκριμένης εγγραφής από trainer_bookings
*/

"use client"

import {
  useEffect,
  useState,
  lazy,
  Suspense,
  memo,
  useCallback,
} from "react"
import { supabase } from "../supabaseClient"
import {
  Loader2,
  User as UserIcon,
  CalendarClock,
  CheckCircle,
  Clock,
  Ban,
  CalendarX,
} from "lucide-react"
import { useAuth } from "../AuthProvider"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"

/* lazy modals (code-split) */
const AcceptModal  = lazy(() => import("./AcceptBookingModal"))
const DeclineModal = lazy(() => import("./DeclineBookingModal"))
const DetailsModal = lazy(() => import("./BookingDetailsModal"))

/* mini spinner */
const Spinner = () => <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />

/* status → UI maps */
const badgeTone = {
  accepted:  "bg-emerald-500/15 text-emerald-200",
  pending:   "bg-amber-400/15  text-amber-200",
  declined:  "bg-rose-500/15   text-rose-200",
  cancelled: "bg-rose-500/15   text-rose-200",
}
const badgeIcon = {
  accepted:  CheckCircle,
  pending:   Clock,
  declined:  Ban,
  cancelled: Ban,
}

export default function TrainerBookings({ trainerId: propId }) {
  const { profile } = useAuth()
  const trainerId = propId || profile?.id || null

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!trainerId) return
    ;(async () => {
      setLoading(true)
      setError("")
      try {
        // 1) Fetch bookings for this trainer (lightweight column set)
        const { data: bookings, error: bErr } = await supabase
          .from("trainer_bookings")
          .select(`
            id,
            user_id,
            trainer_id,
            status,
            created_at,
            date,
            start_time,
            end_time,
            duration_min,
            note,
            user_email,
            user_name,
            trainer_name
          `)
          .eq("trainer_id", trainerId)
          .order("date", { ascending: false })
          .order("start_time", { ascending: false })
        if (bErr) throw bErr

        // 2) Attach user avatar/full_name from profiles (if available)
        const userIds = Array.from(new Set((bookings ?? []).map(b => b.user_id)))
        let userMap = {}
        if (userIds.length) {
          const { data: users, error: uErr } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url, email")
            .in("id", userIds)
          if (uErr) throw uErr
          userMap = Object.fromEntries((users ?? []).map(u => [u.id, u]))
        }

        // 3) Normalize rows for UI
        const normalized = (bookings ?? []).map(b => {
          const slot = b.date && b.start_time ? `${b.date}T${b.start_time}` : null
          const fromProfiles = userMap[b.user_id] || {}
          return {
            ...b,
            // prefer denormalized name/email; fallback to profiles.*
            client: {
              full_name: b.user_name || fromProfiles.full_name || null,
              avatar_url: fromProfiles.avatar_url || null,
              email: b.user_email || fromProfiles.email || null,
            },
            slot_time: slot,
          }
        })

        setRows(normalized)
      } catch (e) {
        console.error(e)
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [trainerId])

  /* -------- UI states -------- */
  if (!trainerId) return <Msg spin label="Αναμονή trainer…" />
  if (loading) return <Skeleton />
  if (error) return <Msg error label={error} />
  if (!rows.length) return <Empty />

  return (
    <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((b) => (
        <BookingCard key={b.id} booking={b} />
      ))}
    </div>
  )
}

/* ========== helper views ========== */
const Msg = ({ label, spin = false, error = false }) => (
  <p className={`flex items-center gap-2 py-10 ${error ? "text-red-400" : "text-gray-400"}`}>
    {spin && <Spinner />} {label}
  </p>
)

const Skeleton = () => (
  <div className="grid gap-8 md:grid-cols-2">
    {Array.from({ length: 4 }).map((_, i) => (
      <div
        key={i}
        className="relative h-44 overflow-hidden rounded-3xl bg-gray-700/40 sm:h-52"
      >
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-gray-600/40 to-transparent" />
      </div>
    ))}
    <style jsx>{`
      @keyframes shimmer {
        100% { transform: translateX(100%); }
      }
    `}</style>
  </div>
)

const Empty = () => (
  <div className="flex min-h-[260px] w-full items-center justify-center rounded-3xl border border-white/10 bg-gradient-to-br from-[#1a1c21]/85 to-[#121417]/85 backdrop-blur-lg">
    <div className="flex flex-col items-center gap-6">
      <CalendarX className="h-16 w-16 text-gray-500" />
      <p className="text-center text-lg text-gray-300">Δεν υπάρχουν κρατήσεις ακόμη.</p>
    </div>
  </div>
)

/* ========== BookingCard (memo) ========== */
const BookingCard = memo(function BookingCard({ booking }) {
  const { id, client, status, created_at, slot_time } = booking

  const fmt = (ts) =>
    ts
      ? new Date(ts).toLocaleString("el-GR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—"

  const whenReq = fmt(created_at)
  const whenAcc =
    status === "accepted" ? fmt(booking.updated_at || booking.accepted_at) : null

  const session = slot_time
    ? new Date(slot_time).toLocaleString("el-GR", {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null

  const normalized = (status || "pending").toLowerCase()
  const Icon = badgeIcon[normalized] || CalendarClock
  const tone = badgeTone[normalized] || "bg-gray-600/15 text-gray-300"

  /* dialogs */
  const [showAcc, setAcc] = useState(false)
  const [showDec, setDec] = useState(false)
  const [showDet, setDet] = useState(false)

  /* stable callbacks */
  const openDetails = useCallback(() => setDet(true), [])
  const closeDetails = useCallback(() => setDet(false), [])

  // Refresh only this row from trainer_bookings
  const refresh = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("trainer_bookings")
        .select("status, updated_at")
        .eq("id", id)
        .maybeSingle()
      if (data) {
        booking.status = (data.status || "pending").toLowerCase()
        booking.updated_at = data.updated_at || null
      }
    } catch (e) {
      console.error("refresh row failed:", e)
    }
  }, [id, booking])

  const stop = (e) => e.stopPropagation()

  return (
    <>
      <div
        onClick={openDetails}
        className="group relative cursor-pointer overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#28282a]/90 to-[#141416]/90 backdrop-blur-lg transition-transform hover:-translate-y-1 hover:shadow-2xl hover:ring-1 hover:ring-indigo-500/40"
      >
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-white/5" />

        <div className="flex flex-col gap-8 p-8 sm:flex-row sm:items-center">
          {/* avatar */}
          {client?.avatar_url ? (
            <img
              src={client.avatar_url}
              alt=""
              loading="lazy"
              className="h-24 w-24 shrink-0 rounded-full object-cover ring-2 ring-indigo-500/40 group-hover:ring-indigo-400/60"
            />
          ) : (
            <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-gray-700">
              <UserIcon className="h-10 w-10 text-gray-400" />
            </div>
          )}

          {/* meta */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-2xl font-semibold text-gray-100">
              {client?.full_name || "Χρήστης"}
            </p>
            {client?.email && (
              <p className="truncate text-sm text-gray-400">{client.email}</p>
            )}
            {session && (
              <p className="text-lg capitalize text-gray-400">{session}</p>
            )}

            <div className="mt-3 space-y-1 text-sm text-gray-400">
              <p>
                <span className="inline-block w-24 text-gray-500">Αίτημα:</span>{" "}
                {whenReq}
              </p>
              {whenAcc && (
                <p>
                  <span className="inline-block w-24 text-gray-500">Αποδοχή:</span>{" "}
                  {whenAcc}
                </p>
              )}
            </div>
          </div>

          {/* badge/actions */}
          <div className="flex shrink-0 flex-col items-end gap-3" onClick={stop}>
            <Badge className={`flex items-center gap-2 px-4 py-1.5 ${tone}`}>
              <Icon className="h-5 w-5" />
              {normalized === "accepted"
                ? "Αποδεκτή"
                : normalized === "pending"
                ? "Σε αναμονή"
                : normalized === "declined"
                ? "Απορρίφθηκε"
                : "Ακυρώθηκε"}
            </Badge>

            {normalized === "pending" && (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setAcc(true)}>
                  Αποδοχή
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setDec(true)}>
                  Απόρριψη
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* lazy modals */}
      {showAcc && (
        <Suspense fallback={null}>
          <AcceptModal
            bookingId={id}
            close={() => setAcc(false)}
            onDone={refresh}
          />
        </Suspense>
      )}
      {showDec && (
        <Suspense fallback={null}>
          <DeclineModal
            bookingId={id}
            close={() => setDec(false)}
            onDone={refresh}
          />
        </Suspense>
      )}
      {showDet && (
        <Suspense fallback={null}>
          <DetailsModal
            booking={booking}
            trainerId={booking.trainer_id}
            onDone={refresh}
            close={closeDetails}
          />
        </Suspense>
      )}
    </>
  )
})
