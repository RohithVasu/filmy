import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DashboardMovieCard from "@/components/DashboardMovieCard";
import SearchBar from "@/components/SearchBar";
import GenrePie from "@/components/GenrePie";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

import { Film, Sparkles, TrendingUp, Calendar, Globe } from "lucide-react";

import { recommendationsAPI, userAPI } from "@/lib/api";
import { toast } from "sonner";
import Autoplay from "embla-carousel-autoplay";
import MovieModal from "@/components/MovieModal";

import type { MovieDB } from "@/types";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [personalized, setPersonalized] = useState<MovieDB[]>([]);
  const [recentActivityRecs, setRecentActivityRecs] = useState<MovieDB[]>([]);
  const [genreDist, setGenreDist] = useState<any[]>([]);
  const [queryResults, setQueryResults] = useState<MovieDB[]>([]);
  const [queryLoading, setQueryLoading] = useState(false);

  const [selectedTmdbId, setSelectedTmdbId] = useState<number | null>(null);

  // ------------------------------------
  // Fetch Stats
  // ------------------------------------
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await userAPI.stats();
        if (res.data?.status === "success") setStats(res.data.data);
      } catch (err) {
        toast.error("Failed to load stats.");
      }
    };
    fetchStats();
  }, []);

  // ------------------------------------
  // Genre Distribution
  // ------------------------------------
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const res = await userAPI.genreDistribution();
        if (res.data?.status === "success") setGenreDist(res.data.data);
      } catch {}
    };
    fetchGenres();
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
              poster_url: m.poster_path ? `${TMDB_IMAGE_BASE}${m.poster_path}` : "/placeholder.svg",
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
              poster_url: m.poster_path ? `${TMDB_IMAGE_BASE}${m.poster_path}` : "/placeholder.svg",
              release_year: m.release_year ? `${m.release_year}` : "",
              popularity: m.popularity
            }))
          );
        }
      } catch {}
    };

    fetchRecent();
  }, []);

  // ------------------------------------
  // Dashboard Search Handler
  // ------------------------------------
  const handleSearch = async (q: string) => {
    setQueryLoading(true);
    try {
      const res = await recommendationsAPI.search(q, 20);
      if (res.data?.status === "success") {
        setQueryResults(
          res.data.data.map((m: any) => ({
            id: m.id,
            tmdbId: m.tmdb_id,
            title: m.title,
            overview: m.overview ?? "",
            genres: Array.isArray(m.genres) ? m.genres.join(", ") : m.genres ?? "",
            poster_url: m.poster_path ? `${TMDB_IMAGE_BASE}${m.poster_path}` : "/placeholder.svg",
            release_year: m.release_year ? `${m.release_year}` : "",
            popularity: m.popularity
          }))
        );
      }
    } catch {
      setQueryResults([]);
    } finally {
      setQueryLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">


          {/* -----------------------------------------------------
               Search Bar + Query Results
          ------------------------------------------------------ */}
          <SearchBar onSearch={handleSearch} />

          {queryLoading && (
            <p className="text-muted-foreground text-sm">Searching...</p>
          )}

          {queryResults.length > 0 && (
            <section className="mb-10">
              <h2 className="text-2xl font-heading font-bold mb-4">
                Results for your search
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {queryResults.map((m) => (
                  <DashboardMovieCard
                    key={m.id}
                    movie={m}
                    onClick={() => setSelectedTmdbId(m.tmdbId)}
                    onMoreLikeThis={async () => {
                      const res = await recommendationsAPI.guest({ examples: [m.tmdbId] });
                      toast("Showing movies similar to " + m.title);
                      setQueryResults(
                        (res.data.data || []).map((mv: any) => ({
                          id: mv.id,
                          tmdbId: mv.tmdb_id,
                          title: mv.title,
                          overview: mv.overview ?? "",
                          genres: Array.isArray(mv.genres) ? mv.genres.join(", ") : mv.genres ?? "",
                          poster_url: mv.poster_path ? `${TMDB_IMAGE_BASE}${mv.poster_path}` : "/placeholder.svg",
                          release_year: mv.release_year ? `${mv.release_year}` : "",
                          popularity: mv.popularity
                        }))
                      );
                    }}
                  />
                ))}
              </div>
            </section>
          )}


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
               Genre Distribution
          ------------------------------------------------------ */}
          <Card className="mb-12">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Genre Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <GenrePie data={genreDist} />
            </CardContent>
          </Card>


          {/* -----------------------------------------------------
               Personalized Recs
          ------------------------------------------------------ */}
          {personalized.length > 0 && (
            <section className="mb-12">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-6 h-6 text-primary" />
                <h2 className="text-3xl font-heading font-bold">Movies For You</h2>
              </div>

              <Carousel
                opts={{ align: "start", loop: true }}
                plugins={[Autoplay({ delay: 3500, stopOnInteraction: false })]}
                className="w-full"
              >
                <CarouselContent>
                  {personalized.map((m) => (
                    <CarouselItem key={m.id} className="basis-1/2 sm:basis-1/3 md:basis-1/5 px-4">
                      <DashboardMovieCard
                        movie={m}
                        onClick={() => setSelectedTmdbId(m.tmdbId)}
                        onMoreLikeThis={async () => {
                          const res = await recommendationsAPI.guest({ examples: [m.tmdbId] });
                          toast("More like " + m.title);
                          setQueryResults(
                            (res.data.data || []).map((mv: any) => ({
                              id: mv.id,
                              tmdbId: mv.tmdb_id,
                              title: mv.title,
                              overview: mv.overview ?? "",
                              genres: Array.isArray(mv.genres) ? mv.genres.join(", ") : mv.genres ?? "",
                              poster_url: mv.poster_path ? `${TMDB_IMAGE_BASE}${mv.poster_path}` : "/placeholder.svg",
                              release_year: mv.release_year ? `${mv.release_year}` : "",
                              popularity: mv.popularity
                            }))
                          );
                        }}
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
                plugins={[Autoplay({ delay: 3500, stopOnInteraction: false })]}
                className="w-full"
              >
                <CarouselContent>
                  {recentActivityRecs.map((m) => (
                    <CarouselItem key={m.id} className="basis-1/2 sm:basis-1/3 md:basis-1/5 px-4">
                      <DashboardMovieCard
                        movie={m}
                        onClick={() => setSelectedTmdbId(m.tmdbId)}
                        onMoreLikeThis={async () => {
                          const res = await recommendationsAPI.guest({ examples: [m.tmdbId] });
                          toast("More like " + m.title);
                          setQueryResults(
                            (res.data.data || []).map((mv: any) => ({
                              id: mv.id,
                              tmdbId: mv.tmdb_id,
                              title: mv.title,
                              overview: mv.overview ?? "",
                              genres: Array.isArray(mv.genres) ? mv.genres.join(", ") : mv.genres ?? "",
                              poster_url: mv.poster_path ? `${TMDB_IMAGE_BASE}${mv.poster_path}` : "/placeholder.svg",
                              release_year: mv.release_year ? `${mv.release_year}` : "",
                              popularity: mv.popularity
                            }))
                          );
                        }}
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
        <MovieModal tmdbId={selectedTmdbId} onClose={() => setSelectedTmdbId(null)} />
      )}
    </div>
  );
}
