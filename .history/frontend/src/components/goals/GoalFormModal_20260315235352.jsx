"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
  Loader2,
} from "lucide-react";

const cn = (...classes) => classes.filter(Boolean).join(" ");

const INITIAL_FORM = {
  title: "",
  description: "",
  category: "fitness",
  custom_category: "",
  icon: "",
  target_value: 0,
  progress_value: 0,
  unit: "",
  due_date: "",
  status: "not_started",
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
  { value: "not_started", label: "Δεν ξεκίνησε", icon: Clock, color: "text-zinc-400" },
  { value: "in_progress", label: "Σε εξέλιξη", icon: Activity, color: "text-blue-400" },
  { value: "completed", label: "Ολοκληρώθηκε", icon: CheckCircle, color: "text-emerald-400" },
];

function FieldShell({ label, icon, children, helper }) {
  return (
    <div className="relative">
      {children}

      <label className="absolute -top-2 left-3 inline-flex items-center gap-1.5 px-2 bg-black/70 text-xs font-medium text-zinc-400 backdrop-blur-sm rounded">
        {icon}
        <span>{label}</span>
      </label>

      {helper && <p className="mt-2 text-[11px] text-zinc-500">{helper}</p>}
    </div>
  );
}

function TextInput({
  label,
  icon,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
  min,
}) {
  return (
    <FieldShell label={label} icon={icon}>
      <input
        type={type}
        min={min}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-zinc-900/60 border border-white/10 rounded-2xl text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all duration-200 backdrop-blur-xl"
      />
    </FieldShell>
  );
}

function TextareaField({
  label,
  icon,
  value,
  onChange,
  placeholder,
  rows = 4,
}) {
  return (
    <FieldShell label={label} icon={icon}>
      <textarea
        value={value}
        onChange={onChange}
        rows={rows}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-zinc-900/60 border border-white/10 rounded-2xl text-zinc-100 placeholder-zinc-400 resize-none focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all duration-200 backdrop-blur-xl"
      />
    </FieldShell>
  );
}

function SelectField({ label, icon, value, onChange, options }) {
  return (
    <FieldShell label={label} icon={icon}>
      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          className="w-full appearance-none px-4 py-3 pr-10 bg-zinc-900/60 border border-white/10 rounded-2xl text-zinc-100 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all duration-200 backdrop-blur-xl"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-zinc-950">
              {option.label}
            </option>
          ))}
        </select>

        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
          <Flag className="h-4 w-4" />
        </div>
      </div>
    </FieldShell>
  );
}

function DateField({ label, icon, value, onChange }) {
  return (
    <FieldShell label={label} icon={icon}>
      <input
        type="date"
        value={value}
        onChange={onChange}
        className="w-full px-4 py-3 bg-zinc-900/60 border border-white/10 rounded-2xl text-zinc-100 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all duration-200 backdrop-blur-xl"
      />
    </FieldShell>
  );
}

function ErrorBox({ message }) {
  if (!message) return null;

  return (
    <div className="flex items-start gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export default function GoalFormModal({ open, onClose, initial, onSubmit }) {
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    if (initial) {
      setForm({
        title: initial.title ?? "",
        description: initial.description ?? "",
        category: initial.category ?? "fitness",
        custom_category: initial.custom_category ?? "",
        icon: initial.icon ?? "",
        target_value: initial.target_value ?? 0,
        progress_value: initial.progress_value ?? 0,
        unit: initial.unit ?? "",
        due_date: initial.due_date ?? "",
        status: initial.status ?? "not_started",
      });
    } else {
      setForm(INITIAL_FORM);
    }

    setErrorMsg(null);
    setSaving(false);
  }, [initial, open]);

  useEffect(() => {
    if (!mounted || !open) return;

    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [mounted, open]);

  const setField = (key) => (e) => {
    setForm((prev) => ({
      ...prev,
      [key]: e.target.value,
    }));
  };

  const selectedCategory = useMemo(
    () => categoryOptions.find((cat) => cat.value === form.category),
    [form.category]
  );

  const selectedStatus = useMemo(
    () => statusOptions.find((stat) => stat.value === form.status),
    [form.status]
  );

  const isDirty = useMemo(() => {
    return Boolean(
      form.title?.trim() ||
        form.description?.trim() ||
        Number(form.target_value) > 0 ||
        Number(form.progress_value) > 0 ||
        form.unit?.trim() ||
        form.due_date ||
        form.custom_category?.trim() ||
        form.icon?.trim() ||
        form.category !== "fitness" ||
        form.status !== "not_started"
    );
  }, [form]);

  const requestClose = () => {
    if (saving) return;
    onClose?.();
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      const payload = {
        ...form,
        target_value: Number(form.target_value) || 0,
        progress_value: Number(form.progress_value) || 0,
        unit: form.unit?.trim() || null,
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
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  const renderForm = ({ mobile = false }) => (
    <form
      onSubmit={submit}
      className={cn(
        "flex-1 overflow-y-auto qb-scroll overscroll-contain",
        mobile ? "px-4 py-4" : "px-6 py-5"
      )}
      style={{ WebkitOverflowScrolling: "touch" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="space-y-6">
        <ErrorBox message={errorMsg} />

        <div className={cn("grid gap-4", mobile ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-[1.15fr_.85fr]")}>
          <div className="space-y-4">
            <TextInput
              label="Τίτλος Στόχου"
              icon={<Sparkles className="h-3.5 w-3.5 text-zinc-400" />}
              placeholder="π.χ. Μηνιαίες Προπονήσεις"
              value={form.title}
              onChange={setField("title")}
              required
            />

            <TextareaField
              label="Περιγραφή"
              icon={<Edit3 className="h-3.5 w-3.5 text-zinc-400" />}
              placeholder="Περίγραψε τον στόχο σου..."
              value={form.description}
              onChange={setField("description")}
              rows={mobile ? 4 : 5}
            />

            {form.category === "custom" && (
              <div className="rounded-[24px] border border-white/10 bg-zinc-950/60 p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                  <Tag className="h-4 w-4 text-teal-400" />
                  Ρυθμίσεις custom κατηγορίας
                </div>

                <TextInput
                  label="Όνομα κατηγορίας"
                  icon={<Tag className="h-3.5 w-3.5 text-zinc-400" />}
                  placeholder="π.χ. Mindfulness"
                  value={form.custom_category}
                  onChange={setField("custom_category")}
                />

                <TextInput
                  label="Custom icon"
                  icon={<Sparkles className="h-3.5 w-3.5 text-zinc-400" />}
                  placeholder="π.χ. 🧘 ή https://example.com/icon.png"
                  value={form.icon}
                  onChange={setField("icon")}
                />

                <p className="text-xs leading-5 text-zinc-500">
                  Βάλε είτε emoji είτε πλήρες image URL.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <SelectField
                label="Κατηγορία"
                icon={
                  <div className={cn("h-3.5 w-3.5 rounded-full", selectedCategory?.color || "text-zinc-400")} />
                }
                value={form.category}
                onChange={setField("category")}
                options={categoryOptions}
              />

              <SelectField
                label="Κατάσταση"
                icon={
                  <div className={cn("h-3.5 w-3.5 rounded-full", selectedStatus?.color || "text-zinc-400")} />
                }
                value={form.status}
                onChange={setField("status")}
                options={statusOptions}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextInput
                type="number"
                min="0"
                label="Στόχος"
                icon={<Target className="h-3.5 w-3.5 text-zinc-400" />}
                placeholder="0"
                value={form.target_value}
                onChange={setField("target_value")}
              />

              <TextInput
                type="number"
                min="0"
                label="Τρέχουσα Πρόοδος"
                icon={<TrendingUp className="h-3.5 w-3.5 text-zinc-400" />}
                placeholder="0"
                value={form.progress_value}
                onChange={setField("progress_value")}
              />
            </div>

            <TextInput
              label="Μονάδα"
              icon={<Tag className="h-3.5 w-3.5 text-zinc-400" />}
              placeholder="π.χ. km, sessions, ώρες"
              value={form.unit || ""}
              onChange={setField("unit")}
            />

            <DateField
              label="Προθεσμία"
              icon={<CalendarIcon className="h-3.5 w-3.5 text-zinc-400" />}
              value={form.due_date}
              onChange={setField("due_date")}
            />

            <div className="rounded-[24px] border border-white/10 bg-zinc-950/60 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                <Target className="h-4 w-4 text-white" />
                Σύνοψη
              </div>

              <div className="mt-3 space-y-2 text-sm text-zinc-400">
                <p>
                  <span className="text-zinc-200 font-medium">Κατηγορία:</span>{" "}
                  {selectedCategory?.label || "-"}
                </p>
                <p>
                  <span className="text-zinc-200 font-medium">Κατάσταση:</span>{" "}
                  {selectedStatus?.label || "-"}
                </p>
                <p>
                  <span className="text-zinc-200 font-medium">Στόχος:</span>{" "}
                  {Number(form.target_value) || 0}
                  {form.unit ? ` ${form.unit}` : ""}
                </p>
                <p>
                  <span className="text-zinc-200 font-medium">Πρόοδος:</span>{" "}
                  {Number(form.progress_value) || 0}
                  {form.unit ? ` ${form.unit}` : ""}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button type="submit" className="hidden" aria-hidden="true" />
    </form>
  );

  return createPortal(
    <>
      <style>{`
        .qb-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(161, 161, 170, 0.48) transparent;
        }

        .qb-scroll::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .qb-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .qb-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(
            180deg,
            rgba(161, 161, 170, 0.42),
            rgba(113, 113, 122, 0.52)
          );
          border-radius: 999px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        .qb-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(
            180deg,
            rgba(190, 190, 200, 0.52),
            rgba(125, 125, 135, 0.62)
          );
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        .qb-scroll::-webkit-scrollbar-corner {
          background: transparent;
        }
      `}</style>

      <AnimatePresence>
        {open && (
          <>
            {/* Desktop */}
            <div className="hidden sm:flex fixed inset-0 z-[120] items-center justify-center p-4">
              <motion.button
                type="button"
                aria-label="close overlay"
                onClick={requestClose}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="absolute inset-0 bg-black/65 backdrop-blur-md"
              />

              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 18, scale: 0.985 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-5xl max-h-[88vh] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/85 to-black/90 backdrop-blur-2xl shadow-2xl flex flex-col"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_30%)] pointer-events-none" />

                <div className="relative flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/20 shrink-0">
                      <Target className="h-6 w-6" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-xl font-bold text-white tracking-tight break-words">
                        {initial ? "Επεξεργασία στόχου" : "Νέος στόχος"}
                      </h3>
                      <p className="text-sm text-zinc-300 mt-1 break-words">
                        {initial
                          ? "Ενημέρωσε τα στοιχεία του στόχου σου"
                          : "Οργάνωσε έναν νέο στόχο με καθαρή δομή"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={requestClose}
                    disabled={saving}
                    className="text-white hover:opacity-70 transition disabled:opacity-50"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {renderForm({ mobile: false })}

                <div className="relative border-t border-white/10 px-6 py-4 bg-black/45 backdrop-blur-xl">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-zinc-400">
                      {isDirty
                        ? "Έχεις μη αποθηκευμένες αλλαγές."
                        : "Συμπλήρωσε τα πεδία για να αποθηκεύσεις τον στόχο."}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={requestClose}
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 text-white/90 border border-white/15 rounded-2xl bg-black/30 hover:bg-white/10 transition disabled:opacity-60"
                      >
                        Ακύρωση
                      </button>

                      <button
                        type="button"
                        onClick={submit}
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-white text-black hover:bg-zinc-100 transition disabled:opacity-60 min-w-[180px] font-semibold"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Αποθήκευση...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            {initial ? "Ενημέρωση στόχου" : "Δημιουργία στόχου"}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Mobile */}
            <div className="fixed inset-0 z-[120] sm:hidden">
              <motion.button
                type="button"
                aria-label="close overlay"
                onClick={requestClose}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="absolute inset-0 bg-black/88"
              />

              <div className="absolute inset-x-0 bottom-0 flex justify-center">
                <motion.div
                  initial={{ opacity: 0, y: 120 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 120 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full border border-zinc-900 bg-black shadow-[0_-30px_80px_rgba(0,0,0,.9)] flex flex-col overflow-hidden rounded-t-[30px] h-[92dvh]"
                >
                  <div className="flex justify-center bg-black pt-2 pb-1">
                    <div className="h-1.5 w-12 rounded-full bg-zinc-700/90" />
                  </div>

                  <div className="border-b border-zinc-800/90 bg-black px-4 pt-3 pb-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-zinc-900 ring-1 ring-zinc-800/90">
                        <Target className="h-5 w-5 text-white" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-[17px] font-semibold leading-tight text-white">
                          {initial ? "Επεξεργασία στόχου" : "Νέος στόχος"}
                        </h3>

                        <div className="mt-1 text-sm text-zinc-300 leading-snug">
                          {initial
                            ? "Άλλαξε γρήγορα τα στοιχεία του στόχου σου"
                            : "Δημιούργησε έναν νέο στόχο"}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={requestClose}
                        disabled={saving}
                        className="text-white hover:opacity-70 transition shrink-0 disabled:opacity-50"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>
                  </div>

                  {renderForm({ mobile: true })}

                  <div className="border-t border-zinc-800/90 bg-black px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
                    <div className="flex flex-col gap-3">
                      <div className="text-sm text-white/75">
                        {isDirty
                          ? "Έχεις μη αποθηκευμένες αλλαγές."
                          : "Συμπλήρωσε τα πεδία για να αποθηκεύσεις."}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={requestClose}
                          disabled={saving}
                          className="h-12 rounded-2xl border border-zinc-800 bg-zinc-900 text-white transition hover:bg-zinc-800 disabled:opacity-60"
                        >
                          Ακύρωση
                        </button>

                        <button
                          type="button"
                          onClick={submit}
                          disabled={saving}
                          className="h-12 rounded-2xl border border-white bg-white text-black transition hover:bg-zinc-100 disabled:opacity-60 font-semibold"
                        >
                          <span className="inline-flex items-center justify-center gap-2">
                            {saving ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Αποθήκευση...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4" />
                                {initial ? "Ενημέρωση" : "Δημιουργία"}
                              </>
                            )}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}