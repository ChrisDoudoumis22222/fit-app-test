// src/pages/TrainerPostsViewPage.js
"use client"
import { useState, useEffect, memo, useRef, useTransition } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../supabaseClient"
import { useAuth } from "../AuthProvider"
import { motion } from "framer-motion"
import {
  MapPin,
  Calendar,
  Award,
  Clock,
  User,
  BookOpen,
  Loader2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  BadgeCheck, // verified tick
  Tag,        // category chip icon
} from "lucide-react"
import TrainerMenu from "../components/TrainerMenu"
import UserMenu from "../components/UserMenu"

const PLACEHOLDER = "/placeholder.svg?height=300&width=400&text=No+Image"
const AVATAR_PLACEHOLDER = "/placeholder.svg?height=120&width=120&text=Avatar"
const POSTS_PER_PAGE = 9
const CARD_INTRINSIC_HEIGHT = 420

/* ---------- Categories + default label ---------- */
const TRAINER_CATEGORIES = [
  { value: "personal_trainer", label: "Προσωπικός Εκπαιδευτής" },
  { value: "group_fitness_instructor", label: "Εκπαιδευτής Ομαδικών" },
  { value: "pilates_instructor", label: "Pilates" },
  { value: "yoga_instructor", label: "Yoga" },
  { value: "nutritionist", label: "Διατροφή" },
  { value: "online_coach", label: "Online" },
  { value: "strength_conditioning", label: "Strength" },
  { value: "calisthenics", label: "Calisthenics" },
  { value: "crossfit_coach", label: "CrossFit" },
  { value: "boxing_kickboxing", label: "Boxing" },
  { value: "martial_arts", label: "Πολεμικές Τέχνες" },
  { value: "dance_fitness", label: "Dance Fitness" },
  { value: "running_coach", label: "Running" },
  { value: "physiotherapist", label: "Φυσικοθεραπευτής" },
  { value: "rehab_prevention", label: "Αποκατάσταση" },
  { value: "wellness_life_coach", label: "Ευεξία" },
  { value: "performance_psych", label: "Αθλητική Ψυχ." },
]
const DEFAULT_CATEGORY = "Γενικός Εκπαιδευτής"
const categoryByValue = (v) => TRAINER_CATEGORIES.find((c) => c.value === v) || null

/* ---------- Background (solid + radial glow + grid lines) ---------- */
const LinedBackground = memo(() => (
  <>
    <style>{`
      :root { --side-w: 0px; --nav-h: 0px; }
      @media (min-width: 1024px){ :root { --side-w: 280px; } }
      body { background: #000 !important; }
    `}</style>

    <div className="fixed inset-0 -z-50">
      {/* base */}
      <div className="absolute inset-0 bg-black" />

      {/* grid lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px",
        }}
      />

      {/* soft radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.12), transparent 55%)",
        }}
      />

      {/* dark fade for contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/70" />
    </div>
  </>
))

/* ---------- Glass Card ---------- */
const GlassCard = memo(({ children, className = "", hover = false, ...props }) => (
  <div
    className={`
      relative overflow-hidden rounded-3xl border border-zinc-700/50 backdrop-blur-xl
      ${hover ? "hover:scale-[1.02] hover:border-zinc-600/70 transition-all duration-500" : ""}
      ${className}
    `}
    style={{
      background: "rgba(0, 0, 0, 0.4)",
      backdropFilter: "blur(20px) saturate(160%)",
      WebkitBackdropFilter: "blur(20px) saturate(160%)",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
      contentVisibility: "auto",
      containIntrinsicSize: "280px",
    }}
    {...props}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-zinc-600/10 via-transparent to-transparent" />
    <div className="relative">{children}</div>
  </div>
))

/* ---------- LazyRender + Skeleton ---------- */
const LazyRender = memo(function LazyRender({ children, height = CARD_INTRINSIC_HEIGHT }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin: "400px" }
    )
    io.observe(node)
    return () => io.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      style={{ minHeight: height, contentVisibility: "auto", containIntrinsicSize: `${height}px` }}
      className="will-change-transform"
    >
      {visible ? children : <CardSkeleton />}
    </div>
  )
})
const CardSkeleton = memo(function CardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/50 shadow-2xl">
      <div className="h-44 sm:h-48 bg-zinc-800/60 animate-pulse" />
      <div className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-zinc-800 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-36 bg-zinc-800 rounded animate-pulse" />
            <div className="h-3 w-24 bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-5 w-3/4 bg-zinc-800 rounded animate-pulse" />
        <div className="h-4 w-full bg-zinc-800 rounded animate-pulse" />
        <div className="h-4 w-5/6 bg-zinc-800 rounded animate-pulse" />
      </div>
    </div>
  )
})

/* ---------- Main Component ---------- */
export default function TrainerPostsViewPage() {
  const { trainerId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [trainer, setTrainer] = useState(null)
  const [posts, setPosts] = useState([])
  const [displayed, setDisplayed] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isPending, startTransition] = useTransition()
  const loadMoreRef = useRef(null)

  useEffect(() => {
    if (trainerId) fetchTrainerAndPosts()
  }, [trainerId])

  useEffect(() => {
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          handleLoadMore()
        }
      },
      { rootMargin: "160px" }
    )
    if (loadMoreRef.current) io.observe(loadMoreRef.current)
    return () => io.disconnect()
  }, [hasMore, loadingMore, loading, displayed])

  const fetchTrainerAndPosts = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data: trainerData, error: trainerError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", trainerId)
        .eq("role", "trainer")
        .single()
      if (trainerError) throw new Error("Trainer not found")
      setTrainer(trainerData)
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("id, title, description, image_url, image_urls, created_at, likes, comments_count")
        .eq("trainer_id", trainerId)
        .order("created_at", { ascending: false })
      if (postsError) throw postsError
      const arr = postsData || []
      setPosts(arr)
      setPage(1)
      setDisplayed(arr.slice(0, POSTS_PER_PAGE))
      setHasMore(arr.length > POSTS_PER_PAGE)
    } catch (err) {
      console.error("Error fetching trainer and posts:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    startTransition(() => {
      const nextPg = page + 1
      const slice = posts.slice(0, nextPg * POSTS_PER_PAGE)
      setDisplayed(slice)
      setPage(nextPg)
      setHasMore(slice.length < posts.length)
      setLoadingMore(false)
    })
  }

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString("el-GR", { year: "numeric", month: "long", day: "numeric" })
  const formatJoinDate = (dateString) =>
    new Date(dateString).toLocaleDateString("el-GR", { year: "numeric", month: "long" })
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

  const handlePostClick = (postId) => navigate(`/post/${postId}`)
  const Menu = profile?.role === "trainer" ? TrainerMenu : UserMenu
  const hasDiploma = Boolean(trainer?.diploma_url?.trim())
  const categoryLabel = categoryByValue(trainer?.specialty)?.label || DEFAULT_CATEGORY

  /* ---------- Loading / Error / Not found ---------- */
  if (loading) {
    return (
      <div className="relative min-h-screen text-gray-100 bg-black overflow-x-hidden">
        <LinedBackground />
        <div className="lg:pl-[calc(var(--side-w)+8px)] transition-[padding]">
          <Menu />
          <div className="relative z-10 flex items-center justify-center h-[75vh] px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-5 sm:gap-6 p-6 sm:p-8 rounded-3xl border border-zinc-700/50"
              style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(20px) saturate(160%)", WebkitBackdropFilter: "blur(20px) saturate(160%)" }}
            >
              <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-zinc-400" />
              <div className="text-center space-y-1">
                <h3 className="text-lg sm:text-xl font-semibold text-zinc-100">Φόρτωση προπονητή</h3>
                <p className="text-zinc-400 text-sm">Προετοιμασία των αναρτήσεων...</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative min-h-screen text-gray-100 bg-black overflow-x-hidden">
        <LinedBackground />
        <div className="lg:pl-[calc(var(--side-w)+8px)] transition-[padding]">
          <Menu />
          <div className="relative z-10 flex items-center justify-center h-[75vh] px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center p-6 sm:p-8 rounded-3xl max-w-md border border-red-500/30"
              style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(20px) saturate(160%)", WebkitBackdropFilter: "blur(20px) saturate(160%)", boxShadow: "0 8px 32px rgba(220, 38, 38, 0.2)" }}
            >
              <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-red-400 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold text-red-400 mb-2">Σφάλμα φόρτωσης</h3>
              <p className="text-red-300 mb-4 text-sm sm:text-base">{error}</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/posts")}
                className="px-5 py-2.5 sm:px-6 sm:py-3 bg-red-600/20 text-red-200 rounded-xl hover:bg-red-600/30 transition-all duration-300 font-medium border border-red-500/30"
              >
                Επιστροφή στις αναρτήσεις
              </motion.button>
            </motion.div>
          </div>
        </div>
      </div>
    )
  }

  if (!trainer) {
    return (
      <div className="relative min-h-screen text-gray-100 bg-black overflow-x-hidden">
        <LinedBackground />
        <div className="lg:pl-[calc(var(--side-w)+8px)] transition-[padding]">
          <Menu />
          <div className="relative z-10 flex items-center justify-center h-[75vh] px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center p-6 sm:p-8 rounded-3xl max-w-md border border-zinc-700/50"
              style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(20px) saturate(160%)", WebkitBackdropFilter: "blur(20px) saturate(160%)" }}
            >
              <User className="h-10 w-10 sm:h-12 sm:w-12 text-zinc-400 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-zinc-100 mb-2">Ο προπονητής δεν βρέθηκε</h3>
              <p className="text-zinc-400 mb-4 text-sm sm:text-base">Ο προπονητής που ψάχνετε δεν υπάρχει ή έχει διαγραφεί.</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/posts")}
                className="px-5 py-2.5 sm:px-6 sm:py-3 bg-zinc-700/20 text-zinc-100 rounded-xl hover:bg-zinc-600/30 transition-all duration-300 font-medium border border-zinc-600/30"
              >
                Επιστροφή στις αναρτήσεις
              </motion.button>
            </motion.div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen text-gray-100 bg-black overflow-x-hidden">
      <LinedBackground />

      <div className="lg:pl-[calc(var(--side-w)+8px)] transition-[padding]">
        <Menu />

        <main className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
          {/* Profile Header (no back/return button) */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <GlassCard className="p-5 sm:p-6 md:p-8 mb-6 sm:mb-8" hover>
              {/* mobile: center everything / desktop: left-align */}
              <div className="flex flex-col items-center lg:items-start lg:flex-row gap-6 sm:gap-8">
                {/* Avatar */}
                <div className="flex-shrink-0 self-center lg:self-start">
                  <div className="relative">
                    <div className="w-28 h-28 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden ring-4 ring-zinc-700/50 shadow-2xl border border-zinc-700/50">
                      {trainer.avatar_url ? (
                        <img
                          src={trainer.avatar_url || "/placeholder.svg"}
                          alt={trainer.full_name}
                          className="w-full h-full object-cover"
                          loading="eager"
                          decoding="async"
                          onError={(e) => {
                            e.currentTarget.onerror = null
                            e.currentTarget.src = AVATAR_PLACEHOLDER
                          }}
                        />
                      ) : (
                        <User className="h-14 w-14 sm:h-16 sm:w-16 text-zinc-400" />
                      )}
                    </div>

                    {hasDiploma && (
                      <div
                        className="absolute -bottom-1.5 -right-1.5 w-9 h-9 sm:w-10 sm:h-10 bg-blue-600 rounded-full border-4 border-black flex items-center justify-center shadow-lg"
                        title="Verified diploma"
                      >
                        <BadgeCheck className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 text-center lg:text-left">
                  {/* mobile: center name + chip */}
                  <div className="flex flex-col items-center sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-zinc-100 break-words text-center sm:text-left">
                      {trainer.full_name || trainer.email}
                    </h1>

                    {/* Category chip */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/60 border border-zinc-700/60 text-zinc-200 text-xs sm:text-sm w-fit max-w-[70vw] sm:max-w-none mx-auto sm:mx-0 mb-2 sm:mb-0">
                      <Tag className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{categoryLabel}</span>
                    </div>
                  </div>

                  {/* Stats Grid (fixed layout) */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-5 sm:mb-6 text-center">
                    {/* Ειδικότητα */}
                    <div className="flex flex-col items-center text-zinc-300">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mb-2">
                        <Award className="h-5 w-5 text-blue-400" />
                      </div>
                      <p className="text-[11px] sm:text-xs text-zinc-400">Ειδικότητα</p>
                      <p className="text-sm font-medium truncate">{categoryLabel}</p>
                    </div>

                    {/* Εμπειρία */}
                    {trainer.experience_years && (
                      <div className="flex flex-col items-center text-zinc-300">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center mb-2">
                          <Clock className="h-5 w-5 text-emerald-400" />
                        </div>
                        <p className="text-[11px] sm:text-xs text-zinc-400">Εμπειρία</p>
                        <p className="text-sm font-medium">{trainer.experience_years} χρόνια</p>
                      </div>
                    )}

                    {/* Τοποθεσία */}
                    {trainer.location && (
                      <div className="flex flex-col items-center text-zinc-300">
                        <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center mb-2">
                          <MapPin className="h-5 w-5 text-rose-400" />
                        </div>
                        <p className="text-[11px] sm:text-xs text-zinc-400">Τοποθεσία</p>
                        <p className="text-sm font-medium truncate">{trainer.location}</p>
                      </div>
                    )}

                    {/* Αναρτήσεις */}
                    <div className="flex flex-col items-center text-zinc-300">
                      <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center mb-2">
                        <BookOpen className="h-5 w-5 text-purple-400" />
                      </div>
                      <p className="text-[11px] sm:text-xs text-zinc-400">Αναρτήσεις</p>
                      <p className="text-sm font-medium">{posts.length}</p>
                    </div>
                  </div>

                  {trainer.bio && (
                    <p className="text-zinc-300 leading-relaxed mb-4 sm:mb-6 max-w-3xl text-sm sm:text-base">
                      {trainer.bio}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 justify-center sm:justify-start">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-400">
                      <Calendar className="h-4 w-4" />
                      <span>Μέλος από {formatJoinDate(trainer.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Posts Section */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <div className="flex items-center gap-2 sm:gap-3 mb-5 sm:mb-8">
              <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-100 break-words">
                Αναρτήσεις από {trainer.full_name || trainer.email}
              </h2>
            </div>

            {posts.length === 0 ? (
              <GlassCard className="p-10 sm:p-12 text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-5 sm:mb-6 border border-zinc-700/50">
                  <BookOpen className="h-8 w-8 sm:h-10 sm:w-10 text-zinc-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-zinc-100 mb-2">Δεν υπάρχουν αναρτήσεις</h3>
                <p className="text-zinc-400 text-sm sm:text-base">Αυτός ο προπονητής δεν έχει δημοσιεύσει περιεχόμενο ακόμη.</p>
              </GlassCard>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {displayed.map((post, index) => (
                    <LazyRender key={post.id} height={CARD_INTRINSIC_HEIGHT}>
                      <PostCard
                        post={post}
                        index={index}
                        onClick={() => handlePostClick(post.id)}
                        formatRelativeTime={formatRelativeTime}
                        priority={index < 6}
                      />
                    </LazyRender>
                  ))}
                </div>

                {(hasMore || loadingMore || isPending) && (
                  <div ref={loadMoreRef} className="flex justify-center py-8 sm:py-10">
                    {loadingMore || isPending ? (
                      <div className="flex items-center gap-2 sm:gap-3 text-zinc-300 text-sm sm:text-base">
                        <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
                        <span>Φόρτωση…</span>
                      </div>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleLoadMore}
                        className="flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 bg-white/10 text-neutral-100 rounded-xl hover:bg-white/15 border border-white/15 transition-all text-sm sm:text-base"
                      >
                        <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />
                        Φόρτωση περισσότερων
                      </motion.button>
                    )}
                  </div>
                )}
              </>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  )
}

/* ---------- Post Card ---------- */
const PostCard = memo(({ post, index, onClick, formatRelativeTime, priority = false }) => {
  const postImage = post.image_urls?.[0] || post.image_url || PLACEHOLDER
  const hasMultipleImages = (post.image_urls?.length || 0) > 1

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.25), duration: 0.4 }}
      whileHover={{ scale: 1.02, y: -3 }}
      onClick={onClick}
      className="group cursor-pointer"
      style={{ contentVisibility: "auto", containIntrinsicSize: `${CARD_INTRINSIC_HEIGHT}px` }}
    >
      <GlassCard hover className="overflow-hidden">
        {/* Image */}
        <div className="relative h-44 sm:h-48 overflow-hidden">
          <img
            src={postImage || "/placeholder.svg"}
            alt={post.title}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchpriority={priority ? "high" : "auto"}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-3 sm:space-y-4">
          <h3 className="text-lg sm:text-xl font-bold text-zinc-100 line-clamp-2 leading-tight">{post.title}</h3>
          <p className="text-zinc-300 text-sm sm:text-base line-clamp-3 leading-relaxed">{post.description}</p>
          <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-zinc-700/50">
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-zinc-400">
              <Clock className="h-4 w-4" />
              <span>{formatRelativeTime(post.created_at)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-500 group-hover:text-zinc-300 transition-colors">
              <ExternalLink className="h-4 w-4" />
              <span>Προβολή</span>
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.article>
  )
})
