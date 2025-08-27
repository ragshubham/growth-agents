"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

export default function Page() {
  useEffect(() => {
    // sign out then go back to /signin
    signOut({ callbackUrl: "/signin" });
  }, []);

  return <main className="p-6">Signing you out…</main>;
}
