"use client"
import { useState, useEffect, useCallback, useRef, memo } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  PlusCircle,
  ImageIcon,
  X,
  Trash2,
  Loader2,
  CalendarDays,
  Camera,
  Upload,
  Grid3X3,
  ChevronLeft,
  ChevronRight,
  Layers,
  AlertTriangle,
  CheckCircle,
  FileX,
  Edit3,
  Save,
  RotateCcw,
  ExternalLink,
  Eye,
} from "lucide-react"
import { supabase } from "../supabaseClient"
import { useAuth } from "../AuthProvider"
import TrainerMenu from "../components/TrainerMenu"
import PostPreviewModal from "../components/PostPreviewModal"

const MAX_BYTES = 1_024_000 // 1 MB
const PLACEHOLDER = "/placeholder.svg?height=300&width=400&text=No+Image"
const INITIAL_SHOW = 6
const BATCH_SIZE = 6

/* ----------------------- Premium shell pieces (like schedule) ----------------------- */
function PremiumCard({ title, subtitle, icon, action, children, className = "", gradient = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/60 to-black/60 backdrop-blur-xl p-6 shadow-2xl transition-all duration-300 hover:shadow-3xl hover:border-white/20 ${gradient ? "premium-gradient" : ""} ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-zinc-300/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      {(title || subtitle || icon || action) && (
        <div className="relative mb-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            {icon && (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/20">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              {title && <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight break-words">{title}</h3>}
              {subtitle && <p className="text-xs sm:text-sm text-zinc-300 mt-1 break-words">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="relative z-10">{action}</div>}
        </div>
      )}
      <div className="relative">{children}</div>
    </motion.div>
  )
}

function PremiumButton({ children, variant = "primary", size = "default", className = "", ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
  const variants = {
    primary: "bg-white text-black hover:bg-zinc-100 shadow-lg hover:shadow-xl hover:shadow-white/25 active:scale-95",
    secondary: "bg-zinc-800 text-white hover:bg-zinc-700 shadow-lg hover:shadow-xl hover:shadow-zinc-800/25 active:scale-95",
    outline:
      "border-2 border-white/20 bg-black/50 backdrop-blur-sm text-white hover:bg-white/10 hover:text-white hover:border-white/50",
    ghost: "text-white hover:bg-white/10 hover:text-white",
  }
  const sizes = {
    sm: "px-4 py-2 text-sm rounded-xl",
    default: "px-6 py-3 text-sm rounded-2xl",
    lg: "px-8 py-4 text-base rounded-2xl",
  }
  return (
    <button {...props} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </button>
  )
}

/* ---------- Field + helpers (unchanged behavior, tuned visuals) ---------- */
const Field = ({ label, textarea = false, value, onChange }) => (
  <div className="relative">
    {textarea ? (
      <textarea
        className="w-full h-32 px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-2xl text-zinc-100 placeholder-zinc-400 resize-none focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all duration-200 backdrop-blur-xl"
        placeholder={`Εισάγετε ${label.toLowerCase()}...`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    ) : (
      <input
        className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-2xl text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all duration-200 backdrop-blur-xl"
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

/* ---------- Edit modal, popups, viewer, post card: same logic, visuals fit new theme ---------- */
const ErrorPopup = ({ open, onClose, title, message, rejectedFiles = [] }) => {
  if (!open) return null
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl shadow-2xl border border-red-500/30 bg-black/50"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 via-transparent to-transparent" />
          <div className="relative">
            <div className="flex items-center gap-3 p-6 pb-4">
              <div className="p-2 rounded-full bg-red-500/20">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-red-200">{title}</h3>
              <button onClick={onClose} className="ml-auto p-1 rounded-full hover:bg-red-500/20 transition-colors">
                <X className="h-5 w-5 text-red-400" />
              </button>
            </div>
            <div className="px-6 pb-6">
              <p className="text-red-300 mb-4">{message}</p>
              {rejectedFiles.length > 0 && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {rejectedFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                      <FileX className="h-4 w-4 text-red-400" />
                      <span className="text-sm text-red-300 truncate">{file.name}</span>
                      <span className="text-xs text-red-400 ml-auto">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={onClose} className="w-full mt-4 px-4 py-2 bg-red-600/20 text-red-200 rounded-xl hover:bg-red-600/30 transition-colors font-medium border border-red-500/30">
                Κατανοητό
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

const SuccessPopup = ({ open, onClose, title, message }) => {
  if (!open) return null
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl shadow-2xl border border-green-500/30 bg-black/50"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-600/10 via-transparent to-transparent" />
          <div className="relative">
            <div className="flex items-center gap-3 p-6 pb-4">
              <div className="p-2 rounded-full bg-green-500/20">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-green-200">{title}</h3>
              <button onClick={onClose} className="ml-auto p-1 rounded-full hover:bg-green-500/20 transition-colors">
                <X className="h-5 w-5 text-green-400" />
              </button>
            </div>
            <div className="px-6 pb-6">
              <p className="text-green-300 mb-4">{message}</p>
              <button onClick={onClose} className="w-full px-4 py-2 bg-green-600/20 text-green-200 rounded-xl hover:bg-green-600/30 transition-colors font-medium border border-green-500/30">
                Τέλεια!
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ---------- Edit Post Modal (unchanged logic) ---------- */
const EditPostModal = ({ open, post, onClose, onSave }) => {
  const [editTitle, setEditTitle] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [editImages, setEditImages] = useState([])
  const [newFiles, setNewFiles] = useState([])
  const [newThumbs, setNewThumbs] = useState([])
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (post && open) {
      setEditTitle(post.title || "")
      setEditDesc(post.description || "")
      setEditImages(post.image_urls || [post.image_url].filter(Boolean) || [])
      setNewFiles([])
      setNewThumbs([])
    }
  }, [post, open])

  const addNewFiles = useCallback((fileList) => {
    const arr = Array.from(fileList || [])
    const ok = []
    const readers = []

    arr.forEach((f) => {
      if (f.size > MAX_BYTES || !f.type.startsWith("image/")) return
      ok.push(f)
      readers.push(
        new Promise((res) => {
          const r = new FileReader()
          r.onload = () => res(r.result)
          r.readAsDataURL(f)
        }),
      )
    })

    if (ok.length > 0) {
      Promise.all(readers).then((urls) => {
        setNewFiles((p) => [...p, ...ok])
        setNewThumbs((p) => [...p, ...urls])
      })
    }
  }, [])

  const removeExistingImage = (index) => {
    setEditImages((imgs) => imgs.filter((_, i) => i !== index))
  }

  const removeNewImage = (index) => {
    setNewFiles((files) => files.filter((_, i) => i !== index))
    setNewThumbs((thumbs) => thumbs.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!editTitle.trim() || !editDesc.trim()) return
    if (editImages.length === 0 && newFiles.length === 0) return

    setSaving(true)
    try {
      await onSave({
        title: editTitle,
        description: editDesc,
        existingImages: editImages,
        newFiles: newFiles,
      })
      onClose()
    } catch (error) {
      console.error("Error saving post:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditTitle(post?.title || "")
    setEditDesc(post?.description || "")
    setEditImages(post?.image_urls || [post?.image_url].filter(Boolean) || [])
    setNewFiles([])
    setNewThumbs([])
    onClose()
  }

  if (!open || !post) return null

  const totalImages = editImages.length + newThumbs.length

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl border border-zinc-700/50 bg-black/50"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-600/10 via-transparent to-transparent" />
          <div className="relative">
            <div className="flex items-center justify-between p-6 border-b border-zinc-700/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/20">
                  <Edit3 className="h-5 w-5 text-blue-400" />
                </div>
                <h2 className="text-xl font-semibold text-zinc-100">Επεξεργασία ανάρτησης</h2>
              </div>
              <button onClick={handleCancel} className="p-2 rounded-full hover:bg-zinc-700/50 transition-colors">
                <X className="h-5 w-5 text-zinc-400" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6 space-y-6">
              <Field label="Τίτλος" value={editTitle} onChange={setEditTitle} />
              <Field label="Περιγραφή" textarea value={editDesc} onChange={setEditDesc} />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-zinc-300">Εικόνες ({totalImages})</label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-800/60 text-zinc-300 rounded-lg hover:bg-zinc-700/60 transition-colors border border-zinc-700/50"
                  >
                    <Upload className="h-4 w-4" />
                    Προσθήκη εικόνων
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

                {editImages.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-zinc-400">Υπάρχουσες εικόνες</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {editImages.map((src, i) => (
                        <EditImageThumb key={`existing-${i}`} src={src} index={i + 1} onRemove={() => removeExistingImage(i)} type="existing" />
                      ))}
                    </div>
                  </div>
                )}

                {newThumbs.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-zinc-400">Νέες εικόνες</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {newThumbs.map((src, i) => (
                        <EditImageThumb key={`new-${i}`} src={src} index={editImages.length + i + 1} onRemove={() => removeNewImage(i)} type="new" />
                      ))}
                    </div>
                  </div>
                )}

                {totalImages === 0 && (
                  <div className="text-center py-8 text-zinc-400">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2 text-zinc-500" />
                    <p>Δεν υπάρχουν εικόνες. Προσθέστε τουλάχιστον μία εικόνα.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-700/50">
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 text-zinc-300 hover:bg-zinc-700/50 rounded-xl transition-colors border border-zinc-600/50"
              >
                <RotateCcw className="h-4 w-4" />
                Ακύρωση
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editTitle.trim() || !editDesc.trim() || totalImages === 0}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600/20 text-blue-200 rounded-xl hover:bg-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-blue-500/30"
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

const EditImageThumb = ({ src, index, onRemove, type }) => (
  <div className="group relative aspect-square overflow-hidden rounded-xl bg-zinc-900 border border-white/10">
    <img src={src || "/placeholder.svg"} alt={`Εικόνα ${index}`} className="h-full w-full object-cover" />
    <div
      className={`absolute top-2 left-2 px-2 py-1 rounded-md text-xs font-medium ${
        type === "new"
          ? "bg-green-500/20 text-green-300 border border-green-500/30"
          : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
      }`}
    >
      {type === "new" ? "Νέα" : "Υπάρχουσα"}
    </div>
    <button
      onClick={onRemove}
      className="absolute right-2 top-2 p-1.5 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600"
    >
      <X className="h-3 w-3" />
    </button>
    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
  </div>
)

const EnhancedThumb = ({ src, index, total, onOpen, onRemove }) => (
  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }} className="group relative aspect-square overflow-hidden rounded-xl bg-zinc-900 border border-white/10">
    <img
      src={src || "/placeholder.svg"}
      alt={`Εικόνα ${index}`}
      className="h-full w-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-110"
      onClick={onOpen}
    />
    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded-md text-xs text-white font-medium backdrop-blur-sm">
      {index}/{total}
    </div>
    <button
      onClick={onRemove}
      className="absolute right-2 top-2 p-1.5 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600"
    >
      <X className="h-3 w-3" />
    </button>
    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
  </motion.div>
)

function EnhancedViewer({ imgs, idx, onClose }) {
  const [i, setI] = useState(idx)
  const prev = () => setI((i - 1 + imgs.length) % imgs.length)
  const next = () => setI((i + 1) % imgs.length)

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") prev()
      if (e.key === "ArrowRight") next()
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
        <div className="relative max-h-[90vh] max-w-[90vw]">
          <motion.img
            key={i}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            src={imgs[i] || "/placeholder.svg"}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded-2xl shadow-2xl"
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/70 rounded-full text-white text-sm font-medium backdrop-blur-sm">
            {i + 1} / {imgs.length}
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="absolute right-8 top-8 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all duration-200 backdrop-blur-sm"
        >
          <X className="h-6 w-6" />
        </button>

        {imgs.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation()
                prev()
              }}
              className="absolute left-8 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all duration-200 backdrop-blur-sm"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                next()
              }}
              className="absolute right-8 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all duration-200 backdrop-blur-sm"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

function EnhancedPostCard({ post, index, onDelete, onOpen, onEdit, onViewDetails }) {
  const imgs = post.image_urls?.length ? post.image_urls : [post.image_url || PLACEHOLDER]
  const hasMultipleImages = imgs.length > 1

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className={`group relative overflow-hidden rounded-3xl transition-all duration-500 ${post._animate ? "animate-pulse" : ""}`}
    >
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/60 to-black/60 backdrop-blur-xl">
        <div className="absolute right-4 top-4 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
          <button
            onClick={() => onEdit(post)}
            className="p-2 rounded-full bg-black/50 text-white hover:bg-blue-600 transition-colors backdrop-blur-sm"
            title="Επεξεργασία"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(post.id)}
            className="p-2 rounded-full bg-black/50 text-white hover:bg-red-600 transition-colors backdrop-blur-sm"
            title="Διαγραφή"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="relative aspect-[4/3] overflow-hidden cursor-pointer" onClick={() => onViewDetails(post)}>
          <img src={imgs[0] || "/placeholder.svg"} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
          {hasMultipleImages && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1 px-3 py-1.5 bg-black/70 rounded-full text-white text-sm font-medium backdrop-blur-sm">
              <Grid3X3 className="h-4 w-4" />
              {imgs.length}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        </div>

        <div className="p-6 space-y-4 cursor-pointer" onClick={() => onViewDetails(post)}>
          <h3 className="text-lg font-bold text-zinc-100 line-clamp-2 group-hover:text-zinc-300 transition-colors">
            {post.title || "Χωρίς τίτλο"}
          </h3>
          <p className="text-zinc-300 text-sm leading-relaxed line-clamp-3">
            {post.description || "Δεν υπάρχει περιγραφή."}
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-zinc-400" />
              <time className="text-xs text-zinc-400">
                {new Date(post.created_at).toLocaleDateString("el-GR", {
                  day: "2-digit",
                  month: "short",
                  year: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onViewDetails(post)
              }}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Προβολή
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  )
}

const EmptyState = () => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col items-center justify-center py-20 text-center">
    <div className="p-12 max-w-md mx-auto rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/60 to-black/60 backdrop-blur-xl">
      <div className="p-6 rounded-full bg-zinc-800/50 mb-6 inline-block border border-white/10">
        <ImageIcon className="h-12 w-12 text-zinc-400" />
      </div>
      <h3 className="text-xl font-semibold text-zinc-100 mb-2">Δεν υπάρχουν ακόμη αναρτήσεις</h3>
      <p className="text-zinc-400 max-w-md">
        Ξεκινήστε να μοιράζεστε το περιεχόμενό σας με το κοινό σας δημιουργώντας την πρώτη σας ανάρτηση παραπάνω.
      </p>
    </div>
  </motion.div>
)

/* -------------------------------- Main Page -------------------------------- */
export default function TrainerPostsPage() {
  const navigate = useNavigate()
  const { profile, profileLoaded, session } = useAuth()
  const uid = session?.user?.id

  const [allPosts, setAllPosts] = useState([])
  const [visible, setVisible] = useState(INITIAL_SHOW)

  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [files, setFiles] = useState([])
  const [thumbs, setThumbs] = useState([])
  const [busy, setBusy] = useState(false)

  const [previewOpen, setPreview] = useState(false)
  const [viewer, setViewer] = useState({ open: false, imgs: [], idx: 0 })

  const [detailView, setDetailView] = useState({ open: false, post: null })
  const [editModal, setEditModal] = useState({ open: false, post: null })

  const [errorPopup, setErrorPopup] = useState({ open: false, title: "", message: "", rejectedFiles: [] })
  const [successPopup, setSuccessPopup] = useState({ open: false, title: "", message: "" })

  const fileInput = useRef(null)

  const [isLoaded, setIsLoaded] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    setIsLoaded(profileLoaded)
    setIsAuthorized(!!uid && profile.role === "trainer")
  }, [profileLoaded, uid, profile])

  useEffect(() => {
    if (!isLoaded || !isAuthorized) return
    ;(async () => {
      const { data, error } = await supabase.from("posts").select("*").order("created_at", { ascending: false })
      if (error) {
        setErrorPopup({
          open: true,
          title: "Σφάλμα φόρτωσης",
          message: "Δεν ήταν δυνατή η φόρτωση των αναρτήσεων. Παρακαλώ δοκιμάστε ξανά.",
          rejectedFiles: [],
        })
      } else {
        setAllPosts(data)
      }
    })()
  }, [isLoaded, isAuthorized])

  useEffect(() => {
    if (visible >= allPosts.length) return
    const sentinel = document.querySelector("#lazy-sentinel")
    if (!sentinel) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible((v) => Math.min(v + BATCH_SIZE, allPosts.length))
          }
        })
      },
      { rootMargin: "200px" },
    )
    io.observe(sentinel)
    return () => io.disconnect()
  }, [visible, allPosts.length])

  const addFiles = useCallback((fileList) => {
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
      readers.push(
        new Promise((res) => {
          const r = new FileReader()
          r.onload = () => res(r.result)
          r.readAsDataURL(f)
        }),
      )
    })

    if (rejected.length > 0) {
      setErrorPopup({
        open: true,
        title: "Αρχεία απορρίφθηκαν",
        message: "Μερικά αρχεία δεν μπόρεσαν να προστεθούν επειδή είναι μεγαλύτερα από 1MB ή δεν είναι εικόνες.",
        rejectedFiles: rejected,
      })
    }

    if (ok.length > 0) {
      Promise.all(readers).then((urls) => {
        setFiles((p) => [...p, ...ok])
        setThumbs((p) => [...p, ...urls])
      })
    }
  }, [])

  const removeThumb = (i) => {
    setFiles((f) => f.filter((_, idx) => idx !== i))
    setThumbs((t) => t.filter((_, idx) => idx !== i))
  }

  const createPost = async (e) => {
    e.preventDefault()
    if (!title || !desc) {
      setErrorPopup({
        open: true,
        title: "Συμπληρώστε τα στοιχεία",
        message: "Παρακαλώ συμπληρώστε τον τίτλο και την περιγραφή της ανάρτησης.",
        rejectedFiles: [],
      })
      return
    }
    if (files.length === 0) {
      setErrorPopup({
        open: true,
        title: "Προσθέστε εικόνες",
        message: "Παρακαλώ επιλέξτε τουλάχιστον μία εικόνα για την ανάρτησή σας.",
        rejectedFiles: [],
      })
      return
    }

    setBusy(true)
    try {
      const urls = []
      for (const f of files) {
        const ext = f.name.split(".").pop()
        const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabase.storage.from("post-images").upload(path, f)
        if (error) throw error
        urls.push(supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl)
      }

      const { data, error } = await supabase
        .from("posts")
        .insert({
          trainer_id: uid,
          title,
          description: desc,
          image_urls: urls,
          image_url: urls[0] || null,
        })
        .select("*")
        .single()

      if (error) throw error

      setAllPosts((p) => [{ ...data, _animate: true }, ...p])
      setTitle("")
      setDesc("")
      setFiles([])
      setThumbs([])
      setSuccessPopup({
        open: true,
        title: "Μπράβο! Επιτυχής ανάρτηση!",
        message: "Η ανάρτησή σας δημοσιεύτηκε με επιτυχία και είναι πλέον ορατή στους μαθητές σας!",
      })
    } catch (err) {
      setErrorPopup({
        open: true,
        title: "Σφάλμα δημοσίευσης",
        message: "Δεν ήταν δυνατή η δημοσίευση της ανάρτησης. Παρακαλώ δοκιμάστε ξανά.",
        rejectedFiles: [],
      })
    } finally {
      setBusy(false)
    }
  }

  const handleEditPost = async ({ title, description, existingImages, newFiles }) => {
    try {
      const newUrls = []
      for (const f of newFiles) {
        const ext = f.name.split(".").pop()
        const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabase.storage.from("post-images").upload(path, f)
        if (error) throw error
        newUrls.push(supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl)
      }
      const allImages = [...existingImages, ...newUrls]
      const { data, error } = await supabase
        .from("posts")
        .update({
          title,
          description,
          image_urls: allImages,
          image_url: allImages[0] || null,
        })
        .eq("id", editModal.post.id)
        .select("*")
        .single()
      if (error) throw error
      setAllPosts((posts) => posts.map((p) => (p.id === editModal.post.id ? { ...data, _animate: true } : p)))
      setSuccessPopup({ open: true, title: "Επιτυχής ενημέρωση!", message: "Η ανάρτησή σας ενημερώθηκε με επιτυχία!" })
    } catch (err) {
      setErrorPopup({
        open: true,
        title: "Σφάλμα ενημέρωσης",
        message: "Δεν ήταν δυνατή η ενημέρωση της ανάρτησης. Παρακαλώ δοκιμάστε ξανά.",
        rejectedFiles: [],
      })
      throw err
    }
  }

  const deletePost = async (id) => {
    if (!confirm("Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την ανάρτηση;")) return
    const { error } = await supabase.from("posts").delete().eq("id", id)
    if (error) {
      setErrorPopup({
        open: true,
        title: "Σφάλμα διαγραφής",
        message: "Δεν ήταν δυνατή η διαγραφή της ανάρτησης. Παρακαλώ δοκιμάστε ξανά.",
        rejectedFiles: [],
      })
      return
    }
    setAllPosts((p) => p.filter((x) => x.id !== id))
    setSuccessPopup({ open: true, title: "Διαγραφή επιτυχής", message: "Η ανάρτηση διαγράφηκε με επιτυχία." })
  }

  const openViewer = (imgs, idx) => setViewer({ open: true, imgs, idx })
  const closeViewer = () => setViewer({ open: false, imgs: [], idx: 0 })

  const openEditModal = (post) => setEditModal({ open: true, post })
  const closeEditModal = () => setEditModal({ open: false, post: null })

  const openDetailView = (post) => setDetailView({ open: true, post })
  const closeDetailView = () => setDetailView({ open: false, post: null })

  const navigateToPost = (post) => {
    closeDetailView()
    navigate(`/post/${post.id}`)
  }

  const previewPost = {
    id: "preview",
    title,
    description: desc,
    image_urls: thumbs,
    created_at: new Date().toISOString(),
  }

  /* -------------------------------- Render -------------------------------- */

  return (
    <div className="relative min-h-screen text-gray-100">
      {/* global sizing (desktop side menu width) */}
      <style>{`
        :root { --side-w: 0px; --nav-h: 64px; }
        @media (min-width: 640px){ :root { --nav-h: 72px; } }
        @media (min-width: 1024px){ :root { --side-w: 280px; --nav-h: 0px; } }
        @media (min-width: 1280px){ :root { --side-w: 320px; } }
      `}</style>

      {/* fixed background like schedule page */}
      <div className="fixed inset-0 -z-50 bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      <TrainerMenu />

      {/* Popups */}
      <ErrorPopup
        open={errorPopup.open}
        onClose={() => setErrorPopup({ open: false, title: "", message: "", rejectedFiles: [] })}
        title={errorPopup.title}
        message={errorPopup.message}
        rejectedFiles={errorPopup.rejectedFiles}
      />
      <SuccessPopup open={successPopup.open} onClose={() => setSuccessPopup({ open: false, title: "", message: "" })} title={successPopup.title} message={successPopup.message} />

      {/* Modals */}
      <EditPostModal open={editModal.open} post={editModal.post} onClose={closeEditModal} onSave={handleEditPost} />
      <PostPreviewModal open={previewOpen} post={previewPost} onClose={() => setPreview(false)} />
      <PostPreviewModal open={detailView.open} post={detailView.post} onClose={closeDetailView} onViewDetails={navigateToPost} />
      {viewer.open && <EnhancedViewer imgs={viewer.imgs} idx={viewer.idx} onClose={closeViewer} />}

      {/* page padding to avoid white gap + bigger desktop menu spacing */}
      <div className="relative min-h-screen overflow-x-hidden">
        <div className="lg:pl-[calc(var(--side-w)+8px)] pl-0 lg:pt-0 pt-[var(--nav-h)] transition-[padding]">
          <main className="mx-auto max-w-7xl w-full p-4 sm:p-6 space-y-8 pb-[80px]">
            {/* Header (styled like the picture) */}
            <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2 min-w-0">
                  <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent break-words">
                    Οι Αναρτήσεις μου
                  </h1>
                  <p className="text-sm sm:text-lg text-zinc-300 break-words">Δημιουργία και διαχείριση περιεχομένου</p>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-400">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    <span>Ζώνη ώρας: Ελλάδα (UTC+3)</span>
                  </div>
                </div>
              </div>
            </motion.header>

            {/* Creator */}
            <PremiumCard
              title="Δημιουργία νέας ανάρτησης"
              subtitle="Προσθέστε τίτλο, περιγραφή και εικόνες"
              icon={<Camera className="h-6 w-6" />}
              gradient
              action={
                thumbs.length > 0 ? (
                  <PremiumButton variant="outline" size="sm" onClick={() => setPreview(true)}>
                    <Eye className="h-4 w-4" />
                    Προεπισκόπηση
                  </PremiumButton>
                ) : null
              }
            >
              <form onSubmit={createPost} className="space-y-6">
                <Field label="Τίτλος" value={title} onChange={setTitle} />
                <Field label="Περιγραφή" textarea value={desc} onChange={setDesc} />

                {/* Drop zone */}
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-zinc-300">Εικόνες</label>
                  <label
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      addFiles(e.dataTransfer.files)
                    }}
                    className="group relative flex h-48 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-white/10 transition-all duration-300 hover:border-white/30 hover:bg-white/5"
                  >
                    <input
                      ref={fileInput}
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={(e) => {
                        addFiles(e.target.files)
                        e.target.value = ""
                      }}
                    />
                    <div className="flex flex-col items-center text-zinc-400 group-hover:text-zinc-300 transition-colors">
                      <div className="p-4 rounded-full bg-black/40 group-hover:bg-black/30 transition-colors mb-4 border border-white/10">
                        <Upload className="h-8 w-8" />
                      </div>
                      <p className="text-lg font-medium mb-1">Σύρετε εικόνες εδώ ή κάντε κλικ για επιλογή</p>
                      <p className="text-sm text-zinc-500">Υποστήριξη πολλαπλών εικόνων • Μέγιστο 1MB η κάθε μία</p>
                    </div>
                  </label>
                </div>

                {!!thumbs.length && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-zinc-100 flex items-center gap-2">
                        <Layers className="h-5 w-5 text-blue-400" />
                        Επιλεγμένες εικόνες ({thumbs.length})
                      </h3>
                      <PremiumButton variant="outline" size="sm" onClick={() => setPreview(true)}>
                        <Eye className="h-4 w-4" /> Προεπισκόπηση
                      </PremiumButton>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {thumbs.map((src, i) => (
                        <EnhancedThumb
                          key={i}
                          src={src}
                          index={i + 1}
                          total={thumbs.length}
                          onOpen={() => openViewer(thumbs, i)}
                          onRemove={() => removeThumb(i)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <PremiumButton type="submit" className="w-full" disabled={busy}>
                  {busy ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Δημοσίευση...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="h-5 w-5" />
                      Δημοσίευση ανάρτησης
                    </>
                  )}
                </PremiumButton>
              </form>
            </PremiumCard>

            {/* Posts grid */}
            {allPosts.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <section className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {allPosts.slice(0, visible).map((p, index) => (
                    <EnhancedPostCard
                      key={p.id}
                      post={p}
                      index={index}
                      onDelete={deletePost}
                      onOpen={openViewer}
                      onEdit={openEditModal}
                      onViewDetails={openDetailView}
                    />
                  ))}
                </section>
                {visible < allPosts.length && <div id="lazy-sentinel" className="h-10" />}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
