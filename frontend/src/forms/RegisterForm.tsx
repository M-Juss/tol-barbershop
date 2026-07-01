"use client";
import { InputWithLabel } from "@/components/common/InputWithLabel";
import { SubmitErrorHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  registerSchema,
  RegisterSchemaFormValues,
} from "@/validations/auth.validation";
import { registerCustomerRequest } from "@/services/auth.api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useRateLimit } from "@/hooks/useRateLimit";
import {
  sanitizeString,
  normalizeEmail,
  normalizePhone,
} from "@/lib/sanitizer";

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
    formState: { errors, isSubmitting },
  } = useForm<RegisterSchemaFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterSchemaFormValues) => {
    console.log("Register form submitted");
    console.log("Rate limit status:", rateLimit);

    // Temporarily disable rate limiting for debugging
    // if (!rateLimit.attempt()) {
    //   console.log("Rate limit blocked the request");
    //   return;
    // }

    try {
      const sanitizedData = {
        ...data,
        fullname: sanitizeString(data.fullname),
        email: normalizeEmail(data.email),
        contact_number: normalizePhone(data.contact_number),
      };

      console.log("Sending registration data:", sanitizedData);
      const response = await registerCustomerRequest(sanitizedData);
      console.log("Registration response:", response);

      if (response.success == true) {
        toast.success("Registered successfully");
        rateLimit.reset();
        router.push("/login");
      } else {
        toast.error("Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Registration failed");
    }
  };

  const onFormInvalid: SubmitErrorHandler<RegisterSchemaFormValues> = () => {
    toast.error("All fields are required");
  };

  return (
    <form
      action=""
      className="w-full space-y-6"
      onSubmit={handleSubmit(onSubmit, onFormInvalid)}
    >
      <div className="relative ">
        <InputWithLabel
          id="fullname"
          type="text"
          label="Full Name"
          placeholder="Enter your full name"
          className="h-10 border-gray-300 focus-visible:ring-accent/40"
          {...formRegister("fullname")}
        />
        {errors.fullname && (
          <p className="absolute left-0 top-full  text-red-500 text-xs">
            {errors.fullname.message}
          </p>
        )}
      </div>

      <div className="relative ">
        <InputWithLabel
          id="contact_number"
          type="tel"
          inputMode="numeric"
          label="Contact Number"
          placeholder="Enter your contact number"
          className="h-10 border-gray-300 focus-visible:ring-accent/40"
          maxLength={11}
          {...formRegister("contact_number")}
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

      <div className="relative ">
        <InputWithLabel
          id="email"
          type="email"
          label="Email"
          placeholder="Enter your email"
          className="h-10 border-gray-300 focus-visible:ring-accent/40"
          {...formRegister("email")}
        />
        {errors.email && (
          <p className="absolute left-0 top-full  text-red-500 text-xs">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="relative ">
        <InputWithLabel
          id="password"
          type="password"
          label="Password"
          placeholder="Enter your password"
          className="h-10 border-gray-300 focus-visible:ring-accent/40"
          {...formRegister("password")}
        />
        {errors.password && (
          <p className="absolute left-0 top-full  text-red-500 text-xs">
            {errors.password.message}
          </p>
        )}
      </div>

      <div className="relative ">
        <InputWithLabel
          id="password_confirmation"
          type="password"
          label="Confirm Password"
          placeholder="Enter your password"
          className="h-10 border-gray-300 focus-visible:ring-accent/40"
          {...formRegister("password_confirmation")}
        />
        {errors.password_confirmation && (
          <p className="absolute left-0 top-full  text-red-500 text-xs">
            {errors.password_confirmation.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !rateLimit.canAttempt}
        className="bg-accent hover:bg-accent/90 mb-4 w-full text-white py-2 px-4 rounded-md transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {rateLimit.isCooldown
          ? `Try again in ${rateLimit.formatCooldownTime(rateLimit.cooldownRemaining)}`
          : isSubmitting
            ? "Registering..."
            : "Register"}
      </button>
    </form>
  );
}
