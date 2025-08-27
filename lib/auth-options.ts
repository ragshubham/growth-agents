// lib/auth-options.ts (NextAuth v4)
import type { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // keep accounts linked if same email (safe with Google)
      allowDangerousEmailAccountLinking: true as any,
    }),
  ],
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async session({ session, user }) {
      // expose id + onboardingComplete on session.user
      if (session?.user) {
        (session.user as any).id = (user as any).id;
        (session.user as any).onboardingComplete =
          (user as any).onboardingComplete ?? false;
      }
      return session;
    },
  },
};
