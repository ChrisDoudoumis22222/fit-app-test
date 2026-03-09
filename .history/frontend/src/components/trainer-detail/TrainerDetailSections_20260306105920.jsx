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

/* --------------------------- Stats --------------------------- */
export function StatsSection({ data, bookingsCount = 0, avgRating = 0, reviewsCount = 0 }) {
  const stats = useMemo(() => {
    const experienceYears = Number(data?.experience_years || 0)
    const safeExperience = experienceYears > 0 ? experienceYears : 1

    // ✅ Show success only when we have real activity
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
        tint: "from-blue-500/18 via-transparent to-blue-600/18",
        iconBg: "from-blue-500 to-blue-600",
        glow: "shadow-blue-500/10",
      },
      {
        key: "experience",
        icon: Trophy,
        value: toTierLabel(safeExperience),
        label: "Εμπειρία στον χώρο",
        hint: "Χρόνια παρουσίας",
        tint: "from-yellow-500/18 via-transparent to-yellow-600/18",
        iconBg: "from-yellow-500 to-yellow-600",
        glow: "shadow-yellow-500/10",
      },
      {
        key: "success",
        icon: Target,
        value: toTierLabel(rawSuccessScore, { percent: true }),
        label: "Ποσοστό επιτυχίας",
        hint: "Συνέπεια & αποτελέσματα",
        tint: "from-emerald-500/18 via-transparent to-emerald-600/18",
        iconBg: "from-emerald-500 to-emerald-600",
        glow: "shadow-emerald-500/10",
      },
      {
        key: "reviews",
        icon: Star,
        value: toTierLabel(reviewsCount),
        label: "Κριτικές πελατών",
        hint: avgRating > 0 ? `Μ.Ο. ${avgRating.toFixed(1)} / 5` : "Νέο προφίλ",
        tint: "from-purple-500/18 via-transparent to-purple-600/18",
        iconBg: "from-purple-500 to-purple-600",
        glow: "shadow-purple-500/10",
      },
    ]

    return showSuccessRate ? base : base.filter((s) => s.key !== "success")
  }, [data?.experience_years, bookingsCount, avgRating, reviewsCount])

  const count = stats.length
  const isThree = count === 3

  const gridClass = isThree
    ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6"
    : "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6"

  const cardPad = isThree ? "p-5 sm:p-6 lg:p-7" : "p-4 sm:p-5 lg:p-6"
  const cardMinH = isThree ? "min-h-[170px] sm:min-h-[200px]" : "min-h-[160px] sm:min-h-[185px]"
  const valueSize = isThree ? "text-4xl lg:text-5xl" : "text-3xl lg:text-4xl"
  const iconWrapSize = isThree
    ? "w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16"
    : "w-11 h-11 sm:w-12 sm:h-12 lg:w-14 lg:h-14"
  const iconSize = isThree
    ? "h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8"
    : "h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7"

  return (
    // ✅ FULL BLEED only on mobile (break out of parent padding)
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen sm:static sm:left-auto sm:right-auto sm:ml-0 sm:mr-0 sm:w-full">
      <PremiumCard hover={false} className="w-full max-w-none sm:max-w-none">
        <div className="p-5 sm:p-6 lg:p-8 xl:p-9">
          <ScrollReveal>
            <div className="text-center mb-7 lg:mb-9">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-zinc-100 mb-2">
                Επιτεύγματα & Στατιστικά
              </h2>

              <p className="text-zinc-400 text-sm sm:text-base lg:text-lg">
                Μια καθαρή εικόνα της πορείας και της αξιοπιστίας του προφίλ
              </p>
            </div>
          </ScrollReveal>

          <div className={gridClass}>
            {stats.map((stat, index) => {
              const isLastStretched = stats.length % 2 === 1 && index === stats.length - 1
              const spanLastOnMobile = isLastStretched ? "col-span-2 sm:col-span-1" : ""

              return (
                <div key={stat.key || stat.label} className={spanLastOnMobile}>
                  <ScrollReveal delay={index * 0.06}>
                    <motion.div
                      whileHover={{ y: -4, scale: 1.01 }}
                      className={[
                        "group relative w-full rounded-3xl border border-zinc-700/50 overflow-hidden",
                        "bg-zinc-950/40 backdrop-blur-xl transition-all duration-300",
                        cardPad,
                        cardMinH,
                        // ✅ center ONLY the stretched one on mobile (but keep stretch)
                        isLastStretched ? "text-center sm:text-left" : "",
                      ].join(" ")}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${stat.tint}`} />
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_55%)]" />

                      {/* Icon row */}
                      <div
                        className={[
                          "relative z-10 flex items-start",
                          isLastStretched ? "justify-center sm:justify-start" : "justify-between",
                        ].join(" ")}
                      >
                        <div
                          className={[
                            iconWrapSize,
                            "rounded-2xl bg-gradient-to-r",
                            stat.iconBg,
                            "flex items-center justify-center shadow-xl",
                            stat.glow,
                          ].join(" ")}
                        >
                          <stat.icon className={`${iconSize} text-white`} />
                        </div>
                      </div>

                      {/* Text */}
                      <div className="relative z-10 mt-4">
                        <div className={`${valueSize} font-bold tracking-tight text-zinc-100`}>
                          {stat.value}
                        </div>

                        <div className="mt-1 text-sm sm:text-[15px] font-semibold text-zinc-200 leading-snug">
                          {stat.label}
                        </div>

                        <div className="mt-2 text-xs sm:text-sm text-zinc-500 leading-snug">
                          {stat.hint}
                        </div>
                      </div>

                      <div className="relative z-10 mt-5 h-px w-full bg-gradient-to-r from-transparent via-zinc-700/60 to-transparent" />
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
    <ScrollReveal delay={index * 0.07}>
      <motion.article whileHover={{ y: -8, scale: 1.01 }} onClick={onClick} className="group cursor-pointer h-full">
        <div className="relative h-full bg-black/40 backdrop-blur-xl border border-zinc-700/50 rounded-3xl overflow-hidden shadow-2xl shadow-black/20 hover:border-zinc-600/50 transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="relative z-10 h-full flex flex-col">
            <div className="relative h-56 overflow-hidden">
              <img
                src={postImage}
                alt={post.title || "Post image"}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                onError={(e) => {
                  e.currentTarget.onerror = null
                  e.currentTarget.src = FALLBACK_ULTIMATE
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {hasMultipleImages && (
                <div className="absolute top-4 right-4">
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm text-zinc-200 text-sm font-medium border border-zinc-700/50">
                    +{post.image_urls.length - 1}
                  </span>
                </div>
              )}

              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="text-xl font-bold text-zinc-200 line-clamp-2 leading-tight drop-shadow-lg">
                  {post.title}
                </h3>
              </div>
            </div>

            <div className="flex-1 p-6 lg:p-7 flex flex-col">
              <p className="text-zinc-300 text-sm lg:text-base line-clamp-3 leading-relaxed mb-5 flex-1">
                {post.description}
              </p>

              <div className="flex items-center justify-between pt-4 border-zinc-700/50 border-t">
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Clock className="h-4 w-4" />
                  <span>{formatRelativeTime(post.created_at)}</span>
                </div>

                <div className="flex items-center gap-4 text-sm text-zinc-500">
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

                  <div className="text-zinc-400 group-hover:text-zinc-200 transition-colors">Προβολή</div>
                </div>
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
      <PremiumCard>
        <div className="p-7 lg:p-9 xl:p-10">
          <div className="animate-pulse space-y-7">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-zinc-700/50 rounded-2xl" />
              <div className="flex-1">
                <div className="h-7 bg-zinc-700/50 rounded w-1/3 mb-2" />
                <div className="h-4 bg-zinc-700/50 rounded w-1/2" />
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-4">
                  <div className="h-56 bg-zinc-700/50 rounded-3xl" />
                  <div className="h-5 bg-zinc-700/50 rounded w-3/4" />
                  <div className="h-4 bg-zinc-700/50 rounded w-1/2" />
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
      <PremiumCard>
        <div className="p-7 lg:p-9 xl:p-10">
          <ScrollReveal>
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-zinc-700/50">
                <MessageCircle className="h-10 w-10 text-zinc-400" />
              </div>

              <h3 className="text-2xl font-semibold text-zinc-200 mb-2">Δεν υπάρχουν αναρτήσεις</h3>
              <p className="text-zinc-400 text-base lg:text-lg">
                Αυτός ο προπονητής δεν έχει δημοσιεύσει περιεχόμενο ακόμη.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </PremiumCard>
    )
  }

  return (
    <PremiumCard>
      <div className="p-7 lg:p-9 xl:p-10">
        <ScrollReveal>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl flex items-center justify-center">
                <MessageCircle className="h-7 w-7 text-zinc-200" />
              </div>

              <div>
                <h2 className="text-3xl lg:text-4xl font-bold text-zinc-200">Αναρτήσεις & Περιεχόμενο</h2>
                <p className="text-zinc-400 text-base lg:text-lg">Τελευταίες ενημερώσεις και συμβουλές</p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-8">
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
function StaticStars({ value = 0, size = "h-4 w-4" }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${size} ${star <= value ? "text-yellow-400 fill-current" : "text-zinc-600"}`}
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
          className="transition-transform hover:scale-110"
        >
          <Star className={`h-6 w-6 ${star <= value ? "text-yellow-400 fill-current" : "text-zinc-600"}`} />
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

  const myReview = useMemo(() => reviews.find((review) => review.user_id === userId) || null, [reviews, userId])

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
      const { error } = await supabase.from("trainer_reviews").delete().eq("id", reviewId).eq("user_id", userId)

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

  return (
    <section id="reviews-section">
      <PremiumCard>
        <div className="p-7 lg:p-9 xl:p-10">
          <ScrollReveal>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
              <div>
                <h2 className="text-3xl lg:text-4xl font-bold text-zinc-200 mb-2">Κριτικές</h2>
                <p className="text-zinc-400 text-base lg:text-lg">Αυθεντικές κριτικές από πελάτες του προπονητή</p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="rounded-2xl border border-zinc-700/50 bg-zinc-800/25 px-4 py-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <StaticStars value={Math.round(avgRating)} />
                    <span className="text-2xl font-semibold text-zinc-200">
                      {reviews.length > 0 ? avgRating.toFixed(1) : "Νέο"}
                    </span>
                    <span className="text-zinc-400 text-sm">
                      {reviews.length > 0 ? `(${reviews.length})` : "χωρίς κριτικές"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={openCreateOrEdit}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 border border-zinc-600/50 text-zinc-200 font-medium"
                >
                  {myReview ? "Επεξεργασία της κριτικής μου" : "Γράψε κριτική"}
                </button>
              </div>
            </div>
          </ScrollReveal>

          {showForm && (
            <ScrollReveal>
              <form onSubmit={handleSubmit} className="mb-8 rounded-3xl border border-zinc-700/50 bg-zinc-900/30 p-5 lg:p-6">
                <div className="flex flex-col gap-5">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Βαθμολογία</label>
                    <RatingInput value={form.rating} onChange={(rating) => setForm((prev) => ({ ...prev, rating }))} />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Σχόλιο</label>
                    <textarea
                      value={form.comment}
                      onChange={(e) => setForm((prev) => ({ ...prev, comment: e.target.value }))}
                      rows={5}
                      className="w-full rounded-2xl border border-zinc-700/60 bg-black/30 px-4 py-3 text-zinc-200 outline-none focus:border-zinc-500 resize-none"
                      placeholder="Γράψε την εμπειρία σου..."
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-3 rounded-2xl bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 border border-zinc-600/50 text-zinc-200 font-medium disabled:opacity-60"
                    >
                      {submitting ? "Αποθήκευση..." : editingReviewId ? "Ενημέρωση κριτικής" : "Υποβολή κριτικής"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false)
                        setEditingReviewId(null)
                        setForm({ rating: 5, comment: "" })
                      }}
                      className="px-5 py-3 rounded-2xl bg-zinc-900/40 hover:bg-zinc-800/50 border border-zinc-700/60 text-zinc-200"
                    >
                      Ακύρωση
                    </button>
                  </div>
                </div>
              </form>
            </ScrollReveal>
          )}

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-3xl border border-zinc-700/40 bg-zinc-800/20 p-5 animate-pulse">
                  <div className="h-5 w-40 bg-zinc-700/40 rounded mb-3" />
                  <div className="h-4 w-28 bg-zinc-700/40 rounded mb-4" />
                  <div className="h-4 w-full bg-zinc-700/30 rounded mb-2" />
                  <div className="h-4 w-2/3 bg-zinc-700/30 rounded" />
                </div>
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-14 rounded-3xl border border-zinc-700/40 bg-zinc-900/20">
              <div className="w-20 h-20 mx-auto mb-5 rounded-full border border-zinc-700/50 bg-zinc-800/30 flex items-center justify-center">
                <MessageCircle className="h-9 w-9 text-zinc-500" />
              </div>
              <h3 className="text-2xl font-semibold text-zinc-200 mb-2">Δεν υπάρχουν κριτικές ακόμη</h3>
              <p className="text-zinc-400 text-base lg:text-lg">Γίνε ο πρώτος που θα αφήσει αξιολόγηση.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review, index) => {
                const isOwner = review.user_id === userId

                return (
                  <ScrollReveal key={review.id} delay={index * 0.04}>
                    <div className="rounded-3xl border border-zinc-700/40 bg-zinc-900/20 p-5 lg:p-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0">
                          <Avatar
                            url={review.user?.avatar_url}
                            alt={review.user?.full_name || "User"}
                            className="h-12 w-12"
                          />

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3 mb-1">
                              <h4 className="text-zinc-200 font-semibold text-base lg:text-lg truncate">
                                {review.user?.full_name || "Χρήστης"}
                              </h4>
                              <span className="text-zinc-500 text-sm">{formatDate(review.created_at)}</span>
                            </div>

                            <StaticStars value={Number(review.rating || 0)} />
                          </div>
                        </div>

                        {isOwner && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEdit(review)}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900/40 hover:bg-zinc-800/50 border border-zinc-700/60 text-zinc-200 text-sm"
                            >
                              <Pencil className="h-4 w-4" />
                              Επεξεργασία
                            </button>

                            <button
                              onClick={() => handleDelete(review.id)}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900/40 hover:bg-zinc-800/50 border border-zinc-700/60 text-zinc-200 text-sm"
                            >
                              <Trash2 className="h-4 w-4" />
                              Διαγραφή
                            </button>
                          </div>
                        )}
                      </div>

                      {review.comment && (
                        <p className="mt-4 text-zinc-300 text-base leading-relaxed whitespace-pre-wrap">{review.comment}</p>
                      )}
                    </div>
                  </ScrollReveal>
                )
              })}
            </div>
          )}
        </div>
      </PremiumCard>
    </section>
  )
}