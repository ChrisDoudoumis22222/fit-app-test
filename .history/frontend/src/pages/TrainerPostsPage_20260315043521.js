"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  PlusCircle,
  ImageIcon,
  X,
  CalendarDays,
  AlertTriangle,
  FileX,
} from "lucide-react"
import { supabase } from "../supabaseClient"
import { useAuth } from "../AuthProvider"
import TrainerMenu from "../components/TrainerMenu"
import PostPreviewModal from "../components/posts/PostPreviewModal"
import CreatePostModal from "../components/posts/CreatePostModal"
import EnhancedPostCard from "../components/posts/EnhancedPostCard"
import EditPostModal from "../components/posts/EditPostModal"
import DeletePostModal from "../components/posts/DeletePostModal"

/* -------------------- constants -------------------- */
const INITIAL_SHOW = 6
const BATCH_SIZE = 6

/* -------------------- popups -------------------- */
const ErrorPopup = ({ open, onClose, title, message, rejectedFiles = [] }) => {
  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
      >
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
              <button
                type="button"
                onClick={onClose}
                className="ml-auto p-1 rounded-full hover:bg-red-500/20 transition-colors"
              >
                <X className="h-5 w-5 text-red-400" />
              </button>
            </div>

            <div className="px-6 pb-6">
              <p className="text-red-300 mb-4">{message}</p>

              {rejectedFiles.length > 0 && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {rejectedFiles.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 bg-red-500/10 rounded-lg border border-red-500/20"
                    >
                      <FileX className="h-4 w-4 text-red-400" />
                      <span className="text-sm text-red-300 truncate">
                        {file.name}
                      </span>
                      <span className="text-xs text-red-400 ml-auto">
                        {(file.size / 1024 / 1024).toFixed(1)}MB
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full mt-4 px-4 py-2 bg-red-600/20 text-red-200 rounded-xl hover:bg-red-600/30 transition-colors font-medium border border-red-500/30"
              >
                Κατανοητό
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/* -------------------- empty state -------------------- */
const EmptyState = ({ onCreate }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2 }}
    className="flex flex-col items-center justify-center py-0 sm:py-10 md:py-16 text-center"
  >
    <div
      className="
        w-full
        sm:mx-auto sm:rounded-3xl sm:border sm:border-white/10
        sm:bg-gradient-to-b sm:from-zinc-900/60 sm:to-black/60 sm:backdrop-blur-xl
        p-0 sm:p-10 md:p-12 lg:p-16 xl:p-20
        w-full max-w-none
      "
    >
      <div className="inline-block mb-6 md:mb-8 p-6 md:p-7 rounded-full bg-zinc-800/50 border border-white/10">
        <ImageIcon className="h-12 w-12 md:h-16 md:w-16 text-zinc-400" />
      </div>

      <h3 className="text-xl md:text-2xl lg:text-3xl font-semibold text-zinc-100 mb-2 md:mb-3">
        Δεν έχεις ακόμη αναρτήσεις
      </h3>

      <p className="text-zinc-400 leading-relaxed md:text-lg lg:text-xl md:leading-8 mb-6 md:mb-8 max-w-2xl mx-auto">
        Ανέβασε την πρώτη σου ανάρτηση για να δείξεις στους πελάτες σου τι
        ετοιμάζεις και να παραμείνεις σε επαφή με το κοινό σου.
      </p>

      <button
        type="button"
        onClick={onCreate}
        className="
          inline-flex items-center gap-2
          px-5 py-3 md:px-6 md:py-3.5 lg:px-8 lg:py-4
          rounded-2xl bg-white text-black hover:bg-zinc-100 transition
          text-base md:text-lg lg:text-xl font-medium
        "
      >
        <PlusCircle className="h-5 w-5 md:h-6 md:w-6" />
        Δημιούργησε ανάρτηση
      </button>
    </div>
  </motion.div>
)

/* ================================ PAGE ================================ */
export default function TrainerPostsPage() {
  const navigate = useNavigate()
  const { profile, profileLoaded, session } = useAuth()
  const uid = session?.user?.id

  const [allPosts, setAllPosts] = useState([])
  const [visible, setVisible] = useState(INITIAL_SHOW)

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [detailView, setDetailView] = useState({ open: false, post: null })
  const [editModal, setEditModal] = useState({ open: false, post: null })
  const [deleteModal, setDeleteModal] = useState({ open: false, post: null })
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [errorPopup, setErrorPopup] = useState({
    open: false,
    title: "",
    message: "",
    rejectedFiles: [],
  })

  const [isLoaded, setIsLoaded] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    setIsLoaded(profileLoaded)
    setIsAuthorized(!!uid && profile?.role === "trainer")
  }, [profileLoaded, uid, profile])

  useEffect(() => {
    if (!isLoaded || !isAuthorized) return

    ;(async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("trainer_id", uid)
        .order("created_at", { ascending: false })

      if (error) {
        setErrorPopup({
          open: true,
          title: "Σφάλμα φόρτωσης",
          message:
            "Δεν ήταν δυνατή η φόρτωση των αναρτήσεων. Παρακαλώ δοκιμάστε ξανά.",
          rejectedFiles: [],
        })
      } else {
        setAllPosts(data || [])
      }
    })()
  }, [isLoaded, isAuthorized, uid])

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

  const openComposer = useCallback(() => {
    setCreateModalOpen(true)
  }, [])

  const handleEditPost = async ({
    title,
    description,
    existingImages,
    newFiles,
  }) => {
    try {
      if (!editModal.post || editModal.post.trainer_id !== uid) {
        setErrorPopup({
          open: true,
          title: "Δεν επιτρέπεται",
          message:
            "Δεν μπορείτε να επεξεργαστείτε ανάρτηση άλλου προπονητή.",
          rejectedFiles: [],
        })
        throw new Error("not-owned")
      }

      const newUrls = []

      for (const f of newFiles) {
        const ext = f.name.split(".").pop()
        const path = `${uid}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${ext}`

        const { error } = await supabase.storage
          .from("post-images")
          .upload(path, f)

        if (error) throw error

        newUrls.push(
          supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl,
        )
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
        .eq("trainer_id", uid)
        .select("*")
        .maybeSingle()

      if (error || !data) throw error || new Error("update failed")

      setAllPosts((posts) =>
        posts.map((p) =>
          p.id === editModal.post.id ? { ...data, _animate: true } : p,
        ),
      )

      if (detailView.post?.id === editModal.post.id) {
        setDetailView({ open: true, post: { ...data, _animate: true } })
      }

      setEditModal({ open: false, post: null })
    } catch (err) {
      if (String(err?.message).includes("not-owned")) return

      setErrorPopup({
        open: true,
        title: "Σφάλμα ενημέρωσης",
        message:
          "Δεν ήταν δυνατή η ενημέρωση της ανάρτησης. Παρακαλώ δοκιμάστε ξανά.",
        rejectedFiles: [],
      })

      throw err
    }
  }

  const openDeleteModal = useCallback(
    (idOrPost) => {
      const post =
        typeof idOrPost === "object" && idOrPost !== null
          ? idOrPost
          : allPosts.find((p) => p.id === idOrPost)

      if (!post) return

      setDeleteModal({ open: true, post })
    },
    [allPosts],
  )

  const closeDeleteModal = useCallback(() => {
    if (deleteLoading) return
    setDeleteModal({ open: false, post: null })
  }, [deleteLoading])

  const confirmDeletePost = useCallback(async () => {
    const post = deleteModal.post
    if (!post) return

    if (!post || post.trainer_id !== uid) {
      setDeleteModal({ open: false, post: null })
      setErrorPopup({
        open: true,
        title: "Δεν επιτρέπεται",
        message: "Δεν μπορείτε να διαγράψετε ανάρτηση άλλου προπονητή.",
        rejectedFiles: [],
      })
      return
    }

    try {
      setDeleteLoading(true)

      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", post.id)
        .eq("trainer_id", uid)

      if (error) throw error

      setAllPosts((prev) => prev.filter((x) => x.id !== post.id))

      if (detailView.post?.id === post.id) {
        setDetailView({ open: false, post: null })
      }

      if (editModal.post?.id === post.id) {
        setEditModal({ open: false, post: null })
      }

      setDeleteModal({ open: false, post: null })
    } catch (error) {
      setErrorPopup({
        open: true,
        title: "Σφάλμα διαγραφής",
        message:
          "Δεν ήταν δυνατή η διαγραφή της ανάρτησης. Παρακαλώ δοκιμάστε ξανά.",
        rejectedFiles: [],
      })
    } finally {
      setDeleteLoading(false)
    }
  }, [deleteModal.post, uid, detailView.post, editModal.post])

  const openEditModal = (post) => setEditModal({ open: true, post })
  const closeEditModal = () => setEditModal({ open: false, post: null })

  const openDetailView = (post) => setDetailView({ open: true, post })
  const closeDetailView = () => setDetailView({ open: false, post: null })

  const navigateToPost = (post) => {
    closeDetailView()
    navigate(`/post/${post.id}`)
  }

  return (
    <div className="relative min-h-screen text-gray-100">
      <style>{`
        :root { --side-w: 0px; --nav-h: 0px; }
        @media (min-width: 640px){ :root { --nav-h: 72px; } }
        @media (min-width: 1024px){ :root { --side-w: 280px; --nav-h: 0px; } }
        @media (min-width: 1280px){ :root { --side-w: 320px; } }

        @property --angle { syntax: "<angle>"; inherits: false; initial-value: 0deg; }
        @keyframes halo-spin { to { --angle: 360deg; } }
        .halo { position: relative; isolation: isolate; }
        .halo::before {
          content: "";
          position: absolute;
          inset: -3px;
          border-radius: inherit;
          padding: 3px;
          background: conic-gradient(from var(--angle),
            rgba(255,255,255,0.92) 0%,
            rgba(190,190,190,0.28) 18%,
            rgba(255,255,255,0.92) 36%,
            rgba(190,190,190,0.28) 54%,
            rgba(255,255,255,0.92) 72%,
            rgba(190,190,190,0.28) 90%,
            rgba(255,255,255,0.92) 100%);
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: halo-spin 8s linear infinite;
          opacity: 0.85;
          z-index: -1;
          pointer-events: none;
        }
        .halo::after {
          content: "";
          position: absolute;
          inset: -12px;
          border-radius: inherit;
          background: radial-gradient(closest-side, rgba(255,255,255,0.18), rgba(255,255,255,0.06) 40%, transparent 70%);
          filter: blur(8px);
          z-index: -2;
          pointer-events: none;
        }
      `}</style>

      <div className="fixed inset-0 -z-50 bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      <TrainerMenu />

      <ErrorPopup
        open={errorPopup.open}
        onClose={() =>
          setErrorPopup({
            open: false,
            title: "",
            message: "",
            rejectedFiles: [],
          })
        }
        title={errorPopup.title}
        message={errorPopup.message}
        rejectedFiles={errorPopup.rejectedFiles}
      />

      <DeletePostModal
        open={deleteModal.open}
        onClose={closeDeleteModal}
        onConfirm={confirmDeletePost}
        loading={deleteLoading}
        postTitle={deleteModal.post?.title || ""}
      />

      <CreatePostModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        uid={uid}
        onCreated={(newPost) => {
          setAllPosts((prev) => [newPost, ...prev])
        }}
        onError={({ title, message, rejectedFiles = [] }) =>
          setErrorPopup({
            open: true,
            title: title || "Σφάλμα",
            message: message || "Κάτι πήγε στραβά.",
            rejectedFiles,
          })
        }
        onSuccess={() => {}}
      />

      <EditPostModal
        open={editModal.open}
        post={editModal.post}
        onClose={closeEditModal}
        onSave={handleEditPost}
      />

      <PostPreviewModal
        open={detailView.open}
        post={detailView.post}
        onClose={closeDetailView}
        onViewDetails={navigateToPost}
      />

      <div className="relative min-h-screen overflow-x-hidden">
        <div className="lg:pl-[calc(var(--side-w)+8px)] pl-0 pt-0 -mt-4 sm:mt-0 transition-[padding,margin]">
          <main className="mx-auto max-w-7xl w-full px-0 sm:px-6 lg:px-8 pt-2 pb-[120px] space-y-3 sm:space-y-8">
            <motion.header
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative pt-1 sm:pt-0 px-4 sm:px-0"
            >
              <div className="flex flex-col gap-2 sm:gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-1 sm:space-y-2 min-w-0">
                  <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent break-words">
                    Οι Αναρτήσεις μου
                  </h1>

                  <p className="text-sm sm:text-lg text-zinc-300 break-words">
                    Δημιουργία και διαχείριση περιεχομένου
                  </p>

                  <div className="mt-5 sm:mt-0 flex items-center gap-2 text-xs sm:text-sm text-zinc-400">
                   
                    
                  </div>
                </div>

                <div className="hidden lg:flex">
                  <button
                    type="button"
                    onClick={openComposer}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-black hover:bg-zinc-100 transition"
                  >
                    <PlusCircle className="h-5 w-5" />
                    Νέα ανάρτηση
                  </button>
                </div>
              </div>
            </motion.header>

            {allPosts.length === 0 ? (
              <div className="px-4 sm:px-0">
                <EmptyState onCreate={openComposer} />
              </div>
            ) : (
              <>
                <div className="lg:hidden px-4 sm:px-0">
                  <button
                    type="button"
                    onClick={openComposer}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white text-black hover:bg-zinc-100 transition"
                  >
                    <PlusCircle className="h-5 w-5" />
                    Νέα ανάρτηση
                  </button>
                </div>

                <section className="grid grid-cols-1 gap-5 px-4 sm:px-0 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {allPosts.slice(0, visible).map((p, index) => (
                    <EnhancedPostCard
                      key={p.id}
                      post={p}
                      index={index}
                      onDelete={openDeleteModal}
                      onEdit={openEditModal}
                      onViewDetails={openDetailView}
                    />
                  ))}
                </section>

                {visible < allPosts.length && (
                  <div id="lazy-sentinel" className="h-10" />
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}