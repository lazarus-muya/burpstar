import type { Metadata } from "next";
import DashboardModule from "@/components/modules/dashboard";

export const metadata: Metadata = { title: "Dashboard — BurpStar Suite Pro" };

export default function Page() {
  return <DashboardModule />;
}