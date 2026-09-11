"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  return supabase;
}

export async function setUserStatus(userId: string, status: "approved" | "rejected") {
  const supabase = await requireAdmin();
  await supabase.from("profiles").update({ status }).eq("id", userId);
  revalidatePath("/admin");
}

export async function setUserRole(userId: string, role: "user" | "admin") {
  const supabase = await requireAdmin();
  await supabase.from("profiles").update({ role }).eq("id", userId);
  revalidatePath("/admin");
}
