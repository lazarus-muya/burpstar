import type { Metadata } from "next";
import ComparerModule from "@/components/modules/comparer";

export const metadata: Metadata = { title: "Comparer — BurpStar Suite Pro" };

export default function Page() {
  return <ComparerModule />;
}