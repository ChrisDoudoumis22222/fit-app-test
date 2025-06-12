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

// Greek profanity filter - add more words as needed
const PROFANITY_WORDS = [
  "μαλάκας",
  "μαλακας",
  "γαμώ",
  "γαμω",
  "πούστης",
  "πουστης",
  "σκύλα",
  "σκυλα",
  "κωλόπαιδο",
  "κωλοπαιδο",
  "αρχίδι",
  "αρχιδι",
  "βλάκας",
  "βλακας",
  "χαζός",
  "χαζος",
  "κωλόγερος",
  "κωλογερος",
  "μουνί",
  "μουνι",
  "πουτάνα",
  "πουτανα",
  "κερατάς",
  "κερατας",
  "fuck",
  "shit",
  "damn",
  "bitch",
  "asshole",
  "bastard",
]

// Profanity filter function
const containsProfanity = (text) => {
  const lowerText = text.toLowerCase()
  return PROFANITY_WORDS.some((word) => lowerText.includes(word))
}

// Profanity warning popup
const ProfanityWarningPopup = ({ open, onClose }) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl shadow-2xl ring-1 ring-orange-200"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,247,237,0.9) 100%)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          boxShadow: "0 25px 50px -12px rgba(251, 146, 60, 0.25)",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-6 pb-4">
          <div className="p-2 rounded-full bg-orange-100">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
          </div>
          <h3 className="text-lg font-semibold text-orange-800">Προσοχή!</h3>
          <button onClick={onClose} className="ml-auto p-1 rounded-full hover:bg-orange-100 transition-colors">
            <X className="h-5 w-5 text-orange-600" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          <p className="text-orange-700 mb-4">Συγγνώμη φίλε, αλλά δεν μπορείς να βρίζεις εδώ! 😅</p>
          <p className="text-orange-600 text-sm mb-4">
            Παρακαλούμε να διατηρήσετε έναν ευγενικό και σεβαστό τόνο στα σχόλιά σας.
          </p>

          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors font-medium"
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

  // Intersection Observer ref for lazy loading
  const observerRef = useRef()
  const loadMoreRef = useRef()

  useEffect(() => {
    fetchComments(true)
  }, [postId])

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0]
        if (target.isIntersecting && hasMore && !loadingMore && !loading) {
          loadMoreComments()
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px",
      },
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    observerRef.current = observer

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, loadingMore, loading])

  const fetchComments = async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true)
        setCurrentPage(1)
      }

      // Get updated comments count from posts table
      const { data: postData } = await supabase.from("posts").select("comments_count").eq("id", postId).single()

      if (postData) {
        const newCount = postData.comments_count || 0
        setTotalComments(newCount)
        // Notify parent component about the count update
        if (onCommentCountUpdate) {
          onCommentCountUpdate(newCount)
        }
      }

      // Fetch comments with pagination
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
          // Fetch first few replies for each comment
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

    // Delay to prevent too rapid requests
    setTimeout(() => {
      fetchComments(false)
    }, 300)
  }, [currentPage, hasMore, loadingMore])

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

    // Check for profanity
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
        // Add reply to existing comment
        setComments((prev) =>
          prev.map((comment) =>
            comment.id === replyingTo
              ? {
                  ...comment,
                  replies: [...comment.replies, data],
                }
              : comment,
          ),
        )
        setReplyingTo(null)
      } else {
        // Add new top-level comment
        setComments((prev) => [{ ...data, replies: [], hasMoreReplies: false }, ...prev])
        // Update local count (will be synced by trigger)
        setTotalComments((prev) => prev + 1)
        // Notify parent component about the count update
        if (onCommentCountUpdate) {
          onCommentCountUpdate(totalComments + 1)
        }
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

    // Check for profanity in edit
    if (containsProfanity(editText)) {
      setShowProfanityWarning(true)
      return
    }

    try {
      const { error } = await supabase.from("comments").update({ content: editText.trim() }).eq("id", commentId)

      if (error) throw error

      // Update local state
      setComments((prev) =>
        prev.map((comment) => {
          if (comment.id === commentId) {
            return { ...comment, content: editText.trim() }
          }
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

      // Update local state
      setComments((prev) => {
        const isTopLevel = prev.some((comment) => comment.id === commentId)

        if (isTopLevel) {
          // Update local count (will be synced by trigger)
          const newCount = Math.max(0, totalComments - 1)
          setTotalComments(newCount)
          // Notify parent component about the count update
          if (onCommentCountUpdate) {
            onCommentCountUpdate(newCount)
          }
          return prev.filter((comment) => comment.id !== commentId)
        } else {
          return prev.map((comment) => ({
            ...comment,
            replies: comment.replies?.filter((reply) => reply.id !== commentId) || [],
          }))
        }
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
        className="relative overflow-hidden rounded-2xl shadow-lg ring-1 ring-gray-200 p-8"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
        }}
      >
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="text-gray-500">Φόρτωση σχολίων...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Profanity Warning Popup */}
      <ProfanityWarningPopup open={showProfanityWarning} onClose={() => setShowProfanityWarning(false)} />

      <section
        className="relative overflow-hidden rounded-2xl shadow-lg ring-1 ring-gray-200"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
        }}
      >
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-blue-100">
              <MessageCircle className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Σχόλια ({totalComments})
              {totalComments !== comments.length && (
                <span className="text-sm font-normal text-gray-500 ml-2">(εμφανίζονται {comments.length})</span>
              )}
            </h2>
          </div>

          {/* Comment Form */}
          {profile?.id ? (
            <form onSubmit={handleSubmitComment} className="mb-8">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url || "/placeholder.svg"}
                      alt={profile.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  {replyingTo && (
                    <div className="mb-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                      <span className="text-sm text-blue-700">Απάντηση σε σχόλιο</span>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
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
                      className="w-full p-4 bg-white border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      rows={3}
                    />
                    <button
                      type="submit"
                      disabled={!newComment.trim() || submitting}
                      className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">
              <p className="text-gray-600">Συνδεθείτε για να αφήσετε ένα σχόλιο</p>
            </div>
          )}

          {/* Comments List */}
          {totalComments === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Δεν υπάρχουν σχόλια ακόμη</h3>
              <p className="text-gray-500">Γίνετε ο πρώτος που θα σχολιάσει αυτή την ανάρτηση!</p>
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
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      <span className="text-gray-500 text-sm">Φόρτωση περισσότερων σχολίων...</span>
                    </div>
                  ) : (
                    <button
                      onClick={loadMoreComments}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium text-sm"
                    >
                      <ChevronDown className="h-4 w-4" />
                      Φόρτωση περισσότερων ({totalComments - comments.length} ακόμη)
                    </button>
                  )}
                </div>
              )}

              {/* End of Comments */}
              {!hasMore && comments.length > 0 && (
                <div className="text-center py-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-sm">
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

  const toggleReplies = () => {
    setExpandedReplies((prev) => ({
      ...prev,
      [comment.id]: !prev[comment.id],
    }))
  }

  return (
    <div className={`${isReply ? "ml-12 mt-4" : ""}`}>
      <div
        className="p-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
        style={{
          background: isReply
            ? "linear-gradient(135deg, rgba(248,250,252,0.8) 0%, rgba(241,245,249,0.8) 100%)"
            : "rgba(255,255,255,0.8)",
        }}
      >
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
            {comment.user?.avatar_url ? (
              <img
                src={comment.user.avatar_url || "/placeholder.svg"}
                alt={comment.user.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="h-5 w-5 text-gray-400" />
            )}
          </div>

          <div className="flex-1">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 text-sm">
                  {comment.user?.full_name || comment.user?.email || "Άγνωστος χρήστης"}
                </span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(comment.created_at)}
                </span>
              </div>

              {/* Actions Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowActions(!showActions)}
                  className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <MoreHorizontal className="h-4 w-4 text-gray-400" />
                </button>

                {showActions && (
                  <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                    {!isReply && (
                      <button
                        onClick={() => {
                          onReply(comment.id)
                          setShowActions(false)
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Reply className="h-3 w-3" />
                        Απάντηση
                      </button>
                    )}

                    {/* Only comment owner can edit/delete their own comments */}
                    {isOwner && (
                      <>
                        <button
                          onClick={() => {
                            onEdit(comment)
                            setShowActions(false)
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Edit3 className="h-3 w-3" />
                          Επεξεργασία
                        </button>
                        <button
                          onClick={() => {
                            onDelete(comment.id)
                            setShowActions(false)
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="h-3 w-3" />
                          Διαγραφή
                        </button>
                      </>
                    )}

                    {!isOwner && (
                      <button
                        onClick={() => setShowActions(false)}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Flag className="h-3 w-3" />
                        Αναφορά
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            {editingComment === comment.id ? (
              <div className="space-y-3">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full p-3 bg-white border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditComment(comment.id)}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    Αποθήκευση
                  </button>
                  <button
                    onClick={() => {
                      setEditingComment(null)
                      setEditText("")
                    }}
                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors text-sm"
                  >
                    Ακύρωση
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
            )}
          </div>
        </div>
      </div>

      {/* Replies Section */}
      {!isReply && comment.replies && comment.replies.length > 0 && (
        <div className="mt-4">
          <button
            onClick={toggleReplies}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors mb-3"
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

              {/* Load More Replies */}
              {comment.hasMoreReplies && (
                <button
                  onClick={() => onLoadMoreReplies(comment.id)}
                  className="ml-12 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Φόρτωση περισσότερων απαντήσεων...
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Click outside to close actions */}
      {showActions && <div className="fixed inset-0 z-5" onClick={() => setShowActions(false)} />}
    </div>
  )
}
