"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../supabaseClient";
import {
  ArrowUpRight,
  X,
  CalendarCheck,
  Heart,
  Bell,
  Image as ImageIcon,
  AlertTriangle,
  Phone,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* adjust only these if your user routes are different                        */
/* -------------------------------------------------------------------------- */
const ROUTES = {
  services: "/services",
  bookings: "/user/bookings",
  profile: "/user#profile",
  avatar: "/user#avatar",
  phone: "/user#contact",
};

/* -------------------------------------------------------------------------- */
/* green tips for users                                                       */
/* -------------------------------------------------------------------------- */
const GREEN_TIPS = [
  {
    key: "tip-favorites",
    tone: "green",
    badge: "Πρόταση",
    title: "Ανακάλυψε τον προπονητή που σου ταιριάζει",
    description:
      "Δες υπηρεσίες που ταιριάζουν στον στόχο, το επίπεδο και τον ρυθμό σου.",
    href: ROUTES.services,
    cta: "Δες επιλογές",
    icon: Heart,
  },
  {
    key: "tip-profile",
    tone: "green",
    badge: "Πρόταση",
    title: "Ολοκλήρωσε το προφίλ σου",
    description:
      "Λίγες σωστές πληροφορίες κάνουν την εμπειρία σου πιο άμεση και πιο προσωπική.",
    href: ROUTES.profile,
    cta: "Άνοιξε προφίλ",
    icon: Bell,
  },
  {
    key: "tip-bookings",
    tone: "green",
    badge: "Πρόταση",
    title: "Οι κρατήσεις σου, σε ένα σημείο",
    description:
      "Δες εύκολα επιβεβαιώσεις, εκκρεμότητες και το πρόγραμμά σου χωρίς αναζήτηση.",
    href: ROUTES.bookings,
    cta: "Δες κρατήσεις",
    icon: CalendarCheck,
  },
];

function toneClasses(tone = "green") {
  if (tone === "red") {
    return {
      wrapper: "relative overflow-hidden rounded-2xl bg-red-500/[0.10]",
      glow:
        "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.18),transparent_42%)]",
      badge:
        "inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-300",
      dot: "h-1.5 w-1.5 rounded-full bg-red-400",
      iconWrap:
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-300",
      cta:
        "mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-500/12 px-2.5 py-1.5 text-[10.5px] font-medium text-red-200 transition hover:bg-red-500/18 hover:text-white",
    };
  }

  if (tone === "yellow") {
    return {
      wrapper: "relative overflow-hidden rounded-2xl bg-yellow-500/[0.10]",
      glow:
        "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(234,179,8,0.20),transparent_42%)]",
      badge:
        "inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-[10px] font-medium text-yellow-300",
      dot: "h-1.5 w-1.5 rounded-full bg-yellow-400",
      iconWrap:
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-300",
      cta:
        "mt-3 inline-flex items-center gap-1.5 rounded-lg bg-yellow-500/12 px-2.5 py-1.5 text-[10.5px] font-medium text-yellow-200 transition hover:bg-yellow-500/18 hover:text-white",
    };
  }

  return {
    wrapper: "relative overflow-hidden rounded-2xl bg-white/[0.03]",
    glow:
      "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.10),transparent_35%)]",
    badge:
      "inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300",
    dot: "h-1.5 w-1.5 rounded-full bg-emerald-400",
    iconWrap:
      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-white/80",
    cta:
      "mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/[0.05] px-2.5 py-1.5 text-[10px] font-medium text-white/90 transition hover:bg-white/[0.09] hover:text-white",
  };
}

function NewsCard({
  badge,
  title,
  description,
  href,
  cta,
  icon: Icon,
  tone = "green",
  onClose,
}) {
  const cls = toneClasses(tone);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.18 }}
      className={cls.wrapper}
    >
      <div className={cls.glow} />

      <div className="relative p-3">
        <div className="mb-2 flex items-start justify-between gap-2">
          <span className={cls.badge}>
            <span className={cls.dot} />
            {badge}
          </span>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-white/30 transition hover:bg-white/5 hover:text-white/70"
            aria-label="Κλείσιμο"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-start gap-2.5">
          <div className={cls.iconWrap}>
            <Icon className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-[12px] font-semibold leading-[1.35] text-white">
              {title}
            </h3>

            <p className="mt-1 text-[10.5px] leading-4 text-white/65">
              {description}
            </p>

            <Link to={href} className={cls.cta}>
              {cta}
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function isPendingStatus(value) {
  const v = String(value || "").trim().toLowerCase();
  return v === "pending" || v.includes("pending") || v.includes("εκκρεμ");
}

function isAcceptedStatus(value) {
  const v = String(value || "").trim().toLowerCase();
  return (
    v === "accepted" ||
    v.includes("accepted") ||
    v.includes("accept") ||
    v.includes("επιβεβαι") ||
    v.includes("εγκρ")
  );
}

/* tries common user foreign-key names and keeps the best match */
async function getUserBookingsSummary(userId) {
  const tables = ["trainer_bookings", "bookings"];
  const columns = ["user_id", "client_id", "athlete_id", "customer_id"];

  let maxTotal = 0;
  let maxPending = 0;
  let maxAccepted = 0;

  for (const table of tables) {
    for (const column of columns) {
      const { data, error } = await supabase
        .from(table)
        .select(`status, ${column}`)
        .eq(column, userId)
        .limit(300);

      if (error || !Array.isArray(data)) continue;

      const total = data.length;
      const pending = data.filter((row) => isPendingStatus(row?.status)).length;
      const accepted = data.filter((row) =>
        isAcceptedStatus(row?.status)
      ).length;

      maxTotal = Math.max(maxTotal, total);
      maxPending = Math.max(maxPending, pending);
      maxAccepted = Math.max(maxAccepted, accepted);
    }
  }

  return { total: maxTotal, pending: maxPending, accepted: maxAccepted };
}

export default function NavbarNewsCard() {
  const [loading, setLoading] = useState(true);

  const [missingAvatar, setMissingAvatar] = useState(false);
  const [missingPhone, setMissingPhone] = useState(false);
  const [hasAnyBookings, setHasAnyBookings] = useState(false);
  const [hasPendingBookings, setHasPendingBookings] = useState(false);
  const [hasAcceptedBookings, setHasAcceptedBookings] = useState(false);

  const [dismissed, setDismissed] = useState({
    avatar: false,
    phone: false,
    firstBooking: false,
    pending: false,
    accepted: false,
    tip: false,
  });

  const selectedTip = useMemo(() => {
    return GREEN_TIPS[Math.floor(Math.random() * GREEN_TIPS.length)];
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadStatus() {
      try {
        setLoading(true);

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user?.id) {
          if (!mounted) return;
          setMissingAvatar(false);
          setMissingPhone(false);
          setHasAnyBookings(false);
          setHasPendingBookings(false);
          setHasAcceptedBookings(false);
          return;
        }

        const [profileRes, bookingSummary] = await Promise.all([
          supabase
            .from("profiles")
            .select("avatar_url, phone")
            .eq("id", user.id)
            .single(),
          getUserBookingsSummary(user.id),
        ]);

        if (!mounted) return;

        const { data: profileData, error: profileError } = profileRes;

        if (!profileError && profileData) {
          const hasAvatar =
            typeof profileData.avatar_url === "string" &&
            profileData.avatar_url.trim() !== "";

          const hasPhone =
            typeof profileData.phone === "string" &&
            profileData.phone.trim() !== "";

          setMissingAvatar(!hasAvatar);
          setMissingPhone(!hasPhone);
        } else {
          setMissingAvatar(false);
          setMissingPhone(false);
        }

        setHasAnyBookings(bookingSummary.total > 0);
        setHasPendingBookings(bookingSummary.pending > 0);
        setHasAcceptedBookings(bookingSummary.accepted > 0);
      } catch {
        if (!mounted) return;
        setMissingAvatar(false);
        setMissingPhone(false);
        setHasAnyBookings(false);
        setHasPendingBookings(false);
        setHasAcceptedBookings(false);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadStatus();

    return () => {
      mounted = false;
    };
  }, []);

  const handleDismiss = (cardKey) => {
    setDismissed((prev) => {
      if (String(cardKey).startsWith("tip-")) {
        return { ...prev, tip: true };
      }
      return { ...prev, [cardKey]: true };
    });
  };

  if (loading) return null;

  const redCards = [];

  if (missingAvatar && !dismissed.avatar) {
    redCards.push({
      key: "avatar",
      tone: "red",
      badge: "Προσοχή",
      title: "Λείπει η εικόνα προφίλ σου",
      description:
        "Μια καθαρή εικόνα κάνει το προφίλ σου πιο ολοκληρωμένο και πιο οικείο.",
      href: ROUTES.avatar,
      cta: "Πρόσθεσε εικόνα",
      icon: ImageIcon,
    });
  }

  if (missingPhone && !dismissed.phone) {
    redCards.push({
      key: "phone",
      tone: "red",
      badge: "Προσοχή",
      title: "Πρόσθεσε το κινητό σου",
      description:
        "Μείνε άμεσα ενημερωμένος για την πορεία των κρατήσεών σου, χωρίς κενά.",
      href: ROUTES.phone,
      cta: "Πρόσθεσε αριθμό",
      icon: Phone,
    });
  }

  const yellowCards = [];

  if (!hasAnyBookings && !dismissed.firstBooking) {
    yellowCards.push({
      key: "firstBooking",
      tone: "yellow",
      badge: "Ξεκίνημα",
      title: "Κλείσε την πρώτη σου προπόνηση",
      description:
        "Διάλεξε υπηρεσία και κάνε το πρώτο σου βήμα εύκολα, γρήγορα και σωστά.",
      href: ROUTES.services,
      cta: "Ξεκίνα τώρα",
      icon: CalendarCheck,
    });
  } else if (hasPendingBookings && !dismissed.pending) {
    yellowCards.push({
      key: "pending",
      tone: "yellow",
      badge: "Σε εξέλιξη",
      title: "Μια κράτηση περιμένει επιβεβαίωση",
      description:
        "Μπες στις κρατήσεις σου και δες αμέσως την πορεία της επιβεβαίωσης.",
      href: ROUTES.bookings,
      cta: "Δες πορεία",
      icon: AlertTriangle,
    });
  } else if (hasAcceptedBookings && !dismissed.accepted) {
    yellowCards.push({
      key: "accepted",
      tone: "yellow",
      badge: "Επιβεβαιώθηκε",
      title: "Μια κράτησή σου έγινε αποδεκτή",
      description:
        "Η κράτησή σου έχει επιβεβαιωθεί. Μπες στις κρατήσεις σου για να δεις τις λεπτομέρειες.",
      href: ROUTES.bookings,
      cta: "Δες κράτηση",
      icon: CalendarCheck,
    });
  }

  const greenCards = !dismissed.tip ? [selectedTip] : [];

  const cardsToRender = redCards.length
    ? redCards
    : yellowCards.length
    ? yellowCards
    : greenCards;

  if (!cardsToRender.length) return null;

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full"
      >
        <div className="space-y-2.5">
          {cardsToRender.map((card) => (
            <NewsCard
              key={card.key}
              badge={card.badge}
              title={card.title}
              description={card.description}
              href={card.href}
              cta={card.cta}
              icon={card.icon}
              tone={card.tone}
              onClose={() => handleDismiss(card.key)}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}