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

    if (user.role !== "admin") {
      redirect("/");
    }
  } catch (error) {
    console.error("Admin verification failed:", error);
    redirect("/");
  }

  return (
    <AdminLayoutClient
      isPrimaryAdmin={!!user?.is_primary_admin}
      adminToken={token}
    >
      {children}
    </AdminLayoutClient>
  );
}
