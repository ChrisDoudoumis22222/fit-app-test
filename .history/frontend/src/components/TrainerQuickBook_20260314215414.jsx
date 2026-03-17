"use client"
import React, { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import {
  Loader2,
  Calendar,
  Clock,
  Wifi,
  User,
  Mail,
  Euro,
  RotateCw,
  X,
} from "lucide-react"
import { supabase } from "../supabaseClient"
import SuccessMessage from "../components/quickbook/SuccessMessage"
import ErrorMessage from "../components/quickbook/ErrorMessage"

/* ---------------- small ui helpers ---------------- */
const Tile = ({ className = "", children }) => (
  <div className={className}>{children}</div>
)

const Spinner = ({ label = "Φόρτωση…" }) => (
  <div className="flex items-center gap-2 text-sm text-white/75">
    <Loader2 className="h-4 w-4 animate-spin" />
    {label}
  </div>
)

const FieldLabel = ({ icon: Icon, children, className = "" }) => (
  <span
    className={[
      "inline-flex items-center gap-1.5 text-[13px] font-medium",
      className || "text-white/80",
    ].join(" ")}
  >
    {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
    <span>{children}</span>
  </span>
)

/* ---------------- helpers ---------------- */
const pad = (n) => String(n).padStart(2, "0")
const clamp = (x, a, b) => Math.max(a, Math.min(b, x))
const minToHHMM = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
const minToHHMMSS = (m) => `${minToHHMM(m)}:00`
const overlaps = (aS, aE, bS, bE) => Math.max(aS, bS) < Math.min(aE, bE)

const strToMinutes = (v) => {
  if (!v) return 0
  if (v instanceof Date) return v.getHours() * 60 + v.getMinutes()
  const m = String(v).match(/(\d{1,2}):(\d{2})/)
  if (!m) return 0
  const h = clamp(parseInt(m[1], 10) || 0, 0, 23)
  const min = clamp(parseInt(m[2], 10) || 0, 0, 59)
  return h * 60 + min
}

const safeDate = (iso) => {
  if (!iso) return null
  const d = new Date(`${iso}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

const formatShortDate = (iso) => {
  const d = safeDate(iso)
  if (!d) return iso || "—"
  return d.toLocaleDateString("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

const isValidEmail = (value) => /\S+@\S+\.\S+/.test(String(value || "").trim())

const normalizeStatus = (status) => String(status || "").trim().toLowerCase()

const isCancelledStatus = (status) =>
  ["declined", "cancelled", "canceled", "rejected"].includes(normalizeStatus(status))

const isPendingStatus = (status) =>
  ["pending", "request", "requested", "awaiting", "waiting"].includes(
    normalizeStatus(status)
  )

const isBookedStatus = (status) =>
  [
    "accepted",
    "booked",
    "confirmed",
    "completed",
    "paid",
    "approved",
  ].includes(normalizeStatus(status))

/* ---------------- schedule from DB ---------------- */
async function readScheduleFromDB(trainerId, isoDate, hints) {
  const d = new Date(isoDate)
  const jsDow = d.getDay()

  const engShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const engLong = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const grShort = ["Κυρ", "Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ"]
  const grLong = ["Κυριακή", "Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο"]

  const candidates = [
    String(jsDow),
    String(((jsDow + 6) % 7) + 1),
    engShort[jsDow],
    engLong[jsDow],
    grShort[jsDow],
    grLong[jsDow],
  ]

  let windows = []
  let defaultOnline = false

  try {
    const { data } = await supabase
      .from("trainer_availability")
      .select("weekday,start_time,end_time,is_online")
      .eq("trainer_id", trainerId)
      .in("weekday", candidates)

    if (Array.isArray(data) && data.length) {
      windows = data.map((r) => ({
        s: strToMinutes(r.start_time),
        e: strToMinutes(r.end_time),
      }))
      defaultOnline = !!data[0]?.is_online
    }
  } catch (_) {}

  let dayBreaks = []
  try {
    const { data: brk } = await supabase
      .from("trainer_breaks")
      .select("weekday,date,start_time,end_time")
      .eq("trainer_id", trainerId)
      .or(`date.eq.${isoDate},weekday.in.(${candidates.join(",")})`)

    if (Array.isArray(brk)) {
      dayBreaks = brk
        .filter((r) => (r.date ? r.date === isoDate : true))
        .map((r) => ({
          s: strToMinutes(r.start_time),
          e: strToMinutes(r.end_time),
        }))
    }
  } catch (_) {}

  if (!windows.length) {
    if (hints?.workStart && hints?.workEnd) {
      windows = [{ s: strToMinutes(hints.workStart), e: strToMinutes(hints.workEnd) }]
    } else {
      try {
        const { data: prof } = await supabase
          .from("profiles")
          .select("work_start,work_end")
          .eq("id", trainerId)
          .maybeSingle()

        if (prof?.work_start && prof.work_end) {
          windows = [{ s: strToMinutes(prof.work_start), e: strToMinutes(prof.work_end) }]
        }
      } catch (_) {}

      if (!windows.length) windows = [{ s: strToMinutes("08:00"), e: strToMinutes("22:00") }]
    }
  }

  let sessionMin = hints?.sessionMinutes || 60
  let stepMin = 15

  try {
    const { data: prof } = await supabase
      .from("profiles")
      .select("session_minutes, step_min, slot_minutes, default_online")
      .eq("id", trainerId)
      .maybeSingle()

    if (prof) {
      sessionMin = Number(prof.session_minutes ?? sessionMin) || sessionMin
      stepMin = Number(prof.step_min ?? prof.slot_minutes ?? stepMin) || stepMin
      if (!defaultOnline) defaultOnline = !!prof.default_online
    }
  } catch (_) {}

  return {
    windows,
    breaks: dayBreaks,
    stepMin,
    sessionMin,
    bufferMin: 0,
    defaultOnline,
  }
}

/* ---------------- intervals from bookings ---------------- */
function bookingsToHiddenBookedIntervals(rows) {
  return (rows || [])
    .filter((r) => !isCancelledStatus(r.status))
    .filter((r) => isBookedStatus(r.status))
    .map((r) => {
      const s = strToMinutes(r.start_time)
      const e = r.end_time ? strToMinutes(r.end_time) : s + Number(r.duration_min || 0)
      return { s, e }
    })
}

function bookingsToPendingIntervals(rows) {
  return (rows || [])
    .filter((r) => !isCancelledStatus(r.status))
    .filter((r) => isPendingStatus(r.status))
    .map((r) => {
      const s = strToMinutes(r.start_time)
      const e = r.end_time ? strToMinutes(r.end_time) : s + Number(r.duration_min || 0)
      return { s, e }
    })
}

/* ---------------- build renderable slots ---------------- */
function buildRenderableSlots(baseWindows, breaks, booked, pending, durationMin, stepMin) {
  const slots = []

  baseWindows.forEach((w) => {
    for (let s = w.s; s + durationMin <= w.e; s += stepMin) {
      const e = s + durationMin

      const isRest = (breaks || []).some((b) => overlaps(s, e, b.s, b.e))
      const isBooked = !isRest && (booked || []).some((b) => overlaps(s, e, b.s, b.e))
      const isPending = !isRest && !isBooked && (pending || []).some((p) => overlaps(s, e, p.s, p.e))

      if (isRest || isBooked) continue

      slots.push({
        s,
        e,
        status: isPending ? "pending" : "available",
      })
    }
  })

  return slots
}

/* ============================ COMPONENT ============================ */
export default function TrainerQuickBook({
  trainerId,
  selectedDate,
  sessionMinutes,
  workStart,
  workEnd,
  onCreated,
  mobileOpen = false,
  onMobileClose,
}) {
  const [mounted, setMounted] = useState(false)

  const [date, setDate] = useState(selectedDate || new Date().toISOString().slice(0, 10))
  const [sched, setSched] = useState(null)
  const [uiSession, setUiSession] = useState(sessionMinutes || 60)
  const [isOnline, setIsOnline] = useState(false)

  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")

  const [selectedStart, setSelectedStart] = useState(null)
  const [loadingDay, setLoadingDay] = useState(false)
  const [dayRows, setDayRows] = useState([])
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)
  const [okMsg, setOkMsg] = useState("")
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (selectedDate) setDate(selectedDate)
  }, [selectedDate])

  useEffect(() => {
    let alive = true
    if (!trainerId || !date) return

    ;(async () => {
      const s = await readScheduleFromDB(trainerId, date, {
        sessionMinutes,
        workStart,
        workEnd,
      })

      if (!alive) return
      setSched(s)
      setUiSession(s.sessionMin || 60)
      setIsOnline(s.defaultOnline || false)
    })()

    return () => {
      alive = false
    }
  }, [trainerId, date, sessionMinutes, workStart, workEnd])

  useEffect(() => {
    if (!trainerId || !date) return
    let alive = true
    setLoadingDay(true)
    setErr(null)

    ;(async () => {
      const { data, error } = await supabase
        .from("trainer_bookings")
        .select("id,start_time,end_time,duration_min,status")
        .eq("trainer_id", trainerId)
        .eq("date", date)

      if (!alive) return

      if (error) {
        setDayRows([])
        setErr(error.message || "Σφάλμα φόρτωσης")
      } else {
        setDayRows(data || [])
      }

      setLoadingDay(false)
    })()

    return () => {
      alive = false
    }
  }, [trainerId, date, refreshTick])

  useEffect(() => {
    setSelectedStart(null)
  }, [date, uiSession])

  useEffect(() => {
    if (!mounted || !mobileOpen) return
    if (typeof window === "undefined") return

    const isMobileViewport = window.matchMedia("(max-width: 639.98px)").matches
    if (!isMobileViewport) return

    const prevHtmlOverflow = document.documentElement.style.overflow
    const prevBodyOverflow = document.body.style.overflow

    document.documentElement.style.overflow = "hidden"
    document.body.style.overflow = "hidden"

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow
      document.body.style.overflow = prevBodyOverflow
    }
  }, [mounted, mobileOpen])

  const bookedIntervals = useMemo(
    () => bookingsToHiddenBookedIntervals(dayRows),
    [dayRows]
  )

  const pendingIntervals = useMemo(
    () => bookingsToPendingIntervals(dayRows),
    [dayRows]
  )

  const slots = useMemo(() => {
    if (!sched) return []
    return buildRenderableSlots(
      sched.windows || [],
      sched.breaks || [],
      bookedIntervals,
      pendingIntervals,
      uiSession,
      Math.max(5, sched.stepMin || 15)
    )
  }, [sched, bookedIntervals, pendingIntervals, uiSession])

  const availableCount = useMemo(
    () => slots.filter((s) => s.status === "available").length,
    [slots]
  )

  const pendingCount = useMemo(
    () => slots.filter((s) => s.status === "pending").length,
    [slots]
  )

  const shortDate = useMemo(() => formatShortDate(date), [date])

  const headerWeekday = useMemo(() => {
    const d = safeDate(date)
    if (!d) return "—"
    return d.toLocaleDateString("el-GR", { weekday: "long" })
  }, [date])

  const headerDateLine = useMemo(() => {
    const d = safeDate(date)
    if (!d) return "—"
    return d.toLocaleDateString("el-GR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  }, [date])

  const niceWindows =
    (sched?.windows || []).length
      ? sched.windows.map((w) => `${minToHHMM(w.s)}–${minToHHMM(w.e)}`).join(", ")
      : "—"

  const handleCreate = async () => {
    setOkMsg("")
    setErr(null)

    const cleanEmail = String(email || "").trim()
    const cleanUsername = String(username || "").trim()

    if (!trainerId) return setErr("Λείπει το trainerId.")
    if (!cleanEmail && !cleanUsername) {
      return setErr("Βάλε τουλάχιστον email ή όνομα πελάτη.")
    }
    if (cleanEmail && !isValidEmail(cleanEmail)) {
      return setErr("Το email δεν είναι έγκυρο.")
    }
    if (selectedStart == null) return setErr("Επίλεξε ώρα.")
    if (!sched) return setErr("Δεν βρέθηκε διαθέσιμο ωράριο.")

    const selectedSlot = slots.find((x) => x.s === selectedStart)
    if (!selectedSlot || selectedSlot.status !== "available") {
      return setErr("Η ώρα δεν είναι διαθέσιμη πλέον. Διάλεξε άλλη.")
    }

    const endMin = selectedStart + uiSession
    if (bookedIntervals.some((b) => overlaps(selectedStart, endMin, b.s, b.e))) {
      return setErr("Η ώρα δεν είναι διαθέσιμη πλέον. Διάλεξε άλλη.")
    }

    if (pendingIntervals.some((p) => overlaps(selectedStart, endMin, p.s, p.e))) {
      return setErr("Η ώρα είναι ήδη pending. Διάλεξε άλλη.")
    }

    setSaving(true)

    try {
      let user_id = null
      let resolvedName = null

      if (cleanEmail) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("email", cleanEmail)
          .maybeSingle()

        if (prof) {
          user_id = prof.id
          resolvedName = prof.full_name
        }
      }

      const start_time = minToHHMMSS(selectedStart)
      const end_time = minToHHMMSS(endMin)
      const numericAmount = Number(amount)
      const hasAmount = amount !== "" && Number.isFinite(numericAmount) && numericAmount >= 0
      const amountStr = hasAmount ? ` [€${numericAmount.toLocaleString("el-GR")}]` : ""
      const finalNote = `${amountStr}${amountStr && note ? " " : ""}${note || ""}`.trim()

      const payload = {
        trainer_id: trainerId,
        user_id,
        user_email: cleanEmail || null,
        user_name: cleanUsername || resolvedName || null,
        date,
        start_time,
        end_time,
        duration_min: uiSession,
        is_online: isOnline,
        note: finalNote || null,
        status: "accepted",
      }

      const { error: insErr } = await supabase.from("trainer_bookings").insert(payload)
      if (insErr) throw insErr

      setDayRows((r) => [
        ...r,
        {
          id: Math.random(),
          start_time,
          end_time,
          duration_min: uiSession,
          status: "accepted",
        },
      ])

      setSelectedStart(null)
      setEmail("")
      setUsername("")
      setAmount("")
      setNote("")
      setOkMsg("Η κράτηση καταχωρήθηκε ✅")
      onCreated && onCreated(payload)
    } catch (e) {
      setErr(e?.message || "Αποτυχία δημιουργίας κράτησης")
    } finally {
      setSaving(false)
    }
  }

  const baseStyles = (
    <style>{`
      .qb-date-desktop,
      .qb-date-mobile {
        color-scheme: dark;
        -webkit-appearance: none;
        appearance: none;
      }

      .qb-date-desktop::-webkit-calendar-picker-indicator,
      .qb-date-mobile::-webkit-calendar-picker-indicator {
        opacity: 0;
        cursor: pointer;
        width: 44px;
        height: 100%;
      }

      .qb-date-desktop::-webkit-datetime-edit,
      .qb-date-desktop::-webkit-datetime-edit-text,
      .qb-date-desktop::-webkit-datetime-edit-month-field,
      .qb-date-desktop::-webkit-datetime-edit-day-field,
      .qb-date-desktop::-webkit-datetime-edit-year-field,
      .qb-date-mobile::-webkit-datetime-edit,
      .qb-date-mobile::-webkit-datetime-edit-text,
      .qb-date-mobile::-webkit-datetime-edit-month-field,
      .qb-date-mobile::-webkit-datetime-edit-day-field,
      .qb-date-mobile::-webkit-datetime-edit-year-field {
        color: #ffffff;
      }

      .qb-scroll {
        scrollbar-width: thin;
        scrollbar-color: rgba(161, 161, 170, .35) transparent;
      }

      .qb-scroll::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      .qb-scroll::-webkit-scrollbar-track {
        background: transparent;
      }

      .qb-scroll::-webkit-scrollbar-thumb {
        background: linear-gradient(
          180deg,
          rgba(113,113,122,.28),
          rgba(82,82,91,.38)
        );
        border-radius: 999px;
        border: 2px solid transparent;
        background-clip: padding-box;
      }

      .qb-scroll::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(
          180deg,
          rgba(161,161,170,.34),
          rgba(113,113,122,.48)
        );
        border-radius: 999px;
        border: 2px solid transparent;
        background-clip: padding-box;
      }

      .qb-backdrop-in {
        animation: qbFadeIn .22s ease-out both;
      }

      .qb-sheet-in {
        animation: qbSheetIn .30s cubic-bezier(.22,1,.36,1) both;
      }

      @keyframes qbFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes qbSheetIn {
        from {
          opacity: 0;
          transform: translateY(28px) scale(.985);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    `}</style>
  )

  const renderDesktopView = () => (
    <div className="hidden sm:block w-full h-full">
      {baseStyles}

      <div className="px-0 py-0">
        <div className="flex flex-col gap-4">
          <div className="border-b border-zinc-800/90 pb-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-zinc-900/80 ring-1 ring-zinc-800/90">
                <Calendar className="h-4.5 w-4.5 text-white/80" />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-semibold text-white/92 leading-tight">
                  Νέα κράτηση
                </h3>

                <div className="mt-1 text-white/62 leading-snug">
                  <div className="text-sm capitalize">{headerWeekday}</div>
                  <div className="text-sm">{headerDateLine}</div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900/70 px-2.5 py-1 text-[11px] text-white/68">
                    Ωράριο: {niceWindows}
                  </span>

                  <span className="inline-flex items-center rounded-full border border-emerald-500/15 bg-emerald-500/12 px-2.5 py-1 text-[11px] text-emerald-200/95">
                    {loadingDay || !sched ? "…" : `${availableCount} διαθέσιμες`}
                  </span>

                  <span className="inline-flex items-center rounded-full border border-yellow-500/20 bg-yellow-500/12 px-2.5 py-1 text-[11px] text-yellow-200/95">
                    {loadingDay || !sched ? "…" : `${pendingCount} pending`}
                  </span>
                </div>
              </div>

              <button
                type="button"
                title="Ανανέωση διαθέσιμων"
                onClick={() => setRefreshTick((t) => t + 1)}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/75 px-3 text-sm text-white/78 transition hover:bg-zinc-900"
              >
                <RotateCw className="h-4 w-4 text-white/68" />
                Ανανέωση
              </button>
            </div>
          </div>

          <Tile className="p-0">
            <div className="space-y-4">
              <div>
                <FieldLabel icon={Calendar}>Ημερομηνία</FieldLabel>

                <div className="relative mt-1.5">
                  <input
                    type="date"
                    className="qb-date-desktop h-11 w-full rounded-2xl border border-zinc-700/80 bg-zinc-950/60 px-3 pr-12 text-base text-white focus:outline-none focus:ring-2 focus:ring-zinc-600/40"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                  <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55" />
                </div>

                <p className="mt-1.5 text-xs text-white/48">{shortDate}</p>
              </div>

              <div>
                <FieldLabel icon={Wifi}>Τύπος</FieldLabel>

                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOnline(false)}
                    className={[
                      "h-11 rounded-2xl border px-3 text-sm inline-flex items-center justify-center gap-2 transition",
                      !isOnline
                        ? "border-zinc-500/70 bg-zinc-800 text-white shadow-[0_8px_22px_rgba(0,0,0,.24)]"
                        : "border-zinc-800 bg-zinc-950/60 text-white/72 hover:bg-zinc-900/80",
                    ].join(" ")}
                  >
                    <User className="h-4 w-4" />
                    Δια ζώσης
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsOnline(true)}
                    className={[
                      "h-11 rounded-2xl border px-3 text-sm inline-flex items-center justify-center gap-2 transition",
                      isOnline
                        ? "border-zinc-500/70 bg-zinc-800 text-white shadow-[0_8px_22px_rgba(0,0,0,.24)]"
                        : "border-zinc-800 bg-zinc-950/60 text-white/72 hover:bg-zinc-900/80",
                    ].join(" ")}
                  >
                    <Wifi className="h-4 w-4" />
                    Online
                  </button>
                </div>
              </div>

              <div>
                <FieldLabel icon={Clock}>Διάρκεια</FieldLabel>

                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {[30, 45, 60, 75, 90].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setUiSession(m)}
                      className={[
                        "h-10 rounded-2xl border text-sm transition",
                        uiSession === m
                          ? "border-zinc-500/70 bg-zinc-800 text-white"
                          : "border-zinc-800 bg-zinc-950/60 text-white/72 hover:bg-zinc-900/80",
                      ].join(" ")}
                    >
                      {m}′
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Tile>

          <Tile className="p-0">
            <div className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-white/60 shrink-0" />
                    <p className="text-base font-semibold text-white/90">
                      Ώρες ({uiSession}′)
                    </p>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-emerald-500/15 bg-emerald-500/12 px-2.5 py-1 text-[11px] text-emerald-200/95">
                      {availableCount} διαθέσιμες
                    </span>

                    <span className="inline-flex items-center rounded-full border border-yellow-500/20 bg-yellow-500/12 px-2.5 py-1 text-[11px] text-yellow-200/95">
                      {pendingCount} pending
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
                    Διαθέσιμες
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-400/90" />
                    Pending
                  </span>
                </div>
              </div>

              {!sched ? (
                <Spinner />
              ) : (sched.windows || []).length === 0 ? (
                <div className="py-2 text-sm text-white/52">
                  Ρεπό / χωρίς ωράριο για αυτή τη μέρα.
                </div>
              ) : (
                <div className="bg-transparent py-1">
                  <div
                    className="grid gap-2"
                    style={{ gridTemplateColumns: "repeat(auto-fit, minmax(72px, 1fr))" }}
                  >
                    {slots.map(({ s, e, status }) => {
                      const isSel = selectedStart === s
                      const disabled = saving || status !== "available"

                      let cls =
                        "h-11 rounded-2xl border px-2.5 text-center text-sm font-medium transition"

                      if (status === "pending") {
                        cls +=
                          " border-yellow-500/30 bg-yellow-500/18 text-yellow-100 cursor-not-allowed"
                      } else if (isSel) {
                        cls +=
                          " border-emerald-400/30 bg-emerald-500/25 text-emerald-50 shadow-[0_8px_18px_rgba(16,185,129,.18)]"
                      } else {
                        cls +=
                          " border-emerald-500/20 bg-emerald-500/14 text-emerald-100/95 hover:bg-emerald-500/18"
                      }

                      return (
                        <button
                          key={`${s}-${e}-${status}`}
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            if (status === "available") setSelectedStart(s)
                          }}
                          className={cls}
                          title={`${minToHHMM(s)} – ${minToHHMM(e)}`}
                        >
                          {minToHHMM(s)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </Tile>

          <Tile className="p-0">
            <div className="space-y-3">
              <label className="block">
                <FieldLabel icon={Mail}>Email πελάτη (προαιρετικό)</FieldLabel>
                <input
                  type="email"
                  placeholder="client@example.com"
                  className="mt-1.5 h-11 w-full rounded-2xl border border-zinc-700/80 bg-zinc-950/60 px-3 text-base text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-zinc-600/40"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <p className="mt-1.5 text-xs text-white/45">
                  Αν υπάρχει λογαριασμός με αυτό το email, θα γίνει αυτόματα σύνδεση.
                </p>
              </label>

              <label className="block">
                <FieldLabel icon={User}>Όνομα/username πελάτη</FieldLabel>
                <input
                  type="text"
                  placeholder="π.χ. chris.k"
                  className="mt-1.5 h-11 w-full rounded-2xl border border-zinc-700/80 bg-zinc-950/60 px-3 text-base text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-zinc-600/40"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <p className="mt-1.5 text-xs text-white/45">
                  Βάλε τουλάχιστον email ή όνομα.
                </p>
              </label>

              <label className="block">
                <FieldLabel icon={Euro}>Ποσό πληρωμής (προαιρετικό)</FieldLabel>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="π.χ. 40"
                  className="mt-1.5 h-11 w-full rounded-2xl border border-zinc-700/80 bg-zinc-950/60 px-3 text-base text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-zinc-600/40"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>

              <label className="block">
                <FieldLabel>Σημείωση (προαιρετικό)</FieldLabel>
                <textarea
                  rows={3}
                  placeholder="Οποιαδήποτε λεπτομέρεια"
                  className="mt-1.5 w-full rounded-2xl border border-zinc-700/80 bg-zinc-950/60 px-3 py-2.5 text-base text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-zinc-600/40"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
            </div>
          </Tile>

          <ErrorMessage
            message={err}
            onClose={() => setErr(null)}
          />

          <SuccessMessage
            message={okMsg}
            onClose={() => setOkMsg("")}
          />

          <div className="sticky bottom-0 z-10 border-t border-zinc-800/90 bg-[rgba(12,12,15,.92)] pt-3 pb-4 backdrop-blur-xl">
            <div className="flex flex-col gap-3">
              <div className="text-sm text-white/68 break-words">
                {selectedStart != null
                  ? `Επιλεγμένο: ${minToHHMM(selectedStart)} – ${minToHHMM(
                      (selectedStart || 0) + uiSession
                    )}`
                  : "Καμία ώρα επιλεγμένη"}
              </div>

              <button
                type="button"
                onClick={handleCreate}
                disabled={saving}
                className="h-11 w-full rounded-2xl border border-zinc-700/80 bg-zinc-800 text-white transition hover:bg-zinc-700 disabled:opacity-60 text-[15px] font-medium"
              >
                {saving ? "Αποθήκευση..." : "Καταχώριση"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderMobileSheet = () => {
    if (!mounted || !mobileOpen) return null
    if (typeof window !== "undefined" && !window.matchMedia("(max-width: 639.98px)").matches) {
      return null
    }

    return createPortal(
      <>
        {baseStyles}

        <div className="fixed inset-0 z-[999] sm:hidden bg-black">
          <button
            type="button"
            aria-label="close overlay"
            className="qb-backdrop-in absolute inset-0 bg-black/88"
            onClick={() => onMobileClose && onMobileClose()}
          />

          <div className="absolute inset-x-0 bottom-0">
            <div className="qb-sheet-in w-full rounded-t-[30px] border border-zinc-900 bg-black shadow-[0_-30px_80px_rgba(0,0,0,.9)]">
              <div className="flex justify-center bg-black pt-2 pb-1">
                <div className="h-1.5 w-12 rounded-full bg-zinc-700/90" />
              </div>

              <div className="qb-scroll max-h-[92dvh] overflow-y-auto bg-black px-0 pb-[env(safe-area-inset-bottom)] text-white">
                <div className="border-b border-zinc-800/90 bg-black px-4 pt-3 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-zinc-900 ring-1 ring-zinc-800/90">
                      <Calendar className="h-4.5 w-4.5 text-white" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-[17px] font-semibold leading-tight text-white">
                        Νέα κράτηση
                      </h3>

                      <div className="mt-1 leading-snug text-white">
                        <div className="text-sm capitalize text-white">{headerWeekday}</div>
                        <div className="text-sm text-white">{headerDateLine}</div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] text-white">
                          Ωράριο: {niceWindows}
                        </span>

                        <span className="inline-flex items-center rounded-full border border-emerald-500/15 bg-emerald-500/12 px-2.5 py-1 text-[11px] text-emerald-100">
                          {loadingDay || !sched ? "…" : `${availableCount} διαθέσιμες`}
                        </span>

                        <span className="inline-flex items-center rounded-full border border-yellow-500/20 bg-yellow-500/12 px-2.5 py-1 text-[11px] text-yellow-100">
                          {loadingDay || !sched ? "…" : `${pendingCount} pending`}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onMobileClose && onMobileClose()}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-white transition hover:bg-zinc-800"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4 bg-black px-4 py-4 text-white">
                  <Tile className="p-0 text-white">
                    <div className="space-y-4">
                      <div>
                        <FieldLabel icon={Calendar} className="text-white">
                          Ημερομηνία
                        </FieldLabel>

                        <div className="relative mt-2">
                          <input
                            type="date"
                            className="qb-date-mobile h-12 w-full rounded-2xl border border-zinc-700/80 bg-zinc-950 px-3 pr-12 text-base text-white focus:outline-none focus:ring-2 focus:ring-zinc-600/40"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                          />
                          <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
                        </div>

                        <p className="mt-2 text-xs text-white/82">{shortDate}</p>
                      </div>

                      <div>
                        <FieldLabel icon={Wifi} className="text-white">
                          Τύπος
                        </FieldLabel>

                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setIsOnline(false)}
                            className={[
                              "h-12 rounded-2xl border px-3 text-sm inline-flex items-center justify-center gap-2 transition text-white",
                              !isOnline
                                ? "border-zinc-500/70 bg-zinc-800 shadow-[0_8px_22px_rgba(0,0,0,.22)]"
                                : "border-zinc-800 bg-zinc-950",
                            ].join(" ")}
                          >
                            <User className="h-4 w-4 text-white" />
                            <span className="text-white">Δια ζώσης</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setIsOnline(true)}
                            className={[
                              "h-12 rounded-2xl border px-3 text-sm inline-flex items-center justify-center gap-2 transition text-white",
                              isOnline
                                ? "border-zinc-500/70 bg-zinc-800 shadow-[0_8px_22px_rgba(0,0,0,.22)]"
                                : "border-zinc-800 bg-zinc-950",
                            ].join(" ")}
                          >
                            <Wifi className="h-4 w-4 text-white" />
                            <span className="text-white">Online</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <FieldLabel icon={Clock} className="text-white">
                          Διάρκεια
                        </FieldLabel>

                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {[30, 45, 60, 75, 90].map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setUiSession(m)}
                              className={[
                                "h-11 rounded-2xl border text-sm font-medium transition text-white",
                                uiSession === m
                                  ? "border-zinc-500/70 bg-zinc-800"
                                  : "border-zinc-800 bg-zinc-950",
                              ].join(" ")}
                            >
                              <span className="text-white">{m}′</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Tile>

                  <Tile className="p-0 text-white">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 shrink-0 text-white/80" />
                            <p className="text-[15px] font-semibold text-white">
                              Ώρες ({uiSession}′)
                            </p>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center rounded-full border border-emerald-500/15 bg-emerald-500/12 px-2.5 py-1 text-[11px] text-emerald-100">
                              {availableCount} διαθέσιμες
                            </span>

                            <span className="inline-flex items-center rounded-full border border-yellow-500/20 bg-yellow-500/12 px-2.5 py-1 text-[11px] text-yellow-100">
                              {pendingCount} pending
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          title="Ανανέωση διαθέσιμων"
                          onClick={() => setRefreshTick((t) => t + 1)}
                          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-white transition hover:bg-zinc-800"
                        >
                          <RotateCw className="h-4 w-4 text-white" />
                          <span className="text-white">Ανανέωση</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-white">
                        <span className="inline-flex items-center gap-1">
                          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
                          <span className="text-white">Διαθέσιμες</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-400/90" />
                          <span className="text-white">Pending</span>
                        </span>
                      </div>

                      {!sched ? (
                        <Spinner />
                      ) : (sched.windows || []).length === 0 ? (
                        <div className="text-sm text-white">
                          Ρεπό / χωρίς ωράριο για αυτή τη μέρα.
                        </div>
                      ) : (
                        <div className="bg-transparent">
                          <div className="qb-scroll max-h-[30dvh] overflow-y-auto pr-1">
                            {loadingDay ? (
                              <Spinner label="Φόρτωση διαθεσιμότητας…" />
                            ) : (
                              <div className="grid grid-cols-3 gap-2">
                                {slots.map(({ s, e, status }) => {
                                  const isSel = selectedStart === s
                                  const disabled = saving || status !== "available"

                                  let cls =
                                    "h-11 rounded-2xl border px-2.5 text-center text-sm font-medium transition text-white"

                                  if (status === "pending") {
                                    cls +=
                                      " border-yellow-500/30 bg-yellow-500/18 text-yellow-100 cursor-not-allowed"
                                  } else if (isSel) {
                                    cls +=
                                      " border-emerald-400/30 bg-emerald-500/25 text-emerald-50 shadow-[0_8px_18px_rgba(16,185,129,.18)]"
                                  } else {
                                    cls +=
                                      " border-emerald-500/20 bg-emerald-500/14 text-emerald-100 hover:bg-emerald-500/18"
                                  }

                                  return (
                                    <button
                                      key={`${s}-${e}-${status}`}
                                      type="button"
                                      disabled={disabled}
                                      onClick={() => {
                                        if (status === "available") setSelectedStart(s)
                                      }}
                                      className={cls}
                                      title={`${minToHHMM(s)} – ${minToHHMM(e)}`}
                                    >
                                      <span className="text-inherit">{minToHHMM(s)}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </Tile>

                  <Tile className="p-0 text-white">
                    <div className="space-y-3">
                      <label className="block">
                        <FieldLabel icon={Mail} className="text-white">
                          Email πελάτη (προαιρετικό)
                        </FieldLabel>
                        <input
                          type="email"
                          placeholder="client@example.com"
                          className="mt-2 h-12 w-full rounded-2xl border border-zinc-700/80 bg-zinc-950 px-3 text-base text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-zinc-600/40"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                        <p className="mt-2 text-xs text-white/82">
                          Αν υπάρχει λογαριασμός με αυτό το email, θα γίνει αυτόματα σύνδεση.
                        </p>
                      </label>

                      <label className="block">
                        <FieldLabel icon={User} className="text-white">
                          Όνομα/username πελάτη
                        </FieldLabel>
                        <input
                          type="text"
                          placeholder="π.χ. chris.k"
                          className="mt-2 h-12 w-full rounded-2xl border border-zinc-700/80 bg-zinc-950 px-3 text-base text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-zinc-600/40"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                        />
                        <p className="mt-2 text-xs text-white/82">
                          Βάλε τουλάχιστον email ή όνομα.
                        </p>
                      </label>

                      <label className="block">
                        <FieldLabel icon={Euro} className="text-white">
                          Ποσό πληρωμής (προαιρετικό)
                        </FieldLabel>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="π.χ. 40"
                          className="mt-2 h-12 w-full rounded-2xl border border-zinc-700/80 bg-zinc-950 px-3 text-base text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-zinc-600/40"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                        />
                      </label>

                      <label className="block">
                        <FieldLabel className="text-white">Σημείωση (προαιρετικό)</FieldLabel>
                        <textarea
                          rows={4}
                          placeholder="Οποιαδήποτε λεπτομέρεια"
                          className="mt-2 w-full rounded-2xl border border-zinc-700/80 bg-zinc-950 px-3 py-3 text-base text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-zinc-600/40"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                        />
                      </label>
                    </div>
                  </Tile>

                  <ErrorMessage
                    message={err}
                    onClose={() => setErr(null)}
                  />

                  <SuccessMessage
                    message={okMsg}
                    onClose={() => setOkMsg("")}
                  />

                  <div className="sticky bottom-0 z-10 -mx-4 border-t border-zinc-800/90 bg-black px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
                    <div className="flex flex-col gap-3">
                      <div className="text-sm break-words text-white">
                        {selectedStart != null
                          ? `Επιλεγμένο: ${minToHHMM(selectedStart)} – ${minToHHMM(
                              (selectedStart || 0) + uiSession
                            )}`
                          : "Καμία ώρα επιλεγμένη"}
                      </div>

                      <button
                        type="button"
                        onClick={handleCreate}
                        disabled={saving}
                        className="h-12 w-full rounded-2xl border border-zinc-700/80 bg-zinc-800 text-white transition hover:bg-zinc-700 disabled:opacity-60 text-[15px] font-semibold"
                      >
                        {saving ? "Αποθήκευση..." : "Καταχώριση"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>,
      document.body
    )
  }

  return (
    <>
      {renderDesktopView()}
      {renderMobileSheet()}
    </>
  )
}