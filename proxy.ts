import { auth } from "@/app/lib/auth";
import { NextResponse } from "next/server";

export const proxy = auth((req) => {
  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Tell CloudFront to NEVER cache authenticated responses.
  // Without this, CloudFront caches the Set-Cookie header from the
  // session refresh and replays it to every visitor — including
  // signed-out users and incognito sessions.
  const res = NextResponse.next();
  res.headers.set("Cache-Control", "private, no-store, must-revalidate");
  return res;
});

export const config = {
  matcher: ["/((?!login|api/auth|api/signout|_next/static|_next/image|favicon.ico).*)"],
};
