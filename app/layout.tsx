import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rotational Farming Visualization",
  description: "Monitoring ecosystem balance",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
