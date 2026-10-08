"use client";

/**
 * Theme provider.
 *
 * `next-themes` writes the `dark` class on `<html>` and persists the choice.
 * The `suppressHydrationWarning` on `<html>` in the root layout is required
 * because that class is set by a script before React hydrates — without it
 * React logs a mismatch on every load in dark mode.
 *
 * `defaultTheme="system"` respects the OS preference on first visit rather
 * than forcing light on someone whose system is dark.
 */

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}