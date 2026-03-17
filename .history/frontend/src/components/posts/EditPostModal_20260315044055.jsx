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
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"

const MAX_BYTES = 1_024_000 // 1 MB

const MOBILE_MID_HEIGHT = "68dvh"
const MOBILE_FULL_HEIGHT = "96dvh"
const CLOSE_MS = 340

const DESKTOP_CLOSE_Y = 56
const MOBILE_CLOSE_Y_FALLBACK = 760

const QUALITY_STEPS = [0.94, 0.9, 0.86, 0.82, 0.78, 0.74, 0.7, 0.66, 0.62]
const MAX_EDGE_STEPS = [2560, 2200, 1920, 1680, 1440, 1280]

const cn = (...classes) => classes.filter(Boolean).join(" ")

const arraysEqual = (a = [], b = []) =>
  a.length === b.length && a.every((v, i) => v === b[i])

const isInteractiveTarget = (target) => {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest(
      'button, a, input, textarea, select, option, label, [role="button"]',
    ),
  )
}

const renameWithExtension = (name = "image", ext = "jpg") => {
  const base = name.replace(/\.[^/.]+$/, "")
  return `${base}.${ext}`
}

const loadImageSource = async (file) => {
  const safeBitmap =
    typeof window !== "undefined" &&
    "createImageBitmap" in window &&
    !/image\/gif|image\/svg\+xml/i.test(file.type)

  if (safeBitmap) {
    const bitmap = await createImageBitmap(file)
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (ctx, width, height) => ctx.drawImage(bitmap, 0, 0, width, height),
      cleanup: () => {
        try {
          bitmap.close?.()
        } catch {}
      },
    }
  }

  const objectUrl = URL.createObjectURL(file)

  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = reject
      el.decoding = "async"
      el.src = objectUrl
    })

    return {
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      draw: (ctx, width, height) => ctx.drawImage(img, 0, 0, width, height),
      cleanup: () => {
        try {
          URL.revokeObjectURL(objectUrl)
        } catch {}
      },
    }
  } catch (err) {
    try {
      URL.revokeObjectURL(objectUrl)
    } catch {}
    throw err
  }
}

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error("Failed to create image blob"))
      },
      type,
      quality,
    )
  })

const compressImageSmart = async (file, maxBytes = MAX_BYTES) => {
  if (!(file instanceof File)) return file
  if (!file.type.startsWith("image/")) return file
  if (/image\/gif|image\/svg\+xml/i.test(file.type)) return file
  if (file.size <= maxBytes) return file

  const source = await loadImageSource(file)

  try {
    const originalWidth = source.width || 1
    const originalHeight = source.height || 1
    const longestEdge = Math.max(originalWidth, originalHeight)

    const dimensionSteps = [
      longestEdge,
      ...MAX_EDGE_STEPS.filter((v) => v < longestEdge),
    ]

    const outputType =
      file.type === "image/png" || file.type === "image/webp"
        ? "image/webp"
        : "image/jpeg"

    const outputExt = outputType === "image/webp" ? "webp" : "jpg"

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d", { alpha: outputType === "image/webp" })

    if (!ctx) return file

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"

    let bestBlob = null

    for (const maxEdge of dimensionSteps) {
      const scale = Math.min(1, maxEdge / longestEdge)
      const width = Math.max(1, Math.round(originalWidth * scale))
      const height = Math.max(1, Math.round(originalHeight * scale))

      canvas.width = width
      canvas.height = height
      ctx.clearRect(0, 0, width, height)
      source.draw(ctx, width, height)

      for (const quality of QUALITY_STEPS) {
        const blob = await canvasToBlob(canvas, outputType, quality)

        if (!bestBlob || blob.size < bestBlob.size) {
          bestBlob = blob
        }

        if (blob.size <= maxBytes) {
          return new File([blob], renameWithExtension(file.name, outputExt), {
            type: outputType,
            lastModified: Date.now(),
          })
        }
      }
    }

    if (bestBlob && bestBlob.size < file.size) {
      return new File([bestBlob], renameWithExtension(file.name, outputExt), {
        type: outputType,
        lastModified: Date.now(),
      })
    }

    return file
  } finally {
    source.cleanup?.()
  }
}

const Field = ({ label, textarea = false, value, onChange, dirty = false }) => (
  <div
    className={cn(
      "space-y-2",
      dirty && "rounded-2xl p-2 ring-1 ring-white/10",
    )}
  >
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

const EditImageThumb = ({ src, index, onRemove, type }) => {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    setLoaded(false)
    setErrored(false)
  }, [src])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03 }}
      className="group relative aspect-square overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900"
    >
      {!loaded && !errored && (
        <div className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,rgba(39,39,42,0.95),rgba(63,63,70,0.9),rgba(39,39,42,0.95))] bg-[length:200%_100%]" />
      )}

      <img
        src={src || "/placeholder.svg"}
        alt={`Εικόνα ${index}`}
        className={cn(
          "h-full w-full object-cover transition-all duration-300 group-hover:scale-105",
          loaded ? "opacity-100" : "opacity-0",
        )}
        loading="lazy"
        decoding="async"
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setErrored(true)
          setLoaded(true)
        }}
      />

      {errored && (
        <div className="absolute inset-0 grid place-items-center bg-zinc-950 text-zinc-500">
          <ImageIcon className="h-7 w-7" />
        </div>
      )}

      <div
        className={cn(
          "absolute left-2 top-2 rounded-xl border px-2 py-1 text-[11px] font-medium backdrop-blur-sm",
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
        className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/75 text-white backdrop-blur-sm transition hover:bg-red-600 active:scale-95 sm:h-8 sm:w-8"
        aria-label={`Διαγραφή εικόνας ${index}`}
      >
        <X className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
      </button>

      <div className="pointer-events-none absolute inset-0 bg-black/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
    </motion.div>
  )
}

const ResultStatusCard = ({ result, onPrimary, onSecondary }) => {
  if (!result) return null

  const tone =
    result.type === "success"
      ? "success"
      : result.type === "decline"
        ? "decline"
        : "error"

  const isSuccess = tone === "success"
  const isDecline = tone === "decline"

  const badgeLabel = isSuccess
    ? "SUCCESS"
    : isDecline
      ? "DECLINED"
      : "ERROR"

  const glowClass = isSuccess
    ? "bg-emerald-400"
    : isDecline
      ? "bg-amber-400"
      : "bg-rose-500"

  const ringClassOuter = isSuccess
    ? "border-emerald-400/20 bg-emerald-500/8"
    : isDecline
      ? "border-amber-400/20 bg-amber-500/8"
      : "border-rose-400/20 bg-rose-500/8"

  const ringClassMid = isSuccess
    ? "border-emerald-400/25 bg-emerald-500/8"
    : isDecline
      ? "border-amber-400/25 bg-amber-500/8"
      : "border-rose-400/25 bg-rose-500/8"

  const ringClassInner = isSuccess
    ? "border-emerald-300/30 bg-emerald-500/10"
    : isDecline
      ? "border-amber-300/30 bg-amber-500/10"
      : "border-rose-300/30 bg-rose-500/10"

  const iconWrapClass = isSuccess
    ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-300"
    : isDecline
      ? "border-amber-300/40 bg-amber-400/10 text-amber-300"
      : "border-rose-300/40 bg-rose-400/10 text-rose-300"

  const badgeClass = isSuccess
    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
    : isDecline
      ? "border-amber-400/20 bg-amber-500/10 text-amber-300"
      : "border-rose-400/20 bg-rose-500/10 text-rose-300"

  const backgroundClass = isSuccess
    ? "bg-[radial-gradient(circle_at_top,rgba(16,42,36,0.45),transparent_38%),linear-gradient(180deg,rgba(12,13,18,0.98),rgba(8,9,12,0.98))]"
    : isDecline
      ? "bg-[radial-gradient(circle_at_top,rgba(66,48,16,0.42),transparent_38%),linear-gradient(180deg,rgba(12,13,18,0.98),rgba(8,9,12,0.98))]"
      : "bg-[radial-gradient(circle_at_top,rgba(66,16,16,0.38),transparent_38%),linear-gradient(180deg,rgba(12,13,18,0.98),rgba(8,9,12,0.98))]"

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[140] flex items-end justify-center p-3 sm:items-center sm:p-6"
      >
        <motion.button
          type="button"
          aria-label="close result"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onSecondary}
          className="absolute inset-0 bg-black/60 backdrop-blur-[8px]"
        />

        <motion.div
          initial={{ opacity: 0, y: 44, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.985 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[390px]"
        >
          <div
            className={cn(
              "relative overflow-hidden rounded-[30px] px-5 pb-5 pt-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:px-6 sm:pb-6 sm:pt-7",
              backgroundClass,
            )}
          >
            <div
              className={cn(
                "pointer-events-none absolute left-1/2 top-5 h-36 w-36 -translate-x-1/2 rounded-full blur-3xl opacity-20",
                glowClass,
              )}
            />

            <div className="relative flex flex-col items-center text-center">
              <div className="relative mb-5 mt-1 flex h-[116px] w-[116px] items-center justify-center sm:h-[124px] sm:w-[124px]">
                <div
                  className={cn("absolute inset-0 rounded-full border", ringClassOuter)}
                />
                <div
                  className={cn(
                    "absolute inset-[18px] rounded-full border",
                    ringClassMid,
                  )}
                />
                <div
                  className={cn(
                    "absolute inset-[36px] rounded-full border backdrop-blur-sm",
                    ringClassInner,
                  )}
                />
                <div
                  className={cn(
                    "relative grid h-10 w-10 place-items-center rounded-full border shadow-[0_8px_22px_rgba(0,0,0,0.28)] sm:h-11 sm:w-11",
                    iconWrapClass,
                  )}
                >
                  {isSuccess ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5" />
                  )}
                </div>
              </div>

              <div
                className={cn(
                  "mb-5 inline-flex h-8 items-center rounded-full border px-4 text-[12px] font-bold tracking-[0.18em]",
                  badgeClass,
                )}
              >
                {badgeLabel}
              </div>

              <h3 className="text-[19px] font-extrabold tracking-tight text-white sm:text-[22px]">
                {result.title}
              </h3>

              <p className="mt-3 max-w-[300px] text-[15px] leading-7 text-zinc-300 sm:max-w-[315px]">
                {result.message}
              </p>

              <button
                type="button"
                onClick={onPrimary}
                className="mt-7 h-12 w-full rounded-[18px] bg-white px-4 text-[15px] font-semibold text-black transition hover:bg-zinc-100 active:scale-[0.99]"
              >
                {result.primaryLabel || (isSuccess ? "Τέλεια" : "Εντάξει")}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

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
  const [processingImages, setProcessingImages] = useState(false)
  const [resultState, setResultState] = useState(null)

  const [mobileMode, setMobileMode] = useState("mid")
  const [mobileDragY, setMobileDragY] = useState(0)
  const [mobileDragging, setMobileDragging] = useState(false)

  const fileInputRef = useRef(null)
  const origRef = useRef({ title: "", description: "", images: [] })
  const closeTimerRef = useRef(null)
  const newThumbsRef = useRef([])
  const suppressOpenSyncRef = useRef(false)
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
    setProcessingImages(false)
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
      setProcessingImages(false)
      setMobileMode("mid")
      setMobileDragY(0)
      setMobileDragging(false)
    }
  }, [post, open, revokeUrls])

  useEffect(() => {
    if (!mounted) return

    if (open) {
      if (suppressOpenSyncRef.current) return
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      setShouldRender(true)
      requestAnimationFrame(() => setIsVisible(true))
    } else {
      suppressOpenSyncRef.current = false
      if (shouldRender) {
        setIsVisible(false)
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
        closeTimerRef.current = setTimeout(() => {
          setShouldRender(false)
          resetDraft()
        }, CLOSE_MS)
      }
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
    if (saving || processingImages) return
    suppressOpenSyncRef.current = true
    setIsVisible(false)

    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      setShouldRender(false)
      resetDraft()
      onClose?.()
    }, CLOSE_MS)
  }, [saving, processingImages, resetDraft, onClose])

  const closeThenShowResult = useCallback(
    (result) => {
      suppressOpenSyncRef.current = true
      setIsVisible(false)

      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      closeTimerRef.current = setTimeout(() => {
        setShouldRender(false)
        resetDraft()
        onClose?.()
        setResultState(result)
      }, CLOSE_MS)
    },
    [resetDraft, onClose],
  )

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

  const addNewFiles = useCallback(async (fileList) => {
    const incoming = Array.from(fileList || []).filter((f) =>
      f?.type?.startsWith("image/"),
    )
    if (!incoming.length) return

    setProcessingImages(true)

    try {
      const compressedFiles = []
      const compressedUrls = []

      for (const file of incoming) {
        const finalFile = await compressImageSmart(file, MAX_BYTES)
        compressedFiles.push(finalFile)
        compressedUrls.push(URL.createObjectURL(finalFile))
      }

      if (!compressedFiles.length) return

      setNewFiles((prev) => [...prev, ...compressedFiles])
      setNewThumbs((prev) => [...prev, ...compressedUrls])
    } finally {
      setProcessingImages(false)
    }
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
    if (!editTitle.trim()) {
      setResultState({
        type: "error",
        title: "Λείπει τίτλος",
        message: "Συμπλήρωσε τίτλο για να συνεχίσεις.",
        primaryLabel: "Εντάξει",
      })
      return
    }

    if (!editDesc.trim()) {
      setResultState({
        type: "error",
        title: "Λείπει περιγραφή",
        message: "Συμπλήρωσε περιγραφή για να συνεχίσεις.",
        primaryLabel: "Εντάξει",
      })
      return
    }

    if (processingImages) return

    const totalImages = editImages.length + newThumbs.length
    if (totalImages === 0) {
      setResultState({
        type: "error",
        title: "Λείπουν εικόνες",
        message: "Πρόσθεσε τουλάχιστον μία εικόνα για να αποθηκευτούν οι αλλαγές.",
        primaryLabel: "Εντάξει",
      })
      return
    }

    setSaving(true)

    try {
      await onSave({
        title: editTitle,
        description: editDesc,
        existingImages: editImages,
        newFiles,
      })

      closeThenShowResult({
        type: "success",
        title: "Αποθηκεύτηκε!",
        message:
          "Οι αλλαγές στην ανάρτησή σου αποθηκεύτηκαν με επιτυχία και είναι πλέον διαθέσιμες στο προφίλ σου.",
        primaryLabel: "Τέλεια",
      })
    } catch {
      setResultState({
        type: "error",
        title: "Η αποθήκευση απέτυχε",
        message: "Δεν καταφέραμε να αποθηκεύσουμε τις αλλαγές αυτή τη στιγμή.",
        primaryLabel: "Εντάξει",
      })
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
    setProcessingImages(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  if (!mounted) return null
  if (!shouldRender && !resultState) return null
  if (!post && !resultState) return null

  const totalImages = editImages.length + newThumbs.length

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

        <div
          className={cn(
            "space-y-4",
            imagesDirty && "rounded-2xl p-2 ring-1 ring-white/10",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-zinc-300">
                Εικόνες ({totalImages})
              </label>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={processingImages}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white transition hover:bg-zinc-800 disabled:opacity-50"
            >
              {processingImages ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Προσθήκη
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={async (e) => {
              await addNewFiles(e.target.files)
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
    <>
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
                  "absolute inset-0 bg-black/55 backdrop-blur-md",
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
                className="relative flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-[30px] border border-zinc-800/90 bg-black/95 shadow-[0_30px_90px_rgba(0,0,0,.75)] backdrop-blur-xl"
              >
                <div className="relative flex items-start justify-between gap-4 border-b border-zinc-800 bg-black/90 px-6 py-5 backdrop-blur-xl">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-zinc-800 bg-zinc-900/95">
                      <Edit3 className="h-6 w-6 text-white" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="break-words text-xl font-bold tracking-tight text-white">
                        Επεξεργασία ανάρτησης
                      </h3>
                      <p className="mt-1 break-words text-sm text-zinc-400">
                        Φτιάξε την ανάρτησή σου όπως εσύ θέλεις
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={requestClose}
                    disabled={saving || processingImages}
                    className="shrink-0 text-white transition hover:opacity-70 disabled:opacity-40"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {renderForm({ mobile: false })}

                <div className="border-t border-zinc-800 bg-black/90 px-6 py-4 backdrop-blur-xl">
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
                        disabled={saving || processingImages || !hasChanges}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-white transition hover:bg-zinc-800 disabled:opacity-50"
                      >
                        Επαναφορά
                      </button>

                      <button
                        type="button"
                        onClick={requestClose}
                        disabled={saving || processingImages}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-white transition hover:bg-zinc-800 disabled:opacity-50"
                      >
                        Ακύρωση
                      </button>

                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || processingImages || !hasChanges}
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
                  "absolute inset-0 bg-black/58 backdrop-blur-md",
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
                    "pointer-events-auto flex w-full flex-col overflow-hidden border border-zinc-900/90 bg-black/95 shadow-[0_-30px_80px_rgba(0,0,0,.9)] backdrop-blur-xl",
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
                    className="touch-none select-none bg-black/90 pb-1 pt-2 backdrop-blur-xl"
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
                    className="touch-none select-none border-b border-zinc-800 bg-black/90 px-4 pb-4 pt-3 backdrop-blur-xl"
                    onTouchStart={handleDragTouchStart}
                    onTouchMove={handleDragTouchMove}
                    onTouchEnd={handleDragTouchEnd}
                    onTouchCancel={handleDragTouchEnd}
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-zinc-800 bg-zinc-900/95">
                        <Edit3 className="h-5 w-5 text-white" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-[17px] font-semibold leading-tight text-white">
                          Επεξεργασία ανάρτησης
                        </h3>
                        <div className="mt-1 text-sm leading-snug text-zinc-400">
                          Φτιάξε την ανάρτησή σου όπως εσύ θέλεις
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={requestClose}
                        disabled={saving || processingImages}
                        className="shrink-0 text-white transition hover:opacity-70 disabled:opacity-40"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>
                  </div>

                  {renderForm({ mobile: true })}

                  <div className="border-t border-zinc-800 bg-black/90 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur-xl">
                    <div className="flex flex-col gap-3">
                      <div className="text-sm text-white/70">
                        {hasChanges
                          ? "Έχεις μη αποθηκευμένες αλλαγές."
                          : "Δεν υπάρχουν αλλαγές ακόμα."}
                      </div>

<div className="flex flex-col gap-2">
  {/* SAVE BUTTON (TOP) */}
  <button
    type="button"
    onClick={handleSave}
    disabled={saving || processingImages || !hasChanges}
    className="h-12 w-full rounded-2xl bg-white font-semibold text-black transition hover:bg-zinc-100 disabled:opacity-50"
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

  {/* SECOND ROW */}
  <div className="grid grid-cols-2 gap-2">
    <button
      type="button"
      onClick={handleReset}
      disabled={saving || processingImages || !hasChanges}
      className="h-12 rounded-2xl border border-zinc-800 bg-zinc-900 text-white transition hover:bg-zinc-800 disabled:opacity-50"
    >
      Reset
    </button>

    <button
      type="button"
      onClick={requestClose}
      disabled={saving || processingImages}
      className="h-12 rounded-2xl border border-zinc-800 bg-zinc-900 text-white transition hover:bg-zinc-800 disabled:opacity-50"
    >
      Κλείσιμο
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

      {!!resultState && !shouldRender && (
        <ResultStatusCard
          result={resultState}
          onPrimary={() => setResultState(null)}
          onSecondary={() => setResultState(null)}
        />
      )}
    </>
  )

  return createPortal(modalNode, document.body)
}