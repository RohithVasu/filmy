import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectItem,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MovieCard from "@/components/MovieCard";
import MovieModal from "@/components/MovieModal";
import { moviesAPI } from "@/lib/api";
import { toast } from "sonner";
import type { MovieDB } from "@/types";

const GENRES = [
  "Action", "Adventure", "Animation", "Comedy", "Crime",
  "Documentary", "Drama", "Family", "Fantasy", "History",
  "Horror", "Music", "Mystery", "Romance", "Sci-Fi",
  "Thriller", "War", "Western",
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
  { value: "hi", label: "Hindi" },
];

const Explore = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [sortOption, setSortOption] = useState("popularity_desc");

  const [movies, setMovies] = useState<MovieDB[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedTmdbId, setSelectedTmdbId] = useState<number | null>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1899 }, (_, i) => currentYear - i);

  // Genre Toggle
  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : [...prev, genre]
    );
  };

  // Sorting Map
  const getSortParams = () => {
    const [field, direction] = sortOption.split("_");
    return {
      sort_by:
        field === "release"
          ? "release_year"
          : field === "popularity"
          ? "popularity"
          : "title",
      order: direction,
    };
  };

  // Fetch Movies
  const fetchMovies = async (pageNum: number) => {
    setLoading(true);
    try {
      const { sort_by, order } = getSortParams();

      const res = await moviesAPI.search({
        search: searchQuery || undefined,
        genre: selectedGenres,
        language: selectedLanguage !== "all" ? selectedLanguage : undefined,
        release_year:
          selectedYear !== "all" ? parseInt(selectedYear) : undefined,
        sort_by,
        order,
        page: pageNum,
        limit: 50,
      });

      const data = res.data;

      const formatted: MovieDB[] = data.movies.map((m: any) => ({
        id: m.id,
        tmdbId: m.tmdb_id,
        title: m.title,
        overview: m.overview,
        genres: m.genres,
        popularity: m.popularity,
        release_year: m.release_year,
        poster_url: m.poster_path
          ? `https://image.tmdb.org/t/p/w300${m.poster_path}`
          : "/poster-not-found.png",
      }));

      setMovies(formatted);
      setPage(data.page);
      setTotalPages(data.total_pages);
    } catch {
      toast.error("Failed to load movies.");
    }
    setLoading(false);
  };

  const handleSearch = () => fetchMovies(1);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedGenres([]);
    setSelectedLanguage("all");
    setSelectedYear("all");
    setSortOption("popularity_desc");
    fetchMovies(1);
  };

  useEffect(() => {
    fetchMovies(1);
  }, []);

  const hasActiveFilters =
    searchQuery ||
    selectedGenres.length > 0 ||
    selectedLanguage !== "all" ||
    selectedYear !== "all" ||
    sortOption !== "popularity_desc";

  const previousPage = () => page > 1 && fetchMovies(page - 1);
  const nextPage = () => page < totalPages && fetchMovies(page + 1);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20 pb-12 container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-up">
          <h1 className="text-4xl sm:text-5xl font-heading font-bold mb-4">
            <span className="gradient-text">Explore Movies</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Search and discover movies with advanced filters
          </p>
        </div>

        {/* Filters Panel */}
        <div className="max-w-6xl mx-auto mb-8 bg-card border border-border rounded-2xl p-6 card-elevated">

          {/* Search */}
          <div className="mb-6">
            <Label className="text-sm font-medium mb-2 block">Search Movies</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Enter movie name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10 bg-background border-border"
                />
              </div>
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? "Searching..." : "Search"}
              </Button>
            </div>
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">

            {/* Genre Dropdown */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Genres</Label>

              <Select>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Select Genres" />
                </SelectTrigger>

                <SelectContent className="max-h-[300px] p-2">
                  {GENRES.map((genre) => (
                    <div
                      key={genre}
                      className={`px-3 py-2 text-sm rounded-md cursor-pointer flex justify-between items-center ${
                        selectedGenres.includes(genre)
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent"
                      }`}
                      onClick={() => toggleGenre(genre)}
                    >
                      {genre}
                      {selectedGenres.includes(genre) && <span>✓</span>}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Language */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Language</Label>
              <Select
                value={selectedLanguage}
                onValueChange={setSelectedLanguage}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="All Languages" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>

                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all">All Years</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sorting */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Sort By</Label>
              <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="popularity_desc">Popularity (High→Low)</SelectItem>
                  <SelectItem value="popularity_asc">Popularity (Low→High)</SelectItem>
                  <SelectItem value="release_desc">Release Year (New→Old)</SelectItem>
                  <SelectItem value="release_asc">Release Year (Old→New)</SelectItem>
                  <SelectItem value="title_asc">Title (A→Z)</SelectItem>
                  <SelectItem value="title_desc">Title (Z→A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filter Chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-4">

              {selectedGenres.map((g) => (
                <div
                  key={g}
                  className="flex items-center px-3 py-1 text-sm bg-secondary rounded-full"
                >
                  {g}
                  <X
                    className="w-4 h-4 ml-2 cursor-pointer"
                    onClick={() =>
                      setSelectedGenres((prev) => prev.filter((x) => x !== g))
                    }
                  />
                </div>
              ))}

              {selectedLanguage !== "all" && (
                <div className="flex items-center px-3 py-1 text-sm bg-secondary rounded-full">
                  {LANGUAGES.find((l) => l.value === selectedLanguage)?.label}
                  <X
                    className="w-4 h-4 ml-2 cursor-pointer"
                    onClick={() => setSelectedLanguage("all")}
                  />
                </div>
              )}

              {selectedYear !== "all" && (
                <div className="flex items-center px-3 py-1 text-sm bg-secondary rounded-full">
                  {selectedYear}
                  <X
                    className="w-4 h-4 ml-2 cursor-pointer"
                    onClick={() => setSelectedYear("all")}
                  />
                </div>
              )}

              {sortOption !== "popularity_desc" && (
                <div className="flex items-center px-3 py-1 text-sm bg-secondary rounded-full">
                  {{
                    popularity_desc: "Popularity (High→Low)",
                    popularity_asc: "Popularity (Low→High)",
                    release_desc: "Release (New→Old)",
                    release_asc: "Release (Old→New)",
                    title_asc: "Title (A→Z)",
                    title_desc: "Title (Z→A)",
                  }[sortOption]}
                  <X
                    className="w-4 h-4 ml-2 cursor-pointer"
                    onClick={() => setSortOption("popularity_desc")}
                  />
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="ml-auto"
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="max-w-7xl mx-auto">

          {loading && movies.length === 0 ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading movies...</p>
            </div>
          ) : movies.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg mb-4">No movies found</p>
              <p className="text-muted-foreground text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 mb-8">
                {movies.map((movie) => (
                  <div
                    key={movie.id}
                    className="cursor-pointer animate-fade-in"
                    onClick={() => {
                      setSelectedTmdbId(movie.tmdbId);
                      setSelectedId(movie.id);
                    }}
                  >
                    <MovieCard movie={movie} />
                  </div>
                ))}
              </div>

              <div className="flex justify-center items-center gap-4 mt-8">
                <Button onClick={previousPage} disabled={page === 1}>
                  Previous
                </Button>

                <span className="text-lg font-medium">
                  Page {page} / {totalPages}
                </span>

                <Button onClick={nextPage} disabled={page === totalPages}>
                  Next
                </Button>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />

      {selectedTmdbId && (
        <MovieModal
          id={selectedId}
          tmdbId={selectedTmdbId}
          onClose={() => setSelectedTmdbId(null)}
        />
      )}
    </div>
  );
};

export default Explore;
