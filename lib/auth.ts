// lib/auth.ts (NextAuth v4 helper)
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export function auth() {
  return getServerSession(authOptions);
}
