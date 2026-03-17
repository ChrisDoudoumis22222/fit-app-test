"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { Star, Target, Trophy, Users } from "lucide-react"

import { PremiumCard, ScrollReveal } from "./shared.jsx"

import CertificationsSection from "./CertificationsSection.jsx"
import AvailabilitySection from "./AvailabilitySection.jsx"
import PostsSection from "./PostsSection.jsx"
import ReviewsSection from "./ReviewsSection.jsx"

export {
  CertificationsSection,
  AvailabilitySection,
  PostsSection,
  ReviewsSection,
}

/* --------------------------- Helpers --------------------------- */
const toTierLabel = (value, { percent = false } = {}) => {
  const raw = Number(value)
  const safe = Number.isFinite(raw) ? Math.max(1, Math.round(raw)) : 1

  if (safe < 10) return percent ? "<10%" : "<10"

  const bucket = Math.floor(safe / 10) * 10
  return percent ? `${bucket}+%` : `${bucket}+`
}

function SectionHeader({
  icon: Icon,
  title,
  description,
  meta = null,
  action = null,
}) {
  return (
    <div className="mb-7 flex flex-col gap-5 lg:mb-9 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 w-full">
        <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-200 ring-1 ring-zinc-700/70">
          <Icon className="h-5 w-5" />
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl lg:text-4xl">
          {title}
        </h2>

        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base lg:text-lg">
            {description}
          </p>
        ) : null}
      </div>

      {(meta || action) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 lg:justify-end">
          {meta}
          {action}
        </div>
      )}
    </div>
  )
}

/* --------------------------- Stats --------------------------- */
export function StatsSection({
  data,
  bookingsCount = 0,
  avgRating = 0,
  reviewsCount = 0,
}) {
  const stats = useMemo(() => {
    const experienceYears = Number(data?.experience_years || 0)
    const safeExperience = experienceYears > 0 ? experienceYears : 1

    const showSuccessRate = bookingsCount > 0

    const rawSuccessScore = Math.min(
      96,
      Math.max(
        8,
        8 +
          Math.round(bookingsCount * 2.8) +
          Math.round(reviewsCount * 1.4) +
          Math.round(avgRating * 4) +
          Math.min(safeExperience * 2, 12),
      ),
    )

    const base = [
      {
        key: "sessions",
        icon: Users,
        value: toTierLabel(bookingsCount),
        label: "Ολοκληρωμένες συνεδρίες",
        hint: "Συνολική δραστηριότητα",
        iconWrap: "bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/20",
      },
      {
        key: "experience",
        icon: Trophy,
        value: toTierLabel(safeExperience),
        label: "Εμπειρία στον χώρο",
        hint: "Χρόνια παρουσίας",
        iconWrap: "bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20",
      },
      {
        key: "success",
        icon: Target,
        value: toTierLabel(rawSuccessScore, { percent: true }),
        label: "Ποσοστό επιτυχίας",
        hint: "Συνέπεια & αποτελέσματα",
        iconWrap: "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20",
      },
      {
        key: "reviews",
        icon: Star,
        value: toTierLabel(reviewsCount),
        label: "Κριτικές πελατών",
        hint: avgRating > 0 ? `Μ.Ο. ${avgRating.toFixed(1)} / 5` : "Νέο προφίλ",
        iconWrap: "bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/20",
      },
    ]

    return showSuccessRate ? base : base.filter((s) => s.key !== "success")
  }, [data?.experience_years, bookingsCount, avgRating, reviewsCount])

  const count = stats.length
  const isThree = count === 3

  const gridClass = isThree
    ? "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:gap-5"
    : "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5"

  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen sm:static sm:left-auto sm:right-auto sm:ml-0 sm:mr-0 sm:w-full">
      <PremiumCard hover={false} className="w-full max-w-none">
        <div className="p-5 sm:p-6 lg:p-8 xl:p-9">
          <ScrollReveal>
            <SectionHeader
              icon={Trophy}
              title="Στατιστικά προφίλ"
              description="Μια γρήγορη και καθαρή εικόνα της δραστηριότητας, της εμπειρίας και της αξιοπιστίας του προπονητή."
            />
          </ScrollReveal>

          <div className={gridClass}>
            {stats.map((stat, index) => {
              const isLastStretched =
                stats.length % 2 === 1 && index === stats.length - 1
              const spanLastOnMobile = isLastStretched
                ? "col-span-2 sm:col-span-1"
                : ""

              return (
                <div key={stat.key} className={spanLastOnMobile}>
                  <ScrollReveal delay={index * 0.05}>
                    <motion.div
                      whileHover={{ y: -3 }}
                      className={[
                        "group h-full rounded-2xl border border-zinc-800 bg-zinc-950/70",
                        "p-4 sm:p-5 lg:p-6 transition-all duration-300",
                        "hover:border-zinc-700 hover:bg-zinc-950",
                        isLastStretched ? "text-center sm:text-left" : "",
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl",
                          stat.iconWrap,
                          isLastStretched ? "mx-auto sm:mx-0" : "",
                        ].join(" ")}
                      >
                        <stat.icon className="h-5 w-5" />
                      </div>

                      <div className="text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
                        {stat.value}
                      </div>

                      <div className="mt-2 text-sm font-semibold leading-snug text-zinc-200 sm:text-[15px]">
                        {stat.label}
                      </div>

                      <div className="mt-2 text-xs leading-relaxed text-zinc-500 sm:text-sm">
                        {stat.hint}
                      </div>
                    </motion.div>
                  </ScrollReveal>
                </div>
              )
            })}
          </div>
        </div>
      </PremiumCard>
    </div>
  )
}