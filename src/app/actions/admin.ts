"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function setUserStatus(userId: string, status: "approved" | "rejected") {
  const supabase = await createClient();
  await supabase.from("profiles").update({ status }).eq("id", userId);
  revalidatePath("/admin");
}

export async function setUserRole(userId: string, role: "user" | "admin") {
  const supabase = await createClient();
  await supabase.from("profiles").update({ role }).eq("id", userId);
  revalidatePath("/admin");
}
