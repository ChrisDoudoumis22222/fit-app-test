"use client"

import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Clock,
  Heart,
  MessageCircle,
  Pencil,
  Star,
  Target,
  Trash2,
  Trophy,
  Users,
} from "lucide-react"

import { supabase } from "../../supabaseClient"
import {
  Avatar,
  FALLBACK_PRIMARY,
  FALLBACK_ULTIMATE,
  PremiumCard,
  ScrollReveal,
  hasImage,
} from "./shared.jsx"

import CertificationsSection from "./CertificationsSection.jsx"
import AvailabilitySection from "./AvailabilitySection.jsx"

export { CertificationsSection, AvailabilitySection }

/* --------------------------- Helpers --------------------------- */
const toTierLabel = (value, { percent = false } = {}) => {
  const raw = Number(value)
  const safe = Number.isFinite(raw) ? Math.max(1, Math.round(raw)) : 1

  if (safe < 10) return percent ? "<10%" : "<10"

  const bucket = Math.floor(safe / 10) * 10
  return percent ? `${bucket}+%` : `${bucket}+`
}

function SectionHeader({
  icon: Icon,
  title,
  description,
  meta = null,
  action = null,
}) {
  return (
    <div className="mb-7 flex flex-col gap-5 lg:mb-9 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-200 ring-1 ring-zinc-700/70">
          <Icon className="h-5 w-5" />
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl lg:text-4xl">
          {title}
        </h2>

        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base lg:text-lg">
            {description}
          </p>
        ) : null}
      </div>

      {(meta || action) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 lg:justify-end">
          {meta}
          {action}
        </div>
      )}
    </div>
  )
}

function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={[
        "inline-flex items-center justify-center rounded-2xl px-5 py-3",
        "bg-zinc-100 text-zinc-950 font-semibold",
        "transition-all duration-200 hover:bg-white",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  )
}

function SecondaryButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={[
        "inline-flex items-center justify-center rounded-2xl px-5 py-3",
        "border border-zinc-700 bg-zinc-900/70 text-zinc-100 font-medium",
        "transition-all duration-200 hover:border-zinc-600 hover:bg-zinc-800/80",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  )
}

/* --------------------------- Stats --------------------------- */
export function StatsSection({ data, bookingsCount = 0, avgRating = 0, reviewsCount = 0 }) {
  const stats = useMemo(() => {
    const experienceYears = Number(data?.experience_years || 0)
    const safeExperience = experienceYears > 0 ? experienceYears : 1

    const showSuccessRate = bookingsCount > 0

    const rawSuccessScore = Math.min(
      96,
      Math.max(
        8,
        8 +
          Math.round(bookingsCount * 2.8) +
          Math.round(reviewsCount * 1.4) +
          Math.round(avgRating * 4) +
          Math.min(safeExperience * 2, 12),
      ),
    )

    const base = [
      {
        key: "sessions",
        icon: Users,
        value: toTierLabel(bookingsCount),
        label: "Ολοκληρωμένες συνεδρίες",
        hint: "Συνολική δραστηριότητα",
        iconWrap: "bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/20",
      },
      {
        key: "experience",
        icon: Trophy,
        value: toTierLabel(safeExperience),
        label: "Εμπειρία στον χώρο",
        hint: "Χρόνια παρουσίας",
        iconWrap: "bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20",
      },
      {
        key: "success",
        icon: Target,
        value: toTierLabel(rawSuccessScore, { percent: true }),
        label: "Ποσοστό επιτυχίας",
        hint: "Συνέπεια & αποτελέσματα",
        iconWrap: "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20",
      },
      {
        key: "reviews",
        icon: Star,
        value: toTierLabel(reviewsCount),
        label: "Κριτικές πελατών",
        hint: avgRating > 0 ? `Μ.Ο. ${avgRating.toFixed(1)} / 5` : "Νέο προφίλ",
        iconWrap: "bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/20",
      },
    ]

    return showSuccessRate ? base : base.filter((s) => s.key !== "success")
  }, [data?.experience_years, bookingsCount, avgRating, reviewsCount])

  const count = stats.length
  const isThree = count === 3

  const gridClass = isThree
    ? "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:gap-5"
    : "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5"

  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen sm:static sm:left-auto sm:right-auto sm:ml-0 sm:mr-0 sm:w-full">
      <PremiumCard hover={false} className="w-full max-w-none">
        <div className="p-5 sm:p-6 lg:p-8 xl:p-9">
          <ScrollReveal>
            <SectionHeader
              icon={Trophy}
              title="Στατιστικά προφίλ"
              description="Μια γρήγορη και καθαρή εικόνα της δραστηριότητας, της εμπειρίας και της αξιοπιστίας του προπονητή."
            />
          </ScrollReveal>

          <div className={gridClass}>
            {stats.map((stat, index) => {
              const isLastStretched = stats.length % 2 === 1 && index === stats.length - 1
              const spanLastOnMobile = isLastStretched ? "col-span-2 sm:col-span-1" : ""

              return (
                <div key={stat.key} className={spanLastOnMobile}>
                  <ScrollReveal delay={index * 0.05}>
                    <motion.div
                      whileHover={{ y: -3 }}
                      className={[
                        "group h-full rounded-2xl border border-zinc-800 bg-zinc-950/70",
                        "p-4 sm:p-5 lg:p-6 transition-all duration-300",
                        "hover:border-zinc-700 hover:bg-zinc-950",
                        isLastStretched ? "text-center sm:text-left" : "",
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl",
                          stat.iconWrap,
                          isLastStretched ? "mx-auto sm:mx-0" : "",
                        ].join(" ")}
                      >
                        <stat.icon className="h-5 w-5" />
                      </div>

                      <div className="text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
                        {stat.value}
                      </div>

                      <div className="mt-2 text-sm font-semibold leading-snug text-zinc-200 sm:text-[15px]">
                        {stat.label}
                      </div>

                      <div className="mt-2 text-xs leading-relaxed text-zinc-500 sm:text-sm">
                        {stat.hint}
                      </div>
                    </motion.div>
                  </ScrollReveal>
                </div>
              )
            })}
          </div>
        </div>
      </PremiumCard>
    </div>
  )
}

/* --------------------------- Posts --------------------------- */
function PostCard({ post, index, onClick, formatRelativeTime }) {
  const primaryFromArray =
    Array.isArray(post.image_urls) && hasImage(post.image_urls[0]) ? post.image_urls[0] : ""
  const primaryFromSingle = hasImage(post.image_url) ? post.image_url : ""
  const postImage = primaryFromArray || primaryFromSingle || FALLBACK_PRIMARY
  const hasMultipleImages = (post.image_urls?.length || 0) > 1

  return (
    <ScrollReveal delay={index * 0.05}>
      <motion.article
        whileHover={{ y: -4 }}
        onClick={onClick}
        className="group h-full cursor-pointer"
      >
        <div className="h-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/70 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-950">
          <div className="relative h-52 overflow-hidden border-b border-zinc-800">
            <img
              src={postImage}
              alt={post.title || "Post image"}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              onError={(e) => {
                e.currentTarget.onerror = null
                e.currentTarget.src = FALLBACK_ULTIMATE
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {hasMultipleImages && (
              <div className="absolute right-4 top-4">
                <span className="inline-flex items-center rounded-full border border-zinc-700 bg-black/65 px-2.5 py-1 text-xs font-medium text-zinc-200 backdrop-blur">
                  +{post.image_urls.length - 1} εικόνες
                </span>
              </div>
            )}

            <div className="absolute bottom-4 left-4 right-4">
              <h3 className="line-clamp-2 text-lg font-semibold leading-tight text-white sm:text-xl">
                {post.title}
              </h3>
            </div>
          </div>

          <div className="flex h-[calc(100%-13rem)] flex-col p-5 lg:p-6">
            <p className="mb-5 flex-1 line-clamp-3 text-sm leading-relaxed text-zinc-300 lg:text-base">
              {post.description}
            </p>

            <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Clock className="h-4 w-4" />
                <span>{formatRelativeTime(post.created_at)}</span>
              </div>

              <div className="flex items-center gap-3 text-sm text-zinc-500">
                {post.likes > 0 && (
                  <div className="flex items-center gap-1">
                    <Heart className="h-4 w-4" />
                    <span>{post.likes}</span>
                  </div>
                )}

                {post.comments_count > 0 && (
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" />
                    <span>{post.comments_count}</span>
                  </div>
                )}

                <span className="font-medium text-zinc-300 transition-colors group-hover:text-white">
                  Προβολή
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.article>
    </ScrollReveal>
  )
}

export function PostsSection({ trainerId }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let alive = true

    const fetchPosts = async () => {
      try {
        const { data, error } = await supabase
          .from("posts")
          .select("id, title, description, image_url, image_urls, created_at, likes, comments_count")
          .eq("trainer_id", trainerId)
          .order("created_at", { ascending: false })
          .limit(12)

        if (!error && data && alive) setPosts(data)
      } catch (err) {
        console.error("Error fetching posts:", err)
      } finally {
        if (alive) setLoading(false)
      }
    }

    fetchPosts()

    return () => {
      alive = false
    }
  }, [trainerId])

  const formatRelativeTime = (dateString) => {
    const now = new Date()
    const postDate = new Date(dateString)
    const diffInHours = Math.floor((now - postDate) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Μόλις τώρα"
    if (diffInHours < 24) return `${diffInHours}ω πριν`
    if (diffInHours < 48) return "Χθες"

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} μέρες πριν`

    return new Date(dateString).toLocaleDateString("el-GR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const handlePostClick = (postId) => navigate(`/post/${postId}`)

  if (loading) {
    return (
      <PremiumCard hover={false}>
        <div className="p-6 lg:p-8 xl:p-9">
          <div className="animate-pulse">
            <div className="mb-8">
              <div className="mb-4 h-11 w-12 rounded-2xl bg-zinc-800" />
              <div className="mb-3 h-9 w-72 max-w-full rounded bg-zinc-800" />
              <div className="h-5 w-96 max-w-full rounded bg-zinc-800/80" />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/70">
                  <div className="h-52 bg-zinc-800/70" />
                  <div className="space-y-3 p-5">
                    <div className="h-5 w-3/4 rounded bg-zinc-800/70" />
                    <div className="h-4 w-full rounded bg-zinc-800/50" />
                    <div className="h-4 w-2/3 rounded bg-zinc-800/50" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PremiumCard>
    )
  }

  if (posts.length === 0) {
    return (
      <PremiumCard hover={false}>
        <div className="p-6 lg:p-8 xl:p-9">
          <ScrollReveal>
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 px-6 py-14 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 ring-1 ring-zinc-800">
                <MessageCircle className="h-8 w-8 text-zinc-500" />
              </div>

              <h3 className="mb-2 text-2xl font-semibold text-zinc-100">
                Δεν υπάρχουν αναρτήσεις
              </h3>
              <p className="mx-auto max-w-xl text-base leading-relaxed text-zinc-400">
                Αυτός ο προπονητής δεν έχει δημοσιεύσει περιεχόμενο ακόμη.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </PremiumCard>
    )
  }

  return (
    <PremiumCard hover={false}>
      <div className="p-6 lg:p-8 xl:p-9">
        <ScrollReveal>
          <SectionHeader
            icon={MessageCircle}
            title="Αναρτήσεις & περιεχόμενο"
            description="Τελευταίες ενημερώσεις, σκέψεις και χρήσιμο υλικό από τον προπονητή."
            meta={
              <div className="inline-flex items-center rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-3">
                <span className="text-sm text-zinc-400">Σύνολο</span>
                <span className="ml-2 text-lg font-semibold text-zinc-100">{posts.length}</span>
              </div>
            }
          />
        </ScrollReveal>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-3">
          {posts.map((post, index) => (
            <PostCard
              key={post.id}
              post={post}
              index={index}
              onClick={() => handlePostClick(post.id)}
              formatRelativeTime={formatRelativeTime}
            />
          ))}
        </div>
      </div>
    </PremiumCard>
  )
}

/* --------------------------- Reviews --------------------------- */
function StaticStars({ value = 0, size = "h-4 w-4", className = "" }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${size} ${star <= value ? "fill-current text-yellow-400" : "text-zinc-700"}`}
        />
      ))}
    </div>
  )
}

function RatingInput({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="rounded-xl p-1 transition-transform hover:scale-105"
        >
          <Star
            className={`h-6 w-6 ${
              star <= value ? "fill-current text-yellow-400" : "text-zinc-600"
            }`}
          />
        </button>
      ))}
    </div>
  )
}

export function ReviewsSection({ trainerId, session, onReviewMutated }) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ rating: 5, comment: "" })
  const [editingReviewId, setEditingReviewId] = useState(null)

  const userId = session?.user?.id || null

  const fetchReviews = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("trainer_reviews")
        .select(`
          id,
          user_id,
          rating,
          comment,
          created_at,
          user:profiles!trainer_reviews_user_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq("trainer_id", trainerId)
        .order("created_at", { ascending: false })
        .limit(20)

      if (error) throw error
      setReviews(data || [])
    } catch (err) {
      console.error("Error fetching reviews:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!trainerId) return
    fetchReviews()
  }, [trainerId])

  const myReview = useMemo(
    () => reviews.find((review) => review.user_id === userId) || null,
    [reviews, userId],
  )

  const avgRating = useMemo(() => {
    if (!reviews.length) return 0
    return reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
  }, [reviews])

  const openCreateOrEdit = () => {
    if (!userId) {
      alert("Παρακαλώ συνδεθείτε για να αφήσετε κριτική.")
      return
    }

    if (myReview) {
      setEditingReviewId(myReview.id)
      setForm({
        rating: Number(myReview.rating || 5),
        comment: myReview.comment || "",
      })
    } else {
      setEditingReviewId(null)
      setForm({ rating: 5, comment: "" })
    }

    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!userId) {
      alert("Παρακαλώ συνδεθείτε για να αφήσετε κριτική.")
      return
    }

    const payload = {
      trainer_id: trainerId,
      user_id: userId,
      rating: Number(form.rating),
      comment: String(form.comment || "").trim(),
    }

    setSubmitting(true)

    try {
      if (editingReviewId) {
        const { error } = await supabase
          .from("trainer_reviews")
          .update({
            rating: payload.rating,
            comment: payload.comment,
          })
          .eq("id", editingReviewId)
          .eq("user_id", userId)

        if (error) throw error
      } else {
        const { error } = await supabase.from("trainer_reviews").insert(payload)
        if (error) throw error
      }

      await fetchReviews()
      onReviewMutated?.()

      setShowForm(false)
      setEditingReviewId(null)
      setForm({ rating: 5, comment: "" })
    } catch (err) {
      console.error("Error submitting review:", err)
      alert(err.message || "Σφάλμα κατά την αποθήκευση της κριτικής.")
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (review) => {
    setEditingReviewId(review.id)
    setForm({
      rating: Number(review.rating || 5),
      comment: review.comment || "",
    })
    setShowForm(true)
  }

  const handleDelete = async (reviewId) => {
    if (!window.confirm("Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την κριτική;")) return

    try {
      const { error } = await supabase
        .from("trainer_reviews")
        .delete()
        .eq("id", reviewId)
        .eq("user_id", userId)

      if (error) throw error

      await fetchReviews()
      onReviewMutated?.()

      if (editingReviewId === reviewId) {
        setEditingReviewId(null)
        setShowForm(false)
        setForm({ rating: 5, comment: "" })
      }
    } catch (err) {
      console.error("Error deleting review:", err)
      alert(err.message || "Σφάλμα κατά τη διαγραφή.")
    }
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Σήμερα"
    if (diffDays === 1) return "Χθες"
    if (diffDays < 7) return `${diffDays} μέρες πριν`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} εβδομάδες πριν`
    return `${Math.floor(diffDays / 30)} μήνες πριν`
  }

  const showHeaderAction = reviews.length > 0 || myReview || showForm

  return (
    <section id="reviews-section">
      <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen sm:static sm:left-auto sm:right-auto sm:ml-0 sm:mr-0 sm:w-full">
        <div className="px-4 sm:px-0">
          <div className="sm:rounded-[28px] sm:border sm:border-zinc-800 sm:bg-zinc-950/70 sm:backdrop-blur-xl">
            <div className="px-0 py-0 sm:p-6 lg:p-8 xl:p-9">
              <ScrollReveal>
                <div className="mb-7 flex flex-col gap-4 lg:mb-9 lg:flex-row lg:items-end lg:justify-between">
                  <div className="min-w-0">
<div className="flex items-center justify-between gap-4">
  <h2 className="text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl lg:text-4xl">
    Κριτικές
  </h2>

  <StaticStars
    value={reviews.length > 0 ? Math.round(avgRating) : 0}
    size="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8"
    className="ml-auto shrink-0 justify-end"
  />
</div>

                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base lg:text-lg">
                      Αξιολογήσεις και εμπειρίες πελατών από πραγματικές συνεργασίες.
                    </p>
                  </div>

                  {showHeaderAction && (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <PrimaryButton onClick={openCreateOrEdit}>
                        {myReview ? "Επεξεργασία της κριτικής μου" : "Γράψε κριτική"}
                      </PrimaryButton>
                    </div>
                  )}
                </div>
              </ScrollReveal>

              {showForm && (
                <ScrollReveal>
                  <form
                    onSubmit={handleSubmit}
                    className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 lg:p-6"
                  >
                    <div className="flex flex-col gap-5">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-zinc-300">
                          Βαθμολογία
                        </label>
                        <RatingInput
                          value={form.rating}
                          onChange={(rating) => setForm((prev) => ({ ...prev, rating }))}
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-zinc-300">
                          Σχόλιο
                        </label>
                        <textarea
                          value={form.comment}
                          onChange={(e) => setForm((prev) => ({ ...prev, comment: e.target.value }))}
                          rows={5}
                          className="w-full resize-none rounded-2xl border border-zinc-800 bg-black/30 px-4 py-3 text-zinc-100 outline-none transition-colors focus:border-zinc-600"
                          placeholder="Γράψε την εμπειρία σου..."
                        />
                        <p className="mt-2 text-xs text-zinc-500">
                          Μία καθαρή και σύντομη κριτική βοηθά περισσότερο τους επόμενους χρήστες.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <PrimaryButton type="submit" disabled={submitting}>
                          {submitting
                            ? "Αποθήκευση..."
                            : editingReviewId
                            ? "Ενημέρωση κριτικής"
                            : "Υποβολή κριτικής"}
                        </PrimaryButton>

                        <SecondaryButton
                          type="button"
                          onClick={() => {
                            setShowForm(false)
                            setEditingReviewId(null)
                            setForm({ rating: 5, comment: "" })
                          }}
                        >
                          Ακύρωση
                        </SecondaryButton>
                      </div>
                    </div>
                  </form>
                </ScrollReveal>
              )}

              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5"
                    >
                      <div className="mb-3 h-5 w-40 rounded bg-zinc-800/70" />
                      <div className="mb-4 h-4 w-28 rounded bg-zinc-800/60" />
                      <div className="mb-2 h-4 w-full rounded bg-zinc-800/50" />
                      <div className="h-4 w-2/3 rounded bg-zinc-800/50" />
                    </div>
                  ))}
                </div>
              ) : reviews.length === 0 ? (
                <div className="py-14 text-center sm:rounded-2xl sm:border sm:border-dashed sm:border-zinc-800 sm:bg-zinc-950/40 sm:px-6">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 ring-1 ring-zinc-800">
                    <MessageCircle className="h-8 w-8 text-zinc-500" />
                  </div>

                  <h3 className="mb-2 text-2xl font-semibold text-zinc-100">
                    Δεν υπάρχουν κριτικές ακόμη
                  </h3>

                  <p className="mx-auto max-w-xl text-base leading-relaxed text-zinc-400">
                    Γίνε ο πρώτος που θα αφήσει αξιολόγηση.
                  </p>

                  <div className="mt-6 flex justify-center">
                    <PrimaryButton onClick={openCreateOrEdit}>Γράψε κριτική</PrimaryButton>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review, index) => {
                    const isOwner = review.user_id === userId

                    return (
                      <ScrollReveal key={review.id} delay={index * 0.04}>
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/65 p-5 lg:p-6">
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="flex min-w-0 items-start gap-4">
                              <Avatar
                                url={review.user?.avatar_url}
                                alt={review.user?.full_name || "User"}
                                className="h-12 w-12"
                              />

                              <div className="min-w-0">
                                <div className="mb-1 flex flex-wrap items-center gap-3">
                                  <h4 className="truncate text-base font-semibold text-zinc-100 lg:text-lg">
                                    {review.user?.full_name || "Χρήστης"}
                                  </h4>
                                  <span className="text-sm text-zinc-500">
                                    {formatDate(review.created_at)}
                                  </span>
                                </div>

                                <StaticStars value={Number(review.rating || 0)} />
                              </div>
                            </div>

                            {isOwner && (
                              <div className="flex items-center gap-2">
                                <SecondaryButton
                                  onClick={() => startEdit(review)}
                                  className="px-3 py-2 text-sm"
                                >
                                  <span className="inline-flex items-center gap-2">
                                    <Pencil className="h-4 w-4" />
                                    Επεξεργασία
                                  </span>
                                </SecondaryButton>

                                <SecondaryButton
                                  onClick={() => handleDelete(review.id)}
                                  className="px-3 py-2 text-sm"
                                >
                                  <span className="inline-flex items-center gap-2">
                                    <Trash2 className="h-4 w-4" />
                                    Διαγραφή
                                  </span>
                                </SecondaryButton>
                              </div>
                            )}
                          </div>

                          {review.comment && (
                            <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-zinc-300">
                              {review.comment}
                            </p>
                          )}
                        </div>
                      </ScrollReveal>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}