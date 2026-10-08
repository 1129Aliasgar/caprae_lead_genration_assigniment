import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const metadata = {
  title: "Create account",
};

/**
 * The register page is a Server Component; all the interactivity lives in
 * `RegisterForm`.
 *
 * The `Suspense` boundary is required. `RegisterForm` reads `useRouter`, and
 * in Next 16 the navigation hooks are runtime-only — so without a boundary to
 * stream it in, the build cannot prerender this route.
 */
export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Suspense fallback={<RegisterFormSkeleton />}>
        <RegisterForm />
      </Suspense>
    </main>
  );
}

function RegisterFormSkeleton() {
  return (
    <Card className="w-full max-w-md" aria-busy="true">
      <CardHeader className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>

      <CardContent className="space-y-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}