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

/* ---------- Enhanced Background Components ---------- */
const BaseBackground = memo(() => (
  <div className="fixed inset-0 -z-50">
    <div className="absolute inset-0 bg-black" />
    <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-black opacity-90" />
  </div>
))

const AthleticBackground = memo(() => (
  <>
    <style>{`
      @keyframes pulse-performance {
         0%, 100% { opacity: 0.1; transform: scale(1); }
         50% { opacity: 0.3; transform: scale(1.05); }
       }
      @keyframes drift-metrics {
         0% { transform: translateX(-100px) translateY(0px); }
         50% { transform: translateX(50px) translateY(-30px); }
         100% { transform: translateX(100px) translateY(0px); }
       }
      @keyframes athletic-grid {
         0% { transform: translate(0, 0) rotate(0deg); }
         100% { transform: translate(60px, 60px) rotate(0.5deg); }
       }
      @keyframes float-particles {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-20px) rotate(180deg); }
      }
    `}</style>

    {/* Animated grid */}
    <div
      className="fixed inset-0 -z-40 pointer-events-none opacity-[0.15]"
      style={{
        backgroundImage: `
          linear-gradient(rgba(113,113,122,0.08) 1px, transparent 1px),
          linear-gradient(90deg, rgba(113,113,122,0.08) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
        animation: "athletic-grid 25s linear infinite",
        maskImage: "radial-gradient(circle at 50% 50%, black 0%, transparent 75%)",
        WebkitMaskImage: "radial-gradient(circle at 50% 50%, black 0%, transparent 75%)",
      }}
    />

    {/* Floating orbs */}
    <div className="fixed inset-0 -z-40 pointer-events-none overflow-hidden">
      <div
        className="absolute top-1/5 left-1/5 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-blue-600/8 rounded-full blur-3xl"
        style={{ animation: "pulse-performance 12s ease-in-out infinite" }}
      />
      <div
        className="absolute top-3/5 right-1/5 w-[250px] h-[250px] sm:w-[400px] sm:h-[400px] bg-purple-700/8 rounded-full blur-3xl"
        style={{ animation: "pulse-performance 15s ease-in-out infinite reverse" }}
      />
      <div
        className="absolute top-1/2 left-1/2 w-[200px] h-[200px] sm:w-[300px] sm:h-[300px] bg-zinc-800/8 rounded-full blur-3xl"
        style={{ animation: "drift-metrics 20s ease-in-out infinite" }}
      />
    </div>

    {/* Floating particles */}
    <div className="fixed inset-0 -z-40 pointer-events-none">
      {[...Array(15)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-blue-400/30 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `float-particles ${3 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        />
      ))}
    </div>
  </>
))

/* ---------- Glass Card Component ---------- */
const GlassCard = memo(({ children, className = "", hover = false, ...props }) => (
  <motion.div
    className={`
      relative overflow-hidden rounded-3xl border border-zinc-700/50 backdrop-blur-xl
      ${hover ? "hover:scale-[1.02] hover:border-zinc-600/70 transition-all duration-500" : ""}
      ${className}
    `}
    style={{
      background: "rgba(0, 0, 0, 0.4)",
      backdropFilter: "blur(20px) saturate(160%)",
      WebkitBackdropFilter: "blur(20px) saturate(160%)",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
    }}
    {...props}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-zinc-600/10 via-transparent to-transparent" />
    <div className="relative">{children}</div>
  </motion.div>
))

/* ---------- Enhanced Popup Components ---------- */
const ErrorPopup = ({ open, onClose, title, message, rejectedFiles = [] }) => {
  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl shadow-2xl border border-red-500/30"
          style={{
            background: "rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(20px) saturate(160%)",
            WebkitBackdropFilter: "blur(20px) saturate(160%)",
            boxShadow: "0 25px 50px -12px rgba(239, 68, 68, 0.25)",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 via-transparent to-transparent" />
          <div className="relative">
            {/* Header */}
            <div className="flex items-center gap-3 p-6 pb-4">
              <div className="p-2 rounded-full bg-red-500/20">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-red-200">{title}</h3>
              <button onClick={onClose} className="ml-auto p-1 rounded-full hover:bg-red-500/20 transition-colors">
                <X className="h-5 w-5 text-red-400" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 pb-6">
              <p className="text-red-300 mb-4">{message}</p>
              {rejectedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-red-200">Αρχεία που απορρίφθηκαν:</p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {rejectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-red-500/10 rounded-lg border border-red-500/20"
                      >
                        <FileX className="h-4 w-4 text-red-400 flex-shrink-0" />
                        <span className="text-sm text-red-300 truncate">{file.name}</span>
                        <span className="text-xs text-red-400 ml-auto">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="w-full mt-4 px-4 py-2 bg-red-600/20 text-red-200 rounded-xl hover:bg-red-600/30 transition-colors font-medium border border-red-500/30"
              >
                Κατανοητό
              </motion.button>
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl shadow-2xl border border-green-500/30"
          style={{
            background: "rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(20px) saturate(160%)",
            WebkitBackdropFilter: "blur(20px) saturate(160%)",
            boxShadow: "0 25px 50px -12px rgba(34, 197, 94, 0.25)",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-600/10 via-transparent to-transparent" />
          <div className="relative">
            {/* Header */}
            <div className="flex items-center gap-3 p-6 pb-4">
              <div className="p-2 rounded-full bg-green-500/20">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-green-200">{title}</h3>
              <button onClick={onClose} className="ml-auto p-1 rounded-full hover:bg-green-500/20 transition-colors">
                <X className="h-5 w-5 text-green-400" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 pb-6">
              <p className="text-green-300 mb-4">{message}</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="w-full px-4 py-2 bg-green-600/20 text-green-200 rounded-xl hover:bg-green-600/30 transition-colors font-medium border border-green-500/30"
              >
                Τέλεια!
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ---------- Edit Modal Component ---------- */
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl border border-zinc-700/50"
          style={{
            background: "rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(20px) saturate(160%)",
            WebkitBackdropFilter: "blur(20px) saturate(160%)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-600/10 via-transparent to-transparent" />
          <div className="relative">
            {/* Header */}
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

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6 space-y-6">
              {/* Title Field */}
              <Field label="Τίτλος" value={editTitle} onChange={setEditTitle} />

              {/* Description Field */}
              <Field label="Περιγραφή" textarea value={editDesc} onChange={setEditDesc} />

              {/* Images Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-zinc-300">Εικόνες ({totalImages})</label>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-700/50 text-zinc-300 rounded-lg hover:bg-zinc-600/50 transition-colors border border-zinc-600/50"
                  >
                    <Upload className="h-4 w-4" />
                    Προσθήκη εικόνων
                  </motion.button>
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

                {/* Existing Images */}
                {editImages.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-zinc-400">Υπάρχουσες εικόνες</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
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

                {/* New Images */}
                {newThumbs.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-zinc-400">Νέες εικόνες</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
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

                {totalImages === 0 && (
                  <div className="text-center py-8 text-zinc-400">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2 text-zinc-500" />
                    <p>Δεν υπάρχουν εικόνες. Προσθέστε τουλάχιστον μία εικόνα.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-700/50">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 text-zinc-300 hover:bg-zinc-700/50 rounded-xl transition-colors border border-zinc-600/50"
              >
                <RotateCcw className="h-4 w-4" />
                Ακύρωση
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
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
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

const EditImageThumb = ({ src, index, onRemove, type }) => (
  <div className="group relative aspect-square overflow-hidden rounded-xl bg-zinc-800 border border-zinc-700/50">
    <img src={src || "/placeholder.svg"} alt={`Εικόνα ${index}`} className="h-full w-full object-cover" />
    {/* Type indicator */}
    <div
      className={`absolute top-2 left-2 px-2 py-1 rounded-md text-xs font-medium ${
        type === "new"
          ? "bg-green-500/20 text-green-300 border border-green-500/30"
          : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
      }`}
    >
      {type === "new" ? "Νέα" : "Υπάρχουσα"}
    </div>
    {/* Remove button */}
    <button
      onClick={onRemove}
      className="absolute right-2 top-2 p-1.5 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600"
    >
      <X className="h-3 w-3" />
    </button>
    {/* Hover overlay */}
    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
  </div>
)

/* ---------- Helper Screens ---------- */
const LoaderScreen = () => (
  <div className="relative min-h-screen text-gray-100">
    <BaseBackground />
    <AthleticBackground />
    <TrainerMenu />
    <div className="relative z-10 flex items-center justify-center h-[75vh]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-6 p-8 rounded-3xl border border-zinc-700/50"
        style={{
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
        }}
      >
        <div className="relative">
          <Loader2 className="h-12 w-12 animate-spin text-zinc-400" />
          <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full bg-zinc-400/20" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-zinc-100">Φόρτωση</h3>
          <p className="text-zinc-400">Προετοιμασία του περιεχομένου...</p>
        </div>
      </motion.div>
    </div>
  </div>
)

const DeniedScreen = () => (
  <div className="relative min-h-screen text-gray-100">
    <BaseBackground />
    <AthleticBackground />
    <TrainerMenu />
    <div className="relative z-10 flex items-center justify-center h-[75vh]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center p-8 rounded-3xl max-w-md border border-red-500/30"
        style={{
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          boxShadow: "0 8px 32px rgba(220, 38, 38, 0.2)",
        }}
      >
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-red-400 mb-2">Δεν έχετε πρόσβαση</h2>
        <p className="text-red-300">Δεν είστε εξουσιοδοτημένοι να δείτε αυτή τη σελίδα.</p>
      </motion.div>
    </div>
  </div>
)

/* ---------- Main Component ---------- */
export default function TrainerPostsPage() {
  const navigate = useNavigate()
  const { profile, profileLoaded, session } = useAuth()
  const uid = session?.user?.id

  /* Remote data */
  const [allPosts, setAllPosts] = useState([])
  const [visible, setVisible] = useState(INITIAL_SHOW)

  /* Composer state */
  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [files, setFiles] = useState([])
  const [thumbs, setThumbs] = useState([])
  const [busy, setBusy] = useState(false)

  /* Preview + viewer */
  const [previewOpen, setPreview] = useState(false)
  const [viewer, setViewer] = useState({ open: false, imgs: [], idx: 0 })

  /* Post detail view */
  const [detailView, setDetailView] = useState({ open: false, post: null })

  /* Edit state */
  const [editModal, setEditModal] = useState({ open: false, post: null })

  /* Popup states */
  const [errorPopup, setErrorPopup] = useState({ open: false, title: "", message: "", rejectedFiles: [] })
  const [successPopup, setSuccessPopup] = useState({ open: false, title: "", message: "" })

  const fileInput = useRef(null)

  /* Guards */
  const [isLoaded, setIsLoaded] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    setIsLoaded(profileLoaded)
    setIsAuthorized(!!uid && profile.role === "trainer")
  }, [profileLoaded, uid, profile])

  /* Initial fetch */
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

  /* Lazy-load observer */
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

  /* Choose ≤1 MB files */
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

  /* Submit */
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

  /* Edit Post */
  const handleEditPost = async ({ title, description, existingImages, newFiles }) => {
    try {
      // Upload new files
      const newUrls = []
      for (const f of newFiles) {
        const ext = f.name.split(".").pop()
        const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabase.storage.from("post-images").upload(path, f)
        if (error) throw error
        newUrls.push(supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl)
      }

      // Combine existing and new images
      const allImages = [...existingImages, ...newUrls]

      // Update post
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

      // Update local state
      setAllPosts((posts) => posts.map((p) => (p.id === editModal.post.id ? { ...data, _animate: true } : p)))

      setSuccessPopup({
        open: true,
        title: "Επιτυχής ενημέρωση!",
        message: "Η ανάρτησή σας ενημερώθηκε με επιτυχία!",
      })
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

  /* Delete */
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
    setSuccessPopup({
      open: true,
      title: "Διαγραφή επιτυχής",
      message: "Η ανάρτηση διαγράφηκε με επιτυχία.",
    })
  }

  /* Viewer helpers */
  const openViewer = (imgs, idx) => setViewer({ open: true, imgs, idx })
  const closeViewer = () => setViewer({ open: false, imgs: [], idx: 0 })

  /* Edit helpers */
  const openEditModal = (post) => setEditModal({ open: true, post })
  const closeEditModal = () => setEditModal({ open: false, post: null })

  /* Detail view helpers */
  const openDetailView = (post) => setDetailView({ open: true, post })
  const closeDetailView = () => setDetailView({ open: false, post: null })

  /* Navigate to post detail page */
  const navigateToPost = (post) => {
    closeDetailView()
    navigate(`/post/${post.id}`)
  }

  /* Preview object */
  const previewPost = {
    id: "preview",
    title,
    description: desc,
    image_urls: thumbs,
    created_at: new Date().toISOString(),
  }

  /* UI */
  return (
    <div className="relative min-h-screen text-gray-100">
      <BaseBackground />
      <AthleticBackground />
      <TrainerMenu />

      {/* Custom Popups */}
      <ErrorPopup
        open={errorPopup.open}
        onClose={() => setErrorPopup({ open: false, title: "", message: "", rejectedFiles: [] })}
        title={errorPopup.title}
        message={errorPopup.message}
        rejectedFiles={errorPopup.rejectedFiles}
      />

      <SuccessPopup
        open={successPopup.open}
        onClose={() => setSuccessPopup({ open: false, title: "", message: "" })}
        title={successPopup.title}
        message={successPopup.message}
      />

      {/* Edit Modal */}
      <EditPostModal open={editModal.open} post={editModal.post} onClose={closeEditModal} onSave={handleEditPost} />

      {/* Preview modal */}
      <PostPreviewModal open={previewOpen} post={previewPost} onClose={() => setPreview(false)} />

      {/* Detail View Modal */}
      <PostPreviewModal
        open={detailView.open}
        post={detailView.post}
        onClose={closeDetailView}
        onViewDetails={navigateToPost}
      />

      {/* Enhanced Viewer */}
      {viewer.open && <EnhancedViewer imgs={viewer.imgs} idx={viewer.idx} onClose={closeViewer} />}

      {isLoaded && !isAuthorized ? (
        <DeniedScreen />
      ) : (
        <main className="relative z-10 mx-auto max-w-6xl space-y-8 px-4 py-8">
          {/* Creator Section */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <GlassCard className="p-8" hover>
              {/* Background decoration */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-600/5 rounded-full blur-2xl" />
              </div>

              <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30">
                    <Camera className="h-6 w-6 text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-zinc-100">Δημιουργία νέας ανάρτησης</h2>
                </div>

                <form onSubmit={createPost} className="space-y-6">
                  <Field label="Τίτλος" value={title} onChange={setTitle} />
                  <Field label="Περιγραφή" textarea value={desc} onChange={setDesc} />

                  {/* Enhanced Drop Zone */}
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-zinc-300">Εικόνες</label>
                    <label
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault()
                        addFiles(e.dataTransfer.files)
                      }}
                      className="group relative flex h-48 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-zinc-600/50 transition-all duration-300 hover:border-zinc-500/70 hover:bg-zinc-800/20"
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
                        <div className="p-4 rounded-full bg-zinc-800/50 group-hover:bg-zinc-700/50 transition-colors mb-4 border border-zinc-700/50">
                          <Upload className="h-8 w-8" />
                        </div>
                        <p className="text-lg font-medium mb-1">Σύρετε εικόνες εδώ ή κάντε κλικ για επιλογή</p>
                        <p className="text-sm text-zinc-500">Υποστήριξη πολλαπλών εικόνων • Μέγιστο 1MB η κάθε μία</p>
                      </div>
                    </label>
                  </div>

                  {/* Enhanced Thumbnails */}
                  {!!thumbs.length && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-zinc-100 flex items-center gap-2">
                          <Layers className="h-5 w-5 text-blue-400" />
                          Επιλεγμένες εικόνες ({thumbs.length})
                        </h3>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => setPreview(true)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-700/50 text-zinc-300 hover:bg-zinc-600/50 transition-all duration-200 border border-zinc-600/50"
                        >
                          <Eye className="h-4 w-4" />
                          Προεπισκόπηση
                        </motion.button>
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

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={busy}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-zinc-100 font-medium transition-all duration-300 hover:from-blue-500/30 hover:to-purple-500/30 hover:shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-500/30"
                  >
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
                  </motion.button>
                </form>
              </div>
            </GlassCard>
          </motion.section>

          {/* Posts Feed */}
          {allPosts.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
              >
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
              </motion.section>
              {visible < allPosts.length && <div id="lazy-sentinel" className="h-10" />}
            </>
          )}
        </main>
      )}

      {!isLoaded && <LoaderScreen />}
    </div>
  )
}

/* ---------- Enhanced Components ---------- */
const Field = ({ label, textarea = false, value, onChange }) => (
  <div className="relative">
    {textarea ? (
      <textarea
        className="w-full h-32 px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-zinc-100 placeholder-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 backdrop-blur-xl"
        placeholder={`Εισάγετε ${label.toLowerCase()}...`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    ) : (
      <input
        className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 backdrop-blur-xl"
        placeholder={`Εισάγετε ${label.toLowerCase()}...`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )}
    <label className="absolute -top-2 left-3 px-2 bg-zinc-900/80 text-xs font-medium text-zinc-400 backdrop-blur-sm rounded">
      {label}
    </label>
  </div>
)

const EnhancedThumb = ({ src, index, total, onOpen, onRemove }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: index * 0.05 }}
    className="group relative aspect-square overflow-hidden rounded-xl bg-zinc-800 border border-zinc-700/50"
  >
    <img
      src={src || "/placeholder.svg"}
      alt={`Εικόνα ${index}`}
      className="h-full w-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-110"
      onClick={onOpen}
    />
    {/* Image counter */}
    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded-md text-xs text-white font-medium backdrop-blur-sm">
      {index}/{total}
    </div>
    {/* Remove button */}
    <button
      onClick={onRemove}
      className="absolute right-2 top-2 p-1.5 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600"
    >
      <X className="h-3 w-3" />
    </button>
    {/* Hover overlay */}
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
  }, [i])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      >
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
          {/* Image counter */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-black/70 rounded-full text-white text-sm font-medium backdrop-blur-sm">
            {i + 1} / {imgs.length}
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="absolute right-8 top-8 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all duration-200 backdrop-blur-sm"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Navigation */}
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
      transition={{ delay: index * 0.1, duration: 0.6 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className={`group relative overflow-hidden rounded-3xl transition-all duration-500 ${post._animate ? "animate-pulse" : ""}`}
    >
      <GlassCard hover className="overflow-hidden">
        {/* Action buttons */}
        <div className="absolute right-4 top-4 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onEdit(post)}
            className="p-2 rounded-full bg-black/50 text-white hover:bg-blue-600 transition-colors backdrop-blur-sm"
            title="Επεξεργασία"
          >
            <Edit3 className="h-4 w-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onDelete(post.id)}
            className="p-2 rounded-full bg-black/50 text-white hover:bg-red-600 transition-colors backdrop-blur-sm"
            title="Διαγραφή"
          >
            <Trash2 className="h-4 w-4" />
          </motion.button>
        </div>

        {/* Image with multiple indicator */}
        <div className="relative aspect-[4/3] overflow-hidden cursor-pointer" onClick={() => onViewDetails(post)}>
          <img
            src={imgs[0] || "/placeholder.svg"}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          {/* Multiple images indicator */}
          {hasMultipleImages && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1 px-3 py-1.5 bg-black/70 rounded-full text-white text-sm font-medium backdrop-blur-sm">
              <Grid3X3 className="h-4 w-4" />
              {imgs.length}
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 cursor-pointer" onClick={() => onViewDetails(post)}>
          <h3 className="text-lg font-bold text-zinc-100 line-clamp-2 group-hover:text-zinc-300 transition-colors">
            {post.title || "Χωρίς τίτλο"}
          </h3>
          <p className="text-zinc-300 text-sm leading-relaxed line-clamp-3">
            {post.description || "Δεν υπάρχει περιγραφή."}
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-zinc-700/50">
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
      </GlassCard>
    </motion.article>
  )
}

const EmptyState = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3 }}
    className="flex flex-col items-center justify-center py-20 text-center"
  >
    <GlassCard className="p-12 max-w-md mx-auto">
      <div className="p-6 rounded-full bg-zinc-800/50 mb-6 inline-block border border-zinc-700/50">
        <ImageIcon className="h-12 w-12 text-zinc-400" />
      </div>
      <h3 className="text-xl font-semibold text-zinc-100 mb-2">Δεν υπάρχουν ακόμη αναρτήσεις</h3>
      <p className="text-zinc-400 max-w-md">
        Ξεκινήστε να μοιράζεστε το περιεχόμενό σας με το κοινό σας δημιουργώντας την πρώτη σας ανάρτηση παραπάνω.
      </p>
    </GlassCard>
  </motion.div>
)
