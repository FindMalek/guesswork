import type { Metadata } from "next";
import { Inter, DM_Mono, Stack_Sans_Notch } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AmbientBackground } from "@/components/ambient-background";
import "./globals.css";

// Same three-font pairing as tester.army/e2e: Inter for body copy, DM Mono
// for code/UI-chrome mono text, Stack Sans Notch (free on Google Fonts,
// designed by Koto for Stack Overflow) for display headings.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-mono" });
const stackSansNotch = Stack_Sans_Notch({ subsets: ["latin"], variable: "--font-stack-sans-notch" });

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
      className={`${inter.variable} ${dmMono.variable} ${stackSansNotch.variable} h-full font-sans antialiased`}
    >
      <body className="bg-grain relative min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <TooltipProvider>
            <AmbientBackground />
            {children}
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
