import type { Metadata } from "next";
import ProxyModule from "@/components/modules/proxy/proxy";

export const metadata: Metadata = { title: "Proxy — BurpStar Suite Pro" };

export default function Page() {
  return <ProxyModule />;
}