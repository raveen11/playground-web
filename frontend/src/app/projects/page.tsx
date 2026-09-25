import Navbar from "@/components/portfolio/Navbar";
import Footer from "@/components/portfolio/Footer";
import FeaturedProject from "@/components/portfolio/FeaturedProject";
import ProjectsSection from "@/components/portfolio/ProjectsSection";

export const metadata = {
  title: "Projects & Engineering Case Studies — Raveen Neupane",
  description:
    "Engineering case studies, realtime applications, code canvas, and developer tools built by Raveen Neupane.",
};

export default function ProjectsPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Navbar />
      <main className="pt-32 pb-20">
        <FeaturedProject />
        <ProjectsSection />
      </main>
      <Footer />
    </div>
  );
}
