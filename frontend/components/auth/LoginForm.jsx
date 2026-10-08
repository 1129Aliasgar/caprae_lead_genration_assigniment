"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import  Link  from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { login, storeToken } from "@/lib/api";
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
import { cn } from "cn";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  /*
   * The proxy appends `?next=` when it bounces an unauthenticated visitor, so
   * they land back where they were going. Falling back to `/leads` when it is
   * absent means a direct visit to `/login` behaves sensibly.
   */
  const next = useSearchParams().get("next") || APP_ROUTES.leads;

  /**
   * Only ever redirect to a path, never to a full URL.
   *
   * `next` arrives from the query string, so it is attacker-controllable. An
   * unvalidated `router.push(next)` on a value like `//evil.example` is an
   * open redirect — the user would be navigated off-site by a link that looked
   * internal.
   */
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : APP_ROUTES.leads;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) return;

    setLoading(true);

    try {
      const res = await login({ email, password });

      /*
       * The backend returns the JWT in the body *and* sets an httpOnly
       * cookie. Storing it is what lets the axios interceptor authenticate
       * later requests from client components.
       */
      storeToken(res.data.token);

      toastSuccess("Signed in");

      router.push(safeNext);
      router.refresh();
    } catch (error) {
      toastError("Sign in failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Welcome back. Your ranked leads are waiting.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>

            {/*
              Relative wrapper so the toggle can sit inside the field's right
              edge without a second row. The input keeps full width and the
              button overlays it, so there is no layout shift when toggling —
              which there would be if the button were a sibling below.
            */}
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={loading}
                className="pr-10"
              />

              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                disabled={loading}
                /*
                  `aria-label` rather than a tooltip: the icon is the control, so
                  its accessible name has to say what it does. `aria-pressed`
                  conveys the state, which the icon alone does not.
                */
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
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          No account yet?{" "}
          <Link
            href={APP_ROUTES.register}
            className="font-medium text-foreground underline underline-offset-4"
          >
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}