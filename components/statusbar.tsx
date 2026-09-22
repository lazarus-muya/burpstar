import { getHistory, getIssues, getScans } from "@/lib/server/store";
import { LiveDot } from "@/components/ui";

export default async function StatusBar() {
  const history = getHistory();
  const issues = getIssues();
  const running = getScans().filter((s) => s.status === "running" || s.status === "queued").length;

  return (
    <footer className="flex h-[26px] flex-none items-center gap-[18px] border-t border-line bg-panel-2 px-[14px] text-[10.5px] text-mute">
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        <LiveDot color="red" />
        Proxy listener{" "}
        <span className="font-mono text-dim">127.0.0.1:8080</span>
      </span>
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        <LiveDot color="amber" />
        Intercept <span className="font-mono text-dim">ON</span>
      </span>
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        Tasks <span className="font-mono text-dim">{running} running</span>
      </span>
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        Memory <span className="font-mono text-dim">1.8 / 4.0 GB</span>
      </span>
      <span className="flex-1" />
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        Requests <span className="font-mono text-dim">{history.length}</span>
      </span>
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        Issues <span className="font-mono text-dim">{issues.length}</span>
      </span>
      <span className="whitespace-nowrap">
        BurpStar Suite Pro <span className="font-mono text-dim">v2.4.1</span>
      </span>
    </footer>
  );
}