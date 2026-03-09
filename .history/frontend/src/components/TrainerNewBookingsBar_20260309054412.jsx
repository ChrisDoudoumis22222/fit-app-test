// src/components/TrainerNewBookingsBar.jsx
"use client"

import React, { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Clock3, Euro, Wifi, ChevronDown, ChevronUp } from "lucide-react"
import { supabase } from "../supabaseClient"

/* ---------------- helpers ---------------- */
const hhmm = (t) =>
  typeof t === "string" ? (t.match(/^(\d{1,2}:\d{2})/)?.[1] ?? t) : t

const timeToMinutes = (t) => {
  if (!t) return 0
  const [h, m] = String(t).split(":").map((n) => parseInt(n, 10))
  return (h || 0) * 60 + (m || 0)
}

const minutesAgoLabel = (createdAt) => {
  if (!createdAt) return ""
  const diffMs = Date.now() - new Date(createdAt).getTime()
  if (Number.isNaN(diffMs) || diffMs < 0) return ""

  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "μόλις τώρα"
  if (mins < 60) return `${mins} λ πριν`

  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} ω πριν`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} ημ πριν`

  return ""
}

const getDisplayName = (b) =>
  b?.user_name ||
  b?.client_name ||
  b?.customer_name ||
  b?.name ||
  b?.full_name ||
  "Κράτηση"

const getAvatarSrc = (b) =>
  b?.user_avatar_url ||
  b?.client_avatar_url ||
  b?.avatar_url ||
  b?.profile_image_url ||
  b?.profile_image ||
  b?.image_url ||
  b?.photo_url ||
  b?.avatar ||
  ""

const getInitials = (name = "") => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "?"
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase()
}

/* ---------------- shell ---------------- */
const Glass = ({ className = "", children }) => (
  <div
    className={[
      "relative overflow-hidden rounded-3xl border border-white/10",
      "bg-[rgba(17,18,21,.65)] backdrop-blur-xl",
      "shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_10px_30px_rgba(0,0,0,.45)]",
      className,
    ].join(" ")}
  >
    <div className="relative">{children}</div>
  </div>
)

function AvatarCircle({ src, name }) {
  const [imgError, setImgError] = useState(false)
  const initials = useMemo(() => getInitials(name), [name])

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name || "avatar"}
        loading="lazy"
        decoding="async"
        onError={() => setImgError(true)}
        className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-white/12"
      />
    )
  }

  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/8 text-[12px] font-semibold text-white/88 ring-1 ring-white/12">
      {initials}
    </div>
  )
}

function PendingBookingCard({ b, onOpen }) {
  const name = getDisplayName(b)
  const avatar = getAvatarSrc(b)
  const minutes =
    timeToMinutes(b.end_time) - timeToMinutes(b.start_time) || b.duration_min || 0

  const durationStr =
    minutes > 0
      ? minutes >= 60
        ? `${Math.floor(minutes / 60)}ω ${minutes % 60 ? `${minutes % 60}λ` : ""}`.trim()
        : `${minutes}λ`
      : null

  const price = b?.total_price ?? b?.price ?? b?.price_eur
  const agoLabel = minutesAgoLabel(b?.created_at)

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onOpen?.(b)
      }}
      className="group w-full min-w-[220px] max-w-[220px] text-left sm:min-w-[236px] sm:max-w-[236px]"
      type="button"
    >
      <div
        className={[
          "relative overflow-hidden rounded-[18px] border px-3 py-2.5",
          "border-orange-400/25 bg-zinc-800/85",
          "transition-all duration-200",
          "hover:-translate-y-[1px] hover:bg-zinc-800/95 hover:border-orange-400/45",
          "shadow-[0_8px_20px_rgba(0,0,0,.18)]",
        ].join(" ")}
      >
        <div className="relative flex items-start gap-3">
          <div className="relative">
            <AvatarCircle src={avatar} name={name} />
            <span className="absolute -left-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-orange-400 shadow-[0_0_0_3px_rgba(39,39,42,1)]" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex items-center gap-2">
                <div className="truncate text-[14px] font-semibold text-white/95">
                  {name}
                </div>

                {b.is_online ? (
                  <Wifi
                    className="h-3.5 w-3.5 shrink-0 text-white/45"
                    aria-label="Online"
                    title="Online"
                  />
                ) : (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full bg-white/45"
                    aria-label="Δια ζώσης"
                    title="Δια ζώσης"
                  />
                )}
              </div>

              <span className="shrink-0 rounded-full border border-orange-400/20 bg-orange-400/12 px-2 py-0.5 text-[10px] font-medium text-orange-200">
                Εκκρεμεί
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 text-white/68">
              <div className="inline-flex min-w-0 items-center gap-1.5 text-[12px]">
                <Clock3 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {hhmm(b.start_time)} - {hhmm(b.end_time)}
                </span>
              </div>

              {durationStr ? (
                <span className="shrink-0 text-[11px] text-white/40">{durationStr}</span>
              ) : null}
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="text-[11px] text-white/40">{agoLabel}</div>

              {price != null ? (
                <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-white/90">
                  <Euro className="h-3.5 w-3.5" />
                  {Number(price).toLocaleString("el-GR")}
                </span>
              ) : (
                <span />
              )}
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}

function SkeletonCard() {
  return (
    <div className="w-full min-w-[220px] max-w-[220px] sm:min-w-[236px] sm:max-w-[236px]">
      <div className="overflow-hidden rounded-[18px] border border-white/10 bg-zinc-800/65 px-3 py-2.5">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-white/8 animate-pulse" />
          <div className="min-w-0 flex-1">
            <div className="h-3.5 w-24 rounded bg-white/8 animate-pulse" />
            <div className="mt-2 flex gap-1.5">
              <div className="h-5 w-14 rounded-full bg-white/8 animate-pulse" />
            </div>
            <div className="mt-3 h-3 w-28 rounded bg-white/8 animate-pulse" />
            <div className="mt-2 flex items-center justify-between">
              <div className="h-3 w-12 rounded bg-white/8 animate-pulse" />
              <div className="h-3.5 w-14 rounded bg-white/8 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TrainerNewBookingsBar({
  trainerId,
  onOpenDetails,
  refreshKey,
  dateFrom,
  limit = 50,
  debug = false,
}) {
  const [items, setItems] = useState([])
  const [visible, setVisible] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    if (!trainerId) return

    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        let q = supabase
          .from("trainer_bookings")
          .select("*")
          .eq("trainer_id", trainerId)
          .eq("status", "pending")

        if (dateFrom) q = q.gte("date", dateFrom)

        const { data, error } = await q
          .order("date", { ascending: true })
          .order("start_time", { ascending: true })
          .limit(limit)

        if (error) throw error
        if (!alive) return

        const list = Array.isArray(data) ? data : []
        setItems(list)
        setVisible(true)
      } catch (e) {
        if (!alive) return
        setItems([])
        setVisible(true)
        setError(e?.message || "Load error")
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [trainerId, refreshKey, dateFrom, limit])

  useEffect(() => {
    if (!trainerId) return

    const channel = supabase.channel(`realtime-trainer-pending-bookings-${trainerId}`)

    const sortAndTrim = (arr) =>
      [...arr]
        .filter((x) => (x?.status || "").toLowerCase() === "pending")
        .sort((a, c) =>
          a.date === c.date
            ? String(a.start_time || "").localeCompare(String(c.start_time || ""))
            : String(a.date || "").localeCompare(String(c.date || ""))
        )
        .slice(0, limit)

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "trainer_bookings",
        filter: `trainer_id=eq.${trainerId}`,
      },
      (payload) => {
        const b = payload.new
        if ((b?.status || "").toLowerCase() !== "pending") return
        if (dateFrom && b.date < dateFrom) return

        setItems((prev) => sortAndTrim([b, ...prev]))
        setVisible(true)
      }
    )

    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "trainer_bookings",
        filter: `trainer_id=eq.${trainerId}`,
      },
      (payload) => {
        const b = payload.new

        setItems((prev) => {
          const withoutCurrent = prev.filter((x) => x.id !== b.id)

          if ((b?.status || "").toLowerCase() !== "pending") return withoutCurrent
          if (dateFrom && b.date < dateFrom) return withoutCurrent

          return sortAndTrim([b, ...withoutCurrent])
        })
      }
    )

    channel.on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "trainer_bookings",
        filter: `trainer_id=eq.${trainerId}`,
      },
      (payload) => {
        const deletedId = payload.old?.id
        setItems((prev) => prev.filter((x) => x.id !== deletedId))
      }
    )

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [trainerId, dateFrom, limit])

  if (!visible) return null
  if (!debug && !loading && !error && items.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        key="trainer-pending-bookings-bar"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="mb-4 md:mb-6 pt-2 md:pt-3"
      >
        <Glass className="px-0 md:px-3 py-2.5 md:py-3">
          <style>{`
            .trainer-bookings-scroll {
              scrollbar-width: thin;
              scrollbar-color: rgba(156,163,175,.45) transparent;
              -webkit-overflow-scrolling: touch;
            }

            .trainer-bookings-scroll::-webkit-scrollbar {
              height: 8px;
            }

            .trainer-bookings-scroll::-webkit-scrollbar-track {
              background: transparent;
            }

            .trainer-bookings-scroll::-webkit-scrollbar-thumb {
              background: rgba(156,163,175,.34);
              border-radius: 999px;
            }

            .trainer-bookings-scroll::-webkit-scrollbar-thumb:hover {
              background: rgba(156,163,175,.5);
            }

            @media (max-width: 767px) {
              .trainer-bookings-scroll::-webkit-scrollbar {
                height: 6px;
              }
            }
          `}</style>

          <div className="mb-2 flex items-center justify-between gap-3 px-0 md:px-1">
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-white/94">
                Εκκρεμή αιτήματα κράτησης{" "}
                <span className="text-white/45">({loading ? "..." : items.length})</span>
              </div>
            </div>

            <button
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[.03] text-white/80 transition hover:bg-white/[.06]"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? "Εμφάνιση κρατήσεων" : "Απόκρυψη κρατήσεων"}
              type="button"
            >
              {collapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </button>
          </div>

          {error ? (
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/75">
              Σφάλμα φόρτωσης κρατήσεων
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  key="bookings-content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="trainer-bookings-scroll flex gap-2.5 overflow-x-auto pb-1.5 pt-1">
                    {loading ? (
                      Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                    ) : items.length > 0 ? (
                      items.map((b) => (
                        <PendingBookingCard key={b.id} b={b} onOpen={onOpenDetails} />
                      ))
                    ) : (
                      <div className="px-2 py-2 text-xs text-white/55">
                        Δεν βρέθηκαν εκκρεμείς κρατήσεις
                        {dateFrom ? ` • από ${dateFrom}` : ""}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </Glass>
      </motion.div>
    </AnimatePresence>
  )
}