import Navbar from "@/components/portfolio/Navbar";
import Footer from "@/components/portfolio/Footer";
import AboutSection from "@/components/portfolio/AboutSection";
import ExperienceSection from "@/components/portfolio/ExperienceSection";
import TechStackSection from "@/components/portfolio/TechStackSection";

export const metadata = {
  title: "About — Raveen Neupane",
  description:
    "Engineering background, experience as Software Engineer & Frontend Team Lead at Treeleaf, and technical philosophy.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Navbar />
      <main className="pt-32 pb-20">
        <AboutSection />
        <ExperienceSection />
        <TechStackSection />
      </main>
      <Footer />
    </div>
  );
}
