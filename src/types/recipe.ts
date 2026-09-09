export type Profile = {
  id: string;
  display_name: string | null;
  role: "user" | "admin";
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export type Ingredient = {
  id: string;
  recipe_id: string;
  position: number;
  amount: number | null;
  unit: string | null;
  name: string;
  notes: string | null;
};

export type Step = {
  id: string;
  recipe_id: string;
  position: number;
  body: string;
  photo_url: string | null;
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
  prep_minutes: number | null;
  cook_minutes: number | null;
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
