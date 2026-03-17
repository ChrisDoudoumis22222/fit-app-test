"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  Loader2,
  Calendar,
  Clock,
  Wifi,
  User,
  Mail,
  Euro,
  Check,
  RotateCw,
  X,
  CheckCircle2,
  AlertTriangle,
  CalendarClock,
} from "lucide-react"
import { supabase } from "../supabaseClient"

/* ---------------- premium glass UI ---------------- */
const Glass = ({ className = "", children }) => (
  <div
    className={[
      "relative rounded-3xl border border-white/10",
      "bg-[rgba(17,18,21,.68)] backdrop-blur-xl",
      "shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_10px_30px_rgba(0,0,0,.45)]",
      className,
    ].join(" ")}
  >
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[.06] via-white/[.02] to-transparent opacity-40" />
      <div className="absolute -top-1/2 left-0 right-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent opacity-45" />
    </div>
    <div className="relative">{children}</div>
  </div>
)

const Tile = ({ className = "", children }) => (
  <div
    className={[
      "rounded-2xl border border-white/10 bg-white/[.04]",
      "shadow-[inset_0_1px_0_rgba(255,255,255,.03)]",
      className,
    ].join(" ")}
  >
    {children}
  </div>
)

const Button = ({
  children,
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}) => {
  const base =
    "inline-flex items-center justify-center rounded-xl font-medium transition focus:outline-none focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-60"
  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-11 px-4 text-sm",
  }
  const variants = {
    primary:
      "border border-white/20 bg-white text-black hover:bg-gray-100 shadow-[0_6px_18px_rgba(255,255,255,.08)]",
    secondary:
      "border border-white/10 bg-white/[.05] text-white hover:bg-white/[.09]",
    ghost: "border border-white/10 bg-transparent text-white hover:bg-white/[.05]",
    success:
      "border border-emerald-400/20 bg-emerald-600/90 text-white hover:bg-emerald-600",
  }

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

const InfoTile = ({ icon: Icon, label, value, tone = "default" }) => {
  const toneClasses =
    tone === "success"
      ? "bg-emerald-500/10 border-emerald-400/15"
      : tone === "warn"
      ? "bg-amber-500/10 border-amber-400/15"
      : tone === "danger"
      ? "bg-rose-500/10 border-rose-400/15"
      : "bg-white/[.04] border-white/10"

  return (
    <div
      className={`rounded-2xl border p-3 sm:p-3.5 ${toneClasses} shadow-[inset_0_1px_0_rgba(255,255,255,.03)]`}
    >
      <div className="mb-2 flex items-center gap-2 text-white/55">
        <Icon className="h-4 w-4" />
        <span className="text-[11px] uppercase tracking-[0.12em] sm:text-xs">
          {label}
        </span>
      </div>
      <div className="text-sm font-medium text-white sm:text-[15px]">
        {value}
      </div>
    </div>
  )
}

const Field = ({
  icon: Icon,
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  textarea = false,
  rows = 4,
}) => (
  <label className="block">
    <div className="mb-1.5 flex items-center gap-2 text-[13px] font-medium text-white/80">
      {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
      <span>{label}</span>
    </div>

    <div className="relative">
      {textarea ? (
        <textarea
          rows={rows}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/20"
        />
      ) : (
        <>
          {Icon ? (
            <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          ) : null}
          <input
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full rounded-2xl border border-white/10 bg-black/30 py-3 text-white outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/20 ${
              Icon ? "pl-10 pr-3" : "px-3"
            }`}
          />
        </>
      )}
    </div>
  </label>
)

const Spinner = ({ label = "Φόρτωση…" }) => (
  <div className="flex items-center gap-2 text-sm text-white/75">
    <Loader2 className="h-4 w-4 animate-spin" />
    {label}
  </div>
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

const formatLongDate = (iso) => {
  const d = safeDate(iso)
  if (!d) return iso || "—"
  return d.toLocaleDateString("el-GR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

const formatMoney = (value) => {
  if (value == null || value === "") return "—"
  const n = Number(value)
  if (Number.isNaN(n)) return "—"
  return `${n.toLocaleString("el-GR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`
}

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

        if (prof?.work_start && prof?.work_end) {
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

/* ---------------- bookings -> busy intervals ---------------- */
function bookingsToBusy(rows) {
  const keep = (r) => {
    const s = String(r.status || "").toLowerCase()
    return !["declined", "cancelled", "canceled", "rejected"].includes(s)
  }

  return (rows || []).filter(keep).map((r) => {
    const s = strToMinutes(r.start_time)
    const e = r.end_time ? strToMinutes(r.end_time) : s + Number(r.duration_min || 0)
    return { s, e }
  })
}

/* ---------------- build renderable slots ---------------- */
function buildRenderableSlots(baseWindows, breaks, busy, durationMin, stepMin) {
  const slots = []

  baseWindows.forEach((w) => {
    for (let s = w.s; s + durationMin <= w.e; s += stepMin) {
      const e = s + durationMin
      const isRest = (breaks || []).some((b) => overlaps(s, e, b.s, b.e))
      const isBusy = !isRest && (busy || []).some((b) => overlaps(s, e, b.s, b.e))

      let status = "available"
      if (isRest) status = "rest"
      else if (isBusy) status = "busy"

      slots.push({ s, e, status })
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
}) {
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

  const busyIntervals = useMemo(() => bookingsToBusy(dayRows), [dayRows])

  const slots = useMemo(() => {
    if (!sched) return []
    return buildRenderableSlots(
      sched.windows || [],
      sched.breaks || [],
      busyIntervals,
      uiSession,
      Math.max(5, sched.stepMin || 15)
    )
  }, [sched, busyIntervals, uiSession])

  const availableCount = useMemo(
    () => slots.filter((s) => s.status === "available").length,
    [slots]
  )

  const busyCount = useMemo(
    () => slots.filter((s) => s.status === "busy").length,
    [slots]
  )

  const restCount = useMemo(
    () => slots.filter((s) => s.status === "rest").length,
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

  const selectedSlot = useMemo(() => {
    if (selectedStart == null) return null
    return slots.find((x) => x.s === selectedStart) || null
  }, [selectedStart, slots])

  const selectedTimeLabel = useMemo(() => {
    if (!selectedSlot) return "Καμία ώρα επιλεγμένη"
    return `${minToHHMM(selectedSlot.s)} – ${minToHHMM(selectedSlot.e)}`
  }, [selectedSlot])

  const amountLabel = useMemo(() => formatMoney(amount), [amount])

  const handleCreate = async () => {
    setOkMsg("")
    setErr(null)

    if (!trainerId) return setErr("Λείπει το trainerId.")
    if (email && !/\S+@\S+\.\S+/.test(email)) {
      return setErr("Αν συμπληρώσεις email, πρέπει να είναι έγκυρο.")
    }
    if (selectedStart == null) return setErr("Επίλεξε ώρα.")
    if (!sched) return setErr("Δεν βρέθηκε διαθέσιμο ωράριο.")

    const selectedSlotNow = slots.find((x) => x.s === selectedStart)
    if (!selectedSlotNow || selectedSlotNow.status !== "available") {
      return setErr("Η ώρα δεν είναι διαθέσιμη πλέον. Διάλεξε άλλη.")
    }

    const endMin = selectedStart + uiSession
    if (busyIntervals.some((b) => overlaps(selectedStart, endMin, b.s, b.e))) {
      return setErr("Η ώρα δεν είναι διαθέσιμη πλέον. Διάλεξε άλλη.")
    }

    setSaving(true)

    try {
      let user_id = null
      let resolvedName = null

      if (email) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("email", email.trim())
          .maybeSingle()

        if (prof) {
          user_id = prof.id
          resolvedName = prof.full_name
        }
      }

      const start_time = minToHHMMSS(selectedStart)
      const end_time = minToHHMMSS(endMin)
      const cleanedAmount = amount !== "" ? Number(amount) : null
      const amountPrefix =
        cleanedAmount != null && !Number.isNaN(cleanedAmount)
          ? `[€${cleanedAmount.toLocaleString("el-GR")}]`
          : ""
      const finalNote = `${amountPrefix}${amountPrefix && note ? " " : ""}${note || ""}`.trim()

      const payload = {
        trainer_id: trainerId,
        user_id,
        user_email: email.trim() || null,
        user_name: username.trim() || resolvedName || null,
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
      setOkMsg("Η κράτηση καταχωρήθηκε ✅")
      onCreated && onCreated(payload)
    } catch (e) {
      setErr(e?.message || "Αποτυχία δημιουργίας κράτησης")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Glass className="overflow-hidden">
      <style>{`
        .quickbook-date {
          color-scheme: dark;
          -webkit-appearance: none;
          appearance: none;
        }

        .quickbook-date::-webkit-calendar-picker-indicator {
          opacity: 0;
          cursor: pointer;
          width: 44px;
          height: 100%;
        }

        .quickbook-date::-webkit-datetime-edit,
        .quickbook-date::-webkit-datetime-edit-text,
        .quickbook-date::-webkit-datetime-edit-month-field,
        .quickbook-date::-webkit-datetime-edit-day-field,
        .quickbook-date::-webkit-datetime-edit-year-field {
          color: rgba(255,255,255,.9);
        }

        .quickbook-hours-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,.16) rgba(255,255,255,.04);
        }

        .quickbook-hours-scroll::-webkit-scrollbar {
          width: 10px;
        }

        .quickbook-hours-scroll::-webkit-scrollbar-track {
          background: rgba(255,255,255,.03);
          border-radius: 999px;
        }

        .quickbook-hours-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, rgba(255,255,255,.16), rgba(255,255,255,.1));
          border-radius: 999px;
          border: 2px solid rgba(17,18,21,.55);
        }

        .quickbook-hours-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, rgba(255,255,255,.22), rgba(255,255,255,.14));
        }
      `}</style>

      <div className="border-b border-white/10 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[.04]">
                <CalendarClock className="h-5 w-5 text-white/70" />
              </div>

              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-white">
                  Γρήγορη Καταχώριση Κράτησης
                </h3>
                <div className="mt-1 text-sm text-white/55 capitalize">
                  {headerWeekday}
                </div>
                <div className="text-sm text-white/55">{headerDateLine}</div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full border border-white/10 bg-white/[.04] px-2.5 py-1 text-xs text-white/60">
                    Ωράριο: {niceWindows}
                  </span>
                  <span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300">
                    {loadingDay || !sched ? "…" : `${availableCount} διαθέσιμες`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setRefreshTick((t) => t + 1)}
            className="w-full sm:w-auto"
            title="Ανανέωση διαθέσιμων"
          >
            <RotateCw className="mr-2 h-4 w-4" />
            Ανανέωση
          </Button>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <Tile className="p-4">
          <div className="mb-4 text-sm font-medium uppercase tracking-[0.12em] text-white/45">
            Ρυθμίσεις συνεδρίας
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-4">
              <label className="block">
                <div className="mb-1.5 flex items-center gap-2 text-[13px] font-medium text-white/80">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>Ημερομηνία</span>
                </div>

                <div className="relative">
                  <input
                    type="date"
                    className="quickbook-date h-11 w-full rounded-2xl border border-white/10 bg-black/30 px-3 pr-12 text-base text-white outline-none focus:ring-2 focus:ring-white/20"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                  <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                </div>

                <p className="mt-1.5 text-xs text-white/45">{shortDate}</p>
              </label>

              <div>
                <div className="mb-1.5 flex items-center gap-2 text-[13px] font-medium text-white/80">
                  <Wifi className="h-4 w-4 shrink-0" />
                  <span>Τύπος συνεδρίας</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={!isOnline ? "primary" : "secondary"}
                    onClick={() => setIsOnline(false)}
                    className="w-full"
                  >
                    <User className="mr-2 h-4 w-4" />
                    Δια ζώσης
                  </Button>

                  <Button
                    type="button"
                    variant={isOnline ? "primary" : "secondary"}
                    onClick={() => setIsOnline(true)}
                    className="w-full"
                  >
                    <Wifi className="mr-2 h-4 w-4" />
                    Online
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center gap-2 text-[13px] font-medium text-white/80">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Διάρκεια</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[30, 45, 60, 75, 90].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setUiSession(m)}
                    className={[
                      "h-11 rounded-2xl border text-sm font-medium transition",
                      uiSession === m
                        ? "border-white bg-white text-black shadow-[0_6px_18px_rgba(255,255,255,.08)]"
                        : "border-white/10 bg-white/[.04] text-white hover:bg-white/[.08]",
                    ].join(" ")}
                  >
                    {m}′
                  </button>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <InfoTile icon={Clock} label="Διάρκεια" value={`${uiSession} λεπτά`} />
                <InfoTile
                  icon={Wifi}
                  label="Τύπος"
                  value={isOnline ? "Online συνεδρία" : "Δια ζώσης"}
                />
              </div>
            </div>
          </div>
        </Tile>

        <Tile className="p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-lg font-semibold text-white">
                Επιλογή ώρας
              </div>
              <div className="mt-1 text-sm text-white/55">
                {formatLongDate(date)} • διάρκεια {uiSession}′
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
                {availableCount} διαθέσιμες
              </span>
              <span className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-amber-300">
                {busyCount} κατειλημμένες
              </span>
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[.04] px-2.5 py-1 text-white/60">
                {restCount} διάλειμμα / ρεπό
              </span>
            </div>
          </div>

          {(sched?.windows || []).length > 0 && (
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
              <InfoTile icon={Calendar} label="Ημερομηνία" value={shortDate} />
              <InfoTile icon={Clock} label="Ωράριο" value={niceWindows} />
              <InfoTile
                icon={CheckCircle2}
                label="Επιλογή"
                value={selectedTimeLabel}
                tone={selectedSlot ? "success" : "default"}
              />
              <InfoTile
                icon={AlertTriangle}
                label="Κατάσταση"
                value={selectedSlot ? "Έτοιμο για καταχώριση" : "Περίμενε επιλογή ώρας"}
                tone={selectedSlot ? "success" : "warn"}
              />
            </div>
          )}

          {!sched ? (
            <Spinner />
          ) : (sched.windows || []).length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[.03] px-4 py-4 text-sm text-white/50">
              Ρεπό / χωρίς ωράριο για αυτή τη μέρα.
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-2 sm:p-3">
              <div className="quickbook-hours-scroll max-h-[42vh] overflow-y-auto pr-1 sm:pr-2">
                {loadingDay ? (
                  <Spinner label="Φόρτωση διαθεσιμότητας…" />
                ) : (
                  <div
                    className="grid gap-2"
                    style={{ gridTemplateColumns: "repeat(auto-fit, minmax(82px, 1fr))" }}
                  >
                    {slots.map(({ s, e, status }) => {
                      const isSel = selectedStart === s
                      const disabled = saving || status !== "available"

                      let cls =
                        "h-12 rounded-2xl border px-2.5 text-center text-sm font-medium transition"

                      if (status === "rest") {
                        cls +=
                          " border-white/8 bg-zinc-800/50 text-white/25 cursor-not-allowed"
                      } else if (status === "busy") {
                        cls +=
                          " border-amber-400/15 bg-amber-500/10 text-amber-200/80 cursor-not-allowed"
                      } else if (isSel) {
                        cls +=
                          " border-white bg-white text-black shadow-[0_8px_18px_rgba(255,255,255,.08)]"
                      } else {
                        cls +=
                          " border-emerald-400/15 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/14"
                      }

                      const title =
                        status === "available"
                          ? `${minToHHMM(s)} – ${minToHHMM(e)} • διαθέσιμο`
                          : status === "busy"
                          ? `${minToHHMM(s)} – ${minToHHMM(e)} • κατειλημμένο`
                          : `${minToHHMM(s)} – ${minToHHMM(e)} • διάλειμμα / ρεπό`

                      return (
                        <button
                          key={`${s}-${e}-${status}`}
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            if (status === "available") setSelectedStart(s)
                          }}
                          className={cls}
                          title={title}
                        >
                          {minToHHMM(s)}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </Tile>

        <Tile className="p-4">
          <div className="mb-4 text-sm font-medium uppercase tracking-[0.12em] text-white/45">
            Στοιχεία κράτησης
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <Field
                icon={Mail}
                label="Email πελάτη (προαιρετικό)"
                type="email"
                placeholder="client@example.com"
                value={email}
                onChange={setEmail}
              />

              <Field
                icon={User}
                label="Όνομα / username (προαιρετικό)"
                placeholder="π.χ. chris.k"
                value={username}
                onChange={setUsername}
              />
            </div>

            <div className="space-y-4">
              <Field
                icon={Euro}
                label="Ποσό πληρωμής (προαιρετικό)"
                type="number"
                placeholder="π.χ. 40"
                value={amount}
                onChange={setAmount}
              />

              <Field
                label="Σημείωση (προαιρετικό)"
                placeholder="Οποιαδήποτε λεπτομέρεια"
                value={note}
                onChange={setNote}
                textarea
                rows={4}
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <InfoTile
              icon={Calendar}
              label="Ημερομηνία"
              value={shortDate}
            />
            <InfoTile
              icon={Clock}
              label="Επιλεγμένη ώρα"
              value={selectedTimeLabel}
              tone={selectedSlot ? "success" : "default"}
            />
            <InfoTile
              icon={Euro}
              label="Ποσό"
              value={amountLabel}
              tone={amount ? "success" : "default"}
            />
          </div>
        </Tile>

        {err && (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {err}
          </div>
        )}

        {okMsg && (
          <div className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            <Check className="h-4 w-4 shrink-0" />
            <span className="break-words">{okMsg}</span>
            <button
              type="button"
              className="ml-1 text-white/35 hover:text-white/70"
              onClick={() => setOkMsg("")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-white/62">
            {selectedSlot
              ? `Επιλεγμένο: ${selectedTimeLabel}`
              : "Καμία ώρα επιλεγμένη"}
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={handleCreate}
            disabled={saving}
            className="w-full sm:w-auto sm:min-w-[220px]"
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin !text-black" />
                <span className="text-black">Αποθήκευση...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 !text-black" />
                <span className="text-black">Καταχώριση</span>
              </div>
            )}
          </Button>
        </div>
      </div>
    </Glass>
  )
}