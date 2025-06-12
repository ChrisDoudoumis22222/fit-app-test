"use client"

import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Phone,
  Award,
  Clock,
  Heart,
  Share2,
  MessageCircle,
  Eye,
  User,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Loader2,
  AlertCircle,
} from "lucide-react"

import { supabase } from "../supabaseClient"
import { useAuth } from "../AuthProvider"
import UserMenu from "../components/UserMenu"
import TrainerMenu from "../components/TrainerMenu"
import CommentsSection from "../components/CommentsSection"

const POST_PLACEHOLDER = "/placeholder.svg?height=400&width=600&text=Post+Image"
const AVATAR_PLACEHOLDER = "/placeholder.svg?height=80&width=80&text=Avatar"

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
              phone,
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
          setPost(data)
          setLikeCount(data.likes || 0)
          setCommentsCount(data.comments_count || 0)

          // Check if user has liked this post
          if (profile?.id) {
            const likedPosts = JSON.parse(localStorage.getItem(`liked_posts_${profile.id}`) || "[]")
            setIsLiked(likedPosts.includes(data.id))
          }

          if (data.trainer_id) {
            fetchRelatedPosts(data.trainer_id, id)
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
        // Unlike
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
        // Like
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
      } catch (clipboardErr) {
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

  const handleCommentCountUpdate = (newCount) => {
    setCommentsCount(newCount)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white">
        <Menu />
        <div className="flex items-center justify-center h-[75vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <p className="text-gray-500">Φόρτωση ανάρτησης...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <Menu />
        <div className="flex items-center justify-center h-[75vh]">
          <div className="text-center p-8 rounded-2xl bg-red-50 border border-red-200 max-w-md">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Σφάλμα φόρτωσης</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
            >
              Επιστροφή
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white">
        <Menu />
        <div className="flex items-center justify-center h-[75vh]">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Η ανάρτηση δεν βρέθηκε</h3>
            <p className="text-gray-500 mb-4">Η ανάρτηση που ψάχνετε δεν υπάρχει ή έχει διαγραφεί.</p>
            <button
              onClick={() => navigate("/posts")}
              className="px-6 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium"
            >
              Προβολή όλων των αναρτήσεων
            </button>
          </div>
        </div>
      </div>
    )
  }

  const trainer = post.trainer ?? {}
  const images = post.image_urls?.length ? post.image_urls : [post.image_url].filter(Boolean)
  const hasMultipleImages = images.length > 1

  return (
    <div className="min-h-screen bg-white">
      <Menu />

      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-6 px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl hover:bg-white hover:shadow-md transition-all duration-200 text-gray-700 font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Επιστροφή
        </button>

        {/* Main Post Card */}
        <article
          className="relative overflow-hidden rounded-3xl shadow-xl ring-1 ring-gray-200 mb-8"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)",
          }}
        >
          {/* Hero Image Section */}
          {images.length > 0 && (
            <div className="relative h-96 overflow-hidden">
              <img
                src={images[currentImageIndex] || POST_PLACEHOLDER}
                alt={post.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {/* Image Navigation */}
              {hasMultipleImages && (
                <>
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-black/70 rounded-full text-white text-sm font-medium">
                    {currentImageIndex + 1} / {images.length}
                  </div>
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    {images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          idx === currentImageIndex ? "bg-white" : "bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Like Badge */}
              {likeCount > 0 && (
                <div className="absolute top-4 right-4">
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-500/90 backdrop-blur-sm text-white text-sm font-medium shadow-lg">
                    <Heart className="h-4 w-4 fill-current" />
                    {likeCount}
                  </span>
                </div>
              )}

              {/* Comments Badge */}
              {commentsCount > 0 && (
                <div className="absolute top-4 left-4">
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-500/90 backdrop-blur-sm text-white text-sm font-medium shadow-lg">
                    <MessageCircle className="h-4 w-4" />
                    {commentsCount}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-8">
            {/* Post Meta */}
            <div className="flex items-center gap-4 mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-gray-50 to-gray-100 ring-1 ring-gray-200/50">
                <Calendar className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{formatRelativeTime(post.created_at)}</span>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-50 to-blue-100 ring-1 ring-blue-200/50">
                <Eye className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Προβολή λεπτομερειών</span>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-black bg-clip-text text-transparent leading-tight mb-6">
              {post.title}
            </h1>

            {/* Description */}
            <div className="prose prose-lg max-w-none mb-8">
              <p className="text-gray-600 leading-relaxed text-lg whitespace-pre-wrap">{post.description}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-200">
              <button
                onClick={handleLike}
                disabled={isLiking || !profile?.id}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  isLiked
                    ? "bg-red-500 text-white hover:bg-red-600 shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                } ${isLiking ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Heart className={`h-5 w-5 ${isLiked ? "fill-current" : ""} ${isLiking ? "animate-pulse" : ""}`} />
                {likeCount > 0 ? likeCount : "Αρέσει"}
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-6 py-3 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-all duration-200 font-medium"
              >
                <Share2 className="h-5 w-5" />
                Κοινοποίηση
              </button>

              <button
                onClick={() => document.getElementById("comments")?.scrollIntoView({ behavior: "smooth" })}
                className="flex items-center gap-2 px-6 py-3 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-all duration-200 font-medium"
              >
                <MessageCircle className="h-5 w-5" />
                Σχόλια ({commentsCount || 0})
              </button>
            </div>

            {/* Trainer Card */}
            <div
              className="relative overflow-hidden rounded-2xl shadow-lg ring-1 ring-gray-200 p-6"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
              }}
            >
              <div className="flex items-start gap-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden ring-4 ring-white shadow-lg">
                    {trainer.avatar_url ? (
                      <img
                        src={trainer.avatar_url || "/placeholder.svg"}
                        alt={trainer.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                    <Award className="h-3 w-3 text-white" />
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {trainer.full_name || trainer.email || "Unknown Trainer"}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {trainer.specialty && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Award className="h-4 w-4 text-blue-500" />
                        <span>{trainer.specialty}</span>
                      </div>
                    )}

                    {trainer.experience_years && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4 text-green-500" />
                        <span>{trainer.experience_years} χρόνια εμπειρίας</span>
                      </div>
                    )}

                    {trainer.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4 text-red-500" />
                        <span>{trainer.location}</span>
                      </div>
                    )}

                    {trainer.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4 text-purple-500" />
                        <span>{trainer.phone}</span>
                      </div>
                    )}
                  </div>

                  {trainer.bio && <p className="text-gray-600 text-sm leading-relaxed mb-4 italic">{trainer.bio}</p>}

                  <div className="flex gap-3">
                    <button
                      onClick={() => navigate(`/trainer/${trainer.id}/posts`)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium text-sm"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Όλες οι αναρτήσεις
                    </button>
                    {profile?.role === "user" && (
                      <button
                        onClick={() => navigate("/services")}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm"
                      >
                        <Sparkles className="h-4 w-4" />
                        Υπηρεσίες
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* Comments Section */}
        <div id="comments">
          <CommentsSection
            postId={id}
            initialCommentsCount={commentsCount}
            onCommentCountUpdate={handleCommentCountUpdate}
          />
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-gray-600" />
                Περισσότερα από αυτόν τον προπονητή
              </h2>
              <button
                onClick={() => navigate(`/trainer/${trainer.id}/posts`)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <span className="text-sm font-medium">Προβολή όλων</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost) => (
                <RelatedPostCard key={relatedPost.id} post={relatedPost} onNavigate={navigate} />
              ))}
            </div>
          </section>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 mt-12 justify-center">
          <button
            onClick={() => navigate("/posts")}
            className="px-8 py-4 bg-gray-800 text-white rounded-2xl hover:bg-gray-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
          >
            Προβολή όλων των αναρτήσεων
          </button>
          {profile?.role === "user" && (
            <button
              onClick={() => navigate("/services")}
              className="px-8 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              Περιήγηση υπηρεσιών
            </button>
          )}
        </div>
      </main>
    </div>
  )
}

/* Related Post Card Component */
function RelatedPostCard({ post, onNavigate }) {
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
    <article
      onClick={() => onNavigate(`/post/${post.id}`)}
      className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-500 hover:shadow-xl hover:scale-[1.02]"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        boxShadow: "0 8px 25px -5px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)",
      }}
    >
      {/* Image */}
      <div className="relative h-40 overflow-hidden">
        <img
          src={postImage || "/placeholder.svg"}
          alt={post.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Multiple Images Badge */}
        {hasMultipleImages && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-black/70 backdrop-blur-sm text-white text-xs font-medium">
              <Sparkles className="h-3 w-3" />+{post.image_urls.length - 1}
            </span>
          </div>
        )}

        {/* Like Badge */}
        {post.likes > 0 && (
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/90 backdrop-blur-sm text-white text-xs font-medium">
              <Heart className="h-3 w-3 fill-current" />
              {post.likes}
            </span>
          </div>
        )}

        {/* Comments Badge */}
        {post.comments_count > 0 && (
          <div className="absolute bottom-3 right-3">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/90 backdrop-blur-sm text-white text-xs font-medium">
              <MessageCircle className="h-3 w-3" />
              {post.comments_count}
            </span>
          </div>
        )}

        {/* Title Overlay */}
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-white font-semibold text-sm line-clamp-2 leading-tight">{post.title}</h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatRelativeTime(post.created_at)}
          </span>
          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
        </div>
      </div>
    </article>
  )
}
