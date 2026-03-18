"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CalendarDays } from "lucide-react"

import { PremiumCard } from "./shared.jsx"

function AvailabilitySkeleton() {
  return (
    <div className="space-y-2.5 sm:space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl bg-white/[0.025] px-4 py-3.5 backdrop-blur-[2px] animate-pulse sm:px-5 sm:py-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-5 w-28 rounded-full bg-zinc-800/90 sm:h-6 sm:w-32" />
                <div className="h-6 w-16 rounded-full bg-zinc-900/90" />
              </div>
              <div className="h-4 w-36 rounded-full bg-zinc-900/80" />
            </div>

            <div className="flex items-center gap-2">
              <div className="h-10 w-20 rounded-2xl bg-zinc-900/90" />
              <div className="h-4 w-8 rounded-full bg-zinc-900/70" />
              <div className="h-10 w-20 rounded-2xl bg-zinc-900/90" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AvailabilitySection({ rows, loading = false }) {
  const sectionRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const node = sectionRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: "220px 0px",
        threshold: 0.01,
      }
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [])

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
      const raw =
        row?.day_name ?? row?.day ?? row?.weekday ?? row?.label ?? row?.day_of_week

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

  if (!loading && Array.isArray(rows) && rows.length === 0) return null

  const shouldShowSkeleton = loading || !isVisible

  return (
    <div ref={sectionRef}>
      <PremiumCard
        className={[
          "relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen max-w-none rounded-none border-x-0 bg-transparent shadow-none",
          "sm:static sm:left-auto sm:right-auto sm:ml-0 sm:mr-0 sm:w-full sm:max-w-none sm:rounded-[28px] sm:border-x sm:bg-inherit sm:shadow-[inherit]",
          "!transition-none !duration-0 !ease-linear !transform-none !animate-none hover:!transform-none hover:!translate-y-0 hover:!scale-100 hover:!shadow-none hover:!bg-transparent",
        ].join(" ")}
      >
        <div className="px-4 py-5 sm:p-6 lg:p-8 xl:p-9">
          <div className="mb-5 sm:mb-6 lg:mb-8">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex shrink-0 items-center justify-center pt-1">
                <CalendarDays className="h-6 w-6 text-zinc-200 sm:h-7 sm:w-7" />
              </div>

              <div className="min-w-0 max-w-3xl">
                <h2 className="text-[1.95rem] font-bold leading-[1.02] tracking-tight text-zinc-100 sm:text-3xl sm:leading-tight lg:text-4xl">
                  Εβδομαδιαία Διαθεσιμότητα
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400 sm:text-base lg:text-lg">
                  Δες το γενικό πρόγραμμα και τις διαθέσιμες ώρες του προπονητή μέσα
                  στην εβδομάδα.
                </p>
              </div>
            </div>
          </div>

          {shouldShowSkeleton ? (
            <AvailabilitySkeleton />
          ) : (
            <div className="space-y-2.5 sm:space-y-3">
              {normalizedRows.map((day) => {
                const hasMainRange = day.available && day.start && day.end
                const hasBreak = day.breakStart && day.breakEnd

                return (
                  <div
                    key={day.id}
                    className="rounded-2xl bg-white/[0.025] px-4 py-3.5 backdrop-blur-[2px] !transition-none !duration-0 !ease-linear !transform-none !animate-none hover:!transform-none hover:!translate-y-0 hover:!scale-100 hover:!shadow-none hover:!bg-white/[0.025] sm:px-5 sm:py-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold leading-tight text-zinc-100 sm:text-lg">
                            {day.label}
                          </h3>

                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-medium sm:text-xs ${
                              day.available
                                ? "bg-white/[0.05] text-zinc-300"
                                : "bg-zinc-900/70 text-zinc-500"
                            }`}
                          >
                            {day.available ? "Ανοιχτό" : "Ρεπό"}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
                          {day.available
                            ? "Διαθέσιμο ωράριο"
                            : "Δεν υπάρχει διαθέσιμο ωράριο"}
                        </p>
                      </div>

                      {hasMainRange ? (
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <span className="rounded-2xl bg-zinc-900/75 px-3.5 py-2 text-sm font-medium text-zinc-100 sm:text-base">
                            {day.start}
                          </span>

                          <span className="text-sm text-zinc-500">έως</span>

                          <span className="rounded-2xl bg-zinc-900/75 px-3.5 py-2 text-sm font-medium text-zinc-100 sm:text-base">
                            {day.end}
                          </span>
                        </div>
                      ) : (
                        <div className="text-sm text-zinc-500 sm:text-right">—</div>
                      )}
                    </div>

                    {hasMainRange && hasBreak && (
                      <div className="mt-3 text-xs text-zinc-400 sm:text-sm">
                        Διάλειμμα:{" "}
                        <span className="text-zinc-300">
                          {day.breakStart} - {day.breakEnd}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </PremiumCard>
    </div>
  )
}