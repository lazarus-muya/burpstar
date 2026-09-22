import type { Metadata } from "next";
import ScannerModule from "@/components/modules/scanner";

export const metadata: Metadata = { title: "Scanner — BurpStar Suite Pro" };

export default function Page() {
  return <ScannerModule />;
}