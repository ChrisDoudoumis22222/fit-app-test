"use client";
import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";
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
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

/* ------------------ CONFIG ------------------ */
const LOGO_SRC =
  "https://peakvelocity.gr/wp-content/uploads/2024/03/Logo-chris-black-1.png";

/** tiny helper – reject if an SDK call hangs */
function withTimeout(promise, ms, label = "operation") {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms
      )
    ),
  ]);
}

/**
 * Map icon keys -> actual icon components.
 */
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

/**
 * Trainer categories in Greek
 */
const TRAINER_CATEGORIES = [
  {
    value: "personal_trainer",
    label: "Προσωπικός Εκπαιδευτής",
    iconKey: "dumbbell",
    specialties: [
      "Απώλεια λίπους",
      "Μυϊκή ενδυνάμωση",
      "Προπόνηση με βάρη",
      "Σωματική μεταμόρφωση",
      "Προετοιμασία αγώνων/διαγωνισμών",
      "Προπόνηση αρχαρίων",
      "Προπόνηση τρίτης ηλικίας",
      "Προπόνηση εγκύων",
    ],
  },
  {
    value: "group_fitness_instructor",
    label: "Εκπαιδευτής Ομαδικών Προγραμμάτων",
    iconKey: "users",
    specialties: [
      "HIIT υψηλής έντασης",
      "Bootcamp",
      "Λειτουργική προπόνηση (Functional)",
      "TRX",
      "Κυκλική προπόνηση (Circuit)",
      "Αερόβια προπόνηση (Cardio)",
      "Ομαδικά γυναικών",
    ],
  },
  {
    value: "pilates_instructor",
    label: "Εκπαιδευτής Pilates",
    iconKey: "pilates",
    specialties: [
      "Mat Pilates",
      "Reformer Pilates",
      "Προγεννητικό & Μεταγεννητικό",
      "Στάση σώματος / Ενδυνάμωση Core",
      "Pilates για αποκατάσταση",
    ],
  },
  {
    value: "yoga_instructor",
    label: "Εκπαιδευτής Yoga",
    iconKey: "yoga",
    specialties: [
      "Hatha Yoga",
      "Vinyasa Flow",
      "Power Yoga",
      "Yin Yoga",
      "Prenatal Yoga",
      "Mindfulness & Αναπνοές",
    ],
  },
  {
    value: "nutritionist",
    label: "Διατροφολόγος",
    iconKey: "apple",
    specialties: [
      "Απώλεια βάρους",
      "Αύξηση μυϊκής μάζας",
      "Vegan / Χορτοφαγική διατροφή",
      "Διατροφική υποστήριξη αθλητών",
      "Προγράμματα διατροφής με delivery",
      "Εντερική υγεία & δυσανεξίες",
    ],
  },
  {
    value: "online_coach",
    label: "Online Προπονητής",
    iconKey: "laptop",
    specialties: [
      "Απομακρυσμένο 1‑on‑1 coaching",
      "Προγράμματα PDF / Video",
      "Συνδυασμός Διατροφής + Προπόνησης",
      "Ζωντανά μαθήματα μέσω Zoom",
      "Coaching υπευθυνότητας (accountability)",
    ],
  },
  {
    value: "strength_conditioning",
    label: "Προπονητής Δύναμης & Φυσικής Κατάστασης",
    iconKey: "strength",
    specialties: [
      "Ανάπτυξη αθλητών",
      "Αθλητικές επιδόσεις",
      "Ολυμπιακές άρσεις",
      "Πλειομετρικές ασκήσεις",
      "Ανθεκτικότητα σε τραυματισμούς",
    ],
  },
  {
    value: "calisthenics",
    label: "Εκπαιδευτής Calisthenics",
    iconKey: "calisthenics",
    specialties: [
      "Στατική δύναμη",
      "Δυναμικές δεξιότητες (Muscle‑up, Planche)",
      "Ευκινησία & Έλεγχος",
      "Street workout",
      "Προπόνηση σε κρίκους",
    ],
  },
  {
    value: "crossfit_coach",
    label: "Προπονητής CrossFit",
    iconKey: "crossfit",
    specialties: [
      "Καθημερινός προγραμματισμός (WODs)",
      "Ολυμπιακές άρσεις",
      "Προετοιμασία για αγώνες",
      "Γυμναστικές δεξιότητες",
      "Metcons",
    ],
  },
  {
    value: "boxing_kickboxing",
    label: "Προπονητής Πυγμαχίας / Kickboxing",
    iconKey: "boxing",
    specialties: [
      "Cardio boxing",
      "Sparring",
      "Ασκήσεις με σάκο",
      "Βελτίωση τεχνικής",
      "Παιδιά / Αρχάριοι",
    ],
  },
  {
    value: "martial_arts",
    label: "Εκπαιδευτής Πολεμικών Τεχνών",
    iconKey: "martial",
    specialties: [
      "Brazilian Jiu‑Jitsu (BJJ)",
      "Muay Thai",
      "Καράτε",
      "Krav Maga",
      "Αυτοάμυνα",
      "Taekwondo",
      "Προετοιμασία MMA",
    ],
  },
  {
    value: "dance_fitness",
    label: "Εκπαιδευτής Χορευτικής Γυμναστικής",
    iconKey: "dance",
    specialties: [
      "Zumba",
      "Latin dance fitness",
      "Afrobeat / Hip hop cardio",
      "Τόνωση γυναικών",
      "Χορός για ηλικιωμένους",
    ],
  },
  {
    value: "running_coach",
    label: "Προπονητής Τρεξίματος",
    iconKey: "running",
    specialties: [
      "Μαραθώνιος / Ημιμαραθώνιος",
      "Προπόνηση sprint",
      "Διόρθωση τεχνικής τρεξίματος",
      "Προπόνηση αντοχής",
      "Τρέξιμο για αρχάριους",
    ],
  },
  {
    value: "physiotherapist",
    label: "Φυσικοθεραπευτής",
    iconKey: "physio",
    specialties: [
      "Αποκατάσταση τραυματισμών",
      "Manual therapy",
      "Κινησιοθεραπεία",
      "Χρόνιοι πόνοι",
      "Αθλητική αποκατάσταση",
    ],
  },
  {
    value: "rehab_prevention",
    label: "Ειδικός Αποκατάστασης / Πρόληψης Τραυματισμών",
    iconKey: "rehab",
    specialties: [
      "Εργονομική ενδυνάμωση",
      "Διόρθωση κινητικών προτύπων",
      "Ισορροπία & σταθερότητα",
      "Επανένταξη μετά από χειρουργείο",
    ],
  },
  {
    value: "wellness_life_coach",
    label: "Προπονητής Ευεξίας & Ζωής",
    iconKey: "wellness",
    specialties: [
      "Διαχείριση άγχους",
      "Coaching συνηθειών & χρόνου",
      "Ψυχική ανθεκτικότητα",
      "Αποκατάσταση από burnout",
      "Ολιστικός καθορισμός στόχων",
    ],
  },
  {
    value: "performance_psych",
    label: "Προπονητής Απόδοσης / Αθλητικός Ψυχολόγος",
    iconKey: "psychology",
    specialties: [
      "Εκπαίδευση συγκέντρωσης",
      "Ψυχολογία ημέρας αγώνα",
      "Τεχνικές οπτικοποίησης",
      "Αγωνιστικό mindset",
      "Κατάσταση ροής (flow state) coaching",
    ],
  },
];

/* ------------------ COMPONENT ------------------ */
export default function AuthPage() {
  // read so component re-renders after login, but we redirect ourselves.
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "user",
    category: "",
    specialities: [],
    location: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const setField = useCallback(
    (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value })),
    []
  );

  const toggleSpeciality = (name) => {
    setForm((prev) => {
      const exists = prev.specialities.includes(name);
      return {
        ...prev,
        specialities: exists
          ? prev.specialities.filter((s) => s !== name)
          : [...prev.specialities, name],
      };
    });
  };

  const validate = useCallback(() => {
    if (!form.email.trim() || !form.password.trim())
      return "Το email και ο κωδικός είναι υποχρεωτικά.";
    if (mode === "signup" && form.password.length < 6)
      return "Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες.";
    if (mode === "signup" && form.role === "trainer" && !form.category)
      return "Διάλεξε κατηγορία.";
    return null;
  }, [form, mode]);

  const persistSession = async () => {
    const { data } = await supabase.auth.getSession();
    const sess = data?.session ?? null;
    try {
      localStorage.setItem("pv_session", JSON.stringify(sess));
    } catch (_) {}
    return sess;
  };

  const persistProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (!error && data) {
        localStorage.setItem("pv_profile", JSON.stringify(data));
      }
    } catch (_) {}
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) return setError(validationError);

    setSubmitting(true);

    try {
      if (mode === "login") {
        const { data, error } = await withTimeout(
          supabase.auth.signInWithPassword({
            email: form.email.trim(),
            password: form.password,
          }),
          8000,
          "login"
        );
        if (error) throw error;

        // save session & profile in localStorage for instant restore
        const sess = await persistSession();
        if (sess?.user?.id) persistProfile(sess.user.id); // fire & forget
        refreshProfile().catch(console.error); // do not block UI

        const role =
          data?.user?.user_metadata?.role ??
          JSON.parse(localStorage.getItem("pv_profile") || "{}")?.role ??
          "user";

        navigate(role === "trainer" ? "/trainer" : "/user", { replace: true });
      } else {
        // signup
        const { data, error: signErr } = await withTimeout(
          supabase.auth.signUp({
            email: form.email.trim(),
            password: form.password,
            options: {
              data: {
                full_name: form.full_name.trim(),
                role: form.role,
                specialty: form.role === "trainer" ? form.category : null,
                roles: form.role === "trainer" ? form.specialities : [],
                location: form.location || null,
              },
            },
          }),
          10000,
          "signup"
        );

        if (signErr) {
          if (
            signErr.status === 400 &&
            /registered|exists|used|already/i.test(signErr.message)
          ) {
            setError(
              "Υπάρχει ήδη λογαριασμός με αυτό το email. Παρακαλώ συνδέσου."
            );
            setMode("login");
            return;
          }
          throw signErr;
        }

        if (data?.user) {
          await withTimeout(
          supabase
              .from("profiles")
              .upsert(
                {
                  id: data.user.id,
                  email: form.email.trim(),
                  full_name: form.full_name.trim(),
                  role: form.role,
                  specialty:
                    form.role === "trainer" ? form.category : null,
                  roles:
                    form.role === "trainer" ? form.specialities : [],
                  location: form.location || null,
                },
                { onConflict: "id" }
              ),
            8000,
            "profiles upsert"
          );
        }

        alert("⚡ Σχεδόν τελείωσες! Έλεγξε το email σου για επιβεβαίωση.");

        // auto login so flow is smooth
        const { data: signInData, error: relogErr } = await withTimeout(
          supabase.auth.signInWithPassword({
            email: form.email.trim(),
            password: form.password,
          }),
          8000,
          "auto-login"
        );
        if (relogErr) throw relogErr;

        const sess = await persistSession();
        if (sess?.user?.id) persistProfile(sess.user.id);
        refreshProfile().catch(console.error);

        const role =
          signInData?.user?.user_metadata?.role ??
          JSON.parse(localStorage.getItem("pv_profile") || "{}")?.role ??
          "user";

        navigate(role === "trainer" ? "/trainer" : "/user", { replace: true });
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError(err.message ?? "Κάτι πήγε στραβά. Προσπάθησε ξανά.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategory =
    TRAINER_CATEGORIES.find((c) => c.value === form.category) ?? null;

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-zinc-900">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-black" />
      <StaticBlobs />

      <LayoutGroup>
        <motion.form
          layout
          onSubmit={submit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 150 }}
          className="relative z-10 w-full max-w-md px-7 py-9 space-y-7 rounded-3xl
                     bg-black/40 backdrop-blur-xl border border-zinc-700/50 text-gray-200
                     shadow-[0_20px_50px_rgba(0,0,0,0.7)]"
        >
          {/* Header */}
          <motion.div
            className="text-center space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <img
              src={LOGO_SRC || "/placeholder.svg"}
              alt="Peak Velocity"
              className="mx-auto h-16 w-16 rounded-xl bg-white p-1 object-contain"
            />
            <div className="text-[30px] font-bold text-white">
              Peak<span className="font-light text-zinc-300">Velocity</span>
            </div>
            <p className="text-zinc-400 text-[15px]">
              Καλώς ήρθες στο μέλλον της φυσικής κατάστασης
            </p>
          </motion.div>

          <TogglePill mode={mode} setMode={setMode} />

          {/* Form fields */}
          <div className="space-y-5">
          <AnimatePresence mode="wait">
            {mode === "signup" && (
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

                <Input
                  icon={MapPin}
                  placeholder="Τοποθεσία (π.χ. Αθήνα, Θεσσαλονίκη...)"
                  value={form.location}
                  onChange={setField("location")}
                />

                <Select
                  icon={ShieldCheck}
                  leftIcon={form.role === "trainer" ? FaUserShield : FaUser}
                  value={form.role}
                  onChange={setField("role")}
                  options={[
                    { label: "Χρήστης", value: "user" },
                    { label: "Εκπαιδευτής/Προπονητής", value: "trainer" },
                  ]}
                />

                {form.role === "trainer" && (
                  <>
                    <CategorySelect
                      value={form.category}
                      onChange={setField("category")}
                    />

                    {form.category && (
                      <div className="space-y-2">
                        <p className="text-[15px] text-zinc-300 font-medium">
                          Ειδικότητες
                        </p>
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
                                onChange={() => toggleSpeciality(sp)}
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
            )}
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
                >
                  {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              }
            />
          </div>

          <SubmitButton disabled={submitting} mode={mode} />

          {mode === "login" && (
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="block w-full text-center text-[15px] text-zinc-500 hover:text-zinc-300 transition-colors py-1"
            >
              Ξέχασες τον κωδικό;
            </button>
          )}

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-base"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <p className="text-center text-[15px] text-zinc-500 pt-2">
            {mode === "login"
              ? "Δεν έχεις λογαριασμό;"
              : "Έχεις ήδη λογαριασμό;"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-zinc-300 hover:text-white font-medium transition-colors"
            >
              {mode === "login" ? "Εγγραφή" : "Σύνδεση"}
            </button>
          </p>
        </motion.form>
      </LayoutGroup>
    </div>
  );
}

/* ------------------ UI bits ------------------ */
const StaticBlobs = () => (
  <>
    <div className="absolute left-1/4 -top-40 w-96 aspect-square rounded-full bg-gradient-to-r from-zinc-600/10 to-gray-700/10 blur-2xl" />
    <div className="absolute -right-40 bottom-10 w-[30rem] aspect-square rounded-full bg-gradient-to-r from-gray-700/10 to-zinc-800/10 blur-2xl" />
  </>
);

function TogglePill({ mode, setMode }) {
  return (
    <div className="flex justify-center pb-2">
      <div className="relative p-1 rounded-2xl bg-black/30 backdrop-blur-sm border border-zinc-700 w-64 flex">
        <motion.span
          layout
          className="absolute inset-y-1 rounded-xl bg-zinc-800 shadow-inner"
          style={{
            width: "calc(50% - 4px)",
            left: mode === "login" ? "4px" : "calc(50% + 4px - 4px)",
          }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        />
        {["login", "signup"].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={`relative flex-1 py-2 text-base rounded-xl z-10 transition-colors
              ${mode === key ? "text-white font-semibold" : "text-gray-300"}`}
          >
            {key === "login" ? "Σύνδεση" : "Εγγραφή"}
          </button>
        ))}
      </div>
    </div>
  );
}

function SubmitButton({ disabled, mode }) {
  return (
    <motion.button
      type="submit"
      disabled={disabled}
      whileHover={!disabled ? { y: -1 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      transition={{ duration: 0.15 }}
      className={`w-full py-4 rounded-xl font-semibold text-white text-base
        transition-all duration-300 flex items-center justify-center gap-2
        ${
          disabled
            ? "bg-zinc-700 opacity-70 cursor-not-allowed"
            : "bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 shadow-lg"
        }`}
    >
      {disabled ? (
        <Loader2 className="animate-spin w-5 h-5" />
      ) : (
        <>
          {mode === "login" ? "Σύνδεση" : "Δημιουργία λογαριασμού"}
          <ArrowRight className="w-5 h-5" />
        </>
      )}
    </motion.button>
  );
}

function Input({ icon: Icon, append, ...props }) {
  return (
    <div className="relative group">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
      <input
        {...props}
        className="w-full pl-10 pr-11 py-4 rounded-xl text-base
           bg-black/30 border border-zinc-700
          text-gray-200 placeholder-zinc-500
          focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500
          transition-all"
      />
      {append && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {append}
        </div>
      )}
    </div>
  );
}

function Select({
  icon: DefaultIcon,
  leftIcon: LeftIcon,
  options = [],
  ...props
}) {
  const IconToUse = LeftIcon || DefaultIcon;
  return (
    <div className="relative group">
      {IconToUse && (
        <IconToUse className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
      )}
      <select
        {...props}
        className="w-full pl-10 pr-8 py-4 rounded-xl text-base
           bg-black/30 border border-zinc-700
          text-gray-200 focus:outline-none focus:ring-1 focus:ring-zinc-500
           focus:border-zinc-500 transition-all appearance-none"
      >
        {options.map((o) => (
          <option
            key={o.value}
            value={o.value}
            className="bg-zinc-800 text-white"
          >
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

function CategorySelect({ value, onChange }) {
  const cat = TRAINER_CATEGORIES.find((c) => c.value === value);
  const LeftIcon = cat?.iconKey ? ICON_BY_KEY[cat.iconKey] : ShieldCheck;

  return (
    <div className="relative group">
      <LeftIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
      <select
        value={value}
        onChange={onChange}
        className="w-full pl-10 pr-8 py-4 rounded-xl text-base
           bg-black/30 border border-zinc-700
          text-gray-200 focus:outline-none focus:ring-1 focus:ring-zinc-500
           focus:border-zinc-500 transition-all appearance-none"
      >
        <option value="" className="bg-zinc-800 text-white">
          — Επίλεξε κατηγορία επαγγελματία —
        </option>
        {TRAINER_CATEGORIES.map((category) => (
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
