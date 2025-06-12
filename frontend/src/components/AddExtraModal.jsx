'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2 as TrashIcon } from 'lucide-react';

export default function AddExtraModal({ open, onClose, onSave }) {
  const [title, setTitle]   = useState('');
  const [price, setPrice]   = useState('');

  /* reset every time we reopen */
  useEffect(() => {
    if (open) {
      setTitle('');
      setPrice('');
    }
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* panel */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(title.trim(), Number(price));
        }}
        className="relative z-10 w-[90vw] max-w-sm space-y-4 rounded-xl bg-white p-6 shadow-xl"
      >
        <h3 className="text-lg font-semibold text-gray-800">Νέο πρόσθετο</h3>

        <input
          className="input"
          placeholder="Τίτλος"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          type="number"
          className="input"
          placeholder="Τιμή (€)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Ακύρωση
          </button>
          <button type="submit" className="btn-primary">
            Αποθήκευση
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
