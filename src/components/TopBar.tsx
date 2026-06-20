"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, Clock } from "lucide-react";

const TITLES: Record<string, string> = {
  "/": "每日简报",
  "/events": "未来事件",
  "/media": "媒体库",
  "/model": "模型逻辑",
  "/briefings": "简报管理",
  "/email": "邮件设置",
};

export default function TopBar() {
  const pathname = usePathname();
  const [now, setNow] = useState("");
  useEffect(() => {
    function update() {
      const d = new Date();
      setNow(
        d.toLocaleString("zh-CN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone: "Asia/Shanghai",
        }),
      );
    }
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  const title = TITLES[pathname] ?? "Global Brief";

  return (
    <div className="md:hidden flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-[#080d18]/80 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-900 font-bold text-[10px]">
          G
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-100">{title}</div>
        </div>
      </div>
      <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
        <Clock className="w-3 h-3" />
        {now.slice(11)} BJT
      </div>
    </div>
  );
}
