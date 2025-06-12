import { supabase } from "../supabaseClient"

// Default placeholder for when no avatar is set
export const PLACEHOLDER = "/placeholder.svg?height=120&width=120&text=Avatar"

// Avatar bucket name in Supabase Storage
export const AVATAR_BUCKET = "avatars"

/**
 * Upload an avatar image to Supabase Storage
 * @param {File} file - The image file to upload
 * @param {string} userId - The user's ID
 * @returns {Promise<{data: string | null, error: string | null}>}
 */
export const uploadAvatar = async (file, userId) => {
  try {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      return { data: null, error: "Please select an image file" }
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB in bytes
    if (file.size > maxSize) {
      return { data: null, error: "File size must be less than 5MB" }
    }

    // Create unique filename with user folder structure for RLS
    const fileExt = file.name.split(".").pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `${userId}/${fileName}` // This creates a folder structure: userId/filename

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    })

    if (uploadError) {
      return { data: null, error: uploadError.message }
    }

    // Get public URL
    const { data: urlData } = await supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath)

    return { data: urlData.publicUrl, error: null }
  } catch (error) {
    return { data: null, error: error.message }
  }
}

/**
 * Delete an avatar from Supabase Storage
 * @param {string} avatarUrl - The full URL of the avatar to delete
 * @returns {Promise<{success: boolean, error: string | null}>}
 */
export const deleteAvatar = async (avatarUrl, userId) => {
  try {
    if (!avatarUrl || avatarUrl === PLACEHOLDER) {
      return { success: true, error: null }
    }

    // Extract file path from URL - handle folder structure
    const urlParts = avatarUrl.split("/")
    const fileName = urlParts[urlParts.length - 1]
    const filePath = `${userId}/${fileName}`

    // Delete from storage
    const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([filePath])

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Update user's avatar URL in the profiles table
 * @param {string} userId - The user's ID
 * @param {string | null} avatarUrl - The new avatar URL (null to remove)
 * @returns {Promise<{success: boolean, error: string | null}>}
 */
export const updateUserAvatar = async (userId, avatarUrl) => {
  try {
    const { error } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", userId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Get avatar URL or return placeholder
 * @param {string | null} avatarUrl - The avatar URL from database
 * @returns {string} - Avatar URL or placeholder
 */
export const getAvatarUrl = (avatarUrl) => {
  return avatarUrl && avatarUrl !== "" ? avatarUrl : PLACEHOLDER
}

/**
 * Complete avatar upload process (upload file + update database)
 * @param {File} file - The image file to upload
 * @param {string} userId - The user's ID
 * @returns {Promise<{avatarUrl: string | null, error: string | null}>}
 */
export const handleAvatarUpload = async (file, userId) => {
  try {
    // First upload the file
    const { data: avatarUrl, error: uploadError } = await uploadAvatar(file, userId)

    if (uploadError) {
      return { avatarUrl: null, error: uploadError }
    }

    // Then update the user's profile
    const { success, error: updateError } = await updateUserAvatar(userId, avatarUrl)

    if (!success) {
      // If database update fails, try to clean up the uploaded file
      await deleteAvatar(avatarUrl, userId)
      return { avatarUrl: null, error: updateError }
    }

    return { avatarUrl, error: null }
  } catch (error) {
    return { avatarUrl: null, error: error.message }
  }
}

/**
 * Complete avatar deletion process (remove from storage + update database)
 * @param {string} userId - The user's ID
 * @param {string} currentAvatarUrl - The current avatar URL
 * @returns {Promise<{success: boolean, error: string | null}>}
 */
export const handleAvatarDeletion = async (userId, currentAvatarUrl) => {
  try {
    // First update the database
    const { success: dbSuccess, error: dbError } = await updateUserAvatar(userId, null)

    if (!dbSuccess) {
      return { success: false, error: dbError }
    }

    // Then delete from storage (don't fail if this doesn't work)
    await deleteAvatar(currentAvatarUrl, userId)

    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Validate image file before upload
 * @param {File} file - The file to validate
 * @returns {string | null} - Error message or null if valid
 */
export const validateImageFile = (file) => {
  if (!file) {
    return "Please select a file"
  }

  if (!file.type.startsWith("image/")) {
    return "Please select an image file"
  }

  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    return "File size must be less than 5MB"
  }

  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
  if (!allowedTypes.includes(file.type)) {
    return "Please select a JPEG, PNG, GIF, or WebP image"
  }

  return null
}
