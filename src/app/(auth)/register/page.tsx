import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AuthCard, AuthSplit } from "@/components/auth/AuthSplit";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Qeydiyyat", robots: { index: false } };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <AuthSplit headline="Gələcəyiniz üçün ilk addım" lead="205 nömrəli məktəb ailəsinə qoşulun!">
      <AuthCard>
        <RegisterForm />
      </AuthCard>
    </AuthSplit>
  );
}
