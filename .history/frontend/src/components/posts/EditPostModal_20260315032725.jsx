"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ImageIcon,
  X,
  Upload,
  Edit3,
  Save,
  RotateCcw,
  RefreshCw,
} from "lucide-react"

const MAX_BYTES = 1_024_000 // 1 MB

const arraysEqual = (a = [], b = []) =>
  a.length === b.length && a.every((v, i) => v === b[i])

function DirtyActionBar({
  visible,
  saving = false,
  saveLabel = "Αποθήκευση",
  cancelLabel = "Ακύρωση",
  message = "Έχεις μη αποθηκευμένες αλλαγές.",
  onSave,
  onCancel,
  className = "",
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 96, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 96, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          className={`fixed z-[60] left-0 right-0 bottom-0 sm:bottom-4 ${className}`}
        >
          <div className="sm:hidden w-full bg-gradient-to-br from-zinc-900/95 to-black/95 border-t border-white/10 px-4 pt-3 pb-4 shadow-[0_-6px_24px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-zinc-300">
                <RefreshCw className="h-5 w-5" />
                <span className="text-sm">{message}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 text-white/90 border border-white/15 rounded-2xl bg-black/30 hover:bg-white/10 transition"
              >
                <RotateCcw className="h-5 w-5" />
                {cancelLabel}
              </button>

              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white text-black hover:bg-zinc-100 transition disabled:opacity-60"
              >
                {saving ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
                {saveLabel}
              </button>
            </div>
          </div>

          <div className="hidden sm:block">
            <div className="mx-auto w-[min(960px,92vw)]">
              <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-zinc-900/90 to-black/90 backdrop-blur-xl shadow-2xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <RefreshCw className="h-5 w-5" />
                    <span className="text-sm">{message}</span>
                  </div>

                  <div className="flex-1" />

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onCancel}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 text-white/90 border border-white/15 rounded-2xl bg-black/30 hover:bg-white/10 transition"
                    >
                      <RotateCcw className="h-4 w-4" />
                      {cancelLabel}
                    </button>

                    <button
                      type="button"
                      onClick={onSave}
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-white text-black hover:bg-zinc-100 transition disabled:opacity-60"
                    >
                      {saving ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {saveLabel}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const Field = ({ label, textarea = false, value, onChange, dirty = false }) => (
  <div className={dirty ? "halo rounded-2xl p-2 -m-2" : ""}>
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
  </div>
)

const EditImageThumb = ({ src, index, onRemove, type }) => (
  <div className="group relative aspect-square overflow-hidden rounded-xl bg-zinc-900 border border-white/10">
    <img
      src={src || "/placeholder.svg"}
      alt={`Εικόνα ${index}`}
      className="h-full w-full object-cover"
    />

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
      type="button"
      onClick={onRemove}
      className="absolute right-2 top-2 p-1.5 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600"
    >
      <X className="h-3 w-3" />
    </button>

    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
  </div>
)

export default function EditPostModal({ open, post, onClose, onSave }) {
  const [editTitle, setEditTitle] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [editImages, setEditImages] = useState([])
  const [newFiles, setNewFiles] = useState([])
  const [newThumbs, setNewThumbs] = useState([])
  const [saving, setSaving] = useState(false)

  const fileInputRef = useRef(null)
  const origRef = useRef({ title: "", description: "", images: [] })

  useEffect(() => {
    if (post && open) {
      const initialImages =
        post.image_urls || [post.image_url].filter(Boolean) || []

      origRef.current = {
        title: post.title || "",
        description: post.description || "",
        images: initialImages,
      }

      setEditTitle(origRef.current.title)
      setEditDesc(origRef.current.description)
      setEditImages(initialImages)
      setNewFiles([])
      setNewThumbs([])
    }
  }, [post, open])

  const titleDirty = (editTitle ?? "") !== (origRef.current.title ?? "")
  const descDirty = (editDesc ?? "") !== (origRef.current.description ?? "")
  const imagesDirty =
    !arraysEqual(editImages ?? [], origRef.current.images ?? []) ||
    newFiles.length > 0

  const hasChanges = titleDirty || descDirty || imagesDirty

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

  const removeExistingImage = (index) =>
    setEditImages((imgs) => imgs.filter((_, i) => i !== index))

  const removeNewImage = (index) => {
    setNewFiles((files) => files.filter((_, i) => i !== index))
    setNewThumbs((thumbs) => thumbs.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!editTitle.trim() || !editDesc.trim()) return

    const totalImages = editImages.length + newThumbs.length
    if (totalImages === 0) return

    setSaving(true)
    try {
      await onSave({
        title: editTitle,
        description: editDesc,
        existingImages: editImages,
        newFiles,
      })
      onClose()
    } catch {
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    const o = origRef.current
    setEditTitle(o.title)
    setEditDesc(o.description)
    setEditImages(o.images)
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
          className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl border border-zinc-700/50 bg-black/50"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-600/10 via-transparent to-transparent" />

          <div className="relative">
            <div className="flex items-center justify-between p-6 border-b border-zinc-700/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/20">
                  <Edit3 className="h-5 w-5 text-blue-400" />
                </div>
                <h2 className="text-xl font-semibold text-zinc-100">
                  Επεξεργασία ανάρτησης
                </h2>
              </div>

              <button
                type="button"
                onClick={handleCancel}
                className="p-2 rounded-full hover:bg-zinc-700/50 transition-colors"
              >
                <X className="h-5 w-5 text-zinc-400" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6 space-y-6">
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

              <div className={imagesDirty ? "halo rounded-2xl p-2 -m-2" : ""}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-zinc-300">
                      Εικόνες ({totalImages})
                    </label>

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
                      <h4 className="text-sm font-medium text-zinc-400">
                        Υπάρχουσες εικόνες
                      </h4>
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

                  {newThumbs.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-zinc-400">
                        Νέες εικόνες
                      </h4>
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
                      <p>
                        Δεν υπάρχουν εικόνες. Προσθέστε τουλάχιστον μία εικόνα.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DirtyActionBar
            visible={hasChanges}
            saving={saving}
            onSave={handleSave}
            onCancel={handleCancel}
            saveLabel="Αποθήκευση αλλαγών"
            cancelLabel="Ακύρωση"
            message="Έχεις μη αποθηκευμένες αλλαγές στην ανάρτηση."
            className="!z-[65]"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}