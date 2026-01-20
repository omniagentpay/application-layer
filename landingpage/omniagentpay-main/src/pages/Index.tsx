import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Problem from "@/components/landing/Problem";
import Stats from "@/components/landing/Stats";
import SDKShowcase from "@/components/landing/SDKShowcase";
import GuardSystem from "@/components/landing/GuardSystem";
import TechStack from "@/components/landing/TechStack";
import HowItWorks from "@/components/landing/HowItWorks";
import UserStories from "@/components/landing/UserStories";
import Comparison from "@/components/landing/Comparison";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      <Hero />
      <Problem />
      <Stats />
      <SDKShowcase />
      <GuardSystem />
      <TechStack />
      <HowItWorks />
      <UserStories />
      <Comparison />
      <CTA />
      <Footer />
    </main>
  );
};

export default Index;
