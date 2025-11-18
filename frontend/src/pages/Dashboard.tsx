import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Film, Globe, Calendar, TrendingUp, Sparkles } from "lucide-react";
import MovieCard from "@/components/MovieCard";
import MovieModal from "@/components/MovieModal";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { moviesAPI } from "@/lib/api";
import { toast } from "sonner";
import type { MovieDB } from "@/types";
import Autoplay from "embla-carousel-autoplay";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

interface UserStats {
  total_watched: number;
  total_languages_watched: number;
  watched_this_month: number;
  watched_this_year: number;
}

interface RecommendationSection {
  title: string;
  reason?: string;
  movies: MovieDB[];
}

const Dashboard = () => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [personalizedRecs, setPersonalizedRecs] = useState<MovieDB[]>([]);
  const [becauseYouWatched, setBecauseYouWatched] = useState<RecommendationSection[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingRecs, setIsLoadingRecs] = useState(true);
  const [selectedTmdbId, setSelectedTmdbId] = useState<number | null>(null);

  // Fetch user stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await moviesAPI.getUserStats();
        if (response.status === "success" && response.data) {
          setStats(response.data);
        }
      } catch (error: any) {
        console.error("Error fetching stats:", error);
        if (error.response?.status !== 404) {
          toast.error("Failed to load your stats.");
        }
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  // Fetch personalized recommendations
  useEffect(() => {
    const fetchRecommendations = async () => {
      setIsLoadingRecs(true);
      try {
        // Fetch general personalized recommendations
        const personalResponse = await moviesAPI.getPersonalizedRecommendations({ limit: 10 });
        if (personalResponse.status === "success" && Array.isArray(personalResponse.data)) {
          const formatted: MovieDB[] = personalResponse.data.map((m: any) => ({
            id: m.id || m.tmdb_id,
            tmdbId: m.tmdb_id || m.id,
            title: m.title,
            overview: m.overview || "",
            genres: Array.isArray(m.genres) ? m.genres.join(", ") : m.genres || "",
            popularity: m.popularity,
            release_year: m.release_year ? `${m.release_year}` : "",
            poster_url: m.poster_path
              ? `${TMDB_IMAGE_BASE}${m.poster_path}`
              : "/placeholder.svg",
          }));
          setPersonalizedRecs(formatted);
        }

        // Fetch "because you watched" recommendations
        const becauseResponse = await moviesAPI.getBecauseYouWatchedRecommendations();
        if (becauseResponse.status === "success" && Array.isArray(becauseResponse.data)) {
          const sections: RecommendationSection[] = becauseResponse.data.map((section: any) => ({
            title: section.title || "Because you watched",
            reason: section.reason,
            movies: (section.movies || []).map((m: any) => ({
              id: m.id || m.tmdb_id,
              tmdbId: m.tmdb_id || m.id,
              title: m.title,
              overview: m.overview || "",
              genres: Array.isArray(m.genres) ? m.genres.join(", ") : m.genres || "",
              popularity: m.popularity,
              release_year: m.release_year ? `${m.release_year}` : "",
              poster_url: m.poster_path
                ? `${TMDB_IMAGE_BASE}${m.poster_path}`
                : "/placeholder.svg",
            })),
          }));
          setBecauseYouWatched(sections);
        }
      } catch (error: any) {
        console.error("Error fetching recommendations:", error);
        if (error.response?.status !== 404) {
          toast.error("Failed to load recommendations.");
        }
      } finally {
        setIsLoadingRecs(false);
      }
    };

    fetchRecommendations();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          {/* <div className="mb-8 animate-fade-up">
            <h1 className="text-4xl sm:text-5xl font-heading font-bold mb-2">
              <span className="gradient-text">Your Dashboard</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Your movie watching journey and personalized recommendations
            </p>
          </div> */}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Total Movies Watched */}
            <Card className="card-elevated">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Watched</CardTitle>
                <Film className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <div className="h-8 w-16 bg-secondary animate-pulse rounded" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.total_watched || 0}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">Movies you've watched</p>
              </CardContent>
            </Card>

            {/* Languages Watched */}
            <Card className="card-elevated">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Languages</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <div className="h-8 w-16 bg-secondary animate-pulse rounded" />
                ) : (
                  <div className="text-2xl font-bold">
                    {stats?.total_languages_watched || 0}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">Different languages</p>
              </CardContent>
            </Card>

            {/* Watched This Month */}
            <Card className="card-elevated">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <div className="h-8 w-16 bg-secondary animate-pulse rounded" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.watched_this_month || 0}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">Movies this month</p>
              </CardContent>
            </Card>

            {/* Watched This Year */}
            <Card className="card-elevated">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Year</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <div className="h-8 w-16 bg-secondary animate-pulse rounded" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.watched_this_year || 0}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">Movies this year</p>
              </CardContent>
            </Card>
          </div>

          {/* Personalized Recommendations */}
          {personalizedRecs.length > 0 && (
            <section className="mb-12 animate-fade-up">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-6 h-6 text-primary" />
                <h2 className="text-3xl font-heading font-bold">
                  <span className="gradient-text">Movies For You</span>
                </h2>
              </div>
              <Carousel
                opts={{ align: "start", loop: true }}
                plugins={[
                  Autoplay({
                    delay: 3500,
                    stopOnInteraction: false,
                  }),
                ]}
                className="w-full"
              >
                <CarouselContent>
                  {personalizedRecs.map((movie) => (
                    <CarouselItem
                      key={movie.id}
                      className="pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5"
                    >
                      <div
                        className="cursor-pointer animate-fade-in hover:scale-105 transition-transform duration-300"
                        onClick={() => setSelectedTmdbId(movie.tmdbId)}
                      >
                        <MovieCard movie={movie} />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden sm:flex -left-4" />
                <CarouselNext className="hidden sm:flex -right-4" />
              </Carousel>
            </section>
          )}

          {/* Because You Watched Sections */}
          {becauseYouWatched.map((section, sectionIndex) => (
            section.movies.length > 0 && (
              <section key={sectionIndex} className="mb-12 animate-fade-up">
                <div className="mb-6">
                  <h2 className="text-3xl font-heading font-bold mb-2">
                    <span className="gradient-text">{section.title}</span>
                  </h2>
                  {section.reason && (
                    <p className="text-muted-foreground">{section.reason}</p>
                  )}
                </div>
                <Carousel
                  opts={{ align: "start", loop: true }}
                  plugins={[
                    Autoplay({
                      delay: 3500,
                      stopOnInteraction: false,
                    }),
                  ]}
                  className="w-full"
                >
                  <CarouselContent>
                    {section.movies.map((movie) => (
                      <CarouselItem
                        key={movie.id}
                        className="pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5"
                      >
                        <div
                          className="cursor-pointer animate-fade-in hover:scale-105 transition-transform duration-300"
                          onClick={() => setSelectedTmdbId(movie.tmdbId)}
                        >
                          <MovieCard movie={movie} />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="hidden sm:flex -left-4" />
                  <CarouselNext className="hidden sm:flex -right-4" />
                </Carousel>
              </section>
            )
          ))}

          {/* Empty State */}
          {!isLoadingRecs && personalizedRecs.length === 0 && becauseYouWatched.length === 0 && (
            <Card className="card-elevated">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Film className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Start Watching Movies</h3>
                  <p className="text-muted-foreground mb-6">
                    Rate and watch more movies to get personalized recommendations!
                  </p>
                </div>
              </CardContent>
            </Card>
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
};

export default Dashboard;

