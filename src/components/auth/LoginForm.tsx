"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginFormData } from "@/lib/validations/auth";
import { loginAction } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { Input } from "../ui/input";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    const result = await loginAction(data);
    if (!result.success) {
      setError(result.error || "Failed to sign in");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700 ml-1">
            Email Address
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-orange-600 transition-colors">
              <Mail className="h-5 w-5" />
            </div>
            <Input
              type="email"
              placeholder="name@example.com"
              {...register("email")}
              className="w-full h-12 rounded-xl bg-slate-50/50 border border-slate-200 pl-11 pr-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 focus:bg-white transition-all shadow-sm"
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-500 mt-1.5 ml-1 font-medium flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-red-500 inline-block"></span>
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center ml-1">
            <label className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <Link href="#" className="text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors">
              Forgot password?
            </Link>
          </div>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-orange-600 transition-colors">
              <Lock className="h-5 w-5" />
            </div>
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              {...register("password")}
              className="w-full h-12 rounded-xl bg-slate-50/50 border border-slate-200 pl-11 pr-11 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 focus:bg-white transition-all shadow-sm"
            />
            <Button variant="custom" type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </Button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-500 mt-1.5 ml-1 font-medium flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-red-500 inline-block"></span>
              {errors.password.message}
            </p>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium flex items-start gap-2">
            <div className="mt-0.5">
              <svg className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
            </div>
            {error}
          </div>
        )}

        <Button variant="custom" type="submit" disabled={isLoading}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold text-[15px] mt-4 shadow-[0_4px_14px_0_rgb(234,88,12,0.39)] hover:shadow-[0_6px_20px_rgba(234,88,12,0.23)] hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign In
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

