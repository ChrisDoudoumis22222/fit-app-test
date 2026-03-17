"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { motion } from "framer-motion"
import { X, ChevronLeft, ChevronRight, Eye } from "lucide-react"

export default function PostPreviewModal({
  open,
  post,
  onClose,
  PostCard,
  onViewDetails,
}) {
  const [mounted, setMounted] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const closeTimerRef = useRef(null)

  const images = useMemo(() => {
    if (Array.isArray(post?.image_urls) && post.image_urls.length) {
      return post.image_urls
    }
    if (post?.image_url) return [post.image_url]
    return []
  }, [post])

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
      requestAnimationFrame(() => setIsVisible(true))
    } else if (shouldRender) {
      setIsVisible(false)
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      closeTimerRef.current = setTimeout(() => {
        setShouldRender(false)
      }, 280)
    }
  }, [open, post, mounted, shouldRender])

  useEffect(() => {
    if (open) setCurrentImageIndex(0)
  }, [open])

  const requestClose = () => {
    setIsVisible(false)
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      setShouldRender(false)
      onClose?.()
    }, 280)
  }

  useEffect(() => {
    if (!shouldRender) return

    const onEsc = (e) => {
      if (e.key === "Escape") requestClose()
    }

    const onKeys = (e) => {
      if (!images.length) return
      if (e.key === "ArrowLeft") {
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
      }
      if (e.key === "ArrowRight") {
        setCurrentImageIndex((prev) => (prev + 1) % images.length)
      }
    }

    document.addEventListener("keydown", onEsc)
    window.addEventListener("keydown", onKeys)
    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", onEsc)
      window.removeEventListener("keydown", onKeys)
      document.body.style.overflow = ""
      document.documentElement.style.overflow = ""
    }
  }, [shouldRender, images.length])

  const prevImage = () => {
    if (!images.length) return
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const nextImage = () => {
    if (!images.length) return
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  if (!mounted || !shouldRender || !post) return null

  const renderDefaultContent = ({ mobile = false }) => (
    <div
      className={
        mobile
          ? "space-y-5"
          : "grid grid-cols-1 xl:grid-cols-[1.15fr_.85fr] gap-8 items-start"
      }
    >
      {!!images.length && (
        <div className="space-y-3 min-w-0">
          <div
            className={[
              "relative overflow-hidden border border-white/10 bg-black",
              mobile ? "rounded-[20px]" : "sticky top-0 rounded-[24px]",
            ].join(" ")}
          >
            <div
              className={
                mobile
                  ? "relative aspect-[4/5]"
                  : "relative aspect-[4/3] xl:aspect-[4/4.2]"
              }
            >
              <img
                src={images[currentImageIndex] || "/placeholder.svg"}
                alt={post.title || "Post image"}
                className="h-full w-full object-cover"
              />

              <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/40 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-black/50 to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-black/50 to-transparent" />

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-black/45 text-white backdrop-blur-md transition hover:bg-white/10"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-black/45 text-white backdrop-blur-md transition hover:bg-white/10"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>

                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/70 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
                    {currentImageIndex + 1} / {images.length}
                  </div>
                </>
              )}
            </div>
          </div>

          {images.length > 1 && (
            <div
              className={[
                "flex gap-2 overflow-x-auto qb-scroll pb-1",
                mobile ? "-mx-1 px-1" : "",
              ].join(" ")}
            >
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`relative flex-shrink-0 overflow-hidden rounded-2xl border transition-all ${
                    idx === currentImageIndex
                      ? "border-white/70 ring-1 ring-white/20"
                      : "border-white/10 opacity-80 hover:opacity-100"
                  } ${mobile ? "h-16 w-16" : "h-20 w-20"}`}
                >
                  <img
                    src={img || "/placeholder.svg"}
                    alt={`Thumbnail ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="min-w-0">
        <div
          className={
            mobile
              ? "px-0 pt-1 pb-2"
              : "px-1 pt-4 pb-2"
          }
        >
          <div className="space-y-4">
            <h1
              className={[
                "break-words bg-gradient-to-r from-white to-zinc-300 bg-clip-text font-black leading-tight tracking-tight text-transparent",
                mobile ? "text-[26px]" : "text-[46px]",
              ].join(" ")}
            >
              {post.title || "Χωρίς τίτλο"}
            </h1>

            {post?.created_at && (
              <div className="text-sm text-zinc-400">
                {new Date(post.created_at).toLocaleDateString("el-GR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            )}

            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <p
              className={[
                "whitespace-pre-wrap break-words text-zinc-300 leading-relaxed",
                mobile ? "text-[16px]" : "text-[28px]",
              ].join(" ")}
            >
              {post.description || "Δεν υπάρχει περιγραφή."}
            </p>

            {post.id !== "preview" && onViewDetails && (
              <button
                type="button"
                onClick={() => onViewDetails(post)}
                className={[
                  "inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 text-white transition hover:bg-white/15",
                  mobile ? "w-full px-4 py-3" : "px-5 py-3",
                ].join(" ")}
              >
                <Eye className="h-4 w-4" />
                Προβολή λεπτομερειών
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const content = (
    <div className="fixed inset-0 z-[140]">
      {/* Desktop */}
      <div className="absolute inset-0 hidden items-center justify-center p-5 sm:flex">
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
            scale: isVisible ? 1 : 0.985,
          }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-[141] max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-b from-zinc-900/90 to-black/95 shadow-2xl backdrop-blur-2xl"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_30%)]" />

          <button
            type="button"
            onClick={requestClose}
            className="absolute right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-white transition hover:bg-white/10"
            aria-label="Κλείσιμο"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="qb-scroll relative max-h-[92vh] overflow-y-auto p-6">
            {PostCard ? (
              <div className="p-0">
                <PostCard post={post} preview />
              </div>
            ) : (
              renderDefaultContent({ mobile: false })
            )}
          </div>
        </motion.div>
      </div>

      {/* Mobile */}
      <div className="absolute inset-0 sm:hidden">
        <motion.button
          type="button"
          aria-label="close overlay"
          onClick={requestClose}
          initial={false}
          animate={{ opacity: isVisible ? 1 : 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="absolute inset-0 bg-black/90"
        />

        <motion.div
          initial={false}
          animate={{
            opacity: isVisible ? 1 : 0,
            y: isVisible ? 0 : 24,
          }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-[141] flex h-[100dvh] w-full flex-col bg-black"
        >
          <div className="relative border-b border-zinc-800/80 bg-black/90 px-4 pb-4 pt-[max(env(safe-area-inset-top),16px)] backdrop-blur-xl">
            <button
              type="button"
              onClick={requestClose}
              className="absolute right-4 top-[max(env(safe-area-inset-top),16px)] inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-white transition hover:bg-zinc-800"
              aria-label="Κλείσιμο"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="pr-14">
              <h2 className="text-base font-semibold text-white">Μια ματία</h2>
              <p className="mt-1 text-sm text-zinc-400">Δες το πως θα μοιάζει η δημοσίευση σου</p>
            </div>
          </div>

          <div className="qb-scroll flex-1 overflow-y-auto px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+28px)]">
            {PostCard ? (
              <div className="w-full">
                <PostCard post={post} preview />
              </div>
            ) : (
              renderDefaultContent({ mobile: true })
            )}
          </div>

          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black to-transparent" />
        </motion.div>
      </div>

      <style>{`
        .qb-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(161, 161, 170, 0.35) transparent;
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
            rgba(113, 113, 122, 0.28),
            rgba(82, 82, 91, 0.38)
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