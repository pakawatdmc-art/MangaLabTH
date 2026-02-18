"use client";

import { SignIn } from "@clerk/nextjs";
import { HAS_CLERK } from "@/lib/clerk";

export default function SignInPage() {
  if (!HAS_CLERK) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-xl bg-surface-100 p-8 text-center ring-1 ring-white/10">
          <h2 className="mb-2 text-lg font-semibold text-white">เข้าสู่ระบบ</h2>
          <p className="text-sm text-gray-400">ระบบ Authentication ยังไม่ได้ตั้งค่า</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center py-12">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-surface-100 border border-white/10",
          },
        }}
      />
    </div>
  );
}
