// FILE: src/pages/AllPostsPage.js
import {
  useState,
  useEffect,
  useCallback,
  useRef,
  memo,
  useMemo,
  useDeferredValue,
  useTransition,
} from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { supabase } from "../supabaseClient"
import { useAuth } from "../AuthProvider"

/* ────────────────────────────  icons  ──────────────────────────────────── */
import {
  RefreshCw,
  Calendar,
  Heart,
  MessageCircle,
  Share2,
  Images,
  Search,
  Grid3X3,
  AlertCircle,
  Loader2,
  ChevronDown,
  HelpCircle,
  User as UserIcon,
  MoreHorizontal,
} from "lucide-react"

/* ────────────────────────  local ui wrappers  ──────────────────────────── */
import TrainerMenu from "../components/TrainerMenu"
import UserMenu from "../components/UserMenu"

/* ───────────────────────────── constants ───────────────────────────────── */
const PLACEHOLDER = "/placeholder.svg?height=300&width=400&text=No+Image"
const AVATAR_PLACEHOLDER = "/placeholder.svg?height=120&width=120&text=Avatar"
const POSTS_PER_PAGE = 10

// ✅ Smaller card feel on desktop
const CARD_INTRINSIC_HEIGHT = 500

// ✅ Container width stays nice, but the cards become smaller because we use a grid on desktop
const FEED_CONTAINER_CLASS = "mx-auto w-full max-w-[1280px]"

// ✅ Desktop: smaller media height
const MEDIA_HEIGHT_CLASS = "h-[230px] sm:h-[250px] lg:h-[210px] xl:h-[220px]"

// ✅ Desktop: grid (smaller cards), Mobile: single column
const POSTS_GRID_CLASS =
  "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5"

const safeAvatar = (url) =>
  url ? `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}` : AVATAR_PLACEHOLDER

const formatMetric = (value = 0) => {
  const n = Number(value || 0)
  if (!Number.isFinite(n)) return "0"
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

/* ======================================================================== */
/*  Background                                                              */
/* ======================================================================== */
const GridBackground = memo(() => (
  <div className="fixed inset-0 -z-50">
    <div className="absolute inset-0 bg-black" />
    <div
      className="absolute inset-0 opacity-60"
      style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)
        `,
        backgroundSize: "32px 32px",
      }}
    />
    <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_25%,rgba(255,255,255,0.18),transparent_70%)]" />
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black" />
  </div>
))

/* ======================================================================== */
/*  Main Page Component                                                     */
/* ======================================================================== */
export default function AllPostsPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [allPosts, setAllPosts] = useState([])
  const [displayed, setDisplayed] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("newest")
  const [likingPosts, setLikingPosts] = useState(new Set())
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [isPending, startTransition] = useTransition()

  const loadMoreRef = useRef(null)
  const deferredSearch = useDeferredValue(searchTerm)

  /* ----------------------- data fetch ---------------------- */
  const fetchPosts = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true)
        else setLoading(true)

        setError(null)

        const { data: postsData, error: postsError } = await supabase
          .from("posts")
          .select(`
            id,
            title,
            description,
            image_url,
            image_urls,
            created_at,
            updated_at,
            likes,
            comments_count,
            trainer:profiles!trainer_id (
              id,
              full_name,
              email,
              avatar_url
            )
          `)
          .order("created_at", { ascending: false })

        if (postsError) throw postsError

        let likedSet = new Set()

        if (profile?.id) {
          const { data: likedRows, error: likedError } = await supabase
            .from("post_likes")
            .select("post_id")
            .eq("user_id", profile.id)

          if (likedError) {
            console.warn("Failed to fetch liked posts:", likedError)
          } else {
            likedSet = new Set((likedRows || []).map((row) => row.post_id))
          }
        }

        const prepared = (postsData || []).map((p) => ({
          ...p,
          like_count: Number(p.likes ?? 0),
          comment_count: Number(p.comments_count ?? 0),
          view_count: 0,
          is_liked_by_user: likedSet.has(p.id),
        }))

        setAllPosts(prepared)
        setPage(1)
      } catch (err) {
        console.error(err)
        setError(err?.message || "Απέτυχε η φόρτωση")
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [profile?.id],
  )

  /* -------------------------- initial fetch ------------------------------ */
  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  /* -------------------------- filter + sort ------------------------------ */
  const filteredSortedList = useMemo(() => {
    const term = (deferredSearch || "").trim().toLowerCase()

    const filtered = term
      ? allPosts.filter((p) => {
          const title = (p.title || "").toLowerCase()
          const description = (p.description || "").toLowerCase()
          const trainerName = (p.trainer?.full_name || "").toLowerCase()

          return title.includes(term) || description.includes(term) || trainerName.includes(term)
        })
      : allPosts

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.created_at) - new Date(b.created_at)
        case "title":
          return (a.title || "").localeCompare(b.title || "")
        case "trainer":
          return (a.trainer?.full_name || "").localeCompare(b.trainer?.full_name || "")
        case "most-liked":
          return (b.like_count || 0) - (a.like_count || 0)
        case "most-commented":
          return (b.comment_count || 0) - (a.comment_count || 0)
        default:
          return new Date(b.created_at) - new Date(a.created_at)
      }
    })

    return sorted
  }, [allPosts, deferredSearch, sortBy])

  useEffect(() => {
    const initial = filteredSortedList.slice(0, POSTS_PER_PAGE)
    setPage(1)
    setDisplayed(initial)
    setHasMore(filteredSortedList.length > initial.length)
  }, [filteredSortedList])

  /* -------------------------- load more -------------------------- */
  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return

    setLoadingMore(true)

    startTransition(() => {
      const nextPg = page + 1
      const slice = filteredSortedList.slice(0, nextPg * POSTS_PER_PAGE)
      setDisplayed(slice)
      setPage(nextPg)
      setHasMore(slice.length < filteredSortedList.length)
      setLoadingMore(false)
    })
  }, [page, hasMore, loadingMore, filteredSortedList, startTransition])

  /* -------------------------- infinite scroll --------------------------- */
  useEffect(() => {
    const node = loadMoreRef.current
    if (!node) return

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          handleLoadMore()
        }
      },
      { rootMargin: "160px" },
    )

    io.observe(node)
    return () => io.disconnect()
  }, [hasMore, loadingMore, loading, handleLoadMore])

  /* -------------------------- like handler ------------------------------ */
  async function handleLike(postId, isLiked) {
    if (!profile?.id) {
      alert("Συνδεθείτε πρώτα")
      return
    }

    if (likingPosts.has(postId)) return

    const currentPost = allPosts.find((p) => p.id === postId) || displayed.find((p) => p.id === postId)

    const currentLikeCount = Number(currentPost?.like_count ?? currentPost?.likes ?? 0)

    const optimisticLiked = !isLiked
    const optimisticLikeCount = Math.max(0, currentLikeCount + (isLiked ? -1 : 1))

    setLikingPosts((prev) => new Set(prev).add(postId))

    const patchPost = (likedState, likeCount) => (p) =>
      p.id === postId
        ? {
            ...p,
            likes: likeCount,
            like_count: likeCount,
            is_liked_by_user: likedState,
          }
        : p

    try {
      /* optimistic UI */
      startTransition(() => {
        setAllPosts((prev) => prev.map(patchPost(optimisticLiked, optimisticLikeCount)))
        setDisplayed((prev) => prev.map(patchPost(optimisticLiked, optimisticLikeCount)))
      })

      /* authoritative DB toggle */
      const { data, error } = await supabase.rpc("toggle_post_like", {
        _post_id: postId,
      })

      if (error) throw error

      const row = Array.isArray(data) ? data[0] : data
      const likedFromDb = typeof row?.liked === "boolean" ? row.liked : optimisticLiked
      const likesFromDb = Number(row?.likes ?? optimisticLikeCount)

      startTransition(() => {
        setAllPosts((prev) => prev.map(patchPost(likedFromDb, likesFromDb)))
        setDisplayed((prev) => prev.map(patchPost(likedFromDb, likesFromDb)))
      })
    } catch (err) {
      console.error("Like toggle failed:", err)

      /* rollback UI */
      startTransition(() => {
        setAllPosts((prev) => prev.map(patchPost(isLiked, currentLikeCount)))
        setDisplayed((prev) => prev.map(patchPost(isLiked, currentLikeCount)))
      })

      alert("Δεν αποθηκεύτηκε το like. Δοκίμασε ξανά.")
    } finally {
      setLikingPosts((prev) => {
        const s = new Set(prev)
        s.delete(postId)
        return s
      })
    }
  }

  async function handleShare(post) {
    const shareData = {
      title: post.title,
      text: post.description,
      url: `${window.location.origin}/post/${post.id}`,
    }

    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(shareData.url)
        alert("Ο σύνδεσμος αντιγράφηκε!")
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleComment = (id) => navigate(`/post/${id}#comments`)

  const relTime = (iso) => {
    const now = new Date()
    const dt = new Date(iso)
    const hrs = Math.floor((now - dt) / (1000 * 60 * 60))

    if (hrs < 1) return "Μόλις τώρα"
    if (hrs < 24) return `${hrs}ω πριν`
    if (hrs < 48) return "Χθες"

    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days} μέρες πριν`

    return dt.toLocaleDateString("el-GR")
  }

  if (loading) return <Screen state="loading" role={profile?.role} />

  if (error) {
    return <Screen state="error" role={profile?.role} err={error} retry={() => fetchPosts()} />
  }

  return (
    <div className="relative min-h-screen text-gray-100">
      <GridBackground />

      <style>{`
        :root { --side-w: 0px; --nav-h: 0px; }
        @media (min-width: 640px){ :root { --nav-h: 0px; } }
        @media (min-width: 1024px){ :root { --side-w: 280px; } }
        @media (min-width: 1280px){ :root { --side-w: 320px; } }
      `}</style>

      <div className="relative min-h-screen overflow-x-hidden">
        <div className="lg:pl-[calc(var(--side-w)+8px)] pl-0 pt-0 pb-[80px] transition-[padding]">
          {profile?.role === "trainer" ? <TrainerMenu /> : <UserMenu />}

          <HeaderSection
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            sortBy={sortBy}
            setSortBy={setSortBy}
            refreshing={refreshing}
            onRefresh={() => fetchPosts(true)}
          />

          <main className="relative z-10 mx-auto max-w-7xl px-2 sm:px-4 py-5 sm:py-6 space-y-5 sm:space-y-6 pb-[80px]">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${FEED_CONTAINER_CLASS} flex items-center gap-3`}
            >
              <h2 className="flex items-center gap-3 text-2xl font-bold text-neutral-100 md:text-3xl">
                <Images className="h-7 w-7 text-zinc-100 md:h-8 md:w-8" />
                Αναρτήσεις
              </h2>

              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-normal text-zinc-200 md:text-base">
                {displayed.length} από {filteredSortedList.length}
              </span>
            </motion.div>

            {displayed.length === 0 ? (
              <Empty noPosts={allPosts.length === 0} />
            ) : (
              <>
                {/* ✅ Desktop: smaller cards via grid */}
                <section className={`${FEED_CONTAINER_CLASS} ${POSTS_GRID_CLASS}`}>
                  {displayed.map((p, i) => (
                    <LazyRender key={p.id} height={CARD_INTRINSIC_HEIGHT}>
                      <PostCard
                        post={p}
                        index={i}
                        isLiking={likingPosts.has(p.id)}
                        formatRelativeTime={relTime}
                        onPostClick={(id) => navigate(`/post/${id}`)}
                        onLike={(liked) => handleLike(p.id, liked)}
                        onShare={() => handleShare(p)}
                        onComment={() => handleComment(p.id)}
                        priority={i < 6}
                      />
                    </LazyRender>
                  ))}
                </section>

                {(hasMore || loadingMore || isPending) && (
                  <div ref={loadMoreRef} className="flex justify-center py-10">
                    {loadingMore || isPending ? (
                      <div className="flex items-center gap-3 text-zinc-300">
                        <Loader2 className="h-7 w-7 animate-spin md:h-8 md:w-8" />
                        <span>Φόρτωση…</span>
                      </div>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleLoadMore}
                        className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-6 py-3 text-neutral-100 transition-all hover:bg-white/15"
                      >
                        <ChevronDown className="h-6 w-6 md:h-7 md:w-7" />
                        Φόρτωση περισσότερων
                      </motion.button>
                    )}
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

/* ======================================================================== */
/*  Header Section                                                          */
/* ======================================================================== */
const HeaderSection = memo(function HeaderSection({
  searchTerm,
  setSearchTerm,
  sortBy,
  setSortBy,
  refreshing,
  onRefresh,
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-10 mx-1 sm:mx-auto mt-0 sm:mt-8 max-w-7xl rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/60 via-zinc-900/50 to-black/70 shadow-2xl backdrop-blur-xl"
    >
      <div className="p-3 md:p-5">
        <div className="mb-2 flex items-center justify-between gap-2 md:mb-3">
<div className="mb-2 flex items-center justify-between gap-2 md:mb-3">
  <div className="flex min-w-0 items-center gap-2">
    <h1 className="text-[28px] sm:text-4xl font-extrabold tracking-tight leading-tight text-white">
      Αναρτήσεις Προπονητών
    </h1>

    <HoverHelp
      tooltip={
        <>
          Σε αυτή τη σελίδα βλέπεις όλες τις δημόσιες αναρτήσεις προπονητών. Μπορείς να αναζητήσεις, να
          ταξινομήσεις, να δεις λεπτομέρειες και να αλληλεπιδράσεις.
        </>
      }
    >
      <HelpCircle
        className="h-6 w-6 shrink-0 cursor-help text-zinc-300 md:h-7 md:w-7"
        aria-hidden="true"
      />
    </HoverHelp>
  </div>
</div>
        </div>

        <div className="flex flex-col gap-2 md:gap-3">
          <div className="relative w-full">
            <label htmlFor="trainer-posts-search" className="sr-only">
              Αναζήτηση αναρτήσεων
            </label>

            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-300 md:h-6 md:w-6"
              aria-hidden="true"
            />

            <input
              id="trainer-posts-search"
              type="text"
              placeholder="Αναζήτηση αναρτήσεων, προπονητών..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 w-full rounded-xl border border-white/10 bg-zinc-900/60 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-white/20 md:h-12 md:pl-12 md:text-base"
              autoComplete="off"
              spellCheck="false"
              inputMode="search"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 md:flex md:items-stretch md:gap-3">
            <div className="col-span-1">
              <label htmlFor="trainer-posts-sort" className="sr-only">
                Ταξινόμηση
              </label>

              <select
                id="trainer-posts-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-11 w-full rounded-xl border border-white/10 bg-zinc-900/50 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white/20 md:h-12 md:px-4 md:text-base"
                aria-label="Επιλογή ταξινόμησης"
              >
                <option className="bg-zinc-800" value="newest">
                  Νεότερες
                </option>
                <option className="bg-zinc-800" value="oldest">
                  Παλαιότερες
                </option>
                <option className="bg-zinc-800" value="most-liked">
                  Περισσότερα Likes
                </option>
                <option className="bg-zinc-800" value="most-commented">
                  Περισσότερα Σχόλια
                </option>
                <option className="bg-zinc-800" value="title">
                  Τίτλος A-Z
                </option>
                <option className="bg-zinc-800" value="trainer">
                  Προπονητής A-Z
                </option>
              </select>
            </div>

            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onRefresh}
              disabled={refreshing}
              aria-live="polite"
              aria-busy={refreshing}
              className="col-span-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-800/80 text-sm text-zinc-50 transition-all hover:bg-zinc-700/80 disabled:opacity-50 md:h-12 md:text-base"
            >
              <RefreshCw className={`h-6 w-6 md:h-7 md:w-7 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
              {refreshing ? "Ανανέωση..." : "Ανανέωση"}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.section>
  )
})

/* ======================================================================== */
/*  LazyRender                                                              */
/* ======================================================================== */
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
      { rootMargin: "400px" },
    )

    io.observe(node)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{
        minHeight: visible ? 0 : height,
        contentVisibility: "auto",
        containIntrinsicSize: `${height}px`,
      }}
      className="will-change-transform"
    >
      {visible ? children : <CardSkeleton />}
    </div>
  )
})

/* ======================================================================== */
/*  Skeleton                                                                */
/* ======================================================================== */
const CardSkeleton = memo(function CardSkeleton() {
  return (
    <div className="relative w-full overflow-hidden rounded-[22px] border border-white/10 bg-zinc-900/50 shadow-2xl">
      <div className="flex items-center gap-3 p-4">
        <div className="h-10 w-10 animate-pulse rounded-full bg-zinc-800" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-40 animate-pulse rounded bg-zinc-800" />
          <div className="h-3 w-24 animate-pulse rounded bg-zinc-800" />
        </div>
        <div className="h-10 w-10 animate-pulse rounded-full bg-zinc-800" />
      </div>

      <div className={`${MEDIA_HEIGHT_CLASS} bg-zinc-800/60 animate-pulse`} />

      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <div className="h-6 w-16 animate-pulse rounded bg-zinc-800" />
            <div className="h-6 w-16 animate-pulse rounded bg-zinc-800" />
          </div>
          <div className="h-10 w-10 animate-pulse rounded-full bg-zinc-800" />
        </div>
        <div className="h-4 w-24 animate-pulse rounded bg-zinc-800" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800" />
        <div className="h-4 w-full animate-pulse rounded bg-zinc-800" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-zinc-800" />
      </div>
    </div>
  )
})

/* ======================================================================== */
/*  HoverHelp                                                               */
/* ======================================================================== */
const HoverHelp = memo(function HoverHelp({ children, tooltip, width = 320 }) {
  const ref = useRef(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!open || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    setPos({ top: r.bottom + 8, left: r.left + r.width / 2 })
  }, [open])

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex"
      >
        {children}
      </span>

      {open &&
        createPortal(
          <div
            className="fixed z-[9999] -translate-x-1/2 rounded-md border border-white/15 bg-black/95 p-3 text-sm text-zinc-100 shadow-2xl backdrop-blur pointer-events-none"
            style={{ top: pos.top, left: pos.left, width }}
            role="tooltip"
          >
            {tooltip}
          </div>,
          document.body,
        )}
    </>
  )
})

/* ======================================================================== */
/*  Feed-style action button                                                */
/* ======================================================================== */
const FeedActionButton = memo(function FeedActionButton({
  icon: Icon,
  count,
  text,
  onClick,
  active = false,
  disabled = false,
  activeClass = "text-white",
  inactiveClass = "text-zinc-300 hover:text-white",
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 transition-colors ${
        active ? activeClass : inactiveClass
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <Icon className={`h-6 w-6 md:h-6 md:w-6 ${active ? "fill-current" : ""}`} />
      {typeof count !== "undefined" ? (
        <span className="text-sm font-medium md:text-sm">{formatMetric(count)}</span>
      ) : text ? (
        <span className="text-sm font-medium md:text-sm">{text}</span>
      ) : null}
    </button>
  )
})

/* ======================================================================== */
/*  PostCard                                                                */
/* ======================================================================== */
const PostCard = memo(function PostCard({
  post,
  index,
  onPostClick,
  onLike,
  onShare,
  onComment,
  formatRelativeTime,
  isLiking,
  priority = false,
}) {
  const isLiked = post.is_liked_by_user

  const images =
    Array.isArray(post.image_urls) && post.image_urls.length > 0
      ? post.image_urls
      : [post.image_url || PLACEHOLDER]

  const postImage = images[0] || PLACEHOLDER
  const hasMultipleImages = images.length > 1

  const like = (e) => {
    e.stopPropagation()
    onLike(isLiked)
  }

  const share = (e) => {
    e.stopPropagation()
    onShare()
  }

  const comment = (e) => {
    e.stopPropagation()
    onComment()
  }

  const view = (e) => {
    e.stopPropagation()
    onPostClick(post.id)
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.18), duration: 0.38 }}
      className="group relative w-full cursor-pointer overflow-hidden rounded-[22px] border border-white/10 bg-gradient-to-b from-zinc-900/60 via-zinc-900/50 to-black/70 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl transform-gpu transition-[box-shadow,border-color] duration-150 ease-out hover:shadow-[0_20px_54px_rgba(0,0,0,0.47)]"
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: `${CARD_INTRINSIC_HEIGHT}px`,
      }}
    >
      {/* top row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Avatar avatar={post.trainer?.avatar_url} fallback={post.trainer?.full_name || post.trainer?.email} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-white md:text-[14px]">
            {post.trainer?.full_name || post.trainer?.email || "Trainer"}
          </p>

          <p className="flex items-center gap-1 truncate text-[12px] text-zinc-400">
            <Calendar className="h-4 w-4" />
            {formatRelativeTime(post.created_at)}
          </p>
        </div>

        <button
          type="button"
          onClick={view}
          className="grid h-10 w-10 place-items-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-white"
          title="Προβολή ανάρτησης"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* media */}
      <div className={`relative ${MEDIA_HEIGHT_CLASS} overflow-hidden bg-zinc-950`} onClick={() => onPostClick(post.id)}>
        {/* ✅ show FULL image (no crop): object-contain + no hover scale */}
        <img
          src={postImage || "/placeholder.svg"}
          alt={post.title || "post"}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          className="h-full w-full object-contain"
        />

        {/* subtle overlay (doesn't hide the image) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-black/10" />

        {hasMultipleImages && (
          <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/65 px-2.5 py-1 text-[12px] font-medium text-white backdrop-blur-sm">
            <Grid3X3 className="h-4 w-4" />
            {images.length}
          </div>
        )}

        {hasMultipleImages && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/45 px-2 py-1 backdrop-blur-sm">
            {images.slice(0, 5).map((_, dotIdx) => (
              <span key={dotIdx} className={`h-1.5 w-1.5 rounded-full ${dotIdx === 0 ? "bg-white" : "bg-white/40"}`} />
            ))}
          </div>
        )}
      </div>

      {/* actions */}
      <div className="px-4 pb-2 pt-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-5">
            <FeedActionButton
              icon={Heart}
              count={post.like_count || 0}
              onClick={like}
              active={isLiked}
              disabled={isLiking}
              activeClass="text-red-500"
            />

            <FeedActionButton icon={MessageCircle} count={post.comment_count || 0} onClick={comment} />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={share}
              className="grid h-10 w-10 place-items-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-white"
              title="Κοινοποίηση"
            >
              <Share2 className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* caption */}
      <div className="px-4 pb-4" onClick={() => onPostClick(post.id)}>
        <div className="mb-2 text-[13px] font-semibold text-white">{formatMetric(post.like_count || 0)} μου αρέσει</div>

        <div className="text-[14px] leading-6 text-zinc-200">
          <span className="mr-2 font-semibold text-white">{post.trainer?.full_name || "Trainer"}</span>
          <span className="font-semibold text-white">{post.title || "Ανάρτηση"}</span>
        </div>

        <div
          className="mt-1 text-[14px] leading-6 text-zinc-300"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 4,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {post.description || "Δεν υπάρχει περιγραφή."}
        </div>

        <button
          type="button"
          onClick={view}
          className="mt-2 text-left text-[13px] text-zinc-500 transition hover:text-zinc-300"
        >
          Προβολή ανάρτησης
        </button>

        <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
          {new Date(post.created_at).toLocaleDateString("el-GR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </div>
      </div>
    </motion.article>
  )
})

/* ======================================================================== */
/*  Tiny Sub-Components                                                     */
/* ======================================================================== */
const Avatar = memo(({ avatar, fallback }) => {
  const alt = fallback || "avatar"

  return (
    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-black/60">
      {avatar ? (
        <img
          src={safeAvatar(avatar)}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.onerror = null
            e.currentTarget.src = AVATAR_PLACEHOLDER
          }}
        />
      ) : (
        <UserIcon className="h-6 w-6 text-zinc-300" />
      )}
    </div>
  )
})

/* ======================================================================== */
/*  Empty & Full-Screen States                                              */
/* ======================================================================== */
const Empty = memo(({ noPosts }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-20 text-center">
    <div className="mb-6 inline-block rounded-full border border-white/15 bg-white/10 p-6">
      <Images className="h-12 w-12 text-zinc-300 md:h-14 md:w-14" />
    </div>

    <h3 className="mb-2 text-xl font-semibold text-neutral-100">
      {noPosts ? "Δεν υπάρχουν αναρτήσεις ακόμη" : "Δεν βρέθηκαν αναρτήσεις"}
    </h3>

    <p className="mx-auto max-w-md text-zinc-300">
      {noPosts ? "Οι προπονητές δεν έχουν δημοσιεύσει περιεχόμενο ακόμη." : "Δοκιμάστε να αλλάξετε τα κριτήρια αναζήτησης σας."}
    </p>
  </motion.div>
))

const Screen = memo(({ state, role, err, retry }) => {
  const Menu = role === "trainer" ? TrainerMenu : UserMenu

  if (state === "loading") {
    return (
      <div className="relative min-h-screen text-gray-100">
        <GridBackground />
        <style>{`
          :root { --side-w: 0px; --nav-h: 0px; }
          @media (min-width: 640px){ :root { --nav-h: 0px; } }
          @media (min-width: 1024px){ :root { --side-w: 280px; } }
          @media (min-width: 1280px){ :root { --side-w: 320px; } }
        `}</style>

        <div className="lg:pl-[calc(var(--side-w)+8px)] pl-0 pt-0 pb-[80px] transition-[padding]">
          <Menu />

          <div className="relative z-10 flex h-[75vh] items-center justify-center">
            <div className="flex items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-300 md:h-9 md:w-9" />
              <span className="text-neutral-100">Φόρτωση αναρτήσεων...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen text-gray-100">
      <GridBackground />
      <style>{`
        :root { --side-w: 0px; --nav-h: 0px; }
        @media (min-width: 640px){ :root { --nav-h: 0px; } }
        @media (min-width: 1024px){ :root { --side-w: 280px; } }
        @media (min-width: 1280px){ :root { --side-w: 320px; } }
      `}</style>

      <div className="lg:pl-[calc(var(--side-w)+8px)] pl-0 pt-0 pb-[80px] transition-[padding]">
        <Menu />

        <div className="relative z-10 flex h-[75vh] items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md rounded-2xl border border-red-400/30 bg-white/10 p-8 text-center backdrop-blur"
          >
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400 md:h-14 md:w-14" />

            <h3 className="mb-2 text-lg font-semibold text-red-200">Σφάλμα φόρτωσης</h3>

            <p className="mb-6 text-red-200">{err}</p>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={retry}
              className="rounded-xl bg-red-600 px-6 py-3 text-white transition-colors hover:bg-red-500"
            >
              Δοκιμή ξανά
            </motion.button>
          </motion.div>
        </div>
      </div>
    </div>
  )
})