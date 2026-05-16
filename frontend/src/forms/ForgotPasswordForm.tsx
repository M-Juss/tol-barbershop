"use client";

import { InputWithLabel } from "@/components/common/InputWithLabel";
import { forgotPasswordRequest } from "@/services/auth.api";
import {
  ForgotPasswordSchemaFormValues,
  forgotPasswordSchema,
} from "@/validations/auth.validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitErrorHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function ForgotPasswordForm() {
  const router = useRouter();
  const {
    register: formRegister,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordSchemaFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordSchemaFormValues) => {
    try {
      const response = await forgotPasswordRequest(data);
      toast.success("Reset token generated.");

      const token = response?.data?.token;
      const email = response?.data?.email;

      if (token && email) {
        router.push(
          `/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to request password reset";
      toast.error(message);
    }
  };

  const onFormInvalid: SubmitErrorHandler<ForgotPasswordSchemaFormValues> = () => {
    toast.error("Please enter a valid email");
  };

  return (
    <form className="w-full space-y-6" onSubmit={handleSubmit(onSubmit, onFormInvalid)}>
      <div className="relative">
        <InputWithLabel
          id="email"
          type="email"
          label="Email"
          placeholder="Enter your account email"
          className="h-10 border-gray-300 focus-visible:ring-accent/40"
          {...formRegister("email")}
        />
        {errors.email && (
          <p className="absolute left-0 top-full text-red-500 text-xs">
            {errors.email.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-accent hover:bg-accent/90 mb-4 w-full text-white py-2 px-4 rounded-md transition duration-300"
      >
        {isSubmitting ? "Requesting..." : "Send Reset Link"}
      </button>
    </form>
  );
}
