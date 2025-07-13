/*  components/TrainerBookings.jsx – glass-masonry list + details modal  v3.3
    -------------------------------------------------------------------------
    •  Όλα τα “βαριά” κομμάτια (Details / Accept / Decline) σε React.lazy + Suspense
    •  <BookingCard/> γίνεται React.memo ώστε να μη ξανα-render-άρεται άσκοπα
    •  useCallback για σταθερά handlers, lazy-loading avatars (loading="lazy")
    •  Skeleton & empty states μένουν ελαφριά· ίδιο UI / palette
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
  AlertTriangle,
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
const Spinner = () => (
  <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
)

/* status → UI maps */
const badgeTone = {
  confirmed: "bg-emerald-500/15 text-emerald-200",
  pending: "bg-amber-400/15  text-amber-200",
  cancelled: "bg-rose-500/15   text-rose-200",
}
const badgeIcon = {
  confirmed: CheckCircle,
  pending: Clock,
  cancelled: Ban,
}

export default function TrainerBookings({ trainerId: propId }) {
  /* -------- trainer UUID -------- */
  const { profile } = useAuth()
  const authUUID = supabase.auth.getUser()?.data?.user?.id
  const trainerId = propId || profile?.id || authUUID

  /* -------- state -------- */
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  /* -------- fetch once -------- */
  useEffect(() => {
    if (!trainerId) return
    ;(async () => {
      setLoading(true)
      setError("")
      try {
        /* bookings */
        const { data: bookings, error: bErr } = await supabase
          .from("bookings")
          .select("*")
          .eq("trainer_id", trainerId)
          .order("booking_date", { ascending: false })
        if (bErr) throw bErr

        /* users */
        const ids = [...new Set(bookings.map((b) => b.user_id))]
        const { data: users, error: uErr } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, email")
          .in("id", ids)
        if (uErr) throw uErr

        const map = Object.fromEntries(users.map((u) => [u.id, u]))
        setRows(
          bookings.map((b) => ({ ...b, client: map[b.user_id] || null }))
        )
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
        <BookingCard key={b.id} booking={b} trainerId={trainerId} />
      ))}
    </div>
  )
}

/* ========== helper views ========== */
const Msg = ({ label, spin = false, error = false }) => (
  <p
    className={`flex items-center gap-2 py-10 ${
      error ? "text-red-400" : "text-gray-400"
    }`}
  >
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
        100% {
          transform: translateX(100%);
        }
      }
    `}</style>
  </div>
)

const Empty = () => (
  <div className="flex min-h-[260px] w-full items-center justify-center rounded-3xl border border-white/10 bg-gradient-to-br from-[#1a1c21]/85 to-[#121417]/85 backdrop-blur-lg">
    <div className="flex flex-col items-center gap-6">
      <CalendarX className="h-16 w-16 text-gray-500" />
      <p className="text-center text-lg text-gray-300">
        Δεν υπάρχουν κρατήσεις ακόμη.
      </p>
    </div>
  </div>
)

/* ========== BookingCard (memo) ========== */
const BookingCard = memo(function BookingCard({ booking, trainerId }) {
  const { id, client, status, booking_date, accepted_at, slot_time } =
    booking

  const fmt = (ts) =>
    new Date(ts).toLocaleString("el-GR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  const whenReq = fmt(booking_date)
  const whenAcc = status === "confirmed" ? fmt(accepted_at) : null
  const session = slot_time
    ? new Date(slot_time).toLocaleString("el-GR", {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null

  const Icon = badgeIcon[status] || CalendarClock
  const tone = badgeTone[status] || "bg-gray-600/15 text-gray-300"

  /* dialogs */
  const [showAcc, setAcc] = useState(false)
  const [showDec, setDec] = useState(false)
  const [showDet, setDet] = useState(false)

  /* stable callbacks */
  const openDetails = useCallback(() => setDet(true), [])
  const closeDetails = useCallback(() => setDet(false), [])

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("bookings")
      .select("status, accepted_at")
      .eq("id", id)
      .single()
    if (data) {
      booking.status = data.status
      booking.accepted_at = data.accepted_at
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
            {session && (
              <p className="text-lg capitalize text-gray-400">{session}</p>
            )}

            <div className="mt-3 space-y-1 text-sm text-gray-400">
              <p>
                <span className="inline-block w-24 text-gray-500">
                  Αίτημα:
                </span>{" "}
                {whenReq}
              </p>
              {whenAcc && (
                <p>
                  <span className="inline-block w-24 text-gray-500">
                    Αποδοχή:
                  </span>{" "}
                  {whenAcc}
                </p>
              )}
            </div>
          </div>

          {/* badge/actions */}
          <div
            className="flex shrink-0 flex-col items-end gap-3"
            onClick={stop}
          >
            <Badge className={`flex items-center gap-2 px-4 py-1.5 ${tone}`}>
              <Icon className="h-5 w-5" />
              {status === "confirmed"
                ? "Επιβεβαιωμένη"
                : status === "pending"
                ? "Σε αναμονή"
                : "Ακυρώθηκε"}
            </Badge>

            {status === "pending" && (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setAcc(true)}>
                  Αποδοχή
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setDec(true)}
                >
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
            trainerId={trainerId}
            close={() => setAcc(false)}
            onDone={refresh}
          />
        </Suspense>
      )}
      {showDec && (
        <Suspense fallback={null}>
          <DeclineModal
            bookingId={id}
            trainerId={trainerId}
            close={() => setDec(false)}
            onDone={refresh}
          />
        </Suspense>
      )}
      {showDet && (
        <Suspense fallback={null}>
          <DetailsModal
            booking={booking}
            trainerId={trainerId}
            onDone={refresh}
            close={closeDetails}
          />
        </Suspense>
      )}
    </>
  )
})
