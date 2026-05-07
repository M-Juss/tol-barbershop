'use client';
import { InputWithLabel } from "@/components/common/InputWithLabel";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  loginSchema,
  LoginSchemaFormValues,
} from "@/validations/auth.validation";

export function LoginForm() {
  const {
    register: formRegister,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchemaFormValues>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <form  className="w-full space-y-4">
      <InputWithLabel
        id="email"
        type="email"
        label="Email"
        placeholder="Enter your email"
        className="h-10 border-gray-300 focus-visible:ring-accent/40"
        {...formRegister("email")}
      />
      {errors.email && (
        <p className="text-red-500 text-xs">{errors.email.message}</p>
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
        <p className="text-red-500 text-xs">{errors.password.message}</p>
      )}
      <button
        type="submit"
        className="bg-accent hover:bg-accent/90 mb-4 w-full text-white py-2 px-4 rounded-md transition duration-300"
      >
        Login
      </button>
    </form>
  );
}
