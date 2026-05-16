import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="relative flex min-h-[85vh] w-full flex-col items-center justify-center py-12 px-4 sm:px-6">
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[500px] w-full max-w-[800px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(212,168,67,0.06),transparent_70%)] blur-[80px]"></div>

      <div className="mb-8 text-center">
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-ink-800/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-300 backdrop-blur">
          <span className="h-1 w-1 rounded-full bg-gold" />
          Join MangaLabTH
        </span>
        <h1 className="mb-2 text-2xl sm:text-3xl font-semibold tracking-tight text-ink-100">
          สมัครสมาชิก <span className="text-gold">MangaLabTH</span>
        </h1>
        <p className="text-sm leading-relaxed text-ink-400">
          เริ่มต้นเพื่อเข้าอ่านมังงะและฟีเจอร์พรีเมียม
        </p>
      </div>

      <section className="relative z-10 w-full max-w-[420px]">
        <div className="flex w-full justify-center">
          <SignUp
            appearance={{
              variables: {
                colorPrimary: "#d4a843",
                colorText: "#ececf1",
                colorTextSecondary: "#a0a0ad",
                colorBackground: "rgba(21, 21, 28, 0.85)",
                colorInputBackground: "rgba(14, 14, 19, 0.9)",
                colorInputText: "#ececf1",
                borderRadius: "10px",
              },
              elements: {
                card: "w-full rounded-lg p-6 sm:p-8 m-0 backdrop-blur-2xl",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton: "rounded-sm bg-ink-900 transition-colors duration-200 hover:bg-ink-800 h-12 text-ink-100",
                socialButtonsBlockButtonText: "font-medium text-ink-200",
                socialButtonsProviderIcon: "scale-110",
                dividerLine: "bg-ink-700",
                dividerText: "text-[10px] font-semibold text-ink-500 tracking-[0.22em] uppercase",
                formFieldLabel: "text-sm font-medium text-ink-300 mb-1.5",
                formFieldInput: "rounded-sm bg-ink-900 focus:ring-1 focus:ring-gold/40 h-12 text-base transition-colors",
                formButtonPrimary: "font-semibold text-base text-ink-950 bg-gold hover:bg-gold-light transition-colors duration-200 h-12 rounded-sm mt-2",
                footerActionText: "text-sm font-medium text-ink-400",
                footerActionLink: "text-sm font-semibold text-gold hover:text-gold-light transition-colors",
                identityPreviewText: "text-ink-200 font-medium",
                identityPreviewEditButtonIcon: "text-gold hover:text-gold-light transition-colors",
                formResendCodeLink: "text-gold font-semibold hover:text-gold-light transition-colors",
              }
            }}
          />
        </div>
      </section>
    </div>
  );
}
