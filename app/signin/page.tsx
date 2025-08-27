"use client";

import { signIn } from "next-auth/react";

export default function Page() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>

      <button
        className="px-4 py-2 rounded bg-black text-white"
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
      >
        Continue with Google
      </button>
    </main>
  );
}
