"use client";

import { useEffect, useMemo, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "../supabaseClient";

/**
 * PostPreviewModal — shows USER avatar + @username
 *
 * Looks for:
 *   post.user / user_profile / profiles / author / owner / created_by
 *   and falls back to fetching via post.user_id | author_id | created_by | owner_id
 *
 * Optional prop:
 *   userOverride?: { username?, email?, avatar_url?, full_name? }
 */
export default function PostPreviewModal({
  open,
  post,
  onClose,
  PostCard,
  onViewDetails,
  userOverride,
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [resolvedUser, setResolvedUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);

  const images = Array.isArray(post?.image_urls) && post.image_urls.length
    ? post.image_urls
    : post?.image_url
    ? [post.image_url]
    : [];

  // ---------- resolve (or fetch) USER ----------
  useEffect(() => {
    let cancelled = false;

    async function hydrateUser() {
      setLoadingUser(true);

      // 1) try to read user inline from the post
      const inline = pickUserLike(
        userOverride ??
          post?.user ??
          post?.user_profile ??
          post?.profiles ??
          post?.author ??
          post?.owner ??
          post?.created_by ??
          post
      );

      if (!cancelled && hasUserBasics(inline)) {
        setResolvedUser(inline);
        setLoadingUser(false);
        return;
      }

      // 2) otherwise, fetch by a likely user id on the post
      const userId = getUserIdCandidate(post);
      if (!userId) {
        if (!cancelled) {
          setResolvedUser(inline || null);
          setLoadingUser(false);
        }
        return;
      }

      // Try common column names in profiles: id | user_id | auth_user_id
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, email")
        .or(
          [
            `id.eq.${escapeOr(userId)}`,
            `user_id.eq.${escapeOr(userId)}`,
            `auth_user_id.eq.${escapeOr(userId)}`,
          ].join(",")
        )
        .limit(1)
        .maybeSingle();

      if (!cancelled) {
        if (error) {
          // still show whatever we had inline
          setResolvedUser(inline || null);
        } else {
          setResolvedUser(pickUserLike(data) || inline || null);
        }
        setLoadingUser(false);
      }
    }

    if (open && post) hydrateUser();
    return () => {
      cancelled = true;
    };
  }, [open, post, userOverride]);

  const username = useMemo(() => deriveUsername(resolvedUser), [resolvedUser]);
  const avatarUrl = resolvedUser?.avatar_url || null;
  const initials =
    (username || "user")
      .split(/[.\s_-]+/)
      .filter(Boolean)
      .map((s) => s[0]?.toUpperCase())
      .slice(0, 2)
      .join("") || "U";

  // reset gallery + avatar state when opened
  useEffect(() => {
    if (open) {
      setCurrentImageIndex(0);
      setAvatarBroken(false);
    }
  }, [open]);

  // Escape to close + lock body scroll
  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose?.();
    if (open) {
      document.addEventListener("keydown", onEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // arrow keys
  useEffect(() => {
    const h = (e) => {
      if (!open || !images.length) return;
      if (e.key === "ArrowLeft") setCurrentImageIndex((p) => (p - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") setCurrentImageIndex((p) => (p + 1) % images.length);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, images.length]);

  // one-time keyframes
  useEffect(() => {
    const id = "pp-modal-keyframes";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id;
      el.textContent = `
        @keyframes ppBackdrop { from { opacity:0; backdrop-filter:blur(0) saturate(100%);} to { opacity:1; backdrop-filter:blur(12px) saturate(120%);} }
        @keyframes ppPanel { from { opacity:0; transform:translateY(40px) scale(.96);} to { opacity:1; transform:translateY(0) scale(1);} }
      `;
      document.head.appendChild(el);
    }
  }, []);

  if (!open || !post) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
      style={{
        backdropFilter: "blur(12px) saturate(120%)",
        WebkitBackdropFilter: "blur(12px) saturate(120%)",
        animation: "ppBackdrop .35s ease-out",
      }}
    >
      {/* PANEL */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[95vh] overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/15"
        style={{
          background:
            "radial-gradient(1200px 800px at 92% 88%, rgba(220,224,230,0.18) 0%, rgba(180,186,194,0.12) 28%, rgba(120,124,130,0.08) 52%, transparent 70%), linear-gradient(135deg, rgba(24,24,27,0.96) 0%, rgba(10,10,11,0.96) 100%)",
          backdropFilter: "blur(18px) saturate(120%)",
          WebkitBackdropFilter: "blur(18px) saturate(120%)",
          animation: "ppPanel .45s cubic-bezier(0.16,1,0.3,1)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        {/* Silver aura bottom-right */}
        <div
          className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(230,233,238,0.22), rgba(200,205,210,0.14) 40%, transparent 70%)",
            filter: "blur(18px)",
          }}
        />

        {/* Header: USER avatar + @username */}
        <div className="relative flex items-center justify-between p-4 sm:p-6 pb-2">
          <div className="flex items-center gap-3 min-w-0">
            {avatarUrl && !avatarBroken ? (
              <img
                src={withCacheBuster(avatarUrl)}
                alt={`@${username}`}
                className="h-10 w-10 rounded-full ring-1 ring-white/20 object-cover"
                onError={() => setAvatarBroken(true)}
              />
            ) : (
              <div className="h-10 w-10 rounded-full ring-1 ring-white/20 bg-gradient-to-br from-zinc-300 to-zinc-500 text-black flex items-center justify-center text-sm font-bold">
                {initials}
              </div>
            )}

            <div className="min-w-0">
              <div className="text-white font-semibold leading-5 truncate">
                @{username}
                {loadingUser && <span className="ml-2 text-xs text-zinc-300/70">…</span>}
              </div>
              {post?.created_at && (
                <div className="text-xs text-zinc-300/70">
                  {new Date(post.created_at).toLocaleDateString("el-GR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="group relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white shadow ring-1 ring-white/10 hover:bg-white/20 transition"
            aria-label="Κλείσιμο"
          >
            <X className="h-5 w-5 group-hover:rotate-90 transition-transform" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(95vh-76px)] px-4 sm:px-6 pb-6">
          <div className="relative">
            {PostCard ? (
              <div className="transform transition-all duration-500">
                <PostCard
                  post={post}
                  style={{ background: "transparent", boxShadow: "none", border: "none", backdropFilter: "none" }}
                  preview
                />
              </div>
            ) : (
              <div className="space-y-8">
                {/* Gallery */}
                {images.length > 0 && (
                  <div className="relative overflow-hidden rounded-2xl">
                    <div className="relative aspect-[16/9] overflow-hidden bg-black">
                      <img
                        src={images[currentImageIndex] || "/placeholder.svg"}
                        alt={post.title || "Post image"}
                        className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                      />

                      {/* Edge shadows to surface arrows */}
                      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
                      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black/75 via-black/35 to-transparent" />
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/40 to-transparent" />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />

                      {images.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/70 text-white text-sm font-medium">
                          {currentImageIndex + 1} / {images.length}
                        </div>
                      )}

                      {images.length > 1 && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
                            }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/15 text-white hover:bg-white/25 ring-1 ring-white/20 backdrop-blur-md transition drop-shadow-[0_6px_18px_rgba(0,0,0,.65)]"
                          >
                            <ChevronLeft className="h-6 w-6" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentImageIndex((prev) => (prev + 1) % images.length);
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/15 text-white hover:bg-white/25 ring-1 ring-white/20 backdrop-blur-md transition drop-shadow-[0_6px_18px_rgba(0,0,0,.65)]"
                          >
                            <ChevronRight className="h-6 w-6" />
                          </button>
                        </>
                      )}
                    </div>

                    {images.length > 1 && (
                      <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                        {images.map((img, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentImageIndex(idx)}
                            className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border transition-all ${
                              idx === currentImageIndex ? "border-white/70" : "border-white/10 opacity-80 hover:opacity-100"
                            }`}
                          >
                            <img src={img || "/placeholder.svg"} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Text */}
                <div className="space-y-6">
                  <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent leading-tight">
                    {post.title || "Χωρίς τίτλο"}
                  </h1>

                  <div className="prose prose-invert prose-p:my-0 max-w-none">
                    <p className="text-zinc-300 leading-relaxed text-lg">{post.description || "Δεν υπάρχει περιγραφή."}</p>
                  </div>

                  {post.id !== "preview" && onViewDetails && (
                    <button
                      onClick={() => onViewDetails(post)}
                      className="mt-2 px-6 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 border border-white/15 transition"
                    >
                      Προβολή λεπτομερειών
                    </button>
                  )}

                  <div className="flex items-center gap-4 py-4">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <div className="w-2 h-2 rounded-full bg-white/40" />
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* bottom fade */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/70 to-transparent" />
      </div>
    </div>
  );
}

/* ---------------- helpers ---------------- */

function hasUserBasics(u) {
  return !!(u && (u.username || u.email || u.avatar_url));
}

function pickUserLike(obj) {
  if (!obj || typeof obj !== "object") return null;
  const full_name = first(
    obj.full_name,
    obj.display_name,
    obj.name,
    `${obj.first_name || ""} ${obj.last_name || ""}`.trim()
  );
  const username = first(obj.username, obj.handle, obj.user_name, obj.nickname);
  const email = first(obj.email, obj.user_email);
  const avatar_url = first(
    obj.avatar_url,
    obj.avatar,
    obj.picture,
    obj.image_url,
    obj.profile_image,
    obj.photoURL,
    obj.photo_url
  );
  return { full_name, username, email, avatar_url };
}

function deriveUsername(user) {
  const clean = (s) => (typeof s === "string" ? s.trim() : "");
  const handleFromEmail =
    typeof user?.email === "string" && user.email.includes("@")
      ? user.email.split("@")[0]
      : "";

  return (
    clean(user?.username) ||
    handleFromEmail ||
    (user?.full_name ? user.full_name.toLowerCase().replace(/\s+/g, "_").replace(/[^\w]/g, "") : "") ||
    "user"
  );
}

function getUserIdCandidate(post) {
  return (
    post?.user_id ||
    post?.author_id ||
    post?.created_by ||
    post?.owner_id ||
    post?.user?.id ||
    post?.user_profile?.id ||
    post?.profiles?.id ||
    null
  );
}

function first(...vals) {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    const s = typeof v === "string" ? v.trim() : v;
    if (s) return s;
  }
  return null;
}

function escapeOr(val) {
  // Supabase .or() arg expects raw value; wrap in quotes if needed
  // For UUIDs with dashes it's fine, but this keeps it safe.
  return typeof val === "string" && /[,]/.test(val) ? `"${val}"` : val;
}

function withCacheBuster(url) {
  try {
    const u = new URL(url, window.location.origin);
    u.searchParams.set("t", Date.now().toString());
    return u.toString();
  } catch {
    return url ? `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}` : url;
  }
}
