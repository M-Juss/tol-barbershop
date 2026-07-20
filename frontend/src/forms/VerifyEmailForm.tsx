"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { XCircle, Loader2 } from "lucide-react";

import { InputWithLabel } from "@/components/common/InputWithLabel";
import { PasswordInputWithLabel } from "@/components/common/PasswordInputWithLabel";
import { Button } from "@/components/ui/button";
import { normalizeEmail } from "@/lib/sanitizer";
import { ApiError } from "@/lib/api";
import {
  changeRegistrationEmailRequest,
  checkEmailVerificationStatus,
  confirmEmailVerificationRequest,
  resendEmailVerificationRequest,
} from "@/services/shared/auth.api";
import {
  changeRegistrationEmailSchema,
  type ChangeRegistrationEmailSchemaFormValues,
} from "@/validations/auth.validation";

type VerifyEmailFormProps = {
  email: string;
};

type VerifyStatus = "loading" | "error";

export function VerifyEmailForm({ email }: VerifyEmailFormProps) {
  const router = useRouter();
  const [currentEmail, setCurrentEmail] = useState(() => normalizeEmail(email));
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [showResend, setShowResend] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [checkInbox, setCheckInbox] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>("loading");
  const [verificationPath, setVerificationPath] = useState<string | null>(null);
  const [changeError, setChangeError] = useState("");
  const hasAutoVerified = useRef(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangeRegistrationEmailSchemaFormValues>({
    resolver: zodResolver(changeRegistrationEmailSchema),
    defaultValues: {
      current_email: currentEmail,
      new_email: "",
      new_email_confirmation: "",
      password: "",
    },
  });

  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const timer = window.setInterval(() => {
      setCooldownRemaining((remaining) => Math.max(0, remaining - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownRemaining]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const fragmentPath = params.get("verification");

    if (fragmentPath) {
      sessionStorage.setItem("email_verification_path", fragmentPath);
    }

    const nextPath =
      fragmentPath ?? sessionStorage.getItem("email_verification_path");
    let active = true;

    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${window.location.search}`,
    );

    queueMicrotask(() => {
      if (active && nextPath) setVerificationPath(nextPath);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!verificationPath || hasAutoVerified.current) return;
    hasAutoVerified.current = true;

    let active = true;

    const autoVerify = async () => {
      try {
        const response =
          await confirmEmailVerificationRequest(verificationPath);
        sessionStorage.removeItem("email_verification_path");
        if (!active) return;
        router.replace(
          `/login?verified=${response.data.status === "already_verified" ? "already" : "1"}`,
        );
      } catch (error) {
        sessionStorage.removeItem("email_verification_path");
        if (!active) return;
        if (error instanceof ApiError && error.status === 422) {
          setVerifyStatus("error");
        } else {
          setVerifyStatus("error");
        }
      }
    };

    autoVerify();

    return () => {
      active = false;
    };
  }, [verificationPath, router]);

  const checkVerification = useCallback(async () => {
    try {
      const response = await checkEmailVerificationStatus(currentEmail);
      if (response.data.verified) {
        sessionStorage.removeItem("email_verification_path");
        router.replace("/login?verified=1");
      }
    } catch {
      // Silently fail — user can try again
    }
  }, [currentEmail, router]);

  useEffect(() => {
    if (verifyStatus !== "loading") return;

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkVerification();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [verifyStatus, checkVerification]);

  const handleResend = async () => {
    if (cooldownRemaining > 0 || isResending) return;

    setIsResending(true);
    try {
      await resendEmailVerificationRequest({ email: currentEmail });
      setCheckInbox(true);
      setCooldownRemaining(60);
      toast.success("If verification is needed, a new email is on its way.");
    } catch {
      toast.error("Unable to send a verification email. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  const handleChangeEmail = async (
    data: ChangeRegistrationEmailSchemaFormValues,
  ) => {
    setChangeError("");

    try {
      const response = await changeRegistrationEmailRequest({
        current_email: currentEmail,
        password: data.password,
        new_email: normalizeEmail(data.new_email),
        new_email_confirmation: normalizeEmail(data.new_email_confirmation),
      });
      const updatedEmail = normalizeEmail(response.data.email);

      setCurrentEmail(updatedEmail);
      setCheckInbox(true);
      setShowChangeEmail(false);
      reset({
        current_email: updatedEmail,
        new_email: "",
        new_email_confirmation: "",
        password: "",
      });
      router.replace(`/verify-email?email=${encodeURIComponent(updatedEmail)}`);
      toast.success("Registration email updated. Check your new inbox.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to change the registration email.";
      setChangeError(message);
      toast.error(message);
    }
  };

  if (verifyStatus === "loading" && verificationPath) {
    return (
      <div className="flex flex-col items-center space-y-4 py-8">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-sm text-gray-600">Verifying your email...</p>
      </div>
    );
  }

  if (verifyStatus === "error" && verificationPath) {
    return (
      <div className="flex flex-col items-center space-y-4 py-8">
        <XCircle className="h-14 w-14 text-red-500" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Verification Failed
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            This verification link is invalid or expired.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={checkVerification}
          className="mt-4"
        >
          I&apos;ve verified my email
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      {checkInbox && (
        <div
          className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800"
          role="status"
        >
          Check the inbox and spam folder for <strong>{currentEmail}</strong>.
          If verification is needed, a new link is on its way.
        </div>
      )}

      <InputWithLabel
        id="registration-email"
        type="email"
        label="Registration email"
        value={currentEmail}
        disabled
        className="h-10 border-gray-300 bg-gray-50 text-gray-700 disabled:cursor-not-allowed disabled:opacity-100"
      />

      <Button
        type="button"
        variant="outline"
        onClick={checkVerification}
        className="w-full"
      >
        I&apos;ve verified my email
      </Button>

      {!showResend ? (
        <button
          type="button"
          aria-expanded="false"
          aria-controls="verification-help"
          onClick={() => setShowResend(true)}
          className="mx-auto block text-sm text-gray-500 underline-offset-4 hover:text-accent hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Didn&apos;t receive the email?
        </button>
      ) : (
        <div id="verification-help" className="space-y-4">
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending || cooldownRemaining > 0}
            className="w-full rounded-md bg-accent px-4 py-2 text-white transition duration-300 hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isResending
              ? "Sending..."
              : cooldownRemaining > 0
                ? `Resend available in ${cooldownRemaining}s`
                : "Resend Verification Email"}
          </button>

          <button
            type="button"
            aria-expanded={showChangeEmail}
            aria-controls="change-registration-email"
            onClick={() => {
              setChangeError("");
              setShowChangeEmail((visible) => !visible);
            }}
            className="mx-auto block text-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Entered the wrong email? Change registration email
          </button>

          {showChangeEmail && (
            <form
              id="change-registration-email"
              method="post"
              className="space-y-4 rounded-md border border-gray-200 bg-gray-50 p-4"
              onSubmit={handleSubmit(handleChangeEmail)}
              noValidate
            >
              <div>
                <InputWithLabel
                  id="new-email"
                  type="email"
                  label="New email"
                  placeholder="Enter your new email"
                  maxLength={255}
                  autoComplete="email"
                  aria-invalid={Boolean(errors.new_email)}
                  aria-describedby={errors.new_email ? "new-email-error" : undefined}
                  className="h-10 border-gray-300 focus-visible:ring-accent/40"
                  {...register("new_email")}
                />
                {errors.new_email && (
                  <p id="new-email-error" className="mt-1 text-xs text-red-600">
                    {errors.new_email.message}
                  </p>
                )}
              </div>

              <div>
                <InputWithLabel
                  id="new-email-confirmation"
                  type="email"
                  label="Confirm new email"
                  placeholder="Re-enter your new email"
                  maxLength={255}
                  autoComplete="email"
                  aria-invalid={Boolean(errors.new_email_confirmation)}
                  aria-describedby={
                    errors.new_email_confirmation
                      ? "new-email-confirmation-error"
                      : undefined
                  }
                  className="h-10 border-gray-300 focus-visible:ring-accent/40"
                  {...register("new_email_confirmation")}
                />
                {errors.new_email_confirmation && (
                  <p
                    id="new-email-confirmation-error"
                    className="mt-1 text-xs text-red-600"
                  >
                    {errors.new_email_confirmation.message}
                  </p>
                )}
              </div>

              <div>
                <PasswordInputWithLabel
                  id="registration-password"
                  label="Registration password"
                  placeholder="Enter your registration password"
                  maxLength={255}
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={
                    errors.password ? "registration-password-error" : undefined
                  }
                  className="h-10 border-gray-300 focus-visible:ring-accent/40"
                  {...register("password")}
                />
                {errors.password && (
                  <p
                    id="registration-password-error"
                    className="mt-1 text-xs text-red-600"
                  >
                    {errors.password.message}
                  </p>
                )}
              </div>

              {changeError && (
                <p className="text-sm text-red-700" role="alert">
                  {changeError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-md bg-primary px-4 py-2 text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Updating..." : "Update registration email"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
