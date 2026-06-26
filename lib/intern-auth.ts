import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

// Afscherming van de interne pagina's met één gedeeld wachtwoord (INTERN_WACHTWOORD).
// Na inloggen zetten we een httpOnly-cookie met een HMAC-token dat van het
// wachtwoord is afgeleid. Wijzigt het wachtwoord, dan vervallen alle cookies.

export const INTERN_COOKIE = "elmar_intern";
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 uur

/** Token afgeleid van het ingestelde wachtwoord; null als niet geconfigureerd. */
function expectedToken(): string | null {
  const pwd = process.env.INTERN_WACHTWOORD;
  if (!pwd) return null;
  return crypto.createHmac("sha256", pwd).update("elmar-intern-v1").digest("hex");
}

/** Constant-time stringvergelijking. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/** Controleer een ingevoerd wachtwoord tegen INTERN_WACHTWOORD. */
export function verifyPassword(input: string): boolean {
  const pwd = process.env.INTERN_WACHTWOORD;
  if (!pwd) return false;
  return safeEqual(input, pwd);
}

/** Het token dat als cookiewaarde wordt gezet na succesvol inloggen. */
export function sessionToken(): string | null {
  return expectedToken();
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
}

/** Is het huidige verzoek (via cookie) geautoriseerd voor de interne omgeving? */
export async function isInternAuthed(): Promise<boolean> {
  const expected = expectedToken();
  if (!expected) return false;
  const store = await cookies();
  const val = store.get(INTERN_COOKIE)?.value;
  if (!val) return false;
  return safeEqual(val, expected);
}

/** Voor server components/pagina's: redirect naar login als niet geautoriseerd. */
export async function requireInternPage(nextPath: string): Promise<void> {
  if (!(await isInternAuthed())) {
    redirect(`/intern/login?next=${encodeURIComponent(nextPath)}`);
  }
}

/** Voor route handlers: geeft een 401-response terug, of null als toegestaan. */
export async function internGuard(): Promise<NextResponse | null> {
  if (!(await isInternAuthed())) {
    return NextResponse.json(
      { ok: false, error: "Niet geautoriseerd." },
      { status: 401 },
    );
  }
  return null;
}
