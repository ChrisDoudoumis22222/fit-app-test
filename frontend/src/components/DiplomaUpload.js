"use client";

import { useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { FileText, GraduationCap, Download, Loader2 } from "lucide-react";

export default function DiplomaUpload({ 
  profileId, 
  currentUrl, 
  onChange, 
  bucket = "diplomas" 
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const isImage = (url) => /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(url?.split("?")[0]);
  const isPDF = (url) => /\.pdf$/i.test(url?.split("?")[0]);

  const handleSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      setError("Το αρχείο πρέπει να είναι μικρότερο από 10MB");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const ext = file.name.split(".").pop();
      const path = `${profileId}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, file);
      if (upErr) throw upErr;

      const { data } = await supabase.storage.from(bucket).getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

      onChange?.(publicUrl);
    } catch (err) {
      setError(err.message || "Σφάλμα κατά το ανέβασμα");
      console.error("Diploma upload error →", err);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const getFileNameFromUrl = (url) => {
    if (!url) return "";
    try {
      return decodeURIComponent(url.split("/").pop().split("?")[0]);
    } catch {
      return "δίπλωμα";
    }
  };

  return (
    <div className="space-y-4">
      {currentUrl ? (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
          <div className="flex flex-col items-center gap-3">
            {isImage(currentUrl) ? (
              <div className="flex flex-col items-center">
                <img 
                  src={currentUrl} 
                  alt="Προεπισκόπηση Διπλώματος" 
                  className="max-h-48 rounded-lg mb-2"
                />
                <span className="text-sm text-emerald-300 flex items-center gap-1">
                  <FileText className="h-4 w-4" /> Εικόνα Διπλώματος
                </span>
              </div>
            ) : isPDF(currentUrl) ? (
              <div className="flex flex-col items-center">
                <FileText className="h-12 w-12 text-emerald-400 mb-2" />
                <span className="text-sm text-emerald-300 flex items-center gap-1">
                  PDF: {getFileNameFromUrl(currentUrl)}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-400" />
                <span className="text-sm text-emerald-300">
                  Το δίπλωμα ανέβηκε επιτυχώς
                </span>
              </div>
            )}
            
            <div className="flex gap-2 mt-3">
              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-blue-500/80 px-3 py-1.5 text-xs hover:bg-blue-400 transition-colors"
              >
                <Download className="h-3 w-3" /> Προβολή
              </a>
              
              <button
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-500/80 px-3 py-1.5 text-xs hover:bg-indigo-400 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Αντικατάσταση"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center">
          <GraduationCap className="h-12 w-12 mx-auto mb-3 text-white/40" />
          <p className="text-white/60 mb-4">Ανεβάστε το δίπλωμα ή την πιστοποίησή σας</p>
          
          <label className="inline-flex items-center gap-2 rounded-lg bg-indigo-500/90 px-4 py-2 text-sm font-medium hover:bg-indigo-400 transition-colors cursor-pointer">
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Επιλογή Αρχείου"
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleSelect}
              disabled={uploading}
              className="hidden"
            />
          </label>
          
          <p className="text-xs text-white/40 mt-2">
            Αποδεκτά: PDF, JPG, PNG (έως 10MB)
          </p>
        </div>
      )}
      
      {error && (
        <div className="rounded-lg bg-red-500/20 p-3 text-sm text-red-300 flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}
    </div>
  );
}