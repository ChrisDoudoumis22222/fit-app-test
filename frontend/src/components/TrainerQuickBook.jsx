"use client"
import React, { useEffect, useMemo, useState } from "react"
import { Loader2, Calendar, Clock, Wifi, User, Mail, Euro, Check, RotateCw, X } from "lucide-react"
import { supabase } from "../supabaseClient"

/* ---------------- tiny glass UI ---------------- */
const Glass = ({ className = "", children }) => (
  <div
    className={[
      "relative rounded-2xl border border-white/10",
      "bg-[rgba(17,18,21,.65)] backdrop-blur-xl",
      "shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_10px_30px_rgba(0,0,0,.45)]",
      className,
    ].join(" ")}
  >
    <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[.06] via-white/[.02] to-transparent opacity-40" />
      <div className="absolute -top-1/2 left-0 right-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent opacity-50" />
    </div>
    <div className="relative">{children}</div>
  </div>
)

const Tile = ({ className = "", children }) => (
  <div
    className={[
      "relative rounded-xl border border-white/10",
      "bg-white/[.04] hover:bg-white/[.06] transition",
      "shadow-[inset_0_1px_0_rgba(255,255,255,.05),0_6px_20px_rgba(0,0,0,.35)]",
      className,
    ].join(" ")}
  >
    <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-white/[.08] to-transparent opacity-30" />
    <div className="relative">{children}</div>
  </div>
)

const Spinner = () => (
  <div className="flex items-center gap-2 text-white/80 text-sm">
    <Loader2 className="h-4 w-4 animate-spin" /> Φόρτωση…
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

const subtractMany = (base, blocks) => {
  const out = []
  base.forEach((w) => {
    let pieces = [{ s: Math.min(w.s, w.e), e: Math.max(w.s, w.e) }]
    blocks.forEach((bl) => {
      const b = { s: Math.min(bl.s, bl.e), e: Math.max(bl.s, bl.e) }
      const next = []
      pieces.forEach((p) => {
        if (!overlaps(p.s, p.e, b.s, b.e)) { next.push(p); return }
        if (p.s < b.s) next.push({ s: p.s, e: clamp(b.s, p.s, p.e) })
        if (p.e > b.e) next.push({ s: clamp(b.e, p.s, p.e), e: p.e })
      })
      pieces = next
    })
    out.push(...pieces.filter((p) => p.e - p.s > 0))
  })
  return out
}

/* ---------------- schedule from DB ---------------- */
async function readScheduleFromDB(trainerId, isoDate, hints) {
  const d = new Date(isoDate)
  const jsDow = d.getDay() // 0..6

  const engShort = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
  const engLong  = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
  const grShort  = ["Κυρ","Δευ","Τρι","Τετ","Πεμ","Παρ","Σαβ"]
  const grLong   = ["Κυριακή","Δευτέρα","Τρίτη","Τετάρτη","Πέμπτη","Παρασκευή","Σάββατο"]

  const candidates = [
    String(jsDow),
    String(((jsDow + 6) % 7) + 1),
    engShort[jsDow], engLong[jsDow],
    grShort[jsDow], grLong[jsDow],
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
      windows = data.map(r => ({ s: strToMinutes(r.start_time), e: strToMinutes(r.end_time) }))
      defaultOnline = !!data[0]?.is_online
    }
  } catch (_) {}

  let dayBreaks = []
  try {
    const { data: brk } = await supabase
      .from("trainer_breaks") // optional table
      .select("weekday,date,start_time,end_time")
      .eq("trainer_id", trainerId)
      .or(`date.eq.${isoDate},weekday.in.(${candidates.join(",")})`)
    if (Array.isArray(brk)) {
      dayBreaks = brk
        .filter(r => (r.date ? r.date === isoDate : true))
        .map(r => ({ s: strToMinutes(r.start_time), e: strToMinutes(r.end_time) }))
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

  return { windows, breaks: dayBreaks, stepMin, sessionMin, bufferMin: 0, defaultOnline }
}

/* ---------------- bookings -> busy intervals ---------------- */
function bookingsToBusy(rows) {
  const keep = (r) => {
    const s = String(r.status || "").toLowerCase()
    return !["declined", "cancelled", "canceled", "rejected"].includes(s)
  }
  return (rows || []).filter(keep).map((r) => {
    const s = strToMinutes(r.start_time)
    let e = r.end_time ? strToMinutes(r.end_time) : (s + Number(r.duration_min || 0))
    return { s, e }
  })
}

/* ---------------- build slots ---------------- */
function buildSlots(windows, busy, durationMin, stepMin) {
  const slots = []
  windows.forEach((w) => {
    for (let s = w.s; s + durationMin <= w.e; s += stepMin) {
      const e = s + durationMin
      const clash = busy.some((b) => overlaps(s, e, b.s, b.e))
      slots.push({ s, e, available: !clash })
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

  useEffect(() => { if (selectedDate) setDate(selectedDate) }, [selectedDate])

  useEffect(() => {
    let alive = true
    if (!trainerId || !date) return
    ;(async () => {
      const s = await readScheduleFromDB(trainerId, date, { sessionMinutes, workStart, workEnd })
      if (!alive) return
      setSched(s)
      setUiSession(s.sessionMin || 60)
      setIsOnline(s.defaultOnline || false)
    })()
    return () => { alive = false }
  }, [trainerId, date, sessionMinutes, workStart, workEnd])

  useEffect(() => {
    if (!trainerId || !date) return
    let alive = true
    setLoadingDay(true); setErr(null)
    ;(async () => {
      const { data, error } = await supabase
        .from("trainer_bookings")
        .select("id,start_time,end_time,duration_min,status")
        .eq("trainer_id", trainerId)
        .eq("date", date)

      if (!alive) return
      if (error) { setDayRows([]); setErr(error.message || "Σφάλμα φόρτωσης") }
      else setDayRows(data || [])
      setLoadingDay(false)
    })()
    return () => { alive = false }
  }, [trainerId, date, refreshTick])

  const busyIntervals = useMemo(() => bookingsToBusy(dayRows), [dayRows])
  const workingWindows = useMemo(() => {
    if (!sched) return []
    return subtractMany(sched.windows || [], sched.breaks || [])
  }, [sched])

  const slots = useMemo(() => {
    if (!sched) return []
    return buildSlots(workingWindows, busyIntervals, uiSession, Math.max(5, sched.stepMin || 15))
  }, [workingWindows, busyIntervals, uiSession, sched])

  const availableCount = useMemo(() => slots.filter((s) => s.available).length, [slots])

  const handleCreate = async () => {
    setOkMsg(""); setErr(null)
    if (!trainerId) return setErr("Λείπει το trainerId.")
    if (!email || !/\S+@\S+\.\S+/.test(email)) return setErr("Το email είναι υποχρεωτικό και πρέπει να είναι έγκυρο.")
    if (selectedStart == null) return setErr("Επίλεξε ώρα.")
    if (!sched) return setErr("Δεν βρέθηκε διαθέσιμο ωράριο.")

    const endMin = selectedStart + uiSession
    if (busyIntervals.some((b) => overlaps(selectedStart, endMin, b.s, b.e))) {
      return setErr("Η ώρα δεν είναι διαθέσιμη πλέον. Διάλεξε άλλη.")
    }

    setSaving(true)
    try {
      let user_id = null
      let resolvedName = null
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("email", email)
        .maybeSingle()
      if (prof) { user_id = prof.id; resolvedName = prof.full_name }

      const start_time = minToHHMMSS(selectedStart)
      const end_time   = minToHHMMSS(endMin)
      const amountStr  = amount ? ` [€${Number(amount).toLocaleString("el-GR")}]` : ""
      const finalNote  = `${amountStr}${amount ? " " : ""}${note || ""}`.trim()

      const payload = {
        trainer_id: trainerId,
        user_id,
        user_email: email,
        user_name: username || resolvedName || null,
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

      setDayRows((r) => [...r, { id: Math.random(), start_time, end_time, duration_min: uiSession, status: "accepted" }])
      setSelectedStart(null)
      setOkMsg("Η κράτηση καταχωρήθηκε ✅")
      onCreated && onCreated(payload)
    } catch (e) {
      setErr(e?.message || "Αποτυχία δημιουργίας κράτησης")
    } finally {
      setSaving(false)
    }
  }

  const weekdayLongGR = new Date(date).toLocaleDateString("el-GR", { weekday: "long" })
  const headerTitle = `Γρήγορη Κράτηση – ${weekdayLongGR} ${new Date(date).toLocaleDateString("el-GR", { day: "2-digit", month: "long", year: "numeric" })}`
  const niceWindows =
    (sched?.windows || []).length
      ? (sched.windows).map((w) => `${minToHHMM(w.s)}–${minToHHMM(w.e)}`).join(", ")
      : "—"

  return (
    <Glass className="p-3 sm:p-4">
      {/* sticky header */}
      <div className="sticky -top-3 -mx-3 sm:-mx-4 p-3 sm:p-4 mb-2 backdrop-blur-xl bg-black/30 rounded-t-2xl border-b border-white/10 flex items-center justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-white/90">
            <div className="p-1.5 rounded-lg bg-white/10 border border-white/10">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <h3 className="font-semibold truncate">{headerTitle}</h3>
          </div>
          <p className="text-xs text-white/60 mt-1">Ωράριο: <span className="text-white/75">{niceWindows}</span></p>
        </div>
        <button
          className="shrink-0 inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white/80 hover:bg-white/15"
          title="Ανανέωση διαθέσιμων"
          onClick={() => setRefreshTick((t) => t + 1)}
        >
          <RotateCw className="h-3.5 w-3.5" /> Ανανέωση
        </button>
      </div>

      {/* Controls row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <label className="block col-span-2">
          <span className="text-[13px] text-white/80">Ημερομηνία</span>
          <input
            type="date"
            className="mt-1 w-full h-11 rounded-lg bg-white/[.06] border border-white/10 px-3 text-base text-white focus:outline-none focus:ring-2 focus:ring-white/20"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-[13px] text-white/80">Τύπος</span>
          <button
            type="button"
            onClick={() => setIsOnline((v) => !v)}
            className={[
              "mt-1 w-full h-11 rounded-lg border px-3 text-base inline-flex items-center justify-center gap-2 focus:outline-none",
              isOnline
                ? "bg-blue-500/15 border-blue-400/30 text-blue-100"
                : "bg-white/[.06] border-white/10 text-white/90 hover:bg-white/[.1]",
            ].join(" ")}
          >
            <Wifi className="h-5 w-5" /> {isOnline ? "Διαδικτυακά" : "Δια ζώσης"}
          </button>
        </label>
      </div>

      {/* Duration segmented */}
      <div className="mb-3">
        <span className="text-[13px] text-white/80">Διάρκεια</span>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {[30, 45, 60, 75, 90].map((m) => (
            <button
              key={m}
              onClick={() => setUiSession(m)}
              className={[
                "h-9 px-3 rounded-full text-sm border",
                uiSession === m
                  ? "bg-white/[.18] border-white/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.25),0_2px_8px_rgba(0,0,0,.35)]"
                  : "bg-white/[.06] border-white/10 text-white/90 hover:bg-white/[.1]",
              ].join(" ")}
            >
              {m}′
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-xs text-white/70 mb-1.5">
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-400/80" /> Διαθέσιμο</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-zinc-600/70" /> Κατειλημμένο</span>
      </div>

      {/* Slots */}
      <Tile className="p-3 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-white/70" />
          <p className="text-sm text-white/90">
            Ώρες ({uiSession}′) — {loadingDay || !sched ? "…" : `${availableCount} διαθέσιμες`}
          </p>
        </div>

        {!sched ? (
          <Spinner />
        ) : (
          <div className="max-h-[44vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {loadingDay ? (
                <div className="col-span-full"><Spinner /></div>
              ) : (workingWindows || []).length === 0 ? (
                <div className="col-span-full text-white/70 text-sm">Ρεπό / χωρίς ωράριο για αυτή τη μέρα.</div>
              ) : (
                slots.map(({ s, e, available }) => {
                  const isSel = selectedStart === s
                  let cls = "h-10 rounded-full text-sm border transition px-3 text-center"
                  if (!available) cls += " bg-zinc-900/50 border-white/10 text-white/35 cursor-not-allowed line-through"
                  else if (isSel) cls += " bg-emerald-500/20 border-emerald-400/30 text-emerald-100 shadow-[0_0_0_1px_rgba(16,185,129,.25)_inset]"
                  else cls += " bg-white/[.06] hover:bg-white/[.1] border-white/10 text-white"
                  return (
                    <button
                      key={`${s}-${e}`}
                      disabled={!available || saving}
                      onClick={() => setSelectedStart(s)}
                      className={cls}
                      title={`${minToHHMM(s)} – ${minToHHMM(e)}`}
                    >
                      {minToHHMM(s)}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}
      </Tile>

      {/* Form — bigger labels & fields */}
      <Tile className="p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[13px] text-white/85 inline-flex items-center gap-1"><Mail className="h-4 w-4" /> Email πελάτη (υποχρεωτικό)</span>
            <input
              type="email"
              required
              placeholder="client@example.com"
              className="mt-1 w-full h-11 rounded-lg bg-white/[.06] border border-white/10 px-3 text-base text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-[13px] text-white/85 inline-flex items-center gap-1"><User className="h-4 w-4" /> Όνομα/username (προαιρετικό)</span>
            <input
              type="text"
              placeholder="π.χ. chris.k"
              className="mt-1 w-full h-11 rounded-lg bg-white/[.06] border border-white/10 px-3 text-base text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-[13px] text-white/85 inline-flex items-center gap-1"><Euro className="h-4 w-4" /> Ποσό πληρωμής (προαιρετικό)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="π.χ. 40"
              className="mt-1 w-full h-11 rounded-lg bg-white/[.06] border border-white/10 px-3 text-base text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-[13px] text-white/85">Σημείωση (προαιρετικό)</span>
            <textarea
              rows={3}
              placeholder="Οποιαδήποτε λεπτομέρεια"
              className="mt-1 w-full rounded-lg bg-white/[.06] border border-white/10 px-3 py-2 text-base text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
        </div>
      </Tile>

      {/* status / action */}
      {err && <div className="mb-2 text-sm text-red-300">{err}</div>}
      {okMsg && (
        <div className="mb-2 text-sm text-emerald-300 inline-flex items-center gap-2">
          <Check className="h-4 w-4" /> {okMsg}
          <button className="ml-2 text-white/50 hover:text-white" onClick={() => setOkMsg("")}><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-white/70 truncate">
          {selectedStart != null ? `Επιλεγμένο: ${minToHHMM(selectedStart)} – ${minToHHMM((selectedStart || 0) + uiSession)}` : "Καμία ώρα επιλεγμένη"}
        </div>
        <button
          onClick={handleCreate}
          disabled={saving}
          className="h-11 px-5 rounded-xl bg-white text-black hover:bg-zinc-200 disabled:opacity-60 text-[15px] font-medium border border-white/10"
        >
          {saving ? "Αποθήκευση..." : "Καταχώριση"}
        </button>
      </div>
    </Glass>
  )
}
