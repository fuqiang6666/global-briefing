"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Home,
  Library,
  BrainCircuit,
  Inbox,
  LineChart,
  ShieldCheck,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "每日简报", icon: Home, match: (p: string) => p === "/" },
  { href: "/events", label: "未来事件", icon: LineChart, match: (p: string) => p.startsWith("/events") },
  { href: "/media", label: "媒体库", icon: Library, match: (p: string) => p.startsWith("/media") },
  { href: "/model", label: "模型逻辑", icon: BrainCircuit, match: (p: string) => p.startsWith("/model") },
  { href: "/briefings", label: "简报管理", icon: Inbox, match: (p: string) => p.startsWith("/briefings") },
  { href: "/admin", label: "管理后台", icon: ShieldCheck, match: (p: string) => p.startsWith("/admin") },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-slate-800 bg-[#080d18]/80 backdrop-blur-sm">
      <div className="px-4 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-900 font-bold text-sm">
            G
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-100 tracking-tight">Global Brief</div>
            <div className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">
              Daily Intelligence
            </div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-amber-500/15 text-amber-200 border border-amber-500/20"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200",
              ].join(" ")}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 pulse-dot" />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-800 text-[10px] text-slate-500 font-mono">
        <div>v1.0 · 每日 08:01 BJT</div>
        <div className="mt-1 opacity-60">© Global Brief</div>
      </div>
    </aside>
  );
}
