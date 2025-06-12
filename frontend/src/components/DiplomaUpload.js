"use client"

import { useState, useRef } from "react"
import { supabase } from "../supabaseClient"

/**
 * Diploma / certificate uploader with inline preview.
 */
export default function DiplomaUpload({ profileId, currentUrl = null, onChange, bucket = "diplomas" }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [fileName, setFileName] = useState("")
  const inputRef = useRef(null)

  const isImage = (url) => {
    if (!url) return false
    // Remove query parameters and get the actual filename
    const cleanUrl = url.split("?")[0]
    return /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(cleanUrl)
  }

  const isPDF = (url) => {
    if (!url) return false
    // Remove query parameters and get the actual filename
    const cleanUrl = url.split("?")[0]
    return /\.pdf$/i.test(cleanUrl)
  }

  const handleSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setError("File must be ≤ 10 MB.")
      return
    }

    setUploading(true)
    setError("")
    setFileName(file.name)

    try {
      const ext = file.name.split(".").pop()
      const path = `${profileId}/${Date.now()}.${ext}`

      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true, cacheControl: "3600" })
      if (upErr) throw upErr

      const { data } = await supabase.storage.from(bucket).getPublicUrl(path)
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`

      const { error: dbErr } = await supabase.from("profiles").update({ diploma_url: publicUrl }).eq("id", profileId)
      if (dbErr) throw dbErr

      onChange?.(publicUrl)
    } catch (err) {
      setError(err.message)
      console.error("Diploma upload error →", err)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const getFileNameFromUrl = (url) => {
    if (!url) return ""
    try {
      const urlParts = url.split("/")
      const fileNameWithQuery = urlParts[urlParts.length - 1]
      const fileName = fileNameWithQuery.split("?")[0]
      return decodeURIComponent(fileName)
    } catch {
      return "diploma"
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const containerStyle = {
    maxWidth: "600px",
    margin: "0 auto",
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
    overflow: "hidden",
  }

  const headerStyle = {
    padding: "24px 24px 16px 24px",
    textAlign: "center",
    borderBottom: "1px solid #f3f4f6",
  }

  const titleStyle = {
    fontSize: "20px",
    fontWeight: "600",
    color: "#111827",
    margin: "0 0 8px 0",
  }

  const subtitleStyle = {
    fontSize: "14px",
    color: "#6b7280",
    margin: "0",
  }

  const previewAreaStyle = {
    padding: "24px",
    backgroundColor: "#f9fafb",
  }

  const uploadZoneStyle = {
    border: "2px dashed #d1d5db",
    borderRadius: "8px",
    padding: "32px 16px",
    textAlign: "center",
    backgroundColor: "#ffffff",
    transition: "all 0.2s ease",
  }

  const imagePreviewStyle = {
    maxWidth: "100%",
    maxHeight: "300px",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
    objectFit: "contain",
    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
    backgroundColor: "#ffffff",
  }

  const pdfPreviewStyle = {
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "24px",
    textAlign: "center",
    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
  }

  const pdfEmbedStyle = {
    width: "100%",
    height: "400px",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    marginTop: "16px",
  }

  const buttonContainerStyle = {
    padding: "0 24px 24px 24px",
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  }

  const primaryButtonStyle = {
    flex: "1",
    minWidth: "140px",
    padding: "12px 24px",
    backgroundColor: uploading ? "#9ca3af" : "#3b82f6",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: uploading ? "not-allowed" : "pointer",
    transition: "background-color 0.2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  }

  const secondaryButtonStyle = {
    padding: "12px 24px",
    backgroundColor: "#ffffff",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "all 0.2s ease",
  }

  const errorStyle = {
    margin: "0 24px 24px 24px",
    padding: "12px 16px",
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    color: "#dc2626",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h3 style={titleStyle}>📜 Diploma & Certificates</h3>
        <p style={subtitleStyle}>Upload your professional credentials (Images & PDF, Max 10MB)</p>
      </div>

      {/* Preview Area */}
      <div style={previewAreaStyle}>
        {currentUrl ? (
          <div>
            {console.log("Current URL:", currentUrl)}
            {console.log("Is Image:", isImage(currentUrl))}
            {console.log("Is PDF:", isPDF(currentUrl))}
            {isImage(currentUrl) ? (
              // Image Preview
              <div style={{ textAlign: "center" }}>
                <img src={currentUrl || "/placeholder.svg"} alt="Diploma preview" style={imagePreviewStyle} />
                <div style={{ marginTop: "12px", fontSize: "12px", color: "#6b7280" }}>
                  📷 {getFileNameFromUrl(currentUrl)}
                </div>
              </div>
            ) : isPDF(currentUrl) ? (
              // PDF Preview with Embedded Viewer
              <div>
                <div style={pdfPreviewStyle}>
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>📄</div>
                  <h4 style={{ margin: "0 0 8px 0", fontWeight: "600", color: "#111827" }}>PDF Document Uploaded</h4>
                  <p style={{ margin: "0 0 16px 0", color: "#6b7280", fontSize: "14px" }}>
                    📎 {getFileNameFromUrl(currentUrl)}
                  </p>
                </div>

                {/* Embedded PDF Viewer */}
                <iframe
                  src={`${currentUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                  style={pdfEmbedStyle}
                  title="PDF Preview"
                  frameBorder="0"
                >
                  <p>
                    Your browser does not support PDFs.{" "}
                    <a href={currentUrl} target="_blank" rel="noopener noreferrer">
                      Download the PDF
                    </a>
                  </p>
                </iframe>
              </div>
            ) : (
              // Other File Types
              <div style={pdfPreviewStyle}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📎</div>
                <h4 style={{ margin: "0 0 8px 0", fontWeight: "600", color: "#111827" }}>Document Uploaded</h4>
                <p style={{ margin: "0", color: "#6b7280", fontSize: "14px" }}>📁 {getFileNameFromUrl(currentUrl)}</p>
              </div>
            )}
          </div>
        ) : (
          <div style={uploadZoneStyle}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📤</div>
            <p style={{ margin: "0 0 8px 0", color: "#6b7280", fontSize: "16px" }}>No diploma uploaded yet</p>
            <p style={{ margin: "0", color: "#9ca3af", fontSize: "12px" }}>
              Click to upload • Images (JPG, PNG, GIF, WebP) & PDF files supported
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={buttonContainerStyle}>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={primaryButtonStyle}
          onMouseOver={(e) => {
            if (!uploading) e.target.style.backgroundColor = "#2563eb"
          }}
          onMouseOut={(e) => {
            if (!uploading) e.target.style.backgroundColor = "#3b82f6"
          }}
        >
          {uploading ? (
            <>
              <span
                style={{
                  display: "inline-block",
                  width: "16px",
                  height: "16px",
                  border: "2px solid #ffffff",
                  borderTop: "2px solid transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              ></span>
              Uploading...
            </>
          ) : (
            <>📤 {currentUrl ? "Replace Document" : "Upload Document"}</>
          )}
        </button>

        {currentUrl && (
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={secondaryButtonStyle}
            onMouseOver={(e) => (e.target.style.backgroundColor = "#f3f4f6")}
            onMouseOut={(e) => (e.target.style.backgroundColor = "#ffffff")}
          >
            {isPDF(currentUrl) ? "📄 Open PDF" : isImage(currentUrl) ? "🖼️ Full Size" : "📁 Download"}
          </a>
        )}

        {currentUrl && isPDF(currentUrl) && (
          <a
            href={currentUrl}
            download
            style={{
              ...secondaryButtonStyle,
              backgroundColor: "#f0f9ff",
              color: "#0369a1",
              borderColor: "#bae6fd",
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = "#e0f2fe")}
            onMouseOut={(e) => (e.target.style.backgroundColor = "#f0f9ff")}
          >
            💾 Download PDF
          </a>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div style={errorStyle}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleSelect}
        disabled={uploading}
        style={{ display: "none" }}
      />

      {/* CSS Animation for Spinner */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
