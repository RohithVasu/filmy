import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DiscoverContent from "@/components/DiscoverContent";

export default function Recommendations() {
    return (
        <div className="min-h-screen bg-background text-white">
            <Navbar />
            <main className="pt-24 pb-12 container mx-auto px-4 sm:px-6 lg:px-8">
                <DiscoverContent />
            </main>
            <Footer />
        </div>
    );
}
