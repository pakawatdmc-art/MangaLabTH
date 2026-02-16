import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-surface-100 border border-white/10 shadow-2xl",
            headerTitle: "text-white",
            headerSubtitle: "text-gray-400",
            socialButtonsBlockButton: "bg-surface-200 border-white/10 text-white hover:bg-surface-50",
            formFieldLabel: "text-gray-300",
            formFieldInput: "bg-surface-200 border-white/10 text-white",
            footerActionLink: "text-gold hover:text-gold-light",
            formButtonPrimary: "bg-gold text-black hover:bg-gold-light",
          },
        }}
      />
    </div>
  );
}
