// FILE: src/pages/UserLikesPage.jsx
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  lazy,
  Suspense,
} from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  MapPin,
  Loader2,
  AlertCircle,
  User as UserIcon,
  Star,
  Calendar as CalendarIcon,
  Wifi,
  WifiOff,
} from "lucide-react";

import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";
import UserMenu from "../components/UserMenu";

const QuickBookModal = lazy(() => import("../components/QuickBookModal.tsx"));

/* ------------------------------ Buttons ------------------------------ */
function PremiumButton({
  children,
  variant = "primary",
  size = "default",
  className = "",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold leading-none " +
    "transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-white/10 " +
    "disabled:opacity-60 disabled:pointer-events-none rounded-xl";
  const variants = {
    primary:
      "bg-white text-black hover:bg-zinc-100 shadow-lg hover:shadow-xl active:scale-[0.98]",
    secondary:
      "bg-zinc-900/70 text-white hover:bg-zinc-800/80 border border-white/10 shadow-md active:scale-[0.98]",
    outline:
      "border border-white/15 bg-black/30 backdrop-blur text-white hover:bg-white/10 hover:border-white/25",
    danger:
      "bg-red-600 text-white hover:bg-red-500 shadow-lg active:scale-[0.98]",
    glass:
      "text-white backdrop-blur-md bg-white/10 hover:bg-white/15 border border-white/20 shadow-[0_8px_30px_rgba(0,0,0,0.3)]",
  };
  const sizes = {
    sm: "h-9 text-xs px-3",
    default: "h-10 text-sm px-4",
    lg: "h-11 text-base px-5",
  };
  // eslint-disable-next-line react/button-has-type
  return (
    <button
      {...props}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}
PremiumButton.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(["primary", "secondary", "outline", "danger", "glass"]),
  size: PropTypes.oneOf(["sm", "default", "lg"]),
  className: PropTypes.string,
};
PremiumButton.defaultProps = {
  variant: "primary",
  size: "default",
  className: "",
};

/* ------------------------------ Avatars ------------------------------ */
const DEFAULT_TRAINER_AVATAR = "/images/defaults/trainer-avatar.png";
const FALLBACK_DATA_URI =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 240' width='240' height='240'>
      <defs>
        <linearGradient id='g' x1='0' x2='0' y1='0' y2='1'>
          <stop offset='0%' stop-color='#0b0b0b'/>
          <stop offset='100%' stop-color='#111'/>
        </linearGradient>
      </defs>
      <rect width='100%' height='100%' fill='url(#g)'/>
      <circle cx='120' cy='100' r='46' fill='#2a2a2a'/>
      <rect x='50' y='160' width='140' height='40' rx='20' fill='#2a2a2a'/>
    </svg>`
  );

function LargeAvatarCover({ url, alt }) {
  const initialSrc = useMemo(
    () => (url && String(url).trim() ? url : DEFAULT_TRAINER_AVATAR),
    [url]
  );
  return (
    <img
      src={initialSrc}
      loading="lazy"
      decoding="async"
      alt={alt || "trainer"}
      className="w-full h-full object-cover"
      onError={(e) => {
        const img = e?.currentTarget;
        if (!img) return;
        const step = img.dataset.fbk || "0";
        if (step === "0") {
          img.dataset.fbk = "1";
          img.src = DEFAULT_TRAINER_AVATAR;
          return;
        }
        if (step === "1") {
          img.dataset.fbk = "2";
          img.src = FALLBACK_DATA_URI;
        }
      }}
    />
  );
}
LargeAvatarCover.propTypes = {
  url: PropTypes.string,
  alt: PropTypes.string,
};
LargeAvatarCover.defaultProps = {
  url: "",
  alt: "trainer",
};

/* ------------------------------ Toasts (glass) ------------------------------ */
function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="fixed inset-x-0 bottom-4 z-[200] flex justify-center px-4 pointer-events-none">
      <div className="w-full max-w-md space-y-3">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={`pointer-events-auto rounded-2xl px-4 py-3 shadow-xl border backdrop-blur-md ${
                t.variant === "danger"
                  ? "bg-red-600/60 border-red-300/40 text-white"
                  : "bg-white/10 border-white/20 text-white"
              }`}
              role="status"
              style={{
                boxShadow:
                  "0 10px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="flex-1 text-[13px] sm:text-sm">{t.message}</span>
                <div className="flex items-center gap-2">
                  {t.actionLabel && t.onAction ? (
                    <PremiumButton
                      variant="glass"
                      size="sm"
                      onClick={() => t.onAction(t.id)}
                      className="min-w-[88px]"
                    >
                      {t.actionLabel}
                    </PremiumButton>
                  ) : null}
                  <PremiumButton
                    variant="glass"
                    size="sm"
                    onClick={() => onDismiss(t.id)}
                  >
                    Κλείσιμο
                  </PremiumButton>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
ToastStack.propTypes = {
  toasts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      message: PropTypes.string.isRequired,
      actionLabel: PropTypes.string,
      onAction: PropTypes.func,
      variant: PropTypes.oneOf(["default", "danger"]),
    })
  ).isRequired,
  onDismiss: PropTypes.func.isRequired,
};

/* ------------------------------ Rating ------------------------------ */
function RatingStars({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => {
        const isFilled = i < Math.floor(rating);
        const isHalf = i === Math.floor(rating) && rating % 1 >= 0.5;
        if (isHalf) {
          return (
            <div key={String(i)} className="relative h-4 w-4">
              <Star className="h-4 w-4 text-zinc-600 fill-current absolute" />
              <div className="overflow-hidden w-1/2">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
              </div>
            </div>
          );
        }
        return (
          <Star
            key={String(i)}
            className={`h-4 w-4 ${
              isFilled ? "text-yellow-400 fill-current" : "text-zinc-600 fill-current"
            }`}
          />
        );
      })}
    </div>
  );
}
RatingStars.propTypes = { rating: PropTypes.number };
RatingStars.defaultProps = { rating: 0 };

/* ------------------------------ Card ------------------------------ */
function TrainerTile({
  name,
  location,
  image,
  rating,
  reviewCount,
  isOnline,
  liked,
  onLikeToggle,
  onView,
  onBook,
}) {
  return (
    <div
      className="
        group relative overflow-hidden rounded-2xl border border-white/10
        shadow-[0_8px_24px_rgba(0,0,0,0.45)] bg-[#0c0c0c]
        transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(0,0,0,0.6)]
      "
    >
      {/* Media */}
      <div className="relative h-64 sm:h-60 md:h-56 lg:h-64">
        <LargeAvatarCover url={image} alt={name} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent" />

        {/* Heart */}
        <button
          type="button"
          onClick={onLikeToggle}
          aria-label={liked ? "Αφαίρεση από αγαπημένα" : "Προσθήκη στα αγαπημένα"}
          className={`absolute top-3 left-3 h-9 w-9 grid place-items-center rounded-full transition-all duration-150 border ${
            liked
              ? "bg-red-500/95 text-white border-red-400/50 shadow"
              : "bg-black/60 text-white border-white/20 hover:bg-black/80"
          }`}
        >
          <Heart className={`h-5 w-5 ${liked ? "fill-current" : ""}`} />
        </button>

        {/* Online/Offline badge */}
        <div className="absolute top-3 right-3">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold border backdrop-blur-md ${
              isOnline
                ? "bg-emerald-500/90 text-white border-emerald-300/50"
                : "bg-zinc-800/80 text-zinc-200 border-white/10"
            }`}
          >
            {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {isOnline ? "Διαδικτυακά" : "Δια ζώσης"}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-center gap-2 justify-between">
          <h3 className="text-white font-semibold text-[15px] sm:text-base leading-tight line-clamp-1">
            {name}
          </h3>
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          {location ? (
            <div className="text-xs sm:text-[13px] text-zinc-400 inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {location}
            </div>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-1">
            <RatingStars rating={rating} />
            <span className="text-[11px] text-zinc-400 ml-0.5">
              {rating > 0 ? `${rating.toFixed(1)} · ${reviewCount || 0}` : "—"}
            </span>
          </div>
        </div>

        {/* Buttons become stacked on mobile, side-by-side on >=sm */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <PremiumButton variant="secondary" size="sm" onClick={onView}>
            <UserIcon className="h-4 w-4" />
            Προβολή
          </PremiumButton>
          <PremiumButton size="sm" onClick={onBook}>
            <CalendarIcon className="h-4 w-4" />
            Κράτηση τώρα
          </PremiumButton>
        </div>
      </div>
    </div>
  );
}
TrainerTile.propTypes = {
  name: PropTypes.string.isRequired,
  location: PropTypes.string,
  image: PropTypes.string,
  rating: PropTypes.number,
  reviewCount: PropTypes.number,
  isOnline: PropTypes.bool,
  liked: PropTypes.bool,
  onLikeToggle: PropTypes.func.isRequired,
  onView: PropTypes.func.isRequired,
  onBook: PropTypes.func.isRequired,
};
TrainerTile.defaultProps = {
  location: "",
  image: "",
  rating: 0,
  reviewCount: 0,
  isOnline: false,
  liked: false,
};

/* ------------------------------ Empty State ------------------------------ */
function Empty() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-20 lg:py-28"
    >
      <div className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-white/5 border border-white/10 grid place-items-center">
        <Loader2 className="h-10 w-10 text-zinc-600 animate-spin" />
      </div>
      <h3 className="text-3xl font-bold text-white mb-3">
        Δεν έχεις αγαπημένους προπονητές ακόμα
      </h3>
      <p className="text-zinc-400 mb-8 max-w-md mx-auto">
        Επισκέψου το Marketplace και πρόσθεσε προπονητές στα αγαπημένα σου.
      </p>
      <PremiumButton onClick={() => { window.location.href = "/services"; }}>
        Αναζήτηση Προπονητών
      </PremiumButton>
    </motion.div>
  );
}

/* ------------------------------ Page ------------------------------ */
export default function UserLikesPage() {
  const { profile, loading } = useAuth();
  const uid = profile?.id;
  const navigate = useNavigate();

  const [likes, setLikes] = useState([]); // [{ id: likeId, trainer: {...} }]
  const [loadingLikes, setLoadingLikes] = useState(true);
  const [errText, setErrText] = useState("");

  // booking modal state (matching trainer page fix)
  const [bookingTrainer, setBookingTrainer] = useState(null);

  // toasts
  const [toasts, setToasts] = useState([]);
  const dismissToast = useCallback(
    (id) => setToasts((t) => t.filter((x) => x.id !== id)),
    []
  );
  const addToast = useCallback((payload) => {
    const id = Date.now() + Math.random();
    const toast = { id, variant: "default", ...payload };
    setToasts((t) => [...t, toast]);
    if (!toast.persistent) {
      window.setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, toast.durationMs || 2200);
    }
    return id;
  }, []);
  const addUndoToast = useCallback(
    ({ message, onUndo }) => {
      const id = addToast({
        message,
        variant: "danger",
        actionLabel: "Αναίρεση",
        onAction: async (clickedId) => {
          await onUndo();
          dismissToast(clickedId);
        },
        persistent: true,
      });
      window.setTimeout(() => dismissToast(id), 10000);
    },
    [addToast, dismissToast]
  );

  const loadLikes = useCallback(async () => {
    if (!uid) return;
    setLoadingLikes(true);
    setErrText("");

    // 1) get raw likes
    const { data: likeRows, error: likeErr } = await supabase
      .from("trainer_likes")
      .select("id, created_at, trainer_id")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (likeErr) {
      setErrText(`Σφάλμα φόρτωσης αγαπημένων: ${likeErr.message}`);
      setLikes([]);
      setLoadingLikes(false);
      return;
    }

    const rows = (likeRows || []).filter((r) => r.trainer_id);
    const trainerIds = Array.from(new Set(rows.map((r) => r.trainer_id)));
    if (trainerIds.length === 0) {
      setLikes([]);
      setLoadingLikes(false);
      return;
    }

    // 2) fetch trainer profiles
    const { data: trainers, error: profErr } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role, location, is_online, diploma_url")
      .in("id", trainerIds)
      .eq("role", "trainer");

    if (profErr) {
      setErrText(`Σφάλμα φόρτωσης προφίλ: ${profErr.message}`);
      setLikes([]);
      setLoadingLikes(false);
      return;
    }

    // 3) ratings (optional)
    const { data: reviews } = await supabase
      .from("trainer_reviews")
      .select("trainer_id, rating")
      .in("trainer_id", trainerIds);

    const ratingsByTrainer = (reviews ?? []).reduce((m, r) => {
      const map = m;
      (map[r.trainer_id] ||= []).push(r.rating);
      return map;
    }, {});

    const hydrated = (trainers || []).map((t) => {
      const r = ratingsByTrainer[t.id] || [];
      const avg = r.length ? r.reduce((a, b) => a + b, 0) / r.length : 0;
      return { ...t, rating: avg, reviewCount: r.length };
    });

    const byId = Object.fromEntries(hydrated.map((t) => [t.id, t]));
    const combined = rows
      .map((r) => ({ id: r.id, trainer: byId[r.trainer_id] }))
      .filter((x) => !!x.trainer);

    setLikes(combined);
    setLoadingLikes(false);
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    loadLikes();

    const channel = supabase
      .channel(`rt-trainer_likes-user-${uid}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trainer_likes", filter: `user_id=eq.${uid}` },
        () => loadLikes()
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "trainer_likes", filter: `user_id=eq.${uid}` },
        () => loadLikes()
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [uid, loadLikes]);

  // Unlike with 10s Undo
  const unlike = useCallback(
    async (likeId, trainerObj) => {
      if (!likeId || !uid) return;

      // optimistic remove
      setLikes((prev) => prev.filter((r) => r.id !== likeId));

      const { error } = await supabase
        .from("trainer_likes")
        .delete()
        .match({ id: likeId, user_id: uid });

      if (error) {
        setErrText(`Σφάλμα αφαίρεσης αγαπημένου: ${error.message}`);
        // revert on failure
        setLikes((prev) => [{ id: likeId, trainer: trainerObj }, ...prev]);
        return;
      }

      addUndoToast({
        message: "Ο επαγγελματίας αφαιρέθηκε από τα αγαπημένα.",
        onUndo: async () => {
          const { data: insertRows, error: insErr } = await supabase
            .from("trainer_likes")
            .insert([{ user_id: uid, trainer_id: trainerObj.id }])
            .select("id")
            .single();

          if (!insErr && insertRows) {
            const newLike = { id: insertRows.id, trainer: trainerObj };
            setLikes((prev) => [newLike, ...prev]);
          } else if (insErr && insErr.code !== "23505") {
            setErrText(`Αποτυχία αναίρεσης: ${insErr.message}`);
          }
        },
      });
    },
    [uid, addUndoToast]
  );

  /* ------------------------------ page chrome ------------------------------ */
  useEffect(() => {
    document.documentElement.classList.add("bg-black");
    document.body.classList.add("bg-black");
    return () => {
      document.documentElement.classList.remove("bg-black");
      document.body.classList.remove("bg-black");
    };
  }, []);

  // Auth loading/endless spinner guard (same behavior as TrainerLikesPage)
  if (loading) {
    return (
      <>
        <UserMenu />
        <div className="min-h-screen text-gray-100 pl:[calc(var(--side-w)+4px)] lg:pt-0 grid place-items-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </>
    );
  }

  if (!uid) {
    return (
      <>
        <UserMenu />
        <div className="min-h-screen text-gray-100 pl-[calc(var(--side-w)+4px)] lg:pt-0">
          <main className="mx-auto max-w-7xl w-full p-4 sm:p-6 pb-24">
            <Empty />
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <UserMenu />

      <div className="min-h-screen text-gray-100 pl-[calc(var(--side-w)+4px)] lg:pt-0">
        <div className="lg:pt-0 pt-14">
          <main className="mx-auto max-w-7xl w-full p-4 sm:p-6 pb-24 space-y-6">
            <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-3 sm:gap-0">
              <div>
                <h1 className="text-[28px] sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  Οι Αγαπημένοι σας Προπονητές
                </h1>
                <p className="text-zinc-400 mt-1 text-sm sm:text-base">
                  Οι επαγγελματίες που ξεχωρίσατε.
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-white">{likes.length}</div>
                  <div className="text-xs text-zinc-400">Σύνολο</div>
                </div>
              </div>
            </div>

            {errText && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 px-4 py-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-300" />
                <span>{errText}</span>
              </div>
            )}

            {loadingLikes ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <div key={i} className="h-80 rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : likes.length === 0 ? (
              <Empty />
            ) : (
              <section
                className="
                  grid grid-cols-1
                  sm:grid-cols-2
                  md:grid-cols-3
                  xl:grid-cols-4
                  gap-4 sm:gap-6 items-stretch
                "
              >
                {likes.map(({ id: likeId, trainer }) => (
                  <TrainerTile
                    key={likeId}
                    name={trainer.full_name || "Επίλεκτος Προπονητής"}
                    location={trainer.location}
                    image={trainer.avatar_url}
                    rating={trainer.rating || 0}
                    reviewCount={trainer.reviewCount || 0}
                    isOnline={!!trainer.is_online}
                    liked
                    onLikeToggle={() => unlike(likeId, trainer)}
                    onView={() => navigate(`/trainer/${trainer.id}`)}
                    onBook={() => setBookingTrainer(trainer)}
                  />
                ))}
              </section>
            )}
          </main>
        </div>
      </div>

      {/* Toasts */}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* Book-now modal (glass) */}
      <AnimatePresence>
        {bookingTrainer && (
          <Suspense
            fallback={
              <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 backdrop-blur-sm">
                <div className="rounded-xl px-6 py-4 border border-white/10 text-zinc-300 bg-black/70">
                  Φόρτωση φόρμας κράτησης…
                </div>
              </div>
            }
          >
            <QuickBookModal
              open
              trainer={bookingTrainer}
              onClose={() => setBookingTrainer(null)}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </>
  );
}
