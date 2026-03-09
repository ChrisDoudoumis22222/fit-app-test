"use client"

import { memo, useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  MapPin,
  Clock,
  User,
  Star,
  BadgeCheck,
  ExternalLink,
  Dumbbell,
  Users,
  Apple,
  Laptop,
  Activity,
  HeartPulse,
  Shield,
  Brain,
  Zap,
  Award,
  Target,
  Sparkles,
} from "lucide-react"
import { supabase } from "../../supabaseClient"

const AVATAR_PLACEHOLDER = "/placeholder.svg?height=80&width=80&text=Avatar"

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
]

const CATEGORY_ICON_MAP = {
  dumbbell: Dumbbell,
  users: Users,
  pilates: Activity,
  yoga: Sparkles,
  apple: Apple,
  laptop: Laptop,
  strength: Award,
  calisthenics: Activity,
  crossfit: Zap,
  boxing: Target,
  martial: Shield,
  dance: Sparkles,
  running: Activity,
  physio: HeartPulse,
  rehab: Shield,
  wellness: Sparkles,
  psychology: Brain,
}

function StarRating({ rating = 0, reviewCount = 0, size = "sm" }) {
  const starSize = size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5"
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5
  const empty = 5 - full - (half ? 1 : 0)
  const stars = []

  for (let i = 0; i < full; i++) {
    stars.push(
      <Star key={`full-${i}`} className={`${starSize} fill-white text-white`} />
    )
  }

  if (half) {
    stars.push(
      <div key="half" className={`relative ${starSize}`}>
        <Star className={`${starSize} absolute text-white/30`} />
        <div className="w-1/2 overflow-hidden">
          <Star className={`${starSize} fill-white text-white`} />
        </div>
      </div>
    )
  }

  for (let i = 0; i < empty; i++) {
    stars.push(
      <Star key={`empty-${i}`} className={`${starSize} text-white/20`} />
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-0.5">{stars}</div>
      <span className={`${size === "lg" ? "text-sm" : "text-xs"} text-white/50`}>
        {rating > 0 ? (
          <>
            {rating.toFixed(1)} ({reviewCount}{" "}
            {reviewCount === 1 ? "κριτική" : "κριτικές"})
          </>
        ) : (
          "Χωρίς κριτικές"
        )}
      </span>
    </div>
  )
}

const InfoPill = memo(function InfoPill({ icon: Icon, children }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/65 sm:text-sm">
      <Icon className="h-3.5 w-3.5 text-white/45" />
      <span>{children}</span>
    </div>
  )
})

function PostTrainerCard({
  trainer,
  onTrainerClick,
  onPostsClick,
  delay = 0.2,
}) {
  const safeTrainer = trainer ?? {}
  const trainerId = safeTrainer.id || safeTrainer.trainer_id || null

  const [dbCategory, setDbCategory] = useState("")
  const [dbSpecialty, setDbSpecialty] = useState("")

  useEffect(() => {
    let mounted = true

    async function fetchTrainerCategory() {
      if (!trainerId) {
        setDbCategory("")
        setDbSpecialty("")
        return
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("category, specialty")
          .eq("id", trainerId)
          .maybeSingle()

        if (error) throw error
        if (!mounted) return

        setDbCategory(data?.category || "")
        setDbSpecialty(data?.specialty || "")
      } catch (err) {
        console.error("Failed to fetch trainer category:", err)
        if (!mounted) return
        setDbCategory("")
        setDbSpecialty("")
      }
    }

    fetchTrainerCategory()

    return () => {
      mounted = false
    }
  }, [trainerId])

  const categoryMeta = useMemo(() => {
    const rawCategory =
      dbCategory || safeTrainer.category || safeTrainer.specialty || ""

    if (!rawCategory) {
      return {
        label: dbSpecialty || safeTrainer.specialty || "",
        Icon: null,
      }
    }

    const match = TRAINER_CATEGORIES.find(
      (item) => item.value === rawCategory || item.label === rawCategory
    )

    if (!match) {
      return {
        label: rawCategory,
        Icon: null,
      }
    }

    return {
      label: match.label,
      Icon: CATEGORY_ICON_MAP[match.iconKey] || null,
    }
  }, [dbCategory, dbSpecialty, safeTrainer.category, safeTrainer.specialty])

  const CategoryIcon = categoryMeta.Icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="py-1 sm:py-2"
    >
      <div className="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-start">
        <div className="flex items-start gap-4 md:block md:shrink-0">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 ring-4 ring-white/5 sm:h-24 sm:w-24">
            {safeTrainer.avatar_url ? (
              <img
                src={safeTrainer.avatar_url}
                alt={safeTrainer.full_name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null
                  e.currentTarget.src = AVATAR_PLACEHOLDER
                }}
              />
            ) : (
              <User className="h-8 w-8 text-white/30" />
            )}
          </div>

          <div className="min-w-0 flex-1 md:hidden">
            <div className="flex items-center gap-2">
              <button
                onClick={onTrainerClick}
                className="max-w-full truncate text-left text-xl font-semibold text-white transition-colors hover:text-white/80"
              >
                {safeTrainer.full_name || safeTrainer.email || "Unknown Trainer"}
              </button>

              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white">
                <BadgeCheck className="h-3.5 w-3.5 text-black" />
              </span>
            </div>

            {categoryMeta.label && (
              <div className="mt-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/65">
                  {CategoryIcon ? (
                    <CategoryIcon className="h-3.5 w-3.5 text-white/55" />
                  ) : null}
                  {categoryMeta.label}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <div className="hidden space-y-2 md:block">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={onTrainerClick}
                  className="text-xl font-semibold text-white transition-colors hover:text-white/80"
                >
                  {safeTrainer.full_name || safeTrainer.email || "Unknown Trainer"}
                </button>

                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white">
                  <BadgeCheck className="h-3.5 w-3.5 text-black" />
                </span>
              </div>

              {categoryMeta.label && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/60">
                  {CategoryIcon ? (
                    <CategoryIcon className="h-3.5 w-3.5 text-white/55" />
                  ) : null}
                  {categoryMeta.label}
                </span>
              )}
            </div>

            {Number(safeTrainer.reviewCount) > 0 && (
              <StarRating
                rating={Number(safeTrainer.rating) || 0}
                reviewCount={Number(safeTrainer.reviewCount) || 0}
              />
            )}
          </div>

          {Number(safeTrainer.reviewCount) > 0 && (
            <div className="md:hidden">
              <StarRating
                rating={Number(safeTrainer.rating) || 0}
                reviewCount={Number(safeTrainer.reviewCount) || 0}
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2.5 sm:gap-3">
            {safeTrainer.experience_years && (
              <InfoPill icon={Clock}>
                {safeTrainer.experience_years} χρόνια εμπειρίας
              </InfoPill>
            )}

            {safeTrainer.location && (
              <InfoPill icon={MapPin}>{safeTrainer.location}</InfoPill>
            )}
          </div>

          {safeTrainer.bio && (
            <p className="text-sm leading-relaxed text-white/45">
              {safeTrainer.bio}
            </p>
          )}

          <motion.button
            onClick={onPostsClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white/85 transition-all hover:bg-white/10 hover:text-white sm:w-auto sm:justify-start"
          >
            <ExternalLink className="h-4 w-4" />
            Όλες οι αναρτήσεις
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

export default memo(PostTrainerCard)