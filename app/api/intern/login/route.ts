import { NextResponse } from "next/server";
import {
  verifyPassword,
  sessionToken,
  cookieOptions,
  INTERN_COOKIE,
} from "@/lib/intern-auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Ongeldige aanvraag." },
      { status: 400 },
    );
  }

  const wachtwoord =
    typeof (body as { wachtwoord?: unknown })?.wachtwoord === "string"
      ? (body as { wachtwoord: string }).wachtwoord
      : "";

  if (!process.env.INTERN_WACHTWOORD) {
    return NextResponse.json(
      {
        ok: false,
        error: "Server niet geconfigureerd (INTERN_WACHTWOORD ontbreekt).",
      },
      { status: 500 },
    );
  }

  if (!verifyPassword(wachtwoord)) {
    return NextResponse.json(
      { ok: false, error: "Onjuist wachtwoord." },
      { status: 401 },
    );
  }

  const token = sessionToken();
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Server niet geconfigureerd." },
      { status: 500 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(INTERN_COOKIE, token, cookieOptions());
  return res;
}
