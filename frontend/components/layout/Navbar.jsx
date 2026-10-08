"use client";

/**
 * App navigation.
 *
 * The nav renders differently before and after the auth check resolves: a
 * skeleton in place of the user menu while loading, rather than a signed-out
 * menu that flickers into a signed-in one a moment later.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { FileText, LogOut, Moon, Sparkles, Sun, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { APP_ROUTES } from "@/lib/constants";
import { cn } from "cn";

const LINKS = [
  { href: APP_ROUTES.leads, label: "Leads" },
  { href: APP_ROUTES.profile, label: "Profile" },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <nav
        aria-label="Main"
        className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6"
      >
        <Link
          href={APP_ROUTES.leads}
          className="flex shrink-0 items-center gap-2 font-semibold"
        >
          <Sparkles className="size-4" aria-hidden="true" />
          LeadMatch
        </Link>

        <ul className="flex items-center gap-1">
          {LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          {/*
            Rendered during SSR with no theme knowledge, so it starts as a
            placeholder. Switching after mount would cause a hydration mismatch
            on the icon.
          */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            aria-label="Toggle dark mode"
          >
            <Sun className="size-4 dark:hidden" aria-hidden="true" />
            <Moon className="hidden size-4 dark:block" aria-hidden="true" />
          </Button>

          {loading ? (
            <Skeleton className="h-8 w-24 rounded-md" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="size-4" aria-hidden="true" />
                  <span className="max-w-[8rem] truncate">
                    {user.username || user.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="truncate text-sm font-medium">
                    {user.username}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link href={APP_ROUTES.profile}>
                    <FileText className="size-4" aria-hidden="true" />
                    Edit profile
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onSelect={logout}>
                  <LogOut className="size-4" aria-hidden="true" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm">
              <Link href={APP_ROUTES.login}>Sign in</Link>
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
}