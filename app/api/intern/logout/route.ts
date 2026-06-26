import { NextResponse } from "next/server";
import { INTERN_COOKIE } from "@/lib/intern-auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const baseUrl =
    process.env.APP_BASE_URL?.replace(/\/+$/, "") || new URL(req.url).origin;
  const res = NextResponse.redirect(`${baseUrl}/intern/login`, { status: 303 });
  res.cookies.set(INTERN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
