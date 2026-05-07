"use client";
import { InputWithLabel } from "@/components/common/InputWithLabel";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  registerSchema,
  RegisterSchemaFormValues,
} from "@/validations/auth.validation";

export function RegisterForm() {
  const {
    register: formRegister,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterSchemaFormValues>({
    resolver: zodResolver(registerSchema),
  });

  return (
    <form action="" className="w-full space-y-4">
      <InputWithLabel
        id="name"
        type="text"
        label="Full Name"
        placeholder="Enter your full name"
        className="h-10 border-gray-300 focus-visible:ring-accent/40"
        {...formRegister("fullname")}
      />

      <InputWithLabel
        id="contact_number"
        type="text"
        label="Contact Number"
        placeholder="Enter your contact number"
        className="h-10 border-gray-300 focus-visible:ring-accent/40"
        {...formRegister("contact_number")}
      />

      <InputWithLabel
        id="email"
        type="email"
        label="Email"
        placeholder="Enter your email"
        className="h-10 border-gray-300 focus-visible:ring-accent/40"
        {...formRegister("email")}
      />

      <InputWithLabel
        id="password"
        type="password"
        label="Password"
        placeholder="Enter your password"
        className="h-10 border-gray-300 focus-visible:ring-accent/40"
        {...formRegister("password")}
      />

      <InputWithLabel
        id="password_confirmation"
        type="password"
        label="Confirm Password"
        placeholder="Enter your password"
        className="h-10 border-gray-300 focus-visible:ring-accent/40"
        {...formRegister("password_confirmation")}
      />

      <button
        type="submit"
        className="bg-accent hover:bg-accent/90 mb-4 w-full text-white py-2 px-4 rounded-md transition duration-300"
      >
        Register
      </button>
    </form>
  );
}
