"use client";

import { useEffect, useState } from "react";
import { InputWithLabel } from "@/components/common/InputWithLabel";
import { Button } from "@/components/ui/button";
import { SubmitErrorHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  accountInformationSchema,
  AccountInformationSchemaFormValues,
} from "@/validations/user.validation";
import { changeInformation } from "@/services/customer/user.api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export function AccountInformationForm() {
  const { user, refreshUser } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<AccountInformationSchemaFormValues>({
    resolver: zodResolver(accountInformationSchema),
    defaultValues: {
      fullname: "",
      email: "",
      contact_number: "",
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        fullname: user.fullname ?? "",
        email: user.email ?? "",
        contact_number: user.contact_number ?? "",
      });
    }
  }, [reset, user]);

  const [isEditing, setIsEditing] = useState(false);

  const onFormInvalid: SubmitErrorHandler<
    AccountInformationSchemaFormValues
  > = () => {
    toast.error("All fields are required");
  };

  const onFormSubmit = async (data: AccountInformationSchemaFormValues) => {
    try {
      await changeInformation(data);

      await refreshUser();
      setIsEditing(false);
      toast.success("Account information updated successfully");
    } catch {
      toast.error("Failed to update account information");
    }
  };

  const handleCancel = () => {
    if (user) {
      reset({
        fullname: user.fullname ?? "",
        email: user.email ?? "",
        contact_number: user.contact_number ?? "",
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
