import React from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
} from "lucide-react";

export default function AuthLoginForm({
  form,
  error,
  showPw,
  setShowPw,
  setField,
  submitting = false,
  googleSubmitting = false,
  onGoogleLogin,
  onForgotPassword,
}) {
  const disabled = submitting || googleSubmitting;

  return (
    <>
      <div className="space-y-3">
        <GoogleButton
          loading={googleSubmitting}
          onClick={onGoogleLogin}
          text="Σύνδεση με Google"
        />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-700/70" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-black/40 px-3 text-xs tracking-wide uppercase text-zinc-500">
              ή
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-5">
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
      </div>

      <SubmitButton disabled={disabled} />

      <button
        type="button"
        onClick={onForgotPassword}
        className="block w-full text-center text-[15px] text-zinc-500 hover:text-zinc-300 transition-colors py-1"
      >
        Ξέχασες τον κωδικό;
      </button>
    </>
  );
}

function GoogleButton({ loading, onClick, text }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={loading}
      whileHover={!loading ? { y: -1 } : {}}
      whileTap={!loading ? { scale: 0.98 } : {}}
      transition={{ duration: 0.15 }}
      className={`w-full py-4 rounded-xl font-semibold text-base
        transition-all duration-300 flex items-center justify-center gap-3 border
        ${
          loading
            ? "bg-white/70 text-zinc-700 border-white/70 opacity-80 cursor-not-allowed"
            : "bg-white text-zinc-900 border-white hover:bg-zinc-100 shadow-lg"
        }`}
    >
      {loading ? (
        <Loader2 className="animate-spin w-5 h-5" />
      ) : (
        <>
          <GoogleIcon />
          <span>{text}</span>
        </>
      )}
    </motion.button>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.239 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.193l-6.19-5.238C29.145 35.091 26.715 36 24 36c-5.218 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.051 12.051 0 0 1-4.084 5.569l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
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
      className={`w-full py-4 rounded-xl font-semibold text-white text-base
        transition-all duration-300 flex items-center justify-center gap-2
        ${
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

function Input({ icon: Icon, append, ...props }) {
  return (
    <div className="relative group">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
      <input
        {...props}
        className="w-full pl-10 pr-11 py-4 rounded-xl text-base
          bg-black/30 border border-zinc-700 text-gray-200 placeholder-zinc-500
          focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500
          transition-all"
      />
      {append && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {append}
        </div>
      )}
    </div>
  );
}