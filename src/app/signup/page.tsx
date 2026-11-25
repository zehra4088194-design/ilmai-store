import { redirect } from "next/navigation";

export default function SignupPage() {
  redirect("/login?inviteOnly=1");
}
