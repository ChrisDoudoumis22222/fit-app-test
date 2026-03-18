"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  ArrowRight,
  CalendarDays,
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
        rootMargin: "220px 0px",
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
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-zinc-950/60">
      <div className="relative min-h-[340px] sm:min-h-[420px] lg:min-h-[520px]">
        <ShimmerBlock className="absolute inset-0 rounded-none" />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 lg:p-8">
          <ShimmerBlock className="mb-3 h-8 w-3/4" />
          <ShimmerBlock className="mb-3 h-8 w-2/3" />
          <ShimmerBlock className="mb-4 h-5 w-40" />
          <div className="flex gap-3">
            <ShimmerBlock className="h-5 w-20 rounded-full" />
            <ShimmerBlock className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

function CompactPostSkeleton() {
  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-zinc-950/60">
      <div className="relative h-[220px] sm:h-[250px] lg:h-[260px]">
        <ShimmerBlock className="absolute inset-0 rounded-none" />
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
          <ShimmerBlock className="mb-3 h-7 w-4/5" />
          <ShimmerBlock className="mb-3 h-7 w-2/3" />
          <ShimmerBlock className="h-4 w-28" />
        </div>
      </div>
    </div>
  )
}

function GridPostSkeleton() {
  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-zinc-950/60">
      <div className="h-52">
        <ShimmerBlock className="h-full w-full rounded-none" />
      </div>
      <div className="space-y-3 p-5">
        <ShimmerBlock className="h-6 w-2/3" />
        <ShimmerBlock className="h-4 w-full" />
        <ShimmerBlock className="h-4 w-4/5" />
        <ShimmerBlock className="h-4 w-28" />
      </div>
    </div>
  )
}

function PostsSectionSkeleton() {
  return (
    <section
      id="posts-section"
      className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen px-4 sm:static sm:left-auto sm:right-auto sm:ml-0 sm:mr-0 sm:w-full sm:px-0"
    >
      <div className="mb-8 text-center sm:mb-10">
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

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <GridPostSkeleton />
        <GridPostSkeleton />
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*                                  header                                     */
/* -------------------------------------------------------------------------- */

function SectionHeader() {
  return (
    <div className="relative z-[1] mb-8 text-center sm:mb-10 lg:mb-12">
      <div className="pointer-events-none absolute inset-0 -z-[1] overflow-hidden">
        <div className="absolute left-1/2 top-[-4rem] -translate-x-1/2 select-none text-[4.5rem] font-black uppercase leading-none tracking-[-0.08em] text-white/[0.04] sm:text-[7rem] lg:text-[11rem]">
          Blog
        </div>
      </div>

      <h2 className="mx-auto max-w-5xl text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-6xl">
        Αναρτήσεις & ενημερώσεις
      </h2>

      <p className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-zinc-400 sm:text-base lg:text-xl">
        Ανακάλυψε χρήσιμο περιεχόμενο, συμβουλές και νέα από τον προπονητή σου.
      </p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                                   cards                                     */
/* -------------------------------------------------------------------------- */

function HoverMeta({ likes = 0, comments = 0 }) {
  const hasAny = likes > 0 || comments > 0

  return (
    <div
      className={cn(
        "pointer-events-none absolute right-4 top-4 z-[3] flex items-center gap-2",
        "opacity-100 transition duration-300 sm:opacity-0 sm:translate-y-1 sm:group-hover:translate-y-0 sm:group-hover:opacity-100"
      )}
    >
      {hasAny ? (
        <>
          {likes > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              <Heart className="h-3.5 w-3.5" />
              {likes}
            </span>
          )}

          {comments > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              <MessageCircle className="h-3.5 w-3.5" />
              {comments}
            </span>
          )}
        </>
      ) : null}
    </div>
  )
}

function FeaturedPostCard({ post, onClick }) {
  const postImage = getPostImage(post)
  const hasMultipleImages = (post?.image_urls?.length || 0) > 1

  return (
    <ScrollReveal>
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ y: -4, scale: 1.003 }}
        transition={{ duration: 0.22 }}
        className="group relative w-full overflow-hidden rounded-[28px] border border-white/10 bg-black/30 text-left"
      >
        <div className="relative min-h-[340px] sm:min-h-[420px] lg:min-h-[520px]">
          <LazyPostImage
            src={postImage}
            alt={post?.title || "Featured post"}
            priority
            className="absolute inset-0"
            imgClassName="group-hover:scale-[1.03]"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/10" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_28%)]" />

          <HoverMeta likes={post?.likes} comments={post?.comments_count} />

          {hasMultipleImages && (
            <div className="absolute left-4 top-4 z-[2] sm:left-5 sm:top-5">
              <span className="inline-flex items-center rounded-full border border-white/15 bg-black/55 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-md">
                +{post.image_urls.length - 1} εικόνες
              </span>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 z-[2] p-5 sm:p-6 lg:p-8">
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
                <CalendarDays className="h-4 w-4" />
                {formatRelativeTime(post?.created_at)}
              </span>
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

  return (
    <ScrollReveal delay={index * 0.05}>
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ y: -3 }}
        transition={{ duration: 0.22 }}
        className="group relative w-full overflow-hidden rounded-[24px] border border-white/10 bg-black/30 text-left"
      >
        <div className="relative h-[220px] sm:h-[250px] lg:h-[260px]">
          <LazyPostImage
            src={postImage}
            alt={post?.title || "Post image"}
            className="absolute inset-0"
            imgClassName="group-hover:scale-[1.03]"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/5" />

          <HoverMeta likes={post?.likes} comments={post?.comments_count} />

          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
            <h3 className="line-clamp-2 text-xl font-bold leading-tight text-white sm:text-2xl">
              {post?.title}
            </h3>

            <div className="mt-4 flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-sm text-zinc-300">
                <CalendarDays className="h-4 w-4" />
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

  return (
    <ScrollReveal delay={index * 0.04}>
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ y: -3 }}
        transition={{ duration: 0.22 }}
        className="group relative flex h-full w-full flex-col overflow-hidden rounded-[24px] border border-white/10 bg-zinc-950/40 text-left"
      >
        <div className="relative h-52 overflow-hidden border-b border-white/10">
          <LazyPostImage
            src={postImage}
            alt={post?.title || "Post image"}
            className="absolute inset-0"
            imgClassName="group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          <HoverMeta likes={post?.likes} comments={post?.comments_count} />
        </div>

        <div className="flex flex-1 flex-col p-5">
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

          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
            <span className="inline-flex items-center gap-2 text-sm text-zinc-300">
              <CalendarDays className="h-4 w-4" />
              {formatRelativeTime(post?.created_at)}
            </span>

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
          .limit(5)

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
    const grid = posts.slice(3, 5)

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
        className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen px-4 sm:static sm:left-auto sm:right-auto sm:ml-0 sm:mr-0 sm:w-full sm:px-0"
      >
        <ScrollReveal>
          <SectionHeader />
        </ScrollReveal>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.95fr)] lg:gap-5">
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
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
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