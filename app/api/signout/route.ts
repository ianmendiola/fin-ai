export async function POST() {
  // Hardcode every possible auth cookie name — we can't rely on reading
  // cookies from the request because CloudFront may not forward them.
  const names = [
    "authjs.session-token",
    "authjs.callback-url",
    "authjs.csrf-token",
    "__Secure-authjs.session-token",
    "__Secure-authjs.callback-url",
    "__Secure-authjs.csrf-token",
    "next-auth.session-token",
    "next-auth.callback-url",
    "next-auth.csrf-token",
    "__Secure-next-auth.session-token",
    "__Secure-next-auth.callback-url",
    "__Secure-next-auth.csrf-token",
  ];

  const headers = new Headers();
  headers.set("Content-Type", "text/html");
  headers.set("Cache-Control", "no-store");

  for (const name of names) {
    // Delete without Secure flag (HTTP / localhost)
    headers.append(
      "Set-Cookie",
      `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`
    );
    // Also delete with Secure flag (HTTPS / production)
    headers.append(
      "Set-Cookie",
      `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure`
    );
  }

  // Return an HTML page (200, not a redirect) so CloudFront doesn't strip
  // the Set-Cookie headers.  A <meta refresh> handles navigation to /login.
  return new Response(
    `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=/login"></head></html>`,
    { status: 200, headers }
  );
}
