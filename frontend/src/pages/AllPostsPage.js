"use client";

import { useState, useEffect, useCallback, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";
import { motion } from "framer-motion";

/* ────────────────────────────  icons  ──────────────────────────────────── */
import {
  RefreshCw,
  Calendar,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Clock,
  Sparkles,
  Users,
  BookOpen,
  Search,
  Grid3X3,
  List,
  AlertCircle,
  Loader2,
  ChevronDown,
  User as UserIcon, // avatar fallback
} from "lucide-react";

/* ────────────────────────  local ui wrappers  ──────────────────────────── */
import TrainerMenu from "../components/TrainerMenu";
import UserMenu from "../components/UserMenu";

/* ───────────────────────────── constants ───────────────────────────────── */
const PLACEHOLDER = "/placeholder.svg?height=300&width=400&text=No+Image";
const AVATAR_PLACEHOLDER = "/placeholder.svg?height=120&width=120&text=Avatar";
const POSTS_PER_PAGE = 10;

const safeAvatar = (url) =>
  url ? `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}` : AVATAR_PLACEHOLDER;

/* ---------- fixed, full-viewport base so backdrop-blur never samples white ---------- */
const BaseBackground = memo(() => (
  <div className="fixed inset-0 -z-50">
    {/* hard black base */}
    <div className="absolute inset-0 bg-black" />
    {/* subtle gradient on top of black */}
    <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-black opacity-90" />
  </div>
));

// Athletic Background Component (matching trainer dashboard)
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
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        33% { transform: translateY(-10px) rotate(120deg); }
        66% { transform: translateY(5px) rotate(240deg); }
      }
    `}</style>
    {/* grid layer – pushed far back */}
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
    {/* glow blobs – also behind content */}
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
));

/* Small particles background (JS-friendly: no TS, no CSS var gymnastics) */
const AnimatedParticles = memo(() => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const list = Array.from({ length: 14 }).map((_, i) => ({
      key: `p-${i}`,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${(Math.random() * 3).toFixed(2)}s`,
      duration: `${(3 + Math.random() * 4).toFixed(2)}s`,
    }));
    setParticles(list);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 -z-30 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.key}
          className="absolute h-1 w-1 rounded-full bg-white/25"
          style={{
            left: p.left,
            top: p.top,
            animationName: "float",
            animationDuration: p.duration, // override default
            animationDelay: p.delay, // per particle
            animationTimingFunction: "ease-in-out",
            animationIterationCount: "infinite",
          }}
        />
      ))}
    </div>
  );
});

/* ======================================================================== */
/*  Main Page Component                                                     */
/* ======================================================================== */
export default function AllPostsPage() {
  const { session, profile } = useAuth();
  const navigate = useNavigate();

  /* ------------------------- remote & ui state ------------------------ */
  const [allPosts, setAllPosts] = useState([]);
  const [displayed, setDisplayed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [sortBy, setSortBy] = useState("newest");
  const [likingPosts, setLikingPosts] = useState(new Set());
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  /* ------------------- sentinel for infinite scroll ------------------- */
  const loadMoreRef = useRef(null);

  useEffect(() => {
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          handleLoadMore();
        }
      },
      { rootMargin: "120px" }
    );
    if (loadMoreRef.current) io.observe(loadMoreRef.current);
    return () => io.disconnect();
  }, [hasMore, loadingMore, loading, displayed]); // this is fine; we want it to retrack when list changes

  /* ------------------------- initial fetch ---------------------------- */
  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchPosts(isRefresh = false) {
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

      const liked = JSON.parse(localStorage.getItem(`liked_posts_${profile?.id}`) || "[]");
      const prepared = (data || []).map((p) => ({
        ...p,
        like_count: p.likes ?? 0,
        comment_count: p.comments_count ?? 0,
        is_liked_by_user: liked.includes(p.id),
      }));

      setAllPosts(prepared);
      setPage(1);
      setDisplayed(prepared.slice(0, POSTS_PER_PAGE));
      setHasMore(prepared.length > POSTS_PER_PAGE);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  /* --------------------- helpers: filter + sort ----------------------- */
  const filteredAndSorted = useCallback(() => {
    const term = searchTerm.toLowerCase();
    return allPosts
      .filter(
        (p) =>
          !term ||
          p.title.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term) ||
          p.trainer?.full_name?.toLowerCase().includes(term)
      )
      .sort((a, b) => {
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
  }, [allPosts, searchTerm, sortBy]);

  /* re-filter whenever search / sort / posts change */
  useEffect(() => {
    const base = filteredAndSorted();
    setPage(1);
    setDisplayed(base.slice(0, POSTS_PER_PAGE));
    setHasMore(base.length > POSTS_PER_PAGE);
  }, [filteredAndSorted]);

  /* ------------------------- infinite scroll -------------------------- */
  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setTimeout(() => {
      const base = filteredAndSorted();
      const nextPg = page + 1;
      const slice = base.slice(0, nextPg * POSTS_PER_PAGE);
      setDisplayed(slice);
      setPage(nextPg);
      setHasMore(slice.length < base.length);
      setLoadingMore(false);
    }, 300);
  }, [page, hasMore, loadingMore, filteredAndSorted]);

  /* ----------------------------- like ---------------------------------- */
  async function handleLike(postId, isLiked) {
    if (!profile?.id) return alert("Συνδεθείτε πρώτα");
    if (likingPosts.has(postId)) return;

    setLikingPosts((prev) => new Set(prev).add(postId));
    const likedKey = `liked_posts_${profile.id}`;
    const likedArr = JSON.parse(localStorage.getItem(likedKey) || "[]");

    try {
      /* optimistic local update */
      setAllPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                like_count: Math.max(0, p.like_count + (isLiked ? -1 : 1)),
                is_liked_by_user: !isLiked,
              }
            : p
        )
      );
      setDisplayed((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                like_count: Math.max(0, p.like_count + (isLiked ? -1 : 1)),
                is_liked_by_user: !isLiked,
              }
            : p
        )
      );

      /* server side rpc */
      const rpc = isLiked ? "decrement_likes" : "increment_likes";
      const { error } = await supabase.rpc(rpc, { post_id: postId });
      if (error) console.warn("RPC failed – falling back", error);

      /* localStorage bookkeeping */
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

  /* ---------------------- share / comment ----------------------------- */
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

  /* ---------------------- date helper ---------------------------------- */
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

  /* ---------------------------- render  -------------------------------- */
  if (loading) return <Screen state="loading" role={profile?.role} />;
  if (error)
    return <Screen state="error" role={profile?.role} err={error} retry={() => fetchPosts()} />;

  const totalLikes = allPosts.reduce((sum, p) => sum + p.like_count, 0);
  const totalComments = allPosts.reduce((sum, p) => sum + p.comment_count, 0);

  return (
    <div className="relative min-h-screen text-gray-100">
      {/* base + animated background, both behind content */}
      <BaseBackground />
      <AthleticBackground />
      <AnimatedParticles />

      {profile?.role === "trainer" ? <TrainerMenu /> : <UserMenu />}

      {/* Hero & Stats */}
      <Hero
        totalPosts={allPosts.length}
        totalTrainers={new Set(allPosts.map((p) => p.trainer?.id)).size}
        totalLikes={totalLikes}
        totalComments={totalComments}
      />

      {/* Controls Bar */}
      <Controls
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        viewMode={viewMode}
        setViewMode={setViewMode}
        sortBy={sortBy}
        setSortBy={setSortBy}
        refreshing={refreshing}
        onRefresh={() => fetchPosts(true)}
      />

      {/* Results */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <h2 className="text-2xl font-bold text-neutral-300 flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-blue-400" />
            Αναρτήσεις
          </h2>
          <span className="text-lg font-normal text-zinc-400 bg-zinc-800/50 px-3 py-1 rounded-full border border-zinc-700/50">
            {displayed.length} από {filteredAndSorted().length}
          </span>
        </motion.div>

        {displayed.length === 0 ? (
          <Empty noPosts={allPosts.length === 0} />
        ) : (
          <>
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "flex flex-col space-y-6"
              }
            >
              {displayed.map((p, i) => (
                <PostCard
                  key={p.id}
                  post={p}
                  viewMode={viewMode}
                  index={i}
                  currentUserId={profile?.id}
                  isLiking={likingPosts.has(p.id)}
                  formatRelativeTime={relTime}
                  onPostClick={(id) => navigate(`/post/${id}`)}
                  onLike={(liked) => handleLike(p.id, liked)}
                  onShare={() => handleShare(p)}
                  onComment={() => handleComment(p.id)}
                />
              ))}
            </div>
            {(hasMore || loadingMore) && (
              <div ref={loadMoreRef} className="flex justify-center py-10">
                {loadingMore ? (
                  <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLoadMore}
                    className="flex items-center gap-2 px-6 py-3 bg-zinc-800/50 text-neutral-300 rounded-xl hover:bg-zinc-700/50 border border-zinc-700/50 backdrop-blur-xl transition-all"
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
  );
}

/* ======================================================================== */
/*  Hero Section                                                            */
/* ======================================================================== */
const Hero = memo(({ totalPosts, totalTrainers, totalLikes, totalComments }) => {
  return (
    <motion.section
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-10 overflow-hidden rounded-3xl mx-4 mt-8 shadow-2xl"
      style={{
        background: "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        border: "1px solid rgba(113, 113, 122, 0.3)",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-600/10 via-transparent to-transparent" />
      <div className="relative p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-neutral-300 mb-4">Αναρτήσεις Προπονητών</h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Ανακαλύψτε συμβουλές fitness, προπονήσεις και οδηγίες από τους επαγγελματίες προπονητές μας.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={BookOpen} color="blue" label="Συνολικές Αναρτήσεις" value={totalPosts} />
          <StatCard icon={Users} color="green" label="Ενεργοί Προπονητές" value={totalTrainers} />
          <StatCard icon={Heart} color="red" label="Συνολικά Likes" value={totalLikes} />
          <StatCard icon={MessageCircle} color="purple" label="Συνολικά Σχόλια" value={totalComments} />
        </div>
      </div>
    </motion.section>
  );
});

const StatCard = memo(({ icon: Icon, color, label, value }) => {
  const colorClasses = {
    blue: "from-blue-600/20 to-blue-700/20 border-blue-500/30 text-blue-400",
    green: "from-green-600/20 to-green-700/20 border-green-500/30 text-green-400",
    red: "from-red-600/20 to-red-700/20 border-red-500/30 text-red-400",
    purple: "from-purple-600/20 to-purple-700/20 border-purple-500/30 text-purple-400",
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -2 }}
      className={`relative overflow-hidden rounded-xl bg-black/40 backdrop-blur-xl border p-4 text-center ${colorClasses[color]}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/0" />
      <div className="relative">
        <div className="p-2 rounded-lg w-fit mx-auto mb-2">
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-sm text-zinc-400">{label}</p>
        <p className="text-2xl font-bold text-neutral-300">{value}</p>
      </div>
    </motion.div>
  );
});

/* ======================================================================== */
/*  Controls Bar                                                            */
/* ======================================================================== */
const Controls = memo(
  ({ searchTerm, setSearchTerm, viewMode, setViewMode, sortBy, setSortBy, refreshing, onRefresh }) => {
    return (
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative z-10 overflow-hidden rounded-2xl shadow-2xl mx-auto max-w-7xl mt-8"
        style={{
          background: "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          border: "1px solid rgba(113, 113, 122, 0.3)",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-600/10 via-transparent to-transparent" />
        <div className="relative p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-grow">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
              <input
                type="text"
                placeholder="Αναζήτηση αναρτήσεων, προπονητών..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-black/30 border border-zinc-700/50 rounded-xl text-neutral-300 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-black/50 backdrop-blur-xl"
              />
            </div>

            {/* Controls */}
            <div className="flex gap-3 flex-wrap">
              {/* View Toggle */}
              <div className="flex rounded-xl overflow-hidden border border-zinc-700/50">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`flex items-center gap-2 px-4 py-3 transition-all ${
                    viewMode === "grid"
                      ? "bg-zinc-700 text-neutral-300"
                      : "bg-black/30 text-zinc-400 hover:bg-black/50 hover:text-neutral-300"
                  }`}
                >
                  <Grid3X3 className="h-4 w-4" /> Grid
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex items-center gap-2 px-4 py-3 transition-all border-l border-zinc-700/50 ${
                    viewMode === "list"
                      ? "bg-zinc-700 text-neutral-300"
                      : "bg-black/30 text-zinc-400 hover:bg-black/50 hover:text-neutral-300"
                  }`}
                >
                  <List className="h-4 w-4" /> List
                </button>
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 bg-black/30 border border-zinc-700/50 rounded-xl text-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-xl"
              >
                <option value="newest" className="bg-zinc-800">
                  Νεότερες
                </option>
                <option value="oldest" className="bg-zinc-800">
                  Παλαιότερες
                </option>
                <option value="most-liked" className="bg-zinc-800">
                  Περισσότερα Likes
                </option>
                <option value="most-commented" className="bg-zinc-800">
                  Περισσότερα Σχόλια
                </option>
                <option value="title" className="bg-zinc-800">
                  Τίτλος A-Z
                </option>
                <option value="trainer" className="bg-zinc-800">
                  Προπονητής A-Z
                </option>
              </select>

              {/* Refresh */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-3 bg-zinc-700 text-neutral-300 rounded-xl hover:bg-zinc-600 disabled:opacity-50 transition-all"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Ανανέωση..." : "Ανανέωση"}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.section>
    );
  }
);

/* ======================================================================== */
/*  PostCard                                                                */
/* ======================================================================== */
const PostCard = memo(
  ({ post, viewMode, index, onPostClick, onLike, onShare, onComment, formatRelativeTime, isLiking }) => {
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

    /* ---- LIST ---------------------------------------------------------- */
    if (viewMode === "list") {
      return (
        <motion.article
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.6 }}
          whileHover={{ scale: 1.01, y: -2 }}
          onClick={() => onPostClick(post.id)}
          className="group flex gap-6 p-6 rounded-2xl cursor-pointer transition-all duration-300"
          style={{
            background: "rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(20px) saturate(160%)",
            WebkitBackdropFilter: "blur(20px) saturate(160%)",
            border: "1px solid rgba(113, 113, 122, 0.3)",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-600/10 via-transparent to-transparent rounded-2xl" />

          {/* Image */}
          <div className="relative w-48 h-32 rounded-xl overflow-hidden flex-shrink-0">
            <img
              src={postImage || "/placeholder.svg"}
              alt=""
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            {hasMultipleImages && (
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded-md text-neutral-200 text-xs font-medium">
                +{post.image_urls.length - 1}
              </div>
            )}
          </div>

          {/* Body */}
          <div className="relative flex-1 min-w-0">
            {/* Author */}
            <div className="flex items-center gap-3 mb-3">
              <Avatar
                avatar={post.trainer?.avatar_url}
                fallback={post.trainer?.full_name || post.trainer?.email}
              />
              <div>
                <p className="font-semibold text-neutral-300 text-sm truncate max-w-[160px]">
                  {post.trainer?.full_name || post.trainer?.email || "Trainer"}
                </p>
                <p className="text-xs text-zinc-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(post.created_at)}
                </p>
              </div>
            </div>

            {/* Title + Description */}
            <h3 className="text-lg font-bold text-neutral-300 mb-1 line-clamp-2">{post.title}</h3>
            <p className="text-zinc-300 text-sm line-clamp-2">{post.description}</p>

            {/* Actions */}
            <div className="flex items-center gap-4 mt-4 text-zinc-400">
              <IconBtn icon={Eye} onClick={view} />
              <LikeBtn count={post.like_count} isLiked={isLiked} onClick={like} disabled={isLiking} />
              <IconBtn icon={MessageCircle} label={post.comment_count} onClick={comment} />
              <IconBtn icon={Share2} onClick={share} />
            </div>
          </div>
        </motion.article>
      );
    }

    /* ---- GRID ---------------------------------------------------------- */
    return (
      <motion.article
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1, duration: 0.6 }}
        whileHover={{ scale: 1.02, y: -4 }}
        onClick={() => onPostClick(post.id)}
        className="group relative overflow-hidden rounded-3xl cursor-pointer transition-all duration-500"
        style={{
          background: "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          border: "1px solid rgba(113, 113, 122, 0.3)",
          boxShadow: "0 10px 30px -5px rgba(0,0,0,.3)",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-600/10 via-transparent to-transparent" />

        {/* Hero Image */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={postImage || "/placeholder.svg"}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Badges */}
          {hasMultipleImages && (
            <Badge pos="right-4 top-4" icon={Sparkles} label={post.image_urls.length - 1} />
          )}
          {post.like_count > 0 && <Badge pos="left-4 top-4" icon={Heart} label={post.like_count} liked />}

          {/* Title Overlay */}
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="text-xl font-bold text-neutral-300 mb-1 line-clamp-2">{post.title}</h3>
          </div>
        </div>

        {/* Body */}
        <div className="relative p-6 space-y-4">
          {/* Author */}
          <div className="flex items-center gap-3">
            <Avatar
              avatar={post.trainer?.avatar_url}
              fallback={post.trainer?.full_name || post.trainer?.email}
            />
            <div className="flex-1">
              <p className="font-semibold text-neutral-300 truncate max-w-[160px]">
                {post.trainer?.full_name || post.trainer?.email || "Trainer"}
              </p>
              <p className="text-sm text-zinc-400 flex items-center gap-1">
                <Calendar className="h-4 w-4" /> {formatRelativeTime(post.created_at)}
              </p>
            </div>
          </div>

          <p className="text-zinc-300 text-sm line-clamp-3">{post.description}</p>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-700/50">
            <div className="flex items-center gap-4">
              <LikeBtn count={post.like_count} isLiked={isLiked} onClick={like} disabled={isLiking} />
              <IconBtn icon={MessageCircle} label={post.comment_count} onClick={comment} />
              <IconBtn icon={Share2} onClick={share} />
            </div>
            <IconBtn icon={Eye} onClick={view} />
          </div>
        </div>
      </motion.article>
    );
  }
);

/* ---------- Tiny Sub-Components ---------------------------------------- */
const Avatar = memo(({ avatar, fallback }) => {
  const alt = fallback || "avatar";
  return (
    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border border-zinc-600">
      {avatar ? (
        <img
          src={safeAvatar(avatar)}
          alt={alt}
          className="w-full h-full object-cover bg-white"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = AVATAR_PLACEHOLDER;
          }}
        />
      ) : (
        <UserIcon className="h-5 w-5 text-gray-400" />
      )}
    </div>
  );
});

const IconBtn = memo(({ icon: Icon, label, onClick, ...rest }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1 text-xs text-zinc-400 hover:text-neutral-200 transition-colors"
    {...rest}
  >
    <Icon className="h-4 w-4" />
    {label !== undefined && <span>{label}</span>}
  </button>
));

const LikeBtn = memo(({ count, isLiked, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center gap-1 text-xs transition-colors
               ${isLiked ? "text-red-400 hover:text-red-300" : "text-zinc-400 hover:text-red-400"}
               ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
  >
    <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
    <span>{count}</span>
  </button>
));

const Badge = memo(({ pos, icon: Icon, label, liked = false }) => (
  <div className={`absolute ${pos}`}>
    <span
      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full
                      ${liked ? "bg-red-500/90 text-neutral-200" : "bg-black/70 text-neutral-200"}
                      text-sm font-medium backdrop-blur-sm shadow-lg`}
    >
      <Icon className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
      {label && `+${label}`}
    </span>
  </div>
));

/* ======================================================================== */
/*  Empty & Full-Screen States                                              */
/* ======================================================================== */
const Empty = memo(({ noPosts }) => {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
      <div className="p-6 rounded-full bg-zinc-800/50 mb-6 inline-block border border-zinc-700/50">
        <BookOpen className="h-12 w-12 text-zinc-400" />
      </div>
      <h3 className="text-xl font-semibold text-neutral-300 mb-2">
        {noPosts ? "Δεν υπάρχουν αναρτήσεις ακόμη" : "Δεν βρέθηκαν αναρτήσεις"}
      </h3>
      <p className="text-zinc-400 max-w-md mx-auto">
        {noPosts
          ? "Οι προπονητές δεν έχουν δημοσιεύσει περιεχόμενο ακόμη."
          : "Δοκιμάστε να αλλάξετε τα κριτήρια αναζήτησης σας."}
      </p>
    </motion.div>
  );
});

const Screen = memo(({ state, role, err, retry }) => {
  const Menu = role === "trainer" ? TrainerMenu : UserMenu;

  if (state === "loading") {
    return (
      <div className="relative min-h-screen text-gray-100">
        <BaseBackground />
        <AthleticBackground />
        <Menu />
        <div className="relative z-10 flex items-center justify-center h-[75vh]">
          <div className="flex items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            <span className="text-neutral-300">Φόρτωση αναρτήσεων...</span>
          </div>
        </div>
      </div>
    );
    }

  return (
    <div className="relative min-h-screen text-gray-100">
      <BaseBackground />
      <AthleticBackground />
      <Menu />
      <div className="relative z-10 flex items-center justify-center h-[75vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8 rounded-2xl max-w-md"
          style={{
            background: "rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(20px) saturate(160%)",
            WebkitBackdropFilter: "blur(20px) saturate(160%)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
          }}
        >
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-400 mb-2">Σφάλμα φόρτωσης</h3>
          <p className="text-red-300 mb-6">{err}</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={retry}
            className="px-6 py-3 bg-red-600 text-neutral-200 rounded-xl hover:bg-red-500 transition-colors"
          >
            Δοκιμή ξανά
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
});
