/** Check at build/runtime whether a real Clerk key is configured. */
const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
export const HAS_CLERK =
  key.startsWith("pk_live_") || key.startsWith("pk_test_");
