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
  FileText,
  Bell,
  Image as ImageIcon,
  FileBadge2,
  AlertTriangle,
} from "lucide-react";

const GREEN_TIPS = [
  {
    key: "tip-bookings",
    tone: "green",
    badge: "Συμβουλή",
    title: "Οργάνωσε πιο εύκολα τα bookings σου",
    description:
      "Μπες στις κρατήσεις και πρόσθεσε online πελάτες, για να έχεις καθαρή εικόνα χωρίς πονοκέφαλο.",
    href: "/trainer/bookings",
    cta: "Πήγαινε στις κρατήσεις",
    icon: CalendarCheck,
  },
  {
    key: "tip-hearts",
    tone: "green",
    badge: "Συμβουλή",
    title: "Ξεχώρισε trainers που σου αρέσουν",
    description:
      "Μπες στις υπηρεσίες και βάλε καρδιές στους αγαπημένους σου trainers, για να τους βρίσκεις πιο γρήγορα.",
    href: "/services",
    cta: "Άνοιξε υπηρεσίες",
    icon: Heart,
  },
  {
    key: "tip-profile",
    tone: "green",
    badge: "Συμβουλή",
    title: "Κάνε το προφίλ σου πιο δυνατό",
    description:
      "Ένα πιο πλήρες προφίλ δείχνει πιο επαγγελματικό και σε βοηθά να κερδίζεις εμπιστοσύνη.",
    href: "/trainer#profile",
    cta: "Ολοκλήρωσέ το",
    icon: Bell,
  },
  {
    key: "tip-posts",
    tone: "green",
    badge: "Συμβουλή",
    title: "Κράτα το προφίλ σου ενεργό",
    description:
      "Ένα φρέσκο post σε βοηθά να δείχνεις πιο ενεργός και πιο ελκυστικός στους χρήστες.",
    href: "/trainer/posts",
    cta: "Δες posts",
    icon: FileText,
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

async function getPendingBookingsCount(trainerId) {
  const tables = ["trainer_bookings", "bookings"];
  let maxCount = 0;

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select("status, trainer_id")
      .eq("trainer_id", trainerId)
      .limit(300);

    if (error || !Array.isArray(data)) continue;

    const count = data.filter((row) => isPendingStatus(row?.status)).length;
    maxCount = Math.max(maxCount, count);
  }

  return maxCount;
}

export default function NavbarNewsCard() {
  const [loading, setLoading] = useState(true);

  const [missingAvatar, setMissingAvatar] = useState(false);
  const [missingDiploma, setMissingDiploma] = useState(false);
  const [hasPendingBookings, setHasPendingBookings] = useState(false);

  const [dismissed, setDismissed] = useState({
    avatar: false,
    diploma: false,
    pending: false,
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
          setMissingDiploma(false);
          setHasPendingBookings(false);
          return;
        }

        const [profileRes, pendingCount] = await Promise.all([
          supabase
            .from("profiles")
            .select("avatar_url, diploma_url")
            .eq("id", user.id)
            .single(),
          getPendingBookingsCount(user.id),
        ]);

        if (!mounted) return;

        const { data: profileData, error: profileError } = profileRes;

        if (!profileError && profileData) {
          const hasAvatar =
            typeof profileData.avatar_url === "string" &&
            profileData.avatar_url.trim() !== "";

          const hasDiploma =
            typeof profileData.diploma_url === "string" &&
            profileData.diploma_url.trim() !== "";

          setMissingAvatar(!hasAvatar);
          setMissingDiploma(!hasDiploma);
        } else {
          setMissingAvatar(false);
          setMissingDiploma(false);
        }

        setHasPendingBookings(pendingCount > 0);
      } catch {
        if (!mounted) return;
        setMissingAvatar(false);
        setMissingDiploma(false);
        setHasPendingBookings(false);
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
      title: "Λείπει η φωτογραφία προφίλ",
      description:
        "Βάλε φωτογραφία για πιο δυνατή και πιο αξιόπιστη παρουσία.",
      href: "/trainer#avatar",
      cta: "Βάλε φωτογραφία",
      icon: ImageIcon,
    });
  }

  if (missingDiploma && !dismissed.diploma) {
    redCards.push({
      key: "diploma",
      tone: "red",
      badge: "Προσοχή",
      title: "Λείπει το πτυχίο ή το πιστοποιητικό σου",
      description:
        "Ανέβασέ το για να δείχνει πιο πλήρες και πιο επαγγελματικό το προφίλ σου.",
      href: "/trainer#diploma",
      cta: "Ανέβασε πτυχίο",
      icon: FileBadge2,
    });
  }

  const yellowCards =
    hasPendingBookings && !dismissed.pending
      ? [
          {
            key: "pending",
            tone: "yellow",
            badge: "Εκκρεμεί",
            title: "Έχεις εκκρεμή κράτηση",
            description:
              "Υπάρχει κράτηση που θέλει απάντηση. Μπες τώρα για να το κλείσεις γρήγορα.",
            href: "/trainer/bookings",
            cta: "Δες κρατήσεις",
            icon: AlertTriangle,
          },
        ]
      : [];

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