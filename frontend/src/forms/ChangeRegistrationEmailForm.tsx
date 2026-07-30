"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { InputWithLabel } from "@/components/common/InputWithLabel";
import { PasswordInputWithLabel } from "@/components/common/PasswordInputWithLabel";
import { Button } from "@/components/ui/button";
import { normalizeEmail } from "@/lib/sanitizer";
import { changeRegistrationEmailRequest } from "@/services/shared/auth.api";
import {
  changeRegistrationEmailSchema,
  type ChangeRegistrationEmailSchemaFormValues,
} from "@/validations/auth.validation";

type ChangeRegistrationEmailFormProps = {
  currentEmail: string;
};

export function ChangeRegistrationEmailForm({
  currentEmail,
}: ChangeRegistrationEmailFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
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

  const onSubmit = async (
    data: ChangeRegistrationEmailSchemaFormValues,
  ) => {
    try {
      const response = await changeRegistrationEmailRequest({
        current_email: currentEmail,
        password: data.password,
        new_email: normalizeEmail(data.new_email),
        new_email_confirmation: normalizeEmail(
          data.new_email_confirmation,
        ),
      });
      const updatedEmail = normalizeEmail(response.data.email);

      toast.success("Registration email updated. Check your new inbox.");
      router.replace(
        `/verify-email?email=${encodeURIComponent(updatedEmail)}`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to change the registration email.",
      );
    }
  };

  return (
    <form
      method="post"
      className="w-full space-y-4"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <InputWithLabel
        id="current-registration-email"
        type="email"
        label="Current registration email"
        value={currentEmail}
        disabled
        className="h-10 border-gray-300 bg-gray-50 text-gray-700 disabled:cursor-not-allowed disabled:opacity-100"
      />

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

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Updating..." : "Update registration email"}
      </Button>
    </form>
  );
}
