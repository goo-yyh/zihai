"use client";

import { LoaderCircle, Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import {
  AUTH_CAPTCHA_ANSWER_HEADER,
  AUTH_CAPTCHA_ID_HEADER,
  authCaptchaChallengeSchema,
  type AuthCaptchaChallenge,
} from "@/lib/auth-captcha";
import { isAllowedAuthEmail } from "@/lib/auth-email";

export function RegisterForm({ returnTo }: { returnTo: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [otpEmail, setOtpEmail] = useState<string | null>(null);
  const [registrationEmail, setRegistrationEmail] = useState<string | null>(
    null,
  );
  const [captcha, setCaptcha] = useState<AuthCaptchaChallenge | null>(null);

  function beginRequest() {
    setLoading(true);
    setError(null);
    setNotice(null);
  }

  async function loadCaptcha(email: string) {
    beginRequest();

    try {
      const response = await fetch("/api/auth/captcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload: unknown = await response.json();
      const parsed = authCaptchaChallengeSchema.safeParse(payload);

      if (!response.ok || !parsed.success) {
        setError(t("Unable to load image verification code."));
        setLoading(false);
        return false;
      }

      setRegistrationEmail(email);
      setCaptcha(parsed.data);
      setLoading(false);
      return true;
    } catch {
      setError(t("Unable to load image verification code."));
      setLoading(false);
      return false;
    }
  }

  async function sendEmailOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "")
      .trim()
      .toLowerCase();

    if (!isAllowedAuthEmail(email)) {
      setError(t("Only qq.com and 163.com email addresses are supported."));
      return;
    }

    await loadCaptcha(email);
  }

  async function verifyCaptchaAndSendEmailOtp(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    if (!captcha || !registrationEmail) return;
    beginRequest();
    const formData = new FormData(event.currentTarget);
    const answer = String(formData.get("captcha") || "").trim();

    try {
      const response = await fetch(
        "/api/auth/email-otp/send-verification-otp",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            [AUTH_CAPTCHA_ID_HEADER]: captcha.id,
            [AUTH_CAPTCHA_ANSWER_HEADER]: answer,
          },
          body: JSON.stringify({ email: registrationEmail, type: "sign-in" }),
        },
      );

      if (!response.ok) {
        const message =
          response.status === 429
            ? "Too many verification requests. Try again later."
            : "Image verification code is invalid or expired.";
        const refreshed = await loadCaptcha(registrationEmail);
        if (refreshed) setError(t(message));
        return;
      }

      setOtpEmail(registrationEmail);
      setCaptcha(null);
      setNotice(t("Verification code sent. Check your inbox."));
      setLoading(false);
    } catch {
      setError(t("Unable to send verification code."));
      setLoading(false);
    }
  }

  async function verifyEmailOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!otpEmail) return;
    beginRequest();
    const formData = new FormData(event.currentTarget);
    const result = await authClient.signIn.emailOtp({
      email: otpEmail,
      otp: String(formData.get("otp") || "").trim(),
    });

    if (result.error) {
      setError(t("Verification code is invalid or expired."));
      setLoading(false);
      return;
    }

    router.replace(`/onboarding?next=${encodeURIComponent(returnTo)}`);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-muted/30 p-4">
        <div className="mb-4 flex items-center gap-2">
          <Mail className="size-4 text-primary" />
          <p className="font-bold">{t("Sign up with email")}</p>
        </div>

        {otpEmail ? (
          <form className="space-y-3" onSubmit={verifyEmailOtp}>
            <div className="space-y-1.5">
              <Label htmlFor="registerOtp">{t("Verification code")}</Label>
              <Input
                id="registerOtp"
                name="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                minLength={6}
                maxLength={6}
                pattern="[0-9]{6}"
                placeholder="123456"
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">{otpEmail}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : null}
                {t("Verify and continue")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={loading}
                onClick={() => {
                  setOtpEmail(null);
                  setError(null);
                  setNotice(null);
                }}
              >
                {t("Use a different email")}
              </Button>
            </div>
          </form>
        ) : captcha && registrationEmail ? (
          <form className="space-y-4" onSubmit={verifyCaptchaAndSendEmailOtp}>
            <div className="space-y-1.5">
              <Label htmlFor="registerCaptcha">
                {t("Image verification code")}
              </Label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Image
                  src={captcha.image}
                  alt={t("Image verification code")}
                  width={220}
                  height={72}
                  unoptimized
                  draggable={false}
                  className="rounded-xl border bg-white"
                />
                <Button
                  type="button"
                  variant="ghost"
                  disabled={loading}
                  onClick={() => void loadCaptcha(registrationEmail)}
                >
                  {t("Refresh image")}
                </Button>
              </div>
              <Input
                id="registerCaptcha"
                name="captcha"
                inputMode="numeric"
                autoComplete="off"
                minLength={5}
                maxLength={5}
                pattern="[2-9]{5}"
                placeholder={t("Enter the characters shown")}
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                {registrationEmail}
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              {t("Verify and send code")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={loading}
              onClick={() => {
                setRegistrationEmail(null);
                setCaptcha(null);
                setError(null);
                setNotice(null);
              }}
            >
              {t("Change email address")}
            </Button>
          </form>
        ) : (
          <form className="space-y-3" onSubmit={sendEmailOtp}>
            <div className="space-y-1.5">
              <Label htmlFor="registerEmail">{t("Email address")}</Label>
              <Input
                id="registerEmail"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="name@qq.com"
                maxLength={254}
                required
              />
              <p className="text-xs text-muted-foreground">
                {t("Supported email domains: qq.com and 163.com.")}
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              {t("Send verification code")}
            </Button>
            <p className="text-xs leading-5 text-muted-foreground">
              {t("A new account is created only after the email is verified.")}
            </p>
          </form>
        )}
      </div>

      {error ? (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="text-sm font-medium text-emerald-700" role="status">
          {notice}
        </p>
      ) : null}

      <p className="text-center text-sm text-muted-foreground">
        {t("Already have an account?")}{" "}
        <Link
          href={`/login?next=${encodeURIComponent(returnTo)}`}
          className="font-bold text-foreground underline-offset-4 hover:underline"
        >
          {t("Sign in")}
        </Link>
      </p>
    </div>
  );
}
