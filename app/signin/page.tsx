"use client";

import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 via-white to-neutral-100 relative overflow-hidden">
      {/* subtle background circles */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.3, scale: 1.2 }}
        transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-tr from-purple-200 to-indigo-200 blur-3xl"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.3, scale: 1.2 }}
        transition={{ duration: 2, delay: 1, repeat: Infinity, repeatType: "reverse" }}
        className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-tr from-pink-200 to-orange-200 blur-3xl"
      />

      <div className="z-10 w-full max-w-md mx-auto p-8 bg-white/80 backdrop-blur rounded-2xl shadow-xl text-center space-y-8">
        {/* logo + title */}
        <div className="flex flex-col items-center space-y-2">
          <div className="flex items-center gap-2 text-xl font-semibold">
            <Shield className="w-6 h-6 text-indigo-600" />
            <span>Shield Agent</span>
          </div>
          <p className="text-sm text-neutral-500">Your daily growth safety net</p>
        </div>

        {/* headline */}
        <div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Sign in securely with Google to access your dashboard
          </p>
        </div>

        {/* button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-black text-white font-medium shadow-lg hover:bg-neutral-800"
        >
          <img
            src="https://www.svgrepo.com/show/355037/google.svg"
            alt="Google"
            className="w-5 h-5"
          />
          Continue with Google
        </motion.button>

        {/* trust note */}
        <p className="text-xs text-neutral-400">
          We’ll never post or share without your permission.
        </p>
      </div>
    </main>
  );
}
