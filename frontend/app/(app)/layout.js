import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { getServerToken } from "@/lib/serverAuth";
import { APP_ROUTES } from "@/lib/constants";

/**
 * Protected shell for the signed-in area.
 *
 * Redirects when the httpOnly cookie is absent. That check is necessary but not
 * sufficient — the cookie is not verified here, only observed. The authoritative
 * check is the backend rejecting an invalid token on the first real request, so
 * every page under this layout treats "signed in" as a hint rather than a fact.
 */
export default async function AppLayout({ children }) {
  const token = await getServerToken();

  if (!token) {
    redirect(APP_ROUTES.login);
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}