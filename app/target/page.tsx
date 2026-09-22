import type { Metadata } from "next";
import TargetModule from "@/components/modules/target";

export const metadata: Metadata = { title: "Target — BurpStar Suite Pro" };

export default function Page() {
  return <TargetModule />;
}