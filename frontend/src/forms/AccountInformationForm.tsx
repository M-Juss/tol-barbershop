"use client";

import { useEffect, useState } from "react";
import { InputWithLabel } from "@/components/common/InputWithLabel";
import { PasswordInputWithLabel } from "@/components/common/PasswordInputWithLabel";
import { Button } from "@/components/ui/button";
import { SubmitErrorHandler, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  accountInformationSchema,
  AccountInformationSchemaFormValues,
} from "@/validations/user.validation";
import { changeInformation } from "@/services/customer/user.api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api";
import { sanitizeString, normalizeEmail, normalizePhone } from "@/lib/sanitizer";

function getEmailValidationMessage(error: ApiError): string | null {
  if (!error.errors || typeof error.errors !== "object") return null;

  const emailErrors = (error.errors as Record<string, unknown>).email;
  if (!Array.isArray(emailErrors) || typeof emailErrors[0] !== "string") {
    return null;
  }

  return emailErrors[0];
}

export function AccountInformationForm() {
  const { user, refreshUser } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setError,
    control,
  } = useForm<AccountInformationSchemaFormValues>({
    resolver: zodResolver(accountInformationSchema),
    defaultValues: {
      fullname: "",
      email: "",
      contact_number: "",
      current_password: "",
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        fullname: user.fullname ?? "",
        email: user.email ?? "",
        contact_number: user.contact_number ?? "",
        current_password: "",
      });
    }
  }, [reset, user]);

  const [isEditing, setIsEditing] = useState(false);
  const watchedEmail = useWatch({ control, name: "email" });
  const emailIsChanging = Boolean(
    user && normalizeEmail(watchedEmail ?? "") !== normalizeEmail(user.email),
  );

  const onFormInvalid: SubmitErrorHandler<
    AccountInformationSchemaFormValues
  > = () => {
    toast.error("All fields are required");
  };

  const onFormSubmit = async (data: AccountInformationSchemaFormValues) => {
    try {
      const sanitized = {
        ...data,
        fullname: sanitizeString(data.fullname),
        email: normalizeEmail(data.email),
        contact_number: normalizePhone(data.contact_number),
        current_password: data.current_password || undefined,
      };
      if (emailIsChanging && !sanitized.current_password) {
        setError("current_password", {
          message: "Current password is required to change your email.",
        });
        return;
      }

      await changeInformation(sanitized);

      if (emailIsChanging) {
        toast.success("Email updated. Verify your new address to continue.");
        window.location.replace(
          `/verify-email?email=${encodeURIComponent(sanitized.email)}`,
        );
        return;
      }

      await refreshUser();
      setIsEditing(false);
      toast.success("Account information updated successfully");
    } catch (error) {
      if (error instanceof ApiError) {
        const emailMessage = getEmailValidationMessage(error);
        if (emailMessage) {
          toast.error(emailMessage);
          return;
        }

        toast.error(error.message);
        return;
      }

      toast.error("Failed to update account information");
    }
  };

  const handleCancel = () => {
    if (user) {
      reset({
        fullname: user.fullname ?? "",
        email: user.email ?? "",
        contact_number: user.contact_number ?? "",
        current_password: "",
      });
    }
    setIsEditing(false);
  };

  const memberSinceValue = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-4">
      <div className="flex items-start justify-between mb-6">
        <div className="relative ">
          <h2 className="text-base font-bold text-gray-900">
            Account Information
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">Your personal details</p>
        </div>

        {!isEditing && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>
        )}
      </div>

      <form
        method="post"
        onSubmit={handleSubmit(onFormSubmit, onFormInvalid)}
        className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5"
      >
        <div>
          <InputWithLabel
            id="fullname"
            label="Full Name"
            disabled={!isEditing}
            className="h-10"
            {...register("fullname")}
          />
          {errors.fullname && (
            <p className="absolute left-0 top-full  text-red-500 text-xs">
              {errors.fullname.message}
            </p>
          )}
        </div>

        <div className="relative ">
          <InputWithLabel
            id="email"
            type="email"
            label="Email"
            disabled={!isEditing}
            className="h-10"
            {...register("email")}
          />
          {errors.email && (
            <p className="absolute left-0 top-full  text-red-500 text-xs">{errors.email.message}</p>
          )}
        </div>

        <div className="relative ">
          <InputWithLabel
            id="contact_number"
            label="Contact Number"
            type="tel"
            inputMode="numeric"
            disabled={!isEditing}
            className="h-10"
            maxLength={11}
            {...register("contact_number")}
            onInput={(e: React.FormEvent<HTMLInputElement>) => {
              e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "");
            }}
          />
          {errors.contact_number && (
            <p className="absolute left-0 top-full  text-red-500 text-xs">
              {errors.contact_number.message}
            </p>
          )}
        </div>

        <InputWithLabel
          id="member-since"
          label="Member Since"
          value={memberSinceValue}
          disabled
          className="h-10"
        />

        {isEditing && emailIsChanging && (
          <div className="relative sm:col-span-2">
            <PasswordInputWithLabel
              id="current_password"
              label="Current Password"
              autoComplete="current-password"
              maxLength={255}
              {...register("current_password")}
            />
            {errors.current_password && (
              <p className="mt-1 text-xs text-red-500">
                {errors.current_password.message}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Required to protect changes to your sign-in email.
            </p>
          </div>
        )}

        {isEditing && (
          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
