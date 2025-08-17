"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
   Profanity filtering (Greek + Greeklish + within sentences)
   - Handles tonos removal, repeated letters, spaces/punctuation between letters
   - Checks both Greek and transliterated (Greek→Latin) variants
   - Designed to catch phrases like:
     "είσαι μεγάλος μαλάκας", "γαμω εσένα", "m a l a k a s", "gamw esena"
   ────────────────────────────────────────────────────────────────────── */

// Greek stems (no tonos), avoid hate speech against protected classes.
const PROFANITY_GREEK = [
  "μαλακ", "μαλακια", "μαλακες",
  "γαμω", "γαμο", "γαμι", "γαμωτο",
  "σκατ", "σκατα", "σκατο", "χεστ",
  "πουστ", "πουτ", "πουτσα", "πουτσ",
  "μουν", "μουνι",
  "πουταν", "τσουλ", "ξεκωλ",
  "αρχιδ", "ψωλ",
  "καυλ", "καβλ",
  "παπαρ",
  "ηλιθ", "βλακ", "ζωον", "καραγκιοζ",
]

// Greeklish/English stems
const PROFANITY_LATIN = [
  // greeklish
  "malak", "malaka", "malakas", "malakia",
  "gamw", "gamo", "gamise", "gamhs", "gamhto", "gamot", "gamoto",
  "skata", "skato", "xesto", "xestes",
  "poutan", "poutana", "poutanes",
  "poutsa", "poutso", "poutses",
  "moun", "mouni", "mounopano",
  "arxid", "arhidi", "psol",
  "kavl", "kavla", "kaul", "kaula",
  "papar", "vlak", "zwo", "karagioz", "karagkioz",

  // english
  "fuck", "fucking", "fucker", "motherfucker", "mf", "wtf",
  "shit", "shitty", "bitch", "asshole", "bastard", "dick", "pussy", "cunt", "jerk",
  // masked
  "f*ck", "f**k", "sh*t", "b*tch", "a**hole", "b@stard",
]

// Remove tonos/diacritics but keep Greek letters
const stripDiacritics = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

// Collapse ≥3 repeated letters to 2 (μαααλακας → μααλακας)
const collapseRepeats = (s) => s.replace(/([a-z\u0370-\u03ff])\1{2,}/gi, "$1$1")

// Transliterate Greek → Latin (rough, for matching Greeklish)
const greekToLatin = (s) => {
  const map = {
    "α": "a", "β": "v", "γ": "g", "δ": "d", "ε": "e", "ζ": "z", "η": "i", "θ": "th",
    "ι": "i", "κ": "k", "λ": "l", "μ": "m", "ν": "n", "ξ": "x", "ο": "o", "π": "p",
    "ρ": "r", "σ": "s", "ς": "s", "τ": "t", "υ": "y", "φ": "f", "χ": "x", "ψ": "ps", "ω": "o",
  }
  return s.replace(/[\u0370-\u03ff]/g, (ch) => map[ch] ?? ch)
}

// Keep letters/numbers/spaces; turn everything else into space
const cleanSeparators = (s) => s.replace(/[^\p{L}\p{N} ]+/gu, " ")

// Remove all non-alphanumerics (glues words, catches "m a l a k a s")
const squashAllNonAlnum = (s) => s.replace(/[^\p{L}\p{N}]+/gu, "")

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
  s = greekToLatin(s)           // convert any Greek letters to Latin
  s = cleanSeparators(s)
  s = collapseRepeats(s)
  return s
}

const containsProfanity = (text) => {
  // Variants for robust matching
  const g1 = normalizeGreek(text)             // greek, spaces kept
  const g2 = squashAllNonAlnum(g1)            // greek, glued
  const l1 = normalizeLatin(text)             // latinified, spaces kept
  const l2 = squashAllNonAlnum(l1)            // latinified, glued

  // Fast substring checks
  const hitGreek = PROFANITY_GREEK.some((t) => g1.includes(t) || g2.includes(t))
  if (hitGreek) return true
  const hitLatin = PROFANITY_LATIN.some((t) => l1.includes(t) || l2.includes(t))
  if (hitLatin) return true

  // Fuzzy regex (allow tiny gaps like "m a l a k a s" or "γαμω... εσενα")
  const makeFuzzy = (term) => {
    const esc = term.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")
    // allow 0–2 non-letters between letters, and optional duplicate letters
    return new RegExp(
      esc
        .split("")
        .map((ch) => `${ch}+[^\\p{L}\\p{N}]{0,2}`)
        .join("")
        .replace(/[^\\p{L}\\p{N}]{0,2}$/, ""),
      "iu",
    )
  }

  const greekRegexHit = PROFANITY_GREEK.some((t) => makeFuzzy(t).test(g1))
  if (greekRegexHit) return true
  const latinRegexHit = PROFANITY_LATIN.some((t) => makeFuzzy(t).test(l1))
  if (latinRegexHit) return true

  return false
}

// Dark profanity warning popup
const ProfanityWarningPopup = ({ open, onClose }) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl shadow-2xl border border-orange-400/30"
        style={{
          background: "rgba(17,17,17,0.7)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          boxShadow: "0 25px 50px -12px rgba(251, 146, 60, 0.25)",
        }}
      >
        <div className="flex items-center gap-3 p-6 pb-4">
          <div className="p-2 rounded-full bg-orange-500/20">
            <AlertTriangle className="h-6 w-6 text-orange-300" />
          </div>
        </div>
        <div className="px-6 pb-6">
          <h3 className="text-lg font-semibold text-orange-200 mb-2">Προσοχή!</h3>
          <p className="text-orange-200 mb-4">Συγγνώμη, αλλά δεν επιτρέπεται υβριστικό περιεχόμενο. 😅</p>
          <p className="text-orange-300/90 text-sm mb-4">
            Κρατήστε έναν ευγενικό και σεβαστό τόνο στα σχόλιά σας.
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-500 transition-colors font-medium"
          >
            Κατάλαβα!
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CommentsSection({ postId, initialCommentsCount = 0, onCommentCountUpdate }) {
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

  const observerRef = useRef()
  const loadMoreRef = useRef()

  useEffect(() => {
    fetchComments(true)
  }, [postId])

  const fetchComments = async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true)
        setCurrentPage(1)
      }

      const { data: postData } = await supabase.from("posts").select("comments_count").eq("id", postId).single()
      if (postData) {
        const newCount = postData.comments_count || 0
        setTotalComments(newCount)
        onCommentCountUpdate?.(newCount)
      }

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
        .range(0, (isInitial ? 1 : currentPage) * COMMENTS_PER_PAGE - 1)

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
        }),
      )

      if (isInitial) {
        setComments(commentsWithReplies)
      } else {
        setComments((prev) => [...prev, ...commentsWithReplies.slice(prev.length)])
      }

      setHasMore(
        (data?.length || 0) >= COMMENTS_PER_PAGE &&
          (isInitial ? 1 : currentPage) * COMMENTS_PER_PAGE < (postData?.comments_count || 0),
      )
    } catch (err) {
      console.error("Error fetching comments:", err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMoreComments = useCallback(() => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    setCurrentPage((prev) => prev + 1)
    setTimeout(() => {
      fetchComments(false)
    }, 300)
  }, [hasMore, loadingMore])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0]
        if (target.isIntersecting && hasMore && !loadingMore && !loading) {
          loadMoreComments()
        }
      },
      { threshold: 0.1, rootMargin: "100px" },
    )

    const node = loadMoreRef.current
    if (node) observer.observe(node)
    observerRef.current = observer

    return () => observer.disconnect()
  }, [hasMore, loadingMore, loading, loadMoreComments])

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
            : c,
        ),
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
            comment.id === replyingTo ? { ...comment, replies: [...comment.replies, data] } : comment,
          ),
        )
        setReplyingTo(null)
      } else {
        setComments((prev) => [{ ...data, replies: [], hasMoreReplies: false }, ...prev])
        setTotalComments((prev) => prev + 1)
        onCommentCountUpdate?.(totalComments + 1)
      }

      setNewComment("")
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
      const { error } = await supabase.from("comments").update({ content: editText.trim() }).eq("id", commentId)
      if (error) throw error

      setComments((prev) =>
        prev.map((comment) => {
          if (comment.id === commentId) return { ...comment, content: editText.trim() }
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.map((reply) =>
                reply.id === commentId ? { ...reply, content: editText.trim() } : reply,
              ),
            }
          }
          return comment
        }),
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
      const { error } = await supabase.from("comments").delete().eq("id", commentId)
      if (error) throw error

      setComments((prev) => {
        const isTopLevel = prev.some((c) => c.id === commentId)
        if (isTopLevel) {
          const newCount = Math.max(0, totalComments - 1)
          setTotalComments(newCount)
          onCommentCountUpdate?.(newCount)
          return prev.filter((c) => c.id !== commentId)
        }
        return prev.map((c) => ({ ...c, replies: c.replies?.filter((r) => r.id !== commentId) || [] }))
      })
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
      <div
        className="relative overflow-hidden rounded-2xl shadow-2xl border border-zinc-700/50 p-8"
        style={{
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
        }}
      >
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            <span className="text-zinc-400">Φόρτωση σχολίων...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <ProfanityWarningPopup open={showProfanityWarning} onClose={() => setShowProfanityWarning(false)} />

      <section
        className="relative overflow-hidden rounded-2xl shadow-2xl border border-zinc-700/50"
        style={{
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
        }}
      >
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-blue-500/20">
              <MessageCircle className="h-5 w-5 text-blue-300" />
            </div>
            <h2 className="text-xl font-bold text-neutral-200">
              Σχόλια ({totalComments})
              {totalComments !== comments.length && (
                <span className="text-sm font-normal text-zinc-400 ml-2">(εμφανίζονται {comments.length})</span>
              )}
            </h2>
          </div>

          {/* Comment Form */}
          {profile?.id ? (
            <form onSubmit={handleSubmitComment} className="mb-8">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0 border border-zinc-700">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url || "/placeholder.svg"}
                      alt={profile.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 text-zinc-400" />
                  )}
                </div>
                <div className="flex-1">
                  {replyingTo && (
                    <div className="mb-2 p-2 bg-blue-500/10 rounded-lg border border-blue-500/30 text-blue-200">
                      <span className="text-sm">Απάντηση σε σχόλιο</span>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        className="ml-2 text-blue-300 hover:text-blue-200"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  <div className="relative">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={replyingTo ? "Γράψτε την απάντησή σας..." : "Γράψτε ένα σχόλιο..."}
                      className="w-full p-4 bg-black/30 border border-zinc-700/50 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-neutral-200 placeholder:text-zinc-500"
                      rows={3}
                    />
                    <button
                      type="submit"
                      disabled={!newComment.trim() || submitting}
                      className="absolute bottom-3 right-3 p-2 bg-blue-600/80 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="mb-8 p-4 bg-black/30 rounded-xl border border-zinc-700/50 text-center">
              <p className="text-zinc-300">Συνδεθείτε για να αφήσετε ένα σχόλιο</p>
            </div>
          )}

          {/* Comments List */}
          {totalComments === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-neutral-200 mb-2">Δεν υπάρχουν σχόλια ακόμη</h3>
              <p className="text-zinc-400">Γίνετε ο πρώτος που θα σχολιάσει αυτή την ανάρτηση!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onReply={setReplyingTo}
                  onEdit={(comment) => {
                    setEditingComment(comment.id)
                    setEditText(comment.content)
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

              {/* Load More Comments */}
              {hasMore && (
                <div ref={loadMoreRef} className="flex justify-center py-6">
                  {loadingMore ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                      <span className="text-zinc-400 text-sm">Φόρτωση περισσότερων σχολίων...</span>
                    </div>
                  ) : (
                    <button
                      onClick={loadMoreComments}
                      className="flex items-center gap-2 px-4 py-2 bg-black/30 text-neutral-300 rounded-xl hover:bg-black/50 transition-colors font-medium text-sm border border-zinc-700/50"
                    >
                      <ChevronDown className="h-4 w-4" />
                      Φόρτωση περισσότερων ({Math.max(0, totalComments - comments.length)} ακόμη)
                    </button>
                  )}
                </div>
              )}

              {/* End of Comments */}
              {!hasMore && comments.length > 0 && (
                <div className="text-center py-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-black/30 text-zinc-300 rounded-full text-sm border border-zinc-700/50">
                    <MessageCircle className="h-4 w-4" />
                    Έχετε δει όλα τα σχόλια!
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

/* Comment Item Component */
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
  expandedReplies,
  setExpandedReplies,
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
    if (showActions) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showActions])

  const toggleReplies = () => {
    setExpandedReplies((prev) => ({ ...prev, [comment.id]: !prev[comment.id] }))
  }

  return (
    <div className={`${isReply ? "ml-12 mt-4" : ""} relative`}>
      <div
        className="p-4 rounded-xl border border-zinc-700/50 hover:border-zinc-600 transition-colors"
        style={{
          background: isReply ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.35)",
          backdropFilter: "blur(10px) saturate(140%)",
          WebkitBackdropFilter: "blur(10px) saturate(140%)",
        }}
      >
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0 border border-zinc-700">
            {comment.user?.avatar_url ? (
              <img
                src={comment.user.avatar_url || "/placeholder.svg"}
                alt={comment.user.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="h-5 w-5 text-zinc-400" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-neutral-200 text-sm">
                  {comment.user?.full_name || comment.user?.email || "Άγνωστος χρήστης"}
                </span>
                <span className="text-xs text-zinc-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(comment.created_at)}
                </span>
              </div>

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowActions((s) => !s)}
                  className="p-1 rounded-md hover:bg-white/10 transition-colors"
                  aria-haspopup="menu"
                  aria-expanded={showActions}
                >
                  <MoreHorizontal className="h-4 w-4 text-zinc-400" />
                </button>

                {showActions && (
                  <div className={`absolute ${isOwner ? 'bottom-full mb-1' : 'top-full mt-1'} right-0 bg-black/90 border border-zinc-700 rounded-lg shadow-xl py-1 z-[1000] min-w-[140px]`}>
                    {!isReply && (
                      <button
                        onClick={() => {
                          onReply(comment.id)
                          setShowActions(false)
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-neutral-200 hover:bg-zinc-800 flex items-center gap-2"
                      >
                        <Reply className="h-3 w-3" />
                        Απάντηση
                      </button>
                    )}

                    {isOwner && (
                      <>
                        <button
                          onClick={() => {
                            onEdit(comment)
                            setShowActions(false)
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-neutral-200 hover:bg-zinc-800 flex items-center gap-2"
                        >
                          <Edit3 className="h-3 w-3" />
                          Επεξεργασία
                        </button>
                        <button
                          onClick={() => {
                            onDelete(comment.id)
                            setShowActions(false)
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-rose-300 hover:bg-rose-500/10 flex items-center gap-2"
                        >
                          <Trash2 className="h-3 w-3" />
                          Διαγραφή
                        </button>
                      </>
                    )}

                    {!isOwner && (
                      <button
                        onClick={() => setShowActions(false)}
                        className="w-full px-3 py-2 text-left text-sm text-neutral-200 hover:bg-zinc-800 flex items-center gap-2"
                      >
                        <Flag className="h-3 w-3" />
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
                  className="w-full p-3 bg-black/30 border border-zinc-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-neutral-200"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditComment(comment.id)}
                    className="px-3 py-1 bg-blue-600/80 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                  >
                    Αποθήκευση
                  </button>
                  <button
                    onClick={() => {
                      setEditingComment(null)
                      setEditText("")
                    }}
                    className="px-3 py-1 bg-zinc-700 text-neutral-200 rounded-md hover:bg-zinc-600 transition-colors text-sm"
                  >
                    Ακύρωση
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
            )}
          </div>
        </div>
      </div>

      {!isReply && comment.replies && comment.replies.length > 0 && (
        <div className="mt-4">
          <button
            onClick={toggleReplies}
            className="flex items-center gap-2 text-sm text-zinc-300 hover:text-neutral-200 transition-colors mb-3"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${expandedReplies[comment.id] ? "rotate-180" : ""}`}
            />
            {expandedReplies[comment.id] ? "Απόκρυψη" : "Προβολή"} απαντήσεων ({comment.replies.length})
          </button>

          {expandedReplies[comment.id] && (
            <div className="space-y-4">
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
                  isReply={true}
                />
              ))}

              {comment.hasMoreReplies && (
                <button
                  onClick={() => onLoadMoreReplies(comment.id)}
                  className="ml-12 text-sm text-blue-300 hover:text-blue-200 transition-colors"
                >
                  Φόρτωση περισσότερων απαντήσεων...
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
