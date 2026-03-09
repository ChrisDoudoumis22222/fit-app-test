"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { CalendarDays } from "lucide-react"

import { PremiumCard, ScrollReveal } from "./shared.jsx"

export default function AvailabilitySection({ rows }) {
  const normalizedRows = useMemo(() => {
    if (!Array.isArray(rows) || rows.length === 0) return []

    const DAY_LABELS = {
      0: "Κυριακή",
      1: "Δευτέρα",
      2: "Τρίτη",
      3: "Τετάρτη",
      4: "Πέμπτη",
      5: "Παρασκευή",
      6: "Σάββατο",
      sunday: "Κυριακή",
      monday: "Δευτέρα",
      tuesday: "Τρίτη",
      wednesday: "Τετάρτη",
      thursday: "Πέμπτη",
      friday: "Παρασκευή",
      saturday: "Σάββατο",
      "κυριακή": "Κυριακή",
      "δευτέρα": "Δευτέρα",
      "τρίτη": "Τρίτη",
      "τετάρτη": "Τετάρτη",
      "πέμπτη": "Πέμπτη",
      "παρασκευή": "Παρασκευή",
      "σάββατο": "Σάββατο",
    }

    const DAY_ORDER = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
      "κυριακή": 0,
      "δευτέρα": 1,
      "τρίτη": 2,
      "τετάρτη": 3,
      "πέμπτη": 4,
      "παρασκευή": 5,
      "σάββατο": 6,
    }

    const formatTime = (value) => {
      if (!value) return ""
      const str = String(value).trim()
      if (!str) return ""
      return str.length >= 5 ? str.slice(0, 5) : str
    }

    const getOrder = (row, index) => {
      if (typeof row?.day_of_week === "number") return row.day_of_week
      if (typeof row?.day_index === "number") return row.day_index
      if (typeof row?.weekday_index === "number") return row.weekday_index

      const raw = row?.day_name ?? row?.day ?? row?.weekday ?? row?.label
      if (typeof raw === "string") {
        const key = raw.trim().toLowerCase()
        if (key in DAY_ORDER) return DAY_ORDER[key]
      }

      return index
    }

    const getLabel = (row, index) => {
      const raw = row?.day_name ?? row?.day ?? row?.weekday ?? row?.label ?? row?.day_of_week

      if (typeof raw === "number" && raw in DAY_LABELS) return DAY_LABELS[raw]

      if (typeof raw === "string") {
        const trimmed = raw.trim()
        const lower = trimmed.toLowerCase()

        if (trimmed in DAY_LABELS) return DAY_LABELS[trimmed]
        if (lower in DAY_LABELS) return DAY_LABELS[lower]

        return trimmed
      }

      const order = getOrder(row, index)
      return DAY_LABELS[order] || `Ημέρα ${index + 1}`
    }

    const isAvailable = (row) => {
      if (typeof row?.is_available === "boolean") return row.is_available
      if (typeof row?.available === "boolean") return row.available
      if (typeof row?.enabled === "boolean") return row.enabled
      if (typeof row?.is_active === "boolean") return row.is_active

      const start = row?.start_time ?? row?.start ?? row?.from
      const end = row?.end_time ?? row?.end ?? row?.to
      return Boolean(start && end)
    }

    return [...rows]
      .map((row, index) => {
        const available = isAvailable(row)
        const start = formatTime(row?.start_time ?? row?.start ?? row?.from)
        const end = formatTime(row?.end_time ?? row?.end ?? row?.to)

        const breakStart = formatTime(
          row?.break_start_time ?? row?.break_start ?? row?.pause_start
        )
        const breakEnd = formatTime(
          row?.break_end_time ?? row?.break_end ?? row?.pause_end
        )

        return {
          id: row?.id ?? `${index}-${getLabel(row, index)}`,
          order: getOrder(row, index),
          label: getLabel(row, index),
          available,
          start,
          end,
          breakStart,
          breakEnd,
        }
      })
      .sort((a, b) => a.order - b.order)
  }, [rows])

  if (!normalizedRows.length) return null

  return (
    <PremiumCard>
      <div className="p-4 sm:p-6 lg:p-8 xl:p-9">
        <ScrollReveal>
          <div className="mb-5 sm:mb-6 lg:mb-8">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex shrink-0 items-center justify-center pt-1">
                <CalendarDays className="h-6 w-6 sm:h-7 sm:w-7 text-zinc-200" />
              </div>

              <div className="min-w-0 max-w-3xl">
                <h2 className="text-[1.95rem] sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-100 leading-[1.02] sm:leading-tight">
                  Εβδομαδιαία Διαθεσιμότητα
                </h2>
                <p className="mt-2 text-sm sm:text-base lg:text-lg text-zinc-400 leading-relaxed">
                  Δες το γενικό πρόγραμμα και τις διαθέσιμες ώρες του προπονητή μέσα στην εβδομάδα.
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        <div className="space-y-2.5 sm:space-y-3">
          {normalizedRows.map((day, index) => {
            const hasMainRange = day.available && day.start && day.end
            const hasBreak = day.breakStart && day.breakEnd

            return (
              <ScrollReveal key={day.id} delay={0.03 + index * 0.025}>
                <motion.div
                  whileHover={{ y: -1 }}
                  transition={{ duration: 0.16 }}
                  className="rounded-2xl bg-white/[0.025] px-4 py-3.5 sm:px-5 sm:py-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base sm:text-lg font-semibold text-zinc-100 leading-tight">
                          {day.label}
                        </h3>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] sm:text-xs font-medium ${
                            day.available
                              ? "bg-white/[0.05] text-zinc-300"
                              : "bg-zinc-900/70 text-zinc-500"
                          }`}
                        >
                          {day.available ? "Ανοιχτό" : "Ρεπό"}
                        </span>
                      </div>

                      <p className="mt-1 text-xs sm:text-sm text-zinc-500">
                        {day.available ? "Διαθέσιμο ωράριο" : "Δεν υπάρχει διαθέσιμο ωράριο"}
                      </p>
                    </div>

                    {hasMainRange ? (
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <span className="rounded-2xl bg-zinc-900/75 px-3.5 py-2 text-sm sm:text-base font-medium text-zinc-100">
                          {day.start}
                        </span>

                        <span className="text-zinc-500 text-sm">έως</span>

                        <span className="rounded-2xl bg-zinc-900/75 px-3.5 py-2 text-sm sm:text-base font-medium text-zinc-100">
                          {day.end}
                        </span>
                      </div>
                    ) : (
                      <div className="text-sm text-zinc-500 sm:text-right">
                        —
                      </div>
                    )}
                  </div>

                  {hasMainRange && hasBreak && (
                    <div className="mt-3 text-xs sm:text-sm text-zinc-400">
                      Διάλειμμα:{" "}
                      <span className="text-zinc-300">
                        {day.breakStart} - {day.breakEnd}
                      </span>
                    </div>
                  )}
                </motion.div>
              </ScrollReveal>
            )
          })}
        </div>
      </div>
    </PremiumCard>
  )
}