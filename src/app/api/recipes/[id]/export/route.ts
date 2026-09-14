import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // This is only ever linked from the edit page, which is itself gated by
  // can_edit_recipe — mirror that check here rather than relying solely on
  // RLS, so this route can't become an open "fetch any recipe by id"
  // endpoint if a select policy is ever loosened.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: canEdit } = await supabase.rpc("can_edit_recipe", { rid: id });
  if (!canEdit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: recipe } = await supabase
    .from("recipes")
    .select(
      "title, description, servings, serving_unit, prep_minutes, cook_minutes, total_minutes, tags, equipment, video_url, recipe_ingredients(position, amount, unit, name, category, note), recipe_steps(position, body, photo_urls, is_pinned, timer_minutes)"
    )
    .eq("id", id)
    .single();

  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const exported = {
    format: "recipe-boxed/v1",
    title: recipe.title,
    description: recipe.description,
    servings: recipe.servings,
    serving_unit: recipe.serving_unit,
    prep_minutes: recipe.prep_minutes,
    cook_minutes: recipe.cook_minutes,
    total_minutes: recipe.total_minutes,
    tags: recipe.tags,
    equipment: recipe.equipment,
    video_url: recipe.video_url,
    ingredients: [...recipe.recipe_ingredients]
      .sort((a, b) => a.position - b.position)
      .map(({ amount, unit, name, category, note }) => ({ amount, unit, name, category, note })),
    steps: [...recipe.recipe_steps]
      .sort((a, b) => a.position - b.position)
      .map(({ body, photo_urls, is_pinned, timer_minutes }) => ({ body, photo_urls, is_pinned, timer_minutes })),
  };

  const filename = `${recipe.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "recipe"}.json`;

  return new NextResponse(JSON.stringify(exported, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
