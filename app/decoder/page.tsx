import type { Metadata } from "next";
import DecoderModule from "@/components/modules/decoder";

export const metadata: Metadata = { title: "Decoder — BurpStar Suite Pro" };

export default function Page() {
  return <DecoderModule />;
}