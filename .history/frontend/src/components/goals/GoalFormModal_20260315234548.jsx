"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  Edit3,
  Calendar as CalendarIcon,
  TrendingUp,
  Activity,
  CheckCircle,
  Flame,
  Trophy,
  Brain,
  Sparkles,
  Clock,
  Flag,
  X,
  Save,
  Users,
  Heart,
  BookOpen,
  Briefcase,
  AlertCircle,
  Tag,
} from "lucide-react";

export default function GoalFormModal({ open, onClose, initial, onSubmit }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "fitness",
    custom_category: "",
    icon: "",
    target_value: 0,
    progress_value: 0,
    unit: null,
    due_date: "",
    status: "not_started",
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (initial) {
      setForm({
        title: initial.title ?? "",
        description: initial.description ?? "",
        category: initial.category ?? "fitness",
        custom_category: initial.custom_category ?? "",
        icon: initial.icon ?? "",
        target_value: initial.target_value ?? 0,
        progress_value: initial.progress_value ?? 0,
        unit: initial.unit ?? null,
        due_date: initial.due_date ?? "",
        status: initial.status ?? "not_started",
      });
    } else {
      setForm({
        title: "",
        description: "",
        category: "fitness",
        custom_category: "",
        icon: "",
        target_value: 0,
        progress_value: 0,
        unit: null,
        due_date: "",
        status: "not_started",
      });
    }

    setErrorMsg(null);
    setSaving(false);
  }, [initial, open]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      const payload = {
        ...form,
        target_value: Number(form.target_value) || 0,
        progress_value: Number(form.progress_value) || 0,
        due_date: form.due_date || null,
      };

      if (form.category === "custom") {
        if (!form.custom_category.trim()) {
          setErrorMsg("Συμπλήρωσε το όνομα της προσαρμοσμένης κατηγορίας.");
          setSaving(false);
          return;
        }

        if (!form.icon.trim()) {
          setErrorMsg("Συμπλήρωσε ένα custom icon (emoji ή URL εικόνας).");
          setSaving(false);
          return;
        }
      } else {
        payload.custom_category = null;
        payload.icon = null;
      }

      await onSubmit(payload);
    } catch (err) {
      const message =
        err?.message ||
        err?.response?.data?.message ||
        "Η αποθήκευση απέτυχε. Προσπάθησε ξανά.";
      setErrorMsg(message);
      setSaving(false);
      return;
    }

    setSaving(false);
  };

  const setField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const categoryOptions = [
    { value: "fitness", label: "Fitness", icon: Target, color: "text-blue-400" },
    { value: "consistency", label: "Συνέπεια", icon: Flame, color: "text-orange-400" },
    { value: "skills", label: "Δεξιότητες", icon: Brain, color: "text-purple-400" },
    { value: "strength", label: "Δύναμη", icon: Trophy, color: "text-yellow-400" },
    { value: "health", label: "Υγεία", icon: Heart, color: "text-red-400" },
    { value: "learning", label: "Μάθηση", icon: BookOpen, color: "text-green-400" },
    { value: "career", label: "Καριέρα", icon: Briefcase, color: "text-indigo-400" },
    { value: "social", label: "Κοινωνικά", icon: Users, color: "text-pink-400" },
    { value: "custom", label: "Custom (δική σου)", icon: Tag, color: "text-teal-400" },
  ];

  const statusOptions = [
    { value: "not_started", label: "Δεν ξεκίνησε", icon: Clock, color: "text-gray-400" },
    { value: "in_progress", label: "Σε εξέλιξη", icon: Activity, color: "text-blue-400" },
    { value: "completed", label: "Ολοκληρώθηκε", icon: CheckCircle, color: "text-green-400" },
  ];

  const selectedCategory = categoryOptions.find((cat) => cat.value === form.category);
  const selectedStatus = statusOptions.find((stat) => stat.value === form.status);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md"
          onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
        >
          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, y: 20, scale: 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 1 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full h-[100svh] supports-[height:100dvh]:h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-[480px] md:max-w-[520px] bg-gradient-to-br from-black/80 via-zinc-900/90 to-black/80 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl border border-zinc-700/50 shadow-[0_25px_60px_rgba(0,0,0,0.5)] overflow-y-auto"
          >
            <div className="sm:hidden sticky top-0 z-20 flex justify-center pt-3">
              <div className="h-1.5 w-12 rounded-full bg-zinc-600/40" />
            </div>

            <div className="sticky top-0 z-10 bg-gradient-to-r from-zinc-800/70 to-zinc-700/70 p-4 sm:p-6 border-b border-zinc-700/50">
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3 sm:gap-4">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="p-2 sm:p-3 rounded-2xl bg-gradient-to-br from-zinc-700 to-zinc-800 border border-zinc-600/50"
                  >
                    <Target className="w-6 h-6 sm:w-7 sm:h-7 text-zinc-200" />
                  </motion.div>

                  <div className="min-w-0">
                    <h3 className="text-lg sm:text-2xl font-bold text-white">
                      {initial ? "Επεξεργασία Στόχου" : "Νέος Στόχος"}
                    </h3>
                    <p className="text-zinc-400 text-xs sm:text-sm truncate">
                      {initial ? "Ενημέρωσε τον στόχο σου" : "Δημιούργησε έναν νέο στόχο"}
                    </p>
                  </div>
                </div>

                <motion.button
                  type="button"
                  disabled={saving}
                  onClick={onClose}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-xl bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-600/50 text-zinc-400 hover:text-white transition-all disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              {errorMsg && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <LabeledInput
                label="Τίτλος Στόχου"
                icon={<Sparkles className="w-4 h-4 text-blue-400" />}
                placeholder="π.χ. Μηνιαίες Προπονήσεις"
                value={form.title}
                onChange={setField("title")}
                required
              />

              <LabeledTextarea
                label="Περιγραφή"
                icon={<Edit3 className="w-4 h-4 text-purple-400" />}
                placeholder="Περίγραψε τον στόχο σου..."
                value={form.description}
                onChange={setField("description")}
                rows={3}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectField
                  label="Κατηγορία"
                  color={selectedCategory?.color}
                  value={form.category}
                  onChange={setField("category")}
                  icon={<Sparkles className="w-4 h-4 text-zinc-400" />}
                  options={categoryOptions}
                />

                <SelectField
                  label="Κατάσταση"
                  color={selectedStatus?.color}
                  value={form.status}
                  onChange={setField("status")}
                  icon={<Flag className="w-4 h-4 text-zinc-400" />}
                  options={statusOptions}
                />
              </div>

              {form.category === "custom" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-zinc-700/40 bg-black/30 p-4 sm:p-5 space-y-4"
                >
                  <h4 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-teal-400" />
                    Ρυθμίσεις Προσαρμοσμένης Κατηγορίας
                  </h4>

                  <LabeledInput
                    small
                    label="Όνομα κατηγορίας"
                    placeholder="π.χ. Mindfulness"
                    value={form.custom_category}
                    onChange={setField("custom_category")}
                  />

                  <LabeledInput
                    small
                    label="Custom icon (emoji ή image URL)"
                    placeholder="π.χ. 🧘 ή https://…/icon.png"
                    value={form.icon}
                    onChange={setField("icon")}
                    helper="• Emoji: βάλε ένα (π.χ. 💼, 🧠) • Εικόνα: βάλε URL (https://…)"
                  />
                </motion.div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <NumberField
                  label="Στόχος"
                  icon={<Target className="w-4 h-4 text-red-400" />}
                  value={form.target_value}
                  onChange={setField("target_value")}
                />

                <NumberField
                  label="Τρέχουσα Πρόοδος"
                  icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
                  value={form.progress_value}
                  onChange={setField("progress_value")}
                />

                <LabeledInput
                  label="Μονάδα (προαιρετικό)"
                  icon={<Tag className="w-4 h-4 text-zinc-400" />}
                  placeholder="π.χ. km, sessions, ώρες"
                  value={form.unit || ""}
                  onChange={setField("unit")}
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                  <CalendarIcon className="w-4 h-4 text-cyan-400" />
                  Προθεσμία
                </label>

                <input
                  type="date"
                  className="w-full rounded-2xl bg-black/40 border border-zinc-700/50 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  value={form.due_date}
                  onChange={setField("due_date")}
                />
              </div>
            </div>

            <div className="sticky bottom-0 z-10 bg-zinc-900/80 backdrop-blur-md border-t border-zinc-700/50 p-4 sm:p-6 flex flex-col sm:flex-row gap-2 sm:gap-4 sm:justify-end">
              <motion.button
                type="button"
                disabled={saving}
                onClick={onClose}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto px-4 sm:px-6 py-3 rounded-2xl bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-600/50 text-zinc-300 hover:text-white font-semibold transition-all disabled:opacity-50"
              >
                Άκυρο
              </motion.button>

              <motion.button
                type="submit"
                disabled={saving}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Αποθήκευση...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {initial ? "Ενημέρωση" : "Δημιουργία"}
                  </>
                )}
              </motion.button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LabeledInput({
  label,
  icon,
  value,
  onChange,
  placeholder,
  helper,
  required,
  small,
}) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
          {icon}
          {label}
        </label>
      )}

      <input
        className={`w-full rounded-2xl bg-black/40 border border-zinc-700/50 px-4 ${
          small ? "py-2" : "py-2.5"
        } text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 transition-all`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
      />

      {helper && <p className="text-[11px] text-zinc-500">{helper}</p>}
    </div>
  );
}

function LabeledTextarea({ label, icon, value, onChange, placeholder, rows = 3 }) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
          {icon}
          {label}
        </label>
      )}

      <textarea
        className="w-full rounded-2xl bg-black/40 border border-zinc-700/50 px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30 transition-all resize-none"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        rows={rows}
      />
    </div>
  );
}

function NumberField({ label, icon, value, onChange }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
        {icon}
        {label}
      </label>

      <input
        type="number"
        min="0"
        className="w-full rounded-2xl bg-black/40 border border-zinc-700/50 px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/30 transition-all"
        placeholder="0"
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

function SelectField({ label, color, value, onChange, icon, options }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
        <div className={`w-4 h-4 ${color || ""}`} />
        {label}
      </label>

      <div className="relative">
        <select
          className="w-full rounded-2xl bg-black/40 border border-zinc-700/50 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500/30 transition-all appearance-none cursor-pointer"
          value={value}
          onChange={onChange}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-zinc-900">
              {option.label}
            </option>
          ))}
        </select>

        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {icon}
        </div>
      </div>
    </div>
  );
}