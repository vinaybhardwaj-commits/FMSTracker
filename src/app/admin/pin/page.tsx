/**
 * src/app/admin/pin/page.tsx — S09 PIN entry surface.
 *
 * 4-digit keypad. Auto-submit on the 4th digit. On success → redirect to
 * ?next=<path> (or /admin if missing). Wrong PIN → shake animation,
 * remaining-attempts counter. 429 lockout → friendly hard-stop message.
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const KEYS: ReadonlyArray<string> = [
  "1", "2", "3",
  "4", "5", "6",
  "7", "8", "9",
  "", "0", "←",
];

export default function PinEntryPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/admin";

  const [digits, setDigits] = useState<string>("");
  const [shake, setShake] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [locked, setLocked] = useState<{ retryAfterMs: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const submit = useCallback(
    async (pin: string) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/pin-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          router.replace(next);
          return;
        }
        if (res.status === 429) {
          setLocked({ retryAfterMs: data.retryAfterMs ?? 0 });
        } else {
          setShake(true);
          setError("Wrong PIN");
          if (typeof data.remaining === "number") setRemaining(data.remaining);
          setTimeout(() => setShake(false), 450);
          setDigits("");
        }
      } catch {
        setError("Network error — try again");
        setDigits("");
      } finally {
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [next, router]
  );

  // Auto-submit on 4th digit
  useEffect(() => {
    if (digits.length === 4 && !submitting) {
      void submit(digits);
    }
  }, [digits, submit, submitting]);

  // Hardware keyboard support
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (locked) return;
      if (/^[0-9]$/.test(e.key)) {
        setDigits((d) => (d.length < 4 ? d + e.key : d));
      } else if (e.key === "Backspace") {
        setDigits((d) => d.slice(0, -1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locked]);

  function press(k: string) {
    if (locked || submitting) return;
    if (k === "←") {
      setDigits((d) => d.slice(0, -1));
    } else if (k && digits.length < 4) {
      setDigits((d) => d + k);
    }
  }

  if (locked) {
    const mins = Math.ceil(locked.retryAfterMs / 60_000);
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <div className="text-2xl font-semibold text-red-700">Too many wrong PINs</div>
        <p className="text-base text-slate-700">
          Locked for the next {mins} {mins === 1 ? "minute" : "minutes"}. Find Charan or V.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="text-center">
        <div className="text-2xl font-bold text-ehrc-navy">Admin access</div>
        <div className="mt-1 text-sm text-slate-500">Charan + V only</div>
      </div>

      <div
        className={`flex gap-3 ${shake ? "animate-[shake_0.45s_ease-in-out]" : ""}`}
        style={
          shake
            ? ({
                animation: "shake 0.45s ease-in-out",
              } as React.CSSProperties)
            : undefined
        }
        aria-label="PIN dots"
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-4 w-4 rounded-full border-2 ${
              i < digits.length
                ? "border-ehrc-blue bg-ehrc-blue"
                : "border-slate-300"
            }`}
          />
        ))}
      </div>

      {error && (
        <div className="text-sm text-red-600" role="alert">
          {error}
          {typeof remaining === "number" && remaining > 0 && (
            <span className="ml-1 text-slate-500">({remaining} left)</span>
          )}
        </div>
      )}

      <div className="grid w-full grid-cols-3 gap-3">
        {KEYS.map((k, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => press(k)}
            disabled={!k || submitting}
            className={`h-16 rounded-2xl text-2xl font-medium transition active:scale-95 ${
              k === ""
                ? "invisible"
                : k === "←"
                ? "bg-slate-100 text-ehrc-navy hover:bg-slate-200"
                : "bg-white text-ehrc-navy ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
            aria-label={k === "←" ? "Backspace" : k || "spacer"}
          >
            {k}
          </button>
        ))}
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </main>
  );
}
