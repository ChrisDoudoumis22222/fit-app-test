"use client"
import { useState, useEffect, memo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../supabaseClient"
import { useAuth } from "../AuthProvider"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Award,
  Clock,
  User,
  BookOpen,
  Loader2,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Phone,
} from "lucide-react"
import TrainerMenu from "../components/TrainerMenu"
import UserMenu from "../components/UserMenu"

const PLACEHOLDER = "/placeholder.svg?height=300&width=400&text=No+Image"
const AVATAR_PLACEHOLDER = "/placeholder.svg?height=120&width=120&text=Avatar"

/* ---------- Enhanced Background Components ---------- */
const BaseBackground = memo(() => (
  <div className="fixed inset-0 -z-50">
    <div className="absolute inset-0 bg-black" />
    <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-black opacity-90" />
  </div>
))

const AthleticBackground = memo(() => (
  <>
    <style>{`
      @keyframes pulse-performance {
         0%, 100% { opacity: 0.1; transform: scale(1); }
         50% { opacity: 0.3; transform: scale(1.05); }
       }
      @keyframes drift-metrics {
         0% { transform: translateX(-100px) translateY(0px); }
         50% { transform: translateX(50px) translateY(-30px); }
         100% { transform: translateX(100px) translateY(0px); }
       }
      @keyframes athletic-grid {
         0% { transform: translate(0, 0) rotate(0deg); }
         100% { transform: translate(60px, 60px) rotate(0.5deg); }
       }
    `}</style>

    {/* Animated grid */}
    <div
      className="fixed inset-0 -z-40 pointer-events-none opacity-[0.15]"
      style={{
        backgroundImage: `
          linear-gradient(rgba(113,113,122,0.08) 1px, transparent 1px),
          linear-gradient(90deg, rgba(113,113,122,0.08) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
        animation: "athletic-grid 25s linear infinite",
        maskImage: "radial-gradient(circle at 50% 50%, black 0%, transparent 75%)",
        WebkitMaskImage: "radial-gradient(circle at 50% 50%, black 0%, transparent 75%)",
      }}
    />

    {/* Floating orbs */}
    <div className="fixed inset-0 -z-40 pointer-events-none overflow-hidden">
      <div
        className="absolute top-1/5 left-1/5 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-zinc-600/8 rounded-full blur-3xl"
        style={{ animation: "pulse-performance 12s ease-in-out infinite" }}
      />
      <div
        className="absolute top-3/5 right-1/5 w-[250px] h-[250px] sm:w-[400px] sm:h-[400px] bg-gray-700/8 rounded-full blur-3xl"
        style={{ animation: "pulse-performance 15s ease-in-out infinite reverse" }}
      />
      <div
        className="absolute top-1/2 left-1/2 w-[200px] h-[200px] sm:w-[300px] sm:h-[300px] bg-zinc-800/8 rounded-full blur-3xl"
        style={{ animation: "drift-metrics 20s ease-in-out infinite" }}
      />
    </div>
  </>
))

/* ---------- Glass Card Component ---------- */
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
    }}
    {...props}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-zinc-600/10 via-transparent to-transparent" />
    <div className="relative">{children}</div>
  </div>
))

/* ---------- Main Component ---------- */
export default function TrainerPostsViewPage() {
  const { trainerId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [trainer, setTrainer] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (trainerId) {
      fetchTrainerAndPosts()
    }
  }, [trainerId])

  const fetchTrainerAndPosts = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch trainer profile
      const { data: trainerData, error: trainerError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", trainerId)
        .eq("role", "trainer")
        .single()

      if (trainerError) {
        throw new Error("Trainer not found")
      }

      setTrainer(trainerData)

      // Fetch all posts from this trainer
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("id, title, description, image_url, image_urls, created_at, likes, comments_count")
        .eq("trainer_id", trainerId)
        .order("created_at", { ascending: false })

      if (postsError) {
        throw postsError
      }

      setPosts(postsData || [])
    } catch (err) {
      console.error("Error fetching trainer and posts:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("el-GR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatJoinDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("el-GR", {
      year: "numeric",
      month: "long",
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

  const handlePostClick = (postId) => {
    navigate(`/post/${postId}`)
  }

  const Menu = profile?.role === "trainer" ? TrainerMenu : UserMenu

  if (loading) {
    return (
      <div className="relative min-h-screen text-gray-100">
        <BaseBackground />
        <AthleticBackground />
        <Menu />
        <div className="relative z-10 flex items-center justify-center h-[75vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-6 p-8 rounded-3xl border border-zinc-700/50"
            style={{
              background: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(20px) saturate(160%)",
              WebkitBackdropFilter: "blur(20px) saturate(160%)",
            }}
          >
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-zinc-400" />
              <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full bg-zinc-400/20" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-zinc-100">Φόρτωση προπονητή</h3>
              <p className="text-zinc-400">Προετοιμασία των αναρτήσεων...</p>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative min-h-screen text-gray-100">
        <BaseBackground />
        <AthleticBackground />
        <Menu />
        <div className="relative z-10 flex items-center justify-center h-[75vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center p-8 rounded-3xl max-w-md border border-red-500/30"
            style={{
              background: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(20px) saturate(160%)",
              WebkitBackdropFilter: "blur(20px) saturate(160%)",
              boxShadow: "0 8px 32px rgba(220, 38, 38, 0.2)",
            }}
          >
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-400 mb-2">Σφάλμα φόρτωσης</h3>
            <p className="text-red-300 mb-4">{error}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/posts")}
              className="px-6 py-3 bg-red-600/20 text-red-200 rounded-xl hover:bg-red-600/30 transition-all duration-300 font-medium border border-red-500/30"
            >
              Επιστροφή στις αναρτήσεις
            </motion.button>
          </motion.div>
        </div>
      </div>
    )
  }

  if (!trainer) {
    return (
      <div className="relative min-h-screen text-gray-100">
        <BaseBackground />
        <AthleticBackground />
        <Menu />
        <div className="relative z-10 flex items-center justify-center h-[75vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center p-8 rounded-3xl max-w-md border border-zinc-700/50"
            style={{
              background: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(20px) saturate(160%)",
              WebkitBackdropFilter: "blur(20px) saturate(160%)",
            }}
          >
            <User className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-zinc-100 mb-2">Ο προπονητής δεν βρέθηκε</h3>
            <p className="text-zinc-400 mb-4">Ο προπονητής που ψάχνετε δεν υπάρχει ή έχει διαγραφεί.</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/posts")}
              className="px-6 py-3 bg-zinc-700/20 text-zinc-100 rounded-xl hover:bg-zinc-600/30 transition-all duration-300 font-medium border border-zinc-600/30"
            >
              Επιστροφή στις αναρτήσεις
            </motion.button>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen text-gray-100">
      <BaseBackground />
      <AthleticBackground />
      <Menu />

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05, x: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(-1)}
          className="flex items-center gap-3 text-zinc-300 hover:text-zinc-100 transition-all duration-300 mb-8 group"
        >
          <div className="w-10 h-10 rounded-full bg-zinc-800/50 backdrop-blur-xl border border-zinc-700/50 flex items-center justify-center group-hover:bg-zinc-700/50 transition-all duration-300">
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform duration-300" />
          </div>
          <span className="font-medium">Επιστροφή</span>
        </motion.button>

        {/* Trainer Profile Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard className="p-8 mb-8" hover>
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden ring-4 ring-zinc-700/50 shadow-2xl border border-zinc-700/50">
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
                      <User className="h-16 w-16 text-zinc-400" />
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-full border-4 border-black flex items-center justify-center shadow-lg">
                    <Award className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                  <h1 className="text-3xl lg:text-4xl font-bold text-zinc-100">{trainer.full_name || trainer.email}</h1>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-200 text-sm font-medium w-fit">
                    <Sparkles className="h-4 w-4" />
                    Pro
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {trainer.specialty && (
                    <div className="flex items-center gap-3 text-zinc-300">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Award className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs text-zinc-400">Ειδικότητα</p>
                        <p className="text-sm font-medium">{trainer.specialty}</p>
                      </div>
                    </div>
                  )}

                  {trainer.experience_years && (
                    <div className="flex items-center gap-3 text-zinc-300">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs text-zinc-400">Εμπειρία</p>
                        <p className="text-sm font-medium">{trainer.experience_years} χρόνια</p>
                      </div>
                    </div>
                  )}

                  {trainer.location && (
                    <div className="flex items-center gap-3 text-zinc-300">
                      <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-rose-400" />
                      </div>
                      <div>
                        <p className="text-xs text-zinc-400">Τοποθεσία</p>
                        <p className="text-sm font-medium">{trainer.location}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-zinc-300">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400">Αναρτήσεις</p>
                      <p className="text-sm font-medium">{posts.length}</p>
                    </div>
                  </div>
                </div>

                {trainer.bio && <p className="text-zinc-300 leading-relaxed mb-6 max-w-3xl">{trainer.bio}</p>}

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Calendar className="h-4 w-4" />
                    <span>Μέλος από {formatJoinDate(trainer.created_at)}</span>
                  </div>

                  {trainer.phone && (
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Phone className="h-4 w-4" />
                      <span>{trainer.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Posts Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center gap-3 mb-8">
            <BookOpen className="h-6 w-6 text-blue-400" />
            <h2 className="text-2xl font-bold text-zinc-100">Αναρτήσεις από {trainer.full_name || trainer.email}</h2>
          </div>

          {posts.length === 0 ? (
            <GlassCard className="p-12 text-center">
              <div className="w-20 h-20 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-zinc-700/50">
                <BookOpen className="h-10 w-10 text-zinc-400" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-100 mb-2">Δεν υπάρχουν αναρτήσεις</h3>
              <p className="text-zinc-400">Αυτός ο προπονητής δεν έχει δημοσιεύσει περιεχόμενο ακόμη.</p>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          )}
        </motion.div>
      </main>
    </div>
  )
}

/* ---------- Post Card Component ---------- */
const PostCard = memo(({ post, index, onClick, formatRelativeTime }) => {
  const postImage = post.image_urls?.[0] || post.image_url || PLACEHOLDER
  const hasMultipleImages = (post.image_urls?.length || 0) > 1

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.6 }}
      whileHover={{ scale: 1.02, y: -4 }}
      onClick={onClick}
      className="group cursor-pointer"
    >
      <GlassCard hover className="overflow-hidden">
        {/* Image */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={postImage || "/placeholder.svg"}
            alt={post.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Badges */}
          {hasMultipleImages && (
            <div className="absolute top-4 right-4">
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm text-zinc-100 text-sm font-medium border border-zinc-700/50">
                <Sparkles className="h-4 w-4" />+{post.image_urls.length - 1}
              </span>
            </div>
          )}

          {/* Title Overlay */}
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="text-xl font-bold text-zinc-100 line-clamp-2 leading-tight drop-shadow-lg">{post.title}</h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-zinc-300 text-sm line-clamp-3 leading-relaxed">{post.description}</p>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-700/50">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Clock className="h-4 w-4" />
              <span>{formatRelativeTime(post.created_at)}</span>
            </div>

            <div className="flex items-center gap-2 text-zinc-500 group-hover:text-zinc-300 transition-colors">
              <ExternalLink className="h-4 w-4" />
              <span className="text-sm">Προβολή</span>
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.article>
  )
})
