"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Camera,
  Upload,
  X,
  Eye,
  ImageIcon,
  Layers,
  Save,
  Loader2,
} from "lucide-react"
import { supabase } from "../../supabaseClient"
import PostPreviewModal from "../PostPreviewModal"

const MAX_BYTES = 2 * 1024 * 1024 // 2MB raw file limit
const TARGET_UPLOAD_BYTES = 900 * 1024 // compressed upload target before upload
const MAX_COMPRESS_DIMENSIONS = [1800, 1500, 1280]
const QUALITY_STEPS = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5]

const MOBILE_MID_HEIGHT = "68dvh"
const MOBILE_FULL_HEIGHT = "96dvh"
const CLOSE_MS = 320

const cn = (...classes) => classes.filter(Boolean).join(" ")

const formatBytes = (bytes = 0) => {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

const getMimeExt = (mime = "") => {
  if (mime === "image/webp") return "webp"
  if (mime === "image/png") return "png"
  if (mime === "image/jpeg") return "jpg"
  return "jpg"
}

const readFileAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })

async function compressImageForUpload(file) {
  try {
    if (!file?.type?.startsWith("image/")) return file
    if (file.type === "image/svg+xml" || file.type === "image/gif") return file

    const dataUrl = await readFileAsDataURL(file)
    const image = await loadImage(dataUrl)

    const originalWidth = image.naturalWidth || image.width
    const originalHeight = image.naturalHeight || image.height

    if (!originalWidth || !originalHeight) return file

    let bestBlob = null
    let bestType = "image/webp"

    for (const maxDim of MAX_COMPRESS_DIMENSIONS) {
      const scale = Math.min(1, maxDim / Math.max(originalWidth, originalHeight))
      const width = Math.max(1, Math.round(originalWidth * scale))
      const height = Math.max(1, Math.round(originalHeight * scale))

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext("2d", { alpha: true })
      if (!ctx) return file

      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(image, 0, 0, width, height)

      for (const quality of QUALITY_STEPS) {
        const blob = await canvasToBlob(canvas, "image/webp", quality)
        if (!blob) continue

        if (!bestBlob || blob.size < bestBlob.size) {
          bestBlob = blob
          bestType = "image/webp"
        }

        if (blob.size <= TARGET_UPLOAD_BYTES) {
          const compressedName = `${file.name.replace(/\.[^.]+$/, "")}.${getMimeExt(
            "image/webp",
          )}`

          return new File([blob], compressedName, {
            type: "image/webp",
            lastModified: Date.now(),
          })
        }
      }
    }

    if (!bestBlob) return file
    if (bestBlob.size >= file.size) return file

    const compressedName = `${file.name.replace(/\.[^.]+$/, "")}.${getMimeExt(
      bestType,
    )}`

    return new File([bestBlob], compressedName, {
      type: bestType,
      lastModified: Date.now(),
    })
  } catch {
    return file
  }
}

const Field = ({ label, textarea = false, value, onChange }) => (
  <div className="relative">
    {textarea ? (
      <textarea
        className="w-full h-32 px-4 py-3 bg-zinc-900/60 border border-white/10 rounded-2xl text-zinc-100 placeholder-zinc-400 resize-none focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all duration-200 backdrop-blur-xl"
        placeholder={`Εισάγετε ${label.toLowerCase()}...`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    ) : (
      <input
        className="w-full px-4 py-3 bg-zinc-900/60 border border-white/10 rounded-2xl text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all duration-200 backdrop-blur-xl"
        placeholder={`Εισάγετε ${label.toLowerCase()}...`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )}

    <label className="absolute -top-2 left-3 px-2 bg-black/70 text-xs font-medium text-zinc-400 backdrop-blur-sm rounded">
      {label}
    </label>
  </div>
)

const Thumb = ({ src, index, total, onRemove }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.94 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: index * 0.04 }}
    className="group relative aspect-square overflow-hidden rounded-xl bg-zinc-900 border border-white/10"
  >
    <img
      src={src || "/placeholder.svg"}
      alt={`Εικόνα ${index}`}
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
    />

    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded-md text-xs text-white font-medium backdrop-blur-sm">
      {index}/{total}
    </div>

    <button
      type="button"
      onClick={onRemove}
      className="absolute right-2 top-2 p-1.5 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600"
    >
      <X className="h-3 w-3" />
    </button>

    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
  </motion.div>
)

export default function CreatePostModal({
  open,
  onClose,
  uid,
  onCreated,
  onError,
  onSuccess,
}) {
  const [mounted, setMounted] = useState(false)

  const [shouldRender, setShouldRender] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [files, setFiles] = useState([])
  const [thumbs, setThumbs] = useState([])
  const [busy, setBusy] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [sizeToast, setSizeToast] = useState({ open: false, message: "" })

  const [mobileMode, setMobileMode] = useState("mid")
  const [mobileDragY, setMobileDragY] = useState(0)
  const [mobileDragging, setMobileDragging] = useState(false)

  const fileInputRef = useRef(null)
  const toastTimerRef = useRef(null)
  const closeTimerRef = useRef(null)
  const dragRef = useRef({
    startY: 0,
    deltaY: 0,
    startMode: "mid",
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  const resetStateAfterClose = useCallback(() => {
    setTitle("")
    setDesc("")
    setFiles([])
    setThumbs([])
    setPreviewOpen(false)
    setSizeToast({ open: false, message: "" })
    setMobileMode("mid")
    setMobileDragY(0)
    setMobileDragging(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [])

  useEffect(() => {
    if (!mounted) return

    if (open) {
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
        resetStateAfterClose()
      }, CLOSE_MS)
    }
  }, [open, mounted, shouldRender, resetStateAfterClose])

  useEffect(() => {
    if (!mounted || !shouldRender) return
    if (typeof window === "undefined") return

    const isMobile = window.matchMedia("(max-width: 639.98px)").matches
    if (!isMobile) return

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

  const showSizeToast = useCallback((message) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setSizeToast({ open: true, message })
    toastTimerRef.current = setTimeout(() => {
      setSizeToast({ open: false, message: "" })
    }, 2200)
  }, [])

  const requestClose = useCallback(() => {
    if (busy) return
    setIsVisible(false)

    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      setShouldRender(false)
      resetStateAfterClose()
      onClose?.()
    }, CLOSE_MS)
  }, [busy, onClose, resetStateAfterClose])

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
        setMobileDragY(Math.max(rawDelta, -180))
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

  const addFiles = useCallback(
    (fileList) => {
      const arr = Array.from(fileList || [])
      const ok = []
      const rejected = []
      const readers = []

      arr.forEach((f) => {
        if (f.size > MAX_BYTES) {
          rejected.push(f)
          return
        }
        if (!f.type.startsWith("image/")) {
          rejected.push(f)
          return
        }

        ok.push(f)
        readers.push(readFileAsDataURL(f))
      })

      if (rejected.length > 0) {
        onError?.({
          title: "Αρχεία απορρίφθηκαν",
          message:
            "Μερικά αρχεία δεν μπόρεσαν να προστεθούν επειδή είναι μεγαλύτερα από 2MB ή δεν είναι εικόνες.",
          rejectedFiles: rejected,
        })
      }

      if (ok.length > 0) {
        Promise.all(readers).then((urls) => {
          setFiles((prev) => {
            const next = [...prev, ...ok]
            const totalBytes = next.reduce((sum, file) => sum + (file?.size || 0), 0)
            showSizeToast(
              `Προστέθηκαν ${ok.length} εικόνες • Σύνολο: ${formatBytes(totalBytes)}`,
            )
            return next
          })
          setThumbs((prev) => [...prev, ...urls])
        })
      }
    },
    [onError, showSizeToast],
  )

  const removeThumb = useCallback((index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setThumbs((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const totalSelectedBytes = useMemo(
    () => files.reduce((sum, file) => sum + (file?.size || 0), 0),
    [files],
  )

  const previewPost = useMemo(
    () => ({
      id: "preview",
      title,
      description: desc,
      image_urls: thumbs,
      created_at: new Date().toISOString(),
    }),
    [title, desc, thumbs],
  )

  const isDirty = useMemo(
    () => Boolean(title.trim() || desc.trim() || thumbs.length),
    [title, desc, thumbs.length],
  )

  const handleCreate = useCallback(async () => {
    if (!uid) {
      onError?.({
        title: "Δεν βρέθηκε λογαριασμός",
        message: "Δεν βρέθηκε trainer session. Κάνε ανανέωση και δοκίμασε ξανά.",
        rejectedFiles: [],
      })
      return
    }

    if (!title.trim() || !desc.trim()) {
      onError?.({
        title: "Συμπληρώστε τα στοιχεία",
        message:
          "Παρακαλώ συμπληρώστε τον τίτλο και την περιγραφή της ανάρτησης.",
        rejectedFiles: [],
      })
      return
    }

    if (files.length === 0) {
      onError?.({
        title: "Προσθέστε εικόνες",
        message:
          "Παρακαλώ επιλέξτε τουλάχιστον μία εικόνα για την ανάρτησή σας.",
        rejectedFiles: [],
      })
      return
    }

    setBusy(true)

    try {
      const urls = []

      for (const originalFile of files) {
        const fileToUpload = await compressImageForUpload(originalFile)
        const ext = getMimeExt(fileToUpload.type || originalFile.type)
        const path = `${uid}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from("post-images")
          .upload(path, fileToUpload, {
            contentType: fileToUpload.type || originalFile.type,
            upsert: false,
          })

        if (uploadError) throw uploadError

        urls.push(
          supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl,
        )
      }

      const { data, error } = await supabase
        .from("posts")
        .insert({
          trainer_id: uid,
          title: title.trim(),
          description: desc.trim(),
          image_urls: urls,
          image_url: urls[0] || null,
        })
        .select("*")
        .single()

      if (error) throw error

      onCreated?.({ ...data, _animate: true })
      onSuccess?.({
        title: "Μπράβο! Επιτυχής ανάρτηση!",
        message: "Η ανάρτησή σου δημοσιεύτηκε με επιτυχία.",
      })

      requestClose()
    } catch {
      onError?.({
        title: "Σφάλμα δημοσίευσης",
        message:
          "Δεν ήταν δυνατή η δημοσίευση της ανάρτησης. Παρακαλώ δοκιμάστε ξανά.",
        rejectedFiles: [],
      })
    } finally {
      setBusy(false)
    }
  }, [uid, title, desc, files, onCreated, onError, onSuccess, requestClose])

  if (!mounted || !shouldRender) return null

  const renderForm = ({ mobile = false }) => (
    <div
      className={cn(
        "flex-1 overflow-y-auto",
        "qb-scroll",
        mobile ? "px-4 py-4" : "px-6 py-5",
      )}
    >
      <div className="space-y-6">
        <Field label="Τίτλος" value={title} onChange={setTitle} />

        <Field
          label="Περιγραφή"
          textarea
          value={desc}
          onChange={setDesc}
        />

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-zinc-300">
                Εικόνες
              </label>
              {!!files.length && (
                <p className="mt-1 text-xs text-zinc-500">
                  Σύνολο επιλεγμένων: {formatBytes(totalSelectedBytes)}
                </p>
              )}
            </div>

            {thumbs.length > 0 && (
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/20 text-white/90 hover:bg-white/10 transition shrink-0"
              >
                <Eye className="h-4 w-4" />
                Προεπισκόπηση
              </button>
            )}
          </div>

          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              addFiles(e.dataTransfer.files)
            }}
            className={cn(
              "group relative flex cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-white/10 transition-all duration-300 hover:border-white/30 hover:bg-white/5",
              mobile ? "h-44" : "h-48",
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                addFiles(e.target.files)
                e.target.value = ""
              }}
            />

            <div className="flex flex-col items-center text-zinc-400 group-hover:text-zinc-300 transition-colors text-center px-4">
              <div className="p-4 rounded-full bg-black/40 group-hover:bg-black/30 transition-colors mb-4 border border-white/10">
                <Upload className="h-8 w-8" />
              </div>

              <p className="text-base sm:text-lg font-medium mb-1">
                Σύρετε εικόνες εδώ ή κάντε κλικ για επιλογή
              </p>

              <p className="text-sm text-zinc-500">
                Υποστήριξη πολλαπλών εικόνων • Μέγιστο 2MB η κάθε μία
              </p>
            </div>
          </label>
        </div>

        {!!thumbs.length && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-medium text-zinc-100 flex items-center gap-2 min-w-0">
                <Layers className="h-5 w-5 text-blue-400 shrink-0" />
                <span className="truncate">
                  Επιλεγμένες εικόνες ({thumbs.length})
                </span>
              </h3>

              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/20 text-white/90 hover:bg-white/10 transition shrink-0"
              >
                <Eye className="h-4 w-4" />
                Προεπισκόπηση
              </button>
            </div>

            <div
              className={cn(
                "grid gap-4",
                mobile
                  ? "grid-cols-2"
                  : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
              )}
            >
              {thumbs.map((src, i) => (
                <Thumb
                  key={i}
                  src={src}
                  index={i + 1}
                  total={thumbs.length}
                  onRemove={() => removeThumb(i)}
                />
              ))}
            </div>
          </div>
        )}

        {!thumbs.length && (
          <div className="text-center py-4 text-zinc-400">
            <ImageIcon className="h-10 w-10 mx-auto mb-2 text-zinc-500" />
            <p>Δεν έχουν προστεθεί ακόμη εικόνες.</p>
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(
    <>
      <PostPreviewModal
        open={previewOpen}
        post={previewPost}
        onClose={() => setPreviewOpen(false)}
      />

      <AnimatePresence>
        {sizeToast.open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="fixed z-[95] left-1/2 -translate-x-1/2 top-4 sm:top-6 px-4 py-2.5 rounded-2xl border border-white/10 bg-black/80 text-white text-sm shadow-2xl backdrop-blur-xl"
          >
            {sizeToast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop */}
      <div className="hidden sm:flex fixed inset-0 z-[80] items-center justify-center p-4">
        <motion.button
          type="button"
          aria-label="close overlay"
          onClick={requestClose}
          initial={false}
          animate={{ opacity: isVisible ? 1 : 0 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
          className="absolute inset-0 bg-black/65 backdrop-blur-md"
        />

        <motion.div
          initial={false}
          animate={{
            opacity: isVisible ? 1 : 0,
            y: isVisible ? 0 : 18,
            scale: isVisible ? 1 : 0.97,
          }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-5xl max-h-[88vh] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/85 to-black/90 backdrop-blur-2xl shadow-2xl flex flex-col"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_30%)]" />

          <div className="relative flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/20 shrink-0">
                <Camera className="h-6 w-6" />
              </div>

              <div className="min-w-0">
                <h3 className="text-xl font-bold text-white tracking-tight break-words">
                  Δημιουργία νέας ανάρτησης
                </h3>
                <p className="text-sm text-zinc-300 mt-1 break-words">
                  Πρόσθεσε τίτλο, περιγραφή και εικόνες για το post σου
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {thumbs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-white/20 bg-black/40 text-white hover:bg-white/10 transition"
                >
                  <Eye className="h-4 w-4" />
                  Προεπισκόπηση
                </button>
              )}

              <button
                type="button"
                onClick={requestClose}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-white hover:bg-white/10 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {renderForm({ mobile: false })}

          <div className="relative border-t border-white/10 px-6 py-4 bg-black/45 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-zinc-400">
                {isDirty
                  ? "Έχεις μη αποθηκευμένες αλλαγές."
                  : "Συμπλήρωσε τα πεδία για να δημοσιεύσεις."}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={requestClose}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-white/90 border border-white/15 rounded-2xl bg-black/30 hover:bg-white/10 transition disabled:opacity-60"
                >
                  Ακύρωση
                </button>

                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-white text-black hover:bg-zinc-100 transition disabled:opacity-60 min-w-[180px]"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Δημοσίευση...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Δημοσίευση ανάρτησης
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Mobile */}
      <div className="fixed inset-0 z-[80] sm:hidden">
        <motion.button
          type="button"
          aria-label="close overlay"
          onClick={requestClose}
          initial={false}
          animate={{ opacity: isVisible ? 1 : 0 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
          className="absolute inset-0 bg-black/88"
        />

        <div className="absolute inset-x-0 bottom-0 flex justify-center pointer-events-none">
          <motion.div
            initial={false}
            animate={{
              opacity: isVisible ? 1 : 0,
              y: isVisible ? mobileDragY : 40,
            }}
            transition={
              mobileDragging
                ? { duration: 0 }
                : { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
            }
            className={cn(
              "w-full max-w-none border border-zinc-900 bg-black shadow-[0_-30px_80px_rgba(0,0,0,.9)] flex flex-col pointer-events-auto overflow-hidden",
              mobileMode === "full" ? "rounded-t-[24px]" : "rounded-t-[30px]",
              mobileDragging ? "transition-none" : "transition-[height,border-radius] duration-300 ease-out",
            )}
            style={{
              height: mobileMode === "full" ? MOBILE_FULL_HEIGHT : MOBILE_MID_HEIGHT,
            }}
          >
            <div
              className="flex justify-center bg-black pt-2 pb-1 touch-none select-none"
              onTouchStart={(e) => beginMobileDrag(e.touches[0].clientY)}
              onTouchMove={(e) => moveMobileDrag(e.touches[0].clientY)}
              onTouchEnd={endMobileDrag}
              onTouchCancel={endMobileDrag}
            >
              <div className="h-1.5 w-12 rounded-full bg-zinc-700/90" />
            </div>

            <div
              className="border-b border-zinc-800/90 bg-black px-4 pt-3 pb-4 touch-none select-none"
              onTouchStart={(e) => beginMobileDrag(e.touches[0].clientY)}
              onTouchMove={(e) => moveMobileDrag(e.touches[0].clientY)}
              onTouchEnd={endMobileDrag}
              onTouchCancel={endMobileDrag}
            >
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-zinc-900 ring-1 ring-zinc-800/90">
                  <Camera className="h-5 w-5 text-white" />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-[17px] font-semibold leading-tight text-white">
                    Νέα ανάρτηση
                  </h3>

                  <div className="mt-1 text-sm text-zinc-300 leading-snug">
                    Ανέβασε νέο περιεχόμενο για το κοινό σου
                  </div>
                </div>

                <button
                  type="button"
                  onClick={requestClose}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-white transition hover:bg-zinc-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {renderForm({ mobile: true })}

            <div className="border-t border-zinc-800/90 bg-black px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
              <div className="flex flex-col gap-3">
                <div className="text-sm text-white/75">
                  {isDirty
                    ? "Έχεις μη αποθηκευμένες αλλαγές."
                    : "Συμπλήρωσε τα πεδία για να δημοσιεύσεις."}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={requestClose}
                    disabled={busy}
                    className="h-12 rounded-2xl border border-zinc-800 bg-zinc-900 text-white transition hover:bg-zinc-800 disabled:opacity-60"
                  >
                    Ακύρωση
                  </button>

                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={busy}
                    className="h-12 rounded-2xl border border-white bg-white text-black transition hover:bg-zinc-100 disabled:opacity-60 font-semibold"
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      {busy ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Δημοσίευση...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Δημοσίευση
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
    </>,
    document.body,
  )
}