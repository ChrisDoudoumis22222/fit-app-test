// src/pages/AllPostsPage.js
"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  memo,
  useMemo,
  useDeferredValue,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";

/* ────────────────────────────  icons  ──────────────────────────────────── */
import {
  RefreshCw,
  Calendar,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Sparkles,
  BookOpen,
  Search,
  Grid3X3,
  AlertCircle,
  Loader2,
  ChevronDown,
  HelpCircle,
  User as UserIcon,
} from "lucide-react";

/* ────────────────────────  local ui wrappers  ──────────────────────────── */
import TrainerMenu from "../components/TrainerMenu";
import UserMenu from "../components/UserMenu";

/* ───────────────────────────── constants ───────────────────────────────── */
const PLACEHOLDER = "/placeholder.svg?height=300&width=400&text=No+Image";
const AVATAR_PLACEHOLDER = "/placeholder.svg?height=120&width=120&text=Avatar";
const POSTS_PER_PAGE = 10;

// approximate card height to reserve space before lazy render (improves scroll perf)
const CARD_INTRINSIC_HEIGHT = 420;

const safeAvatar = (url) =>
  url ? `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}` : AVATAR_PLACEHOLDER;

/* ======================================================================== */
/*  Background (dark grid, more visible)                                    */
/* ======================================================================== */
const GridBackground = memo(() => (
  <div className="fixed inset-0 -z-50">
    {/* Base layer */}
    <div className="absolute inset-0 bg-black" />

    {/* Stronger grid */}
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

    {/* Brighter radial glow */}
    <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_25%,rgba(255,255,255,0.18),transparent_70%)]" />

    {/* Subtle vertical fade for cinematic feel */}
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black" />
  </div>
));

/* ======================================================================== */
/*  Main Page Component                                                     */
/* ======================================================================== */
export default function AllPostsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [allPosts, setAllPosts] = useState([]);
  const [displayed, setDisplayed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [likingPosts, setLikingPosts] = useState(new Set());
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  const loadMoreRef = useRef(null);

  // Defer heavy filtering/sorting while user is typing
  const deferredSearch = useDeferredValue(searchTerm);

  /* ----------------------- data fetch (stable callback) ---------------------- */
  const fetchPosts = useCallback(
    async (isRefresh = false) => {
      try {
        isRefresh ? setRefreshing(true) : setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from("posts")
          .select(`
            id, title, description, image_url, image_urls, created_at, likes, comments_count,
            trainer:profiles!trainer_id ( id, full_name, email, avatar_url )
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const likedKey = `liked_posts_${profile?.id ?? "guest"}`;
        const liked = JSON.parse(localStorage.getItem(likedKey) || "[]");
        const prepared = (data || []).map((p) => ({
          ...p,
          like_count: p.likes ?? 0,
          comment_count: p.comments_count ?? 0,
          is_liked_by_user: liked.includes(p.id),
        }));

        setAllPosts(prepared);
        setPage(1);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [profile?.id]
  );

<<<<<<< HEAD
=======
  /* -------------------------- infinite scroll IO ---------------------------- */
  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          handleLoadMore();
        }
      },
      { rootMargin: "160px" }
    );

    io.observe(node);
    return () => io.disconnect();
  }, [hasMore, loadingMore, loading, /* stable */ handleLoadMore]);

>>>>>>> 6504192de63054a547a6cc75a9a143b5e97ef6f9
  /* ----------------------------- initial fetch ------------------------------ */
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // One memoized pass for filtering + sorting (fast + stable)
  const filteredSortedList = useMemo(() => {
    const term = (deferredSearch || "").toLowerCase();

    const filtered = term
      ? allPosts.filter(
          (p) =>
            p.title.toLowerCase().includes(term) ||
            p.description.toLowerCase().includes(term) ||
            p.trainer?.full_name?.toLowerCase().includes(term)
        )
      : allPosts;

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.created_at) - new Date(b.created_at);
        case "title":
          return a.title.localeCompare(b.title);
        case "trainer":
          return (a.trainer?.full_name || "").localeCompare(b.trainer?.full_name || "");
        case "most-liked":
          return b.like_count - a.like_count;
        case "most-commented":
          return b.comment_count - a.comment_count;
        default:
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });

    return sorted;
  }, [allPosts, deferredSearch, sortBy]);

  // Reset visible slice when source list changes
  useEffect(() => {
    const initial = filteredSortedList.slice(0, POSTS_PER_PAGE);
    setPage(1);
    setDisplayed(initial);
    setHasMore(filteredSortedList.length > initial.length);
  }, [filteredSortedList]);

<<<<<<< HEAD
  /* -------------------------- load more (define first!) --------------------- */
=======
>>>>>>> 6504192de63054a547a6cc75a9a143b5e97ef6f9
  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    // non-blocking update (keeps scroll smooth)
    startTransition(() => {
      const nextPg = page + 1;
      const slice = filteredSortedList.slice(0, nextPg * POSTS_PER_PAGE);
      setDisplayed(slice);
      setPage(nextPg);
      setHasMore(slice.length < filteredSortedList.length);
      setLoadingMore(false);
    });
  }, [page, hasMore, loadingMore, filteredSortedList, startTransition]);

<<<<<<< HEAD
  /* -------------------------- infinite scroll IO ---------------------------- */
  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          handleLoadMore();
        }
      },
      { rootMargin: "160px" }
    );

    io.observe(node);
    return () => io.disconnect();
  }, [hasMore, loadingMore, loading, handleLoadMore]);

=======
>>>>>>> 6504192de63054a547a6cc75a9a143b5e97ef6f9
  async function handleLike(postId, isLiked) {
    if (!profile?.id) {
      alert("Συνδεθείτε πρώτα");
      return;
    }
    if (likingPosts.has(postId)) return;

    setLikingPosts((prev) => new Set(prev).add(postId));
    const likedKey = `liked_posts_${profile.id}`;
    const likedArr = JSON.parse(localStorage.getItem(likedKey) || "[]");

    try {
      // optimistic update
      const optimUpdate = (p) =>
        p.id === postId
          ? { ...p, like_count: Math.max(0, p.like_count + (isLiked ? -1 : 1)), is_liked_by_user: !isLiked }
          : p;

      startTransition(() => {
        setAllPosts((prev) => prev.map(optimUpdate));
        setDisplayed((prev) => prev.map(optimUpdate));
      });

      const rpc = isLiked ? "decrement_likes" : "increment_likes";
      const { error } = await supabase.rpc(rpc, { post_id: postId });
      if (error) console.warn("RPC failed – falling back", error);

      const next = isLiked ? likedArr.filter((id) => id !== postId) : [...likedArr, postId];
      localStorage.setItem(likedKey, JSON.stringify(next));
    } catch (err) {
      console.error(err);
    } finally {
      setLikingPosts((prev) => {
        const s = new Set(prev);
        s.delete(postId);
        return s;
      });
    }
  }

  async function handleShare(post) {
    const shareData = {
      title: post.title,
      text: post.description,
      url: `${window.location.origin}/post/${post.id}`,
    };
    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        alert("Ο σύνδεσμος αντιγράφηκε!");
      }
    } catch (e) {
      console.error(e);
    }
  }

  const handleComment = (id) => navigate(`/post/${id}#comments`);

  const relTime = (iso) => {
    const now = new Date();
    const dt = new Date(iso);
    const hrs = Math.floor((now - dt) / (1000 * 60 * 60));
    if (hrs < 1) return "Μόλις τώρα";
    if (hrs < 24) return `${hrs}ω πριν`;
    if (hrs < 48) return "Χθες";
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days} μέρες πριν`;
    return dt.toLocaleDateString("el-GR");
  };

  if (loading) return <Screen state="loading" role={profile?.role} />;
  if (error) return <Screen state="error" role={profile?.role} err={error} retry={() => fetchPosts()} />;

  return (
    <div className="relative min-h-screen text-gray-100">
      <GridBackground />

      {/* spacing variables — mobile top padding removed */}
      <style>{`
        :root { --side-w: 0px; --nav-h: 0px; }
        @media (min-width: 640px){ :root { --nav-h: 0px; } }
        @media (min-width: 1024px){ :root { --side-w: 280px; } }
        @media (min-width: 1280px){ :root { --side-w: 320px; } }
      `}</style>

      <div className="relative min-h-screen overflow-x-hidden">
        {/* removed top padding on mobile */}
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

          <main className="relative z-10 mx-auto max-w-7xl px-4 py-6 space-y-6 pb-[80px]">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-neutral-100 flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-blue-300" />
                Αναρτήσεις
              </h2>
              <span className="text-sm md:text-base font-normal text-zinc-200 bg-white/10 px-3 py-1 rounded-full border border-white/15">
                {displayed.length} από {filteredSortedList.length}
              </span>
            </motion.div>

            {displayed.length === 0 ? (
              <Empty noPosts={allPosts.length === 0} />
            ) : (
              <>
                {/* Always grid layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayed.map((p, i) => (
                    <LazyRender key={p.id} height={CARD_INTRINSIC_HEIGHT}>
                      <PostCard
                        post={p}
                        index={i}
                        currentUserId={profile?.id}
                        isLiking={likingPosts.has(p.id)}
                        formatRelativeTime={relTime}
                        onPostClick={(id) => navigate(`/post/${id}`)}
                        onLike={(liked) => handleLike(p.id, liked)}
                        onShare={() => handleShare(p)}
                        onComment={() => handleComment(p.id)}
                        priority={i < 6} // boost first rows
                      />
                    </LazyRender>
                  ))}
                </div>

                {(hasMore || loadingMore || isPending) && (
                  <div ref={loadMoreRef} className="flex justify-center py-10">
                    {loadingMore || isPending ? (
                      <div className="flex items-center gap-3 text-zinc-300">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span>Φόρτωση…</span>
                      </div>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleLoadMore}
                        className="flex items-center gap-2 px-6 py-3 bg-white/10 text-neutral-100 rounded-xl hover:bg-white/15 border border-white/15 transition-all"
                      >
                        <ChevronDown className="h-5 w-5" />
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
  );
}

/* ======================================================================== */
/*  Header Section (no Grid/List toggle) – mobile tidy                      */
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
      className="relative z-10 rounded-2xl mx-2 sm:mx-auto max-w-7xl mt-0 sm:mt-8
                 border border-white/10 shadow-2xl
                 bg-gradient-to-b from-zinc-900/60 via-zinc-900/50 to-black/70
                 backdrop-blur-xl"
    >
      <div className="p-3 md:p-5">
        {/* Title */}
        <div className="flex items-center justify-between gap-2 mb-2 md:mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xl md:text-3xl font-bold text-zinc-50">Αναρτήσεις Προπονητών</h1>
            <HoverHelp
              tooltip={
                <>
                  Σε αυτή τη σελίδα βλέπεις όλες τις δημόσιες αναρτήσεις προπονητών.
                  Μπορείς να αναζητήσεις, να ταξινομήσεις, να δεις λεπτομέρειες και να
                  αλληλεπιδράσεις (like/σχόλια/κοινοποίηση).
                </>
              }
            >
              <HelpCircle className="h-5 w-5 text-zinc-300 cursor-help shrink-0" aria-hidden="true" />
            </HoverHelp>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-2 md:gap-3">
          {/* Search */}
          <div className="relative w-full">
            <label htmlFor="trainer-posts-search" className="sr-only">
              Αναζήτηση αναρτήσεων
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-300"
              aria-hidden="true"
            />
            <input
              id="trainer-posts-search"
              type="text"
              placeholder="Αναζήτηση αναρτήσεων, προπονητών..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 md:h-12 pl-10 pr-4
                         bg-zinc-900/60 border border-white/10 rounded-xl
                         text-sm md:text-base text-zinc-100 placeholder-zinc-400
                         focus:outline-none focus:ring-2 focus:ring-white/20"
              autoComplete="off"
              spellCheck="false"
              inputMode="search"
            />
          </div>

          {/* Sort + Refresh row */}
          <div className="grid grid-cols-2 gap-2 md:flex md:items-stretch md:gap-3">
            {/* Sort */}
            <div className="col-span-1">
              <label htmlFor="trainer-posts-sort" className="sr-only">
                Ταξινόμηση
              </label>
              <select
                id="trainer-posts-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full h-11 md:h-12 px-3 md:px-4 text-sm md:text-base
                           bg-zinc-900/50 border border-white/10 rounded-xl
                           text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white/20"
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

            {/* Refresh */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onRefresh}
              disabled={refreshing}
              aria-live="polite"
              aria-busy={refreshing}
              className="col-span-1 inline-flex items-center justify-center gap-2
                         w-full h-11 md:h-12 text-sm md:text-base
                         bg-zinc-800/80 text-zinc-50 rounded-xl
                         hover:bg-zinc-700/80 disabled:opacity-50 transition-all
                         border border-white/10"
            >
              <RefreshCw className={`h-5 w-5 md:h-6 md:w-6 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
              {refreshing ? "Ανανέωση..." : "Ανανέωση"}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.section>
  );
});

/* ======================================================================== */
/*  LazyRender wrapper (only mounts children near viewport)                 */
/* ======================================================================== */
const LazyRender = memo(function LazyRender({ children, height = CARD_INTRINSIC_HEIGHT }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px" } // pre-render before it appears
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      // Reserve space + allow browser to skip layout work when offscreen
      style={{ minHeight: height, contentVisibility: "auto", containIntrinsicSize: `${height}px` }}
      className="will-change-transform"
    >
      {visible ? children : <CardSkeleton />}
    </div>
  );
});

/* ======================================================================== */
/*  Skeleton for cards                                                      */
/* ======================================================================== */
const CardSkeleton = memo(function CardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/50 shadow-2xl">
      <div className="h-48 bg-zinc-800/60 animate-pulse" />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-800 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 bg-zinc-800 rounded animate-pulse" />
            <div className="h-3 w-24 bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-5 w-3/4 bg-zinc-800 rounded animate-pulse" />
        <div className="h-4 w-full bg-zinc-800 rounded animate-pulse" />
        <div className="h-4 w-5/6 bg-zinc-800 rounded animate-pulse" />
        <div className="pt-4 flex items-center justify-between border-t border-white/10">
          <div className="h-4 w-28 bg-zinc-800 rounded animate-pulse" />
          <div className="h-4 w-10 bg-zinc-800 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
});

/* ======================================================================== */
/*  HoverHelp (portal tooltip)                                              */
/* ======================================================================== */
const HoverHelp = memo(function HoverHelp({ children, tooltip, width = 320 }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({ top: r.bottom + 8, left: r.left + r.width / 2 });
  }, [open]);

  return (
    <>
      <span ref={ref} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} className="inline-flex">
        {children}
      </span>

      {open &&
        createPortal(
          <div
            className="fixed z-[9999] -translate-x-1/2 border border-white/15 bg-black/95 text-sm text-zinc-100 rounded-md p-3 shadow-2xl pointer-events-none backdrop-blur"
            style={{ top: pos.top, left: pos.left, width }}
            role="tooltip"
          >
            {tooltip}
          </div>,
          document.body
        )}
    </>
  );
});

/* ======================================================================== */
/*  PostCard (single grid/card variant)                                     */
/* ======================================================================== */
const PostCard = memo(
  ({ post, index, onPostClick, onLike, onShare, onComment, formatRelativeTime, isLiking, priority = false }) => {
    const isLiked = post.is_liked_by_user;
    const postImage = post.image_urls?.[0] || post.image_url || PLACEHOLDER;
    const hasMultipleImages = (post.image_urls?.length || 0) > 1;

    const like = (e) => {
      e.stopPropagation();
      onLike(isLiked);
    };
    const share = (e) => {
      e.stopPropagation();
      onShare();
    };
    const comment = (e) => {
      e.stopPropagation();
      onComment();
    };
    const view = (e) => {
      e.stopPropagation();
      onPostClick(post.id);
    };

    return (
      <motion.article
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.45 }}
        whileHover={{ scale: 1.02, y: -4 }}
        onClick={() => onPostClick(post.id)}
        className="group relative overflow-hidden rounded-3xl cursor-pointer transition-all duration-500
                   border border-white/10 shadow-2xl backdrop-blur-xl
                   bg-gradient-to-b from-zinc-900/60 via-zinc-900/50 to-black/70"
        style={{ contentVisibility: "auto", containIntrinsicSize: `${CARD_INTRINSIC_HEIGHT}px` }}
      >
        <div className="relative h-48 overflow-hidden">
          <img
            src={postImage || "/placeholder.svg"}
            alt=""
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchpriority={priority ? "high" : "auto"}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          {hasMultipleImages && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1 px-3 py-1.5 bg-black/70 rounded-full text-white text-sm font-medium border border-white/10 backdrop-blur-sm">
              <Grid3X3 className="h-4 w-4" />
              {post.image_urls.length}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        </div>

        <div className="relative p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Avatar avatar={post.trainer?.avatar_url} fallback={post.trainer?.full_name || post.trainer?.email} />
            <div className="flex-1">
              <p className="font-semibold text-zinc-100 truncate max-w-[180px]">
                {post.trainer?.full_name || post.trainer?.email || "Trainer"}
              </p>
              <p className="text-sm text-zinc-400 flex items-center gap-1">
                <Calendar className="h-4 w-4" /> {formatRelativeTime(post.created_at)}
              </p>
            </div>
          </div>

<<<<<<< HEAD
          <h3 className="text-xl font-bold text-zinc-50 line-clamp-2">{post.title}</h3>
          <p className="text-zinc-300 text-sm line-clamp-3">{post.description}</p>

          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <div className="flex items-center gap-4">
              <LikeBtn count={post.like_count} isLiked={isLiked} onClick={like} disabled={isLiking} />
              <IconBtn icon={MessageCircle} label={post.comment_count} onClick={comment} />
              <IconBtn icon={Share2} onClick={share} />
            </div>
            <IconBtn icon={Eye} onClick={view} />
          </div>
=======
        <h3 className="text-xl font-bold text-zinc-50 line-clamp-2">{post.title}</h3>
        <p className="text-zinc-300 text-sm line-clamp-3">{post.description}</p>

        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="flex items-center gap-4">
            <LikeBtn count={post.like_count} isLiked={isLiked} onClick={like} disabled={isLiking} />
            <IconBtn icon={MessageCircle} label={post.comment_count} onClick={comment} />
            <IconBtn icon={Share2} onClick={share} />
          </div>
          <IconBtn icon={Eye} onClick={view} />
        </div>
>>>>>>> 6504192de63054a547a6cc75a9a143b5e97ef6f9
        </div>
      </motion.article>
    );
  }
);

/* ---------- Tiny Sub-Components ---------------------------------------- */
const Avatar = memo(({ avatar, fallback }) => {
  const alt = fallback || "avatar";
  return (
    <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center overflow-hidden border border-white/10">
      {avatar ? (
        <img
          src={safeAvatar(avatar)}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = AVATAR_PLACEHOLDER;
          }}
        />
      ) : (
        <UserIcon className="h-5 w-5 text-zinc-300" />
      )}
    </div>
  );
});

const IconBtn = memo(({ icon: Icon, label, onClick, ...rest }) => (
  <button onClick={onClick} className="flex items-center gap-1 text-xs text-zinc-300 hover:text-white transition-colors" {...rest}>
    <Icon className="h-4 w-4" />
    {label !== undefined && <span>{label}</span>}
  </button>
));

const LikeBtn = memo(({ count, isLiked, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center gap-1 text-xs transition-colors
               ${isLiked ? "text-red-400 hover:text-red-300" : "text-zinc-300 hover:text-red-400"}
               ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
  >
    <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
    <span>{count}</span>
  </button>
));

/* ======================================================================== */
/*  Empty & Full-Screen States                                              */
/* ======================================================================== */
const Empty = memo(({ noPosts }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
    <div className="p-6 rounded-full bg-white/10 mb-6 inline-block border border-white/15">
      <BookOpen className="h-12 w-12 text-zinc-300" />
    </div>
    <h3 className="text-xl font-semibold text-neutral-100 mb-2">
      {noPosts ? "Δεν υπάρχουν αναρτήσεις ακόμη" : "Δεν βρέθηκαν αναρτήσεις"}
    </h3>
    <p className="text-zinc-300 max-w-md mx-auto">
      {noPosts ? "Οι προπονητές δεν έχουν δημοσιεύσει περιεχόμενο ακόμη." : "Δοκιμάστε να αλλάξετε τα κριτήρια αναζήτησης σας."}
    </p>
  </motion.div>
));

const Screen = memo(({ state, role, err, retry }) => {
  const Menu = role === "trainer" ? TrainerMenu : UserMenu;

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
          <div className="relative z-10 flex items-center justify-center h-[75vh]">
            <div className="flex items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
              <span className="text-neutral-100">Φόρτωση αναρτήσεων...</span>
            </div>
          </div>
        </div>
      </div>
    );
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
        <div className="relative z-10 flex items-center justify-center h-[75vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center p-8 rounded-2xl max-w-md bg-white/10 border border-red-400/30 backdrop-blur"
          >
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-200 mb-2">Σφάλμα φόρτωσης</h3>
            <p className="text-red-200 mb-6">{err}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={retry}
              className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-500 transition-colors"
            >
              Δοκιμή ξανά
            </motion.button>
          </motion.div>
        </div>
      </div>
    </div>
  );
});
