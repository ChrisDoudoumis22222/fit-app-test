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
  Check,
  RotateCw,
  X,
} from "lucide-react"
import { supabase } from "../supabaseClient"

/* ---------------- clean UI ---------------- */
const Glass = ({ className = "", children }) => (
  <div
    className={[
      "relative w-full",
      "bg-[rgba(17,18,21,.62)] backdrop-blur-xl",
      className,
    ].join(" ")}
  >
    {children}
  </div>
)

const Tile = ({ className = "", children }) => (
  <div className={["relative", className].join(" ")}>{children}</div>
)

const Spinner = ({ label = "Φόρτωση…" }) => (
  <div className="flex items-center gap-2 text-white/75 text-sm">
    <Loader2 className="h-4 w-4 animate-spin" />
    {label}
  </div>
)

const FieldLabel = ({ icon: Icon, children }) => (
  <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-white/80">
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
  mobileOpen = true,
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
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [mounted, mobileOpen])

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
    if (busyIntervals.some((b) => overlaps(selectedStart, endMin, b.s, b.e))) {
      return setErr("Η ώρα δεν είναι διαθέσιμη πλέον. Διάλεξε άλλη.")
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

  const cardCls =
    "rounded-[24px] border border-white/10 bg-[rgba(255,255,255,.04)] backdrop-blur-xl p-3 sm:p-4"

  const content = (
    <>
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
          scrollbar-color: rgba(255,255,255,.10) transparent;
        }

        .quickbook-hours-scroll::-webkit-scrollbar {
          width: 8px;
        }

        .quickbook-hours-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .quickbook-hours-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.10);
          border-radius: 999px;
        }

        .quickbook-hours-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,.16);
        }
      `}</style>

      {/* header */}
      <div className="px-4 pt-4 pb-3 sm:px-4 sm:py-3 border-b border-white/8">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-zinc-900/70">
            <Calendar className="h-4.5 w-4.5 text-white/70" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] font-semibold text-white/90 leading-tight">
              Νέα κράτηση
            </h3>

            <div className="mt-1 text-white/58 leading-snug">
              <div className="text-sm capitalize">{headerWeekday}</div>
              <div className="text-sm">{headerDateLine}</div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-zinc-900/60 px-2.5 py-1 text-[11px] text-white/58">
                Ωράριο: {niceWindows}
              </span>

              <span className="inline-flex items-center rounded-full bg-emerald-500/[.08] px-2.5 py-1 text-[11px] text-emerald-200/88">
                {loadingDay || !sched ? "…" : `${availableCount} διαθέσιμες`}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onMobileClose && onMobileClose()}
            className="sm:hidden inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-900/65 text-white/70 active:scale-[0.98]"
            aria-label="Κλείσιμο"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="space-y-3 px-3 py-3 sm:px-4 sm:space-y-4">
        {/* controls */}
        <Tile className={cardCls}>
          <div className="space-y-4">
            <div>
              <FieldLabel icon={Calendar}>Ημερομηνία</FieldLabel>

              <div className="relative mt-1.5">
                <input
                  type="date"
                  className="quickbook-date w-full h-12 rounded-2xl bg-zinc-900/65 px-3 pr-12 text-base text-white/90 focus:outline-none focus:ring-2 focus:ring-white/10"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                <Calendar className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/45" />
              </div>

              <p className="mt-1.5 text-xs text-white/45">{shortDate}</p>
            </div>

            <div>
              <FieldLabel icon={Wifi}>Τύπος</FieldLabel>

              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsOnline(false)}
                  className={[
                    "h-12 rounded-2xl px-3 text-sm inline-flex items-center justify-center gap-2 transition",
                    !isOnline
                      ? "bg-white text-black shadow-[0_8px_22px_rgba(255,255,255,.10)]"
                      : "bg-zinc-900/65 text-white/68 hover:bg-zinc-900/80",
                  ].join(" ")}
                >
                  <User className="h-4 w-4" />
                  Δια ζώσης
                </button>

                <button
                  type="button"
                  onClick={() => setIsOnline(true)}
                  className={[
                    "h-12 rounded-2xl px-3 text-sm inline-flex items-center justify-center gap-2 transition",
                    isOnline
                      ? "bg-white text-black shadow-[0_8px_22px_rgba(255,255,255,.10)]"
                      : "bg-zinc-900/65 text-white/68 hover:bg-zinc-900/80",
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
                      "h-11 rounded-2xl text-sm transition font-medium",
                      uiSession === m
                        ? "bg-white text-black shadow-[0_8px_22px_rgba(255,255,255,.10)]"
                        : "bg-zinc-900/65 text-white/68 hover:bg-zinc-900/80",
                    ].join(" ")}
                  >
                    {m}′
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Tile>

        {/* hours */}
        <Tile className={cardCls}>
          <div className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-white/52 shrink-0" />
                  <p className="text-[15px] font-semibold text-white/88">
                    Ώρες ({uiSession}′)
                  </p>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-emerald-500/[.06] px-2.5 py-1 text-[11px] text-emerald-200/88">
                    {availableCount} διαθέσιμες
                  </span>

                  <span className="inline-flex items-center rounded-full bg-amber-500/[.06] px-2.5 py-1 text-[11px] text-amber-200/88">
                    {busyCount} κατειλημμένες
                  </span>

                  <span className="inline-flex items-center rounded-full bg-zinc-900/50 px-2.5 py-1 text-[11px] text-white/52">
                    {restCount} διάλειμμα / ρεπό
                  </span>
                </div>
              </div>

              <button
                type="button"
                title="Ανανέωση διαθέσιμων"
                onClick={() => setRefreshTick((t) => t + 1)}
                className="h-10 shrink-0 inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900/65 px-3 text-sm text-white/68 hover:bg-zinc-900/80 transition"
              >
                <RotateCw className="h-4 w-4 text-white/52" />
                Ανανέωση
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-white/58">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                Διαθέσιμες
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                Κατειλημμένες
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-zinc-500/80" />
                Διάλειμμα / Ρεπό
              </span>
            </div>

            {!sched ? (
              <Spinner />
            ) : (sched.windows || []).length === 0 ? (
              <div className="text-sm text-white/50">
                Ρεπό / χωρίς ωράριο για αυτή τη μέρα.
              </div>
            ) : (
              <div className="bg-zinc-950/10">
                <div className="quickbook-hours-scroll max-h-[30dvh] overflow-y-auto pr-1">
                  {loadingDay ? (
                    <Spinner label="Φόρτωση διαθεσιμότητας…" />
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {slots.map(({ s, e, status }) => {
                        const isSel = selectedStart === s
                        const disabled = saving || status !== "available"

                        let cls =
                          "h-11 rounded-2xl text-sm transition px-2.5 text-center font-medium"

                        if (status === "rest") {
                          cls += " bg-zinc-800/45 text-white/28 cursor-not-allowed"
                        } else if (status === "busy") {
                          cls += " bg-amber-500/[.08] text-amber-200/80 cursor-not-allowed"
                        } else if (isSel) {
                          cls += " bg-white text-black shadow-[0_8px_18px_rgba(255,255,255,.08)]"
                        } else {
                          cls += " bg-emerald-500/[.06] text-emerald-100/88 hover:bg-emerald-500/[.09]"
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
          </div>
        </Tile>

        {/* form */}
        <Tile className={cardCls}>
          <div className="space-y-3">
            <label className="block">
              <FieldLabel icon={Mail}>Email πελάτη (προαιρετικό)</FieldLabel>
              <input
                type="email"
                placeholder="client@example.com"
                className="mt-1.5 w-full h-12 rounded-2xl bg-zinc-900/65 px-3 text-base text-white/90 placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
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
                className="mt-1.5 w-full h-12 rounded-2xl bg-zinc-900/65 px-3 text-base text-white/90 placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
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
                className="mt-1.5 w-full h-12 rounded-2xl bg-zinc-900/65 px-3 text-base text-white/90 placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>

            <label className="block">
              <FieldLabel>Σημείωση (προαιρετικό)</FieldLabel>
              <textarea
                rows={4}
                placeholder="Οποιαδήποτε λεπτομέρεια"
                className="mt-1.5 w-full rounded-2xl bg-zinc-900/65 px-3 py-3 text-base text-white/90 placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/10"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          </div>
        </Tile>

        {/* status */}
        {err && (
          <div className="rounded-2xl bg-red-500/[.06] px-3 py-3 text-sm text-red-300">
            {err}
          </div>
        )}

        {okMsg && (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/[.06] px-3 py-3 text-sm text-emerald-300">
            <Check className="h-4 w-4 shrink-0" />
            <span className="flex-1">{okMsg}</span>
            <button
              type="button"
              className="text-white/35 hover:text-white/70"
              onClick={() => setOkMsg("")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* action */}
        <div className="sticky bottom-0 z-10 -mx-3 mt-1 border-t border-white/8 bg-[rgba(15,16,18,.88)] px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur-2xl sm:static sm:m-0 sm:border-0 sm:bg-transparent sm:p-0">
          <div className="flex flex-col gap-3">
            <div className="text-sm text-white/62 break-words">
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
              className="w-full h-12 rounded-2xl bg-white text-black hover:bg-white/90 disabled:opacity-60 text-[15px] font-semibold transition"
            >
              {saving ? "Αποθήκευση..." : "Καταχώριση"}
            </button>
          </div>
        </div>
      </div>
    </>
  )

  const desktopView = (
    <div className="hidden sm:block">
      <Glass className="overflow-hidden rounded-[28px] border border-white/10">
        {content}
      </Glass>
    </div>
  )

  const mobileView =
    mounted && mobileOpen
      ? createPortal(
          <div className="sm:hidden fixed inset-0 z-[999]">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
              onClick={() => onMobileClose && onMobileClose()}
            />

            <div className="absolute inset-x-0 bottom-0">
              <div className="mx-auto mb-0 w-full max-w-md rounded-t-[30px] border border-white/10 bg-[rgba(17,18,21,.94)] shadow-[0_-24px_60px_rgba(0,0,0,.55)] backdrop-blur-2xl">
                <div className="flex justify-center pt-2 pb-1">
                  <div className="h-1.5 w-12 rounded-full bg-white/18" />
                </div>

                <div className="max-h-[92dvh] overflow-y-auto">
                  {content}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <>
      {desktopView}
      {mobileView}
    </>
  )
}