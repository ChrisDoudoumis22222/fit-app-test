/*  ServiceCreatedPopup.jsx – Glass-Dark style 🍾
    ----------------------------------------------
    Shows a success dialog with two actions:
      • “Συνέχεια”    →  onContinue()
      • “Επεξεργασία” →  onEdit(service)

    Props
      service     : { id, title, … }  – freshly-created row
      onContinue  : () => void
      onEdit      : (service) => void
*/
'use client';

import { motion }   from 'framer-motion';
import { Sparkles, Pencil, ArrowRight } from 'lucide-react';

const ringMono = 'ring-1 ring-white/10';
const glassBG  = {
  background:'linear-gradient(135deg,#000 0%,#111 100%)',
  backdropFilter:'blur(28px) saturate(160%)',
  WebkitBackdropFilter:'blur(28px) saturate(160%)',
};

const Blobs = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className="absolute -left-24 -top-20 size-96 rounded-full bg-white/5 blur-3xl"/>
    <div className="absolute right-0 -bottom-24 size-72 rounded-full bg-white/7 blur-2xl"/>
  </div>
);

export default function ServiceCreatedPopup({ service, onContinue, onEdit }) {
  return (
    <motion.div
      initial={{opacity:0,scale:0.85}}
      animate={{opacity:1,scale:1}}
      exit={{opacity:0,scale:0.85}}
      transition={{duration:0.35,ease:[0.42,0,0.2,1]}}
      className="fixed inset-0 z-50 grid place-items-center p-4 backdrop-blur-sm"
    >
      <div className={`relative w-full max-w-sm rounded-2xl p-6 ${ringMono}`} style={glassBG}>
        <Blobs/>

        <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Sparkles className="size-5 text-primary"/> Υπηρεσία δημιουργήθηκε!
        </h3>

        <p className="mt-4 text-sm text-gray-300">
          <strong className="text-gray-100">{service?.title}</strong> αποθηκεύτηκε επιτυχώς.
        </p>

        <ul className="mt-4 space-y-1 text-xs text-gray-400">
          <li>ID: <span className="text-gray-200">{service?.id}</span></li>
        </ul>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={onContinue}
                  className="btn-secondary flex items-center justify-center gap-1">
            <ArrowRight className="size-4"/> Συνέχεια
          </button>
          <button onClick={()=>onEdit?.(service)}
                  className="btn-primary flex items-center justify-center gap-1">
            <Pencil className="size-4"/> Επεξεργασία
          </button>
        </div>

        <style>{`
          .btn-primary  {border-radius:.5rem;background:#10b981;padding:.5rem 1rem;font-size:.875rem;font-weight:500;color:#fff;transition:.2s;}
          .btn-primary:hover  {background:#059669;}
          .btn-secondary{border-radius:.5rem;background:rgba(255,255,255,.1);padding:.5rem 1rem;font-size:.875rem;font-weight:500;color:#e5e5e5;transition:.2s;}
          .btn-secondary:hover{background:rgba(255,255,255,.15);}
        `}</style>
      </div>
    </motion.div>
  );
}
