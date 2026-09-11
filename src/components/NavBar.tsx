import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "./ThemeToggle";
import { ContentScaler } from "./ContentScaler";
import { MobileNavMenu } from "./MobileNavMenu";
import { CookTimerBadge } from "./CookTimerBadge";
import { signOut } from "@/app/actions/auth";

export async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { role: string; status: string; display_name: string | null } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role, status, display_name")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur">
      <div className="flex w-full flex-wrap items-center justify-between gap-4 px-4 py-3 sm:flex-nowrap sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 font-serif text-lg font-semibold tracking-tight"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://pfobqnctixdpdzzrtriu.supabase.co/storage/v1/object/public/recipe-photos/brand/logo-64.png"
              alt=""
              className="h-7 w-7"
            />
            Recipe Boxed
          </Link>
          <CookTimerBadge />
        </div>
        <MobileNavMenu>
          <ContentScaler />
          <nav className="flex flex-col gap-4 text-sm sm:flex-row sm:items-center">
            <Link href="/" className="text-[var(--text-muted)] hover:text-[var(--text)]">
              Browse
            </Link>
            <Link href="/shopping-list" className="text-[var(--text-muted)] hover:text-[var(--text)]">
              Shopping List
            </Link>
            <Link href="/offline" className="text-[var(--text-muted)] hover:text-[var(--text)]">
              Offline
            </Link>
            {user && profile?.status === "approved" && (
              <>
                <Link href="/dashboard" className="text-[var(--text-muted)] hover:text-[var(--text)]">
                  My Recipes
                </Link>
                <Link href="/settings" className="text-[var(--text-muted)] hover:text-[var(--text)]">
                  Design
                </Link>
              </>
            )}
            {profile?.role === "admin" && (
              <Link href="/admin" className="text-[var(--text-muted)] hover:text-[var(--text)]">
                Admin
              </Link>
            )}
            <ThemeToggle />
            {user ? (
              <form action={signOut}>
                <button className="text-[var(--text-muted)] hover:text-[var(--text)]">
                  Sign out
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-center text-white hover:bg-[var(--accent-hover)]"
              >
                Sign in
              </Link>
            )}
          </nav>
        </MobileNavMenu>
      </div>
    </header>
  );
}
