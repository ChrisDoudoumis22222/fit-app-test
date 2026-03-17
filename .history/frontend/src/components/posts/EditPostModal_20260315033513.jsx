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
  Trash2,
} from "lucide-react"

const MAX_BYTES = 1_024_000 // 1 MB
const MOBILE_MID_HEIGHT = "88dvh"
const CLOSE_MS = 280
const DESKTOP_CLOSE_Y = 48
const MOBILE_CLOSE_Y_FALLBACK = 760

const cn = (...classes) => classes.filter(Boolean).join(" ")

const arraysEqual = (a = [], b = []) =>
  a.length === b.length && a.every((v, i) => v === b[i])

const formatBytes = (bytes = 0) => {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

const Field = ({ label, textarea = false, value, onChange, dirty = false }) => (
  <div className={cn("space-y-2", dirty && "ring-1 ring-white/10 rounded-2xl p-2")}>
    <label className="block text-sm font-medium text-zinc-300">{label}</label>

    {textarea ? (
      <textarea
        className="w-full h-32 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none focus:border-zinc-600 transition-all duration-200"
        placeholder={`Εισάγετε ${label.toLowerCase()}...`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    ) : (
      <input
        className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-all duration-200"
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
    className="group relative aspect-square overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800"
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
        "absolute left-2 top-2 rounded-xl px-2 py-1 text-[11px] font-medium border",
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
      className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/80 border border-white/10 text-white transition hover:bg-red-600 active:scale-95 sm:h-8 sm:w-8"
      aria-label={`Διαγραφή εικόνας ${index}`}
    >
      <X className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
    </button>

    <div className="pointer-events-none absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
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

  const fileInputRef = useRef(null)
  const origRef = useRef({ title: "", description: "", images: [] })
  const closeTimerRef = useRef(null)
  const newThumbsRef = useRef([])

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
        "flex-1 overflow-y-auto",
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

        <div className={cn("space-y-4", imagesDirty && "ring-1 ring-white/10 rounded-2xl p-2")}>
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
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white transition hover:bg-zinc-800 shrink-0"
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
              <ImageIcon className="h-10 w-10 mx-auto mb-2 text-zinc-600" />
              <p>Δεν υπάρχουν εικόνες. Πρόσθεσε τουλάχιστον μία.</p>
            </div>
          )}

          {!!editImages.length && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-zinc-400">Υπάρχουσες εικόνες</h4>
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
              "hidden sm:flex fixed inset-0 z-[80] items-center justify-center p-4",
              isVisible ? "pointer-events-auto" : "pointer-events-none",
            )}
          >
            <motion.button
              type="button"
              aria-label="close overlay"
              onClick={requestClose}
              initial={false}
              animate={{ opacity: isVisible ? 1 : 0 }}
              transition={{ duration: 0.22 }}
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
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-5xl max-h-[88vh] overflow-hidden rounded-[30px] border border-zinc-800 bg-black shadow-[0_30px_90px_rgba(0,0,0,.75)] flex flex-col"
            >
              <div className="relative flex items-start justify-between gap-4 border-b border-zinc-800 px-6 py-5 bg-black">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-zinc-900 border border-zinc-800 shrink-0">
                    <Edit3 className="h-6 w-6 text-white" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-xl font-bold text-white tracking-tight break-words">
                      Επεξεργασία ανάρτησης
                    </h3>
                    <p className="mt-1 text-sm text-zinc-400 break-words">
                      Άλλαξε τίτλο, περιγραφή και εικόνες του post σου
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={requestClose}
                  className="text-white hover:opacity-70 transition shrink-0"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {renderForm({ mobile: false })}

              <div className="border-t border-zinc-800 px-6 py-4 bg-black">
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
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl border border-zinc-800 bg-zinc-900 text-white transition hover:bg-zinc-800 disabled:opacity-50"
                    >
                      Επαναφορά
                    </button>

                    <button
                      type="button"
                      onClick={requestClose}
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl border border-zinc-800 bg-zinc-900 text-white transition hover:bg-zinc-800 disabled:opacity-50"
                    >
                      Ακύρωση
                    </button>

                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving || !hasChanges}
                      className="inline-flex items-center justify-center gap-2 min-w-[180px] px-4 py-2 rounded-2xl bg-white text-black font-semibold transition hover:bg-zinc-100 disabled:opacity-50"
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
              transition={{ duration: 0.22 }}
              className={cn(
                "absolute inset-0 bg-black/88",
                isVisible ? "pointer-events-auto" : "pointer-events-none",
              )}
            />

            <div className="absolute inset-x-0 bottom-0 flex justify-center pointer-events-none">
              <motion.div
                initial={false}
                animate={{
                  opacity: isVisible ? 1 : 0,
                  y: isVisible ? 0 : MOBILE_CLOSE_Y_FALLBACK,
                }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full border border-zinc-900 bg-black rounded-t-[30px] shadow-[0_-30px_80px_rgba(0,0,0,.9)] flex flex-col pointer-events-auto overflow-hidden"
                style={{ height: MOBILE_MID_HEIGHT }}
              >
                <div className="flex justify-center bg-black pt-2 pb-1">
                  <div className="h-1.5 w-12 rounded-full bg-zinc-700/90" />
                </div>

                <div className="border-b border-zinc-800 bg-black px-4 pt-3 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-zinc-900 border border-zinc-800">
                      <Edit3 className="h-5 w-5 text-white" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-[17px] font-semibold leading-tight text-white">
                        Επεξεργασία ανάρτησης
                      </h3>
                      <div className="mt-1 text-sm text-zinc-400 leading-snug">
                        Άλλαξε το περιεχόμενο και αποθήκευσέ το
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={requestClose}
                      className="text-white hover:opacity-70 transition shrink-0"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                {renderForm({ mobile: true })}

                <div className="border-t border-zinc-800 bg-black px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
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
                        Επαναφορά
                      </button>

                      <button
                        type="button"
                        onClick={requestClose}
                        disabled={saving}
                        className="h-12 rounded-2xl border border-zinc-800 bg-zinc-900 text-white transition hover:bg-zinc-800 disabled:opacity-50"
                      >
                        Ακύρωση
                      </button>

                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                        className="h-12 rounded-2xl bg-white text-black font-semibold transition hover:bg-zinc-100 disabled:opacity-50"
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