import Navbar from "@/components/portfolio/Navbar";
import Hero from "@/components/portfolio/Hero";
import AboutSection from "@/components/portfolio/AboutSection";
import ExperienceSection from "@/components/portfolio/ExperienceSection";
import FeaturedProject from "@/components/portfolio/FeaturedProject";
import ProjectsSection from "@/components/portfolio/ProjectsSection";
import EngineeringSection from "@/components/portfolio/EngineeringSection";
import PlaygroundSection from "@/components/portfolio/PlaygroundSection";
import EngineeringLabs from "@/components/portfolio/EngineeringLabs";
import TechStackSection from "@/components/portfolio/TechStackSection";
import ContactSection from "@/components/portfolio/ContactSection";
import Footer from "@/components/portfolio/Footer";

/**
 * Raveen Neupane — Personal Developer Portfolio & Engineering Playground
 */
export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] selection:bg-sky-500/20 selection:text-sky-300">
      <Navbar />
      <main>
        <Hero />
        <AboutSection />
        <ExperienceSection />
        <FeaturedProject />
        <ProjectsSection />
        <EngineeringSection />
        <PlaygroundSection />
        <EngineeringLabs />
        <TechStackSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}
