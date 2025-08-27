"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";

export default function SignInPage() {
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");

  async function continueWithGoogle() {
    setLoading(true);
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } finally {
      setLoading(false);
    }
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setNote("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNote("Enter a valid work email.");
      return;
    }
    const r = await signIn("email", { email, callbackUrl: "/dashboard", redirect: false });
    setNote(r?.ok ? "Check your inbox for a one-time link." : "Could not send link. Try again.");
  }

  return (
    <main className="min-h-screen relative overflow-hidden bg-gradient-to-br from-neutral-50 via-white to-neutral-100 flex flex-col">
      {/* Breathing background glows */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 0.5, scale: 1.15 }}
        transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse" }}
        className="pointer-events-none absolute -top-40 -left-40 w-[650px] h-[650px] rounded-full bg-gradient-to-tr from-indigo-300 to-sky-400 blur-[180px]"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 0.5, scale: 1.15 }}
        transition={{ duration: 2.5, delay: 1.2, repeat: Infinity, repeatType: "reverse" }}
        className="pointer-events-none absolute -bottom-40 -right-40 w-[650px] h-[650px] rounded-full bg-gradient-to-tr from-pink-300 to-rose-400 blur-[180px]"
      />

      {/* Header */}
      <header className="h-14 flex items-center justify-center sm:justify-start px-4 max-w-5xl w-full mx-auto">
        <a href="/" className="flex items-center gap-2 font-semibold text-neutral-900">
          <Shield className="w-5 h-5 text-indigo-600" />
          <span>Shield Agent</span>
        </a>
      </header>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="relative w-full max-w-md rounded-2xl bg-white/80 backdrop-blur shadow-xl p-8 text-center">
          <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-black/15 to-transparent" />

          {/* Logo with shimmer sweep */}
          <div className="relative mx-auto mb-3 h-10 w-10">
            {/* base icon */}
            <Shield className="relative h-10 w-10 text-indigo-600 drop-shadow-sm" />
            {/* shimmer pass (diagonal light sweep) */}
            <motion.div
              aria-hidden
              initial={{ x: -24, opacity: 0 }}
              animate={{ x: 24, opacity: [0, 0.9, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.2 }}
              className="
                pointer-events-none absolute -inset-2
                bg-gradient-to-r from-transparent via-white to-transparent
                skew-x-12
                [mask-image:radial-gradient(closest-side,white,transparent)]
                mix-blend-screen
              "
            />
          </div>

          {/* Bold subtext */}
          <p className="text-neutral-800 font-semibold">Sign in securely to continue</p>

          {/* Modes */}
          {!showEmail ? (
            <>
              <button
                onClick={continueWithGoogle}
                disabled={loading}
                className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-black text-white font-medium shadow-lg hover:brightness-110 disabled:opacity-60"
              >
                <img
                  src="https://www.svgrepo.com/show/355037/google.svg"
                  alt="Google"
                  className="w-5 h-5"
                />
                {loading ? "Opening Google…" : "Continue with Google"}
              </button>

              <button
                onClick={() => setShowEmail(true)}
                className="mt-4 w-full text-sm text-neutral-700 underline"
              >
                Use work email instead
              </button>
            </>
          ) : (
            <div className="mt-6 space-y-4">
              <form onSubmit={sendMagicLink} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@agency.com"
                  className="w-full rounded-lg border border-neutral-300 bg-white/90 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="w-full rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white shadow hover:brightness-110"
                >
                  Email me a sign-in link
                </button>
              </form>

              {note && (
                <p className="text-xs text-neutral-600" aria-live="polite">
                  {note}
                </p>
              )}

              {/* Outline secondary for Google */}
              <button
                onClick={() => setShowEmail(false)}
                className="w-full rounded-lg border border-neutral-300 bg-white/60 px-4 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
              >
                Use Google instead
              </button>
            </div>
          )}

          {/* Trust microcopy */}
          <p className="mt-8 text-[11px] text-neutral-500">Secure • Private • Revocable</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-[12px] text-neutral-500">
        <div className="space-x-4">
          <a className="underline" href="/legal/terms">Terms</a>
          <a className="underline" href="/legal/privacy">Privacy</a>
          <a className="underline" href="mailto:support@growthagents.io">Contact</a>
        </div>
        <div className="mt-2">© {new Date().getFullYear()} GrowthAgents.io</div>
      </footer>
    </main>
  );
}
