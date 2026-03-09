// src/pages/PostDetailPage.jsx
"use client"

import { useEffect, useState, memo, useCallback, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  Calendar,
  Clock,
  Heart,
  Share2,
  MessageCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Activity,
  RotateCcw,
  ArrowLeft,
  Zap,
} from "lucide-react"
import { motion } from "framer-motion"
import { supabase } from "../supabaseClient"
import { useAuth } from "../AuthProvider"
import UserMenu from "../components/UserMenu"
import TrainerMenu from "../components/TrainerMenu"
import CommentsSection from "../components/CommentsSection"
import PostTrainerCard from "../components/post/PostTrainerCard"

const POST_PLACEHOLDER = "/placeholder.svg?height=400&width=600&text=Post+Image"

// helper: promise timeout
function withTimeout(promise, ms = 12000, timeoutMsg = "Η αίτηση άργησε πολύ") {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMsg)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

/* === Refined Minimal Grid Background === */
const MinimalGridBackground = memo(() => (
  <>
    <style>{`
      @keyframes subtle-drift { 
        0% { transform: translate(0,0); } 
        100% { transform: translate(40px, 40px); } 
      }

      .menu-fix { background-color: transparent !important; }
      .menu-fix [class*="border-r"], .menu-fix [style*="border-right"] { border-right: 0 !important; }

      .hide-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      .hide-scrollbar::-webkit-scrollbar {
        display: none;
      }
    `}</style>

    <div className="fixed inset-0 -z-50 bg-black" />
    <div className="fixed inset-0 -z-40 pointer-events-none bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.03),transparent_60%)]" />

    <div
      className="fixed inset-0 -z-40 pointer-events-none will-change-transform opacity-40"
      style={{
        animation: "subtle-drift 45s linear infinite",
        backgroundImage: `
          linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)
        `,
        backgroundSize: "48px 48px",
        maskImage:
          "radial-gradient(ellipse at 50% 30%, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 70%)",
        WebkitMaskImage:
          "radial-gradient(ellipse at 50% 30%, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 70%)",
      }}
    />
  </>
))
MinimalGridBackground.displayName = "MinimalGridBackground"

/* Animated Counter */
const AnimatedCounter = memo(({ value, duration = 800 }) => {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let start = 0
    const end = Number.parseInt(String(value)) || 0

    if (start === end) {
      setCount(end)
      return
    }

    const step = Math.max(1, Math.ceil(end / Math.max(1, duration / 16)))
    const timer = setInterval(() => {
      start += step
      if (start >= end) {
        setCount(end)
        clearInterval(timer)
      } else {
        setCount(start)
      }
    }, 16)

    return () => clearInterval(timer)
  }, [value, duration])

  return <span>{count}</span>
})
AnimatedCounter.displayName = "AnimatedCounter"

/* Stat Chip */
const StatChip = ({
  icon: Icon,
  count,
  active = false,
  size = "md",
  tone = "default",
}) => {
  const pad = size === "sm" ? "px-2.5 py-1" : "px-3.5 py-1.5"
  const text = size === "sm" ? "text-xs" : "text-sm"

  const likedTone = active && tone === "like"

  const chipClass = likedTone
    ? "border-emerald-400/50 bg-emerald-500/85 text-white shadow-[0_8px_24px_rgba(16,185,129,0.35)]"
    : active
      ? "border-white/30 bg-white/10 text-white"
      : "border-white/10 bg-black/40 text-white/70 hover:border-white/20 hover:text-white/90"

  const iconClass = likedTone
    ? "text-red-400 fill-current"
    : active
      ? "text-white fill-current"
      : "text-white/80"

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border transition-all duration-300 ${pad} ${text} ${chipClass} backdrop-blur-sm`}
    >
      <Icon className={`h-3.5 w-3.5 ${iconClass}`} />
      <span className="font-medium">{count}</span>
    </span>
  )
}

/* Related Post Card */
function RelatedPostCard({ post, onNavigate, index, formatRelativeTime }) {
  const postImage = post.image_urls?.[0] || post.image_url || POST_PLACEHOLDER
  const hasMultipleImages = post.image_urls?.length > 1

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * index }}
      whileHover={{ y: -4 }}
      onClick={() => onNavigate(`/post/${post.id}`)}
      className="group cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition-all duration-300 hover:border-white/20 hover:bg-white/[0.04]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-white/5">
        <img
          src={postImage}
          alt={post.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        <div className="absolute left-3 top-3 flex gap-2">
          {post.likes > 0 && (
            <StatChip icon={Heart} count={post.likes} size="sm" tone="like" />
          )}
          {post.comments_count > 0 && (
            <StatChip
              icon={MessageCircle}
              count={post.comments_count}
              size="sm"
              tone="comment"
            />
          )}
        </div>

        {hasMultipleImages && (
          <div className="absolute right-3 top-3">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-sm">
              +{post.image_urls.length - 1}
            </span>
          </div>
        )}

        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-white">
            {post.title}
          </h3>
        </div>
      </div>

      <div className="flex items-center justify-between p-3">
        <span className="flex items-center gap-1 text-xs text-white/40">
          <Clock className="h-3 w-3" />
          {formatRelativeTime(post.created_at)}
        </span>
        <ChevronRight className="h-4 w-4 text-white/30 transition-colors group-hover:text-white/60" />
      </div>
    </motion.article>
  )
}

/* Main Page Component */
export default function PostDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile, loading: authLoading } = useAuth()

  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [relatedPosts, setRelatedPosts] = useState([])
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isLiking, setIsLiking] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [commentsCount, setCommentsCount] = useState(0)
  const [stalled, setStalled] = useState(false)

  const stallTimerRef = useRef(null)
  const imageScrollerRef = useRef(null)

  const Menu = profile?.role === "trainer" ? TrainerMenu : UserMenu

  const fetchRelatedPosts = useCallback(async (trainerId, currentPostId) => {
    try {
      const q = supabase
        .from("posts")
        .select("id, title, image_url, image_urls, created_at, likes, comments_count")
        .eq("trainer_id", trainerId)
        .neq("id", currentPostId)
        .order("created_at", { ascending: false })
        .limit(6)

      const { data, error } = await withTimeout(q, 10000)
      if (!error && data) setRelatedPosts(data)
    } catch (err) {
      console.error("Error fetching related posts:", err)
    }
  }, [])

  const fetchPost = useCallback(async () => {
    setError("")
    setLoading(true)

    try {
      const q = supabase
        .from("posts")
        .select(`
          *,
          trainer:profiles!trainer_id (
            id, full_name, email, avatar_url, bio, specialty, location, experience_years, created_at
          )
        `)
        .eq("id", id)
        .single()

      const { data, error } = await withTimeout(
        q,
        12000,
        "Timeout: αργεί πολύ η φόρτωση της ανάρτησης"
      )

      if (error) {
        setError(error.message)
      } else {
        let trainerData = data.trainer ?? {}

        if (trainerData?.id) {
          try {
            const { data: revs } = await withTimeout(
              supabase
                .from("trainer_reviews")
                .select("rating")
                .eq("trainer_id", trainerData.id),
              8000
            )

            const ratings = (revs ?? [])
              .map((r) => Number(r.rating))
              .filter((n) => !Number.isNaN(n))

            const reviewCount = ratings.length
            const avgRating = reviewCount
              ? ratings.reduce((a, b) => a + b, 0) / reviewCount
              : 0

            trainerData = { ...trainerData, rating: avgRating, reviewCount }
          } catch {
            // ignore trainer rating timeout
          }
        }

        const updated = { ...data, trainer: trainerData }
        setPost(updated)
        setLikeCount(Number(updated.likes || 0))
        setCommentsCount(Number(updated.comments_count || 0))
        setCurrentImageIndex(0)

        if (imageScrollerRef.current) {
          imageScrollerRef.current.scrollTo({ left: 0, behavior: "auto" })
        }

        if (profile?.id) {
          try {
            const { data: likedRow, error: likedError } = await withTimeout(
              supabase
                .from("post_likes")
                .select("post_id")
                .eq("post_id", updated.id)
                .eq("user_id", profile.id)
                .maybeSingle(),
              8000
            )

            if (likedError) {
              console.warn("Error fetching liked state:", likedError)
              setIsLiked(false)
            } else {
              setIsLiked(!!likedRow)
            }
          } catch {
            setIsLiked(false)
          }
        } else {
          setIsLiked(false)
        }

        if (updated.trainer_id) {
          fetchRelatedPosts(updated.trainer_id, id)
        }
      }
    } catch (err) {
      setError(err.message || "Κάτι πήγε στραβά")
    } finally {
      setLoading(false)
    }
  }, [id, profile?.id, fetchRelatedPosts])

  useEffect(() => {
    fetchPost()
  }, [fetchPost])

  useEffect(() => {
    clearTimeout(stallTimerRef.current)

    if (authLoading || loading) {
      stallTimerRef.current = setTimeout(() => setStalled(true), 15000)
    } else {
      setStalled(false)
    }

    return () => clearTimeout(stallTimerRef.current)
  }, [authLoading, loading])

  const handleReload = () => window.location.reload()

  const handleRetry = () => {
    setStalled(false)
    fetchPost()
  }

  const handleLike = async () => {
    if (!profile?.id) {
      alert("Παρακαλώ συνδεθείτε για να κάνετε like")
      return
    }

    if (isLiking) return

    setIsLiking(true)

    const previousLiked = isLiked
    const previousLikeCount = Number(likeCount || 0)
    const optimisticLiked = !previousLiked
    const optimisticLikeCount = Math.max(
      0,
      previousLikeCount + (previousLiked ? -1 : 1)
    )

    try {
      setIsLiked(optimisticLiked)
      setLikeCount(optimisticLikeCount)

      const { data, error } = await supabase.rpc("toggle_post_like", {
        _post_id: id,
      })

      if (error) throw error

      const row = Array.isArray(data) ? data[0] : data
      const likedFromDb =
        typeof row?.liked === "boolean" ? row.liked : optimisticLiked
      const likesFromDb = Number(row?.likes ?? optimisticLikeCount)

      setIsLiked(likedFromDb)
      setLikeCount(likesFromDb)

      setPost((prev) =>
        prev
          ? {
              ...prev,
              likes: likesFromDb,
            }
          : prev
      )
    } catch (err) {
      console.error("Error toggling like:", err)
      setIsLiked(previousLiked)
      setLikeCount(previousLikeCount)
      alert("Σφάλμα κατά την ενημέρωση του like")
    } finally {
      setIsLiking(false)
    }
  }

  const handleShare = useCallback(async () => {
    const shareData = {
      title: post?.title,
      text: post?.description,
      url: window.location.href,
    }

    try {
      if (
        navigator.share &&
        (!navigator.canShare || navigator.canShare(shareData))
      ) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(window.location.href)
        alert("Ο σύνδεσμος αντιγράφηκε στο clipboard!")
      }
    } catch {
      try {
        await navigator.clipboard.writeText(window.location.href)
        alert("Ο σύνδεσμος αντιγράφηκε στο clipboard!")
      } catch {
        alert("Δεν ήταν δυνατή η κοινοποίηση")
      }
    }
  }, [post])

  const handleJumpToComments = () => {
    document.getElementById("comments")?.scrollIntoView({ behavior: "smooth" })
  }

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString("el-GR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  const formatRelativeTime = useCallback((dateString) => {
    const now = new Date()
    const postDate = new Date(dateString)
    const diffInHours = Math.floor((now - postDate) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Μόλις τώρα"
    if (diffInHours < 24) return `${diffInHours}ω πριν`
    if (diffInHours < 48) return "Χθες"

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} μέρες πριν`

    return formatDate(dateString)
  }, [])

  const handleCommentCountUpdate = (newCount) => setCommentsCount(newCount)

  const handleImageScroll = useCallback(() => {
    const el = imageScrollerRef.current
    if (!el) return

    const slideWidth = el.clientWidth || 1
    const nextIndex = Math.round(el.scrollLeft / slideWidth)

    setCurrentImageIndex((prev) => (prev === nextIndex ? prev : nextIndex))
  }, [])

  if (authLoading || loading) {
    return (
      <div className="relative min-h-screen bg-black text-white">
        <MinimalGridBackground />
        <div className="menu-fix">
          <Menu />
        </div>

        <div className="flex h-screen items-center justify-center">
          {stalled ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl"
            >
              <AlertCircle className="mx-auto mb-4 h-10 w-10 text-white/40" />
              <h3 className="mb-2 text-lg font-medium text-white/90">
                Άργησε πολύ να φορτώσει
              </h3>
              <p className="mb-6 text-sm text-white/50">
                Δοκίμασε ξανά ή κάνε ανανέωση.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleRetry}
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white"
                >
                  Δοκίμασε ξανά
                </button>
                <button
                  onClick={handleReload}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white"
                >
                  <RotateCcw className="h-4 w-4" />
                  Ανανέωση
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-8"
            >
              <div className="relative">
                <div className="h-16 w-16 rounded-full border border-white/10" />
                <Loader2 className="absolute inset-0 m-auto h-8 w-8 animate-spin text-white/60" />
              </div>
              <div className="space-y-2 text-center">
                <h3 className="text-lg font-medium text-white/90">Φόρτωση</h3>
                <p className="text-sm text-white/40">Προετοιμασία περιεχομένου...</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative min-h-screen bg-black text-white">
        <MinimalGridBackground />
        <div className="menu-fix">
          <Menu />
        </div>

        <div className="flex h-screen items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl"
          >
            <AlertCircle className="mx-auto mb-4 h-10 w-10 text-white/40" />
            <h3 className="mb-2 text-lg font-medium text-white/90">
              Σφάλμα φόρτωσης
            </h3>
            <p className="mb-6 text-sm text-white/50">{error}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleRetry}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white"
              >
                Δοκίμασε ξανά
              </button>
              <button
                onClick={handleReload}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white"
              >
                <RotateCcw className="h-4 w-4" />
                Reload
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="relative min-h-screen bg-black text-white">
        <MinimalGridBackground />
        <div className="menu-fix">
          <Menu />
        </div>

        <div className="flex h-screen items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl"
          >
            <AlertCircle className="mx-auto mb-4 h-10 w-10 text-white/40" />
            <h3 className="mb-2 text-lg font-medium text-white/90">Δεν βρέθηκε</h3>
            <p className="text-sm text-white/50">
              Η ανάρτηση δεν υπάρχει ή έχει διαγραφεί.
            </p>
          </motion.div>
        </div>
      </div>
    )
  }

  const trainer = post.trainer ?? {}
  const images = post.image_urls?.length
    ? post.image_urls
    : [post.image_url].filter(Boolean)
  const hasMultipleImages = images.length > 1

  return (
    <div className="relative min-h-screen bg-black text-white selection:bg-white/20">
      <MinimalGridBackground />

      <div className="menu-fix">
        <Menu />
      </div>

      {/* Header */}
      <header className="border-b border-white/5 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4">
          <button
            onClick={() => navigate("/posts")}
            className="flex items-center gap-2 text-white/60 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Πίσω</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        {/* Main Article */}
        <motion.article
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          {/* Hero Image Gallery */}
          {images.length > 0 && (
            <div className="relative mb-8 -mx-4 sm:mx-0 sm:overflow-hidden sm:rounded-2xl sm:border sm:border-white/10">
              {/* MOBILE: no outer container */}
              <div className="relative aspect-[4/5] bg-black sm:hidden">
                <div
                  ref={imageScrollerRef}
                  onScroll={handleImageScroll}
                  className="hide-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth"
                  style={{
                    WebkitOverflowScrolling: "touch",
                    touchAction: "pan-x",
                  }}
                >
                  {images.map((image, idx) => (
                    <div
                      key={`${image || POST_PLACEHOLDER}-${idx}-mobile`}
                      className="h-full w-full shrink-0 snap-center"
                    >
                      <img
                        src={image || POST_PLACEHOLDER}
                        alt={`${post.title} - Image ${idx + 1}`}
                        className="h-full w-full select-none bg-black object-contain"
                        draggable={false}
                      />
                    </div>
                  ))}
                </div>

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />

                {hasMultipleImages && (
                  <>
                    <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
                      <div className="flex gap-1.5 rounded-full border border-white/10 bg-black/60 px-3 py-2 backdrop-blur-sm">
                        {images.map((_, idx) => (
                          <span
                            key={`mobile-dot-${idx}`}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              idx === currentImageIndex
                                ? "w-6 bg-white"
                                : "w-1.5 bg-white/30"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="pointer-events-none absolute right-4 top-4 z-10">
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
                        {currentImageIndex + 1}/{images.length}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* DESKTOP: arrows + animated slide */}
              <div className="relative hidden aspect-[16/9] overflow-hidden bg-white/5 sm:block">
                <motion.div
                  className="flex h-full"
                  style={{ width: `${images.length * 100}%` }}
                  animate={{
                    x: `-${(100 / Math.max(images.length, 1)) * currentImageIndex}%`,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 220,
                    damping: 28,
                    mass: 0.9,
                  }}
                >
                  {images.map((image, idx) => (
                    <div
                      key={`${image || POST_PLACEHOLDER}-${idx}-desktop`}
                      className="relative h-full flex-none"
                      style={{ width: `${100 / Math.max(images.length, 1)}%` }}
                    >
                      <img
                        src={image || POST_PLACEHOLDER}
                        alt={`${post.title} - Image ${idx + 1}`}
                        className="h-full w-full select-none object-cover"
                        draggable={false}
                      />
                    </div>
                  ))}
                </motion.div>

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {hasMultipleImages && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex((p) => Math.max(0, p - 1))}
                      disabled={currentImageIndex === 0}
                      className="absolute left-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white/80 backdrop-blur-sm transition-all hover:bg-black/80 hover:text-white disabled:opacity-30"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>

                    <button
                      onClick={() =>
                        setCurrentImageIndex((p) =>
                          Math.min(images.length - 1, p + 1)
                        )
                      }
                      disabled={currentImageIndex === images.length - 1}
                      className="absolute right-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white/80 backdrop-blur-sm transition-all hover:bg-black/80 hover:text-white disabled:opacity-30"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>

                    <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
                      <div className="flex gap-1.5 rounded-full border border-white/10 bg-black/60 px-3 py-2 backdrop-blur-sm">
                        {images.map((_, idx) => (
                          <button
                            key={`desktop-dot-${idx}`}
                            onClick={() => setCurrentImageIndex(idx)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              idx === currentImageIndex
                                ? "w-6 bg-white"
                                : "w-1.5 bg-white/30 hover:bg-white/50"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="absolute right-4 top-4 z-10">
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
                        {currentImageIndex + 1}/{images.length}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Content Section */}
          <div className="space-y-8">
            {/* Title & Meta */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                  <Calendar className="h-3 w-3" />
                  {formatRelativeTime(post.created_at)}
                </span>

                {/* Action Buttons moved above title */}
                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={handleLike}
                    disabled={isLiking || !profile?.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    aria-label="Like"
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-300 sm:h-auto sm:w-auto sm:px-4 sm:py-2.5 ${
                      isLiked
                        ? "border-red-400/80 bg-red-500 text-white shadow-[0_10px_25px_rgba(239,68,68,0.35)]"
                        : "border-red-300/40 bg-white text-red-500 hover:bg-red-50"
                    } ${isLiking ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                    <span className="hidden sm:ml-2 sm:inline-flex sm:items-center sm:gap-1">
                      <span>Like</span>
                      <span className="opacity-80">
                        (<AnimatedCounter value={likeCount} />)
                      </span>
                    </span>
                  </motion.button>

                  <motion.button
                    onClick={handleJumpToComments}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    aria-label="Σχόλια"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/85 transition-all hover:bg-white/10 hover:text-white sm:h-auto sm:w-auto sm:px-4 sm:py-2.5"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="hidden sm:ml-2 sm:inline-flex sm:items-center sm:gap-1">
                      <span>Σχόλια</span>
                      <span className="opacity-80">
                        (<AnimatedCounter value={commentsCount} />)
                      </span>
                    </span>
                  </motion.button>

                  <motion.button
                    onClick={handleShare}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    aria-label="Share"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/85 transition-all hover:bg-white/10 hover:text-white sm:h-auto sm:w-auto sm:px-4 sm:py-2.5"
                  >
                    <Share2 className="h-4 w-4" />
                    <span className="hidden sm:ml-2 sm:inline">Share</span>
                  </motion.button>
                </div>
              </div>

              <h1 className="text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl lg:text-5xl">
                {post.title}
              </h1>
            </div>

            {/* Description */}
            <div className="max-w-3xl">
              <p className="whitespace-pre-wrap text-base leading-relaxed text-white/60 md:text-lg">
                {post.description}
              </p>
            </div>

            {/* Trainer Card */}
            <PostTrainerCard
              trainer={trainer}
              onTrainerClick={() => navigate(`/trainer/${trainer.id}`)}
              onPostsClick={() => navigate(`/trainer/${trainer.id}/posts`)}
            />
          </div>
        </motion.article>

        {/* Comments */}
        <motion.section
          id="comments"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-16"
        >
          <CommentsSection
            postId={id}
            initialCommentsCount={commentsCount}
            onCommentCountUpdate={handleCommentCountUpdate}
          />
        </motion.section>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                Περισσότερα από αυτόν τον προπονητή
              </h2>
              <button
                onClick={() => navigate(`/trainer/${trainer.id}/posts`)}
                className="flex items-center gap-1 text-sm text-white/50 transition-colors hover:text-white"
              >
                Προβολή όλων
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((relatedPost, index) => (
                <RelatedPostCard
                  key={relatedPost.id}
                  post={relatedPost}
                  onNavigate={navigate}
                  index={index}
                  formatRelativeTime={formatRelativeTime}
                />
              ))}
            </div>
          </motion.section>
        )}

        {/* Bottom Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-16 flex flex-wrap justify-center gap-4"
        >
          <motion.button
            onClick={() => navigate("/posts")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white"
          >
            <Activity className="h-4 w-4" />
            Προβολή όλων των αναρτήσεων
          </motion.button>

          {profile?.role === "user" && (
            <motion.button
              onClick={() => navigate("/services")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white"
            >
              <Zap className="h-4 w-4" />
              Περιήγηση προπονητών
            </motion.button>
          )}
        </motion.div>
      </main>

      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-white/30">
          © 2026 · Peak Velocity
        </div>
      </footer>
    </div>
  )
}