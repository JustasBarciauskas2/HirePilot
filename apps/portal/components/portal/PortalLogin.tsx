"use client";

import { getApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { friendlySignInError, PORTAL_CAPTCHA_FAILED_MESSAGE } from "@techrecruit/shared/lib/auth-error-message";

const inputClass =
  "w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#2563EB]/50 focus:ring-2 focus:ring-[#2563EB]/15";

const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() ?? "";

export function PortalLogin({
  entrySyncErrorMessage,
  onClearEntrySyncFailed,
}: {
  /** Server message after tenant sync failed (e.g. missing Firebase custom claim). */
  entrySyncErrorMessage?: string | null;
  onClearEntrySyncFailed?: () => void;
} = {}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const mounted = useRef(true);
  const [recaptchaReady, setRecaptchaReady] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);

  useEffect(() => {
    setRecaptchaReady(true);
    return () => {
      mounted.current = false;
    };
  }, []);

  const formError = err;
  const sessionVerifyError = !formError && entrySyncErrorMessage?.trim() ? entrySyncErrorMessage.trim() : null;

  function resetCaptcha() {
    recaptchaRef.current?.reset();
    setCaptchaToken(null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setPending(true);
    try {
      if (recaptchaSiteKey) {
        const token = captchaToken ?? recaptchaRef.current?.getValue() ?? null;
        if (!token) {
          setErr(PORTAL_CAPTCHA_FAILED_MESSAGE);
          return;
        }
        const verify = await fetch("/api/portal/auth/verify-recaptcha", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await verify.json().catch(() => ({}))) as { error?: string };
        if (!verify.ok) {
          setErr(typeof data.error === "string" && data.error.trim() ? data.error : PORTAL_CAPTCHA_FAILED_MESSAGE);
          resetCaptcha();
          return;
        }
      }

      const auth = getAuth(getApp());
      await signInWithEmailAndPassword(auth, email.trim(), password);
      resetCaptcha();
    } catch (e) {
      setErr(friendlySignInError(e));
      resetCaptcha();
    } finally {
      if (mounted.current) setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-slate-200/80 bg-white/95 p-8 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.15),0_0_0_1px_rgba(37,99,235,0.04)] backdrop-blur-sm">
      <div className="mb-2 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-slate-50">
          <Image
            src="/brand-logo.png"
            alt=""
            width={48}
            height={48}
            className="h-10 w-10 object-contain"
            priority
            unoptimized
          />
        </span>
        <div>
          <p className="font-display text-lg font-semibold text-[#0B1F3A] sm:text-xl">Recruiter portal</p>
          <p className="text-xs font-medium text-slate-500">Sign in to continue</p>
        </div>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">
        Use your work email and password to manage vacancies.
      </p>
      {formError || sessionVerifyError ? (
        <p className="mt-4 rounded-xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-800" role="alert">
          {formError ?? sessionVerifyError}
        </p>
      ) : null}
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-600">Email</span>
          <input
            className={inputClass}
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              onClearEntrySyncFailed?.();
            }}
            required
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-600">Password</span>
          <input
            className={inputClass}
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              onClearEntrySyncFailed?.();
            }}
            required
          />
        </label>
        {recaptchaSiteKey && recaptchaReady ? (
          <div className="flex justify-center overflow-x-auto py-1">
            <ReCAPTCHA ref={recaptchaRef} sitekey={recaptchaSiteKey} onChange={(t) => setCaptchaToken(t)} />
          </div>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-[#2563EB] px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_28px_-8px_rgba(37,99,235,0.5)] transition hover:bg-[#1d4ed8] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 disabled:opacity-50"
        >
          {pending ? "Signing in…" : "Log in to portal"}
        </button>
      </form>
    </div>
  );
}
