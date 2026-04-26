import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReadingTrickPopup from "@/components/ReadingTrickPopup";

export default function ReaderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <ReadingTrickPopup />
    </div>
  );
}

