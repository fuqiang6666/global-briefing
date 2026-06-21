import AdminGate from "@/components/AdminGate";
import EmailSettingsPanel from "@/components/EmailSettingsPanel";
import { ShieldCheck } from "lucide-react";

export const metadata = { title: "邮件设置 · 后台" };

export default function AdminEmailPage() {
  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-amber-500" />
        <h1 className="text-lg font-semibold text-slate-100">邮件设置（后台）</h1>
        <span className="text-xs text-slate-500 ml-2">SMTP / 收件人 / 发送时间</span>
      </header>
      <AdminGate title="邮件设置" subtitle="仅管理员可修改邮件推送配置">
        <EmailSettingsPanel />
      </AdminGate>
    </div>
  );
}
