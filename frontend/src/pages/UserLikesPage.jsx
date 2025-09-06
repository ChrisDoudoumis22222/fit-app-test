// src/pages/UserLikesPage.jsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ExternalLink, MapPin, Loader2, AlertCircle, User as UserIcon } from "lucide-react";

import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";
import UserMenu from "../components/UserMenu";

/* ---------- Avatar (same vibe as Services page) ---------- */
const AVATAR_PLACEHOLDER = "/placeholder.svg?height=120&width=120&text=Avatar";
function AvatarThumb({ url, alt }) {
  if (url) {
    return (
      <img
        src={url}
        alt={alt || "trainer"}
        loading="lazy"
        decoding="async"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = AVATAR_PLACEHOLDER;
        }}
        className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover"
      />
    );
  }
  return (
    <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 grid place-items-center">
      <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm grid place-items-center">
        <UserIcon className="h-6 w-6 text-white/60" />
      </div>
    </div>
  );
}

export default function UserLikesPage() {
  const { profile, loading } = useAuth();
  const uid = profile?.id;

  const [loadingLikes, setLoadingLikes] = useState(true);
  const [likes, setLikes] = useState([]);
  const [errText, setErrText] = useState("");

  const loadLikes = useCallback(async () => {
    if (!uid) return;
    setLoadingLikes(true);
    setErrText("");

    // 1) raw likes (RLS-friendly)
    const { data: likeRows, error: likeErr } = await supabase
      .from("trainer_likes")
      .select("id, created_at, trainer_id")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (likeErr) {
      setErrText(`Σφάλμα likes: ${likeErr.message}`);
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

    // 2) fetch trainer profiles (use only fields existing in your schema)
    const { data: trainers, error: profErr } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role, location, bio")
      .in("id", trainerIds);

    if (profErr) {
      setErrText(`Σφάλμα profiles: ${profErr.message}`);
      setLikes([]);
      setLoadingLikes(false);
      return;
    }

    const byId = Object.fromEntries((trainers || []).map((t) => [t.id, t]));
    const combined = rows
      .map((r) => ({ id: r.id, created_at: r.created_at, trainer: byId[r.trainer_id] }))
      .filter((r) => !!r.trainer);

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
      } catch {}
    };
  }, [uid, loadLikes]);

  const unlike = async (likeId) => {
    if (!likeId || !uid) return;
    const { error } = await supabase.from("trainer_likes").delete().match({ id: likeId, user_id: uid });
    if (!error) setLikes((prev) => prev.filter((r) => r.id !== likeId));
    else setErrText(`Σφάλμα διαγραφής: ${error.message}`);
  };

  const Empty = () => (
    <div className="rounded-3xl border border-white/10 panel p-8 text-center">
      <p className="text-zinc-200 text-lg font-semibold">Δεν έχεις αγαπημένους εκπαιδευτές ακόμα.</p>
      <p className="text-zinc-400 mt-1">Πήγαινε στους προπονητές και πάτησε το ♥ για να τους αποθηκεύσεις.</p>
      <div className="mt-6">
        <Link
          to="/services"
          className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 hover:bg-white/10"
        >
          Εξερεύνηση προπονητών <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );

  // Auth loading
  if (loading) {
    return (
      <>
        <UserMenu />
        <div className="min-h-screen text-gray-100 pl-[calc(var(--side-w)+4px)] lg:pt-0">
          <div className="fixed inset-0 -z-50 bg-black">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.08),transparent_55%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
          </div>
          <div className="flex items-center justify-center h-[60vh]">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-200" />
          </div>
        </div>
      </>
    );
  }

  if (!uid) {
    return (
      <>
        <UserMenu />
        <div className="min-h-screen text-gray-100 pl-[calc(var(--side-w)+4px)] lg:pt-0">
          <div className="fixed inset-0 -z-50 bg-black">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.08),transparent_55%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
          </div>
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
        {/* bg */}
        <div className="fixed inset-0 -z-50 bg-black">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.08),transparent_55%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>

        <div className="lg:pt-0 pt-14 transition-[padding]">
          <main className="mx-auto max-w-7xl w-full p-4 sm:p-6 pb-24 space-y-8">
            {/* header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
                  Αγαπημένοι Προπονητές
                </h1>
                <p className="text-zinc-400 mt-1">Εδώ θα βρεις όλους τους εκπαιδευτές που έχεις κάνει ♥.</p>
              </div>
            </div>

            {/* error hint */}
            {errText && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 text-red-200 px-4 py-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{errText}</span>
              </div>
            )}

            {/* content */}
            {loadingLikes ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-200" />
              </div>
            ) : likes.length === 0 ? (
              <Empty />
            ) : (
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {likes.map(({ id: likeId, created_at, trainer }) => (
                    <motion.article
                      key={likeId}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="relative rounded-3xl border border-white/10 panel overflow-hidden"
                    >
                      {/* Red heart (absolute) */}
                      <button
                        onClick={() => unlike(likeId)}
                        className="absolute top-3 right-3 h-9 w-9 grid place-items-center rounded-full bg-red-500/90 text-white border border-white/15 hover:scale-105 transition"
                        title="Αφαίρεση από Αγαπημένα"
                      >
                        <Heart className="h-5 w-5 fill-current" />
                      </button>

                      <div className="p-4 sm:p-5 flex gap-4">
                        <AvatarThumb url={trainer.avatar_url} alt={trainer.full_name} />

                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-base sm:text-lg font-semibold text-white">
                            {trainer.full_name || "Εκπαιδευτής"}
                          </h3>
                          {trainer.location && (
                            <p className="mt-0.5 text-xs text-zinc-400 flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" /> {trainer.location}
                            </p>
                          )}

                          {/* bio preview */}
                          {trainer.bio && (
                            <p className="mt-2 line-clamp-2 text-sm text-zinc-300">
                              {trainer.bio}
                            </p>
                          )}

                          <div className="mt-4 flex items-center justify-between">
                            <Link
                              to={`/trainer/${trainer.id}`}
                              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-1.5 text-sm text-zinc-100 hover:bg-white/10"
                            >
                              Προβολή προφίλ <ExternalLink className="h-4 w-4" />
                            </Link>

                            <span className="text-[11px] text-zinc-500">
                              Αποθήκευση: {new Date(created_at || Date.now()).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </AnimatePresence>
              </section>
            )}
          </main>
        </div>
      </div>

      {/* Local panel style so cards match Services page */}
      <style jsx global>{`
        .panel {
          background:
            radial-gradient(120% 120% at 50% 0%, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.6) 40%),
            linear-gradient(to bottom, rgba(255,255,255,0.02), rgba(0,0,0,0.5));
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.06),
            0 10px 30px rgba(0,0,0,0.6);
        }
      `}</style>
    </>
  );
}
