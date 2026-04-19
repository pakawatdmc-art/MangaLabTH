import PageTransition from "@/components/PageTransition";

export default function ReaderTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
