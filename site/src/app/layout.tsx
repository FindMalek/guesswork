import type { Metadata } from "next";
import { Inter, Geist_Mono, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AmbientBackground } from "@/components/ambient-background";
import "./globals.css";

// Variable names only need to exist on the <html> className for next/font to
// inject the actual @font-face + fallback metrics; globals.css's @theme
// inline block references the literal family names directly (see the
// comment there), not these variables, so their names here don't matter.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
  title: "guesswork — Fish-style autosuggestions for zsh",
  description:
    "AI-ranked zsh history autosuggestions. As you type, guesswork sends your recent history to a model and guesses which command you're retyping — including abbreviations and fuzzy matches, not just literal prefixes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // suppressHydrationWarning: next-themes sets the resolved theme class
      // on <html> before React hydrates, which legitimately differs from the
      // server-rendered markup -- this is the documented way to silence that
      // specific, expected mismatch without disabling other checks.
      suppressHydrationWarning
      className={`${inter.variable} ${geistMono.variable} ${jetbrainsMono.variable} h-full font-sans antialiased`}
    >
      <body className="bg-grain relative min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <TooltipProvider>
            <AmbientBackground />
            {children}
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
