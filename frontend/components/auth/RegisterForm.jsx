"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { register, storeToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toastError, toastSuccess } from "@/hooks/useToast";
import { APP_ROUTES } from "@/lib/constants";

/** Backend Joi bounds, mirrored so errors surface before the round trip. */
const USERNAME_MIN = 3;
const USERNAME_MAX = 30;
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 20;

export function RegisterForm() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const router = useRouter();

  /** Client-side mirror of the backend's rules. */
  const validate = () => {
    const found = {};

    if (username.trim().length < USERNAME_MIN) {
      found.username = `Username must be at least ${USERNAME_MIN} characters`;
    } else if (username.trim().length > USERNAME_MAX) {
      found.username = `Username must be at most ${USERNAME_MAX} characters`;
    }

    if (!email.includes("@") || !email.includes(".")) {
      found.email = "Enter a valid email address";
    }

    if (password.length < PASSWORD_MIN) {
      found.password = `Password must be at least ${PASSWORD_MIN} characters`;
    } else if (password.length > PASSWORD_MAX) {
      found.password = `Password must be at most ${PASSWORD_MAX} characters`;
    }

    return found;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) return;

    const found = validate();

    setErrors(found);

    if (Object.keys(found).length > 0) {
      return;
    }

    setLoading(true);

    try {
      const res = await register({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      storeToken(res.data.token);

      toastSuccess("Account created", "Paste your resume to get started.");

      /*
       * Straight to the profile page — a new account has no profile at all, so
       * `/leads` would refuse with "Paste your resume to get recommendations".
       */
      router.push(APP_ROUTES.profile);
      router.refresh();
    } catch (error) {
      toastError("Registration failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Then paste your resume and we&apos;ll build your profile.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              placeholder="aliasgar"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              aria-invalid={Boolean(errors.username)}
              aria-describedby={errors.username ? "username-error" : undefined}
              required
              disabled={loading}
            />
            {errors.username ? (
              <p id="username-error" className="text-sm text-destructive">
                {errors.username}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              required
              disabled={loading}
            />
            {errors.email ? (
              <p id="email-error" className="text-sm text-destructive">
                {errors.email}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>

            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder={`${PASSWORD_MIN}–${PASSWORD_MAX} characters`}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "password-error" : undefined}
                required
                disabled={loading}
                className="pr-10"
              />

              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                disabled={loading}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:opacity-50"
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>

            {errors.password ? (
              <p id="password-error" className="text-sm text-destructive">
                {errors.password}
              </p>
            ) : null}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link
            href={APP_ROUTES.login}
            className="font-medium text-foreground underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}