"use client";

import { Circle, CircleCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type SubmitErrorHandler,
  useForm,
  useWatch,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { CheckboxWithLabel } from "@/components/common/CheckboxWithLabel";
import { InputWithLabel } from "@/components/common/InputWithLabel";
import { PasswordInputWithLabel } from "@/components/common/PasswordInputWithLabel";
import { Button } from "@/components/ui/button";
import { useRateLimit } from "@/hooks/useRateLimit";
import { cn } from "@/lib/utils";
import {
  normalizeEmail,
  normalizePhone,
  sanitizeString,
} from "@/lib/sanitizer";
import { registerCustomerRequest } from "@/services/shared/auth.api";
import {
  registerSchema,
  type RegisterSchemaFormValues,
} from "@/validations/auth.validation";

const passwordRequirements = [
  {
    label: "At least 6 characters",
    test: (password: string) => password.length >= 6,
  },
];

export function RegisterForm() {
  const router = useRouter();
  const rateLimit = useRateLimit({
    maxAttempts: 20,
    cooldownMinutes: 1,
    storageKey: "register_rate_limit",
  });

  const {
    register: formRegister,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterSchemaFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      terms_accepted: false,
      privacy_acknowledged: false,
    },
  });
  const termsAccepted = useWatch({ control, name: "terms_accepted", defaultValue: false });
  const password = useWatch({ control, name: "password", defaultValue: "" });
  const passwordConfirmation = useWatch({
    control,
    name: "password_confirmation",
    defaultValue: "",
  });
  const passwordsMatch =
    passwordConfirmation.length > 0 && password === passwordConfirmation;

  const onSubmit = async (data: RegisterSchemaFormValues) => {
    if (!rateLimit.attempt()) return;

    try {
      const sanitizedData = {
        ...data,
        fullname: sanitizeString(data.fullname),
        email: normalizeEmail(data.email),
        contact_number: normalizePhone(data.contact_number),
      };

      const response = await registerCustomerRequest(sanitizedData);

      if (response.success === true) {
        toast.success("Check your inbox if email verification is required.");
        rateLimit.reset();
        router.push(
          `/verify-email?email=${encodeURIComponent(sanitizedData.email)}`,
        );
      } else {
        toast.error("Registration failed");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Registration failed. Please try again.");
    }
  };

  const onFormInvalid: SubmitErrorHandler<RegisterSchemaFormValues> = () => {
    toast.error("All fields are required");
  };

  return (
    <form
      method="post"
      className="w-full space-y-3 px-1 py-1"
      onSubmit={handleSubmit(onSubmit, onFormInvalid)}
    >
      <div className="relative mb-5">
        <InputWithLabel
          id="fullname"
          type="text"
          label="Full Name"
          placeholder="Enter your full name"
          maxLength={255}
          className="h-8 text-sm border-gray-300 focus-visible:ring-accent/40"
          {...formRegister("fullname")}
        />
        {errors.fullname && (
          <p className="absolute left-0 top-full text-red-500 text-xs">
            {errors.fullname.message}
          </p>
        )}
      </div>

      <div className="relative mb-5">
        <InputWithLabel
          id="contact_number"
          type="tel"
          inputMode="numeric"
          label="Contact Number"
          placeholder="Enter your contact number"
          className="h-8 text-sm border-gray-300 focus-visible:ring-accent/40"
          maxLength={11}
          {...formRegister("contact_number")}
          onInput={(e: React.FormEvent<HTMLInputElement>) => {
            e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "");
          }}
        />
        {errors.contact_number && (
          <p className="absolute left-0 top-full text-red-500 text-xs">
            {errors.contact_number.message}
          </p>
        )}
      </div>

      <div className="relative mb-5">
        <InputWithLabel
          id="email"
          type="email"
          label="Email"
          placeholder="Enter your email"
          maxLength={255}
          className="h-8 text-sm border-gray-300 focus-visible:ring-accent/40"
          {...formRegister("email")}
        />
        {errors.email && (
          <p className="absolute left-0 top-full text-red-500 text-xs">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="relative mb-5 space-y-0.5">
        <PasswordInputWithLabel
          id="password"
          label="Password"
          placeholder="Enter your password"
          maxLength={255}
          autoComplete="new-password"
          className="h-8 text-sm border-gray-300 focus-visible:ring-accent/40"
          {...formRegister("password")}
        />
        {errors.password && (
          <p className="absolute left-0 top-full text-red-500 text-xs">
            {errors.password.message}
          </p>
        )}
        <ul className="grid gap-0.5 sm:grid-cols-2" aria-live="polite">
          {passwordRequirements.map((requirement) => {
            const isMet = requirement.test(password);
            const RequirementIcon = isMet ? CircleCheck : Circle;

            return (
              <li
                key={requirement.label}
                className={cn(
                  "flex items-center gap-1 text-[11px] transition-colors",
                  isMet ? "font-medium text-green-600" : "text-gray-500",
                )}
              >
                <RequirementIcon
                  className="size-3 shrink-0"
                  aria-hidden="true"
                />
                {requirement.label}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="relative mb-2 space-y-0.5">
        <PasswordInputWithLabel
          id="password_confirmation"
          label="Confirm Password"
          placeholder="Confirm your password"
          maxLength={255}
          autoComplete="new-password"
          className="h-8 text-sm border-gray-300 focus-visible:ring-accent/40"
          {...formRegister("password_confirmation")}
        />
        {errors.password_confirmation && (
          <p className="absolute left-0 top-full text-red-500 text-xs">
            {errors.password_confirmation.message}
          </p>
        )}
        <p
          className={cn(
            "flex items-center gap-1 text-[11px] transition-colors",
            passwordsMatch ? "font-medium text-green-600" : "text-gray-500",
          )}
          aria-live="polite"
        >
          {passwordsMatch ? (
            <CircleCheck className="size-3" aria-hidden="true" />
          ) : (
            <Circle className="size-3" aria-hidden="true" />
          )}
          {passwordsMatch ? "Passwords match" : "Passwords must match"}
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 mt-5 p-2.5">
        <CheckboxWithLabel
          id="terms_accepted"
          checked={termsAccepted}
          onCheckedChange={(checked) => {
            const value = Boolean(checked);
            setValue("terms_accepted", value, { shouldValidate: true });
            setValue("privacy_acknowledged", value, { shouldValidate: true });
          }}
          error={errors.terms_accepted?.message ?? errors.privacy_acknowledged?.message}
          label={
            <span className="text-xs">
              I agree to the{" "}
              <Link href="/terms-of-use" target="_blank" className="font-medium text-accent hover:underline">
                Terms of Use
              </Link>{" "}
              and{" "}
              <Link href="/privacy-policy" target="_blank" className="font-medium text-accent hover:underline">
                Privacy Policy
              </Link>
              .
            </span>
          }
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting || !rateLimit.canAttempt}
        className="h-10 w-full bg-accent px-4 text-sm text-white hover:bg-accent/90"
      >
        {rateLimit.isCooldown
          ? `Try again in ${rateLimit.formatCooldownTime(rateLimit.cooldownRemaining)}`
          : isSubmitting
            ? "Registering..."
            : "Register"}
      </Button>
    </form>
  );
}
