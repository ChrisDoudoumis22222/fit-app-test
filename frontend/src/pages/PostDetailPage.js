// src/pages/PostDetailPage.jsx
"use client"
import { useEffect, useState, memo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  Calendar,
  MapPin,
  Clock,
  Heart,
  Share2,
  MessageCircle,
  User,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Loader2,
  AlertCircle,
  Star,
  Zap,
  Activity,
  BadgeCheck,
} from "lucide-react"
import { motion } from "framer-motion"
import { supabase } from "../supabaseClient"
import { useAuth } from "../AuthProvider"
import UserMenu from "../components/UserMenu"
import TrainerMenu from "../components/TrainerMenu"
import CommentsSection from "../components/CommentsSection"

const POST_PLACEHOLDER = "/placeholder.svg?height=400&width=600&text=Post+Image"
const AVATAR_PLACEHOLDER = "/placeholder.svg?height=80&width=80&text=Avatar"

/* === Subtle “code grid” background; keeps menu badge white, removes right seam === */
const CodeGridBackground = memo(() => (
  <>
    <style>{`
      @keyframes grid-pan {
        0% { transform: translate(0,0); }
        100% { transform: translate(60px, 60px); }
      }
      /* Remove bright right-edge seam from the side menu ONLY on the container itself */
      .menu-fix { background-color: transparent !important; }
      .menu-fix [class*="border-r"], .menu-fix [style*="border-right"] { border-right: 0 !important; }
    `}</style>

    {/* Base */}
    <div className="fixed inset-0 -z-50 bg-black" />

    {/* Soft radial falloff */}
    <div className="fixed inset-0 -z-50 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.08),transparent_55%)]" />

    {/* Fine + coarse grid layers with slow pan */}
    <div
      className="fixed inset-0 -z-50 will-change-transform pointer-events-none"
      style={{
        animation: "grid-pan 32s linear infinite",
        backgroundImage: `
          linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px),
          linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "24px 24px, 24px 24px, 120px 120px, 120px 120px",
        maskImage:
          "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 82%)",
        WebkitMaskImage:
          "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 82%)",
      }}
    />
  </>
))

/* Animated Counter Component */
const AnimatedCounter = memo(({ value, duration = 1000 }) => {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let start = 0
    const end = Number.parseInt(value) || 0
    if (start === end) return

    const timer = setInterval(() => {
      start += Math.ceil(end / (duration / 16))
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

/* Small, consistent stat chip */
const StatChip = ({ icon: Icon, count, tint = "neutral", size = "md" }) => {
  const pad = size === "sm" ? "px-2.5 py-1" : "px-3 py-1.5"
  const text = size === "sm" ? "text-xs" : "text-sm"
  const iconTint =
    tint === "like" ? "text-red-400" : tint === "comment" ? "text-blue-400" : "text-white/80"
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full
                  border border-white/15 bg-black/35 text-white/90
                  backdrop-blur-md shadow-sm ${pad} ${text}`}
    >
      <Icon className={`h-4 w-4 ${iconTint}`} />
      <span>{count}</span>
    </span>
  )
}

/* Star Rating (shows “Χωρίς κριτικές” if used; we’ll only render it when reviewCount>0) */
function StarRating({ rating = 0, reviewCount = 0, size = "sm" }) {
  const starSize = size === "lg" ? "h-5 w-5" : "h-4 w-4"
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5
  const empty = 5 - full - (half ? 1 : 0)

  const stars = []
  for (let i = 0; i < full; i++) {
    stars.push(<Star key={`full-${i}`} className={`${starSize} fill-yellow-400 text-yellow-400`} />)
  }
  if (half) {
    stars.push(
      <div key="half" className={`relative ${starSize}`}>
        <Star className={`${starSize} text-zinc-600 absolute`} />
        <div className="overflow-hidden w-1/2">
          <Star className={`${starSize} fill-yellow-400 text-yellow-400`} />
        </div>
      </div>,
    )
  }
  for (let i = 0; i < empty; i++) {
    stars.push(<Star key={`empty-${i}`} className={`${starSize} text-zinc-600`} />)
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">{stars}</div>
      <span className={`${size === "lg" ? "text-base" : "text-sm"} text-zinc-400`}>
        {rating > 0 ? (
          <>
            {rating.toFixed(1)} ({reviewCount} {reviewCount === 1 ? "κριτική" : "κριτικές"})
          </>
        ) : (
          "Χωρίς κριτικές"
        )}
      </span>
    </div>
  )
}

/* Page */
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
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)

  const Menu = profile?.role === "trainer" ? TrainerMenu : UserMenu

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const { data, error } = await supabase
          .from("posts")
          .select(`
            *,
            trainer:profiles!trainer_id (
              id,
              full_name,
              email,
              avatar_url,
              bio,
              specialty,
              location,
              experience_years,
              created_at
            )
          `)
          .eq("id", id)
          .single()

        if (error) {
          setError(error.message)
        } else {
          // compute rating + reviews from trainer_reviews
          let trainerData = data.trainer ?? {}
          if (trainerData?.id) {
            const { data: revs } = await supabase
              .from("trainer_reviews")
              .select("rating")
              .eq("trainer_id", trainerData.id)

            const ratings = (revs ?? [])
              .map((r) => Number(r.rating))
              .filter((n) => !Number.isNaN(n))
            const reviewCount = ratings.length
            const avgRating = reviewCount ? ratings.reduce((a, b) => a + b, 0) / reviewCount : 0
            trainerData = { ...trainerData, rating: avgRating, reviewCount }
          }

          const updated = { ...data, trainer: trainerData }
          setPost(updated)
          setLikeCount(updated.likes || 0)
          setCommentsCount(updated.comments_count || 0)

          if (profile?.id) {
            const likedPosts = JSON.parse(localStorage.getItem(`liked_posts_${profile.id}`) || "[]")
            setIsLiked(likedPosts.includes(updated.id))
          }
          if (updated.trainer_id) {
            fetchRelatedPosts(updated.trainer_id, id)
          }
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [id, profile?.id])

  const fetchRelatedPosts = async (trainerId, currentPostId) => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("id, title, image_url, image_urls, created_at, likes, comments_count")
        .eq("trainer_id", trainerId)
        .neq("id", currentPostId)
        .order("created_at", { ascending: false })
        .limit(6)

      if (!error && data) {
        setRelatedPosts(data)
      }
    } catch (err) {
      console.error("Error fetching related posts:", err)
    }
  }

  const handleLike = async () => {
    if (!profile?.id) {
      alert("Παρακαλώ συνδεθείτε για να κάνετε like")
      return
    }
    if (isLiking) return

    setIsLiking(true)
    try {
      const likedPosts = JSON.parse(localStorage.getItem(`liked_posts_${profile.id}`) || "[]")
      if (isLiked) {
        const { error } = await supabase.rpc("decrement_likes", { post_id: id })
        if (error) {
          const { data: currentPost } = await supabase.from("posts").select("likes").eq("id", id).single()
          const newLikes = Math.max(0, (currentPost?.likes || 1) - 1)
          await supabase.from("posts").update({ likes: newLikes }).eq("id", id)
        }
        const updatedLikedPosts = likedPosts.filter((postId) => postId !== id)
        localStorage.setItem(`liked_posts_${profile.id}`, JSON.stringify(updatedLikedPosts))
        setIsLiked(false)
        setLikeCount((prev) => Math.max(0, prev - 1))
      } else {
        const { error } = await supabase.rpc("increment_likes", { post_id: id })
        if (error) {
          const { data: currentPost } = await supabase.from("posts").select("likes").eq("id", id).single()
          const newLikes = (currentPost?.likes || 0) + 1
          await supabase.from("posts").update({ likes: newLikes }).eq("id", id)
        }
        const updatedLikedPosts = [...likedPosts, id]
        localStorage.setItem(`liked_posts_${profile.id}`, JSON.stringify(updatedLikedPosts))
        setIsLiked(true)
        setLikeCount((prev) => prev + 1)
      }
    } catch (err) {
      console.error("Error toggling like:", err)
      alert("Σφάλμα κατά την ενημέρωση του like")
    } finally {
      setIsLiking(false)
    }
  }

  const handleShare = async () => {
    const shareData = {
      title: post.title,
      text: post.description,
      url: window.location.href,
    }

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(window.location.href)
        alert("Ο σύνδεσμος αντιγράφηκε στο clipboard!")
      }
    } catch (err) {
      console.error("Error sharing:", err)
      try {
        await navigator.clipboard.writeText(window.location.href)
        alert("Ο σύνδεσμος αντιγράφηκε στο clipboard!")
      } catch {
        alert("Δεν ήταν δυνατή η κοινοποίηση")
      }
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("el-GR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatRelativeTime = (dateString) => {
    const now = new Date()
    const postDate = new Date(dateString)
    const diffInHours = Math.floor((now - postDate) / (1000 * 60 * 60))
    if (diffInHours < 1) return "Μόλις τώρα"
    if (diffInHours < 24) return `${diffInHours}ω πριν`
    if (diffInHours < 48) return "Χθες"
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} μέρες πριν`
    return formatDate(dateString)
  }

  const handleCommentCountUpdate = (newCount) => setCommentsCount(newCount)

  /* Loading */
  if (authLoading || loading) {
    return (
      <div className="relative min-h-screen text-gray-100">
        <CodeGridBackground />
        <div className="menu-fix">
          <Menu />
        </div>
        <div className="flex items-center justify-center h-[75vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-6 p-8 rounded-3xl border border-zinc-700/50 bg-black/40 backdrop-blur-xl"
          >
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-zinc-400" />
              <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full bg-zinc-400/20" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-zinc-100">Φόρτωση ανάρτησης</h3>
              <p className="text-zinc-400">Προετοιμασία του περιεχομένου...</p>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative min-h-screen text-gray-100">
        <CodeGridBackground />
        <div className="menu-fix">
          <Menu />
        </div>
        <div className="flex items-center justify-center h-[75vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center p-8 rounded-3xl max-w-md border border-red-500/30 bg-black/40 backdrop-blur-xl shadow-[0_8px_32px_rgba(220,38,38,0.2)]"
          >
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-400 mb-2">Σφάλμα φόρτωσης</h3>
            <p className="text-red-300 mb-4">{error}</p>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-red-600/20 text-red-200 rounded-xl hover:bg-red-600/30 transition-all duration-300 font-medium border border-red-500/30"
            >
              Επιστροφή
            </button>
          </motion.div>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="relative min-h-screen text-gray-100">
        <CodeGridBackground />
        <div className="menu-fix">
          <Menu />
        </div>
        <div className="flex items-center justify-center h-[75vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center p-8 rounded-3xl max-w-md border border-zinc-700/50 bg-black/40 backdrop-blur-xl"
          >
            <h3 className="text-xl font-semibold text-zinc-100 mb-2">Η ανάρτηση δεν βρέθηκε</h3>
            <p className="text-zinc-400 mb-4">Η ανάρτηση που ψάχνετε δεν υπάρχει ή έχει διαγραφεί.</p>
            <button
              onClick={() => navigate("/posts")}
              className="px-6 py-3 bg-zinc-700/20 text-zinc-100 rounded-xl hover:bg-zinc-600/30 transition-all duration-300 font-medium border border-zinc-600/30"
            >
              Προβολή όλων των αναρτήσεων
            </button>
          </motion.div>
        </div>
      </div>
    )
  }

  const trainer = post.trainer ?? {}
  const images = post.image_urls?.length ? post.image_urls : [post.image_url].filter(Boolean)
  const hasMultipleImages = images.length > 1

  const handleTouchStart = (e) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }
  const handleTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX)
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50
    if (isLeftSwipe && currentImageIndex < images.length - 1) setCurrentImageIndex((p) => p + 1)
    if (isRightSwipe && currentImageIndex > 0) setCurrentImageIndex((p) => p - 1)
  }

  return (
    <div className="relative min-h-screen text-gray-100">
      <CodeGridBackground />
      <div className="menu-fix">
        <Menu />
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Main Post Card */}
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl shadow-2xl border border-zinc-700/50 mb-8 hover:border-zinc-600/70 transition-all duration-500"
          style={{
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(20px) saturate(160%)",
            WebkitBackdropFilter: "blur(20px) saturate(160%)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
          }}
        >
          {/* Hero with images */}
          {images.length > 0 && (
            <div className="relative h-72 sm:h-[60vh] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
              <div
                className="relative w-full h-full flex transition-transform duration-300 ease-out"
                style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {images.map((image, idx) => (
                  <motion.img
                    key={idx}
                    src={image || POST_PLACEHOLDER}
                    alt={`${post.title} - Image ${idx + 1}`}
                    className="w-full h-full object-cover flex-shrink-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  />
                ))}
              </div>

              {/* Arrows + dots */}
              {hasMultipleImages && (
                <>
                  {currentImageIndex > 0 && (
                    <button
                      onClick={() => setCurrentImageIndex((prev) => prev - 1)}
                      className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-black/70 transition-all duration-200"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  )}

                  {currentImageIndex < images.length - 1 && (
                    <button
                      onClick={() => setCurrentImageIndex((prev) => prev + 1)}
                      className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-black/70 transition-all duration-200"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  )}

                  <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-20">
                    <div className="flex gap-2">
                      {images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            idx === currentImageIndex ? "bg-white scale-125" : "bg-white/50 hover:bg-white/70"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-20">
                    <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 text-white text-xs sm:text-sm font-medium">
                      {currentImageIndex + 1} / {images.length}
                    </span>
                  </div>
                </>
              )}

              {/* Stats overlay */}
              <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-20 flex gap-2 sm:gap-3">
                <StatChip icon={Heart} count={<AnimatedCounter value={likeCount} />} tint="like" />
                <StatChip icon={MessageCircle} count={<AnimatedCounter value={commentsCount} />} tint="comment" />
              </div>

              {/* Title overlay */}
              <div className="absolute bottom-6 sm:bottom-8 left-4 sm:left-8 right-4 sm:right-8 z-20">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-3 sm:space-y-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 backdrop-blur-xl border border-blue-500/30 text-blue-200 text-xs sm:text-sm font-medium">
                      <Calendar className="h-4 w-4" />
                      {formatRelativeTime(post.created_at)}
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-zinc-100 leading-tight drop-shadow-lg">
                    {post.title}
                  </h1>
                </motion.div>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-6 sm:p-8 md:p-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="max-w-none mb-6 sm:mb-8"
            >
              <p className="text-zinc-300 leading-relaxed text-base sm:text-lg whitespace-pre-wrap">{post.description}</p>
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex flex-wrap items-center gap-3 sm:gap-4 p-4 sm:p-6 rounded-2xl bg-black/20 backdrop-blur-xl border border-zinc-700/50 mb-6 sm:mb-8"
            >
              <motion.button
                onClick={handleLike}
                disabled={isLiking || !profile?.id}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-300 ${
                  isLiked
                    ? "bg-red-500/20 text-red-200 border border-red-500/30 hover:bg-red-500/30 shadow-lg shadow-red-500/25"
                    : "bg-zinc-800/50 text-zinc-100 border border-zinc-700/50 hover:bg-zinc-700/50"
                } ${isLiking ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Heart className={`h-5 w-5 ${isLiked ? "fill-current" : ""} ${isLiking ? "animate-pulse" : ""}`} />
                <AnimatedCounter value={likeCount} />
              </motion.button>

              <motion.button
                onClick={handleShare}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 hover:bg-emerald-500/30 rounded-xl font-medium transition-all duration-300 shadow-lg shadow-emerald-500/25"
              >
                <Share2 className="h-5 w-5" />
                Κοινοποίηση
              </motion.button>

              <motion.button
                onClick={() => document.getElementById("comments")?.scrollIntoView({ behavior: "smooth" })}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-blue-500/20 text-blue-200 border border-blue-500/30 hover:bg-blue-500/30 rounded-xl font-medium transition-all duration-300 shadow-lg shadow-blue-500/25"
              >
                <MessageCircle className="h-5 w-5" />
                Σχόλια (<AnimatedCounter value={commentsCount} />)
              </motion.button>
            </motion.div>

            {/* Trainer Card — tidied, blue tick, category chip */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="relative overflow-hidden rounded-2xl border border-zinc-700/50 p-6 sm:p-8 hover:border-zinc-600/70 transition-all duration-300"
              style={{
                background: "rgba(0,0,0,0.4)",
                backdropFilter: "blur(20px) saturate(160%)",
                WebkitBackdropFilter: "blur(20px) saturate(160%)",
              }}
            >
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6">
                {/* Avatar + blue tick */}
                <div className="relative shrink-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden ring-4 ring-zinc-700/50 shadow-2xl border border-zinc-700/50">
                    {trainer.avatar_url ? (
                      <img
                        src={trainer.avatar_url || "/placeholder.svg"}
                        alt={trainer.full_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null
                          e.currentTarget.src = AVATAR_PLACEHOLDER
                        }}
                      />
                    ) : (
                      <User className="h-10 w-10 text-zinc-400" />
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-7 h-7 sm:w-8 sm:h-8 bg-sky-500 rounded-full border-4 border-black flex items-center justify-center shadow-lg">
                    <BadgeCheck className="h-4 w-4 text-white" />
                  </div>
                </div>

                <div className="flex-1 w-full">
                  {/* Name + category chip + rating (only if > 0) */}
                  <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 mb-3 text-center sm:text-left">
                    <button
                      onClick={() => navigate(`/trainer/${trainer.id}`)}
                      className="text-xl sm:text-2xl font-bold text-zinc-100 hover:text-white hover:underline underline-offset-4 decoration-zinc-500"
                    >
                      {trainer.full_name || trainer.email || "Unknown Trainer"}
                    </button>

                    {/* Category chip (replaces “Pro”) */}
                    {trainer.specialty && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-200 text-xs sm:text-sm font-medium">
                        {trainer.specialty}
                      </span>
                    )}

                    {/* Rating only if there are reviews */}
                    {Number(trainer.reviewCount) > 0 && (
                      <div className="flex justify-center sm:justify-start">
                        <StarRating
                          rating={Number(trainer.rating) || 0}
                          reviewCount={Number(trainer.reviewCount) || 0}
                        />
                      </div>
                    )}
                  </div>

                  {/* Info rows: experience + location */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-5 sm:mb-6">
                    {trainer.experience_years && (
                      <div className="flex items-center gap-3 text-zinc-300">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <Clock className="h-4 w-4 text-emerald-400" />
                        </div>
                        <span className="text-sm sm:text-base">
                          {trainer.experience_years} χρόνια εμπειρίας
                        </span>
                      </div>
                    )}
                    {trainer.location && (
                      <div className="flex items-center gap-3 text-zinc-300">
                        <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center">
                          <MapPin className="h-4 w-4 text-rose-400" />
                        </div>
                        <span className="text-sm sm:text-base">
                          {trainer.location}
                        </span>
                      </div>
                    )}
                  </div>

                  {trainer.bio && (
                    <p className="text-zinc-300 text-sm sm:text-base leading-relaxed mb-5 sm:mb-6 italic text-center sm:text-left">
                      {trainer.bio}
                    </p>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full">
                    <motion.button
                      onClick={() => navigate(`/trainer/${trainer.id}/posts`)}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-zinc-800/50 text-zinc-100 border border-zinc-700/50 hover:bg-zinc-700/50 rounded-xl font-medium transition-all duration-300"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Όλες οι αναρτήσεις
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.article>

        {/* Comments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          id="comments"
        >
          <CommentsSection
            postId={id}
            initialCommentsCount={commentsCount}
            onCommentCountUpdate={handleCommentCountUpdate}
          />
        </motion.div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="mt-12"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-6 sm:mb-8">
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-blue-400" />
                <h2 className="text-xl sm:text-2xl font-bold text-zinc-100">Περισσότερα από αυτόν τον προπονητή</h2>
              </div>
              <button
                onClick={() => navigate(`/trainer/${trainer.id}/posts`)}
                className="flex items-center gap-2 text-zinc-300 hover:text-zinc-100 transition-colors self-start sm:self-auto"
              >
                <span className="text-sm font-medium">Προβολή όλων</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {relatedPosts.map((relatedPost, index) => (
                <RelatedPostCard key={relatedPost.id} post={relatedPost} onNavigate={navigate} index={index} />
              ))}
            </div>
          </motion.section>
        )}

        {/* Bottom Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-10 sm:mt-12 justify-center"
        >
          <motion.button
            onClick={() => navigate("/posts")}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-zinc-800/50 text-zinc-100 border border-zinc-700/50 hover:bg-zinc-700/50 rounded-2xl font-medium transition-all duration-300 shadow-lg"
          >
            <Activity className="h-5 w-5" />
            Προβολή όλων των αναρτήσεων
          </motion.button>
          {profile?.role === "user" && (
            <motion.button
              onClick={() => navigate("/services")}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-blue-500/20 text-blue-200 border border-blue-500/30 hover:bg-blue-500/30 rounded-2xl font-medium transition-all duration-300 shadow-lg"
            >
              <Zap className="h-5 w-5" />
              Περιήγηση προπονητών
            </motion.button>
          )}
        </motion.div>
      </main>
    </div>
  )
}

/* Related Post Card */
function RelatedPostCard({ post, onNavigate, index }) {
  const postImage = post.image_urls?.[0] || post.image_url || POST_PLACEHOLDER
  const hasMultipleImages = post.image_urls?.length > 1

  const formatRelativeTime = (dateString) => {
    const now = new Date()
    const postDate = new Date(dateString)
    const diffInHours = Math.floor((now - postDate) / (1000 * 60 * 60))
    if (diffInHours < 1) return "Μόλις τώρα"
    if (diffInHours < 24) return `${diffInHours}ω πριν`
    if (diffInHours < 48) return "Χθες"
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} μέρες πριν`
    return new Date(dateString).toLocaleDateString("el-GR")
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={() => onNavigate(`/post/${post.id}`)}
      whileHover={{ y: -4, scale: 1.02 }}
      className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-500 hover:shadow-2xl border border-zinc-700/50 hover:border-zinc-600/70"
      style={{
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        boxShadow: "0 8px 25px -5px rgba(0,0,0,.3)",
      }}
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={postImage || "/placeholder.svg"}
          alt={post.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {hasMultipleImages && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-black/70 backdrop-blur-sm text-zinc-100 text-xs font-medium border border-zinc-700/50">
              <Sparkles className="h-3 w-3" />+{post.image_urls.length - 1}
            </span>
          </div>
        )}

        <div className="absolute top-3 left-3 flex gap-2">
          {post.likes > 0 && <StatChip icon={Heart} count={post.likes} tint="like" size="sm" />}
          {post.comments_count > 0 && (
            <StatChip icon={MessageCircle} count={post.comments_count} tint="comment" size="sm" />
          )}
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-zinc-100 font-semibold text-lg line-clamp-2 leading-tight drop-shadow-lg">
            {post.title}
          </h3>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatRelativeTime(post.created_at)}
          </span>
          <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
        </div>
      </div>
    </motion.article>
  )
}
