"use client";
import React, { useState, useCallback, useEffect } from "react";
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
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
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
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/** Supabase/Auth errors -> Ελληνικά (για modals/toasts) */
function mapAuthErrorToGreek(err) {
  const raw = String(err?.message || "");
  const msg = raw.toLowerCase();
  const status = err?.status ?? err?.statusCode ?? err?.code;

  if (msg.includes("invalid login credentials")) {
    return {
      kind: "invalid_creds",
      title: "Λάθος στοιχεία σύνδεσης",
      message:
        "Το email ή ο κωδικός δεν είναι σωστά. Δοκίμασε ξανά ή κάνε επαναφορά κωδικού.",
    };
  }

  if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
    return {
      kind: "email_not_confirmed",
      title: "Το email δεν έχει επιβεβαιωθεί",
      message:
        "Άνοιξε το email επιβεβαίωσης (δες και τα ανεπιθύμητα/spam) και ολοκλήρωσε την επιβεβαίωση.",
    };
  }

  if (
    status === 429 ||
    msg.includes("too many requests") ||
    msg.includes("rate limit") ||
    msg.includes("try again later")
  ) {
    return {
      kind: "rate_limited",
      title: "Πολλές προσπάθειες",
      message:
        "Έγιναν πολλές προσπάθειες σε λίγο χρόνο. Περίμενε λίγο και δοκίμασε ξανά.",
    };
  }

  if (msg.includes("timed out") || msg.includes("timeout")) {
    return {
      kind: "timeout",
      title: "Καθυστέρηση σύνδεσης",
      message:
        "Η σύνδεση καθυστέρησε. Έλεγξε το internet σου και δοκίμασε ξανά.",
    };
  }

  // fallback
  return {
    kind: "generic",
    title: "Κάτι πήγε στραβά",
    message:
      raw && raw.length < 160
        ? raw
        : "Παρουσιάστηκε πρόβλημα. Δοκίμασε ξανά σε λίγο.",
  };
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
      "Απομακρυσμένο 1-on-1 coaching",
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
      "Δυναμικές δεξιότητες (Muscle-up, Planche)",
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
      "Brazilian Jiu-Jitsu (BJJ)",
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

  const [error, setError] = useState(""); // κρατάμε το state για debug/telemetry
  const [submitting, setSubmitting] = useState(false);
  const [showPw, setShowPw] = useState(false);

  /* ---------- POPUPS (Toasts + Modal) ---------- */
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null);

  // ✅ toasts: info/success μένουν αρκετά, errors είναι sticky (μόνο με X)
  const pushToast = useCallback((t) => {
    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const type = t.type || "info"; // "success" | "error" | "info"

    const durationMs =
      typeof t.durationMs === "number"
        ? t.durationMs
        : type === "error"
        ? 0 // ✅ error stays until closed
        : type === "success"
        ? 6000
        : 8000;

    const toast = {
      id,
      type,
      title: t.title || "",
      message: t.message || "",
      durationMs,
    };

    setToasts((prev) => [toast, ...prev].slice(0, 4));

    if (durationMs > 0) {
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
      }, durationMs);
    }
  }, []);

  const closeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const openModal = useCallback((m) => {
    setModal({
      title: m.title || "",
      message: m.message || "",
      icon: m.icon || "info", // "success" | "error" | "info"
      actions: Array.isArray(m.actions) ? m.actions : [{ label: "ΟΚ" }],
    });
  }, []);

  const closeModal = useCallback(() => setModal(null), []);

  // small “alive” popup όταν αλλάζει login/signup (δεν είναι error)
  useEffect(() => {
    pushToast(
      mode === "signup"
        ? {
            type: "info",
            title: "Εγγραφή",
            message: "Συμπλήρωσε τα στοιχεία σου και προχώρα.",
            durationMs: 8000,
          }
        : {
            type: "info",
            title: "Σύνδεση",
            message: "Συνδέσου για να συνεχίσεις.",
            durationMs: 8000,
          }
    );
  }, [mode, pushToast]);

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
      return "Διάλεξε κατηγορία επαγγελματία.";
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
      const { data, error: profErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (!profErr && data) {
        localStorage.setItem("pv_profile", JSON.stringify(data));
      }
    } catch (_) {}
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);

      // ✅ “limit stuff” => ΜΟΝΙΜΟ modal (δεν φεύγει σε 2s)
      openModal({
        icon: "error",
        title: "Χρειάζονται στοιχεία",
        message: validationError,
        actions: [{ label: "ΟΚ", onClick: closeModal }],
      });

      return;
    }

    setSubmitting(true);

    try {
      if (mode === "login") {
        pushToast({
          type: "info",
          title: "Σύνδεση…",
          message: "Γίνεται έλεγχος στοιχείων.",
          durationMs: 8000,
        });

        const { data, error: loginErr } = await withTimeout(
          supabase.auth.signInWithPassword({
            email: form.email.trim(),
            password: form.password,
          }),
          8000,
          "login"
        );
        if (loginErr) throw loginErr;

        const sess = await persistSession();
        if (sess?.user?.id) persistProfile(sess.user.id); // fire & forget
        refreshProfile().catch(console.error);

        const role =
          data?.user?.user_metadata?.role ??
          JSON.parse(localStorage.getItem("pv_profile") || "{}")?.role ??
          "user";

        pushToast({
          type: "success",
          title: "Έτοιμο",
          message: "Συνδέθηκες επιτυχώς.",
          durationMs: 6000,
        });

        navigate(role === "trainer" ? "/trainer" : "/user", { replace: true });
      } else {
        pushToast({
          type: "info",
          title: "Εγγραφή…",
          message: "Δημιουργούμε τον λογαριασμό σου.",
          durationMs: 8000,
        });

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
          const signMsg = String(signErr?.message || "").toLowerCase();
          if (
            signErr.status === 400 &&
            /registered|exists|used|already/i.test(signMsg)
          ) {
            const msg =
              "Υπάρχει ήδη λογαριασμός με αυτό το email. Παρακαλώ συνδέσου.";
            setError(msg);

            // ✅ ΜΟΝΙΜΟ popup
            openModal({
              icon: "error",
              title: "Υπάρχει ήδη λογαριασμός",
              message: msg,
              actions: [
                {
                  label: "Πήγαινε στη σύνδεση",
                  onClick: () => {
                    closeModal();
                    setMode("login");
                  },
                },
                { label: "ΟΚ", onClick: closeModal },
              ],
            });

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
                  specialty: form.role === "trainer" ? form.category : null,
                  roles: form.role === "trainer" ? form.specialities : [],
                  location: form.location || null,
                },
                { onConflict: "id" }
              ),
            8000,
            "profiles upsert"
          );
        }

        // ✅ ΜΟΝΙΜΟ modal (όχι alert)
        openModal({
          icon: "success",
          title: "Σχεδόν τελείωσες",
          message:
            "Σου στείλαμε email επιβεβαίωσης. Άνοιξε το inbox (και το spam) και πάτησε επιβεβαίωση για να ενεργοποιηθεί ο λογαριασμός σου.",
          actions: [
            { label: "ΟΚ", onClick: closeModal },
            {
              label: "Σύνδεση τώρα",
              onClick: () => {
                closeModal();
                setMode("login");
              },
            },
          ],
        });

        // auto login (αν το project σου το επιτρέπει)
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

        pushToast({
          type: "success",
          title: "Ο λογαριασμός δημιουργήθηκε",
          message: "Σε πάμε στο προφίλ σου.",
          durationMs: 6000,
        });

        navigate(role === "trainer" ? "/trainer" : "/user", { replace: true });
      }
    } catch (err) {
      console.error("Auth error:", err);

      const mapped = mapAuthErrorToGreek(err);
      setError(mapped.message);

      // ✅ αντικαθιστά “Invalid login credentials” + όλα τα auth errors με ΜΟΝΙΜΟ popup
      if (mapped.kind === "invalid_creds") {
        openModal({
          icon: "error",
          title: mapped.title,
          message: mapped.message,
          actions: [
            {
              label: "Επαναφορά κωδικού",
              onClick: () => {
                closeModal();
                navigate("/forgot-password");
              },
            },
            { label: "ΟΚ", onClick: closeModal },
          ],
        });
      } else {
        openModal({
          icon:
            mapped.kind === "email_not_confirmed" ? "info" : "error",
          title: mapped.title,
          message: mapped.message,
          actions: [{ label: "ΟΚ", onClick: closeModal }],
        });
      }

      // optional sticky toast (manual close)
      pushToast({
        type: "error",
        title: mapped.title,
        message: mapped.message,
        durationMs: 0,
      });
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

      {/* ✅ Toast Popups */}
      <ToastViewport toasts={toasts} onClose={closeToast} />

      {/* ✅ Modal Popup */}
      <ModalPopup modal={modal} onClose={closeModal} />

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
              Σύνδεση & εγγραφή — σε λίγα βήματα.
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
                    onChange={(e) => {
                      setField("role")(e);
                      const nextRole = e.target.value;

                      pushToast(
                        nextRole === "trainer"
                          ? {
                              type: "info",
                              title: "Ρόλος: Εκπαιδευτής",
                              message:
                                "Διάλεξε κατηγορία και ειδικότητες για να σε βρίσκουν σωστά οι χρήστες.",
                              durationMs: 8000,
                            }
                          : {
                              type: "info",
                              title: "Ρόλος: Χρήστης",
                              message:
                                "Θα μπορείς να ανακαλύπτεις επαγγελματίες και να κλείνεις συνεδρίες.",
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
                        value={form.category}
                        onChange={(e) => {
                          setField("category")(e);
                          const next = TRAINER_CATEGORIES.find(
                            (c) => c.value === e.target.value
                          );
                          if (next) {
                            pushToast({
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
                          <div className="flex items-center justify-between">
                            <p className="text-[15px] text-zinc-300 font-medium">
                              Ειδικότητες
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                openModal({
                                  icon: "info",
                                  title: "Γιατί ζητάμε ειδικότητες;",
                                  message:
                                    "Οι ειδικότητες βοηθούν τους χρήστες να σε βρίσκουν ακριβώς για αυτό που χρειάζονται. Επίλεξε όσες σε περιγράφουν πραγματικά.",
                                  actions: [{ label: "ΟΚ", onClick: closeModal }],
                                })
                              }
                              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
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
                                    toggleSpeciality(sp);

                                    pushToast({
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
                  aria-label={showPw ? "Απόκρυψη κωδικού" : "Εμφάνιση κωδικού"}
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
              onClick={() =>
                openModal({
                  icon: "info",
                  title: "Επαναφορά κωδικού",
                  message:
                    "Θες να κάνεις επαναφορά κωδικού; Θα σε πάμε στη σελίδα επαναφοράς.",
                  actions: [
                    { label: "Άκυρο", onClick: closeModal },
                    {
                      label: "Συνέχεια",
                      onClick: () => {
                        closeModal();
                        navigate("/forgot-password");
                      },
                    },
                  ],
                })
              }
              className="block w-full text-center text-[15px] text-zinc-500 hover:text-zinc-300 transition-colors py-1"
            >
              Ξέχασες τον κωδικό;
            </button>
          )}

          <p className="text-center text-[15px] text-zinc-500 pt-2">
            {mode === "login" ? "Δεν έχεις λογαριασμό;" : "Έχεις ήδη λογαριασμό;"}{" "}
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

function Select({ icon: DefaultIcon, leftIcon: LeftIcon, options = [], ...props }) {
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

/* ------------------ POPUPS ------------------ */
function ToastViewport({ toasts, onClose }) {
  return (
    <div className="fixed z-[60] top-5 right-5 left-5 sm:left-auto sm:w-[380px] pointer-events-none">
      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <ToastCard key={t.id} toast={t} onClose={() => onClose(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ToastCard({ toast, onClose }) {
  const Icon =
    toast.type === "success"
      ? CheckCircle2
      : toast.type === "error"
      ? AlertTriangle
      : Info;

  const ring =
    toast.type === "success"
      ? "border-emerald-500/25"
      : toast.type === "error"
      ? "border-red-500/25"
      : "border-zinc-500/25";

  const bg =
    toast.type === "success"
      ? "bg-emerald-500/10"
      : toast.type === "error"
      ? "bg-red-500/10"
      : "bg-zinc-500/10";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.18 }}
      className={`pointer-events-auto rounded-2xl border ${ring} ${bg}
                  backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.45)]
                  px-4 py-3`}
    >
      <div className="flex gap-3 items-start">
        <div className="mt-0.5">
          <Icon className="w-5 h-5 text-zinc-200" />
        </div>
        <div className="flex-1">
          {toast.title ? (
            <div className="text-sm font-semibold text-white leading-tight">
              {toast.title}
            </div>
          ) : null}
          <div className="text-sm text-zinc-200/85 leading-snug">
            {toast.message}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-zinc-400 hover:text-white transition-colors"
          aria-label="Κλείσιμο"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

function ModalPopup({ modal, onClose }) {
  return (
    <AnimatePresence>
      {modal ? (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* overlay */}
          <motion.button
            type="button"
            aria-label="Κλείσιμο"
            onClick={onClose}
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* dialog */}
          <motion.div
            initial={{ y: 14, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 14, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
            className="relative w-full max-w-md rounded-3xl border border-zinc-700/50
                       bg-black/55 backdrop-blur-xl shadow-[0_30px_90px_rgba(0,0,0,0.7)]
                       p-6 text-zinc-100"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 text-zinc-400 hover:text-white transition-colors"
              aria-label="Κλείσιμο"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {modal.icon === "success" ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : modal.icon === "error" ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <Info className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1">
                <div className="text-lg font-semibold text-white leading-tight">
                  {modal.title}
                </div>
                <div className="mt-1 text-sm text-zinc-200/85 leading-relaxed">
                  {modal.message}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:justify-end">
              {modal.actions?.map((a, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={a.onClick || onClose}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all
                    ${
                      idx === modal.actions.length - 1
                        ? "bg-zinc-100 text-black hover:bg-white"
                        : "bg-white/5 text-zinc-200 hover:bg-white/10 border border-zinc-700/60"
                    }`}
                >
                  {a.label || "ΟΚ"}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}