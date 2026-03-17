"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  ImageIcon,
  X,
  Upload,
  Edit3,
  Save,
  Loader2,
} from "lucide-react"

const MAX_BYTES = 1_024_000 // 1 MB

const MOBILE_MID_HEIGHT = "68dvh"
const MOBILE_FULL_HEIGHT = "96dvh"
const CLOSE_MS = 340

const DESKTOP_CLOSE_Y = 56
const MOBILE_CLOSE_Y_FALLBACK = 760

const cn = (...classes) => classes.filter(Boolean).join(" ")

const arraysEqual = (a = [], b = []) =>
  a.length === b.length && a.every((v, i) => v === b[i])

const formatBytes = (bytes = 0) => {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

const isInteractiveTarget = (target) => {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest(
      'button, a, input, textarea, select, option, label, [role="button"]',
    ),
  )
}

const Field = ({ label, textarea = false, value, onChange, dirty = false }) => (
  <div className={cn("space-y-2", dirty && "rounded-2xl p-2 ring-1 ring-white/10")}>
    <label className="block text-sm font-medium text-zinc-300">{label}</label>

    {textarea ? (
      <textarea
        className="h-32 w-full resize-none rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 transition-all duration-200 focus:border-zinc-600 focus:outline-none"
        placeholder={`Εισάγετε ${label.toLowerCase()}...`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    ) : (
      <input
        className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 transition-all duration-200 focus:border-zinc-600 focus:outline-none"
        placeholder={`Εισάγετε ${label.toLowerCase()}...`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )}
  </div>
)

const EditImageThumb = ({ src, index, onRemove, type }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.96 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: index * 0.03 }}
    className="group relative aspect-square overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900"
  >
    <img
      src={src || "/placeholder.svg"}
      alt={`Εικόνα ${index}`}
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      loading="lazy"
      decoding="async"
      draggable={false}
    />

    <div
      className={cn(
        "absolute left-2 top-2 rounded-xl border px-2 py-1 text-[11px] font-medium",
        type === "new"
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
          : "border-zinc-700 bg-zinc-800/95 text-zinc-300",
      )}
    >
      {type === "new" ? "Νέα" : "Υπάρχουσα"}
    </div>

    <button
      type="button"
      onClick={onRemove}
      className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/80 text-white transition hover:bg-red-600 active:scale-95 sm:h-8 sm:w-8"
      aria-label={`Διαγραφή εικόνας ${index}`}
    >
      <X className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
    </button>

    <div className="pointer-events-none absolute inset-0 bg-black/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
  </motion.div>
)

export default function EditPostModal({ open, post, onClose, onSave }) {
  const [mounted, setMounted] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  const [editTitle, setEditTitle] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [editImages, setEditImages] = useState([])
  const [newFiles, setNewFiles] = useState([])
  const [newThumbs, setNewThumbs] = useState([])
  const [saving, setSaving] = useState(false)

  const [mobileMode, setMobileMode] = useState("mid")
  const [mobileDragY, setMobileDragY] = useState(0)
  const [mobileDragging, setMobileDragging] = useState(false)

  const fileInputRef = useRef(null)
  const origRef = useRef({ title: "", description: "", images: [] })
  const closeTimerRef = useRef(null)
  const newThumbsRef = useRef([])
  const dragRef = useRef({
    startY: 0,
    deltaY: 0,
    startMode: "mid",
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    newThumbsRef.current = newThumbs
  }, [newThumbs])

  const revokeUrls = useCallback((urls = []) => {
    urls.forEach((url) => {
      try {
        if (typeof url === "string" && url.startsWith("blob:")) {
          URL.revokeObjectURL(url)
        }
      } catch {}
    })
  }, [])

  const resetDraft = useCallback(() => {
    revokeUrls(newThumbsRef.current)
    setEditTitle("")
    setEditDesc("")
    setEditImages([])
    setNewFiles([])
    setNewThumbs([])
    setMobileMode("mid")
    setMobileDragY(0)
    setMobileDragging(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [revokeUrls])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      revokeUrls(newThumbsRef.current)
    }
  }, [revokeUrls])

  useEffect(() => {
    if (post && open) {
      const initialImages =
        Array.isArray(post.image_urls) && post.image_urls.length
          ? post.image_urls
          : [post.image_url].filter(Boolean)

      origRef.current = {
        title: post.title || "",
        description: post.description || "",
        images: initialImages,
      }

      setEditTitle(origRef.current.title)
      setEditDesc(origRef.current.description)
      setEditImages(initialImages)
      setNewFiles([])
      revokeUrls(newThumbsRef.current)
      setNewThumbs([])
      setMobileMode("mid")
      setMobileDragY(0)
      setMobileDragging(false)
    }
  }, [post, open, revokeUrls])

  useEffect(() => {
    if (!mounted) return

    if (open) {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      setShouldRender(true)
      requestAnimationFrame(() => setIsVisible(true))
    } else if (shouldRender) {
      setIsVisible(false)
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      closeTimerRef.current = setTimeout(() => {
        setShouldRender(false)
        resetDraft()
      }, CLOSE_MS)
    }
  }, [open, mounted, shouldRender, resetDraft])

  useEffect(() => {
    if (!mounted || !shouldRender) return
    if (typeof window === "undefined") return

    const prevHtmlOverflow = document.documentElement.style.overflow
    const prevBodyOverflow = document.body.style.overflow

    document.documentElement.style.overflow = "hidden"
    document.body.style.overflow = "hidden"

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow
      document.body.style.overflow = prevBodyOverflow
    }
  }, [mounted, shouldRender])

  const isMobileViewport = useCallback(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia("(max-width: 639.98px)").matches
  }, [])

  const mobileCloseY =
    typeof window === "undefined"
      ? MOBILE_CLOSE_Y_FALLBACK
      : Math.max(window.innerHeight || MOBILE_CLOSE_Y_FALLBACK, MOBILE_CLOSE_Y_FALLBACK)

  const requestClose = useCallback(() => {
    if (saving) return
    setIsVisible(false)

    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      setShouldRender(false)
      resetDraft()
      onClose?.()
    }, CLOSE_MS)
  }, [saving, resetDraft, onClose])

  const beginMobileDrag = useCallback(
    (clientY) => {
      if (!isMobileViewport()) return
      dragRef.current.startY = clientY
      dragRef.current.deltaY = 0
      dragRef.current.startMode = mobileMode
      setMobileDragging(true)
    },
    [isMobileViewport, mobileMode],
  )

  const moveMobileDrag = useCallback(
    (clientY) => {
      if (!isMobileViewport()) return
      if (!mobileDragging) return

      const rawDelta = clientY - dragRef.current.startY
      dragRef.current.deltaY = rawDelta

      if (rawDelta < 0) {
        setMobileDragY(Math.max(rawDelta, -220))
      } else {
        setMobileDragY(Math.min(rawDelta, 260))
      }
    },
    [isMobileViewport, mobileDragging],
  )

  const endMobileDrag = useCallback(() => {
    if (!isMobileViewport()) return
    if (!mobileDragging) return

    const deltaY = dragRef.current.deltaY
    const startMode = dragRef.current.startMode

    setMobileDragging(false)
    setMobileDragY(0)

    if (deltaY <= -90) {
      setMobileMode("full")
      return
    }

    if (startMode === "full" && deltaY >= 90 && deltaY < 180) {
      setMobileMode("mid")
      return
    }

    if (deltaY >= 180) {
      requestClose()
      return
    }

    setMobileMode(startMode)
  }, [isMobileViewport, mobileDragging, requestClose])

  const handleDragTouchStart = useCallback(
    (e) => {
      if (isInteractiveTarget(e.target)) return
      beginMobileDrag(e.touches[0].clientY)
    },
    [beginMobileDrag],
  )

  const handleDragTouchMove = useCallback(
    (e) => {
      if (!mobileDragging) return
      moveMobileDrag(e.touches[0].clientY)
    },
    [mobileDragging, moveMobileDrag],
  )

  const handleDragTouchEnd = useCallback(() => {
    endMobileDrag()
  }, [endMobileDrag])

  const titleDirty = (editTitle ?? "") !== (origRef.current.title ?? "")
  const descDirty = (editDesc ?? "") !== (origRef.current.description ?? "")
  const imagesDirty =
    !arraysEqual(editImages ?? [], origRef.current.images ?? []) ||
    newFiles.length > 0
  const hasChanges = titleDirty || descDirty || imagesDirty

  const addNewFiles = useCallback((fileList) => {
    const arr = Array.from(fileList || [])
    const okFiles = []
    const okUrls = []

    arr.forEach((f) => {
      if (f.size > MAX_BYTES || !f.type.startsWith("image/")) return
      okFiles.push(f)
      okUrls.push(URL.createObjectURL(f))
    })

    if (!okFiles.length) return

    setNewFiles((prev) => [...prev, ...okFiles])
    setNewThumbs((prev) => [...prev, ...okUrls])
  }, [])

  const removeExistingImage = (index) =>
    setEditImages((imgs) => imgs.filter((_, i) => i !== index))

  const removeNewImage = (index) => {
    setNewFiles((files) => files.filter((_, i) => i !== index))
    setNewThumbs((thumbs) => {
      const removed = thumbs[index]
      if (removed) revokeUrls([removed])
      return thumbs.filter((_, i) => i !== index)
    })
  }

  const handleSave = async () => {
    if (!editTitle.trim() || !editDesc.trim()) return

    const totalImages = editImages.length + newThumbs.length
    if (totalImages === 0) return

    setSaving(true)
    try {
      await onSave({
        title: editTitle,
        description: editDesc,
        existingImages: editImages,
        newFiles,
      })
      requestClose()
    } catch {
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    const o = origRef.current
    revokeUrls(newThumbsRef.current)
    setEditTitle(o.title)
    setEditDesc(o.description)
    setEditImages(o.images)
    setNewFiles([])
    setNewThumbs([])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  if (!mounted || (!shouldRender && !open) || !post) return null

  const totalImages = editImages.length + newThumbs.length
  const totalSelectedBytes = newFiles.reduce(
    (sum, file) => sum + (file?.size || 0),
    0,
  )

  const renderForm = ({ mobile = false }) => (
    <div
      className={cn(
        "flex-1 overflow-y-auto overscroll-contain",
        mobile ? "px-4 py-4" : "px-6 py-5",
      )}
      onClick={(e) => e.stopPropagation()}
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <div className="space-y-6">
        <Field
          label="Τίτλος"
          value={editTitle}
          onChange={setEditTitle}
          dirty={titleDirty}
        />

        <Field
          label="Περιγραφή"
          textarea
          value={editDesc}
          onChange={setEditDesc}
          dirty={descDirty}
        />

        <div className={cn("space-y-4", imagesDirty && "rounded-2xl p-2 ring-1 ring-white/10")}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-zinc-300">
                Εικόνες ({totalImages})
              </label>
              {!!newFiles.length && (
                <p className="mt-1 text-xs text-zinc-500">
                  Νέες εικόνες: {formatBytes(totalSelectedBytes)}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white transition hover:bg-zinc-800"
            >
              <Upload className="h-4 w-4" />
              Προσθήκη
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => {
              addNewFiles(e.target.files)
              e.target.value = ""
            }}
          />

          {!totalImages && (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950 py-10 text-center text-zinc-500">
              <ImageIcon className="mx-auto mb-2 h-10 w-10 text-zinc-600" />
              <p>Δεν υπάρχουν εικόνες. Πρόσθεσε τουλάχιστον μία.</p>
            </div>
          )}

          {!!editImages.length && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-zinc-400">
                Υπάρχουσες εικόνες
              </h4>
              <div
                className={cn(
                  "grid gap-4",
                  mobile ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
                )}
              >
                {editImages.map((src, i) => (
                  <EditImageThumb
                    key={`existing-${i}`}
                    src={src}
                    index={i + 1}
                    onRemove={() => removeExistingImage(i)}
                    type="existing"
                  />
                ))}
              </div>
            </div>
          )}

          {!!newThumbs.length && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-zinc-400">Νέες εικόνες</h4>
              <div
                className={cn(
                  "grid gap-4",
                  mobile ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
                )}
              >
                {newThumbs.map((src, i) => (
                  <EditImageThumb
                    key={`new-${i}`}
                    src={src}
                    index={editImages.length + i + 1}
                    onRemove={() => removeNewImage(i)}
                    type="new"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const modalNode = (
    <AnimatePresence>
      {shouldRender && (
        <>
          <div
            className={cn(
              "fixed inset-0 z-[80] hidden items-center justify-center p-4 sm:flex",
              isVisible ? "pointer-events-auto" : "pointer-events-none",
            )}
          >
            <motion.button
              type="button"
              aria-label="close overlay"
              onClick={requestClose}
              initial={false}
              animate={{ opacity: isVisible ? 1 : 0 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className={cn(
                "absolute inset-0 bg-black/82",
                isVisible ? "pointer-events-auto" : "pointer-events-none",
              )}
            />

            <motion.div
              initial={false}
              animate={{
                opacity: isVisible ? 1 : 0,
                y: isVisible ? 0 : DESKTOP_CLOSE_Y,
                scale: isVisible ? 1 : 0.985,
              }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-[30px] border border-zinc-800 bg-black shadow-[0_30px_90px_rgba(0,0,0,.75)]"
            >
              <div className="relative flex items-start justify-between gap-4 border-b border-zinc-800 bg-black px-6 py-5">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-zinc-800 bg-zinc-900">
                    <Edit3 className="h-6 w-6 text-white" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="break-words text-xl font-bold tracking-tight text-white">
                      Επεξεργασία ανάρτησης
                    </h3>
                    <p className="mt-1 break-words text-sm text-zinc-400">
                      Φτίαξε την αναρτήση σου όπως εσυ θέλεις                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={requestClose}
                  className="shrink-0 text-white transition hover:opacity-70"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {renderForm({ mobile: false })}

              <div className="border-t border-zinc-800 bg-black px-6 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-zinc-500">
                    {hasChanges
                      ? "Έχεις μη αποθηκευμένες αλλαγές."
                      : "Δεν υπάρχουν αλλαγές ακόμα."}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleReset}
                      disabled={saving || !hasChanges}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-white transition hover:bg-zinc-800 disabled:opacity-50"
                    >
                      Επαναφορά
                    </button>

                    <button
                      type="button"
                      onClick={requestClose}
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-white transition hover:bg-zinc-800 disabled:opacity-50"
                    >
                      Ακύρωση
                    </button>

                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving || !hasChanges}
                      className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 font-semibold text-black transition hover:bg-zinc-100 disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Αποθήκευση...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Αποθήκευση αλλαγών
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <div
            className={cn(
              "fixed inset-0 z-[80] sm:hidden",
              isVisible ? "pointer-events-auto" : "pointer-events-none",
            )}
          >
            <motion.button
              type="button"
              aria-label="close overlay"
              onClick={requestClose}
              initial={false}
              animate={{ opacity: isVisible ? 1 : 0 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className={cn(
                "absolute inset-0 bg-black/88",
                isVisible ? "pointer-events-auto" : "pointer-events-none",
              )}
            />

            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center">
              <motion.div
                initial={false}
                animate={{
                  opacity: isVisible ? 1 : 0,
                  y: isVisible ? mobileDragY : mobileCloseY,
                }}
                transition={
                  mobileDragging
                    ? { duration: 0 }
                    : { duration: 0.32, ease: [0.22, 1, 0.36, 1] }
                }
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "pointer-events-auto flex w-full flex-col overflow-hidden border border-zinc-900 bg-black shadow-[0_-30px_80px_rgba(0,0,0,.9)]",
                  mobileMode === "full" ? "rounded-t-[24px]" : "rounded-t-[30px]",
                  mobileDragging
                    ? "transition-none"
                    : "transition-[height,border-radius] duration-300 ease-out",
                )}
                style={{
                  height:
                    mobileMode === "full" ? MOBILE_FULL_HEIGHT : MOBILE_MID_HEIGHT,
                }}
              >
                <div
                  className="touch-none select-none bg-black pb-1 pt-2"
                  onTouchStart={handleDragTouchStart}
                  onTouchMove={handleDragTouchMove}
                  onTouchEnd={handleDragTouchEnd}
                  onTouchCancel={handleDragTouchEnd}
                >
                  <div className="flex justify-center">
                    <div className="h-1.5 w-12 rounded-full bg-zinc-700/90" />
                  </div>
                </div>

                <div
                  className="touch-none select-none border-b border-zinc-800 bg-black px-4 pb-4 pt-3"
                  onTouchStart={handleDragTouchStart}
                  onTouchMove={handleDragTouchMove}
                  onTouchEnd={handleDragTouchEnd}
                  onTouchCancel={handleDragTouchEnd}
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-zinc-800 bg-zinc-900">
                      <Edit3 className="h-5 w-5 text-white" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-[17px] font-semibold leading-tight text-white">
                        Επεξεργασία ανάρτησης
                      </h3>
                      <div className="mt-1 text-sm leading-snug text-zinc-400">
                        Φτίαξε την αναρτήση σου όπως εσυ θέλεις
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={requestClose}
                      className="shrink-0 text-white transition hover:opacity-70"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                {renderForm({ mobile: true })}

                <div className="border-t border-zinc-800 bg-black px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
                  <div className="flex flex-col gap-3">
                    <div className="text-sm text-white/70">
                      {hasChanges
                        ? "Έχεις μη αποθηκευμένες αλλαγές."
                        : "Δεν υπάρχουν αλλαγές ακόμα."}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={handleReset}
                        disabled={saving || !hasChanges}
                        className="h-12 rounded-2xl border border-zinc-800 bg-zinc-900 text-white transition hover:bg-zinc-800 disabled:opacity-50"
                      >
                        Reset
                      </button>

                      <button
                        type="button"
                        onClick={requestClose}
                        disabled={saving}
                        className="h-12 rounded-2xl border border-zinc-800 bg-zinc-900 text-white transition hover:bg-zinc-800 disabled:opacity-50"
                      >
                        Κλείσιμο
                      </button>

                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                        className="h-12 rounded-2xl bg-white font-semibold text-black transition hover:bg-zinc-100 disabled:opacity-50"
                      >
                        <span className="inline-flex items-center justify-center gap-2">
                          {saving ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Save
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4" />
                              Save
                            </>
                          )}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  )

  return createPortal(modalNode, document.body)
}