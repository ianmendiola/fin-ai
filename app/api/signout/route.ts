import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await cookies();

  for (const cookie of cookieStore.getAll()) {
    if (
      cookie.name.includes("authjs") ||
      cookie.name.includes("next-auth")
    ) {
      cookieStore.delete(cookie.name);
    }
  }

  return NextResponse.json({ ok: true });
}
