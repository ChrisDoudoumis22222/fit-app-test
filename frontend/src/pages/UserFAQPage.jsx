// src/pages/UserFAQPage.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  HelpCircle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Info,
} from "lucide-react";

/* ✅ Add UserMenu */
import UserMenu from "../components/UserMenu";

/* ============================= Config ============================= */
const INITIAL_SHOW = 12;
const BATCH_SIZE = 12;
const DEBOUNCE_MS = 220;

/* ============================= Greek utils ============================= */
const stripCombining = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const norm = (s = "") =>
  stripCombining(String(s).toLowerCase()).replace(/ς/g, "σ").trim();

/** Tiny best-effort Greeklish → Greek */
function greeklishToGreek(input = "") {
  let s = String(input).toLowerCase();
  const digraphs = [
    ["th", "θ"],
    ["ch", "χ"],
    ["ps", "ψ"],
    ["ks", "ξ"],
    ["ou", "ου"],
    ["ai", "αι"],
    ["ei", "ει"],
    ["oi", "οι"],
    ["gh", "γ"],
    ["mp", "μπ"],
    ["nt", "ντ"],
    ["ts", "τσ"],
    ["tz", "τζ"],
  ];
  for (const [g, gr] of digraphs) s = s.replaceAll(g, gr);
  const map = {
    a: "α",
    b: "β",
    c: "κ",
    d: "δ",
    e: "ε",
    f: "φ",
    g: "γ",
    h: "η",
    i: "ι",
    j: "ζ",
    k: "κ",
    l: "λ",
    m: "μ",
    n: "ν",
    o: "ο",
    p: "π",
    q: "κ",
    r: "ρ",
    s: "σ",
    t: "τ",
    u: "υ",
    v: "β",
    w: "ω",
    x: "ξ",
    y: "υ",
    z: "ζ",
    " ": " ",
    "-": "-",
  };
  let out = "";
  for (const ch of s) out += map[ch] ?? ch;
  return out;
}
const normalizeQuery = (q) => {
  const base = norm(q);
  const gl = norm(greeklishToGreek(q));
  return base.length >= gl.length ? base : gl;
};

/* ============================= Data ============================= */
const item = (id, title, category, steps, extra = {}) => ({
  id,
  title,
  category,
  steps,
  ...extra,
});

const CATS = [
  "Ξεκίνημα",
  "Λογαριασμός & Προφίλ",
  "Εξερεύνηση Εκπαιδευτών",
  "Κρατήσεις",
  "Πληρωμές & Επιστροφές",
  "Μηνύματα",
  "Αξιολογήσεις & Αγαπημένα",
  "Ειδοποιήσεις",
  "Ασφάλεια & Απόρρητο",
  "Βοήθεια & Επίλυση",
];

const FAQS = [
  /* =============== Ξεκίνημα =============== */
  item(
    "create-account-user",
    "Πώς δημιουργώ λογαριασμό χρήστη;",
    "Ξεκίνημα",
    [
      "Πάτησε «Σύνδεση/Εγγραφή».",
      "Επίλεξε email ή σύνδεση μέσω Google/Apple.",
      "Επιβεβαίωσε το email (αν ζητηθεί) και ολοκλήρωσε την εγγραφή.",
    ],
    { tags: ["signup", "register", "εγγραφή"] }
  ),
  item(
    "complete-profile-user",
    "Πώς συμπληρώνω το προφίλ μου;",
    "Λογαριασμός & Προφίλ",
    [
      "Μετάβαση: Μενού → Το προφίλ μου.",
      "Συμπλήρωσε όνομα, τοποθεσία, ενδιαφέροντα/στόχους.",
      "Πάτησε «Αποθήκευση».",
    ],
    { tags: ["profile", "bio", "στοιχεία"] }
  ),
  item(
    "change-avatar-user",
    "Πώς αλλάζω φωτογραφία προφίλ;",
    "Λογαριασμός & Προφίλ",
    [
      "Μετάβαση: Μενού → Το προφίλ μου.",
      "Πάτησε πάνω στη φωτογραφία → «Ανέβασμα» και επίλεξε εικόνα.",
      "Προσαρμόζεις/Κόβεις (αν υπάρχει επιλογή) → «Αποθήκευση».",
    ],
    { tags: ["avatar", "photo", "εικόνα"] }
  ),
  item(
    "language-currency",
    "Πώς αλλάζω γλώσσα ή νόμισμα;",
    "Λογαριασμός & Προφίλ",
    [
      "Μετάβαση: Ρυθμίσεις → Γλώσσα & Νόμισμα.",
      "Επίλεξε προτίμηση εμφάνισης.",
      "«Αποθήκευση».",
    ],
    { tags: ["language", "currency", "localization"] }
  ),

  /* =============== Εξερεύνηση Εκπαιδευτών =============== */
  item(
    "discover-trainers",
    "Πώς βρίσκω εκπαιδευτή;",
    "Εξερεύνηση Εκπαιδευτών",
    [
      "Μετάβαση: Αναζήτηση/Εξερεύνηση.",
      "Φίλτραρε ανά ειδικότητα (π.χ. Personal Training, Yoga), τοποθεσία, online/διά ζώσης.",
      "Άνοιξε το προφίλ για πληροφορίες, κριτικές και διαθέσιμες ώρες.",
    ],
    { tags: ["search", "filters", "εξερεύνηση"] }
  ),
  item(
    "view-availability",
    "Πώς βλέπω τις διαθέσιμες ώρες ενός εκπαιδευτή;",
    "Εξερεύνηση Εκπαιδευτών",
    [
      "Άνοιξε το προφίλ του εκπαιδευτή.",
      "Στην ενότητα «Κράτηση», επέλεξε υπηρεσία και ημερομηνία.",
      "Τα διαθέσιμα slots εμφανίζονται αυτόματα στο ημερολόγιο.",
    ],
    { tags: ["availability", "slots", "calendar"] }
  ),

  /* =============== Κρατήσεις =============== */
  item(
    "make-booking",
    "Πώς κάνω κράτηση;",
    "Κρατήσεις",
    [
      "Μέσα από το προφίλ εκπαιδευτή: επίλεξε υπηρεσία.",
      "Διάλεξε ημερομηνία/ώρα και συμπλήρωσε τα στοιχεία σου.",
      "Επίλεξε τρόπο πληρωμής (αν απαιτείται) → «Επιβεβαίωση».",
      "Θα λάβεις επιβεβαίωση/ειδοποίηση για την αίτησή σου.",
    ],
    { tags: ["booking", "reserve", "ραντεβού"] }
  ),
  item(
    "booking-status",
    "Πώς βλέπω αν ο εκπαιδευτής αποδέχτηκε την κράτηση;",
    "Κρατήσεις",
    [
      "Μετάβαση: Μενού → Οι Κρατήσεις μου.",
      "Άνοιξε τη συγκεκριμένη κράτηση: η κατάσταση εμφανίζεται ως «Σε εκκρεμότητα», «Εγκεκριμένη» ή «Απορρίφθηκε».",
      "Θα λάβεις και ειδοποίηση (email/Push) όταν αλλάξει η κατάσταση.",
    ],
    { tags: ["status", "accepted", "pending", "approve"] }
  ),
  item(
    "booking-details",
    "Πού βλέπω λεπτομέρειες κράτησης (τοποθεσία, σημειώσεις, link);",
    "Κρατήσεις",
    [
      "Μενού → Οι Κρατήσεις μου → επίλεξε κράτηση.",
      "Θα δεις διεύθυνση στο χάρτη ή link για online συνεδρία.",
      "Μπορείς να προσθέσεις την κράτηση στο προσωπικό σου ημερολόγιο (Google/Apple/Outlook).",
    ],
    { tags: ["details", "location", "video link", "calendar"] }
  ),
  item(
    "reschedule",
    "Πώς κάνω αναπρογραμματισμό;",
    "Κρατήσεις",
    [
      "Μενού → Οι Κρατήσεις μου → επίλεξε κράτηση.",
      "Πάτησε «Αναπρογραμματισμός» και διάλεξε νέο slot.",
      "Ο εκπαιδευτής ενημερώνεται αυτόματα και θα δεις νέα κατάσταση.",
    ],
    { tags: ["reschedule", "change time"] }
  ),
  item(
    "cancel-booking",
    "Πώς ακυρώνω κράτηση;",
    "Κρατήσεις",
    [
      "Μενού → Οι Κρατήσεις μου → επίλεξε κράτηση.",
      "Πάτησε «Ακύρωση» και επιβεβαίωσε.",
      "Ισχύουν οι πολιτικές ακύρωσης της υπηρεσίας (δες πριν την επιβεβαίωση).",
    ],
    { tags: ["cancel", "policy", "ακυρωση"] }
  ),
  item(
    "join-online",
    "Πώς συνδέομαι σε online συνεδρία;",
    "Κρατήσεις",
    [
      "Άνοιξε την εγκεκριμένη κράτηση από «Οι Κρατήσεις μου».",
      "Πάτησε το κουμπί «Σύνδεση» (Zoom/Meet κ.λπ.) την ώρα της συνεδρίας.",
      "Πρόσθεσε την κράτηση στο ημερολόγιό σου για υπενθύμιση.",
    ],
    { tags: ["online", "zoom", "meet", "link"] }
  ),

  /* =============== Πληρωμές & Επιστροφές =============== */
  item(
    "how-to-pay",
    "Πώς πληρώνω για μια συνεδρία;",
    "Πληρωμές & Επιστροφές",
    [
      "Ανάλογα με τον εκπαιδευτή: κάρτα online, μετρητά επιτόπου ή άλλη μέθοδος.",
      "Οι διαθέσιμοι τρόποι φαίνονται στη σελίδα κράτησης.",
      "Θα λάβεις απόδειξη/επιβεβαίωση πληρωμής στο email σου (αν ισχύει).",
    ],
    { tags: ["payment", "card", "cash"] }
  ),
  item(
    "refunds-user",
    "Πώς λειτουργούν οι επιστροφές χρημάτων;",
    "Πληρωμές & Επιστροφές",
    [
      "Άνοιξε την κράτηση και επίλεξε «Αίτημα Επιστροφής» (αν διαθέσιμο).",
      "Ο εκπαιδευτής/σύστημα εξετάζει το αίτημα με βάση την πολιτική ακύρωσης.",
      "Θα ενημερωθείς για έγκριση και χρόνο επιστροφής στο μέσο πληρωμής.",
    ],
    { tags: ["refund", "επιστροφη", "χρηματα"] }
  ),
  item(
    "receipts",
    "Πού βρίσκω αποδείξεις/ιστορικό πληρωμών;",
    "Πληρωμές & Επιστροφές",
    [
      "Μενού → Πληρωμές ή Ιστορικό.",
      "Επίλεξε περίοδο και κατέβασε αποδείξεις/τιμολόγια (αν παρέχονται).",
      "Θα βρεις επίσης συνδέσμους μέσα σε κάθε κράτηση.",
    ],
    { tags: ["receipt", "invoice", "ιστορικο"] }
  ),

  /* =============== Μηνύματα =============== */
  item(
    "message-trainer",
    "Πώς στέλνω μήνυμα σε εκπαιδευτή;",
    "Μηνύματα",
    [
      "Άνοιξε το προφίλ του εκπαιδευτή και πάτησε «Μήνυμα».",
      "Ή από μια κράτηση: «Άνοιγμα Συνομιλίας».",
      "Στείλε κείμενο/αρχεία με ερωτήσεις ή οδηγίες.",
    ],
    { tags: ["chat", "dm", "επικοινωνια"] }
  ),
  item(
    "mute-chat",
    "Μπορώ να σίγαση/κλείσω ειδοποιήσεις για μια συνομιλία;",
    "Μηνύματα",
    [
      "Άνοιξε τη συνομιλία.",
      "Μενού συνομιλίας → «Σίγαση» για καθορισμένο διάστημα.",
      "Μπορείς να το αναιρέσεις ανά πάσα στιγμή.",
    ],
    { tags: ["mute", "notifications", "chat"] }
  ),

  /* =============== Αξιολογήσεις & Αγαπημένα =============== */
  item(
    "leave-review",
    "Πώς αφήνω αξιολόγηση σε εκπαιδευτή;",
    "Αξιολογήσεις & Αγαπημένα",
    [
      "Μετά την ολοκλήρωση μιας συνεδρίας, θα εμφανιστεί ειδοποίηση για κριτική.",
      "Μετάβαση: Μενού → Οι Κρατήσεις μου → επίλεξε τη συνεδρία → «Αξιολόγηση».",
      "Βαθμολόγησε (αστέρια) και γράψε σύντομο σχόλιο.",
    ],
    { tags: ["review", "rating", "κριτικη"] }
  ),
  item(
    "favorite-trainer",
    "Πώς αποθηκεύω εκπαιδευτές στα Αγαπημένα;",
    "Αξιολογήσεις & Αγαπημένα",
    [
      "Στο προφίλ εκπαιδευτή, πάτησε το εικονίδιο «❤» ή «Προσθήκη στα Αγαπημένα».",
      "Μενού → Αγαπημένα για να δεις και να διαχειριστείς τη λίστα.",
      "Λαμβάνεις γρηγορότερα ενημερώσεις & διαθέσιμες ώρες.",
    ],
    { tags: ["favorites", "like", "save"] }
  ),

  /* =============== Ειδοποιήσεις =============== */
  item(
    "notifications-user",
    "Πώς ρυθμίζω ειδοποιήσεις (email/Push/SMS);",
    "Ειδοποιήσεις",
    [
      "Μετάβαση: Ρυθμίσεις → Ειδοποιήσεις.",
      "Ενεργοποίησε κατηγορίες (νέες απαντήσεις, αλλαγές κράτησης, υπενθυμίσεις).",
      "«Αποθήκευση».",
    ],
    { tags: ["push", "email", "sms"] }
  ),

  /* =============== Ασφάλεια & Απόρρητο =============== */
  item(
    "security-user",
    "Πώς αλλάζω email/κωδικό και ενεργοποιώ 2FA;",
    "Ασφάλεια & Απόρρητο",
    [
      "Μετάβαση: Ρυθμίσεις Λογαριασμού.",
      "Άλλαξε email (με επιβεβαίωση) ή κωδικό με ισχυρά κριτήρια.",
      "Ρυθμίσεις Ασφάλειας → Ενεργοποίηση 2FA (app ή SMS).",
    ],
    { tags: ["password", "2fa", "ασφαλεια"] }
  ),
  item(
    "privacy-user",
    "Πώς διαχειρίζομαι τα δεδομένα μου (εξαγωγή/διαγραφή);",
    "Ασφάλεια & Απόρρητο",
    [
      "Μετάβαση: Ρυθμίσεις → Απόρρητο & Δεδομένα.",
      "Ζήτα αντίγραφο (εξαγωγή) ή μόνιμη διαγραφή λογαριασμού.",
      "Θα λάβεις σχετική ενημέρωση email με οδηγίες.",
    ],
    { tags: ["privacy", "gdpr", "export", "delete"] }
  ),

  /* =============== Βοήθεια & Επίλυση =============== */
  item(
    "no-slots-user",
    "Δεν βλέπω διαθέσιμα slots – τι κάνω;",
    "Βοήθεια & Επίλυση",
    [
      "Δοκίμασε άλλη ημερομηνία/υπηρεσία ή επίλεξε «online».",
      "Κάποιοι εκπαιδευτές εγκρίνουν χειροκίνητα – στείλε μήνυμα για διαθεσιμότητα.",
      "Έλεγξε αν υπάρχουν αργίες/εξαιρέσεις στο προφίλ εκπαιδευτή.",
    ],
    { tags: ["slots", "availability", "troubleshooting"] }
  ),
  item(
    "no-email-user",
    "Δεν έλαβα email επιβεβαίωσης.",
    "Βοήθεια & Επίλυση",
    [
      "Κοίτα στον φάκελο ανεπιθύμητα/Spam.",
      "Έλεγξε ότι το email σου είναι σωστό στις Ρυθμίσεις.",
      "Χρησιμοποίησε ξανά «Αποστολή επιβεβαίωσης» από τη σχετική οθόνη.",
    ],
    { tags: ["email", "confirm", "spam"] }
  ),
  item(
    "payment-failed",
    "Απέτυχε η πληρωμή μου.",
    "Βοήθεια & Επίλυση",
    [
      "Δοκίμασε άλλη κάρτα ή μέθοδο (αν υπάρχει).",
      "Έλεγξε υπόλοιπο/όρια κάρτας και 3D Secure (ισχυρή ταυτοποίηση).",
      "Αν επιμένει, επικοινώνησε με την τράπεζα ή την υποστήριξη.",
    ],
    { tags: ["payment", "3ds", "card"] }
  ),
  item(
    "contact-support-user",
    "Πώς επικοινωνώ με υποστήριξη;",
    "Βοήθεια & Επίλυση",
    [
      "Μενού → Βοήθεια/Υποστήριξη.",
      "Δώσε περιγραφή προβλήματος, screenshots και κωδικό κράτησης (αν υπάρχει).",
      "Θα λάβεις απάντηση με email εντός 24–48 ωρών.",
    ],
    { tags: ["support", "help", "ticket"] }
  ),
];

/* ============================= Small hooks/components ============================= */
const CategoryChips = ({ categories, active, onToggle }) => (
  <div
    className="flex sm:flex-wrap flex-nowrap gap-2 overflow-x-auto -mx-2 px-2"
    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
  >
    <button
      onClick={() => onToggle(null)}
      className={`px-3 py-1.5 text-sm rounded-xl border ${
        active === null
          ? "bg-white text-black border-white"
          : "bg-transparent text-zinc-300 border-white/20 hover:bg-white/10"
      }`}
    >
      Όλα
    </button>
    {categories.map((c) => (
      <button
        key={c}
        onClick={() => onToggle(active === c ? null : c)}
        className={`px-3 py-1.5 text-sm rounded-xl border ${
          active === c
            ? "bg-white text-black border-white"
            : "bg-transparent text-zinc-300 border-white/20 hover:bg-white/10"
        }`}
      >
        {c}
      </button>
    ))}
  </div>
);

function useDebouncedValue(value, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const FaqItem = ({ item, open, onToggle, onCopyLink }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className={`rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/60 to-black/60 backdrop-blur-xl overflow-hidden ${
      open ? "ring-1 ring-white/20" : ""
    }`}
    id={item.id}
  >
    <button
      onClick={() => onToggle(item.id)}
      className="w-full text-left px-4 sm:px-6 py-4 sm:py-5 flex items-start gap-3"
    >
      <div className="p-2 rounded-lg bg-white/10">
        <HelpCircle className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-base sm:text-lg font-semibold text-white">
          {item.title}
        </h3>
        <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">{item.category}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          title="Αντιγραφή συνδέσμου"
          onClick={(e) => {
            e.stopPropagation();
            onCopyLink(item.id);
          }}
          className="p-2 rounded-lg hover:bg-white/10 text-zinc-300"
        >
          <LinkIcon className="h-4 w-4" />
        </button>
        {open ? (
          <ChevronUp className="h-5 w-5 text-zinc-300" />
        ) : (
          <ChevronDown className="h-5 w-5 text-zinc-300" />
        )}
      </div>
    </button>

    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="body"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-4 sm:px-6 pb-5"
        >
          <ul className="list-disc pl-6 text-zinc-200 space-y-2">
            {item.steps.map((s, i) => (
              <li key={i} className="leading-relaxed">
                {s}
              </li>
            ))}
          </ul>
          {item.note && (
            <div className="mt-4 flex items-start gap-2 text-xs sm:text-sm text-zinc-300">
              <Info className="h-4 w-4 mt-0.5" />
              <span>{item.note}</span>
            </div>
          )}
          {item.tags?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {item.tags.map((t) => (
                <span
                  key={t}
                  className="text-[11px] uppercase tracking-wide px-2 py-1 rounded-md border border-white/10 text-zinc-400"
                >
                  #{t}
                </span>
              ))}
            </div>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
);

/* ============================= Page ============================= */
export default function UserFAQPage() {
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState(null);
  const [visible, setVisible] = useState(INITIAL_SHOW);
  const [expandedSet, setExpandedSet] = useState(() => new Set());
  const debouncedQ = useDebouncedValue(q, DEBOUNCE_MS);
  const sentinelRef = useRef(null);

  // One-time halo/layout CSS
  useEffect(() => {
    const css = document.createElement("style");
    css.innerHTML = `
      :root { --nav-h: 64px; }
      @media (min-width: 640px){ :root { --nav-h: 72px; } }
      @property --angle { syntax: "<angle>"; inherits: false; initial-value: 0deg; }
      @keyframes halo-spin { to { --angle: 360deg; } }
      .halo{ position: relative; isolation: isolate; }
      .halo::before{
        content:""; position:absolute; inset:-3px; border-radius:inherit; padding:3px;
        background: conic-gradient(from var(--angle),
          rgba(255,255,255,0.92) 0%, rgba(190,190,190,0.28) 18%,
          rgba(255,255,255,0.92) 36%, rgba(190,190,190,0.28) 54%,
          rgba(255,255,255,0.92) 72%, rgba(190,190,190,0.28) 90%,
          rgba(255,255,255,0.92) 100%);
        -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        -webkit-mask-composite: xor; mask-composite: exclude;
        animation: halo-spin 8s linear infinite; opacity:.85; z-index:-1; pointer-events:none;
      }
      .halo::after{
        content:""; position:absolute; inset:-12px; border-radius:inherit;
        background: radial-gradient(closest-side, rgba(255,255,255,0.18), rgba(255,255,255,0.06) 40%, transparent 70%);
        filter: blur(8px); z-index:-2; pointer-events:none;
      }`;
    document.head.appendChild(css);
    return () => document.head.removeChild(css);
  }, []);

  // Prefill from URL ?q=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialQ = params.get("q");
    if (initialQ) setQ(initialQ);
  }, []);

  // Open by #hash (after mount)
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    setTimeout(() => {
      setExpandedSet((prev) => new Set(prev).add(hash));
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }, []);

  const normalizedQuery = useMemo(
    () => normalizeQuery(debouncedQ),
    [debouncedQ]
  );

  const filtered = useMemo(() => {
    let list = FAQS;
    if (activeCat) list = list.filter((i) => i.category === activeCat);
    if (normalizedQuery) {
      const nq = normalizedQuery;
      list = list.filter((i) => {
        const hay = norm(
          `${i.title} ${i.category} ${i.steps.join(" ")} ${(i.tags || []).join(
            " "
          )}`
        );
        return hay.includes(nq);
      });
    }
    return list;
  }, [activeCat, normalizedQuery]);

  // Lazy load sentinel
  useEffect(() => {
    if (!sentinelRef.current) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting)
            setVisible((v) => Math.min(v + BATCH_SIZE, filtered.length));
        }),
      { rootMargin: "300px" }
    );
    io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, [filtered.length]);

  const toRender = normalizedQuery ? filtered : filtered.slice(0, visible);

  const handleToggle = (id) => {
    const next = new Set(expandedSet);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedSet(next);
  };

  const handleCopyLink = async (id) => {
    try {
      const url = `${window.location.origin}${window.location.pathname}#${id}`;
      await navigator.clipboard.writeText(url);
    } catch {
      /* noop */
    }
  };

  const clearSearch = () => setQ("");

  return (
    <>
      {/* ✅ UserMenu renders side-rail (desktop) + mobile bars when logged in */}
      <UserMenu />

      {/* Page content with rail-aware left padding + mobile top padding */}
      <div className="relative min-h-screen text-gray-100 pl-[calc(var(--side-w)+4px)] lg:pt-0">
        {/* Background */}
        <div className="fixed inset-0 -z-50 bg-black">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.10),transparent_55%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>

        <div className="lg:pt-0 pt-[var(--nav-h)] transition-[padding]">
          <main className="mx-auto max-w-6xl w-full p-4 sm:p-6 space-y-8 pb-24">
            {/* Header */}
            <motion.header
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
                  Peak Velocity — Συχνές Ερωτήσεις Χρηστών
                </h1>
                <p className="text-zinc-300">
                  Ό,τι χρειάζεσαι για λογαριασμό, κρατήσεις, πληρωμές και
                  επικοινωνία με εκπαιδευτές.
                </p>
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <BookOpen className="h-4 w-4" />
                  <span>Οδηγός χρήσης • Ενημερώνεται τακτικά</span>
                </div>
              </div>
            </motion.header>

            {/* Search + categories */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/60 to-black/60 backdrop-blur-xl p-4 sm:p-6 halo"
            >
              <div className="relative">
                <Search className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Αναζήτηση (π.χ. κράτηση, προφίλ, πληρωμή)…"
                  className="w-full pl-10 pr-10 py-3 rounded-2xl bg-zinc-900/50 border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20"
                />
                {q && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-white/10"
                  >
                    <X className="h-4 w-4 text-zinc-400" />
                  </button>
                )}
              </div>

              <div className="mt-4">
                <CategoryChips
                  categories={CATS}
                  active={activeCat}
                  onToggle={setActiveCat}
                />
              </div>
            </motion.div>

            {/* Results header */}
            <div className="text-sm text-zinc-400">
              Βρέθηκαν{" "}
              <span className="text-zinc-200 font-semibold">
                {filtered.length}
              </span>{" "}
              άρθρα βοήθειας
              {activeCat && (
                <>
                  {" "}
                  στην κατηγορία{" "}
                  <span className="text-zinc-200">{activeCat}</span>
                </>
              )}
              {normalizeQuery(q) && (
                <>
                  {" "}
                  για «<span className="text-zinc-200">{q}</span>»
                </>
              )}
            </div>

            {/* FAQ list */}
            {toRender.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/60 to-black/60 p-6 text-center text-zinc-300">
                Δεν βρέθηκαν αποτελέσματα. Δοκίμασε λέξεις όπως{" "}
                <span className="text-zinc-200">«κρατήσεις»</span>,{" "}
                <span className="text-zinc-200">«πληρωμές»</span>,{" "}
                <span className="text-zinc-200">«προφίλ»</span>.
                <div className="mt-4">
                  <button
                    onClick={() => {
                      setQ("");
                      setActiveCat(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-white/20 hover:bg-white/10"
                  >
                    Εκκαθάριση φίλτρων
                  </button>
                </div>
              </div>
            ) : (
              <>
                <section className="grid grid-cols-1 gap-4">
                  {toRender.map((it) => (
                    <FaqItem
                      key={it.id}
                      item={it}
                      open={expandedSet.has(it.id)}
                      onToggle={handleToggle}
                      onCopyLink={handleCopyLink}
                    />
                  ))}
                </section>

                {/* Lazy sentinel */}
                {!normalizeQuery(q) && filtered.length > visible && (
                  <div ref={sentinelRef} className="h-10" />
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
