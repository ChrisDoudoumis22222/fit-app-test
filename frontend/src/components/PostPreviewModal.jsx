"use client"

import { useEffect, useState } from "react"
import { X, ChevronLeft, ChevronRight } from "lucide-react"

/**
 * Beautiful frosted-glass modal with gray/black color scheme
 */
export default function PostPreviewModal({ open, post, onClose, PostCard, onViewDetails }) {
  // Track current image index for gallery view
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const images = post?.image_urls?.length ? post.image_urls : post?.image_url ? [post.image_url] : []

  // Reset image index when modal opens
  useEffect(() => {
    if (open) setCurrentImageIndex(0)
  }, [open])

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose()
    }

    if (open) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = ""
    }
  }, [open, onClose])

  // Handle keyboard navigation for images
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!open || !images.length) return

      if (e.key === "ArrowLeft") {
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
      } else if (e.key === "ArrowRight") {
        setCurrentImageIndex((prev) => (prev + 1) % images.length)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, images.length])

  // Inject enhanced styles
  useEffect(() => {
    const styleId = "enhanced-modal-styles"
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement("style")
      styleEl.id = styleId
      styleEl.textContent = `
        @keyframes modalBackdropFade {
          from { 
            opacity: 0;
            backdrop-filter: blur(0px);
          }
          to { 
            opacity: 1;
            backdrop-filter: blur(12px);
          }
        }
        
        @keyframes modalSlideUp {
          from { 
            opacity: 0;
            transform: translateY(40px) scale(0.9);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        .modal-backdrop {
          animation: modalBackdropFade 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        .modal-panel {
          animation: modalSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        .shimmer-effect {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
      `
      document.head.appendChild(styleEl)
    }
  }, [])

  if (!open || !post) return null

  return (
    <div
      onClick={onClose}
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4
                 bg-gradient-to-br from-gray-900/30 via-black/40 to-gray-800/30"
      style={{
        backdropFilter: "blur(12px) saturate(120%)",
        WebkitBackdropFilter: "blur(12px) saturate(120%)",
      }}
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gray-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gray-600/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-gray-500/6 rounded-full blur-2xl transform -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Modal Panel */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-panel relative w-full max-w-4xl max-h-[95vh] overflow-hidden
                   rounded-3xl shadow-2xl ring-1 ring-white/20"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.90) 100%)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          boxShadow: `
            0 32px 64px -12px rgba(0, 0, 0, 0.25),
            0 0 0 1px rgba(255, 255, 255, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.3),
            inset 0 -1px 0 rgba(0, 0, 0, 0.1)
          `,
        }}
      >
        {/* Header with close button */}
        <div className="relative flex items-center justify-between p-6 pb-0">
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="group relative flex h-12 w-12 items-center justify-center
                       rounded-2xl bg-white/80 text-gray-600 shadow-lg ring-1 ring-black/5
                       transition-all duration-300 hover:bg-white hover:text-gray-900 
                       hover:shadow-xl hover:scale-105 active:scale-95
                       focus:outline-none focus:ring-2 focus:ring-gray-500/50"
          >
            <X className="h-5 w-5 transition-transform group-hover:rotate-90" />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-gray-500/20 to-gray-700/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto max-h-[calc(95vh-80px)] px-6 pb-6">
          <div className="relative">
            {/* Content */}
            {PostCard ? (
              <div className="transform transition-all duration-500">
                <PostCard
                  post={post}
                  style={{
                    background: "transparent",
                    boxShadow: "none",
                    border: "none",
                    backdropFilter: "none",
                  }}
                  preview={true}
                />
              </div>
            ) : (
              /* Enhanced fallback content */
              <div className="space-y-8">
                {/* Image Gallery */}
                {images.length > 0 && (
                  <div className="relative overflow-hidden rounded-2xl">
                    {/* Main Image */}
                    <div className="relative aspect-[16/9] overflow-hidden">
                      <img
                        src={images[currentImageIndex] || "/placeholder.jpg"}
                        alt={post.title || "Post image"}
                        className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

                      {/* Image counter */}
                      {images.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-black/70 rounded-full text-white text-sm font-medium">
                          {currentImageIndex + 1} / {images.length}
                        </div>
                      )}

                      {/* Navigation arrows */}
                      {images.length > 1 && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
                            }}
                            className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                          >
                            <ChevronLeft className="h-6 w-6" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setCurrentImageIndex((prev) => (prev + 1) % images.length)
                            }}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                          >
                            <ChevronRight className="h-6 w-6" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Thumbnail strip */}
                    {images.length > 1 && (
                      <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                        {images.map((img, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentImageIndex(idx)}
                            className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                              idx === currentImageIndex
                                ? "border-gray-800 shadow-md"
                                : "border-transparent opacity-70 hover:opacity-100"
                            }`}
                          >
                            <img
                              src={img || "/placeholder.jpg"}
                              alt={`Thumbnail ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="space-y-6">
                  {/* Date badge */}
                  {post.created_at && (
                    <div
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full 
                                    bg-gradient-to-r from-gray-50 to-gray-100 
                                    ring-1 ring-gray-200/50"
                    >
                      <div className="w-2 h-2 rounded-full bg-gradient-to-r from-gray-600 to-gray-800" />
                      <span className="text-sm font-medium text-gray-700">
                        {new Date(post.created_at).toLocaleDateString("el-GR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  )}

                  {/* Title */}
                  <h1
                    className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-black 
                                 bg-clip-text text-transparent leading-tight"
                  >
                    {post.title || "Χωρίς τίτλο"}
                  </h1>

                  {/* Description */}
                  <div className="prose prose-lg max-w-none">
                    <p className="text-gray-600 leading-relaxed text-lg">
                      {post.description || "Δεν υπάρχει περιγραφή."}
                    </p>
                  </div>

                  {/* View Details Button (if not preview) */}
                  {post.id !== "preview" && onViewDetails && (
                    <button
                      onClick={() => onViewDetails(post)}
                      className="mt-4 px-6 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors"
                    >
                      Προβολή λεπτομερειών
                    </button>
                  )}

                  {/* Decorative divider */}
                  <div className="flex items-center gap-4 py-4">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-gray-600 to-gray-800" />
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 
                        bg-gradient-to-t from-white/60 to-transparent"
        />
      </div>
    </div>
  )
}
