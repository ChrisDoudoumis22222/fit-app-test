"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { X, ChevronLeft, ChevronRight, Eye } from "lucide-react"
import { supabase } from "../../supabaseClient"

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
  const [mounted, setMounted] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [avatarBroken, setAvatarBroken] = useState(false)
  const [resolvedUser, setResolvedUser] = useState(null)
  const [loadingUser, setLoadingUser] = useState(false)

  const closeTimerRef = useRef(null)

  const images =
    Array.isArray(post?.image_urls) && post.image_urls.length
      ? post.image_urls
      : post?.image_url
      ? [post.image_url]
      : []

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!mounted) return

    if (open && post) {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      setShouldRender(true)
      requestAnimationFrame(() => {
        setIsVisible(true)
      })
    } else if (shouldRender) {
      setIsVisible(false)
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      closeTimerRef.current = setTimeout(() => {
        setShouldRender(false)
      }, 280)
    }
  }, [open, post, mounted, shouldRender])

  const requestClose = () => {
    setIsVisible(false)
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      setShouldRender(false)
      onClose?.()
    }, 280)
  }

  // ---------- resolve (or fetch) USER ----------
  useEffect(() => {
    let cancelled = false

    async function hydrateUser() {
      setLoadingUser(true)

      const inline = pickUserLike(
        userOverride ??
          post?.user ??
          post?.user_profile ??
          post?.profiles ??
          post?.author ??
          post?.owner ??
          post?.created_by ??
          post,
      )

      if (!cancelled && hasUserBasics(inline)) {
        setResolvedUser(inline)
        setLoadingUser(false)
        return
      }

      const userId = getUserIdCandidate(post)
      if (!userId) {
        if (!cancelled) {
          setResolvedUser(inline || null)
          setLoadingUser(false)
        }
        return
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, email")
        .or(
          [
            `id.eq.${escapeOr(userId)}`,
            `user_id.eq.${escapeOr(userId)}`,
            `auth_user_id.eq.${escapeOr(userId)}`,
          ].join(","),
        )
        .limit(1)
        .maybeSingle()

      if (!cancelled) {
        if (error) {
          setResolvedUser(inline || null)
        } else {
          setResolvedUser(pickUserLike(data) || inline || null)
        }
        setLoadingUser(false)
      }
    }

    if (open && post) hydrateUser()
    return () => {
      cancelled = true
    }
  }, [open, post, userOverride])

  const username = useMemo(() => deriveUsername(resolvedUser), [resolvedUser])
  const avatarUrl = resolvedUser?.avatar_url || null
  const initials =
    (username || "user")
      .split(/[.\s_-]+/)
      .filter(Boolean)
      .map((s) => s[0]?.toUpperCase())
      .slice(0, 2)
      .join("") || "U"

  useEffect(() => {
    if (open) {
      setCurrentImageIndex(0)
      setAvatarBroken(false)
    }
  }, [open])

  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && requestClose()

    if (shouldRender) {
      document.addEventListener("keydown", onEsc)
      document.body.style.overflow = "hidden"
      document.documentElement.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", onEsc)
      document.body.style.overflow = ""
      document.documentElement.style.overflow = ""
    }
  }, [shouldRender])

  useEffect(() => {
    const h = (e) => {
      if (!shouldRender || !images.length) return
      if (e.key === "ArrowLeft") {
        setCurrentImageIndex((p) => (p - 1 + images.length) % images.length)
      }
      if (e.key === "ArrowRight") {
        setCurrentImageIndex((p) => (p + 1) % images.length)
      }
    }

    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [shouldRender, images.length])

  if (!mounted || !shouldRender || !post) return null

  const content = (
    <div className="fixed inset-0 z-[120]">
      {/* Desktop */}
      <div className="hidden sm:flex absolute inset-0 items-center justify-center p-4">
        <motion.button
          type="button"
          aria-label="close overlay"
          onClick={requestClose}
          initial={false}
          animate={{ opacity: isVisible ? 1 : 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        <motion.div
          initial={false}
          animate={{
            opacity: isVisible ? 1 : 0,
            y: isVisible ? 0 : 32,
            scale: isVisible ? 1 : 0.98,
          }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-[121] w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/90 to-black/95 backdrop-blur-2xl shadow-2xl flex flex-col"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_30%)]" />

          <div className="relative flex items-center justify-between gap-4 border-b border-white/10 px-6 py-5">
            <div className="flex items-center gap-3 min-w-0">
              {avatarUrl && !avatarBroken ? (
                <img
                  src={withCacheBuster(avatarUrl)}
                  alt={`@${username}`}
                  className="h-11 w-11 rounded-full ring-1 ring-white/20 object-cover shrink-0"
                  onError={() => setAvatarBroken(true)}
                />
              ) : (
                <div className="h-11 w-11 rounded-full ring-1 ring-white/20 bg-gradient-to-br from-zinc-300 to-zinc-500 text-black flex items-center justify-center text-sm font-bold shrink-0">
                  {initials}
                </div>
              )}

              <div className="min-w-0">
                <div className="text-white font-semibold truncate">
                  @{username}
                  {loadingUser && (
                    <span className="ml-2 text-xs text-zinc-400">…</span>
                  )}
                </div>
                {post?.created_at && (
                  <div className="text-xs text-zinc-400">
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
              onClick={requestClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-white hover:bg-white/10 transition shrink-0"
              aria-label="Κλείσιμο"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative flex-1 overflow-y-auto qb-scroll px-6 py-5">
            {PostCard ? (
              <div className="rounded-3xl border border-white/10 bg-black/20 backdrop-blur-xl p-2">
                <PostCard post={post} preview />
              </div>
            ) : (
              <div className="space-y-6">
                {!!images.length && (
                  <div className="space-y-3">
                    <div className="relative overflow-hidden rounded-2xl bg-black border border-white/10">
                      <div className="relative aspect-[16/9] overflow-hidden">
                        <img
                          src={images[currentImageIndex] || "/placeholder.svg"}
                          alt={post.title || "Post image"}
                          className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                        />

                        <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-black/70 to-transparent" />
                        <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-black/70 to-transparent" />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />

                        {images.length > 1 && (
                          <>
                            <button
                              onClick={() =>
                                setCurrentImageIndex(
                                  (prev) => (prev - 1 + images.length) % images.length,
                                )
                              }
                              className="absolute left-4 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-black/45 text-white hover:bg-white/10 transition"
                            >
                              <ChevronLeft className="h-5 w-5" />
                            </button>

                            <button
                              onClick={() =>
                                setCurrentImageIndex((prev) => (prev + 1) % images.length)
                              }
                              className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-black/45 text-white hover:bg-white/10 transition"
                            >
                              <ChevronRight className="h-5 w-5" />
                            </button>

                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/70 text-white text-sm font-medium backdrop-blur-sm">
                              {currentImageIndex + 1} / {images.length}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {images.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto qb-scroll pb-1">
                        {images.map((img, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentImageIndex(idx)}
                            className={`relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border transition-all ${
                              idx === currentImageIndex
                                ? "border-white/70"
                                : "border-white/10 opacity-80 hover:opacity-100"
                            }`}
                          >
                            <img
                              src={img || "/placeholder.svg"}
                              alt={`Thumbnail ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  <h1 className="text-2xl sm:text-4xl font-black leading-tight tracking-tight bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent break-words">
                    {post.title || "Χωρίς τίτλο"}
                  </h1>

                  <p className="text-zinc-300 text-base sm:text-lg leading-relaxed whitespace-pre-wrap">
                    {post.description || "Δεν υπάρχει περιγραφή."}
                  </p>

                  {post.id !== "preview" && onViewDetails && (
                    <button
                      onClick={() => onViewDetails(post)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-white/15 bg-white/10 text-white hover:bg-white/15 transition"
                    >
                      <Eye className="h-4 w-4" />
                      Προβολή λεπτομερειών
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Mobile */}
      <div className="sm:hidden absolute inset-0">
        <motion.button
          type="button"
          aria-label="close overlay"
          onClick={requestClose}
          initial={false}
          animate={{ opacity: isVisible ? 1 : 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="absolute inset-0 bg-black/88"
        />

        <div className="absolute inset-x-0 bottom-0 flex justify-center">
          <motion.div
            initial={false}
            animate={{
              opacity: isVisible ? 1 : 0,
              y: isVisible ? 0 : 60,
            }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-[121] w-full rounded-t-[30px] border border-zinc-900 bg-black shadow-[0_-30px_80px_rgba(0,0,0,.9)] overflow-hidden flex flex-col max-h-[94dvh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center bg-black pt-2 pb-1">
              <div className="h-1.5 w-12 rounded-full bg-zinc-700/90" />
            </div>

            <div className="border-b border-zinc-800/90 bg-black px-4 pt-3 pb-4">
              <div className="flex items-center gap-3">
                {avatarUrl && !avatarBroken ? (
                  <img
                    src={withCacheBuster(avatarUrl)}
                    alt={`@${username}`}
                    className="h-10 w-10 rounded-full ring-1 ring-white/20 object-cover shrink-0"
                    onError={() => setAvatarBroken(true)}
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full ring-1 ring-white/20 bg-gradient-to-br from-zinc-300 to-zinc-500 text-black flex items-center justify-center text-sm font-bold shrink-0">
                    {initials}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="text-white font-semibold truncate">
                    @{username}
                    {loadingUser && (
                      <span className="ml-2 text-xs text-zinc-400">…</span>
                    )}
                  </div>
                  {post?.created_at && (
                    <div className="text-xs text-zinc-400">
                      {new Date(post.created_at).toLocaleDateString("el-GR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                  )}
                </div>

                <button
                  onClick={requestClose}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-white transition hover:bg-zinc-800 shrink-0"
                  aria-label="Κλείσιμο"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto qb-scroll px-4 py-4">
              {PostCard ? (
                <div className="rounded-3xl border border-white/10 bg-black/20 backdrop-blur-xl p-2">
                  <PostCard post={post} preview />
                </div>
              ) : (
                <div className="space-y-5">
                  {!!images.length && (
                    <div className="space-y-3">
                      <div className="relative overflow-hidden rounded-2xl bg-black border border-white/10">
                        <div className="relative aspect-[4/5] overflow-hidden">
                          <img
                            src={images[currentImageIndex] || "/placeholder.svg"}
                            alt={post.title || "Post image"}
                            className="w-full h-full object-cover"
                          />

                          {images.length > 1 && (
                            <>
                              <button
                                onClick={() =>
                                  setCurrentImageIndex(
                                    (prev) => (prev - 1 + images.length) % images.length,
                                  )
                                }
                                className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-black/45 text-white"
                              >
                                <ChevronLeft className="h-5 w-5" />
                              </button>

                              <button
                                onClick={() =>
                                  setCurrentImageIndex(
                                    (prev) => (prev + 1) % images.length,
                                  )
                                }
                                className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-black/45 text-white"
                              >
                                <ChevronRight className="h-5 w-5" />
                              </button>

                              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/70 text-white text-sm font-medium backdrop-blur-sm">
                                {currentImageIndex + 1} / {images.length}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {images.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto qb-scroll pb-1">
                          {images.map((img, idx) => (
                            <button
                              key={idx}
                              onClick={() => setCurrentImageIndex(idx)}
                              className={`relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border transition-all ${
                                idx === currentImageIndex
                                  ? "border-white/70"
                                  : "border-white/10 opacity-80"
                              }`}
                            >
                              <img
                                src={img || "/placeholder.svg"}
                                alt={`Thumbnail ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-4">
                    <h1 className="text-2xl font-black leading-tight tracking-tight bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent break-words">
                      {post.title || "Χωρίς τίτλο"}
                    </h1>

                    <p className="text-zinc-300 text-base leading-relaxed whitespace-pre-wrap">
                      {post.description || "Δεν υπάρχει περιγραφή."}
                    </p>

                    {post.id !== "preview" && onViewDetails && (
                      <button
                        onClick={() => onViewDetails(post)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-white/15 bg-white/10 text-white hover:bg-white/15 transition w-full justify-center"
                      >
                        <Eye className="h-4 w-4" />
                        Προβολή λεπτομερειών
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black to-transparent" />
          </motion.div>
        </div>
      </div>

      <style>{`
        .qb-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(161, 161, 170, .35) transparent;
        }
        .qb-scroll::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .qb-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .qb-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(
            180deg,
            rgba(113,113,122,.28),
            rgba(82,82,91,.38)
          );
          border-radius: 999px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
      `}</style>
    </div>
  )

  return createPortal(content, document.body)
}

/* ---------------- helpers ---------------- */

function hasUserBasics(u) {
  return !!(u && (u.username || u.email || u.avatar_url))
}

function pickUserLike(obj) {
  if (!obj || typeof obj !== "object") return null
  const full_name = first(
    obj.full_name,
    obj.display_name,
    obj.name,
    `${obj.first_name || ""} ${obj.last_name || ""}`.trim(),
  )
  const username = first(obj.username, obj.handle, obj.user_name, obj.nickname)
  const email = first(obj.email, obj.user_email)
  const avatar_url = first(
    obj.avatar_url,
    obj.avatar,
    obj.picture,
    obj.image_url,
    obj.profile_image,
    obj.photoURL,
    obj.photo_url,
  )
  return { full_name, username, email, avatar_url }
}

function deriveUsername(user) {
  const clean = (s) => (typeof s === "string" ? s.trim() : "")
  const handleFromEmail =
    typeof user?.email === "string" && user.email.includes("@")
      ? user.email.split("@")[0]
      : ""

  return (
    clean(user?.username) ||
    handleFromEmail ||
    (user?.full_name
      ? user.full_name
          .toLowerCase()
          .replace(/\s+/g, "_")
          .replace(/[^\w]/g, "")
      : "") ||
    "user"
  )
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
  )
}

function first(...vals) {
  for (const v of vals) {
    if (v === null || v === undefined) continue
    const s = typeof v === "string" ? v.trim() : v
    if (s) return s
  }
  return null
}

function escapeOr(val) {
  return typeof val === "string" && /[,]/.test(val) ? `"${val}"` : val
}

function withCacheBuster(url) {
  try {
    const u = new URL(url, window.location.origin)
    u.searchParams.set("t", Date.now().toString())
    return u.toString()
  } catch {
    return url ? `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}` : url
  }
}