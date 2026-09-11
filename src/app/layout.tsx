import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CookTimerProvider } from "@/components/CookTimerProvider";
import { NavBar } from "@/components/NavBar";
import { createClient } from "@/lib/supabase/server";
import { buildThemeStyle } from "@/lib/designLanguage";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const iconUrl =
  "https://pfobqnctixdpdzzrtriu.supabase.co/storage/v1/object/public/recipe-photos/brand/icon-128.png";

export const metadata: Metadata = {
  title: "Recipe Boxed",
  description: "A shared home for every recipe, from the kitchen to the classroom.",
  icons: {
    icon: iconUrl,
    apple: iconUrl,
    shortcut: iconUrl,
  },
  // This is a private class tool, not a public site — keep it out of search
  // engines even though recipes are readable without signing in.
  robots: {
    index: false,
    follow: false,
  },
};

const themeInitScript = `
(function() {
  try {
    var t = localStorage.getItem('theme');
    if (t === 'light' || t === 'dark') {
      document.documentElement.setAttribute('data-theme', t);
    }
    var s = localStorage.getItem('contentScale');
    if (s) {
      document.documentElement.style.fontSize = s + '%';
    }
  } catch (e) {}
})();
`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // A viewer's own personal design language (opt-in — see /settings) applies
  // to the general app chrome only. It's set here, at the root, precisely so
  // that recipe-scoped surfaces (RecipeCard, the recipe detail page, Cook
  // Mode) can each pin their own --accent/--radius/--font-serif back to
  // either the recipe owner's branding or the app default, isolating recipe
  // content from this personal skin regardless of who's viewing it.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let personalSkin: React.CSSProperties = {};
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("theme_accent, theme_radius, theme_font, theme_apply_to_app")
      .eq("id", user.id)
      .single();
    if (profile?.theme_apply_to_app) {
      personalSkin = buildThemeStyle(profile);
    }
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col" style={personalSkin}>
        <ThemeProvider>
          <CookTimerProvider>
            <NavBar />
            <main className="flex-1">{children}</main>
          </CookTimerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
