"use client";

import { usePathname } from "next/navigation";
import { Home, Library, BrainCircuit, Inbox, Mail, LineChart, X } from "lucide-react";
import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "简报", icon: Home },
  { href: "/events", label: "事件", icon: LineChart },
  { href: "/media", label: "媒体", icon: Library },
  { href: "/model", label: "模型", icon: BrainCircuit },
  { href: "/briefings", label: "记录", icon: Inbox },
  { href: "/email", label: "邮件", icon: Mail },
];

export default function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080d18]/95 backdrop-blur-sm border-t border-slate-800">
      <div className="grid grid-cols-6">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex flex-col items-center gap-0.5 py-2 text-[10px] font-mono",
                active ? "text-amber-400" : "text-slate-500",
              ].join(" ")}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
