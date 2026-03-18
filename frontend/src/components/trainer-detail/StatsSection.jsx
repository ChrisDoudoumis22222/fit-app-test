"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import {
  CalendarDays,
  Star,
  MessageSquare,
  Briefcase,
} from "lucide-react"
import { supabase } from "../../supabaseClient" // change path if your file is elsewhere

function cn(...classes) {
  return classes.filter(Boolean).join(" ")
}

function safeNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function formatRating(value) {
  const n = safeNumber(value, 0)
  return n > 0 ? n.toFixed(1) : "0.0"
}

function formatExperience(years) {
  const n = safeNumber(years, 0)
  if (n <= 0) return "Νέος"
  if (n === 1) return "1 έτος"
  return `${n} έτη`
}

function StatCard({ icon: Icon, label, value, delay = 0, rotate = "0deg" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay }}
      className={cn(
        "group relative overflow-hidden rounded-[28px]",
        "border border-white/10 bg-white/[0.03]",
        "min-h-[150px] p-4 sm:min-h-[170px] sm:p-5",
        "lg:min-h-[210px] lg:p-6 xl:min-h-[235px] xl:p-7",
        "backdrop-blur-xl transition-all duration-300",
        "hover:-translate-y-1 hover:border-white/15 hover:bg-white/[0.045]",
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_38%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      <div className="pointer-events-none absolute bottom-3 right-3 opacity-[0.12] transition-all duration-300 group-hover:opacity-[0.16] group-hover:scale-105 lg:bottom-4 lg:right-4">
        <Icon
          className="h-16 w-16 text-white sm:h-20 sm:w-20 lg:h-24 lg:w-24 xl:h-28 xl:w-28"
          style={{ transform: `rotate(${rotate})` }}
          strokeWidth={1.5}
        />
      </div>

      <div className="pointer-events-none absolute bottom-2 right-2 h-20 w-20 rounded-full bg-white/[0.03] blur-2xl sm:h-24 sm:w-24 lg:bottom-4 lg:right-4 lg:h-28 lg:w-28 xl:h-32 xl:w-32" />

      <div className="relative flex h-full flex-col justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 sm:text-sm lg:text-[15px]">
            {label}
          </p>
        </div>

        <div className="mt-8 lg:mt-12">
          <p className="text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl lg:text-[2.65rem] xl:text-[2.9rem]">
            {value}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

function SkeletonCard({ delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, delay }}
      className={cn(
        "relative overflow-hidden rounded-[28px]",
        "border border-white/10 bg-white/[0.03]",
        "min-h-[150px] p-4 sm:min-h-[170px] sm:p-5",
        "lg:min-h-[210px] lg:p-6 xl:min-h-[235px] xl:p-7",
        "backdrop-blur-xl",
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_38%)]" />

      <div className="relative flex h-full flex-col justify-between">
        <div className="h-4 w-28 rounded-full bg-white/10 sm:h-5 sm:w-32 lg:h-6 lg:w-40 animate-pulse" />
        <div className="mt-8 lg:mt-12 h-10 w-20 rounded-xl bg-white/10 sm:h-12 sm:w-24 lg:h-14 lg:w-28 animate-pulse" />
      </div>

      <div className="absolute bottom-3 right-3 h-16 w-16 rounded-full bg-white/[0.04] blur-xl sm:h-20 sm:w-20 lg:bottom-4 lg:right-4 lg:h-24 lg:w-24 xl:h-28 xl:w-28 animate-pulse" />
    </motion.div>
  )
}

export default function StatsSection({
  data,
  avgRating = 0,
  reviewsCount = 0,
  acceptedBookingsCount = null,
}) {
  const sectionRef = useRef(null)

  const [shouldLoad, setShouldLoad] = useState(false)
  const [showContent, setShowContent] = useState(false)
  const [acceptedBookings, setAcceptedBookings] = useState(
    safeNumber(acceptedBookingsCount, 0),
  )

  const trainerId = useMemo(() => {
    return data?.id || data?.trainer_id || data?.profile_id || null
  }, [data])

  const stats = useMemo(() => {
    return [
      {
        key: "acceptedBookings",
        label: "Κρατήσεις",
        value: safeNumber(acceptedBookings, 0),
        icon: CalendarDays,
        rotate: "-8deg",
      },
      {
        key: "rating",
        label: "Αξιολόγηση",
        value: formatRating(avgRating),
        icon: Star,
        rotate: "8deg",
      },
      {
        key: "reviews",
        label: "Κριτικές",
        value: safeNumber(reviewsCount, 0),
        icon: MessageSquare,
        rotate: "-6deg",
      },
      {
        key: "experience",
        label: "Εμπειρία",
        value: formatExperience(data?.experience_years),
        icon: Briefcase,
        rotate: "6deg",
      },
    ]
  }, [acceptedBookings, avgRating, reviewsCount, data?.experience_years])

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting) return
        setShouldLoad(true)
        observer.disconnect()
      },
      {
        rootMargin: "180px 0px",
        threshold: 0.12,
      },
    )

    observer.observe(el)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!shouldLoad) return

    let alive = true

    async function loadAcceptedBookings() {
      const startedAt = Date.now()

      try {
        if (acceptedBookingsCount !== null && acceptedBookingsCount !== undefined) {
          if (!alive) return
          setAcceptedBookings(safeNumber(acceptedBookingsCount, 0))
        } else if (trainerId) {
          const { count, error } = await supabase
            .from("trainer_bookings")
            .select("id", { count: "exact", head: true })
            .eq("trainer_id", trainerId)
            .eq("status", "accepted")

          if (error) throw error
          if (!alive) return

          setAcceptedBookings(safeNumber(count, 0))
        } else {
          if (!alive) return
          setAcceptedBookings(0)
        }
      } catch (err) {
        console.error("Failed to load accepted bookings:", err)
        if (!alive) return
        setAcceptedBookings(0)
      } finally {
        const elapsed = Date.now() - startedAt
        const remaining = Math.max(0, 350 - elapsed)

        setTimeout(() => {
          if (!alive) return
          setShowContent(true)
        }, remaining)
      }
    }

    loadAcceptedBookings()

    return () => {
      alive = false
    }
  }, [shouldLoad, trainerId, acceptedBookingsCount])

  return (
    <section ref={sectionRef} className="w-full">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
        {showContent
          ? stats.map((item, index) => (
              <StatCard
                key={item.key}
                icon={item.icon}
                label={item.label}
                value={item.value}
                delay={index * 0.05}
                rotate={item.rotate}
              />
            ))
          : stats.map((item, index) => (
              <SkeletonCard key={item.key} delay={index * 0.04} />
            ))}
      </div>
    </section>
  )
}