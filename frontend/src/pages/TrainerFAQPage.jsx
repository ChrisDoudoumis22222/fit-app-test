// src/pages/TrainerFAQPage.jsx
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
  Filter,
  RefreshCw,
  CheckCircle2,
  Info,
  Sparkles,
} from "lucide-react";
import TrainerMenu from "../components/TrainerMenu";
import { useAuth } from "../AuthProvider"; // <-- NEW: detect trainer vs public

/* ============================= Config ============================= */
const INITIAL_SHOW = 12;
const BATCH_SIZE = 12;
const DEBOUNCE_MS = 220;

/* ============================= Greek utils ============================= */
const stripCombining = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const norm = (s = "") => stripCombining(String(s).toLowerCase()).replace(/ς/g, "σ").trim();

/** Tiny best-effort Greeklish → Greek */
function greeklishToGreek(input = "") {
  let s = String(input).toLowerCase();
  const digraphs = [
    ["th", "θ"], ["ch", "χ"], ["ps", "ψ"], ["ks", "ξ"], ["ou", "ου"], ["ai", "αι"], ["ei", "ει"],
    ["oi", "οι"], ["gh", "γ"], ["mp", "μπ"], ["nt", "ντ"], ["ts", "τσ"], ["tz", "τζ"],
  ];
  for (const [g, gr] of digraphs) s = s.replaceAll(g, gr);
  const map = { a:"α", b:"β", c:"κ", d:"δ", e:"ε", f:"φ", g:"γ", h:"η", i:"ι", j:"ζ", k:"κ", l:"λ", m:"μ", n:"ν", o:"ο", p:"π", q:"κ", r:"ρ", s:"σ", t:"τ", u:"υ", v:"β", w:"ω", x:"ξ", y:"υ", z:"ζ", " ":" ", "-":"-" };
  let out = ""; for (const ch of s) out += map[ch] ?? ch; return out;
}
const normalizeQuery = (q) => {
  const base = norm(q);
  const gl = norm(greeklishToGreek(q));
  return base.length >= gl.length ? base : gl;
};

/* ============================= Data ============================= */
const item = (id, title, category, steps, extra = {}) => ({ id, title, category, steps, ...extra });

const CATS = [
  "Ξεκίνημα","Προφίλ & Επαλήθευση","Υπηρεσίες & Τιμές","Διαθεσιμότητα & Ημερολόγιο","Κρατήσεις",
  "Μηνύματα","Περιεχόμενο (Posts)","Πληρωμές & Εκκαθαρίσεις","Αξιολογήσεις","Αναφορές & Analytics",
  "Ειδοποιήσεις","Ασφάλεια Λογαριασμού","Βοήθεια & Επίλυση",
];

const FAQS = [
  item("create-account","Πώς δημιουργώ λογαριασμό εκπαιδευτή;","Ξεκίνημα",[
    "Κάνε σύνδεση/εγγραφή και επέλεξε «Είμαι Εκπαιδευτής».","Συμπλήρωσε όνομα, email και ισχυρό κωδικό.",
    "Επιβεβαίωσε το email από το μήνυμα που θα λάβεις.",
  ],{ tags:["εγγραφή","signup","onboarding"] }),
  item("complete-profile","Πώς συμπληρώνω το προφίλ μου (βιογραφικό, ειδικότητες, avatar);","Προφίλ & Επαλήθευση",[
    "Μετάβαση: Μενού → Προφίλ.","Πρόσθεσε φωτογραφία, σύντομο βιογραφικό, ειδικότητες και τοποθεσία.","Πάτησε «Αποθήκευση».",
  ],{ tags:["avatar","ειδικότητες","bio"] }),
  item("verify-trainer","Πώς γίνεται η επαλήθευση εκπαιδευτή;","Προφίλ & Επαλήθευση",[
    "Μετάβαση: Προφίλ → Επαλήθευση.","Ανέβασε τα ζητούμενα δικαιολογητικά (ταυτότητα, ΑΦΜ/επαγγελματικό).",
    "Θα ενημερωθείς με ειδοποίηση μόλις ολοκληρωθεί ο έλεγχος.",
  ],{ tags:["verification","ταυτοποίηση","kyc"] }),
  item("add-services","Πώς προσθέτω υπηρεσίες & τιμές;","Υπηρεσίες & Τιμές",[
    "Μετάβαση: Μενού → Υπηρεσίες.","Πρόσθεσε νέα υπηρεσία (τίτλος, περιγραφή, διάρκεια).",
    "Όρισε τιμή, νόμισμα και πολιτική ακύρωσης.","«Αποθήκευση».",
  ],{ tags:["services","pricing","τιμοκατάλογος"] }),
  item("packages","Πώς δημιουργώ πακέτα μαθημάτων;","Υπηρεσίες & Τιμές",[
    "Στην καρτέλα Υπηρεσίες, επίλεξε «Νέο Πακέτο».","Καθόρισε αριθμό συνεδριών, συνολική τιμή και ισχύ.",
    "Ενεργοποίησε την προβολή στο προφίλ σου.",
  ],{ tags:["bundles","πακέτα","multi-session"] }),
  item("set-availability","Πώς ρυθμίζω τη διαθεσιμότητά μου;","Διαθεσιμότητα & Ημερολόγιο",[
    "Μετάβαση: Μενού → Ημερολόγιο.","Κάνε κλικ στις ημέρες/ώρες για να ορίσεις διαθέσιμα slots.",
    "Πρόσθεσε εξαιρέσεις (αργίες, ρεπό).","«Αποθήκευση».",
  ],{ tags:["calendar","slots","availability"] }),
  item("sync-calendar","Πώς συγχρονίζω εξωτερικό ημερολόγιο (Google/Apple/Outlook);","Διαθεσιμότητα & Ημερολόγιο",[
    "Μετάβαση: Ημερολόγιο → Ρυθμίσεις Συγχρονισμού.","Σύνδεσε τον λογαριασμό σου και επίλεξε ημερολόγια.",
    "Επίλεξε μονής ή διπλής κατεύθυνσης συγχρονισμό.",
  ],{ tags:["sync","google calendar","outlook","ics"] }),
  item("receive-bookings","Πώς λαμβάνω κρατήσεις από πελάτες;","Κρατήσεις",[
    "Βεβαιώσου ότι έχεις υπηρεσίες + διαθεσιμότητα ενεργές.","Δώσε το δημόσιο προφίλ/σελίδα κρατήσεών σου στους πελάτες.",
    "Οι πελάτες επιλέγουν slot, συμπληρώνουν στοιχεία και ολοκληρώνουν κράτηση.",
  ],{ tags:["booking","reserve","ραντεβού"] }),
  item("manage-bookings","Πώς διαχειρίζομαι/εγκρίνω/ακυρώνω κρατήσεις;","Κρατήσεις",[
    "Μετάβαση: Μενού → Κρατήσεις.","Άνοιξε την κράτηση για «Έγκριση», «Ακύρωση» ή «Αναπρογραμματισμό».",
    "Οι ειδοποιήσεις αποστέλλονται αυτόματα στον πελάτη.",
  ],{ tags:["approve","cancel","reschedule"] }),
  item("no-show-policy","Πώς ορίζω πολιτική καθυστέρησης/μη εμφάνισης (No-Show);","Κρατήσεις",[
    "Μετάβαση: Υπηρεσίες → Πολιτικές.","Όρισε χρόνο χάριτος (π.χ. 10') και χρεώσεις No-Show.","«Αποθήκευση».",
  ],{ tags:["no show","policy","ακυρωτική"] }),
  item("use-messages","Πώς επικοινωνώ με τους πελάτες (Μηνύματα/DM);","Μηνύματα",[
    "Μετάβαση: Μενού → Μηνύματα.","Επίλεξε συζήτηση ή άνοιξε νέα από την κράτηση.","Στείλε κείμενο, αρχεία/πρόγραμμα, έτοιμες απαντήσεις.",
  ],{ tags:["chat","dm","supporting files"] }),
  item("create-post","Πώς ανεβάζω Posts (περιεχόμενο, φωτογραφίες, βίντεο);","Περιεχόμενο (Posts)",[
    "Μετάβαση: Οι Αναρτήσεις μου.","Πρόσθεσε τίτλο, περιγραφή και εικόνες/βίντεο.","Προεπισκόπηση → Δημοσίευση.",
  ],{ tags:["content","feed","media upload"] }),
  item("edit-post","Πώς επεξεργάζομαι ή διαγράφω Post;","Περιεχόμενο (Posts)",[
    "Άνοιξε το Post από το grid.","Επίλεξε «Επεξεργασία» για αλλαγές ή «Διαγραφή».","Οι αλλαγές αποθηκεύονται και ενημερώνεται το κοινό σου.",
  ],{ tags:["update","delete","posts"] }),
  item("connect-payouts","Πώς συνδέω λογαριασμό πληρωμών & λαμβάνω εκκαθαρίσεις;","Πληρωμές & Εκκαθαρίσεις",[
    "Μετάβαση: Μενού → Πληρωμές.","Συνδέσου με τον πάροχο πληρωμών (π.χ. Stripe Connect).",
    "Επιβεβαίωσε στοιχεία και ολοκλήρωσε KYC.","Τα έσοδα εκκαθαρίζονται σύμφωνα με την πολιτική του παρόχου.",
  ],{ tags:["stripe","iban","payouts","εκκαθάριση"] }),
  item("refunds","Πώς λειτουργούν οι επιστροφές χρημάτων;","Πληρωμές & Εκκαθαρίσεις",[
    "Άνοιξε την κράτηση → «Επιστροφή».","Επίλεξε ολική ή μερική επιστροφή και αιτιολογία.","Ο πελάτης ενημερώνεται αυτόματα.",
  ],{ tags:["refund","dispute","chargeback"] }),
  item("reviews","Πώς λαμβάνω και απαντώ σε αξιολογήσεις;","Αξιολογήσεις",[
    "Μετά την ολοκλήρωση συνεδρίας, ζητείται αξιολόγηση πελάτη.","Προβολή: Μενού → Αξιολογήσεις.",
    "Μπορείς να απαντήσεις δημόσια σε κάθε κριτική.",
  ],{ tags:["stars","feedback","reputation"] }),
  item("analytics","Πού βλέπω στατιστικά & απόδοση;","Αναφορές & Analytics",[
    "Μετάβαση: Μενού → Αναφορές.","Δες κρατήσεις/έσοδα ανά περίοδο, ποσοστά πληρότητας και κορυφαίες υπηρεσίες.",
    "Εξαγωγή CSV/PDF από το ίδιο σημείο.",
  ],{ tags:["reports","stats","insights"] }),
  item("notifications","Πώς ρυθμίζω ειδοποιήσεις (email/Push/SMS);","Ειδοποιήσεις",[
    "Μετάβαση: Μενού → Ρυθμίσεις → Ειδοποιήσεις.","Ενεργοποίησε τα κανάλια που θέλεις και τους κανόνες (π.χ. νέες κρατήσεις, αλλαγές).","«Αποθήκευση».",
  ],{ tags:["emails","push","sms"] }),
  item("two-factor","Πώς ενεργοποιώ Διπλή Επαλήθευση (2FA);","Ασφάλεια Λογαριασμού",[
    "Μετάβαση: Ρυθμίσεις Ασφάλειας.","Επίλεξε εφαρμογή αυθεντικοποίησης ή SMS.","Σκάναρε το QR/καταχώρησε κωδικό και αποθήκευσε τα backup codes.",
  ],{ tags:["2fa","ασφάλεια","otp"] }),
  item("change-email-pass","Πώς αλλάζω email ή κωδικό;","Ασφάλεια Λογαριασμού",[
    "Μετάβαση: Ρυθμίσεις Λογαριασμού.","Ενημέρωσε email (με επιβεβαίωση) ή άλλαξε κωδικό με ισχυρά κριτήρια.","«Αποθήκευση».",
  ],{ tags:["password","credentials"] }),
  item("troubleshooting-booking","Γιατί δεν εμφανίζονται διαθέσιμα slots;","Βοήθεια & Επίλυση",[
    "Έλεγξε αν έχεις ορίσει διαθεσιμότητα στο Ημερολόγιο.","Δες αν υπάρχει σύγκρουση με εξωτερικό συγχρονισμό (busy events).",
    "Βεβαιώσου ότι η υπηρεσία είναι «Ενεργή».",
  ],{ tags:["slots","availability","calendar issues"] }),
  item("contact-support","Πώς επικοινωνώ με υποστήριξη;","Βοήθεια & Επίλυση",[
    "Μενού → Βοήθεια/Υποστήριξη.","Άνοιξε αίτημα με περιγραφή, screenshots και id κράτησης (αν υπάρχει).",
    "Θα λάβεις ενημέρωση εντός 24–48 ωρών.",
  ],{ tags:["support","ticket","βοήθεια"] }),
  item("group-sessions","Πώς δημιουργώ ομαδικές συνεδρίες (group classes);","Υπηρεσίες & Τιμές",[
    "Υπηρεσίες → Νέα Ομαδική Συνεδρία.","Όρισε μέγιστο συμμετεχόντων, τιμή/άτομο και θέση.",
    "Σύνδεσέ το με επαναλαμβανόμενα slots στο Ημερολόγιο.",
  ],{ tags:["group","class","capacity"] }),
  item("reschedule-flow","Πώς κάνω αναπρογραμματισμό κράτησης;","Κρατήσεις",[
    "Άνοιξε κράτηση → «Αναπρογραμματισμός».","Επίλεξε νέο slot από τη διαθεσιμότητά σου.","Ο πελάτης ενημερώνεται αυτόματα.",
  ],{ tags:["reschedule","change time"] }),
  item("policies","Πού ορίζω όρους, ακυρωτική και αποποιήσεις ευθύνης;","Υπηρεσίες & Τιμές",[
    "Υπηρεσίες → Πολιτικές.","Πρόσθεσε όρους χρήσης/αποποιήσεις και κανόνες ακυρώσεων.",
    "Εμφανίζονται στη σελίδα κράτησης πριν την επιβεβαίωση.",
  ],{ tags:["terms","cancellations","tos"] }),
  item("media-guidelines","Οδηγίες μέσων (μέγεθος/όρια) για Posts;","Περιεχόμενο (Posts)",[
    "Μέγιστο 1MB ανά εικόνα.","Χρησιμοποίησε 4:3 ή 1:1 για καλύτερη προβολή στο grid.","Απέφυγε υπερβολικό κείμενο πάνω στις εικόνες.",
  ],{ tags:["images","limits","ratios"] }),
  item("export-data","Μπορώ να εξάγω τα δεδομένα μου (κρατήσεις/πελάτες);","Αναφορές & Analytics",[
    "Αναφορές → Εξαγωγές.","Επίλεξε τύπο (CSV/PDF) και εύρος ημερομηνιών.","Κατέβασε το αρχείο από το κέντρο λήψεων.",
  ],{ tags:["export","csv","backup"] }),
  item("profile-link","Πού βρίσκω τον δημόσιο σύνδεσμο προφίλ μου;","Προφίλ & Επαλήθευση",[
    "Προφίλ → Προεπισκόπηση.","Πάνω δεξιά: «Αντιγραφή συνδέσμου».","Μοιράσου τον με τους πελάτες σου.",
  ],{ tags:["public page","share","link"] }),
];

/* ============================= Small hooks/components ============================= */
const CategoryChips = ({ categories, active, onToggle }) => (
  <div className="flex flex-wrap gap-2">
    <button
      onClick={() => onToggle(null)}
      className={`px-3 py-1.5 text-sm rounded-xl border ${
        active === null ? "bg-white text-black border-white"
                        : "bg-transparent text-zinc-300 border-white/20 hover:bg-white/10"}`}
    >
      Όλα
    </button>
    {categories.map((c) => (
      <button
        key={c}
        onClick={() => onToggle(active === c ? null : c)}
        className={`px-3 py-1.5 text-sm rounded-xl border ${
          active === c ? "bg-white text-black border-white"
                       : "bg-transparent text-zinc-300 border-white/20 hover:bg-white/10"}`}
      >
        {c}
      </button>
    ))}
  </div>
);

function useDebouncedValue(value, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}

const FaqItem = ({ item, open, onToggle, onCopyLink }) => (
  <motion.div
    layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
    className={`rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/60 to-black/60 backdrop-blur-xl overflow-hidden ${open ? "ring-1 ring-white/20" : ""}`}
    id={item.id}
  >
    <button onClick={() => onToggle(item.id)} className="w-full text-left px-4 sm:px-6 py-4 sm:py-5 flex items-start gap-3">
      <div className="p-2 rounded-lg bg-white/10"><HelpCircle className="h-5 w-5 text-white" /></div>
      <div className="flex-1 min-w-0">
        <h3 className="text-base sm:text-lg font-semibold text-white">{item.title}</h3>
        <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">{item.category}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          title="Αντιγραφή συνδέσμου"
          onClick={(e) => { e.stopPropagation(); onCopyLink(item.id); }}
          className="p-2 rounded-lg hover:bg-white/10 text-zinc-300"
        >
          <LinkIcon className="h-4 w-4" />
        </button>
        {open ? <ChevronUp className="h-5 w-5 text-zinc-300" /> : <ChevronDown className="h-5 w-5 text-zinc-300" />}
      </div>
    </button>

    <AnimatePresence initial={false}>
      {open && (
        <motion.div key="body" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 sm:px-6 pb-5">
          <ul className="list-disc pl-6 text-zinc-200 space-y-2">
            {item.steps.map((s, i) => <li key={i} className="leading-relaxed">{s}</li>)}
          </ul>
          {item.note && (
            <div className="mt-4 flex items-start gap-2 text-xs sm:text-sm text-zinc-300">
              <Info className="h-4 w-4 mt-0.5" /><span>{item.note}</span>
            </div>
          )}
          {item.tags?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {item.tags.map((t) => (
                <span key={t} className="text-[11px] uppercase tracking-wide px-2 py-1 rounded-md border border-white/10 text-zinc-400">#{t}</span>
              ))}
            </div>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
);

/* ============================= Page ============================= */
export default function TrainerFAQPage() {
  // Public-safe: show TrainerMenu only when a trainer is logged in
  const { profile, profileLoaded } = useAuth();
  const showTrainerChrome = profileLoaded && profile?.role === "trainer";

  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [visible, setVisible] = useState(INITIAL_SHOW);
  const [expandingAll, setExpandingAll] = useState(false);
  const [expandedSet, setExpandedSet] = useState(() => new Set());

  const debouncedQ = useDebouncedValue(q, DEBOUNCE_MS);
  const sentinelRef = useRef(null);

  // One-time halo/layout CSS
  useEffect(() => {
    const css = document.createElement("style");
    css.innerHTML = `
      :root { --side-w: 0px; --nav-h: 64px; }
      @media (min-width: 640px){ :root { --nav-h: 72px; } }
      @media (min-width: 1024px){ :root { --side-w: 280px; --nav-h: 0px; } }
      @media (min-width: 1280px){ :root { --side-w: 320px; } }
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
      setOpenId(hash);
      setExpandedSet((prev) => new Set(prev).add(hash));
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }, []);

  const normalizedQuery = useMemo(() => normalizeQuery(debouncedQ), [debouncedQ]);

  const filtered = useMemo(() => {
    let list = FAQS;
    if (activeCat) list = list.filter((i) => i.category === activeCat);
    if (normalizedQuery) {
      const nq = normalizedQuery;
      list = list.filter((i) => {
        const hay = norm(`${i.title} ${i.category} ${i.steps.join(" ")} ${(i.tags || []).join(" ")}`);
        return hay.includes(nq);
      });
    }
    return list;
  }, [activeCat, normalizedQuery]);

  // Lazy load: re-init observer whenever list length changes
  useEffect(() => {
    if (!sentinelRef.current) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) setVisible((v) => Math.min(v + BATCH_SIZE, filtered.length));
      }),
      { rootMargin: "300px" }
    );
    io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, [filtered.length]);

  // Visible list respects lazy-load unless searching
  const toRender = normalizedQuery ? filtered : filtered.slice(0, visible);

  const handleToggle = (id) => {
    const next = new Set(expandedSet);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedSet(next);
    setOpenId(next.has(id) ? id : null);
  };

  const handleCopyLink = async (id) => {
    try {
      const url = `${window.location.origin}${window.location.pathname}#${id}`;
      await navigator.clipboard.writeText(url);
    } catch {/* noop */}
  };

  const clearSearch = () => setQ("");

  const expandAll = () => {
    setExpandingAll(true);
    setExpandedSet(new Set(filtered.map((i) => i.id)));
    setTimeout(() => setExpandingAll(false), 300);
  };
  const collapseAll = () => setExpandedSet(new Set());

  return (
    <div className="relative min-h-screen text-gray-100">
      {/* Background */}
      <div className="fixed inset-0 -z-50 bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      {/* Only show Trainer chrome if the user is a trainer; otherwise keep the page public */}
      {showTrainerChrome && <TrainerMenu />}

      <div className={`${showTrainerChrome ? "lg:pl-[calc(var(--side-w)+8px)] pl-0 lg:pt-0 pt-[var(--nav-h)]" : ""} transition-[padding]`}>
        <main className="mx-auto max-w-6xl w-full p-4 sm:p-6 space-y-8 pb-24">
          {/* Header */}
          <motion.header initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
                  Peak Velocity — Συχνές Ερωτήσεις Εκπαιδευτών
                </h1>
                <p className="text-zinc-300">Ό,τι χρειάζεσαι για να στήσεις προφίλ, υπηρεσίες, κρατήσεις και πληρωμές.</p>
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <BookOpen className="h-4 w-4" />
                  <span>Οδηγός χρήσης • Ενημερώνεται τακτικά</span>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <button onClick={expandAll} className="px-3 py-2 rounded-xl border border-white/20 hover:bg-white/10">Άνοιγμα όλων</button>
                <button onClick={collapseAll} className="px-3 py-2 rounded-xl border border-white/20 hover:bg-white/10">Κλείσιμο όλων</button>
              </div>
            </div>
          </motion.header>

          {/* Search */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/60 to-black/60 backdrop-blur-xl p-4 sm:p-6 halo">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Αναζήτηση (π.χ. διαθεσιμότητα, πληρωμές, πακέτα)…"
                  className="w-full pl-10 pr-10 py-3 rounded-2xl bg-zinc-900/50 border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20"
                />
                {q && (
                  <button onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-white/10">
                    <X className="h-4 w-4 text-zinc-400" />
                  </button>
                )}
              </div>
              <div className="hidden sm:flex items-center gap-2 text-zinc-300 px-3 py-2 rounded-xl border border-white/10 bg-black/30">
                <Filter className="h-4 w-4" />
                <span className="text-sm">Φίλτρα</span>
              </div>
            </div>
            <div className="mt-4">
              <CategoryChips categories={CATS} active={activeCat} onToggle={setActiveCat} />
            </div>
            {expandingAll && (
              <div className="mt-4 flex items-center gap-2 text-sm text-zinc-300">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Άνοιγμα όλων των αποτελεσμάτων…</span>
              </div>
            )}
          </motion.div>

          {/* Quick tips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/60 to-black/60 p-4">
              <div className="flex items-center gap-2 text-zinc-200 font-medium">
                <Sparkles className="h-4 w-4" /> Γρήγορες προτάσεις
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {["διαθεσιμότητα","πληρωμές","πακέτα","calendar sync","2FA","ακυρώσεις"].map((w) => (
                  <button key={w} onClick={() => setQ(w)} className="text-sm px-3 py-1.5 rounded-xl border border-white/10 text-zinc-300 hover:bg-white/10">
                    {w}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/60 to-black/60 p-4">
              <div className="flex items-center gap-2 text-zinc-200 font-medium">
                <CheckCircle2 className="h-4 w-4" /> Checklist ρύθμισης
              </div>
              <ol className="mt-3 pl-5 list-decimal text-sm text-zinc-300 space-y-1">
                <li>Συμπλήρωσε προφίλ & επαλήθευση</li>
                <li>Πρόσθεσε υπηρεσίες & τιμές</li>
                <li>Όρισε διαθεσιμότητα στο ημερολόγιο</li>
                <li>Σύνδεσε πληρωμές (π.χ. Stripe)</li>
                <li>Μοιράσου τον δημόσιο σύνδεσμό σου</li>
              </ol>
            </div>
          </div>

          {/* Results header */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-400">
              Βρέθηκαν <span className="text-zinc-200 font-semibold">{filtered.length}</span> άρθρα βοήθειας
              {activeCat && <> στην κατηγορία <span className="text-zinc-200">{activeCat}</span></>}
              {normalizeQuery(q) && <> για «<span className="text-zinc-200">{q}</span>»</>}
            </div>
            <div className="sm:hidden flex items-center gap-2">
              <button onClick={expandAll} className="px-3 py-2 rounded-xl border border-white/20 hover:bg-white/10 text-sm">Άνοιγμα όλων</button>
              {/* Fixed the small typo here (was hover:bg白/10) */}
              <button onClick={collapseAll} className="px-3 py-2 rounded-xl border border-white/20 hover:bg-white/10 text-sm">Κλείσιμο όλων</button>
            </div>
          </div>

          {/* FAQ list */}
          {toRender.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/60 to-black/60 p-6 text-center text-zinc-300">
              Δεν βρέθηκαν αποτελέσματα. Δοκίμασε λέξεις όπως <span className="text-zinc-200">«κρατήσεις»</span>, <span className="text-zinc-200">«διαθεσιμότητα»</span>, <span className="text-zinc-200">«πληρωμές»</span>.
              <div className="mt-4">
                <button onClick={() => { setQ(""); setActiveCat(null); }} className="px-4 py-2 rounded-xl border border-white/20 hover:bg-white/10">
                  Εκκαθάριση φίλτρων
                </button>
              </div>
            </div>
          ) : (
            <>
              <section className="grid grid-cols-1 gap-4">
                {toRender.map((it) => (
                  <FaqItem key={it.id} item={it} open={expandedSet.has(it.id)} onToggle={handleToggle} onCopyLink={handleCopyLink} />
                ))}
              </section>

              {/* Lazy sentinel (hidden while searching) */}
              {!normalizeQuery(q) && filtered.length > visible && <div ref={sentinelRef} className="h-10" />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
