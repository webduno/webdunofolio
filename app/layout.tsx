import type { Metadata } from "next";
import { Lilita_One, Raleway } from "next/font/google";
import "./globals.css";

const lilita = Lilita_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-lilita",
});

const raleway = Raleway({
  weight: ["100", "400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-raleway",
});

export const metadata: Metadata = {
  title: "Abraham Duno | webduno.com",
  description: "Full-stack developer and 3D artist portfolio",
  icons: {
    icon: "/favicon-32x32.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${lilita.variable} ${raleway.variable}`}>
      <body>{children}</body>
    </html>
  );
}
