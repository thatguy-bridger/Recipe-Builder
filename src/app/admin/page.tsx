import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setUserStatus, setUserRole } from "@/app/actions/admin";
import type { Profile } from "@/types/recipe";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") redirect("/");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  const pending = (profiles ?? []).filter((p: Profile) => p.status === "pending");
  const others = (profiles ?? []).filter((p: Profile) => p.status !== "pending");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 font-serif text-3xl font-semibold">Admin</h1>

      <section className="mb-10">
        <h2 className="mb-3 font-serif text-xl font-semibold">Pending approval</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No pending accounts.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pending.map((p: Profile) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3"
              >
                <span className="text-sm">
                  {p.display_name} <span className="text-[var(--text-muted)]">({p.id.slice(0, 8)})</span>
                </span>
                <div className="flex gap-2">
                  <form action={setUserStatus.bind(null, p.id, "approved")}>
                    <button className="rounded-full bg-[var(--success)] px-3 py-1 text-xs font-medium text-white">
                      Approve
                    </button>
                  </form>
                  <form action={setUserStatus.bind(null, p.id, "rejected")}>
                    <button className="rounded-full border border-[var(--border)] px-3 py-1 text-xs">
                      Reject
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold">All accounts</h2>
        <ul className="flex flex-col gap-3">
          {others.map((p: Profile) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3"
            >
              <span className="text-sm">
                {p.display_name}{" "}
                <span className="text-[var(--text-muted)]">
                  · {p.status} · {p.role}
                </span>
              </span>
              <form
                action={setUserRole.bind(null, p.id, p.role === "admin" ? "user" : "admin")}
              >
                <button className="rounded-full border border-[var(--border)] px-3 py-1 text-xs">
                  {p.role === "admin" ? "Revoke admin" : "Make admin"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
