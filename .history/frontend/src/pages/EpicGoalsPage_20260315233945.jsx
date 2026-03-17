"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  Trophy,
  Flame,
  Star,
  Plus,
  Edit3,
  Trash2,
  Calendar as CalendarIcon,
  TrendingUp,
  Zap,
  Activity,
  CheckCircle,
  ArrowLeft,
  Users,
  Heart,
  BookOpen,
  Briefcase,
  AlertCircle,
  Tag,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";
import UserMenu from "../components/UserMenu";
import GoalFormModal from "../components/goals/GoalFormModal.jsx";

/* ---------- BG ---------- */
const ZincBackground = () => (
  <>
    <style>{`
      @keyframes zinc-pulse {
        0%, 100% { opacity: 0.06; transform: scale(1); }
        50% { opacity: 0.15; transform: scale(1.05); }
      }
      @supports (height: 100dvh) {
        :root { --vh-unit: 100dvh; }
      }
      @supports not (height: 100dvh) {
        :root { --vh-unit: 100svh; }
      }
      @keyframes spin-reverse {
        from { transform: rotate(360deg); }
        to { transform: rotate(0deg); }
      }
      .animate-spin-reverse {
        animation: spin-reverse 1s linear infinite;
      }
    `}</style>
    <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-br from-black via-zinc-900 to-black" />
    <div className="absolute left-1/4 -top-40 w-56 sm:w-96 aspect-square rounded-full bg-gradient-to-r from-zinc-600/10 to-gray-700/10 blur-2xl animate-[zinc-pulse_18s_ease-in-out_infinite]" />
    <div className="absolute -right-40 bottom-10 w-[18rem] sm:w-[30rem] aspect-square rounded-full bg-gradient-to-r from-gray-700/10 to-zinc-800/10 blur-2xl animate-[zinc-pulse_22s_ease-in-out_infinite_reverse]" />
  </>
);

/* ---- Toast ---- */
function Toast({ toast, onClose }) {
  if (!toast) return null;
  const isError = toast.type === "error";
  const Icon = isError ? AlertCircle : CheckCircle;

  return (
    <div className="fixed top-4 right-4 z-[1000] max-w-[90vw] sm:max-w-sm">
      <motion.div
        key={toast.id}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        className={`flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-lg text-sm ${
          isError
            ? "bg-red-500/10 border-red-500/30 text-red-200"
            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
        }`}
      >
        <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold">{toast.title}</p>
        </div>
        <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100 transition">
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  );
}

/* ---- Icon helper ---- */
function IconRenderer({ category, icon, className }) {
  const defaults = {
    fitness: Activity,
    consistency: Flame,
    skills: Star,
    strength: Trophy,
    health: Heart,
    learning: BookOpen,
    career: Briefcase,
    social: Users,
  };

  if (icon && /^https?:\/\//i.test(icon)) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-md overflow-hidden bg-white/5">
        <img src={icon} alt="icon" className="w-full h-full object-cover" />
      </div>
    );
  }

  const looksLikeEmoji = icon && !/^https?:\/\//i.test(icon) && icon.length <= 6;
  if (looksLikeEmoji) {
    return <span className={`text-2xl leading-none ${className || ""}`}>{icon}</span>;
  }

  const FallbackIcon = defaults[category || ""] || Target;
  return <FallbackIcon className={className || "w-8 h-8"} />;
}

/* ---------- Main ---------- */
export default function EpicGoalsPage() {
  const navigate = useNavigate();
  const { session, profileLoaded } = useAuth();
  const uid = session?.user?.id;

  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  const [toast, setToast] = useState(null);

  const showToast = useCallback((t) => {
    const id = Date.now();
    setToast({ id, ...t });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const getErrorMessage = (err) =>
    err?.message || err?.error_description || "Κάτι πήγε στραβά.";

  const fetchGoals = useCallback(async () => {
    if (!uid) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (err) {
      console.error(err);
      showToast({ type: "error", title: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [uid, showToast]);

  useEffect(() => {
    if (!profileLoaded) return;
    if (!uid) {
      setLoading(false);
      return;
    }
    fetchGoals();
  }, [profileLoaded, uid, fetchGoals]);

  const getProgressStatus = (current, target) => {
    if (!target || target <= 0) return "on-track";
    const percentage = (current / target) * 100;
    if (percentage >= 100) return "completed";
    if (percentage >= 75) return "ahead";
    if (percentage >= 50) return "on-track";
    return "behind";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "text-emerald-300 bg-emerald-400/10 border-emerald-400/20";
      case "ahead":
        return "text-zinc-200 bg-zinc-200/10 border-zinc-500/20";
      case "on-track":
        return "text-zinc-300 bg-zinc-300/10 border-zinc-500/20";
      case "behind":
        return "text-red-300 bg-red-400/10 border-red-400/20";
      default:
        return "text-zinc-300 bg-zinc-300/10 border-zinc-500/20";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "completed":
        return "Ολοκληρώθηκε";
      case "ahead":
        return "Μπροστά";
      case "on-track":
        return "Στο στόχο";
      case "behind":
        return "Πίσω";
      default:
        return "Ενεργός";
    }
  };

  const handleGoBack = () => navigate("/user#dashboard");

  const activeGoalsCount = useMemo(
    () => goals.filter((g) => g.status !== "completed").length,
    [goals]
  );

  const completedGoalsCount = useMemo(
    () => goals.filter((g) => g.status === "completed").length,
    [goals]
  );

  const avgProgress = useMemo(() => {
    if (!goals.length) return 0;

    const pct =
      goals.reduce((acc, g) => {
        if (!g.target_value || g.target_value <= 0) return acc;
        return acc + (g.progress_value / g.target_value) * 100;
      }, 0) / goals.length;

    return Math.round(pct || 0);
  }, [goals]);

  const aheadCount = useMemo(
    () =>
      goals.filter((g) => {
        const s =
          g.status === "completed"
            ? "completed"
            : getProgressStatus(g.progress_value, g.target_value);
        return s === "ahead";
      }).length,
    [goals]
  );

  /* ---------- CRUD ---------- */
  const onCreate = async (payload) => {
    const row = { ...payload, user_id: uid };
    const { data, error } = await supabase
      .from("goals")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      showToast({ type: "error", title: "Αποτυχία δημιουργίας στόχου" });
      throw error;
    }

    setGoals((prev) => [data, ...prev]);
    showToast({ type: "success", title: "Ο στόχος δημιουργήθηκε" });
  };

  const onUpdate = async (id, patch) => {
    const { data, error } = await supabase
      .from("goals")
      .update(patch)
      .eq("id", id)
      .eq("user_id", uid)
      .select("*")
      .single();

    if (error) {
      showToast({ type: "error", title: "Αποτυχία ενημέρωσης στόχου" });
      throw error;
    }

    setGoals((prev) => prev.map((g) => (g.id === id ? data : g)));
    showToast({ type: "success", title: "Ο στόχος ενημερώθηκε" });
  };

  const onDelete = async (id) => {
    const { error } = await supabase
      .from("goals")
      .delete()
      .eq("id", id)
      .eq("user_id", uid);

    if (error) {
      showToast({ type: "error", title: "Αποτυχία διαγραφής στόχου" });
      return;
    }

    setGoals((prev) => prev.filter((g) => g.id !== id));
    showToast({ type: "success", title: "Ο στόχος διαγράφηκε" });
  };

  const onComplete = async (id) => {
    const goal = goals.find((g) => g.id === id);

    const patch = {
      status: "completed",
      progress_value: goal?.target_value ?? goal?.progress_value ?? 0,
      completed_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("goals")
      .update(patch)
      .eq("id", id)
      .eq("user_id", uid)
      .select("*")
      .single();

    if (error) {
      showToast({ type: "error", title: "Αποτυχία μαρκαρίσματος" });
      return;
    }

    setGoals((prev) => prev.map((g) => (g.id === id ? data : g)));
    showToast({ type: "success", title: "Συγχαρητήρια!" });
  };

  /* ---------- Guards & Loading ---------- */
  if (!profileLoaded || loading) {
    return (
      <>
        <UserMenu />
        <div className="min-h-[var(--vh-unit)] bg-gradient-to-br from-black via-zinc-900 to-black relative">
          <ZincBackground />
          <div className="flex items-center justify-center min-h-[var(--vh-unit)] relative z-10 px-4">
            <Toast toast={toast} onClose={() => setToast(null)} />
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-14 h-14 sm:w-20 sm:h-20 border-4 border-zinc-700/30 border-t-zinc-500 rounded-full animate-spin" />
                <div className="absolute inset-3 border-2 border-zinc-800/30 border-t-zinc-600 rounded-full animate-spin-reverse" />
              </div>
              <div className="text-center px-2">
                <p className="text-white text-lg sm:text-xl font-bold">Φόρτωση Στόχων</p>
                <p className="text-zinc-400 text-sm">Προετοιμασία του ταξιδιού σου...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!uid) {
    return (
      <>
        <UserMenu />
        <div className="min-h-[var(--vh-unit)] bg-gradient-to-br from-black via-zinc-900 to-black relative text-white flex items-center justify-center px-4">
          <ZincBackground />
          <p className="text-center text-zinc-400">
            Δεν υπάρχει ενεργός χρήστης. Συνδέσου για να δεις/διαχειριστείς στόχους.
          </p>
        </div>
      </>
    );
  }

  /* ---------- UI ---------- */
  return (
    <div className="relative bg-gradient-to-br from-black via-zinc-900 to-black min-h-screen text-gray-100 overflow-x-hidden">
      <ZincBackground />
      <UserMenu />
      <Toast toast={toast} onClose={() => setToast(null)} />

      <main className="relative z-10 w-full lg:pl-[var(--side-w)]">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-8 pb-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] sm:pb-10">
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative"
          >
            <div className="flex items-center gap-3 sm:gap-6 mb-8">
              <motion.button
                onClick={handleGoBack}
                whileHover={{ scale: 1.1, x: -5 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 sm:p-3 rounded-2xl bg-black/30 hover:bg-black/40 border border-zinc-700/50 hover:border-zinc-600/50 transition-all duration-300"
              >
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-300" />
              </motion.button>

              <div className="min-w-0">
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white mb-2 sm:mb-3 leading-tight">
                  Οι Στόχοι μου
                </h1>
                <p className="text-zinc-400 text-base sm:text-lg lg:text-xl">
                  Το ταξίδι σου προς την κορυφή της απόδοσης
                </p>
              </div>

              <div className="ml-auto sm:hidden">
                <motion.button
                  onClick={() => {
                    setEditingGoal(null);
                    setShowCreateForm(true);
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Νέος Στόχος"
                  className="p-2 rounded-2xl bg-gradient-to-r from-zinc-700 to-zinc-800 text-white border border-zinc-600/40 shadow-md"
                >
                  <Plus className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10">
              <StatCard delay={0.1} icon={Target} value={activeGoalsCount} label="Ενεργοί Στόχοι" />
              <StatCard delay={0.2} icon={CheckCircle} value={completedGoalsCount} label="Ολοκληρωμένοι" />
              <StatCard delay={0.3} icon={TrendingUp} value={`${avgProgress}%`} label="Μέση Πρόοδος" />
              <StatCard delay={0.4} icon={Zap} value={aheadCount} label="Μπροστά στο Στόχο" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="hidden sm:flex justify-center mb-10"
          >
            <motion.button
              onClick={() => {
                setEditingGoal(null);
                setShowCreateForm(true);
              }}
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 text-white text-sm sm:text-base font-semibold rounded-2xl shadow-lg transition-all duration-300"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              Δημιούργησε Νέο Στόχο
            </motion.button>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
            <AnimatePresence>
              {goals.map((goal, index) => {
                const progress =
                  goal.target_value && goal.target_value > 0
                    ? (goal.progress_value / goal.target_value) * 100
                    : 0;

                const derivedStatus =
                  goal.status === "completed"
                    ? "completed"
                    : getProgressStatus(goal.progress_value, goal.target_value);

                const isCompleted = goal.status === "completed";

                return (
                  <motion.div
                    key={goal.id ?? index}
                    initial={{ opacity: 0, y: 30, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -30, scale: 0.9 }}
                    transition={{ delay: index * 0.05, duration: 0.45 }}
                    whileHover={{ y: -2, scale: 1.005 }}
                    className={`relative overflow-hidden rounded-3xl bg-black/40 backdrop-blur-xl border p-6 sm:p-8 ${
                      isCompleted
                        ? "border-emerald-500/20"
                        : "border-zinc-700/50 hover:border-zinc-600/50"
                    } shadow-[0_20px_50px_rgba(0,0,0,0.4)] transition-all duration-500`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-700/10 via-transparent to-transparent" />
                    {isCompleted && <div className="absolute inset-0 bg-emerald-400/5" />}

                    <div className="relative">
                      <div className="flex items-start justify-between mb-4 sm:mb-6">
                        <div
                          className={`p-3 sm:p-4 rounded-2xl border ${
                            isCompleted
                              ? "bg-black/30 border-emerald-500/20"
                              : "bg-black/30 border-zinc-700/40"
                          } flex items-center justify-center`}
                        >
                          <IconRenderer
                            category={goal.category}
                            icon={goal.icon}
                            className={`${
                              isCompleted ? "text-emerald-300" : "text-zinc-300"
                            } w-6 h-6 sm:w-8 sm:h-8`}
                          />
                        </div>

                        <div className="flex gap-1.5 sm:gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              setEditingGoal(goal);
                              setShowCreateForm(true);
                            }}
                            className="p-1.5 sm:p-2 rounded-xl bg-black/30 hover:bg-black/40 border border-zinc-700/50 hover:border-zinc-600/50 transition-all"
                          >
                            <Edit3 className="w-4 h-4 text-zinc-400" />
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => onDelete(goal.id)}
                            className="p-1.5 sm:p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 transition-all"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </motion.button>
                        </div>
                      </div>

                      <div className="mb-4 sm:mb-6">
                        <h3
                          className={`text-lg sm:text-xl font-bold mb-2 ${
                            isCompleted ? "text-emerald-300" : "text-white"
                          } break-words`}
                        >
                          {goal.title}
                        </h3>

                        <p className="text-zinc-400 text-sm leading-relaxed break-words sm:line-clamp-none line-clamp-4">
                          {goal.description}
                        </p>

                        {goal.category === "custom" && (
                          <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-zinc-400 border border-zinc-700/40 rounded-full px-2 py-0.5">
                            <Tag className="w-3 h-3" />
                            {goal.custom_category || "Προσαρμοσμένη"}
                          </div>
                        )}
                      </div>

                      <div className="mb-4 sm:mb-6">
                        <div className="flex justify-between items-center mb-2 sm:mb-3">
                          <span className="text-xs sm:text-sm font-semibold text-zinc-300">
                            Πρόοδος
                          </span>
                          <span
                            className={`text-xs sm:text-sm font-bold ${
                              isCompleted ? "text-emerald-300" : "text-white"
                            }`}
                          >
                            {goal.progress_value ?? 0} / {goal.target_value ?? 0}
                          </span>
                        </div>

                        <div className="relative w-full bg-zinc-800 rounded-full h-2.5 sm:h-3 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(progress, 100)}%` }}
                            transition={{ duration: 1, delay: index * 0.05 }}
                            className={`h-full rounded-full ${
                              isCompleted ? "bg-emerald-500/80" : "bg-zinc-500/70"
                            }`}
                          />
                        </div>

                        <div className="flex justify-between items-center mt-2">
                          <span
                            className={`text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border font-semibold ${getStatusColor(
                              derivedStatus
                            )}`}
                          >
                            {getStatusLabel(derivedStatus)}
                          </span>

                          <span className="text-[10px] sm:text-xs text-zinc-500">
                            {Math.round(progress)}% ολοκληρωμένο
                          </span>
                        </div>
                      </div>

                      {goal.due_date && (
                        <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-zinc-400">
                          <CalendarIcon className="w-4 h-4" />
                          <span>
                            Προθεσμία:{" "}
                            {new Date(goal.due_date).toLocaleDateString("el-GR", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      )}

                      {!isCompleted && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => onComplete(goal.id)}
                          className="mt-3 sm:mt-4 inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-black/30 hover:bg-black/40 border border-zinc-700/50 text-zinc-200 text-xs sm:text-sm font-semibold"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Μαρκάρισε ως ολοκληρωμένο
                        </motion.button>
                      )}

                      {isCompleted && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                          className="hidden sm:flex absolute -top-3 -right-3 w-10 h-10 sm:w-12 sm:h-12 bg-emerald-500 rounded-full items-center justify-center shadow-lg"
                        >
                          <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {goals.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="relative inline-block mb-8">
                <Target className="w-24 h-24 text-zinc-600 mx-auto" />
                <div className="absolute -inset-4 bg-zinc-600/10 rounded-full blur-xl" />
              </div>

              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                Δεν έχεις ακόμα στόχους
              </h3>

              <p className="text-zinc-400 text-base sm:text-lg mb-8 max-w-md mx-auto px-4">
                Πάτα το κουμπί για να δημιουργήσεις τον πρώτο σου!
              </p>

              <motion.button
                onClick={() => {
                  setEditingGoal(null);
                  setShowCreateForm(true);
                }}
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 text-white font-semibold rounded-2xl shadow-lg transition-all duration-300"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                Δημιούργησε Στόχο
              </motion.button>
            </motion.div>
          )}
        </div>

        <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] right-4 left-4 z-[200] sm:hidden">
          <motion.button
            onClick={() => {
              setEditingGoal(null);
              setShowCreateForm(true);
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-zinc-700 to-zinc-800 text-white font-semibold border border-zinc-600/40 shadow-xl"
          >
            <Plus className="w-5 h-5" />
            Νέος Στόχος
          </motion.button>
        </div>
      </main>

      <GoalFormModal
        open={showCreateForm}
        onClose={() => {
          setShowCreateForm(false);
          setEditingGoal(null);
        }}
        initial={editingGoal}
        onSubmit={async (payload) => {
          if (editingGoal) {
            await onUpdate(editingGoal.id, payload);
          } else {
            await onCreate(payload);
          }

          setShowCreateForm(false);
          setEditingGoal(null);
        }}
      />
    </div>
  );
}

/* ---------- Stat card ---------- */
function StatCard({ delay = 0, icon: Icon, value, label }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-black/40 backdrop-blur-xl border border-zinc-700/40 p-4 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
      whileHover={{ y: -2, scale: 1.01 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-700/10 via-transparent to-transparent" />
      <div className="relative">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-zinc-200" />
          <div className="text-xl sm:text-2xl font-bold text-white">{value}</div>
        </div>
        <p className="text-xs sm:text-sm text-zinc-400 font-semibold">{label}</p>
      </div>
    </motion.div>
  );
}