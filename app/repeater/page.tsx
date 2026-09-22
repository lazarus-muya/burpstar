import type { Metadata } from "next";
import RepeaterModule from "@/components/modules/repeater";

export const metadata: Metadata = { title: "Repeater — BurpStar Suite Pro" };

export default function Page() {
  return <RepeaterModule />;
}