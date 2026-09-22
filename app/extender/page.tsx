import type { Metadata } from "next";
import ExtenderModule from "@/components/modules/extender";

export const metadata: Metadata = { title: "Extender — BurpStar Suite Pro" };

export default function Page() {
  return <ExtenderModule />;
}