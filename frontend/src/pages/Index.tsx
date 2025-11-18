import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import TopMoviesGrid from "@/components/TopMoviesGrid";
import RecommendSection from "@/components/RecommendSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <TopMoviesGrid />
        <RecommendSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
