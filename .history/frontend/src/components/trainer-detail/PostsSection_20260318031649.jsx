"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  ArrowRight,
  Clock,
  Heart,
  MessageCircle,
} from "lucide-react"

import { supabase } from "../../supabaseClient"
import GuestBookingAuthModalfortrainers from "../guest/GuestBookingAuthModalfortrainers.jsx"
import {
  FALLBACK_PRIMARY,
  FALLBACK_ULTIMATE,
  ScrollReveal,
  hasImage,
} from "./shared.jsx"

/* -------------------------------------------------------------------------- */
/*                                    utils                                   */
/* -------------------------------------------------------------------------- */

function cn(...classes) {
  return classes.filter(Boolean).join(" ")
}

function getPostImage(post) {
  const primaryFromArray =
    Array.isArray(post?.image_urls) && hasImage(post.image_urls[0]) ? post.image_urls[0] : ""
  const primaryFromSingle = hasImage(post?.image_url) ? post.image_url : ""
  return primaryFromArray || primaryFromSingle || FALLBACK_PRIMARY
}

function estimateReadTime(post) {
  const text = `${post?.title || ""} ${post?.description || ""}`.trim()
  const words = text ? text.split(/\s+/).length : 0
  return Math.max(1, Math.ceil(words / 180))
}

function formatRelativeTime(dateString) {
  if (!dateString) return "Πρόσφατα"

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

function useInViewOnce(options = {}) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (inView) return

    const node = ref.current
    if (!node) return

    if (typeof IntersectionObserver === "undefined") {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: "240px 0px",
        threshold: 0.01,
        ...options,
      }
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [inView, options])

  return [ref, inView]
}

/* -------------------------------------------------------------------------- */
/*                              loading primitives                             */
/* -------------------------------------------------------------------------- */

function ShimmerBlock({ className = "" }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-zinc-900/90",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
        className
      )}
    />
  )
}

function LazyPostImage({
  src,
  alt,
  className = "",
  imgClassName = "",
  priority = false,
}) {
  const [ref, inView] = useInViewOnce()
  const [loaded, setLoaded] = useState(false)
  const [finalSrc, setFinalSrc] = useState(src || FALLBACK_PRIMARY)

  useEffect(() => {
    setLoaded(false)
    setFinalSrc(src || FALLBACK_PRIMARY)
  }, [src])

  return (
    <div ref={ref} className={cn("relative h-full w-full overflow-hidden bg-zinc-950", className)}>
      {!loaded && (
        <div className="absolute inset-0 z-[1]">
          <ShimmerBlock className="h-full w-full rounded-none" />
        </div>
      )}

      {(inView || priority) && (
        <img
          src={finalSrc}
          alt={alt || "Post image"}
          loading={priority ? "eager" : "lazy"}
          className={cn(
            "h-full w-full object-cover transition duration-700",
            loaded ? "opacity-100" : "opacity-0",
            imgClassName
          )}
          onLoad={() => setLoaded(true)}
          onError={(e) => {
            e.currentTarget.onerror = null
            setFinalSrc(FALLBACK_ULTIMATE)
          }}
        />
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                                  skeletons                                  */
/* -------------------------------------------------------------------------- */

function FeaturedPostSkeleton() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/50">
      <div className="relative min-h-[360px] sm:min-h-[460px] lg:min-h-[560px]">
        <ShimmerBlock className="absolute inset-0 rounded-none" />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 lg:p-8">
          <ShimmerBlock className="mb-3 h-8 w-28 rounded-full" />
          <ShimmerBlock className="mb-3 h-8 w-3/4" />
          <ShimmerBlock className="mb-5 h-6 w-2/3" />
          <div className="flex flex-wrap items-center gap-3">
            <ShimmerBlock className="h-5 w-28 rounded-full" />
            <ShimmerBlock className="h-5 w-24 rounded-full" />
            <ShimmerBlock className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

function CompactPostSkeleton() {
  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/50">
      <div className="relative h-[220px] sm:h-[250px] lg:h-[270px]">
        <ShimmerBlock className="absolute inset-0 rounded-none" />
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
          <ShimmerBlock className="mb-3 h-6 w-24 rounded-full" />
          <ShimmerBlock className="mb-3 h-7 w-11/12" />
          <ShimmerBlock className="mb-4 h-7 w-3/4" />
          <div className="flex flex-wrap gap-3">
            <ShimmerBlock className="h-4 w-20 rounded-full" />
            <ShimmerBlock className="h-4 w-24 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

function GridPostSkeleton() {
  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-zinc-950/70">
      <div className="h-52">
        <ShimmerBlock className="h-full w-full rounded-none" />
      </div>
      <div className="space-y-3 p-5">
        <ShimmerBlock className="h-6 w-2/3" />
        <ShimmerBlock className="h-4 w-full" />
        <ShimmerBlock className="h-4 w-5/6" />
        <div className="flex items-center gap-3 pt-2">
          <ShimmerBlock className="h-4 w-20 rounded-full" />
          <ShimmerBlock className="h-4 w-16 rounded-full" />
          <ShimmerBlock className="h-4 w-24 rounded-full" />
        </div>
      </div>
    </div>
  )
}

function PostsSectionSkeleton() {
  return (
    <section
      id="posts-section"
      className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-hidden px-4 sm:static sm:left-auto sm:right-auto sm:ml-0 sm:mr-0 sm:w-full sm:px-0"
    >
      <div className="relative rounded-[32px] border border-white/10 bg-black/60 px-4 py-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-5 top-0 text-[5.5rem] font-black leading-none tracking-[-0.08em] text-white/[0.04] sm:text-[8rem] lg:text-[12rem]">
            BLOG
          </div>
          <div className="absolute right-0 top-16 h-40 w-40 rounded-full bg-white/[0.025] blur-3xl" />
        </div>

        <div className="relative z-[1] mb-8 text-center sm:mb-10">
          <ShimmerBlock className="mx-auto mb-4 h-10 w-[18rem] max-w-full" />
          <ShimmerBlock className="mx-auto mb-2 h-5 w-[28rem] max-w-full" />
          <ShimmerBlock className="mx-auto h-5 w-[20rem] max-w-full" />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.95fr)] lg:gap-5">
          <FeaturedPostSkeleton />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <CompactPostSkeleton />
            <CompactPostSkeleton />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <GridPostSkeleton key={index} />
          ))}
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*                                  header                                     */
/* -------------------------------------------------------------------------- */

function SectionHeader({ total }) {
  return (
    <div className="relative z-[1] mb-8 text-center sm:mb-10 lg:mb-12">
      <div className="pointer-events-none absolute inset-0 -z-[1] overflow-hidden">
        <div className="absolute left-1/2 top-[-4.5rem] -translate-x-1/2 select-none text-[4.5rem] font-black uppercase leading-none tracking-[-0.08em] text-white/[0.04] sm:text-[7rem] lg:text-[11rem]">
          Blog
        </div>
      </div>

      <h2 className="mx-auto max-w-5xl text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-6xl">
        Αναρτήσεις & ενημερώσεις
      </h2>

      <p className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-zinc-400 sm:text-base lg:text-xl">
        Ανακάλυψε χρήσιμο περιεχόμενο, συμβουλές, νέα και σκέψεις από τον προπονητή σου.
      </p>

      <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-300 backdrop-blur">
        <span className="h-2 w-2 rounded-full bg-white/70" />
        <span>{total} δημοσιεύσεις</span>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                                   cards                                     */
/* -------------------------------------------------------------------------- */

function FeaturedPostCard({ post, onClick }) {
  const postImage = getPostImage(post)
  const hasMultipleImages = (post?.image_urls?.length || 0) > 1
  const readTime = estimateReadTime(post)

  return (
    <ScrollReveal>
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ y: -4, scale: 1.003 }}
        transition={{ duration: 0.22 }}
        className="group relative w-full overflow-hidden rounded-[28px] border border-white/10 bg-black/50 text-left"
      >
        <div className="relative min-h-[360px] sm:min-h-[440px] lg:min-h-[560px]">
          <LazyPostImage
            src={postImage}
            alt={post?.title || "Featured post"}
            priority
            className="absolute inset-0"
            imgClassName="group-hover:scale-[1.03]"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/10" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_28%)]" />

          {hasMultipleImages && (
            <div className="absolute right-4 top-4 z-[2] sm:right-5 sm:top-5">
              <span className="inline-flex items-center rounded-full border border-white/15 bg-black/55 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-md">
                +{post.image_urls.length - 1} εικόνες
              </span>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 z-[2] p-5 sm:p-6 lg:p-8">
            <div className="mb-4 inline-flex items-center rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/85 backdrop-blur">
              Featured Post
            </div>

            <h3 className="max-w-4xl text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-5xl">
              {post?.title}
            </h3>

            {post?.description ? (
              <p className="mt-3 max-w-3xl line-clamp-3 text-sm leading-relaxed text-zinc-300 sm:text-base lg:text-lg">
                {post.description}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-zinc-300 sm:text-base">
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {readTime} λεπτά ανάγνωση
              </span>

              <span>{formatRelativeTime(post?.created_at)}</span>

              {post?.likes > 0 && (
                <span className="inline-flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  {post.likes}
                </span>
              )}

              {post?.comments_count > 0 && (
                <span className="inline-flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  {post.comments_count}
                </span>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <span className="text-sm font-semibold tracking-wide text-white/90 sm:text-base">
                Προβολή άρθρου
              </span>

              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white backdrop-blur transition-transform duration-300 group-hover:translate-x-1">
                <ArrowRight className="h-5 w-5" />
              </span>
            </div>
          </div>
        </div>
      </motion.button>
    </ScrollReveal>
  )
}

function CompactPostCard({ post, onClick, index = 0 }) {
  const postImage = getPostImage(post)
  const readTime = estimateReadTime(post)

  return (
    <ScrollReveal delay={index * 0.05}>
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ y: -3 }}
        transition={{ duration: 0.22 }}
        className="group relative w-full overflow-hidden rounded-[24px] border border-white/10 bg-black/50 text-left"
      >
        <div className="relative h-[220px] sm:h-[250px] lg:h-[268px]">
          <LazyPostImage
            src={postImage}
            alt={post?.title || "Post image"}
            className="absolute inset-0"
            imgClassName="group-hover:scale-[1.03]"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/5" />

          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
            <h3 className="line-clamp-2 text-xl font-bold leading-tight text-white sm:text-2xl">
              {post?.title}
            </h3>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-300">
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {readTime} λεπτά
              </span>

              {post?.likes > 0 && (
                <span className="inline-flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  {post.likes}
                </span>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-200">
                {formatRelativeTime(post?.created_at)}
              </span>

              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white backdrop-blur transition-transform duration-300 group-hover:translate-x-1">
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </div>
      </motion.button>
    </ScrollReveal>
  )
}

function StandardPostCard({ post, onClick, index = 0 }) {
  const postImage = getPostImage(post)
  const readTime = estimateReadTime(post)

  return (
    <ScrollReveal delay={index * 0.04}>
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ y: -3 }}
        transition={{ duration: 0.22 }}
        className="group flex h-full w-full flex-col overflow-hidden rounded-[24px] border border-white/10 bg-zinc-950/80 text-left"
      >
        <div className="relative h-52 overflow-hidden border-b border-white/10">
          <LazyPostImage
            src={postImage}
            alt={post?.title || "Post image"}
            className="absolute inset-0"
            imgClassName="group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        </div>

        <div className="flex flex-1 flex-col p-5">
          <div className="mb-3 inline-flex w-fit items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-300">
            Blog Post
          </div>

          <h3 className="line-clamp-2 text-lg font-bold leading-tight text-white sm:text-xl">
            {post?.title}
          </h3>

          {post?.description ? (
            <p className="mt-3 flex-1 line-clamp-3 text-sm leading-relaxed text-zinc-400 sm:text-[15px]">
              {post.description}
            </p>
          ) : (
            <div className="flex-1" />
          )}

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 pt-4 text-sm text-zinc-400">
            <span className="inline-flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {readTime} λεπτά
            </span>

            {post?.likes > 0 && (
              <span className="inline-flex items-center gap-2">
                <Heart className="h-4 w-4" />
                {post.likes}
              </span>
            )}

            {post?.comments_count > 0 && (
              <span className="inline-flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                {post.comments_count}
              </span>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-zinc-300">{formatRelativeTime(post?.created_at)}</span>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
              Προβολή
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </motion.button>
    </ScrollReveal>
  )
}

/* -------------------------------------------------------------------------- */
/*                               main component                                */
/* -------------------------------------------------------------------------- */

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
      setLoading(true)

      try {
        const { data, error } = await supabase
          .from("posts")
          .select("id, title, description, image_url, image_urls, created_at, likes, comments_count")
          .eq("trainer_id", trainerId)
          .order("created_at", { ascending: false })
          .limit(12)

        if (error) throw error

        if (alive) {
          setPosts(Array.isArray(data) ? data : [])
        }
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

  const handlePostClick = useCallback(
    (postId) => {
      if (!authReady) return

      if (!session?.user) {
        setPendingPostId(postId)
        setAuthModalOpen(true)
        return
      }

      navigate(`/post/${postId}`)
    },
    [authReady, session, navigate]
  )

  const handleCloseAuthModal = useCallback(() => {
    setAuthModalOpen(false)
    setPendingPostId(null)
  }, [])

  const { featuredPost, sidePosts, gridPosts } = useMemo(() => {
    const featured = posts[0] || null
    const side = posts.slice(1, 3)
    const grid = posts.slice(3)
    return {
      featuredPost: featured,
      sidePosts: side,
      gridPosts: grid,
    }
  }, [posts])

  if (loading) {
    return <PostsSectionSkeleton />
  }

  if (!posts.length) return null

  return (
    <>
      <section
        id="posts-section"
        className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-hidden px-4 sm:static sm:left-auto sm:right-auto sm:ml-0 sm:mr-0 sm:w-full sm:px-0"
      >
        <div className="relative rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,8,10,0.96),rgba(3,3,4,0.98))] px-4 py-6 shadow-[0_30px_80px_-32px_rgba(0,0,0,0.75)] sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-3 top-1 text-[5rem] font-black leading-none tracking-[-0.1em] text-white/[0.04] sm:text-[7rem] lg:text-[12rem]">
              BLOG
            </div>
            <div className="absolute right-[-3rem] top-12 h-40 w-40 rounded-full bg-white/[0.03] blur-3xl sm:h-56 sm:w-56" />
            <div className="absolute left-1/2 top-1/3 h-40 w-40 -translate-x-1/2 rounded-full bg-white/[0.02] blur-3xl" />
          </div>

          <ScrollReveal>
            <SectionHeader total={posts.length} />
          </ScrollReveal>

          <div className="relative z-[1] grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.95fr)] lg:gap-5">
            {featuredPost ? (
              <FeaturedPostCard
                post={featuredPost}
                onClick={() => handlePostClick(featuredPost.id)}
              />
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {sidePosts.map((post, index) => (
                <CompactPostCard
                  key={post.id}
                  post={post}
                  index={index}
                  onClick={() => handlePostClick(post.id)}
                />
              ))}
            </div>
          </div>

          {gridPosts.length > 0 && (
            <div className="relative z-[1] mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {gridPosts.map((post, index) => (
                <StandardPostCard
                  key={post.id}
                  post={post}
                  index={index}
                  onClick={() => handlePostClick(post.id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <GuestBookingAuthModalfortrainers
        open={authModalOpen}
        onClose={handleCloseAuthModal}
      />

      <style>
        {`
          @keyframes shimmer {
            100% {
              transform: translateX(100%);
            }
          }
        `}
      </style>
    </>
  )
}