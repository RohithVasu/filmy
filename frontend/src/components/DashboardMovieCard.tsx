import { Movie, MovieDB } from "@/types";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardMovieCardProps {
  movie: MovieDB;
  onClick: () => void;
  onMoreLikeThis: () => void;
}

export default function DashboardMovieCard({
  movie,
  onClick,
  onMoreLikeThis,
}: DashboardMovieCardProps) {
  return (
    <div
      className="relative group cursor-pointer rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] bg-secondary">
        <img
          src={movie.poster_url}
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          onClick={onClick}
        />

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
          <h3
            className="text-white text-sm font-semibold line-clamp-2 cursor-pointer"
            onClick={onClick}
          >
            {movie.title}
          </h3>

          {/* Small Meta */}
          {movie.release_year && (
            <p className="text-white/70 text-xs mt-1">
              {movie.release_year}
            </p>
          )}

          {/* Buttons */}
          <div className="flex justify-between mt-3">
            <Button
              size="sm"
              variant="secondary"
              className="text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              View
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onMoreLikeThis();
              }}
            >
              <MoreHorizontal className="w-4 h-4 mr-1" />
              More like this
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
