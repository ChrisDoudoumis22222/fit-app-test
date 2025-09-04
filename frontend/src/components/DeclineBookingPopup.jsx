/* DeclineBookingPopup.jsx – shows when a booking fails */
"use client";

import { AlertCircle, X } from "lucide-react";

export default function DeclineBookingPopup({ message, onClose }) {
  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="alertdialog"
          aria-modal="true"
          className="relative max-w-md w-full rounded-2xl p-8 text-center
                     bg-white/90 backdrop-blur-xl shadow-2xl ring-1 ring-gray-200"
        >
          <AlertCircle className="mx-auto h-12 w-12 text-rose-500 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Κάτι πήγε στραβά
          </h3>
          <p className="text-gray-600 mb-6">{message}</p>

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
