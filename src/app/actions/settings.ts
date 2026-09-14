"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isFontPreset, isRadiusPreset } from "@/lib/designLanguage";

export async function updateDesignLanguage(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const accentRaw = String(formData.get("theme_accent") || "").trim();
  const themeAccent = /^#[0-9a-f]{6}$/i.test(accentRaw) ? accentRaw : null;

  const radiusRaw = String(formData.get("theme_radius") || "");
  const themeRadius = isRadiusPreset(radiusRaw) ? radiusRaw : null;

  const fontRaw = String(formData.get("theme_font") || "");
  const themeFont = isFontPreset(fontRaw) ? fontRaw : null;

  const watermarkRaw = String(formData.get("theme_watermark_url") || "").trim();
  const themeWatermarkUrl = watermarkRaw || null;

  const themeApplyToApp = formData.get("theme_apply_to_app") === "on";

  const { error } = await supabase
    .from("profiles")
    .update({
      theme_accent: themeAccent,
      theme_radius: themeRadius,
      theme_font: themeFont,
      theme_watermark_url: themeWatermarkUrl,
      theme_apply_to_app: themeApplyToApp,
    })
    .eq("id", user.id);

  if (error) redirect(`/settings?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect("/settings?saved=1");
}
