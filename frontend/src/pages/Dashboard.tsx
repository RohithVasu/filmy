import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DashboardMovieCard from "@/components/DashboardMovieCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Sparkles } from "lucide-react";
import { recommendationsAPI, userAPI } from "@/lib/api";
import { toast } from "sonner";
import Autoplay from "embla-carousel-autoplay";
import MovieModal from "@/components/MovieModal";
import MoreLikeThisModal from "@/components/MoreLikeThisModal";
import type { MovieDB } from "@/types";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

import { useStatsStore } from "@/stores/statsStore";

export default function Dashboard() {
  const { stats, fetchStats } = useStatsStore();
  const [personalized, setPersonalized] = useState<MovieDB[]>([]);
  const [recentActivityRecs, setRecentActivityRecs] = useState<MovieDB[]>([]);

  const [selectedTmdbId, setSelectedTmdbId] = useState<number | null>(null);

  // More Like This Modal State
  const [moreLikeThisOpen, setMoreLikeThisOpen] = useState(false);
  const [moreLikeThisMovie, setMoreLikeThisMovie] = useState<{ id: number; title: string } | null>(null);

  // ------------------------------------
  // Fetch Stats
  // ------------------------------------
  useEffect(() => {
    fetchStats();
  }, []);

  // ------------------------------------
  // Personalized
  // ------------------------------------
  useEffect(() => {
    const fetchPersonalized = async () => {
      try {
        const res = await recommendationsAPI.personalized(10);
        if (res.data?.status === "success") {
          setPersonalized(
            res.data.data.map((m: any) => ({
              id: m.id,
              tmdbId: m.tmdb_id || m.tmdbId || m.tmdb_id,
              title: m.title,
              overview: m.overview ?? "",
              genres: Array.isArray(m.genres) ? m.genres.join(", ") : m.genres ?? "",
              poster_url: m.poster_path ? `${TMDB_IMAGE_BASE}${m.poster_path}` : "/poster-not-found.png",
              release_year: m.release_year ? `${m.release_year}` : "",
              popularity: m.popularity
            }))
          );
        }
      } catch (err) {
        toast.error("Failed to load personalized recs.");
      }
    };

    fetchPersonalized();
  }, []);

  // ------------------------------------
  // Recent Activity Recs
  // ------------------------------------
  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const res = await recommendationsAPI.recent(12);
        if (res.data?.status === "success") {
          setRecentActivityRecs(
            res.data.data.map((m: any) => ({
              id: m.id,
              tmdbId: m.tmdb_id,
              title: m.title,
              overview: m.overview ?? "",
              genres: Array.isArray(m.genres) ? m.genres.join(", ") : m.genres ?? "",
              poster_url: m.poster_path ? `${TMDB_IMAGE_BASE}${m.poster_path}` : "/poster-not-found.png",
              release_year: m.release_year ? `${m.release_year}` : "",
              popularity: m.popularity
            }))
          );
        }
      } catch { }
    };

    fetchRecent();
  }, []);

  const handleMoreLikeThis = (movie: MovieDB) => {
    setMoreLikeThisMovie({ id: movie.tmdbId, title: movie.title });
    setMoreLikeThisOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">

          {/* -----------------------------------------------------
               User Stats
          ------------------------------------------------------ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Watched</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_watched ?? 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Languages Watched</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_languages_watched ?? 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.watched_this_month ?? 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">This Year</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.watched_this_year ?? 0}</div>
              </CardContent>
            </Card>
          </div>


          {/* -----------------------------------------------------
               Personalized Recs (Movies For You)
          ------------------------------------------------------ */}
          {personalized.length > 0 && (
            <section className="mb-12">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-6 h-6 text-primary" />
                <h2 className="text-3xl font-heading font-bold">Movies For You</h2>
              </div>

              <Carousel
                opts={{ align: "start", loop: true }}
                plugins={[Autoplay({ delay: 3500, stopOnInteraction: false, stopOnMouseEnter: true })]}
                className="w-full"
              >
                <CarouselContent>
                  {personalized.map((m) => (
                    <CarouselItem key={m.id} className="basis-1/2 sm:basis-1/3 md:basis-1/5 px-4">
                      <DashboardMovieCard
                        movie={m}
                        onClick={() => setSelectedTmdbId(m.tmdbId)}
                        onMoreLikeThis={() => handleMoreLikeThis(m)}
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>

                <CarouselPrevious className="hidden sm:flex" />
                <CarouselNext className="hidden sm:flex" />
              </Carousel>
            </section>
          )}


          {/* -----------------------------------------------------
               Based on Recent Activity
          ------------------------------------------------------ */}
          {recentActivityRecs.length > 0 && (
            <section className="mb-12">
              <h2 className="text-3xl font-heading font-bold mb-6">
                Based on Your Recent Activity
              </h2>

              <Carousel
                opts={{ align: "start", loop: true }}
                plugins={[Autoplay({ delay: 3500, stopOnInteraction: false, stopOnMouseEnter: true })]}
                className="w-full"
              >
                <CarouselContent>
                  {recentActivityRecs.map((m) => (
                    <CarouselItem key={m.id} className="basis-1/2 sm:basis-1/3 md:basis-1/5 px-4">
                      <DashboardMovieCard
                        movie={m}
                        onClick={() => setSelectedTmdbId(m.tmdbId)}
                        onMoreLikeThis={() => handleMoreLikeThis(m)}
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>

                <CarouselPrevious className="hidden sm:flex" />
                <CarouselNext className="hidden sm:flex" />
              </Carousel>
            </section>
          )}
        </div>
      </main>

      <Footer />

      {/* Movie Modal */}
      {selectedTmdbId && (
        <MovieModal
          tmdbId={selectedTmdbId}
          onClose={() => setSelectedTmdbId(null)}
        />
      )}

      {/* More Like This Modal */}
      <MoreLikeThisModal
        open={moreLikeThisOpen}
        onOpenChange={setMoreLikeThisOpen}
        tmdbId={moreLikeThisMovie?.id ?? null}
        movieTitle={moreLikeThisMovie?.title ?? ""}
      />
    </div>
  );
}
