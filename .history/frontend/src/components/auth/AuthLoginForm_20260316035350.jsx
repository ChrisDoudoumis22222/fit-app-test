import React from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";

export default function AuthLoginForm({
  form,
  error,
  showPw,
  setShowPw,
  setField,
  onSubmit,
  disabled = false,
  onForgotPassword,
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Input
        icon={Mail}
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={setField("email")}
        required
      />

      <Input
        icon={Lock}
        type={showPw ? "text" : "password"}
        placeholder="Κωδικός"
        value={form.password}
        onChange={setField("password")}
        required
        append={
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label={showPw ? "Απόκρυψη κωδικού" : "Εμφάνιση κωδικού"}
          >
            {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        }
      />

      {!!error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <SubmitButton disabled={disabled} />

      <button
        type="button"
        onClick={onForgotPassword}
        className="block w-full text-center text-[15px] text-zinc-500 hover:text-zinc-300 transition-colors py-1"
      >
        Ξέχασες τον κωδικό;
      </button>
    </form>
  );
}

function Input({ icon: Icon, append, ...props }) {
  return (
    <div className="relative group">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />

      <input
        {...props}
        className="w-full pl-10 pr-11 py-4 rounded-xl text-base bg-black/30 border border-zinc-700 text-gray-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 transition-all"
      />

      {append && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {append}
        </div>
      )}
    </div>
  );
}

function SubmitButton({ disabled }) {
  return (
    <motion.button
      type="submit"
      disabled={disabled}
      whileHover={!disabled ? { y: -1 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      transition={{ duration: 0.15 }}
      className={`w-full py-4 rounded-xl font-semibold text-white text-base transition-all duration-300 flex items-center justify-center gap-2 ${
        disabled
          ? "bg-zinc-700 opacity-70 cursor-not-allowed"
          : "bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 shadow-lg"
      }`}
    >
      {disabled ? (
        <Loader2 className="animate-spin w-5 h-5" />
      ) : (
        <>
          Σύνδεση
          <ArrowRight className="w-5 h-5" />
        </>
      )}
    </motion.button>
  );
}