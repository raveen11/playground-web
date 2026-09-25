import Navbar from "@/components/portfolio/Navbar";
import Footer from "@/components/portfolio/Footer";
import ContactSection from "@/components/portfolio/ContactSection";

export const metadata = {
  title: "Contact — Raveen Neupane",
  description:
    "Get in touch with Raveen Neupane for software engineering opportunities, collaborations, and technical discussions.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Navbar />
      <main className="pt-32 pb-20">
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}
