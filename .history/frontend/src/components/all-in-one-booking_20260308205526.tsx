<div className="px-4 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-8">
  <AnimatePresence mode="wait" initial={false}>
    {!hasDateSelection ? (
      <motion.section
        key="step-1-calendar"
        initial={{ opacity: 0, scale: 0.992 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.992 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="rounded-3xl border border-white/10 bg-white/[0.02] p-4 sm:p-5"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Βήμα 1
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {months[displayMonth]}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">{displayYear}</p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              disabled={!canPrevMonth}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
                "disabled:pointer-events-none disabled:opacity-30",
                canPrevMonth
                  ? "bg-white/5 text-white hover:bg-white/10 hover:scale-105 active:scale-95"
                  : "text-zinc-600"
              )}
              aria-label="Προηγούμενος μήνας"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => shiftMonth(1)}
              disabled={!canNextMonth}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
                "disabled:pointer-events-none disabled:opacity-30",
                canNextMonth
                  ? "bg-white/5 text-white hover:bg-white/10 hover:scale-105 active:scale-95"
                  : "text-zinc-600"
              )}
              aria-label="Επόμενος μήνας"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-7 gap-1">
          {weekDays.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-[11px] font-semibold tracking-wider text-zinc-600"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, idx) => {
            const { iso, inRange, hasSlots } = dayMeta(day);
            const isSelected = selectedDateISO === iso;
            const isToday = iso === localDateISO(0);

            return (
              <button
                type="button"
                key={idx}
                onClick={() => {
                  if (!iso || !inRange || !hasSlots) return;
                  setSelectedDateISO(iso);
                  setSelectedKey(null);
                  setNotes("");
                  setSelectedPeriod("all");
                }}
                disabled={!day || !inRange || !hasSlots || loading}
                className={cn(
                  "relative aspect-square w-full rounded-2xl p-0 text-sm transition-all duration-300 ease-out lg:text-base",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
                  "disabled:pointer-events-none",
                  !day && "invisible",
                  isSelected
                    ? "scale-[1.06] bg-white font-bold text-zinc-900 shadow-xl shadow-white/20"
                    : hasSlots && inRange
                    ? "bg-white/[0.04] font-medium text-white hover:scale-[1.03] hover:bg-white/10 active:scale-95"
                    : isToday
                    ? "text-zinc-500 ring-1 ring-zinc-800"
                    : "text-zinc-700"
                )}
                aria-pressed={isSelected}
                aria-label={iso ? (hasSlots ? fmtDate(iso) : "Χωρίς διαθέσιμα") : ""}
              >
                {day}
                {hasSlots && inRange && !isSelected && (
                  <span className="absolute bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-emerald-400" />
                )}
              </button>
            );
          })}
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-3 pt-8 text-zinc-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-400" />
            <span className="text-sm">Φόρτωση...</span>
          </div>
        )}

        {!loading && !hasDateSelection && (
          <div className="mt-6 text-center">
            <p className="text-sm leading-relaxed text-zinc-500">
              Επίλεξε ημερομηνία με{" "}
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-zinc-400">διαθεσιμότητα</span>
              </span>
            </p>
          </div>
        )}
      </motion.section>
    ) : !hasSlotSelection ? (
      <motion.section
        key="step-2-time"
        initial={{ opacity: 0, scale: 0.992 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.992 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="rounded-3xl border border-white/10 bg-white/[0.02] p-4 sm:p-5"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Βήμα 2
            </p>
            <h3 className="mt-2 text-xl font-bold text-white sm:text-2xl">
              Επίλεξε ώρα
            </h3>
            <p className="mt-1 truncate text-sm text-zinc-400">
              {fmtDate(selectedDateISO)}
            </p>
          </div>

          <button
            type="button"
            onClick={goBackOneStep}
            className="rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:border-white/20 hover:text-white"
          >
            Πίσω
          </button>
        </div>

        <div className="mb-5 flex items-center gap-4 rounded-2xl border border-emerald-500/15 bg-emerald-500/10 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm text-emerald-300/80">Επιλέχθηκε ημερομηνία</p>
            <p className="font-bold text-white">{fmtDateShort(selectedDateISO)}</p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 lg:flex lg:flex-wrap">
          {[
            { key: "all" as const, label: "Όλες", icon: null, count: periodCounts.all },
            { key: "morning" as const, label: "Πρωί", icon: Sun, count: periodCounts.morning },
            { key: "afternoon" as const, label: "Απόγευμα", icon: Sunset, count: periodCounts.afternoon },
            { key: "night" as const, label: "Βράδυ", icon: Moon, count: periodCounts.night },
          ].map(({ key, label, icon: Icon, count }) => (
            <button
              type="button"
              key={key}
              onClick={() => setSelectedPeriod(key)}
              disabled={count === 0}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 lg:py-2.5",
                "disabled:pointer-events-none disabled:opacity-30",
                selectedPeriod === key
                  ? "bg-white text-zinc-900"
                  : "bg-white/5 text-zinc-300 hover:bg-white/10"
              )}
              aria-pressed={selectedPeriod === key}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {label}
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-xs",
                  selectedPeriod === key
                    ? "bg-zinc-200 text-zinc-600"
                    : "bg-white/10 text-zinc-500"
                )}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        {daySlots.length === 0 ? (
          <div className="flex items-center gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-amber-200">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
            <p className="text-sm">
              Δεν υπάρχουν διαθέσιμα ραντεβού. Δοκίμασε άλλη περίοδο.
            </p>
          </div>
        ) : (
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.18em] text-zinc-500">
              Διαθέσιμες ώρες
            </p>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
              {daySlots.map((slot) => {
                const key = `${slot.date}|${slot.start_time}|${slot.end_time}`;
                const selected = selectedKey === key;

                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setSelectedKey(key)}
                    className={cn(
                      "group relative flex h-16 flex-col items-center justify-center rounded-2xl transition-all duration-300 ease-out lg:h-20",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
                      selected
                        ? "scale-[1.03] bg-white text-zinc-900 shadow-xl shadow-white/20"
                        : "bg-white/[0.03] text-white hover:scale-[1.02] hover:bg-white/[0.08] active:scale-95"
                    )}
                    aria-pressed={selected}
                  >
                    <span className="text-lg font-bold lg:text-xl">
                      {formatSlotLabel(slot.start_time)}
                    </span>
                    <span className="text-xs font-medium text-zinc-500">
                      έως {hhmm(slot.end_time)}
                    </span>

                    {slot.is_online && (
                      <span className="absolute right-2.5 top-2.5">
                        <Wifi
                          className={cn(
                            "h-3.5 w-3.5 transition-colors",
                            selected ? "text-zinc-400" : "text-zinc-600"
                          )}
                        />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </motion.section>
    ) : (
      <motion.section
        key="step-3-summary"
        initial={{ opacity: 0, scale: 0.992 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.992 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="space-y-6"
      >
        <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Βήμα 3
              </p>
              <h3 className="mt-2 text-lg font-semibold text-white">
                Σημείωση <span className="font-normal text-zinc-500">(προαιρετική)</span>
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                Πληροφορίες που θέλεις να γνωρίζει ο προπονητής.
              </p>
            </div>

            <button
              type="button"
              onClick={goBackOneStep}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:border-white/20 hover:text-white"
            >
              Πίσω
            </button>
          </div>

          <textarea
            placeholder="π.χ. Στόχοι, τραυματισμοί, προτιμήσεις..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[120px] w-full resize-none rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-4 text-white placeholder:text-zinc-600 transition-all hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          />
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-4 rounded-2xl border border-emerald-500/15 bg-emerald-500/10 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-emerald-300/80">Επιλεγμένο ραντεβού</p>
              <p className="font-bold text-white">
                {fmtDateShort(selectedSlot.date)} · {hhmm(selectedSlot.start_time)} -{" "}
                {hhmm(selectedSlot.end_time)}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="text-xs text-zinc-500">Ημερομηνία</div>
              <div className="mt-1 font-semibold text-white">
                {fmtDate(selectedSlot.date)}
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="text-xs text-zinc-500">Ώρα</div>
              <div className="mt-1 font-semibold text-white">
                {hhmm(selectedSlot.start_time)} - {hhmm(selectedSlot.end_time)}
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 sm:col-span-2 xl:col-span-1">
              <div className="text-xs text-zinc-500">Τύπος συνεδρίας</div>
              <div className="mt-1 font-semibold text-white">
                {selectedSlot.is_online ? "Online" : "Δια ζώσης"}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <ActionButton
              onClick={handleContinue}
              disabled={!selectedKey || submitting}
              variant="primary"
              className="h-14 text-base lg:h-16 lg:text-lg"
            >
              {submitting ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-900" />
                  <span>Γίνεται κράτηση...</span>
                </>
              ) : (
                <>
                  <CalendarPlus className="h-5 w-5" />
                  <span>Ολοκλήρωση κράτησης</span>
                </>
              )}
            </ActionButton>
          </div>
        </section>
      </motion.section>
    )}
  </AnimatePresence>
</div>