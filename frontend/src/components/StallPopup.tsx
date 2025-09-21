import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, RotateCcw } from "lucide-react";

type Props = {
  open: boolean;
  message?: string;
  onRetry?: () => void;          // e.g. refetch
  onReload?: () => void;         // optional override; defaults to window.location.reload()
  onClose?: () => void;          // optional "X"/overlay click handler
};

export function StallPopup({
  open,
  message = "Άργησε πολύ να φορτώσει. Δοκίμασε ξανά ή επαναφόρτωσε τη σελίδα.",
  onRetry,
  onReload,
  onClose
}: Props) {
  const reload = () => (onReload ? onReload() : window.location.reload());

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          aria-modal="true"
          role="dialog"
        >
          {/* overlay */}
          <button
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Κλείσιμο"
            onClick={onClose}
          />
          {/* card */}
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-4 w-full max-w-md rounded-2xl border border-amber-500/30
                       bg-[rgba(17,18,21,.85)] p-6 text-white shadow-[0_10px_40px_rgba(0,0,0,.5)]"
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-xl bg-amber-500/20 p-2 border border-amber-500/30">
                <AlertCircle className="h-6 w-6 text-amber-300" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Καθυστέρηση φόρτωσης</h3>
                <p className="text-amber-100/90">{message}</p>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={onRetry}
                    className="inline-flex items-center justify-center rounded-xl border border-amber-500/40
                               bg-amber-500/20 px-4 py-2.5 font-medium text-amber-100
                               hover:bg-amber-500/30 transition"
                  >
                    Δοκίμασε ξανά
                  </button>
                  <button
                    onClick={reload}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15
                               bg-white/10 px-4 py-2.5 font-medium text-white hover:bg-white/15 transition"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Επαναφόρτωση σελίδας
                  </button>
                </div>
              </div>
            </div>

            {/* optional X */}
            {onClose && (
              <button
                onClick={onClose}
                className="absolute right-3 top-3 rounded-lg px-2 py-1 text-white/70 hover:bg-white/10"
                aria-label="Κλείσιμο"
              >
                ×
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
