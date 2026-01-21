import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

interface PageLayoutProps {
  children: React.ReactNode;
}

export default function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f2433] via-[#132b3d] to-[#0f2433] text-white">
      <Navbar />
      <div className="container max-w-3xl mx-auto px-4 py-12 relative z-10">
        {children}
      </div>
      <Footer />
    </div>
  );
}
