import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const metadata = {
  title: "Sign in",
};

/**
 * The login page is a Server Component; all the interactivity lives in
 * `LoginForm`.
 *
 * The `Suspense` boundary is required, not decorative. `LoginForm` reads
 * `useSearchParams()` to recover the page the proxy bounced the visitor from,
 * and that value only exists at runtime — so without a boundary to stream it
 * in, the build fails with `CLIENT_HOOK_DYNAMIC`. The fallback is a
 * card-shaped skeleton rather than a spinner so the layout does not jump when
 * the form arrives.
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}

function LoginFormSkeleton() {
  return (
    <Card className="w-full max-w-md" aria-busy="true">
      <CardHeader className="space-y-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>

      <CardContent className="space-y-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}