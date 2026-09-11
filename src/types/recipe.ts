export type Profile = {
  id: string;
  display_name: string | null;
  role: "user" | "admin";
  status: "pending" | "approved" | "rejected";
  created_at: string;
  theme_accent: string | null;
  theme_radius: string | null;
  theme_font: string | null;
  theme_watermark_url: string | null;
};

export type Ingredient = {
  id: string;
  recipe_id: string;
  position: number;
  amount: number | null;
  unit: string | null;
  name: string;
  category: string | null;
  note: string | null;
};

export type Step = {
  id: string;
  recipe_id: string;
  position: number;
  body: string;
  photo_urls: string[];
  is_pinned: boolean;
  timer_minutes: string | null;
};

export type Photo = {
  id: string;
  recipe_id: string;
  url: string;
  position: number;
};

export type Recipe = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  servings: number | null;
  serving_unit: string;
  prep_minutes: string | null;
  cook_minutes: string | null;
  total_minutes: string | null;
  tags: string[];
  equipment: string[];
  video_url: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type RecipeWithDetails = Recipe & {
  recipe_ingredients: Ingredient[];
  recipe_steps: Step[];
  recipe_photos: Photo[];
};
