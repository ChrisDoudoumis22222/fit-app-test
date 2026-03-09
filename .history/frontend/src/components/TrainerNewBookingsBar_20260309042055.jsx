// src/components/TrainerNewBookingsBar.jsx
"use client"

import React, { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Clock3, Euro, Wifi, X } from "lucide-react"
import { supabase } from "../supabaseClient"

/* ---------------- helpers ---------------- */
const hhmm = (t) =>
  typeof t === "string" ? (t.match(/^(\d{1,2}:\d{2})/)?.[1] ?? t) : t

const timeToMinutes = (t) => {
  if (!t) return 0
  const [h, m] = String(t).split(":").map((n) => parseInt(n, 10))
  return (h || 0) * 60 + (m || 0)
}

const isNewBooking = (b) => {
  if (!b?.created_at) return false
  return Date.now() - new Date(b.created_at).getTime() <= 24 * 60 * 60 * 1000
}

const getDisplayName = (b) =>
  b?.user_name ||
  b?.client_name ||
  b?.customer_name ||
  b?.name ||
  "Κράτηση"

const getAvatarSrc = (b) =>
  b?.user_avatar_url ||
  b?.client_avatar_url ||
  b?.avatar_url ||
  b?.profile_image_url ||
  b?.profile_image ||
  b?.image_url ||
  b?.photo_url ||
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
      "relative overflow-hidden rounded-[26px] border border-white/10",
      "bg-[rgba(12,16,24,.84)] backdrop-blur-xl",
      "shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_18px_45px_rgba(0,0,0,.38)]",
      className,
    ].join(" ")}
  >
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,.06),transparent_38%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.04),transparent_38%)]" />
    </div>
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
        onError={() => setImgError(true)}
        className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-white/12 sm:h-12 sm:w-12"
      />
    )
  }

  return (
    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/8 text-[13px] font-semibold text-white/88 ring-1 ring-white/12">
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
        ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""}`
        : `${minutes}m`
      : null

  const price = b.price_eur ?? b.total_price ?? b.price
  const isNew = isNewBooking(b)

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onOpen?.(b)
      }}
      className="group w-full min-w-[250px] max-w-[250px] text-left sm:min-w-[268px] sm:max-w-[268px]"
    >
      <div
        className={[
          "relative overflow-hidden rounded-[20px] border px-3.5 py-3",
          "border-[#6d5714] bg-[#0b1220]/95",
          "transition-all duration-200",
          "hover:-translate-y-[1px] hover:border-[#9f8030] hover:bg-[#0d1626]",
          "shadow-[inset_0_1px_0_rgba(255,255,255,.03),0_10px_26px_rgba(0,0,0,.35)]",
        ].join(" ")}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,196,64,.05),transparent_45%)]" />

        <div className="relative flex items-start gap-3">
          <div className="relative">
            <AvatarCircle src={avatar} name={name} />
            <span className="absolute -left-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_0_3px_rgba(11,18,32,1)]" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-[15px] font-semibold text-white/96">
                  {name}
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {b.is_online ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/20 bg-cyan-400/12 px-2 py-0.5 text-[10px] font-medium text-cyan-200">
                      <Wifi className="h-3 w-3" />
                      Online
                    </span>
                  ) : null}

                  <span className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-400/12 px-2 py-0.5 text-[10px] font-medium text-amber-200">
                    Εκκρεμεί
                  </span>

                  {isNew ? (
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/8 px-2 py-0.5 text-[10px] font-medium text-white/80">
                      ΝΕΟ
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2 text-white/72">
              <div className="inline-flex min-w-0 items-center gap-1.5 text-[13px]">
                <Clock3 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {hhmm(b.start_time)} - {hhmm(b.end_time)}
                </span>
              </div>

              {durationStr ? (
                <span className="shrink-0 text-[12px] text-white/50">{durationStr}</span>
              ) : null}
            </div>

            <div className="mt-3 flex items-center justify-end">
              {price != null ? (
                <span className="inline-flex items-center gap-1 text-[14px] font-semibold text-white/92">
                  <Euro className="h-3.5 w-3.5" />
                  {Number(price).toLocaleString("el-GR")}
                </span>
              ) : (
                <span className="text-[12px] text-white/35">—</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </button>
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  /* initial load: ONLY pending */
  useEffect(() => {
    let alive = true
    if (!trainerId) return

    const baseCols = [
      "id",
      "trainer_id",
      "user_id",
      "date",
      "start_time",
      "end_time",
      "duration_min",
      "status",
      "is_online",
      "user_name",
      "client_name",
      "customer_name",
      "created_at",
      "price_eur",
      "total_price",
      "price",
      "user_avatar_url",
      "client_avatar_url",
      "avatar_url",
      "profile_image_url",
      "profile_image",
      "image_url",
      "photo_url",
    ].join(",")

    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        let q = supabase
          .from("trainer_bookings")
          .select(baseCols)
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

    return () => {
      alive = false
    }
  }, [trainerId, refreshKey, dateFrom, limit])

  /* realtime: keep ONLY pending */
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

          if ((b?.status || "").toLowerCase() !== "pending") {
            return withoutCurrent
          }

          if (dateFrom && b.date < dateFrom) {
            return withoutCurrent
          }

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

  useEffect(() => {
    if (!items.length) setVisible(false)
  }, [items])

  if (!visible || items.length === 0) {
    if (!debug) return null

    return (
      <div className="mb-3 md:mb-4">
        <Glass className="p-3 sm:p-4">
          <div className="text-xs text-white/70">
            Δεν βρέθηκαν εκκρεμείς κρατήσεις
            {dateFrom ? ` • από ${dateFrom}` : ""}
            {error ? ` • error: ${String(error)}` : ""}
          </div>
        </Glass>
      </div>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        key="trainer-pending-bookings-bar"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="mb-3 md:mb-4"
      >
        <Glass className="px-3 py-3 sm:px-4 sm:py-4">
          <style>{`
            .trainer-bookings-scroll {
              scrollbar-width: thin;
              scrollbar-color: rgba(156,163,175,.55) transparent;
              -webkit-overflow-scrolling: touch;
            }

            .trainer-bookings-scroll::-webkit-scrollbar {
              height: 10px;
            }

            .trainer-bookings-scroll::-webkit-scrollbar-track {
              background: transparent;
            }

            .trainer-bookings-scroll::-webkit-scrollbar-thumb {
              background: rgba(156,163,175,.42);
              border-radius: 999px;
              border: 2px solid transparent;
              background-clip: padding-box;
            }

            .trainer-bookings-scroll::-webkit-scrollbar-thumb:hover {
              background: rgba(156,163,175,.58);
              border: 2px solid transparent;
              background-clip: padding-box;
            }

            @media (max-width: 767px) {
              .trainer-bookings-scroll::-webkit-scrollbar {
                height: 7px;
              }
            }
          `}</style>

          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[15px] font-semibold text-white/95">
                Εκκρεμή αιτήματα κράτησης{" "}
                <span className="text-white/50">({items.length})</span>
              </div>
              <div className="mt-0.5 text-[12px] text-white/50">
                Εμφανίζονται μόνο όσα είναι σε αναμονή
              </div>
            </div>

            <button
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.03] text-white/80 transition hover:bg-white/[.06]"
              onClick={() => setVisible(false)}
              aria-label="Κλείσιμο"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="trainer-bookings-scroll flex gap-3 overflow-x-auto pb-2">
            {loading ? (
              <div className="px-2 py-2 text-xs text-white/60">Φόρτωση…</div>
            ) : (
              items.map((b) => (
                <PendingBookingCard
                  key={b.id}
                  b={b}
                  onOpen={onOpenDetails}
                />
              ))
            )}
          </div>
        </Glass>
      </motion.div>
    </AnimatePresence>
  )
}