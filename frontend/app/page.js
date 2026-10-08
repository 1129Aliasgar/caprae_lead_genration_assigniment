import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { APP_ROUTES } from "@/lib/constants";

/**
 * Landing redirect.
 *
 * Sends a signed-in visitor to their leads and everyone else to login.
 *
 * `cookies()` is awaited — it is async in Next 16. A cookie merely being
 * *present* is enough here because this is only about which page looks
 * plausible; the real verification happens on the destination, where the
 * backend rejects an invalid token. Getting this wrong costs a redirect
 * bounce, not access.
 */
export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  redirect(token ? APP_ROUTES.leads : APP_ROUTES.login);
}