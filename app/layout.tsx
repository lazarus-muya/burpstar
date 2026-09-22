import type { Metadata } from "next";
import "./globals.css";
import TopBar from "@/components/topbar";
import StatusBar from "@/components/statusbar";

export const metadata: Metadata = {
  title: "BurpStar Suite Pro — Web Security Testing Platform",
  description:
    "Automated web application security testing suite for penetration testers.",
};

export const dynamic = "force-dynamic";

export default function RootLayout(props: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="flex h-screen min-h-0 flex-col overflow-hidden font-sans text-[12.5px] text-text antialiased">
        <TopBar />
        <main className="flex min-h-0 flex-1 flex-col">{props.children}</main>
        <StatusBar />
      </body>
    </html>
  );
}