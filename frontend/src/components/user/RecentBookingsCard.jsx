"use client";

import React, { useMemo } from "react";
import { LazyMotion, domAnimation, m } from "framer-motion";
import {
  CalendarDays,
  Clock3,
  ArrowRight,
  CalendarCheck2,
} from "lucide-react";

export default function RecentBookingsCard({
  bookings = [],
  totalBookings = 0,
  onNavigate,
}) {
  const visibleBookings = useMemo(() => {
    if (!Array.isArray(bookings)) return [];
    return bookings.slice(0, 5);
  }, [bookings]);

  const hasBookings = visibleBookings.length > 0;
  const shownCount = visibleBookings.length;
  const allCount = totalBookings || bookings.length || 0;

  const go = (path) => {
    if (typeof onNavigate === "function") {
      onNavigate(path);
      return;
    }

    if (typeof window !== "undefined") {
      window.location.assign(path);
    }
  };

  const goToBookings = () => {
    go("/user/bookings");
  };

  const goToServices = () => {
    go("/services");
  };

  const getBookingId = (booking) =>
    booking?.id ?? booking?.booking_id ?? booking?.uid ?? booking?.pk ?? null;

  const handleBookingClick = (booking) => {
    const bookingId = getBookingId(booking);

    if (!bookingId) {
      goToBookings();
      return;
    }

    go(`/user/bookings?booking=${encodeURIComponent(bookingId)}`);
  };

  const handleKeyDown = (e, booking) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleBookingClick(booking);
    }
  };

  const getStatusLabel = (status = "") => {
    const s = String(status).toLowerCase();

    if (s === "confirmed" || s === "accepted") return "Επιβεβαιωμένη";
    if (s === "pending") return "Σε αναμονή";
    if (s === "completed") return "Ολοκληρώθηκε";
    if (s === "declined") return "Απορρίφθηκε";
    if (s === "cancelled" || s === "canceled") return "Ακυρώθηκε";

    return "Ακυρώθηκε";
  };

  const getStatusClasses = (status = "") => {
    const s = String(status).toLowerCase();

    if (s === "confirmed" || s === "accepted") {
      return "border border-emerald-400/25 bg-emerald-500/14 text-emerald-300";
    }

    if (s === "pending") {
      return "border border-yellow-400/25 bg-yellow-500/14 text-yellow-300";
    }

    if (s === "completed") {
      return "border border-sky-400/25 bg-sky-500/14 text-sky-300";
    }

    if (s === "declined" || s === "cancelled" || s === "canceled") {
      return "border border-red-400/25 bg-red-500/14 text-red-300";
    }

    return "border border-white/10 bg-white/10 text-white/70";
  };

  return (
    <LazyMotion features={domAnimation}>
      <div className="relative -mx-4 w-[calc(100%+2rem)] overflow-hidden bg-transparent sm:mx-0 sm:w-full sm:bg-black sm:rounded-[30px] sm:border sm:border-white/10">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.02),transparent_28%,transparent_72%,rgba(255,255,255,0.015))]" />

        <div className="relative px-4 py-5 sm:p-6 lg:p-7">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-[24px] font-semibold tracking-[-0.03em] text-white sm:text-[28px]">
                Πρόσφατες Κρατήσεις
              </h3>
              <p className="mt-1 text-sm text-white/50">
                Δες γρήγορα τις πιο πρόσφατες συνεδρίες σου.
              </p>
            </div>

            <div className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white sm:text-white/75">
              {allCount} συνολικά
            </div>
          </div>

          {hasBookings ? (
            <>
              <div className="space-y-3">
                {visibleBookings.map((booking, index) => (
                  <m.div
                    key={getBookingId(booking) || index}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group cursor-pointer rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.05]"
                    onClick={() => handleBookingClick(booking)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => handleKeyDown(e, booking)}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                            <CalendarCheck2 className="h-5 w-5 text-white/80" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className="truncate text-base font-semibold text-white sm:text-[17px]">
                              {booking?.name || "Συνεδρία"}
                            </h4>

                            <p className="mt-1 truncate text-sm text-white/52">
                              με{" "}
                              {booking?.trainer ||
                                booking?.trainer_name ||
                                "Trainer"}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs text-white/75">
                                <CalendarDays className="h-3.5 w-3.5" />
                                <span>{booking?.date || "—"}</span>
                              </div>

                              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs text-white/75">
                                <Clock3 className="h-3.5 w-3.5" />
                                <span>{booking?.time || "—"}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 lg:justify-end">
                        <div
                          className={`inline-flex w-fit items-center rounded-full px-3 py-1.5 text-xs font-medium ${getStatusClasses(
                            booking?.status || ""
                          )}`}
                        >
                          {getStatusLabel(booking?.status || "")}
                        </div>
                      </div>
                    </div>
                  </m.div>
                ))}
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-white/45">
                  Εμφανίζονται {shownCount} από έως 5 κρατήσεις
                </p>

<m.button
  onClick={goToBookings}
  whileHover={{ scale: 1.03 }}
  whileTap={{ scale: 0.97 }}
  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black sm:bg-[#0c0f14] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(0,0,0,0.45)] transition hover:bg-[#12161c]"
>
  <ArrowRight className="h-3.5 w-3.5 rotate-[-45deg]" />
  Προβολή όλων
</m.button>
              </div>
            </>
          ) : (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.025] px-6 py-10 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                <CalendarDays className="h-7 w-7 text-white/70" />
              </div>

              <h4 className="text-xl font-semibold text-white">
                Δεν υπάρχουν κρατήσεις ακόμα
              </h4>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/50">
                Μόλις κλείσεις την πρώτη σου συνεδρία, θα εμφανιστεί εδώ για να
                έχεις άμεση εικόνα.
              </p>

              <div className="mt-6">
                <m.button
                  onClick={goToServices}
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  Κάνε κράτηση
                  <ArrowRight className="h-4 w-4" />
                </m.button>
              </div>
            </div>
          )}
        </div>
      </div>
    </LazyMotion>
  );
}