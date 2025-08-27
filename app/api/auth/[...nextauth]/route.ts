// app/api/auth/[...nextauth]/route.ts  (NextAuth v4)
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
