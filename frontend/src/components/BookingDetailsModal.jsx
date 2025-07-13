/*  components/BookingDetailsModal.jsx  –  responsive + actions (v2.0)
    ------------------------------------------------------------------
    •  Ελαφρύ: όλα τα nested modals (Accept / Decline) σε React.lazy
    •  Mobile-first: full-width & scroll σε sm-screens, glass panel σε md+
    •  Εμφανίζει:
        – ώρα υποβολής
        – badge κατάστασης
        – ώρα αποδοχής / απόρριψης (εάν υπάρχει)
    •  Αν status === "pending"  ➜  κουμπιά Αποδοχή / Απόρριψη
*/

"use client"

import { useState, lazy, Suspense } from "react"
import {
  X,
  CalendarClock,
  CheckCircle,
  Ban,
  Clock,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"

/* nested modals – code-split για χαμηλό bundle */
const AcceptModal  = lazy(() => import("./AcceptBookingModal"))
const DeclineModal = lazy(() => import("./DeclineBookingModal"))

export default function BookingDetailsModal({
  booking,
  trainerId,
  onDone,
  close,
}) {
  const { id, client, status, booking_date, accepted_at } = booking

  /* τοπικό state για nested dialogs */
  const [showAccept, setAccept]   = useState(false)
  const [showDecline, setDecline] = useState(false)

  const fmt = (ts) =>
    new Date(ts).toLocaleString("el-GR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  /* badge tone + δεύτερη γραμμή */
  const tone =
    status === "confirmed"
      ? "bg-emerald-600/20 text-emerald-300"
      : status === "cancelled"
      ? "bg-rose-600/20 text-rose-300"
      : "bg-amber-500/20 text-amber-300"

  const secondLabel =
    status === "confirmed"
      ? "Αποδοχή"
      : status === "cancelled"
      ? "Απόρριψη"
      : null
  const SecondIcon =
    status === "confirmed" ? CheckCircle : status === "cancelled" ? Ban : Clock

  /* ---------------------------------------------------------------- */
  return (
    <AnimatePresence>
      {/* overlay */}
      <motion.div
        className="fixed inset-0 z-[99] bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
      />

      {/* dialog */}
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
      >
        <div
          className="relative w-full max-w-none sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10
                     bg-gradient-to-br from-[#1c1c1e]/90 to-[#111]/90 backdrop-blur-lg p-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* close */}
          <button
            onClick={close}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-200"
          >
            <X className="h-6 w-6" />
          </button>

          {/* header */}
          <div className="flex items-center gap-4 mb-8">
            {client?.avatar_url ? (
              <img
                src={client.avatar_url}
                loading="lazy"
                alt=""
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="grid h-20 w-20 place-items-center rounded-full bg-gray-700">
                <CalendarClock className="h-8 w-8 text-gray-500" />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-semibold text-gray-100">
                {client?.full_name || "Χρήστης"}
              </h2>
              <Badge className={`mt-2 ${tone}`}>
                {status === "pending"
                  ? "Σε αναμονή"
                  : status === "confirmed"
                  ? "Επιβεβαιωμένη"
                  : "Ακυρώθηκε"}
              </Badge>
            </div>
          </div>

          {/* times */}
          <ul className="space-y-4 text-gray-300">
            <Li
              icon={CalendarClock}
              label="Υποβλήθηκε"
              value={fmt(booking_date)}
            />
            {accepted_at && secondLabel && (
              <Li
                icon={SecondIcon}
                label={secondLabel}
                value={fmt(accepted_at)}
              />
            )}
          </ul>

          {/* actions */}
          {status === "pending" && (
            <div className="mt-10 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setDecline(true)}
              >
                Απόρριψη
              </Button>
              <Button onClick={() => setAccept(true)}>Αποδοχή</Button>
            </div>
          )}
        </div>
      </motion.div>

      {/* nested lazy-loaded dialogs */}
      {showAccept && (
        <Suspense fallback={null}>
          <AcceptModal
            trainerId={trainerId}
            bookingId={id}
            close={() => setAccept(false)}
            onDone={() => {
              setAccept(false)
              onDone?.()
              close()
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
              close()
            }}
          />
        </Suspense>
      )}
    </AnimatePresence>
  )
}

/* helper list-item */
const Li = ({ icon: Icon, label, value }) => (
  <li className="flex items-start gap-3">
    <Icon className="h-5 w-5 text-gray-500 mt-0.5" />
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-base text-gray-200">{value}</p>
    </div>
  </li>
)
