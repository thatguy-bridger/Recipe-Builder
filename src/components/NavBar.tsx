import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "./ThemeToggle";
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
      <div className="flex w-full items-center justify-between px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-serif text-lg font-semibold tracking-tight"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-7 w-7" />
          Recipe Boxed
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-[var(--text-muted)] hover:text-[var(--text)]">
            Browse
          </Link>
          {user && profile?.status === "approved" && (
            <Link href="/dashboard" className="text-[var(--text-muted)] hover:text-[var(--text)]">
              My Recipes
            </Link>
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
              className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-white hover:bg-[var(--accent-hover)]"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
