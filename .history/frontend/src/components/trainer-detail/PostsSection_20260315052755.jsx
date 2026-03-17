"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Clock, Heart, MessageCircle } from "lucide-react"

import { supabase } from "../../supabaseClient"
import GuestBookingAuthModalfortrainers from "../guest/GuestBookingAuthModalfortrainers.jsx"
import {
  FALLBACK_PRIMARY,
  FALLBACK_ULTIMATE,
  ScrollReveal,
  hasImage,
} from "./shared.jsx"

function SectionHeader({ icon: Icon, title, description, meta = null, action = null }) {
  return (
    <div className="mb-7 flex flex-col gap-5 lg:mb-9 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 w-full">
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

export default function PostsSection({ trainerId }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [pendingPostId, setPendingPostId] = useState(null)

  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true

    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        console.error("Error getting auth session:", error)
      }

      if (!mounted) return
      setSession(data?.session ?? null)
      setAuthReady(true)
    }

    getSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null)
      setAuthReady(true)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

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

        if (error) throw error
        if (alive) setPosts(data || [])
      } catch (err) {
        console.error("Error fetching posts:", err)
        if (alive) setPosts([])
      } finally {
        if (alive) setLoading(false)
      }
    }

    if (trainerId) {
      fetchPosts()
    } else {
      setPosts([])
      setLoading(false)
    }

    return () => {
      alive = false
    }
  }, [trainerId])

  useEffect(() => {
    if (session?.user && pendingPostId) {
      setAuthModalOpen(false)
      navigate(`/post/${pendingPostId}`)
      setPendingPostId(null)
    }
  }, [session, pendingPostId, navigate])

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

  const handlePostClick = (postId) => {
    if (!authReady) return

    if (!session?.user) {
      setPendingPostId(postId)
      setAuthModalOpen(true)
      return
    }

    navigate(`/post/${postId}`)
  }

  const handleCloseAuthModal = () => {
    setAuthModalOpen(false)
    setPendingPostId(null)
  }

  if (loading) {
    return (
      <section
        id="posts-section"
        className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen px-4 sm:static sm:left-auto sm:right-auto sm:ml-0 sm:mr-0 sm:w-full sm:px-0"
      >
        <div className="animate-pulse">
          <div className="mb-6 sm:mb-8">
            <div className="mb-4 h-11 w-12 rounded-2xl bg-zinc-800" />
            <div className="mb-3 h-9 w-72 max-w-full rounded bg-zinc-800" />
            <div className="h-5 w-96 max-w-full rounded bg-zinc-800/80" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2 2xl:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/70"
              >
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
      </section>
    )
  }

  if (!posts.length) return null

  return (
    <>
      <section
        id="posts-section"
        className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen px-4 sm:static sm:left-auto sm:right-auto sm:ml-0 sm:mr-0 sm:w-full sm:px-0"
      >
        <ScrollReveal>
          <SectionHeader
            icon={MessageCircle}
            title="Αναρτήσεις & Ενημερώσεις"
            description="Τελευταίες σκέψεις, ενημερώσεις και χρήσιμο υλικό από τον προπονητή σου"
            meta={
              <div className="inline-flex items-center rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-3">
                <span className="text-sm text-zinc-400">Σύνολο</span>
                <span className="ml-2 text-lg font-semibold text-zinc-100">{posts.length}</span>
              </div>
            }
          />
        </ScrollReveal>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2 2xl:grid-cols-3">
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
      </section>

      <GuestBookingAuthModalfortrainers
        open={authModalOpen}
        onClose={handleCloseAuthModal}
      />
    </>
  )
}