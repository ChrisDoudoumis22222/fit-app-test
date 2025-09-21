// src/components/TrainerNewBookingsBar.jsx
"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Euro } from "lucide-react"
import { supabase } from "../supabaseClient"

/* helpers */
const hhmm = (t) => (typeof t === "string" ? (t.match(/^(\d{1,2}:\d{2})/)?.[1] ?? t) : t)
const timeToMinutes = (t) => { if (!t) return 0; const [h,m] = t.split(":").map(n=>parseInt(n,10)); return (h||0)*60 + (m||0) }
const isNewBooking = (b) => { if (!b?.created_at) return false; return Date.now() - new Date(b.created_at).getTime() <= 24*60*60*1000 }

/* minimal glass */
const Glass = ({ className = "", children }) => (
  <div className={`relative rounded-3xl border border-white/10 bg-[rgba(17,18,21,.65)] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_10px_30px_rgba(0,0,0,.45)] ${className}`}>
    <div className="pointer-events-none absolute inset-0 rounded-3xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[.06] via-white/[.02] to-transparent opacity-40" />
      <div className="absolute -top-1/2 left-0 right-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent opacity-50" />
    </div>
    <div className="relative">{children}</div>
  </div>
)

function BookingPill({ b, onOpen, compact = true }) {
  const status = (b.status || "pending").toLowerCase()
  const ring =
    status === "accepted" ? "ring-emerald-400/35"
    : (status === "declined" || status === "cancelled") ? "ring-rose-400/35"
    : "ring-amber-400/35"
  const tint =
    status === "accepted" ? "bg-emerald-500/10"
    : (status === "declined" || status === "cancelled") ? "bg-rose-500/10"
    : "bg-amber-500/10"

  const minutes = timeToMinutes(b.end_time) - timeToMinutes(b.start_time) || b.duration_min
  const durationStr = minutes ? `${minutes}’` : null
  const price = b.price_eur ?? b.total_price ?? b.price
  const isNew = isNewBooking(b)

  return (
    <button onClick={(e)=>{ e.stopPropagation(); onOpen?.(b) }} className="w-full text-left">
      <div className={`relative rounded-2xl border border-white/10 ring-1 ${ring} ${tint} bg-white/[.04] hover:bg-white/[.06] transition shadow-[inset_0_1px_0_rgba(255,255,255,.05),0_6px_20px_rgba(0,0,0,.35)] ${compact ? "px-2 py-1.5" : "px-3 py-2.5"}`}>
        {isNew && (
          <span className={`absolute top-2 right-2 ${compact ? "text-[8px] px-1" : "text-[9px] px-1.5"} tracking-wide py-0.5 rounded bg-white/20 text-white/90`}>NEW</span>
        )}
        <div className="flex items-center justify-between">
          <span className={compact ? "text-[12px] text-white/70" : "text-xs text-white/70"}>{hhmm(b.start_time)}</span>
          {!compact && price != null && (
            <span className="text-xs inline-flex items-center gap-1 text-white/80">
              <Euro className="h-3 w-3" />
              {Number(price).toLocaleString("el-GR")}
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className={`${compact ? "text-[12px]" : "text-sm"} font-medium truncate`}>
            {b.user_name || b.client_name || "Κράτηση"}
          </span>
          {b.is_online && (
            <span className={`${compact ? "text-[9px] px-1" : "text-[10px] px-1.5"} py-0.5 rounded bg-blue-400/15 text-blue-200`}>
              Online
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[11px] text-white/60">{hhmm(b.end_time)}</span>
          {durationStr && <span className="text-[11px] text-white/60">{durationStr}</span>}
        </div>
      </div>
    </button>
  )
}

export default function TrainerNewBookingsBar({
  trainerId,
  onOpenDetails,
  refreshKey,
  /** array of statuses to include; set null/undefined to include ALL */
  statusIn = ["pending"],
  /** ISO date string YYYY-MM-DD to include from; omit to include all dates */
  dateFrom,
  /** max rows */
  limit = 50,
  /** show hint when no results matched */
  debug = false,
}) {
  const [items, setItems] = useState([])
  const [visible, setVisible] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // initial load (with graceful fallback if price_eur column doesn't exist)
  useEffect(() => {
    let alive = true
    if (!trainerId) return

    const baseCols = "id,date,start_time,end_time,duration_min,status,is_online,user_name,created_at"
    const buildQuery = (includePrice) => {
      let q = supabase
        .from("trainer_bookings")
        .select(includePrice ? `${baseCols},price_eur` : baseCols)
        .eq("trainer_id", trainerId)

      if (Array.isArray(statusIn) && statusIn.length > 0) q = q.in("status", statusIn)
      if (dateFrom) q = q.gte("date", dateFrom)

      return q.order("date", { ascending: true }).order("start_time", { ascending: true }).limit(limit)
    }

    ;(async () => {
      try {
        setLoading(true); setError(null)

        // try with price_eur
        let { data, error } = await buildQuery(true)
        if (error && /price_eur/i.test(error.message)) {
          // retry without price_eur (column missing)
          const retry = await buildQuery(false)
          data = retry.data
          error = retry.error
        }
        if (error) throw error
        if (!alive) return

        const list = data ?? []
        setItems(list)
        setVisible(list.length > 0)
      } catch (e) {
        if (!alive) return
        setItems([])
        setVisible(false)
        setError(e?.message || "Load error")
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => { alive = false }
  }, [trainerId, refreshKey, dateFrom, limit, JSON.stringify(statusIn)])

  // realtime (insert/update)
  useEffect(() => {
    if (!trainerId) return

    const channel = supabase.channel(`realtime-trainer-bookings-${trainerId}`)

    const passStatus = (st) => {
      if (!Array.isArray(statusIn) || statusIn.length === 0) return true
      return statusIn.includes((st || "").toLowerCase())
    }

    channel.on("postgres_changes",
      { event: "INSERT", schema: "public", table: "trainer_bookings", filter: `trainer_id=eq.${trainerId}` },
      (payload) => {
        const b = payload.new
        if (dateFrom && b.date < dateFrom) return
        if (!passStatus(b.status)) return
        setItems((prev) =>
          [b, ...prev]
            .sort((a, c) => (a.date === c.date ? a.start_time.localeCompare(c.start_time) : a.date.localeCompare(c.date)))
            .slice(0, limit)
        )
        setVisible(true)
      }
    )

    channel.on("postgres_changes",
      { event: "UPDATE", schema: "public", table: "trainer_bookings", filter: `trainer_id=eq.${trainerId}` },
      (payload) => {
        const b = payload.new
        setItems((prev) => {
          const merged = prev.map((x) => (x.id === b.id ? { ...x, ...b } : x))
          const filtered = merged.filter((x) => (!dateFrom || x.date >= dateFrom) && passStatus(x.status))
          return filtered
        })
      }
    )

    channel.subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [trainerId, dateFrom, limit, JSON.stringify(statusIn)])

  if (!visible || items.length === 0) {
    if (!debug) return null
    return (
      <div className="mb-3 md:mb-4 sticky top-2 z-40">
        <Glass className="p-3 sm:p-4">
          <div className="text-xs text-white/70">
            No bookings matched the bar filters
            {statusIn?.length ? ` (status in: ${statusIn.join(", ")})` : " (all statuses)"}
            {dateFrom ? ` • from ${dateFrom}` : ""}
            {error ? ` • error: ${String(error)}` : ""}
          </div>
        </Glass>
      </div>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        key="new-bookings-popup"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: .22, ease: [0.22,1,0.36,1] }}
        className="mb-3 md:mb-4 sticky top-2 z-40"
      >
        <Glass className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-white/90 font-medium">
              Νέα αιτήματα κράτησης <span className="text-white/55">({items.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="h-9 px-3 text-sm rounded-xl bg-transparent hover:bg-white/5 text-white border border-white/10"
                onClick={() => setItems([])}
              >
                Καθαρισμός
              </button>
              <button
                className="h-9 w-9 grid place-items-center rounded-xl bg-transparent hover:bg-white/5 text-white border border-white/10"
                onClick={() => setVisible(false)}
                aria-label="Κλείσιμο"
              >
                <X className="h-4 w-4 text-white/85" />
              </button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {loading && <div className="text-xs text-white/60 px-2 py-2">Φόρτωση…</div>}
            {!loading && items.map((b) => (
              <div key={b.id} className="min-w-[220px] sm:min-w-[240px]">
                <BookingPill b={b} onOpen={onOpenDetails} compact />
              </div>
            ))}
          </div>
        </Glass>
      </motion.div>
    </AnimatePresence>
  )
}
