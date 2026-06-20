"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import MobileNav from "@/components/MobileNav";
import { useEffect } from "react";

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // close any open modals when route changes
  }, [pathname]);

  const isHome = pathname === "/";

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        {!isHome && (
          <button
            type="button"
            onClick={() => router.push("/")}
            className="md:hidden flex items-center gap-1 px-4 py-2 text-xs text-slate-400 border-b border-slate-800 w-full"
          >
            <ArrowLeft className="w-3 h-3" />
            返回简报
          </button>
        )}
        <TopBar />
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
