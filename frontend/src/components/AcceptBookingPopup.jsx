/* AcceptBookingPopup.jsx – tiny glass-modal shown on successful booking */
"use client";

import { CheckCircle, X } from "lucide-react";

export default function AcceptBookingPopup({ onClose }) {
  return (
    <>
      {/* overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          className="relative max-w-md w-full rounded-2xl p-8 text-center
                     bg-white/90 backdrop-blur-xl shadow-2xl ring-1 ring-gray-200"
        >
          <CheckCircle className="mx-auto h-12 w-12 text-emerald-500 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Η κράτηση δημιουργήθηκε!
          </h3>
          <p className="text-gray-600 mb-6">
            Θα ενημερώσουμε τον προπονητή και θα λάβετε email επιβεβαίωσης.
          </p>

          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl
                       bg-gray-800 text-white hover:bg-gray-700 transition"
          >
            <X className="h-4 w-4" />
            Κλείσιμο
          </button>
        </div>
      </div>
    </>
  );
}
