"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  MessageCircle,
  MoreVertical,
  Pencil,
  Star,
  Trash2,
} from "lucide-react"

import { supabase } from "../../supabaseClient"
import GuestBookingAuthModalfortrainers from "../guest/GuestBookingAuthModalfortrainers.jsx"
import { Avatar, ScrollReveal } from "./shared.jsx"

function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={[
        "inline-flex items-center justify-center rounded-2xl px-5 py-3",
        "bg-zinc-100 text-zinc-950 font-semibold",
        "transition-all duration-200 hover:bg-white",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  )
}

function SecondaryButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={[
        "inline-flex items-center justify-center rounded-2xl px-5 py-3",
        "border border-zinc-700 bg-zinc-900/70 text-zinc-100 font-medium",
        "transition-all duration-200 hover:border-zinc-600 hover:bg-zinc-800/80",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  )
}

function DangerButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={[
        "inline-flex items-center justify-center rounded-2xl px-5 py-3",
        "bg-red-600 text-white font-semibold",
        "transition-all duration-200 hover:bg-red-500",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  )
}

function StaticStars({ value = 0, size = "h-4 w-4", className = "" }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${size} ${star <= value ? "fill-current text-yellow-400" : "text-zinc-700"}`}
        />
      ))}
    </div>
  )
}

function RatingInput({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="rounded-xl p-1 transition-transform hover:scale-105"
        >
          <Star
            className={`h-6 w-6 ${
              star <= value ? "fill-current text-yellow-400" : "text-zinc-600"
            }`}
          />
        </button>
      ))}
    </div>
  )
}

function DeleteReviewModal({
  open,
  review,
  deleting,
  onClose,
  onConfirm,
}) {
  return (
    <AnimatePresence>
      {open && review ? (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md rounded-[28px] border border-zinc-800 bg-zinc-950 p-5 shadow-2xl sm:p-6"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 ring-1 ring-red-500/20">
              <Trash2 className="h-6 w-6 text-red-300" />
            </div>

            <h3 className="text-xl font-bold text-zinc-100 sm:text-2xl">
              Διαγραφή κριτικής
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-zinc-400 sm:text-base">
              Θέλεις σίγουρα να διαγράψεις την κριτική σου;
            </p>

            {review.comment ? (
              <div className="mt-4 rounded-2xl border border-zinc-800 bg-black/30 p-4">
                <p className="line-clamp-4 whitespace-pre-wrap text-sm text-zinc-300">
                  {review.comment}
                </p>
              </div>
            ) : null}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <SecondaryButton onClick={onClose} disabled={deleting} className="w-full">
                Ακύρωση
              </SecondaryButton>

              <DangerButton onClick={onConfirm} disabled={deleting} className="w-full">
                {deleting ? "Διαγραφή..." : "Διαγραφή"}
              </DangerButton>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default function ReviewsSection({ trainerId, session, onReviewMutated }) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ rating: 5, comment: "" })
  const [editingReviewId, setEditingReviewId] = useState(null)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [deleteConfirmReview, setDeleteConfirmReview] = useState(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)

  const menuRef = useRef(null)
  const userId = session?.user?.id || null

  const currentPath = useMemo(() => {
    if (typeof window === "undefined") return "/"
    return `${window.location.pathname}${window.location.search}${window.location.hash}`
  }, [])

  const fetchReviews = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("trainer_reviews")
        .select(`
          id,
          user_id,
          rating,
          comment,
          created_at,
          user:profiles!trainer_reviews_user_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq("trainer_id", trainerId)
        .order("created_at", { ascending: false })
        .limit(10)

      if (error) throw error
      setReviews((data || []).slice(0, 10))
    } catch (err) {
      console.error("Error fetching reviews:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!trainerId) return
    fetchReviews()
  }, [trainerId])

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  const myReview = useMemo(
    () => reviews.find((review) => review.user_id === userId) || null,
    [reviews, userId],
  )

  const avgRating = useMemo(() => {
    if (!reviews.length) return 0
    return reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
  }, [reviews])

  const openGuestAuthModal = () => {
    setAuthModalOpen(true)
  }

  const openCreateOrEdit = () => {
    if (!userId) {
      openGuestAuthModal()
      return
    }

    if (myReview) {
      setEditingReviewId(myReview.id)
      setForm({
        rating: Number(myReview.rating || 5),
        comment: myReview.comment || "",
      })
    } else {
      setEditingReviewId(null)
      setForm({ rating: 5, comment: "" })
    }

    setDeleteConfirmReview(null)
    setOpenMenuId(null)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!userId) {
      openGuestAuthModal()
      return
    }

    const payload = {
      trainer_id: trainerId,
      user_id: userId,
      rating: Number(form.rating),
      comment: String(form.comment || "").trim(),
    }

    setSubmitting(true)

    try {
      if (editingReviewId) {
        const { error } = await supabase
          .from("trainer_reviews")
          .update({
            rating: payload.rating,
            comment: payload.comment,
          })
          .eq("id", editingReviewId)
          .eq("user_id", userId)

        if (error) throw error
      } else {
        const { error } = await supabase.from("trainer_reviews").insert(payload)
        if (error) throw error
      }

      await fetchReviews()
      onReviewMutated?.()

      setShowForm(false)
      setEditingReviewId(null)
      setOpenMenuId(null)
      setDeleteConfirmReview(null)
      setForm({ rating: 5, comment: "" })
    } catch (err) {
      console.error("Error submitting review:", err)
      alert(err.message || "Σφάλμα κατά την αποθήκευση της κριτικής.")
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (review) => {
    setEditingReviewId(review.id)
    setForm({
      rating: Number(review.rating || 5),
      comment: review.comment || "",
    })
    setDeleteConfirmReview(null)
    setOpenMenuId(null)
    setShowForm(true)
  }

  const requestDelete = (review) => {
    setOpenMenuId(null)
    setDeleteConfirmReview(review)
  }

  const confirmDelete = async () => {
    const reviewId = deleteConfirmReview?.id
    if (!reviewId) return

    setDeleting(true)

    try {
      const { error } = await supabase
        .from("trainer_reviews")
        .delete()
        .eq("id", reviewId)
        .eq("user_id", userId)

      if (error) throw error

      await fetchReviews()
      onReviewMutated?.()

      if (editingReviewId === reviewId) {
        setEditingReviewId(null)
        setShowForm(false)
        setForm({ rating: 5, comment: "" })
      }

      setDeleteConfirmReview(null)
      setOpenMenuId(null)
    } catch (err) {
      console.error("Error deleting review:", err)
      alert(err.message || "Σφάλμα κατά τη διαγραφή.")
    } finally {
      setDeleting(false)
    }
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Σήμερα"
    if (diffDays === 1) return "Χθες"
    if (diffDays < 7) return `${diffDays} μέρες πριν`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} εβδομάδες πριν`
    return `${Math.floor(diffDays / 30)} μήνες πριν`
  }

  return (
    <>
      <section id="reviews-section">
        <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen sm:static sm:left-auto sm:right-auto sm:ml-0 sm:mr-0 sm:w-full">
          <div className="px-4 sm:px-0">
            <div className="sm:rounded-[28px] sm:border sm:border-zinc-800 sm:bg-zinc-950/70 sm:backdrop-blur-xl">
              <div className="px-0 py-0 sm:p-6 lg:p-8 xl:p-9">
                <ScrollReveal>
                  <div className="mb-7 flex flex-col gap-4 lg:mb-9 lg:flex-row lg:items-end lg:justify-between">
                    <div className="min-w-0 w-full">
                      <div className="flex items-center justify-between gap-4">
                        <h2 className="text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl lg:text-4xl">
                          Κριτικές
                        </h2>

                        <StaticStars
                          value={reviews.length > 0 ? Math.round(avgRating) : 0}
                          size="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8"
                          className="ml-auto shrink-0 justify-end"
                        />
                      </div>

                      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base lg:text-lg">
                        Αξιολογήσεις και εμπειρίες πελατών από πραγματικές συνεργασίες.
                      </p>
                    </div>
                  </div>
                </ScrollReveal>

                {showForm && (
                  <ScrollReveal>
                    <form
                      onSubmit={handleSubmit}
                      className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 lg:p-6"
                    >
                      <div className="flex flex-col gap-5">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-zinc-300">
                            Βαθμολογία
                          </label>
                          <RatingInput
                            value={form.rating}
                            onChange={(rating) => setForm((prev) => ({ ...prev, rating }))}
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-zinc-300">
                            Σχόλιο
                          </label>
                          <textarea
                            value={form.comment}
                            onChange={(e) => setForm((prev) => ({ ...prev, comment: e.target.value }))}
                            rows={5}
                            className="w-full resize-none rounded-2xl border border-zinc-800 bg-black/30 px-4 py-3 text-zinc-100 outline-none transition-colors focus:border-zinc-600"
                            placeholder="Γράψε την εμπειρία σου..."
                          />
                          <p className="mt-2 text-xs text-zinc-500">
                            Μία καθαρή και σύντομη κριτική βοηθά περισσότερο τους επόμενους χρήστες.
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <PrimaryButton type="submit" disabled={submitting} className="w-full">
                            {submitting
                              ? "Αποθήκευση..."
                              : editingReviewId
                              ? "Ενημέρωση"
                              : "Υποβολή"}
                          </PrimaryButton>

                          <SecondaryButton
                            type="button"
                            className="w-full"
                            onClick={() => {
                              setShowForm(false)
                              setEditingReviewId(null)
                              setOpenMenuId(null)
                              setDeleteConfirmReview(null)
                              setForm({ rating: 5, comment: "" })
                            }}
                          >
                            Ακύρωση
                          </SecondaryButton>
                        </div>
                      </div>
                    </form>
                  </ScrollReveal>
                )}

                {loading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="animate-pulse rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-5"
                      >
                        <div className="mb-3 h-5 w-40 rounded bg-zinc-800/70" />
                        <div className="mb-4 h-4 w-28 rounded bg-zinc-800/60" />
                        <div className="mb-2 h-4 w-full rounded bg-zinc-800/50" />
                        <div className="h-4 w-2/3 rounded bg-zinc-800/50" />
                      </div>
                    ))}
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="py-14 text-center">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 ring-1 ring-zinc-800">
                      <MessageCircle className="h-8 w-8 text-zinc-500" />
                    </div>

                    <h3 className="mb-2 text-2xl font-semibold text-zinc-100">
                      Δεν υπάρχουν κριτικές ακόμη
                    </h3>

                    <p className="mx-auto max-w-xl text-base leading-relaxed text-zinc-400">
                      Γίνε ο πρώτος που θα αφήσει αξιολόγηση.
                    </p>

                    <div className="mt-6 flex justify-center">
                      <PrimaryButton onClick={openCreateOrEdit}>Γράψε κριτική</PrimaryButton>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-0 sm:divide-y sm:divide-zinc-800/70">
                    {reviews.slice(0, 10).map((review, index) => {
                      const isOwner = review.user_id === userId
                      const menuOpen = openMenuId === review.id

                      return (
                        <ScrollReveal key={review.id} delay={index * 0.04}>
                          <div className="relative rounded-2xl border border-zinc-800 bg-zinc-950/65 p-4 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-6">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
                                <Avatar
                                  url={review.user?.avatar_url}
                                  alt={review.user?.full_name || "User"}
                                  className="h-12 w-12 shrink-0"
                                />

                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <h4 className="truncate text-base font-semibold text-zinc-100 lg:text-lg">
                                      {review.user?.full_name || "Χρήστης"}
                                    </h4>

                                    <span className="text-sm text-zinc-500">
                                      {formatDate(review.created_at)}
                                    </span>
                                  </div>

                                  <StaticStars
                                    value={Number(review.rating || 0)}
                                    className="mt-2"
                                  />

                                  {review.comment && (
                                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300 sm:text-base">
                                      {review.comment}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {isOwner && (
                                <div className="relative shrink-0" ref={menuOpen ? menuRef : null}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenMenuId((prev) => (prev === review.id ? null : review.id))
                                    }
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-zinc-900/70 hover:text-white"
                                    aria-label="Περισσότερες επιλογές"
                                  >
                                    <MoreVertical className="h-5 w-5" />
                                  </button>

                                  {menuOpen && (
                                    <div className="absolute right-0 top-12 z-30 w-44 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/95 shadow-2xl backdrop-blur-xl">
                                      <button
                                        type="button"
                                        onClick={() => startEdit(review)}
                                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-zinc-100 transition hover:bg-zinc-900"
                                      >
                                        <Pencil className="h-4 w-4" />
                                        Επεξεργασία
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => requestDelete(review)}
                                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-300 transition hover:bg-zinc-900"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        Διαγραφή
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </ScrollReveal>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <DeleteReviewModal
        open={!!deleteConfirmReview}
        review={deleteConfirmReview}
        deleting={deleting}
        onClose={() => {
          if (deleting) return
          setDeleteConfirmReview(null)
        }}
        onConfirm={confirmDelete}
      />

      <GuestBookingAuthModalfortrainers
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        nextPath={currentPath}
        title="Απαιτείται σύνδεση"
        description="Για να αφήσεις κριτική, πρέπει πρώτα να συνδεθείς ή να δημιουργήσεις λογαριασμό."
      />
    </>
  )
}