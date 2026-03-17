import React, { useMemo } from "react";
import {
  Mail,
  Lock,
  User as LucideUser,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  MapPin,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaDumbbell,
  FaUsers,
  FaAppleAlt,
  FaLaptop,
  FaRunning,
  FaMusic,
  FaHeartbeat,
  FaUserShield,
  FaUser,
} from "react-icons/fa";
import {
  MdFitnessCenter,
  MdSelfImprovement,
  MdHealthAndSafety,
  MdPsychology,
} from "react-icons/md";
import {
  GiMuscleUp,
  GiSwordsPower,
  GiWeightLiftingUp,
  GiBoxingGlove,
} from "react-icons/gi";
import { TbYoga, TbStethoscope } from "react-icons/tb";

const ICON_BY_KEY = {
  dumbbell: FaDumbbell,
  users: FaUsers,
  pilates: MdSelfImprovement,
  yoga: TbYoga,
  apple: FaAppleAlt,
  laptop: FaLaptop,
  strength: GiWeightLiftingUp,
  calisthenics: GiMuscleUp,
  crossfit: MdFitnessCenter,
  boxing: GiBoxingGlove,
  martial: GiSwordsPower,
  dance: FaMusic,
  running: FaRunning,
  physio: TbStethoscope,
  rehab: MdHealthAndSafety,
  wellness: FaHeartbeat,
  psychology: MdPsychology,
};

export default function AuthSignupForm({
  form,
  error,
  showPw,
  setShowPw,
  setField,
  setForm,
  onSubmit,
  disabled = false,
  googleSubmitting = false,
  onGoogleSignupUser,
  locationOptions = [],
  trainerCategories = [],
  toggleSpeciality,
  pushToast,
  openModal,
  closeModal,
}) {
  const selectedCategory = useMemo(
    () => trainerCategories.find((c) => c.value === form.category) ?? null,
    [trainerCategories, form.category]
  );

  const showGoogleSignupUserButton = form.role === "user";

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {showGoogleSignupUserButton ? (
        <div className="space-y-3">
          <GoogleButton
            loading={googleSubmitting}
            onClick={onGoogleSignupUser}
            text="Εγγραφή με Google"
          />
          <Divider />
        </div>
      ) : null}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key="signup-fields"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="space-y-4 overflow-hidden"
        >
          <Input
            icon={LucideUser}
            placeholder="Ονοματεπώνυμο"
            value={form.full_name}
            onChange={setField("full_name")}
          />

          <LocationPicker
            options={locationOptions}
            value={form.location}
            onChange={(next) => {
              setForm((prev) => ({ ...prev, location: next }));
              pushToast?.({
                type: "info",
                title: "Πόλη επιλέχθηκε",
                message: next,
                durationMs: 5000,
              });
            }}
          />

          <Select
            icon={ShieldCheck}
            leftIcon={form.role === "trainer" ? FaUserShield : FaUser}
            value={form.role}
            onChange={(e) => {
              const nextRole = e.target.value;

              setForm((prev) => ({
                ...prev,
                role: nextRole,
                category: nextRole === "trainer" ? prev.category : "",
                specialities: nextRole === "trainer" ? prev.specialities : [],
              }));

              pushToast?.(
                nextRole === "trainer"
                  ? {
                      type: "info",
                      title: "Ρόλος: Εκπαιδευτής",
                      message:
                        "Για trainer χρησιμοποίησε την κλασική φόρμα εγγραφής, όχι Google signup.",
                      durationMs: 8000,
                    }
                  : {
                      type: "info",
                      title: "Ρόλος: Χρήστης",
                      message:
                        "Μπορείς να κάνεις εγγραφή με email ή με Google.",
                      durationMs: 8000,
                    }
              );
            }}
            options={[
              { label: "Χρήστης", value: "user" },
              { label: "Εκπαιδευτής/Προπονητής", value: "trainer" },
            ]}
          />

          {form.role === "trainer" && (
            <>
              <CategorySelect
                categories={trainerCategories}
                value={form.category}
                onChange={(e) => {
                  setField("category")(e);

                  const next = trainerCategories.find(
                    (c) => c.value === e.target.value
                  );

                  if (next) {
                    pushToast?.({
                      type: "success",
                      title: "Κατηγορία επιλέχθηκε",
                      message: next.label,
                      durationMs: 6000,
                    });
                  }
                }}
              />

              {form.category && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[15px] text-zinc-300 font-medium">
                      Ειδικότητες
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        openModal?.({
                          icon: "info",
                          title: "Γιατί ζητάμε ειδικότητες;",
                          message:
                            "Οι ειδικότητες βοηθούν τους χρήστες να σε βρίσκουν ακριβώς για αυτό που χρειάζονται. Επίλεξε όσες σε περιγράφουν πραγματικά.",
                          actions: [{ label: "ΟΚ", onClick: closeModal }],
                        })
                      }
                      className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
                    >
                      Τι είναι αυτό;
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2 max-h-44 overflow-y-auto pr-1">
                    {selectedCategory?.specialties?.map((sp) => (
                      <label
                        key={sp}
                        className="flex items-center gap-2 text-base text-zinc-300 hover:text-white transition-colors"
                      >
                        <input
                          type="checkbox"
                          className="accent-zinc-500 rounded"
                          checked={form.specialities.includes(sp)}
                          onChange={() => {
                            const removing = form.specialities.includes(sp);

                            toggleSpeciality?.(sp);

                            pushToast?.({
                              type: "info",
                              title: "Ενημέρωση ειδικοτήτων",
                              message: removing
                                ? `Αφαιρέθηκε: ${sp}`
                                : `Προστέθηκε: ${sp}`,
                              durationMs: 7000,
                            });
                          }}
                        />
                        <span>{sp}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <Input
        icon={Mail}
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={setField("email")}
        required
      />

      <Input
        icon={Lock}
        type={showPw ? "text" : "password"}
        placeholder="Κωδικός"
        value={form.password}
        onChange={setField("password")}
        required
        append={
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label={showPw ? "Απόκρυψη κωδικού" : "Εμφάνιση κωδικού"}
          >
            {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        }
      />

      {!!error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <SubmitButton disabled={disabled} />
    </form>
  );
}

function Input({ icon: Icon, append, ...props }) {
  return (
    <div className="relative group">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />

      <input
        {...props}
        className="w-full pl-10 pr-11 py-4 rounded-xl text-base bg-black/30 border border-zinc-700 text-gray-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 transition-all"
      />

      {append && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {append}
        </div>
      )}
    </div>
  );
}

function Select({ icon: DefaultIcon, leftIcon: LeftIcon, options = [], ...props }) {
  const IconToUse = LeftIcon || DefaultIcon;

  return (
    <div className="relative group">
      {IconToUse && (
        <IconToUse className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
      )}

      <select
        {...props}
        className="w-full pl-10 pr-8 py-4 rounded-xl text-base bg-black/30 border border-zinc-700 text-gray-200 focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 transition-all appearance-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-zinc-800 text-white">
            {o.label}
          </option>
        ))}
      </select>

      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg
          className="w-4 h-4 text-zinc-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  );
}

function CategorySelect({ categories = [], value, onChange }) {
  const cat = categories.find((c) => c.value === value);
  const LeftIcon = cat?.iconKey ? ICON_BY_KEY[cat.iconKey] : ShieldCheck;

  return (
    <div className="relative group">
      <LeftIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />

      <select
        value={value}
        onChange={onChange}
        className="w-full pl-10 pr-8 py-4 rounded-xl text-base bg-black/30 border border-zinc-700 text-gray-200 focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 transition-all appearance-none"
      >
        <option value="" className="bg-zinc-800 text-white">
          — Επίλεξε κατηγορία επαγγελματία —
        </option>

        {categories.map((category) => (
          <option
            key={category.value}
            value={category.value}
            className="bg-zinc-800 text-white"
          >
            {category.label}
          </option>
        ))}
      </select>

      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg
          className="w-4 h-4 text-zinc-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  );
}

function LocationPicker({ options = [], value, onChange }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
        <MapPin className="w-4 h-4 text-zinc-500" />
        <span>Πόλη</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {options.map((city) => {
          const active = value === city;

          return (
            <button
              key={city}
              type="button"
              onClick={() => onChange(city)}
              className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm transition-all ${
                active
                  ? "bg-white text-black border-white font-semibold"
                  : "bg-black/30 text-zinc-300 border-zinc-700 hover:border-zinc-500 hover:text-white"
              }`}
            >
              <MapPin
                className={`w-4 h-4 ${active ? "text-black" : "text-zinc-500"}`}
              />
              <span className="truncate">{city}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function GoogleButton({ loading, onClick, text }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={loading}
      whileHover={!loading ? { y: -1 } : {}}
      whileTap={!loading ? { scale: 0.98 } : {}}
      transition={{ duration: 0.15 }}
      className={`w-full py-4 rounded-xl font-semibold text-base border transition-all duration-300 flex items-center justify-center gap-3 ${
        loading
          ? "bg-white/70 text-zinc-700 border-white/70 opacity-80 cursor-not-allowed"
          : "bg-white text-zinc-900 border-white hover:bg-zinc-100 shadow-lg"
      }`}
    >
      {loading ? (
        <Loader2 className="animate-spin w-5 h-5" />
      ) : (
        <>
          <GoogleIcon />
          <span>{text}</span>
        </>
      )}
    </motion.button>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.239 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.193l-6.19-5.238C29.145 35.091 26.715 36 24 36c-5.218 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.051 12.051 0 0 1-4.084 5.569l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

function Divider() {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-zinc-700/70" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-black/40 px-3 text-xs tracking-wide uppercase text-zinc-500">
          ή
        </span>
      </div>
    </div>
  );
}

function SubmitButton({ disabled }) {
  return (
    <motion.button
      type="submit"
      disabled={disabled}
      whileHover={!disabled ? { y: -1 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      transition={{ duration: 0.15 }}
      className={`w-full py-4 rounded-xl font-semibold text-white text-base transition-all duration-300 flex items-center justify-center gap-2 ${
        disabled
          ? "bg-zinc-700 opacity-70 cursor-not-allowed"
          : "bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 shadow-lg"
      }`}
    >
      {disabled ? (
        <Loader2 className="animate-spin w-5 h-5" />
      ) : (
        <>
          Δημιουργία λογαριασμού
          <ArrowRight className="w-5 h-5" />
        </>
      )}
    </motion.button>
  );
}