import type { Metadata } from "next";
import IntruderModule from "@/components/modules/intruder";

export const metadata: Metadata = { title: "Intruder — BurpStar Suite Pro" };

export default function Page() {
  return <IntruderModule />;
}