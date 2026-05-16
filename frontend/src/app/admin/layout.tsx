import { auth } from "@clerk/nextjs/server";
import { getMe } from "@/lib/api";
import { redirect } from "next/navigation";
import AdminLayoutClient from "./AdminLayoutClient";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { getToken } = await auth();
  const token = await getToken();

  if (!token) {
    redirect("/");
  }

  let user;
  try {
    user = await getMe(token);
  } catch (error) {
    // Distinguish auth errors (redirect silently) from infrastructure
    // errors (let the error boundary surface them so the user knows
    // it's a transient problem instead of being mysteriously kicked
    // back to the home page).
    const message = error instanceof Error ? error.message : String(error);
    const isAuthError = /\b(401|403|unauthor|forbidden)\b/i.test(message);

    if (isAuthError) {
      redirect("/");
    }

    console.error("Admin verification failed:", error);
    throw new Error(
      "ไม่สามารถยืนยันสิทธิ์ผู้ดูแลระบบได้ กรุณาลองใหม่อีกครั้ง",
      { cause: error },
    );
  }

  if (user.role !== "admin") {
    redirect("/");
  }

  return (
    <AdminLayoutClient
      isPrimaryAdmin={!!user.is_primary_admin}
      adminToken={token}
    >
      {children}
    </AdminLayoutClient>
  );
}
