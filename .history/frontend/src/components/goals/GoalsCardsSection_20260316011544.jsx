const GoalCard = memo(function GoalCard({
  goal,
  index,
  setEditingGoal,
  setShowCreateForm,
  onDelete,
  onComplete,
  getProgressStatus,
  getStatusLabel,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [playCompleteFx, setPlayCompleteFx] = useState(false);
  const menuRef = useRef(null);
  const prevCompletedRef = useRef(false);

  const progressRaw =
    goal.target_value && goal.target_value > 0
      ? (goal.progress_value / goal.target_value) * 100
      : 0;

  const progress = clamp(progressRaw, 0, 100);

  const derivedStatus =
    goal.status === "completed"
      ? "completed"
      : getProgressStatus(goal.progress_value, goal.target_value);

  const isCompleted = derivedStatus === "completed";
  const theme = getGaugeTheme(progress, isCompleted);

  const dueDateText = useMemo(() => {
    if (!goal.due_date) return null;
    return new Date(goal.due_date).toLocaleDateString("el-GR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, [goal.due_date]);

  const description =
    goal.description?.trim() ||
    "Παρακολούθησε την πορεία σου και κράτα τον στόχο σου σε συνεχή εξέλιξη.";

  useEffect(() => {
    if (!showMenu) return;

    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    }

    function handleEscape(e) {
      if (e.key === "Escape") {
        setShowMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showMenu]);

  useEffect(() => {
    if (isCompleted && !prevCompletedRef.current) {
      setPlayCompleteFx(true);
      const timer = setTimeout(() => setPlayCompleteFx(false), 1200);
      prevCompletedRef.current = true;
      return () => clearTimeout(timer);
    }

    prevCompletedRef.current = isCompleted;
  }, [isCompleted]);

  const handleEdit = () => {
    setShowMenu(false);
    setEditingGoal(goal);
    setShowCreateForm(true);
  };

  const handleDelete = () => {
    setShowMenu(false);
    onDelete(goal.id);
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20, scale: 0.99 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isCompleted ? 1.01 : 1,
        boxShadow: isCompleted
          ? "0 0 0 1px rgba(34,197,94,0.14), 0 18px 50px rgba(34,197,94,0.14)"
          : "0 0 0 1px rgba(0,0,0,0), 0 10px 30px rgba(0,0,0,0)",
      }}
      exit={{ opacity: 0, y: -14, scale: 0.985 }}
      transition={{
        delay: index * 0.04,
        duration: 0.34,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -2 }}
      className={cn(
        "group relative h-full overflow-hidden rounded-[1.4rem] border p-4 sm:rounded-[1.75rem] sm:p-6",
        isCompleted
          ? "border-emerald-500/35 bg-gradient-to-br from-emerald-950/30 via-zinc-900 to-zinc-900"
          : "border-zinc-700 bg-zinc-900"
      )}
    >
      {isCompleted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.16),transparent_45%)]"
        />
      )}

      <AnimatePresence>
        {playCompleteFx ? (
          <>
            <motion.div
              initial={{ opacity: 0.85, scale: 0.96 }}
              animate={{ opacity: 0, scale: 1.03 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.85, ease: "easeOut" }}
              className="pointer-events-none absolute inset-0 rounded-[inherit] border border-emerald-400/60"
            />
            <motion.div
              initial={{ opacity: 0.45, scale: 0.88 }}
              animate={{ opacity: 0, scale: 1.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.05, ease: "easeOut" }}
              className="pointer-events-none absolute inset-[-10%] rounded-[inherit] bg-[radial-gradient(circle,rgba(74,222,128,0.22)_0%,rgba(74,222,128,0.10)_28%,transparent_65%)]"
            />
          </>
        ) : null}
      </AnimatePresence>

      <div className="relative flex h-full flex-col">
        {/* top */}
        <div className="mb-4 flex items-start justify-between gap-3 sm:mb-5">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <GoalIconRenderer
                category={goal.category}
                icon={goal.icon}
                className={cn(
                  "h-[18px] w-[18px] sm:h-5 sm:w-5",
                  isCompleted ? "text-emerald-200" : "text-zinc-200"
                )}
              />

              <h3
                className={cn(
                  "truncate text-[1rem] font-bold leading-tight sm:text-[1.45rem]",
                  isCompleted ? "text-emerald-50" : "text-white"
                )}
                title={goal.title}
              >
                {goal.title}
              </h3>
            </div>

            <GoalStatusPill
              label={getStatusLabel(derivedStatus)}
              theme={theme}
            />
          </div>

          {/* 3-dots menu on both mobile + desktop */}
          <div ref={menuRef} className="relative shrink-0">
            <motion.button
              whileTap={{ scale: 0.94 }}
              whileHover={{ scale: 1.03 }}
              onClick={() => setShowMenu((prev) => !prev)}
              className={cn(
                "p-1 transition",
                isCompleted
                  ? "text-emerald-200/80 hover:text-emerald-100"
                  : "text-zinc-400 hover:text-white"
              )}
              aria-label="Open goal settings"
              aria-expanded={showMenu}
            >
              <MoreVertical className="h-5 w-5" />
            </motion.button>

            <AnimatePresence>
              {showMenu ? (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 top-[calc(100%+0.5rem)] z-30 min-w-[148px] overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
                >
                  <button
                    onClick={handleEdit}
                    className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
                  >
                    <Edit3 className="h-4 w-4" />
                    Επεξεργασία
                  </button>

                  <div className="h-px bg-zinc-800" />

                  <button
                    onClick={handleDelete}
                    className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left text-sm font-medium text-red-300 transition hover:bg-zinc-800"
                  >
                    <Trash2 className="h-4 w-4" />
                    Διαγραφή
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        {/* gauge */}
        <div className="mb-4 sm:mb-5">
          <SemiGauge
            progress={progress}
            current={Number(goal.progress_value ?? 0)}
            target={Number(goal.target_value ?? 0)}
            gaugeId={goal.id ?? `goal-${index}`}
            delay={index * 0.05}
            theme={theme}
            subLabel={
              goal.unit
                ? `${Math.round(progress)}% • ${goal.unit}`
                : `${Math.round(progress)}% ολοκληρωμένο`
            }
          />
        </div>

        {/* description */}
        <div className="mb-4 px-0.5 text-center sm:mb-5 sm:px-1">
          <p
            className={cn(
              "mx-auto max-w-[32ch] text-[13px] leading-6 sm:max-w-[34ch] sm:text-[15px] sm:leading-7",
              isCompleted ? "text-emerald-100/75" : "text-zinc-400"
            )}
          >
            {description}
          </p>
        </div>

        {/* meta */}
        <div className="mb-4 flex flex-wrap items-center justify-center gap-2 sm:mb-5 sm:gap-2.5">
          {goal.category === "custom" && (
            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-medium sm:px-3 sm:text-[11px]",
                isCompleted
                  ? "border border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                  : "border border-zinc-600 bg-zinc-800 text-zinc-300"
              )}
            >
              <Tag className="h-3.5 w-3.5" />
              {goal.custom_category || "Προσαρμοσμένη"}
            </div>
          )}

          {goal.unit && (
            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-medium sm:px-3 sm:text-[11px]",
                isCompleted
                  ? "border border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                  : "border border-zinc-600 bg-zinc-800 text-zinc-300"
              )}
            >
              <ChevronRight className="h-3.5 w-3.5 opacity-70" />
              Μονάδα: {goal.unit}
            </div>
          )}
        </div>

        {/* due date full bleed */}
        {goal.due_date && (
          <div
            className={cn(
              "-mx-4 mb-4 px-4 py-3 sm:-mx-6 sm:mb-5 sm:px-6",
              isCompleted && "bg-emerald-500/5"
            )}
          >
            <div
              className={cn(
                "flex items-center gap-3",
                isCompleted ? "text-emerald-100" : "text-zinc-300"
              )}
            >
              <CalendarIcon
                className={cn(
                  "h-4.5 w-4.5 shrink-0 sm:h-5 sm:w-5",
                  isCompleted ? "text-emerald-300" : "text-zinc-400"
                )}
              />

              <div className="min-w-0">
                <p
                  className={cn(
                    "text-[10px] uppercase tracking-[0.16em] sm:text-[11px]",
                    isCompleted ? "text-emerald-300/75" : "text-zinc-500"
                  )}
                >
                  Προθεσμία
                </p>
                <p
                  className={cn(
                    "text-sm font-medium sm:text-base",
                    isCompleted ? "text-emerald-50" : "text-white"
                  )}
                >
                  {dueDateText}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* footer action */}
        <div className="mt-auto">
          {!isCompleted ? (
            <motion.button
              whileTap={{ scale: 0.985 }}
              whileHover={{ scale: 1.005 }}
              onClick={() => onComplete(goal.id)}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-[999px] border px-4 py-3.5 text-sm font-semibold transition sm:px-5 sm:py-4 sm:text-base",
                "border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
              )}
            >
              <CheckCircle className="h-4 w-4" />
              Μαρκάρισε ως ολοκληρωμένο
            </motion.button>
          ) : (
            <motion.div
              initial={{ scale: 0.96, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex w-full items-center justify-center gap-2 rounded-[999px] border border-emerald-500/30 bg-emerald-500/12 px-4 py-3.5 text-sm font-semibold text-emerald-100 sm:px-5 sm:py-4 sm:text-base"
            >
              <CheckCircle className="h-4 w-4" />
              Ο στόχος ολοκληρώθηκε
            </motion.div>
          )}
        </div>
      </div>
    </motion.article>
  );
});