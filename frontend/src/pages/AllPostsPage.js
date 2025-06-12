/* δεν δουλευει το list δεν ξερω τι φταει γαμω την μαμα του

/* -------------------------------------------------------------------------- */
/*  src/pages/AllPostsPage.jsx                                                */
/* -------------------------------------------------------------------------- */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase }   from "../supabaseClient";
import { useAuth }    from "../AuthProvider";

/* ────────────────────────────  icons  ──────────────────────────────────── */
import {
  RefreshCw, Calendar, Eye, Heart, MessageCircle, Share2, Clock, Sparkles,
  Users, BookOpen, Search, Grid3X3, List, AlertCircle, Loader2, ChevronDown,
} from "lucide-react";

/* ────────────────────────  local ui wrappers  ──────────────────────────── */
import TrainerMenu from "../components/TrainerMenu";
import UserMenu    from "../components/UserMenu";

/* ───────────────────────────── constants ───────────────────────────────── */
const PLACEHOLDER      = "/placeholder.svg?height=300&width=400&text=No+Image";
const POSTS_PER_PAGE   = 10;

/* ======================================================================== */
/*  Page                                                                    */
/* ======================================================================== */
export default function AllPostsPage() {
  const { session, profile } = useAuth();
  const navigate             = useNavigate();

  /* ------------------------- remote & ui state ------------------------ */
  const [allPosts,    setAllPosts]    = useState([]);
  const [displayed,   setDisplayed]   = useState([]);

  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState(null);
  const [refreshing,  setRefreshing]  = useState(false);

  const [searchTerm,  setSearchTerm]  = useState("");
  const [viewMode,    setViewMode]    = useState("grid");   // "grid" | "list"
  const [sortBy,      setSortBy]      = useState("newest");

  const [likingPosts, setLikingPosts] = useState(new Set());

  const [hasMore,     setHasMore]     = useState(true);
  const [page,        setPage]        = useState(1);

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
  }, [hasMore, loadingMore, loading, displayed]);

  /* ------------------------- initial fetch ---------------------------- */
  useEffect(() => { fetchPosts(); }, []);

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
        .order("created_at", { ascending:false });

      if (error) throw error;

      const liked = JSON.parse(localStorage.getItem(`liked_posts_${profile?.id}`) || "[]");

      const prepared = (data || []).map(p => ({
        ...p,
        like_count       : p.likes           ?? 0,
        comment_count    : p.comments_count  ?? 0,
        is_liked_by_user : liked.includes(p.id),
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
      .filter(p =>
        !term ||
        p.title.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.trainer?.full_name?.toLowerCase().includes(term)
      )
      .sort((a,b) => {
        switch (sortBy) {
          case "oldest"        : return new Date(a.created_at) - new Date(b.created_at);
          case "title"         : return a.title.localeCompare(b.title);
          case "trainer"       : return (a.trainer?.full_name || "")
                                          .localeCompare(b.trainer?.full_name || "");
          case "most-liked"    : return b.like_count    - a.like_count;
          case "most-commented": return b.comment_count - a.comment_count;
          default              : return new Date(b.created_at) - new Date(a.created_at);
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
      const base   = filteredAndSorted();
      const nextPg = page + 1;
      const slice  = base.slice(0, nextPg * POSTS_PER_PAGE);

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
    setLikingPosts(prev => new Set(prev).add(postId));

    const likedKey = `liked_posts_${profile.id}`;
    const likedArr = JSON.parse(localStorage.getItem(likedKey) || "[]");

    try {
      /* optimistic local update --------------------------------------- */
      setAllPosts(prev =>
        prev.map(p => p.id === postId
          ? { ...p,
              like_count: Math.max(0, p.like_count + (isLiked ? -1 : 1)),
              is_liked_by_user: !isLiked
            }
          : p
      ));
      setDisplayed(prev =>
        prev.map(p => p.id === postId
          ? { ...p,
              like_count: Math.max(0, p.like_count + (isLiked ? -1 : 1)),
              is_liked_by_user: !isLiked
            }
          : p
      ));

      /* server side rpc (or fallback) ---------------------------------- */
      const rpc = isLiked ? "decrement_likes" : "increment_likes";
      const { error } = await supabase.rpc(rpc, { post_id: postId });
      if (error) console.warn("RPC failed – falling back", error);

      /* localStorage bookkeeping -------------------------------------- */
      const next = isLiked
        ? likedArr.filter(id => id!==postId)
        : [...likedArr, postId];
      localStorage.setItem(likedKey, JSON.stringify(next));
    } catch (err) {
      console.error(err);
    } finally {
      setLikingPosts(prev => { const s=new Set(prev); s.delete(postId); return s; });
    }
  }

  /* ---------------------- share / comment ----------------------------- */
  async function handleShare(post) {
    const shareData = {
      title : post.title,
      text  : post.description,
      url   : `${window.location.origin}/post/${post.id}`,
    };

    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        alert("Ο σύνδεσμος αντιγράφηκε!");
      }
    } catch(e) { console.error(e); }
  }
  const handleComment = (id)=> navigate(`/post/${id}#comments`);

  /* ---------------------- date helper ---------------------------------- */
  const relTime = (iso) => {
    const now  = new Date();
    const dt   = new Date(iso);
    const hrs  = Math.floor((now-dt)/(1000*60*60));
    if (hrs<1)   return "Μόλις τώρα";
    if (hrs<24)  return `${hrs}ω πριν`;
    if (hrs<48)  return "Χθες";
    const days = Math.floor(hrs/24);
    if (days<7)  return `${days} μέρες πριν`;
    return dt.toLocaleDateString("el-GR");
  };

  /* ---------------------------- render  -------------------------------- */
  if (loading) return <Screen state="loading" role={profile?.role}/>;
  if (error)   return <Screen state="error"   role={profile?.role} err={error} retry={()=>fetchPosts()}/>;

  const totalLikes    = allPosts.reduce((sum,p)=>sum+p.like_count,0);
  const totalComments = allPosts.reduce((sum,p)=>sum+p.comment_count,0);

  return (
    <div className="min-h-screen bg-white">
      {profile?.role==="trainer" ? <TrainerMenu/> : <UserMenu/>}

      {/* ---------------- hero & stats (unchanged layout) --------------- */}
      <Hero totalPosts={allPosts.length}
            totalTrainers={new Set(allPosts.map(p=>p.trainer?.id)).size}
            totalLikes={totalLikes}
            totalComments={totalComments}
      />

      {/* ---------------- controls bar ---------------------------------- */}
      <Controls
        searchTerm={searchTerm} setSearchTerm={setSearchTerm}
        viewMode={viewMode}     setViewMode={setViewMode}
        sortBy={sortBy}         setSortBy={setSortBy}
        refreshing={refreshing} onRefresh={()=>fetchPosts(true)}
      />

      {/* ---------------- results wrapper ------------------------------- */}
      <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-gray-600"/>
          Αναρτήσεις
          <span className="text-lg font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {displayed.length} από {filteredAndSorted().length}
          </span>
        </h2>

        {displayed.length===0
          ? <Empty noPosts={allPosts.length===0}/>
          : (
            <>
              <div className={
                    viewMode==="grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                    : "flex flex-col space-y-6"
                  }>
                {displayed.map((p,i)=>(
                  <PostCard
                    key={p.id}
                    post={p}
                    viewMode={viewMode}
                    index={i}
                    currentUserId={profile?.id}
                    isLiking={likingPosts.has(p.id)}
                    formatRelativeTime={relTime}
                    onPostClick={(id)=>navigate(`/post/${id}`)}
                    onLike={(liked)=>handleLike(p.id, liked)}
                    onShare={()=>handleShare(p)}
                    onComment={()=>handleComment(p.id)}
                  />
                ))}
              </div>

              {(hasMore || loadingMore) && (
                <div ref={loadMoreRef} className="flex justify-center py-10">
                  {loadingMore
                    ? <Loader2 className="h-8 w-8 animate-spin text-gray-400"/>
                    : (
                      <button
                        onClick={handleLoadMore}
                        className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200">
                        <ChevronDown className="h-5 w-5"/>
                        Φόρτωση περισσότερων
                      </button>
                    )}
                </div>
              )}
            </>
          )}
      </main>

      {/* full-width rule so list cards stretch edge-to-edge  */}
      <style jsx>{`
        article[data-view="list"] { width: 100%; }
      `}</style>
    </div>
  );
}

/* ======================================================================== */
/*  Hero section                                                            */
/* ======================================================================== */
function Hero({ totalPosts, totalTrainers, totalLikes, totalComments }) {
  return (
    <section
      className="relative overflow-hidden rounded-3xl mx-4 mt-8 shadow-xl ring-1 ring-gray-200"
      style={{
        background: "linear-gradient(135deg,rgba(255,255,255,.95) 0%,rgba(248,250,252,.9) 100%)",
        backdropFilter: "blur(20px) saturate(180%)",
      }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gray-100 rounded-full blur-3xl"/>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gray-200 rounded-full blur-2xl"/>
      </div>

      <div className="relative p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Αναρτήσεις Προπονητών</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Ανακαλύψτε συμβουλές fitness, προπονήσεις και οδηγίες από τους επαγγελματίες
            προπονητές μας.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={BookOpen}  color="blue"   label="Συνολικές Αναρτήσεις" value={totalPosts}/>
          <StatCard icon={Users}     color="green"  label="Ενεργοί Προπονητές"   value={totalTrainers}/>
          <StatCard icon={Heart}     color="red"    label="Συνολικά Likes"       value={totalLikes}/>
          <StatCard icon={MessageCircle} color="purple" label="Συνολικά Σχόλια"  value={totalComments}/>
        </div>
      </div>
    </section>
  );
}
function StatCard({ icon:Icon, color, label, value }) {
  return (
    <div className="p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-gray-200 text-center">
      <div className={`p-2 rounded-lg bg-${color}-100 w-fit mx-auto mb-2`}>
        <Icon className={`h-5 w-5 text-${color}-600`}/>
      </div>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

/* ======================================================================== */
/*  Controls bar                                                            */
/* ======================================================================== */
function Controls({ searchTerm,setSearchTerm, viewMode,setViewMode,
                    sortBy,setSortBy, refreshing, onRefresh }) {
  return (
    <section
      className="relative overflow-hidden rounded-2xl shadow-lg ring-1 ring-gray-200 mx-auto max-w-7xl mt-8"
      style={{
        background: "linear-gradient(135deg,rgba(255,255,255,.95) 0%,rgba(248,250,252,.9) 100%)",
        backdropFilter: "blur(20px) saturate(180%)",
      }}
    >
      <div className="p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* search */}
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"/>
            <input
              type="text"
              placeholder="Αναζήτηση αναρτήσεων, προπονητών..."
              value={searchTerm}
              onChange={(e)=>setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-800
                        placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
          </div>

          {/* switches */}
          <div className="flex gap-3 flex-wrap">
            {/* view toggle */}
            <div className="flex rounded-xl overflow-hidden border border-gray-300">
              <button
                onClick={()=>setViewMode("grid")}
                className={`flex items-center gap-2 px-4 py-3 transition-all
                            ${viewMode==="grid"
                              ? "bg-gray-800 text-white"
                              : "bg-white text-gray-700 hover:bg-gray-50"}`}>
                <Grid3X3 className="h-4 w-4"/> Grid
              </button>
              <button
                onClick={()=>setViewMode("list")}
                className={`flex items-center gap-2 px-4 py-3 transition-all border-l border-gray-300
                            ${viewMode==="list"
                              ? "bg-gray-800 text-white"
                              : "bg-white text-gray-700 hover:bg-gray-50"}`}>
                <List className="h-4 w-4"/> List
              </button>
            </div>

            {/* sort */}
            <select
              value={sortBy}
              onChange={(e)=>setSortBy(e.target.value)}
              className="px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-800
                         focus:outline-none focus:ring-2 focus:ring-gray-500">
              <option value="newest">Νεότερες</option>
              <option value="oldest">Παλαιότερες</option>
              <option value="most-liked">Περισσότερα Likes</option>
              <option value="most-commented">Περισσότερα Σχόλια</option>
              <option value="title">Τίτλος A-Z</option>
              <option value="trainer">Προπονητής A-Z</option>
            </select>

            {/* refresh */}
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-3 bg-gray-800 text-white rounded-xl
                         hover:bg-gray-700 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}/>
              {refreshing ? "Ανανέωση..." : "Ανανέωση"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ======================================================================== */
/*  PostCard                                                                */
/* ======================================================================== */
function PostCard({
  post, viewMode, index,
  onPostClick, onLike, onShare, onComment,
  formatRelativeTime, isLiking, currentUserId
}) {
  const isLiked           = post.is_liked_by_user;
  const postImage         = post.image_urls?.[0] || post.image_url || PLACEHOLDER;
  const hasMultipleImages = (post.image_urls?.length || 0) > 1;
  const delay             = `${(index % 10) * 0.1}s`;   // stagger

  const like   = (e)=>{ e.stopPropagation(); onLike(isLiked); };
  const share  = (e)=>{ e.stopPropagation(); onShare();      };
  const comment= (e)=>{ e.stopPropagation(); onComment();    };
  const view   = (e)=>{ e.stopPropagation(); onPostClick(post.id); };

  /* ---- LIST ---------------------------------------------------------- */
  if (viewMode==="list") {
    return (
      <article
        data-view="list"
        onClick={()=>onPostClick(post.id)}
        className="group flex gap-6 p-6 rounded-2xl cursor-pointer transition-all duration-300
                   hover:shadow-lg hover:scale-[1.01] opacity-0 animate-fadeInUp"
        style={{
          background   : "linear-gradient(135deg,rgba(255,255,255,.95) 0%,rgba(248,250,252,.9) 100%)",
          backdropFilter: "blur(20px) saturate(180%)",
          boxShadow    : "0 4px 20px -5px rgba(0,0,0,.1),0 0 0 1px rgba(0,0,0,.05)",
          animationDelay: delay, animationFillMode:"forwards",
        }}>
        {/* image */}
        <div className="relative w-48 h-32 rounded-xl overflow-hidden flex-shrink-0">
          <img src={postImage} alt="" className="w-full h-full object-cover
                                                  transition-transform duration-300 group-hover:scale-105"
               loading="lazy"/>
          {hasMultipleImages && (
            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded-md
                            text-white text-xs font-medium">
              +{post.image_urls.length - 1}
            </div>
          )}
        </div>

        {/* body */}
        <div className="flex-1 min-w-0">
          {/* author */}
          <div className="flex items-center gap-3 mb-3">
            <Avatar avatar={post.trainer?.avatar_url}
                    fallback={post.trainer?.full_name||post.trainer?.email}/>
            <div>
              <p className="font-semibold text-gray-900 text-sm truncate max-w-[160px]">
                {post.trainer?.full_name || post.trainer?.email || "Trainer"}
              </p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="h-3 w-3"/>{formatRelativeTime(post.created_at)}
              </p>
            </div>
          </div>

          {/* title + desc */}
          <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2">{post.title}</h3>
          <p  className="text-gray-600 text-sm line-clamp-2">{post.description}</p>

          {/* actions */}
          <div className="flex items-center gap-4 mt-4 text-gray-500">
            <IconBtn icon={Eye}     onClick={view}/>
            <LikeBtn  count={post.like_count}   isLiked={isLiked}   onClick={like} disabled={isLiking}/>
            <IconBtn icon={MessageCircle} label={post.comment_count} onClick={comment}/>
            <IconBtn icon={Share2}  onClick={share}/>
          </div>
        </div>
      </article>
    );
  }

  /* ---- GRID ---------------------------------------------------------- */
  return (
    <article
      data-view="grid"
      onClick={()=>onPostClick(post.id)}
      className="group relative overflow-hidden rounded-3xl cursor-pointer transition-all duration-500
                 hover:shadow-xl hover:scale-[1.02] opacity-0 animate-fadeInUp"
      style={{
        background   : "linear-gradient(135deg,rgba(255,255,255,.95) 0%,rgba(248,250,252,.9) 100%)",
        backdropFilter: "blur(20px) saturate(180%)",
        boxShadow    : "0 10px 30px -5px rgba(0,0,0,.1),0 0 0 1px rgba(0,0,0,.05)",
        animationDelay: delay, animationFillMode:"forwards",
      }}>

      {/* hero */}
      <div className="relative h-48 overflow-hidden">
        <img src={postImage} alt="" loading="lazy"
             className="w-full h-full object-cover transition-transform duration-700
                        group-hover:scale-110"/>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"/>

        {/* badges */}
        {hasMultipleImages && (
          <Badge pos="right-4 top-4" icon={Sparkles} label={post.image_urls.length-1}/>
        )}
        {post.like_count>0 && (
          <Badge pos="left-4 top-4"  icon={Heart}    label={post.like_count} liked/>
        )}

        {/* title overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-xl font-bold text-white mb-1 line-clamp-2">{post.title}</h3>
        </div>
      </div>

      {/* body */}
      <div className="p-6 space-y-4">
        {/* author */}
        <div className="flex items-center gap-3">
          <Avatar avatar={post.trainer?.avatar_url}
                  fallback={post.trainer?.full_name||post.trainer?.email}/>
          <div className="flex-1">
            <p className="font-semibold text-gray-900 truncate max-w-[160px]">
              {post.trainer?.full_name || post.trainer?.email || "Trainer"}
            </p>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <Calendar className="h-4 w-4"/> {formatRelativeTime(post.created_at)}
            </p>
          </div>
        </div>

        <p className="text-gray-600 text-sm line-clamp-3">{post.description}</p>

        {/* actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center gap-4">
            <LikeBtn count={post.like_count} isLiked={isLiked}
                     onClick={like} disabled={isLiking}/>
            <IconBtn icon={MessageCircle} label={post.comment_count} onClick={comment}/>
            <IconBtn icon={Share2} onClick={share}/>
          </div>
          <IconBtn icon={Eye} onClick={view}/>
        </div>
      </div>

      {/* fade-in keyframes */}
      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity:0; transform: translateY(30px); }
          to   { opacity:1; transform: translateY(0); }
        }
        .animate-fadeInUp { animation: fadeInUp .6s ease-out; }
      `}</style>
    </article>
  );
}

/* ---------- tiny sub-components ---------------------------------------- */
const Avatar = ({ avatar, fallback }) => (
  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
    {avatar
      ? <img src={avatar} alt="" className="w-full h-full object-cover" loading="lazy"/>
      : <span className="text-sm font-semibold text-gray-600">
          {(fallback||"T")[0].toUpperCase()}
        </span>}
  </div>
);

const IconBtn = ({ icon:Icon, label, onClick, ...rest }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
    {...rest}>
    <Icon className="h-4 w-4"/>{label!==undefined && <span>{label}</span>}
  </button>
);

const LikeBtn = ({ count, isLiked, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center gap-1 text-xs transition-colors
               ${isLiked ? "text-red-500 hover:text-red-600"
                          : "text-gray-500 hover:text-red-500"}
               ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
    <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`}/>
    <span>{count}</span>
  </button>
);

const Badge = ({ pos, icon:Icon, label, liked=false }) => (
  <div className={`absolute ${pos}`}>
    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full
                      ${liked
                        ? "bg-red-500/90 text-white"
                        : "bg-black/70 text-white" }
                      text-sm font-medium backdrop-blur-sm shadow-lg`}>
      <Icon className={`h-4 w-4 ${liked ? "fill-current" : ""}`}/>
      {label && `+${label}`}
    </span>
  </div>
);

/* ======================================================================== */
/*  Empty &  full-screen states                                             */
/* ======================================================================== */
function Empty({ noPosts }) {
  return (
    <div className="text-center py-20">
      <div className="p-6 rounded-full bg-gray-100 mb-6 inline-block">
        <BookOpen className="h-12 w-12 text-gray-400"/>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {noPosts ? "Δεν υπάρχουν αναρτήσεις ακόμη" : "Δεν βρέθηκαν αναρτήσεις"}
      </h3>
      <p className="text-gray-500 max-w-md mx-auto">
        {noPosts
          ? "Οι προπονητές δεν έχουν δημοσιεύσει περιεχόμενο ακόμη."
          : "Δοκιμάστε να αλλάξετε τα κριτήρια αναζήτησης σας."}
      </p>
    </div>
  );
}

function Screen({ state, role, err, retry }) {
  const Menu = role==="trainer" ? TrainerMenu : UserMenu;
  if (state==="loading") {
    return (
      <div className="min-h-screen bg-white">
        <Menu/>
        <div className="flex items-center justify-center h-[75vh]">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400"/>
          <span className="ml-4 text-gray-500">Φόρτωση αναρτήσεων...</span>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-white">
      <Menu/>
      <div className="flex items-center justify-center h-[75vh]">
        <div className="text-center p-8 rounded-2xl bg-red-50 border border-red-200 max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4"/>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Σφάλμα φόρτωσης</h3>
          <p className="text-red-600 mb-6">{err}</p>
          <button onClick={retry}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700">
            Δοκιμή ξανά
          </button>
        </div>
      </div>
    </div>
  );
}
