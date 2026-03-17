"use client"

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  lazy,
  Suspense,
} from "react"
import { createPortal } from "react-dom"
import { motion } from "framer-motion"
import {
  Camera,
  Upload,
  X,
  Eye,
  ImageIcon,
  Layers,
  Save,
  Loader2,
  Trash2,
  CheckCircle2,
} from "lucide-react"
import { supabase } from "../../supabaseClient"

const PostPreviewModal = lazy(() => import("./PostPreviewModal"))

const MAX_BYTES = 2 * 1024 * 1024 // 2MB raw file limit
const TARGET_UPLOAD_BYTES = 900 * 1024 // compressed upload target before upload
const MAX_COMPRESS_DIMENSIONS = [1800, 1500, 1280]
const QUALITY_STEPS = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5]

const MOBILE_MID_HEIGHT = "68dvh"
const MOBILE_FULL_HEIGHT = "96dvh"
const CLOSE_MS = 340

const DESKTOP_CLOSE_Y = 72
const MOBILE_CLOSE_Y_FALLBACK = 760

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

const isInteractiveTarget = (target) => {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest(
      'button, a, input, textarea, select, option, label, [role="button"]',
    ),
  )
}

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

    const tempUrl = URL.createObjectURL(file)

    try {
      const image = await loadImage(tempUrl)

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
    } finally {
      URL.revokeObjectURL(tempUrl)
    }
  } catch {
    return file
  }
}

const StepChip = ({ active, done, children }) => (
  <div
    className={cn(
      "rounded-2xl border px-3 py-2 text-xs font-medium transition-all duration-200",
      done
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
        : active
        ? "border-blue-400/35 bg-blue-500/10 text-blue-200 ring-1 ring-blue-400/20"
        : "border-white/10 bg-white/[0.03] text-zinc-400",
    )}
  >
    {children}
  </div>
)

const Field = ({
  label,
  textarea = false,
  value,
  onChange,
  active = false,
  done = false,
  helper = "",
}) => (
  <div className="relative">
    {textarea ? (
      <textarea
        className={cn(
          "w-full h-32 px-4 py-3 rounded-2xl text-zinc-100 placeholder-zinc-400 resize-none focus:outline-none transition-all duration-200 backdrop-blur-xl",
          done
            ? "bg-emerald-500/[0.05] border border-emerald-500/25 focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/15"
            : active
            ? "bg-blue-500/[0.04] border border-blue-400/30 focus:border-blue-300/50 focus:ring-2 focus:ring-blue-400/15"
            : "bg-zinc-900/60 border border-white/10 focus:border-white/30 focus:ring-2 focus:ring-white/20",
        )}
        placeholder={`Εισάγετε ${label.toLowerCase()}...`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    ) : (
      <input
        className={cn(
          "w-full px-4 py-3 rounded-2xl text-zinc-100 placeholder-zinc-400 focus:outline-none transition-all duration-200 backdrop-blur-xl",
          done
            ? "bg-emerald-500/[0.05] border border-emerald-500/25 focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/15"
            : active
            ? "bg-blue-500/[0.04] border border-blue-400/30 focus:border-blue-300/50 focus:ring-2 focus:ring-blue-400/15"
            : "bg-zinc-900/60 border border-white/10 focus:border-white/30 focus:ring-2 focus:ring-white/20",
        )}
        placeholder={`Εισάγετε ${label.toLowerCase()}...`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )}

    <label
      className={cn(
        "absolute -top-2 left-3 px-2 text-xs font-medium backdrop-blur-sm rounded",
        done
          ? "bg-emerald-950/80 text-emerald-300"
          : active
          ? "bg-blue-950/80 text-blue-200"
          : "bg-black/70 text-zinc-400",
      )}
    >
      {label}
    </label>

    {!!helper && (
      <p
        className={cn(
          "mt-2 text-[12px] leading-5",
          done ? "text-emerald-300/90" : active ? "text-blue-200/90" : "text-zinc-500",
        )}
      >
        {helper}
      </p>
    )}
  </div>
)

const Thumb = ({ src, index, total, onRemove }) => {
  const rootRef = useRef(null)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    if (typeof IntersectionObserver === "undefined") {
      setShouldLoad(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: "160px 0px",
        threshold: 0.01,
      },
    )

    observer.observe(el)

    return () => observer.disconnect()
  }, [])

  return (
    <motion.div
      ref={rootRef}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04 }}
      className="group relative aspect-square overflow-hidden rounded-xl bg-zinc-900 border border-white/10"
    >
      {!loaded && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-zinc-900" />
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-800" />
          <div className="absolute inset-y-0 -left-1/3 w-1/3 animate-[qbShimmer_1.25s_linear_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
      )}

      {shouldLoad && (
        <img
          src={src || "/placeholder.svg"}
          alt={`Εικόνα ${index}`}
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
          className={cn(
            "h-full w-full object-cover transition-all duration-300 group-hover:scale-105 select-none",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      )}

      <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded-md text-xs text-white font-medium backdrop-blur-sm z-[2]">
        {index}/{total}
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onRemove?.()
        }}
        aria-label={`Διαγραφή εικόνας ${index}`}
        className={cn(
          "absolute right-2 top-2 z-[3] inline-flex items-center justify-center rounded-full text-white transition-all duration-200",
          "h-9 w-9 sm:h-8 sm:w-8",
          "bg-black/75 border border-white/10 shadow-lg backdrop-blur-md",
          "opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
          "hover:bg-red-600 active:scale-95",
        )}
      >
        <X className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
      </button>

      <div className="pointer-events-none absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[1]" />
    </motion.div>
  )
}

export default function CreatePostModal({
  open,
  onClose,
  uid,
  onCreated,
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

  const [mobileMode, setMobileMode] = useState("mid")
  const [mobileDragY, setMobileDragY] = useState(0)
  const [mobileDragging, setMobileDragging] = useState(false)

  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [submitFeedback, setSubmitFeedback] = useState("")

  const fileInputRef = useRef(null)
  const closeTimerRef = useRef(null)
  const thumbsRef = useRef([])
  const dragRef = useRef({
    startY: 0,
    deltaY: 0,
    startMode: "mid",
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    thumbsRef.current = thumbs
  }, [thumbs])

  const revokeUrls = useCallback((urls = []) => {
    urls.forEach((url) => {
      try {
        if (typeof url === "string" && url.startsWith("blob:")) {
          URL.revokeObjectURL(url)
        }
      } catch {}
    })
  }, [])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      revokeUrls(thumbsRef.current)
    }
  }, [revokeUrls])

  const resetFormStateAfterClose = useCallback(() => {
    revokeUrls(thumbsRef.current)
    setTitle("")
    setDesc("")
    setFiles([])
    setThumbs([])
    setPreviewOpen(false)
    setMobileMode("mid")
    setMobileDragY(0)
    setMobileDragging(false)
    setSubmitAttempted(false)
    setSubmitFeedback("")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [revokeUrls])

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
        resetFormStateAfterClose()
      }, CLOSE_MS)
    }
  }, [open, mounted, shouldRender, resetFormStateAfterClose])

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

  const mobileCloseY = useMemo(() => {
    if (typeof window === "undefined") return MOBILE_CLOSE_Y_FALLBACK
    return Math.max(
      window.innerHeight || MOBILE_CLOSE_Y_FALLBACK,
      MOBILE_CLOSE_Y_FALLBACK,
    )
  }, [shouldRender])

  const requestClose = useCallback(
    (force = false) => {
      if (busy && !force) return
      setIsVisible(false)

      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      closeTimerRef.current = setTimeout(() => {
        setShouldRender(false)
        resetFormStateAfterClose()
        onClose?.()
      }, CLOSE_MS)
    },
    [busy, onClose, resetFormStateAfterClose],
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

  const addFiles = useCallback((fileList) => {
    const arr = Array.from(fileList || [])
    const ok = []

    arr.forEach((f) => {
      if (f.size > MAX_BYTES) return
      if (!f.type.startsWith("image/")) return
      ok.push(f)
    })

    if (ok.length > 0) {
      const urls = ok.map((file) => URL.createObjectURL(file))
      setFiles((prev) => [...prev, ...ok])
      setThumbs((prev) => [...prev, ...urls])
      setSubmitFeedback("")
    }
  }, [])

  const removeThumb = useCallback(
    (index) => {
      setFiles((prev) => prev.filter((_, i) => i !== index))

      setThumbs((prev) => {
        const removedUrl = prev[index]
        if (removedUrl) revokeUrls([removedUrl])
        return prev.filter((_, i) => i !== index)
      })

      if (fileInputRef.current) fileInputRef.current.value = ""
      setSubmitFeedback("")
    },
    [revokeUrls],
  )

  const clearAllImages = useCallback(() => {
    revokeUrls(thumbsRef.current)
    setFiles([])
    setThumbs([])
    if (fileInputRef.current) fileInputRef.current.value = ""
    setSubmitFeedback("")
  }, [revokeUrls])

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

  const hasTitle = useMemo(() => Boolean(title.trim()), [title])
  const hasDesc = useMemo(() => Boolean(desc.trim()), [desc])
  const detailsComplete = hasTitle && hasDesc
  const imagesComplete = files.length > 0
  const canPublish = Boolean(uid && detailsComplete && imagesComplete && !busy)

  const nextStep = useMemo(() => {
    if (!hasTitle) return "title"
    if (!hasDesc) return "desc"
    if (!imagesComplete) return "images"
    return "publish"
  }, [hasTitle, hasDesc, imagesComplete])

  const footerHint = useMemo(() => {
    if (!uid) return "Δεν βρέθηκε session. Κάνε ανανέωση και δοκίμασε ξανά."
    if (!hasTitle) return "Ξεκίνα γράφοντας έναν τίτλο."
    if (!hasDesc) return "Ωραία. Τώρα συμπλήρωσε και την περιγραφή."
    if (!imagesComplete) return "Τώρα πρόσθεσε τουλάχιστον μία εικόνα."
    return "Όλα είναι έτοιμα. Πάτα Δημοσίευση."
  }, [uid, hasTitle, hasDesc, imagesComplete])

  useEffect(() => {
    if (!submitFeedback) return
    setSubmitFeedback("")
  }, [title, desc, files.length])

  const handleCreate = useCallback(async () => {
    setSubmitAttempted(true)
    setSubmitFeedback("")

    if (!uid) {
      setSubmitFeedback("Δεν βρέθηκε ο λογαριασμός σου. Κάνε ανανέωση και δοκίμασε ξανά.")
      return
    }

    if (!detailsComplete) {
      setSubmitFeedback("Συμπλήρωσε πρώτα τίτλο και περιγραφή.")
      return
    }

    if (!imagesComplete) {
      setSubmitFeedback("Πρόσθεσε τουλάχιστον μία εικόνα πριν τη δημοσίευση.")
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
      requestClose(true)
    } catch {
      setSubmitFeedback(
        "Δεν ήταν δυνατή η δημοσίευση της ανάρτησης αυτή τη στιγμή. Δοκίμασε ξανά.",
      )
    } finally {
      setBusy(false)
    }
  }, [uid, detailsComplete, imagesComplete, files, title, desc, onCreated, requestClose])

  if (!mounted || !shouldRender) return null

  const renderForm = ({ mobile = false }) => (
    <div
      className={cn(
        "flex-1 overflow-y-auto qb-scroll overscroll-contain",
        mobile ? "px-4 py-4" : "px-6 py-5",
      )}
      style={{ WebkitOverflowScrolling: "touch" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="space-y-6">
        <div className={cn("grid gap-2", mobile ? "grid-cols-1" : "grid-cols-3")}>
          <StepChip active={!detailsComplete} done={detailsComplete}>
            1. Στοιχεία ανάρτησης
          </StepChip>
          <StepChip active={detailsComplete && !imagesComplete} done={imagesComplete}>
            2. Εικόνες
          </StepChip>
          <StepChip active={detailsComplete && imagesComplete} done={false}>
            3. Δημοσίευση
          </StepChip>
        </div>

        <div
          className={cn(
            "rounded-[26px] border p-4 sm:p-5 transition-all duration-300",
            detailsComplete
              ? "border-emerald-500/25 bg-emerald-500/[0.04]"
              : "border-blue-400/30 bg-blue-500/[0.04] ring-1 ring-blue-400/15",
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-white">Στοιχεία ανάρτησης</h4>
              <p
                className={cn(
                  "mt-1 text-xs",
                  detailsComplete ? "text-emerald-300/90" : "text-blue-200/90",
                )}
              >
                {detailsComplete
                  ? "Έτοιμο. Τώρα πήγαινε στο επόμενο βήμα και πρόσθεσε εικόνες."
                  : "Συμπλήρωσε πρώτα τίτλο και περιγραφή για να συνεχίσεις."}
              </p>
            </div>

            {detailsComplete && (
              <div className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Ολοκληρώθηκε
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Field
              label="Τίτλος"
              value={title}
              onChange={setTitle}
              active={nextStep === "title" || (submitAttempted && !hasTitle)}
              done={hasTitle}
              helper={
                !hasTitle
                  ? "Γράψε έναν καθαρό τίτλο για την ανάρτησή σου."
                  : !hasDesc
                  ? "Ωραία. Τώρα συμπλήρωσε και την περιγραφή."
                  : "Τέλειο."
              }
            />

            <Field
              label="Περιγραφή"
              textarea
              value={desc}
              onChange={setDesc}
              active={nextStep === "desc" || (submitAttempted && !hasDesc)}
              done={hasDesc}
              helper={
                !hasDesc
                  ? "Γράψε λίγα λόγια για το post, ώστε να ξέρει ο χρήστης τι βλέπει."
                  : "Η περιγραφή είναι έτοιμη."
              }
            />
          </div>
        </div>

        <div
          className={cn(
            "rounded-[26px] border p-4 sm:p-5 transition-all duration-300",
            detailsComplete && !imagesComplete
              ? "border-blue-400/30 bg-blue-500/[0.04] ring-1 ring-blue-400/15"
              : imagesComplete
              ? "border-emerald-500/25 bg-emerald-500/[0.04]"
              : "border-white/10 bg-white/[0.02]",
          )}
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <label className="block text-sm font-semibold text-zinc-100">
                    Εικόνες
                  </label>

                  {imagesComplete && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" />
                      Έτοιμο
                    </span>
                  )}
                </div>

                <p
                  className={cn(
                    "mt-1 text-xs",
                    detailsComplete && !imagesComplete
                      ? "text-blue-200/90"
                      : imagesComplete
                      ? "text-emerald-300/90"
                      : "text-zinc-500",
                  )}
                >
                  {!detailsComplete
                    ? "Μόλις ολοκληρώσεις τα στοιχεία, εδώ θα προσθέσεις τις εικόνες."
                    : !imagesComplete
                    ? "Τώρα πρόσθεσε τουλάχιστον μία εικόνα για να πας στη δημοσίευση."
                    : `Σύνολο επιλεγμένων: ${formatBytes(totalSelectedBytes)}`}
                </p>
              </div>
            </div>

            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                addFiles(e.dataTransfer.files)
              }}
              className={cn(
                "group relative flex cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-300",
                detailsComplete && !imagesComplete
                  ? "border-blue-400/30 bg-blue-500/[0.03] hover:border-blue-300/45 hover:bg-blue-500/[0.05]"
                  : imagesComplete
                  ? "border-emerald-500/20 bg-emerald-500/[0.03] hover:border-emerald-400/30 hover:bg-emerald-500/[0.05]"
                  : "border-white/10 hover:border-white/30 hover:bg-white/5",
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

              <div className="flex flex-col items-center text-center px-4">
                <div
                  className={cn(
                    "p-4 rounded-full transition-colors mb-4 border",
                    detailsComplete && !imagesComplete
                      ? "bg-blue-500/10 border-blue-400/20 text-blue-200"
                      : imagesComplete
                      ? "bg-emerald-500/10 border-emerald-400/20 text-emerald-300"
                      : "bg-black/40 border-white/10 text-zinc-400 group-hover:text-zinc-300 group-hover:bg-black/30",
                  )}
                >
                  <Upload className="h-8 w-8" />
                </div>

                <p className="text-base sm:text-lg font-medium mb-1 text-white">
                  Σύρετε εικόνες εδώ ή κάντε κλικ για επιλογή
                </p>

                <p className="text-sm text-zinc-500">
                  Υποστήριξη πολλαπλών εικόνων • Μέγιστο 2MB η κάθε μία
                </p>
              </div>
            </label>
          </div>
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

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    clearAllImages()
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/15"
                >
                  <Trash2 className="h-4 w-4" />
                  {!mobile && "Διαγραφή όλων"}
                </button>

                {mobile && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setPreviewOpen(true)
                    }}
                    aria-label="Προεπισκόπηση"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] text-white/90 transition hover:bg-white/[0.08]"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}
              </div>
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
                  key={`${src}-${i}`}
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
      <style>{`
        .qb-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(161, 161, 170, 0.48) transparent;
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
            rgba(161, 161, 170, 0.42),
            rgba(113, 113, 122, 0.52)
          );
          border-radius: 999px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        .qb-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(
            180deg,
            rgba(190, 190, 200, 0.52),
            rgba(125, 125, 135, 0.62)
          );
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        .qb-scroll::-webkit-scrollbar-corner {
          background: transparent;
        }

        @keyframes qbShimmer {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(420%);
          }
        }
      `}</style>

      <Suspense fallback={null}>
        <PostPreviewModal
          open={previewOpen}
          post={previewPost}
          onClose={() => setPreviewOpen(false)}
        />
      </Suspense>

      <>
        {/* Desktop */}
        <div
          className={cn(
            "hidden sm:flex fixed inset-0 z-[80] items-center justify-center p-4",
            isVisible ? "pointer-events-auto" : "pointer-events-none",
          )}
        >
          <motion.button
            type="button"
            aria-label="close overlay"
            onClick={() => requestClose()}
            initial={false}
            animate={{ opacity: isVisible ? 1 : 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className={cn(
              "absolute inset-0 bg-black/65 backdrop-blur-md",
              isVisible ? "pointer-events-auto" : "pointer-events-none",
            )}
          />

          <motion.div
            initial={false}
            animate={{
              opacity: isVisible ? 1 : 0,
              y: isVisible ? 0 : DESKTOP_CLOSE_Y,
              scale: isVisible ? 1 : 0.98,
            }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl max-h-[88vh] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/85 to-black/90 backdrop-blur-2xl shadow-2xl flex flex-col will-change-transform"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_30%)] pointer-events-none" />

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
                  onClick={() => requestClose()}
                  className="text-white hover:opacity-70 transition"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {renderForm({ mobile: false })}

            <div
              className={cn(
                "relative border-t px-6 py-4 backdrop-blur-xl transition-all duration-300",
                canPublish
                  ? "border-emerald-500/20 bg-emerald-500/[0.05]"
                  : "border-white/10 bg-black/45",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div
                    className={cn(
                      "text-sm",
                      canPublish ? "text-emerald-300" : "text-zinc-400",
                    )}
                  >
                    {footerHint}
                  </div>

                  {!!submitFeedback && (
                    <p className="mt-1 text-xs text-red-300">{submitFeedback}</p>
                  )}

                  {!submitFeedback && isDirty && !canPublish && (
                    <p className="mt-1 text-xs text-zinc-500">
                      Συμπλήρωσε τα βήματα με τη σειρά και το κουμπί θα είναι έτοιμο.
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => requestClose()}
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-white/90 border border-white/15 rounded-2xl bg-black/30 hover:bg-white/10 transition disabled:opacity-60"
                  >
                    Ακύρωση
                  </button>

                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={!canPublish}
                    className={cn(
                      "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl transition min-w-[180px] font-medium",
                      canPublish
                        ? "bg-white text-black hover:bg-zinc-100"
                        : "bg-zinc-800 text-zinc-500 cursor-not-allowed",
                    )}
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
        <div
          className={cn(
            "fixed inset-0 z-[80] sm:hidden",
            isVisible ? "pointer-events-auto" : "pointer-events-none",
          )}
        >
          <motion.button
            type="button"
            aria-label="close overlay"
            onClick={() => requestClose()}
            initial={false}
            animate={{ opacity: isVisible ? 1 : 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
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
                y: isVisible ? mobileDragY : mobileCloseY,
              }}
              transition={
                mobileDragging
                  ? { duration: 0 }
                  : { duration: 0.32, ease: [0.22, 1, 0.36, 1] }
              }
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "w-full max-w-none border border-zinc-900 bg-black shadow-[0_-30px_80px_rgba(0,0,0,.9)] flex flex-col pointer-events-auto overflow-hidden will-change-transform",
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
                className="flex justify-center bg-black pt-2 pb-1 touch-none select-none"
                onTouchStart={handleDragTouchStart}
                onTouchMove={handleDragTouchMove}
                onTouchEnd={handleDragTouchEnd}
                onTouchCancel={handleDragTouchEnd}
              >
                <div className="h-1.5 w-12 rounded-full bg-zinc-700/90" />
              </div>

              <div
                className="border-b border-zinc-800/90 bg-black px-4 pt-3 pb-4 touch-none select-none"
                onTouchStart={handleDragTouchStart}
                onTouchMove={handleDragTouchMove}
                onTouchEnd={handleDragTouchEnd}
                onTouchCancel={handleDragTouchEnd}
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
                    onClick={() => requestClose()}
                    className="text-white hover:opacity-70 transition shrink-0"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {renderForm({ mobile: true })}

              <div
                className={cn(
                  "border-t px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] transition-all duration-300",
                  canPublish
                    ? "border-emerald-500/20 bg-emerald-500/[0.05]"
                    : "border-zinc-800/90 bg-black",
                )}
              >
                <div className="flex flex-col gap-3">
                  <div className={cn("text-sm", canPublish ? "text-emerald-300" : "text-white/75")}>
                    {footerHint}
                  </div>

                  {!!submitFeedback && (
                    <p className="text-xs text-red-300 -mt-1">{submitFeedback}</p>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => requestClose()}
                      disabled={busy}
                      className="h-12 rounded-2xl border border-zinc-800 bg-zinc-900 text-white transition hover:bg-zinc-800 disabled:opacity-60"
                    >
                      Ακύρωση
                    </button>

                    <button
                      type="button"
                      onClick={handleCreate}
                      disabled={!canPublish}
                      className={cn(
                        "h-12 rounded-2xl transition font-semibold",
                        canPublish
                          ? "border border-white bg-white text-black hover:bg-zinc-100"
                          : "border border-zinc-800 bg-zinc-800 text-zinc-500 cursor-not-allowed",
                      )}
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
      </>
    </>,
    document.body,
  )
}