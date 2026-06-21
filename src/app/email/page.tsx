import { redirect } from "next/navigation";

export default function LegacyEmailRedirect(): never {
  redirect("/admin/email");
}
