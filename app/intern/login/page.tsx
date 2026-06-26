import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const runtime = "nodejs";

export default function InternLoginPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-navy px-6 py-5">
          <h1 className="text-lg font-semibold text-white">Interne toegang</h1>
          <p className="mt-1 text-sm text-slate-200">Elmar Services | Rovast</p>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
