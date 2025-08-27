import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// The secret must match your NEXTAUTH_SECRET in .env
const secret = process.env.NEXTAUTH_SECRET;

export async function middleware(req: NextRequest) {
  // 1. Check if user has a token (logged in)
  const token = await getToken({ req, secret });

  // If no token and not already on /signin → redirect to signin
  if (!token && !req.nextUrl.pathname.startsWith("/signin")) {
    return NextResponse.redirect(new URL("/signin", req.url));
  }

  // 2. If logged in → check onboarding
  // For now we’ll fake it, later we’ll query Prisma
  const onboarded = token?.onboarded || false;

  if (token && !onboarded && !req.nextUrl.pathname.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  // Else → allow through
  return NextResponse.next();
}

// Apply middleware to ALL routes except API, _next, static files
export const config = {
  matcher: ["/((?!api|_next|static|favicon.ico).*)"],
};
