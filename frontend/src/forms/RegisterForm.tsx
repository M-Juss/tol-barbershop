"use client";
import { InputWithLabel } from "@/components/common/InputWithLabel";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  registerSchema,
  RegisterSchemaFormValues,
} from "@/validations/auth.validation";
import { registerCustomerRequest } from "@/services/auth.api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function RegisterForm() {
  const router = useRouter();
  const {
    register: formRegister,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterSchemaFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterSchemaFormValues) => {
    
    try {
      const response = await registerCustomerRequest(data);
      if (response.success == true) {
        toast.success("Registration successful! ");
        router.push("/login");
      }
    } catch (error: any) {
      const errorMessage =
        error?.message || "Registration failed. Please try again.";

      toast.error(errorMessage);
    }
  };

  return (
    <form
      action=""
      className="w-full space-y-7 relative"
      onSubmit={handleSubmit(onSubmit)}
    >
      <InputWithLabel
        id="fullname"
        type="text"
        label="Full Name"
        placeholder="Enter your full name"
        className="h-10 border-gray-300 focus-visible:ring-accent/40"
        {...formRegister("fullname")}
      />
      {errors.fullname && (
        <p className="text-red-500 text-xs absolute top-16">
          {errors.fullname.message}
        </p>
      )}

      <InputWithLabel
        id="contact_number"
        type="text"
        label="Contact Number"
        placeholder="Enter your contact number"
        className="h-10 border-gray-300 focus-visible:ring-accent/40"
        {...formRegister("contact_number")}
      />
      {errors.contact_number && (
        <p className="text-red-500 text-xs absolute top-39">
          {errors.contact_number.message}
        </p>
      )}

      <InputWithLabel
        id="email"
        type="email"
        label="Email"
        placeholder="Enter your email"
        className="h-10 border-gray-300 focus-visible:ring-accent/40"
        {...formRegister("email")}
      />
      {errors.email && (
        <p className="text-red-500 text-xs absolute top-61">
          {errors.email.message}
        </p>
      )}

      <InputWithLabel
        id="password"
        type="password"
        label="Password"
        placeholder="Enter your password"
        className="h-10 border-gray-300 focus-visible:ring-accent/40"
        {...formRegister("password")}
      />
      {errors.password && (
        <p className="text-red-500 text-xs absolute top-83">
          {errors.password.message}
        </p>
      )}

      <InputWithLabel
        id="password_confirmation"
        type="password"
        label="Confirm Password"
        placeholder="Enter your password"
        className="h-10 border-gray-300 focus-visible:ring-accent/40"
        {...formRegister("password_confirmation")}
      />
      {errors.password_confirmation && (
        <p className="text-red-500 text-xs absolute top-106">
          {errors.password_confirmation.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-accent hover:bg-accent/90 mb-4 w-full text-white py-2 px-4 rounded-md transition duration-300"
      >
        {isSubmitting ? "Registering..." : "Register"}
      </button>
    </form>
  );
}
