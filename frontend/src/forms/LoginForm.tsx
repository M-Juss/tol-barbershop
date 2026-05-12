'use client';

import { InputWithLabel } from "@/components/common/InputWithLabel";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  loginSchema,
  LoginSchemaFormValues,
} from "@/validations/auth.validation";
import { loginRequest } from "@/services/auth.api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function LoginForm() {

  const router = useRouter();

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchemaFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginSchemaFormValues) => {
    try {
      const response = await loginRequest(data);
      if (response.success == true) {
        toast.success("Login successful! ");
        if (response.data.user.role === "customer") {
          router.push("/customer");
        } else if (response.data.user.role === "admin"){
          router.push("/admin");
        } else if (response.data.user.role === "manager"){
          router.push("/manager");
        }
      }
    } catch (error: any) {
      const errorMessage =
        error?.message || "Login failed. Please try again.";

      toast.error(errorMessage);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full space-y-7 relative"
    >
      <InputWithLabel
        id="email"
        type="email"
        label="Email"
        placeholder="Enter your email"
        className="h-10 border-gray-300 focus-visible:ring-accent/40"
        {...formRegister("email")}
      />

      {errors.email && (
        <p className="text-red-500 text-xs absolute top-16">
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
        <p className="text-red-500 text-xs absolute top-38">
          {errors.password.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-accent hover:bg-accent/90 mb-4 w-full text-white py-2 px-4 rounded-md transition duration-300"
      >
        Login
      </button>
    </form>
  );
}