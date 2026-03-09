"use client"

import { useState, useEffect, useCallback, useRef, memo } from "react"
import {
  MessageCircle,
  Send,
  Reply,
  MoreHorizontal,
  Trash2,
  Edit3,
  Flag,
  User,
  Clock,
  Loader2,
  ChevronDown,
  AlertTriangle,
  X,
} from "lucide-react"

import { supabase } from "../supabaseClient"
import { useAuth } from "../AuthProvider"

const COMMENTS_PER_PAGE = 10
const REPLIES_PER_PAGE = 5

/* ──────────────────────────────────────────────────────────────────────
   Profanity filtering
   ────────────────────────────────────────────────────────────────────── */

const PROFANITY_GREEK = [
  "μαλακ",
  "μαλακια",
  "μαλακες",
  "γαμω",
  "γαμο",
  "γαμι",
  "γαμωτο",
  "σκατ",
  "σκατα",
  "σκατο",
  "χεστ",
  "πουστ",
  "πουτ",
  "πουτσα",
  "πουτσ",
  "μουν",
  "μουνι",
  "πουταν",
  "τσουλ",
  "ξεκωλ",
  "αρχιδ",
  "ψωλ",
  "καυλ",
  "καβλ",
  "παπαρ",
  "ηλιθ",
  "βλακ",
  "ζωον",
  "καραγκιοζ",
]

const PROFANITY_LATIN = [
  "malak",
  "malaka",
  "malakas",
  "malakia",
  "gamw",
  "gamo",
  "gamise",
  "gamhs",
  "gamhto",
  "gamot",
  "gamoto",
  "skata",
  "skato",
  "xesto",
  "xestes",
  "poutan",
  "poutana",
  "poutanes",
  "poutsa",
  "poutso",
  "poutses",
  "moun",
  "mouni",
  "mounopano",
  "arxid",
  "arhidi",
  "psol",
  "kavl",
  "kavla",
  "kaul",
  "kaula",
  "papar",
  "vlak",
  "zwo",
  "karagioz",
  "karagkioz",
  "fuck",
  "fucking",
  "fucker",
  "motherfucker",
  "mf",
  "wtf",
  "shit",
  "shitty",
  "bitch",
  "asshole",
  "bastard",
  "dick",
  "pussy",
  "cunt",
  "jerk",
  "f*ck",
  "f**k",
  "sh*t",
  "b*tch",
  "a**hole",
  "b@stard",
]

const stripDiacritics = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
const collapseRepeats = (s) => s.replace(/([a-z\u0370-\u03ff])\1{2,}/gi, "$1$1")

const greekToLatin = (s) => {
  const map = {
    α: "a",
    β: "v",
    γ: "g",
    δ: "d",
    ε: "e",
    ζ: "z",
    η: "i",
    θ: "th",
    ι: "i",
    κ: "k",
    λ: "l",
    μ: "m",
    ν: "n",
    ξ: "x",
    ο: "o",
    π: "p",
    ρ: "r",
    σ: "s",
    ς: "s",
    τ: "t",
    υ: "y",
    φ: "f",
    χ: "x",
    ψ: "ps",
    ω: "o",
  }
  return s.replace(/[\u0370-\u03ff]/g, (ch) => map[ch] ?? ch)
}

const cleanSeparators = (s) => s.replace(/[^\p{L}\p{N} ]+/gu, " ")
const squashAllNonAlnum = (s) => s.replace(/[^\p{L}\p{N}]+/gu, "")
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const normalizeGreek = (text) => {
  let s = text.toLowerCase()
  s = stripDiacritics(s)
  s = cleanSeparators(s)
  s = collapseRepeats(s)
  return s
}

const normalizeLatin = (text) => {
  let s = text.toLowerCase()
  s = stripDiacritics(s)
  s = greekToLatin(s)
  s = cleanSeparators(s)
  s = collapseRepeats(s)
  return s
}

const normalizeProfanityTermGreek = (term) =>
  squashAllNonAlnum(normalizeGreek(String(term || "")))

const normalizeProfanityTermLatin = (term) =>
  squashAllNonAlnum(normalizeLatin(String(term || "")))

const NORMALIZED_PROFANITY_GREEK = [
  ...new Set(PROFANITY_GREEK.map(normalizeProfanityTermGreek).filter(Boolean)),
]

const NORMALIZED_PROFANITY_LATIN = [
  ...new Set(PROFANITY_LATIN.map(normalizeProfanityTermLatin).filter(Boolean)),
]

const makeFuzzy = (term) => {
  const safe = squashAllNonAlnum(String(term || "").toLowerCase())
  if (!safe) return null

  const separator = "[^\\p{L}\\p{N}]{0,2}"
  const pattern = safe
    .split("")
    .map((ch) => `${escapeRegex(ch)}+`)
    .join(separator)

  return new RegExp(pattern, "iu")
}

const FUZZY_PROFANITY_GREEK = NORMALIZED_PROFANITY_GREEK.map(makeFuzzy).filter(Boolean)
const FUZZY_PROFANITY_LATIN = NORMALIZED_PROFANITY_LATIN.map(makeFuzzy).filter(Boolean)

const containsProfanity = (text) => {
  const g1 = normalizeGreek(text)
  const g2 = squashAllNonAlnum(g1)
  const l1 = normalizeLatin(text)
  const l2 = squashAllNonAlnum(l1)

  const hitGreek = NORMALIZED_PROFANITY_GREEK.some((t) => g1.includes(t) || g2.includes(t))
  if (hitGreek) return true

  const hitLatin = NORMALIZED_PROFANITY_LATIN.some((t) => l1.includes(t) || l2.includes(t))
  if (hitLatin) return true

  const greekRegexHit = FUZZY_PROFANITY_GREEK.some((rx) => rx.test(g1) || rx.test(g2))
  if (greekRegexHit) return true

  const latinRegexHit = FUZZY_PROFANITY_LATIN.some((rx) => rx.test(l1) || rx.test(l2))
  if (latinRegexHit) return true

  return false
}

/* ──────────────────────────────────────────────────────────────────────
   Popup
   ────────────────────────────────────────────────────────────────────── */

const ProfanityWarningPopup = memo(function ProfanityWarningPopup({ open, onClose }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-orange-400/25 p-6 shadow-2xl"
        style={{
          background: "rgba(8,8,8,0.82)",
          backdropFilter: "blur(22px) saturate(160%)",
          WebkitBackdropFilter: "blur(22px) saturate(160%)",
          boxShadow: "0 25px 60px -20px rgba(251,146,60,0.28)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
          aria-label="Κλείσιμο"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-400/20 bg-orange-500/10">
          <AlertTriangle className="h-6 w-6 text-orange-300" />
        </div>

        <h3 className="mb-2 text-xl font-semibold text-orange-200">Προσοχή</h3>
        <p className="mb-2 text-orange-100/95">
          Συγγνώμη, αλλά δεν επιτρέπεται υβριστικό περιεχόμενο. 😅
        </p>
        <p className="mb-6 text-sm text-orange-200/75">
          Κρατήστε έναν ευγενικό και σεβαστό τόνο στα σχόλιά σας.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-2xl border border-orange-400/20 bg-orange-500/85 px-4 py-3 font-medium text-white transition hover:bg-orange-500"
        >
          Κατάλαβα
        </button>
      </div>
    </div>
  )
})

/* ──────────────────────────────────────────────────────────────────────
   Main
   ────────────────────────────────────────────────────────────────────── */

export default function CommentsSection({
  postId,
  initialCommentsCount = 0,
  onCommentCountUpdate,
}) {
  const { profile } = useAuth()

  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null)
  const [editingComment, setEditingComment] = useState(null)
  const [editText, setEditText] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalComments, setTotalComments] = useState(initialCommentsCount)
  const [expandedReplies, setExpandedReplies] = useState({})
  const [showProfanityWarning, setShowProfanityWarning] = useState(false)

  const loadMoreRef = useRef(null)

  const syncCommentCount = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("posts")
        .select("comments_count")
        .eq("id", postId)
        .single()

      const nextCount = Number(data?.comments_count || 0)
      setTotalComments(nextCount)
      onCommentCountUpdate?.(nextCount)
      return nextCount
    } catch {
      return null
    }
  }, [postId, onCommentCountUpdate])

  const fetchComments = useCallback(
    async (pageToLoad = 1, isInitial = false) => {
      try {
        if (isInitial) {
          setLoading(true)
        }

        await syncCommentCount()

        const rangeEnd = pageToLoad * COMMENTS_PER_PAGE - 1

        const { data, error } = await supabase
          .from("comments")
          .select(`
            *,
            user:profiles!user_id (
              id,
              full_name,
              email,
              avatar_url
            )
          `)
          .eq("post_id", postId)
          .is("parent_id", null)
          .order("created_at", { ascending: false })
          .range(0, rangeEnd)

        if (error) throw error

        const commentsWithReplies = await Promise.all(
          (data || []).map(async (comment) => {
            const { data: replies } = await supabase
              .from("comments")
              .select(`
                *,
                user:profiles!user_id (
                  id,
                  full_name,
                  email,
                  avatar_url
                )
              `)
              .eq("parent_id", comment.id)
              .order("created_at", { ascending: true })
              .limit(REPLIES_PER_PAGE)

            return {
              ...comment,
              replies: replies || [],
              hasMoreReplies: (replies?.length || 0) >= REPLIES_PER_PAGE,
            }
          })
        )

        setComments(commentsWithReplies)
        setCurrentPage(pageToLoad)

        const loadedTopLevel = commentsWithReplies.length
        setHasMore(
          (data?.length || 0) >= COMMENTS_PER_PAGE &&
            loadedTopLevel >= COMMENTS_PER_PAGE * pageToLoad
        )
      } catch (err) {
        console.error("Error fetching comments:", err)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [postId, syncCommentCount]
  )

  useEffect(() => {
    fetchComments(1, true)
  }, [fetchComments])

  const loadMoreComments = useCallback(() => {
    if (loadingMore || !hasMore || loading) return
    setLoadingMore(true)
    const nextPage = currentPage + 1
    fetchComments(nextPage, false)
  }, [currentPage, fetchComments, hasMore, loading, loadingMore])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0]
        if (target.isIntersecting && hasMore && !loadingMore && !loading) {
          loadMoreComments()
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    )

    const node = loadMoreRef.current
    if (node) observer.observe(node)

    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, loadMoreComments])

  const loadMoreReplies = async (commentId) => {
    try {
      const comment = comments.find((c) => c.id === commentId)
      if (!comment) return

      const { data: moreReplies } = await supabase
        .from("comments")
        .select(`
          *,
          user:profiles!user_id (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq("parent_id", commentId)
        .order("created_at", { ascending: true })
        .range(comment.replies.length, comment.replies.length + REPLIES_PER_PAGE - 1)

      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                replies: [...c.replies, ...(moreReplies || [])],
                hasMoreReplies: (moreReplies?.length || 0) >= REPLIES_PER_PAGE,
              }
            : c
        )
      )
    } catch (err) {
      console.error("Error loading more replies:", err)
    }
  }

  const handleSubmitComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim() || !profile?.id) return

    if (containsProfanity(newComment)) {
      setShowProfanityWarning(true)
      return
    }

    setSubmitting(true)

    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          post_id: postId,
          user_id: profile.id,
          content: newComment.trim(),
          parent_id: replyingTo,
        })
        .select(`
          *,
          user:profiles!user_id (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .single()

      if (error) throw error

      if (replyingTo) {
        setComments((prev) =>
          prev.map((comment) =>
            comment.id === replyingTo
              ? {
                  ...comment,
                  replies: [...comment.replies, data],
                }
              : comment
          )
        )
        setExpandedReplies((prev) => ({ ...prev, [replyingTo]: true }))
        setReplyingTo(null)
      } else {
        setComments((prev) => [{ ...data, replies: [], hasMoreReplies: false }, ...prev])
      }

      setNewComment("")
      await syncCommentCount()
    } catch (err) {
      console.error("Error submitting comment:", err)
      alert("Σφάλμα κατά την υποβολή του σχολίου")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditComment = async (commentId) => {
    if (!editText.trim()) return

    if (containsProfanity(editText)) {
      setShowProfanityWarning(true)
      return
    }

    try {
      const { error } = await supabase
        .from("comments")
        .update({ content: editText.trim() })
        .eq("id", commentId)

      if (error) throw error

      setComments((prev) =>
        prev.map((comment) => {
          if (comment.id === commentId) {
            return { ...comment, content: editText.trim() }
          }

          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.map((reply) =>
                reply.id === commentId ? { ...reply, content: editText.trim() } : reply
              ),
            }
          }

          return comment
        })
      )

      setEditingComment(null)
      setEditText("")
    } catch (err) {
      console.error("Error editing comment:", err)
      alert("Σφάλμα κατά την επεξεργασία του σχολίου")
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!confirm("Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το σχόλιο;")) return

    try {
      const isTopLevel = comments.some((c) => c.id === commentId)

      const { error } = await supabase.from("comments").delete().eq("id", commentId)
      if (error) throw error

      if (isTopLevel) {
        setComments((prev) => prev.filter((c) => c.id !== commentId))
      } else {
        setComments((prev) =>
          prev.map((c) => ({
            ...c,
            replies: c.replies?.filter((r) => r.id !== commentId) || [],
          }))
        )
      }

      await syncCommentCount()
    } catch (err) {
      console.error("Error deleting comment:", err)
      alert("Σφάλμα κατά τη διαγραφή του σχολίου")
    }
  }

  const formatRelativeTime = (dateString) => {
    const now = new Date()
    const commentDate = new Date(dateString)
    const diffInMinutes = Math.floor((now - commentDate) / (1000 * 60))

    if (diffInMinutes < 1) return "Μόλις τώρα"
    if (diffInMinutes < 60) return `${diffInMinutes} λεπτά πριν`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} ώρες πριν`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} μέρες πριν`

    return commentDate.toLocaleDateString("el-GR")
  }

  if (loading) {
    return (
      <div className="py-6 sm:relative sm:overflow-hidden sm:rounded-3xl sm:border sm:border-white/10 sm:bg-black/40 sm:p-8 sm:shadow-2xl sm:backdrop-blur-xl">
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3 text-white/60">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Φόρτωση σχολίων...</span>
          </div>
        </div>
      </div>
    )
  }

  const remainingCount = Math.max(0, totalComments - comments.length)

  return (
    <>
      <ProfanityWarningPopup
        open={showProfanityWarning}
        onClose={() => setShowProfanityWarning(false)}
      />

      <section className="relative rounded-none border-0 bg-transparent shadow-none sm:overflow-hidden sm:rounded-3xl sm:border sm:border-white/10 sm:bg-black/40 sm:shadow-2xl sm:backdrop-blur-xl">
        <div className="px-0 py-0 sm:p-6 md:p-8">
          {/* Header */}
          <div className="mb-5 flex items-center justify-between gap-3 sm:mb-6 sm:flex-wrap">
            <div className="flex min-w-0 items-center gap-3">
              <div className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 sm:h-11 sm:w-11">
                <MessageCircle className="h-5 w-5 text-white/80" />
              </div>

              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-white sm:text-2xl">Σχόλια</h2>
                <p className="text-xs text-white/45 sm:text-sm">
                  {totalComments} συνολικά
                  {totalComments !== comments.length && (
                    <span className="ml-2 text-white/30 sm:inline">
                      · εμφανίζονται {comments.length}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/60 sm:inline-flex">
              <MessageCircle className="h-4 w-4" />
              {totalComments}
            </div>
          </div>

          {/* Comment Form */}
          {profile?.id ? (
            <form onSubmit={handleSubmitComment} className="mb-7 sm:mb-8">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 sm:h-11 sm:w-11">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url || "/placeholder.svg"}
                      alt={profile.full_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 text-white/35" />
                  )}
                </div>

                <div className="flex-1">
                  {replyingTo && (
                    <div className="mb-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 sm:inline-flex sm:text-sm">
                      <Reply className="h-4 w-4" />
                      <span>Απάντηση σε σχόλιο</span>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white sm:ml-1"
                        aria-label="Ακύρωση απάντησης"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="relative">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={
                        replyingTo ? "Γράψτε την απάντησή σας..." : "Γράψτε ένα σχόλιο..."
                      }
                      className="min-h-[104px] w-full resize-none rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-white/20 focus:bg-black/45 sm:min-h-0 sm:rounded-3xl sm:px-4 sm:py-4 sm:pr-16 sm:text-base"
                      rows={3}
                    />

                    <button
                      type="submit"
                      disabled={!newComment.trim() || submitting}
                      className="absolute bottom-3 right-3 hidden h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white text-black transition hover:scale-[1.02] hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40 sm:inline-flex"
                      aria-label="Αποστολή σχολίου"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={!newComment.trim() || submitting}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40 sm:hidden"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Αποστολή...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Αποστολή σχολίου
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="mb-7 py-3 text-center sm:mb-8 sm:rounded-3xl sm:border sm:border-white/10 sm:bg-white/[0.03] sm:p-5">
              <p className="text-sm text-white/60 sm:text-base">
                Συνδεθείτε για να αφήσετε ένα σχόλιο.
              </p>
            </div>
          )}

          {/* Comments List */}
          {totalComments === 0 ? (
            <div className="py-12 text-center sm:py-14">
              <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-3xl border border-white/10 bg-white/5 sm:h-16 sm:w-16">
                <MessageCircle className="h-6 w-6 text-white/25 sm:h-7 sm:w-7" />
              </div>
              <h3 className="mb-2 text-base font-medium text-white/90 sm:text-lg">
                Δεν υπάρχουν σχόλια ακόμη
              </h3>
              <p className="text-sm text-white/45 sm:text-base">
                Γίνετε ο πρώτος που θα σχολιάσει αυτή την ανάρτηση.
              </p>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-5">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onReply={setReplyingTo}
                  onEdit={(commentItem) => {
                    setEditingComment(commentItem.id)
                    setEditText(commentItem.content)
                  }}
                  onDelete={handleDeleteComment}
                  onLoadMoreReplies={loadMoreReplies}
                  currentUserId={profile?.id}
                  formatRelativeTime={formatRelativeTime}
                  editingComment={editingComment}
                  editText={editText}
                  setEditText={setEditText}
                  handleEditComment={handleEditComment}
                  setEditingComment={setEditingComment}
                  expandedReplies={expandedReplies}
                  setExpandedReplies={setExpandedReplies}
                />
              ))}

              {hasMore && (
                <div ref={loadMoreRef} className="flex justify-center pt-2 sm:pt-4">
                  {loadingMore ? (
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/55">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Φόρτωση περισσότερων...
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={loadMoreComments}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                    >
                      <ChevronDown className="h-4 w-4" />
                      Φόρτωση περισσότερων
                      {remainingCount > 0 ? ` (${remainingCount} ακόμη)` : ""}
                    </button>
                  )}
                </div>
              )}

              {!hasMore && comments.length > 0 && (
                <div className="flex justify-center pt-2 sm:pt-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/45">
                    <MessageCircle className="h-4 w-4" />
                    Έχετε δει όλα τα σχόλια
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  )
}

/* ──────────────────────────────────────────────────────────────────────
   Comment Item
   ────────────────────────────────────────────────────────────────────── */

function CommentItem({
  comment,
  onReply,
  onEdit,
  onDelete,
  onLoadMoreReplies,
  currentUserId,
  formatRelativeTime,
  editingComment,
  editText,
  setEditText,
  handleEditComment,
  setEditingComment,
  expandedReplies = {},
  setExpandedReplies = () => {},
  isReply = false,
}) {
  const [showActions, setShowActions] = useState(false)
  const isOwner = currentUserId === comment.user_id
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowActions(false)
      }
    }

    if (showActions) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showActions])

  const toggleReplies = () => {
    setExpandedReplies((prev) => ({ ...prev, [comment.id]: !prev[comment.id] }))
  }

  return (
    <div
      className={`relative ${
        isReply ? "ml-3 border-l border-white/10 pl-3 sm:ml-12 sm:border-0 sm:pl-0" : ""
      }`}
    >
      <div
        className={`bg-transparent p-0 ${
          !isReply ? "border-b border-white/5 pb-4 sm:border-b-0 sm:pb-0" : ""
        } sm:rounded-3xl sm:border sm:border-white/10 sm:p-4 ${
          isReply ? "sm:bg-white/[0.02]" : "sm:bg-white/[0.03]"
        } sm:backdrop-blur-md`}
      >
        <div className="flex gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 sm:h-10 sm:w-10">
            {comment.user?.avatar_url ? (
              <img
                src={comment.user.avatar_url || "/placeholder.svg"}
                alt={comment.user.full_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-4 w-4 text-white/30 sm:h-5 sm:w-5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-start justify-between gap-2 sm:gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="truncate text-sm font-medium text-white/92">
                    {comment.user?.full_name || comment.user?.email || "Άγνωστος χρήστης"}
                  </span>

                  <span className="inline-flex items-center gap-1 text-[11px] text-white/35 sm:text-xs">
                    <Clock className="h-3 w-3" />
                    {formatRelativeTime(comment.created_at)}
                  </span>
                </div>
              </div>

              <div className="relative flex-shrink-0" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setShowActions((s) => !s)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-transparent text-white/40 transition hover:border-white/10 hover:bg-white/5 hover:text-white sm:h-8 sm:w-8"
                  aria-haspopup="menu"
                  aria-expanded={showActions}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>

                {showActions && (
                  <div
                    className={`absolute right-0 z-[1100] min-w-[170px] overflow-hidden rounded-2xl border border-white/10 bg-black/90 py-1 shadow-2xl backdrop-blur-xl ${
                      isOwner ? "bottom-full mb-2" : "top-full mt-2"
                    }`}
                  >
                    {!isReply && (
                      <button
                        type="button"
                        onClick={() => {
                          onReply(comment.id)
                          setShowActions(false)
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-white/80 transition hover:bg-white/5 hover:text-white"
                      >
                        <Reply className="h-3.5 w-3.5" />
                        Απάντηση
                      </button>
                    )}

                    {isOwner && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            onEdit(comment)
                            setShowActions(false)
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-white/80 transition hover:bg-white/5 hover:text-white"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Επεξεργασία
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onDelete(comment.id)
                            setShowActions(false)
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-rose-300 transition hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Διαγραφή
                        </button>
                      </>
                    )}

                    {!isOwner && (
                      <button
                        type="button"
                        onClick={() => setShowActions(false)}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-white/80 transition hover:bg-white/5 hover:text-white"
                      >
                        <Flag className="h-3.5 w-3.5" />
                        Αναφορά
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {editingComment === comment.id ? (
              <div className="space-y-3">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-black/35 p-3 text-sm text-white outline-none transition focus:border-white/20 sm:text-base"
                  rows={3}
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditComment(comment.id)}
                    className="rounded-xl border border-white/10 bg-white px-3 py-2 text-sm font-medium text-black transition hover:bg-white/90"
                  >
                    Αποθήκευση
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingComment(null)
                      setEditText("")
                    }}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
                  >
                    Ακύρωση
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="whitespace-pre-wrap text-sm leading-6 text-white/75 sm:leading-7">
                  {comment.content}
                </p>

                {!isReply && (
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onReply(comment.id)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/55 transition hover:bg-white/10 hover:text-white"
                    >
                      <Reply className="h-3.5 w-3.5" />
                      Απάντηση
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {!isReply && comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 sm:mt-4">
          <button
            type="button"
            onClick={toggleReplies}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/55 transition hover:bg-white/10 hover:text-white sm:text-sm"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                expandedReplies[comment.id] ? "rotate-180" : ""
              }`}
            />
            {expandedReplies[comment.id] ? "Απόκρυψη" : "Προβολή"} απαντήσεων (
            {comment.replies.length})
          </button>

          {expandedReplies[comment.id] && (
            <div className="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  currentUserId={currentUserId}
                  formatRelativeTime={formatRelativeTime}
                  editingComment={editingComment}
                  editText={editText}
                  setEditText={setEditText}
                  handleEditComment={handleEditComment}
                  setEditingComment={setEditingComment}
                  expandedReplies={expandedReplies}
                  setExpandedReplies={setExpandedReplies}
                  onLoadMoreReplies={onLoadMoreReplies}
                  isReply={true}
                />
              ))}

              {comment.hasMoreReplies && (
                <button
                  type="button"
                  onClick={() => onLoadMoreReplies(comment.id)}
                  className="ml-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/55 transition hover:bg-white/10 hover:text-white sm:ml-12 sm:text-sm"
                >
                  <ChevronDown className="h-4 w-4" />
                  Φόρτωση περισσότερων απαντήσεων
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}