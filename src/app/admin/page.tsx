import Link from "next/link";
import { ShieldCheck, Mail, ArrowRight } from "lucide-react";
import AdminGate from "@/components/AdminGate";

export const metadata = { title: "管理后台" };

const ADMIN_MODULES = [
  {
    href: "/admin/email",
    title: "邮件推送设置",
    desc: "SMTP 凭据、收件人、抄送、发送时间、测试连接。",
    icon: Mail,
  },
];

export default function AdminIndex() {
  return (
    <AdminGate title="管理后台" subtitle="该区域受密码保护，请输入管理员密码">
      <div className="space-y-3">
        <header className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-500" />
          <h1 className="text-lg font-semibold text-slate-100">管理后台</h1>
        </header>
        <p className="text-xs text-slate-500">已通过管理员密码校验，可访问以下模块：</p>
        <div className="grid gap-2">
          {ADMIN_MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.href}
                href={m.href}
                className="group flex items-start gap-3 px-4 py-3 bg-[#111726] border border-[#1E2638] rounded-md hover:border-amber-500/40 transition-colors"
              >
                <Icon className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-100 group-hover:text-amber-200">
                    {m.title}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{m.desc}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 mt-1" />
              </Link>
            );
          })}
        </div>
      </div>
    </AdminGate>
  );
}
