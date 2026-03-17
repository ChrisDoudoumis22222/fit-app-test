"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Trash2,
  CalendarDays,
  Grid3X3,
  Edit3,
  ExternalLink,
  MoreVertical,
  WifiOff,
  AlertTriangle,
} from "lucide-react"

const PLACEHOLDER = "/placeholder.svg?height=300&width=400&text=No+Image"

export default function EnhancedPostCard({
  post,
  index = 0,
  onDelete,
  onEdit,
  onViewDetails,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [canHover, setCanHover] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [offlineToastOpen, setOfflineToastOpen] = useState(false)

  const menuRef = useRef(null)
  const offlineToastTimerRef = useRef(null)

  const imgs = post?.image_urls?.length
    ? post.image_urls
    : [post?.image_url || PLACEHOLDER]

  const hasMultipleImages = imgs.length > 1

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return

    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)")

    const updateHoverState = () => {
      setCanHover(mediaQuery.matches)
    }

    updateHoverState()

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", updateHoverState)
      return () => mediaQuery.removeEventListener("change", updateHoverState)
    } else {
      mediaQuery.addListener(updateHoverState)
      return () => mediaQuery.removeListener(updateHoverState)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    const setOnline = () => {
      setIsOnline(true)
      setOfflineToastOpen(false)
    }

    const setOffline = () => {
      setIsOnline(false)
    }

    setIsOnline(window.navigator.onLine)

    window.addEventListener("online", setOnline)
    window.addEventListener("offline", setOffline)

    return () => {
      window.removeEventListener("online", setOnline)
      window.removeEventListener("offline", setOffline)
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMobileMenuOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false)
        setOfflineToastOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside, { passive: true })
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (offlineToastTimerRef.current) {
        clearTimeout(offlineToastTimerRef.current)
      }
    }
  }, [])

  const showOfflineMessage = useCallback(() => {
    if (offlineToastTimerRef.current) {
      clearTimeout(offlineToastTimerRef.current)
    }

    setOfflineToastOpen(true)

    offlineToastTimerRef.current = setTimeout(() => {
      setOfflineToastOpen(false)
    }, 2400)
  }, [])

  const guardOffline = useCallback(
    (callback) => {
      if (!isOnline) {
        setMobileMenuOpen(false)
        showOfflineMessage()
        return
      }
      callback?.()
    },
    [isOnline, showOfflineMessage]
  )

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: "easeOut" }}
      whileHover={canHover ? { y: -2 } : undefined}
      className={`group relative overflow-hidden rounded-3xl ${
        post?._animate ? "animate-pulse" : ""
      }`}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/60 to-black/60 backdrop-blur-xl transition-colors duration-300">
        {!isOnline && (
          <div className="absolute left-3 top-3 z-30 flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/12 px-3 py-1.5 text-[11px] font-medium text-red-200 backdrop-blur-md sm:text-xs">
            <WifiOff className="h-3.5 w-3.5" />
            Εκτός σύνδεσης
          </div>
        )}

        <div
          className={`absolute right-4 top-4 z-20 hidden sm:flex gap-2 transition-all duration-200 ${
            canHover
              ? "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
              : "opacity-100"
          }`}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              guardOffline(() => onEdit?.(post))
            }}
            className="p-2 rounded-full bg-black/50 text-white hover:bg-zinc-700 transition-colors backdrop-blur-sm"
            title="Επεξεργασία"
          >
            <Edit3 className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              guardOffline(() => onDelete?.(post.id))
            }}
            className="p-2 rounded-full bg-black/50 text-white hover:bg-red-600 transition-colors backdrop-blur-sm"
            title="Διαγραφή"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div
          ref={menuRef}
          className="absolute right-3 top-3 z-30 sm:hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white p-2.5 shadow-lg active:scale-95 transition"
            aria-label="Άνοιγμα μενού"
            aria-expanded={mobileMenuOpen}
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.16 }}
                className="absolute right-0 mt-2 w-44 overflow-hidden rounded-2xl border border-white/10 bg-black/85 backdrop-blur-xl shadow-2xl"
              >
                <button
                  type="button"
                  onClick={() => {
                    guardOffline(() => onEdit?.(post))
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-zinc-100 hover:bg-white/10 transition-colors"
                >
                  <Edit3 className="h-4 w-4 text-zinc-300" />
                  Επεξεργασία
                </button>

                <div className="h-px bg-white/10" />

                <button
                  type="button"
                  onClick={() => {
                    guardOffline(() => onDelete?.(post.id))
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-300 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4 text-red-400" />
                  Διαγραφή
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div
          className="relative aspect-[4/3] overflow-hidden cursor-pointer"
          onClick={() => guardOffline(() => onViewDetails?.(post))}
        >
          <img
            src={imgs[0] || "/placeholder.svg"}
            alt={post?.title || "Post image"}
            loading="lazy"
            draggable={false}
            className={`h-full w-full object-cover will-change-transform transition-transform duration-500 ${
              canHover ? "group-hover:scale-[1.025]" : "scale-100"
            }`}
          />

          {hasMultipleImages && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1 px-3 py-1.5 bg-black/70 rounded-full text-white text-sm font-medium backdrop-blur-sm">
              <Grid3X3 className="h-4 w-4" />
              {imgs.length}
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
        </div>

        <div
          className="p-6 space-y-4 cursor-pointer"
          onClick={() => guardOffline(() => onViewDetails?.(post))}
        >
          <h3
            className={`text-lg font-bold text-zinc-100 line-clamp-2 transition-colors ${
              canHover ? "group-hover:text-zinc-300" : ""
            }`}
          >
            {post?.title || "Χωρίς τίτλο"}
          </h3>

          <p className="text-zinc-300 text-sm leading-relaxed line-clamp-3">
            {post?.description || "Δεν υπάρχει περιγραφή."}
          </p>

          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <div className="flex items-center gap-2 min-w-0">
              <CalendarDays className="h-4 w-4 text-zinc-400 shrink-0" />
              <time className="text-xs text-zinc-400 truncate">
                {post?.created_at
                  ? new Date(post.created_at).toLocaleDateString("el-GR", {
                      day: "2-digit",
                      month: "short",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </time>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                guardOffline(() => onViewDetails?.(post))
              }}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors shrink-0"
            >
              <ExternalLink className="h-3 w-3" />
              Προβολή
            </button>
          </div>
        </div>

        <AnimatePresence>
          {offlineToastOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-none absolute inset-x-3 bottom-3 z-40"
            >
              <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-black/80 px-4 py-3 text-sm text-red-100 shadow-2xl backdrop-blur-xl">
                <AlertTriangle className="h-4 w-4 text-red-300 shrink-0" />
                <span>Είσαι εκτός σύνδεσης.</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  )
}