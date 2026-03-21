import { useState } from "react";
import { useTMDBMovies, useTMDBSearch, useTMDBMovieDetail, getImageUrl, GENRE_MAP } from "@/hooks/useTMDB";
import { Search, Star, Clock, Play, X, Calendar, TrendingUp, Film, Award } from "lucide-react";

const MovieCard = ({ movie, onClick }: { movie: any; onClick: () => void }) => {
  const poster = getImageUrl(movie.poster_path, "w342");
  return (
    <button onClick={onClick} className="group text-left rounded-xl overflow-hidden bg-card border border-border/30 hover:border-primary/40 transition-all duration-300 hover:scale-[1.02]">
      <div className="aspect-[2/3] relative overflow-hidden">
        {poster ? (
          <img src={poster} alt={movie.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-secondary flex items-center justify-center"><Film className="w-8 h-8 text-muted-foreground" /></div>
        )}
        <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/70 text-yellow-400 text-[10px] font-bold">
          <Star className="w-3 h-3 fill-yellow-400" />{movie.vote_average?.toFixed(1)}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
          <span className="text-[10px] text-white/80 flex items-center gap-1"><Play className="w-3 h-3" />Details</span>
        </div>
      </div>
      <div className="p-2">
        <h3 className="text-xs font-semibold text-foreground line-clamp-1">{movie.title}</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">{movie.release_date?.split("-")[0]}</p>
      </div>
    </button>
  );
};

const MovieDetailModal = ({ movieId, onClose }: { movieId: number; onClose: () => void }) => {
  const { movie, loading } = useTMDBMovieDetail(movieId);
  if (!movie && loading) return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center" onClick={onClose}>
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!movie) return null;

  const backdrop = getImageUrl(movie.backdrop_path, "w1280");
  const poster = getImageUrl(movie.poster_path, "w500");
  const trailer = movie.videos?.results?.find(v => v.type === "Trailer" && v.site === "YouTube");

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card rounded-t-2xl sm:rounded-2xl border border-border/50" onClick={e => e.stopPropagation()}>
        {/* Backdrop */}
        <div className="relative aspect-video">
          {backdrop ? <img src={backdrop} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-secondary" />}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70"><X className="w-4 h-4" /></button>
          {trailer && (
            <a href={`https://www.youtube.com/watch?v=${trailer.key}`} target="_blank" rel="noopener noreferrer"
              className="absolute bottom-4 left-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive text-white text-sm font-semibold hover:opacity-90 transition-all">
              <Play className="w-4 h-4 fill-white" /> Watch Trailer
            </a>
          )}
        </div>
        <div className="p-4 -mt-8 relative space-y-3">
          <div className="flex gap-3">
            {poster && <img src={poster} alt="" className="w-20 rounded-lg shadow-xl border border-border/30 -mt-12" />}
            <div className="flex-1 pt-1">
              <h2 className="text-lg font-bold text-foreground leading-tight">{movie.title}</h2>
              {movie.tagline && <p className="text-xs text-primary italic mt-0.5">{movie.tagline}</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-400"><Star className="w-3 h-3 fill-yellow-400" />{movie.vote_average?.toFixed(1)}</span>
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-muted-foreground"><Calendar className="w-3 h-3" />{movie.release_date}</span>
            {movie.runtime > 0 && <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-muted-foreground"><Clock className="w-3 h-3" />{movie.runtime} min</span>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {movie.genres?.map(g => (
              <span key={g.id} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">{g.name}</span>
            ))}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{movie.overview}</p>
        </div>
      </div>
    </div>
  );
};

const MovieSection = ({ title, icon: Icon, movies, onSelect }: { title: string; icon: any; movies: any[]; onSelect: (id: number) => void }) => {
  if (!movies.length) return null;
  return (
    <section>
      <h2 className="text-base font-bold text-foreground mb-2.5 flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />{title}
      </h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
        {movies.slice(0, 12).map(m => <MovieCard key={m.id} movie={m} onClick={() => onSelect(m.id)} />)}
      </div>
    </section>
  );
};

const Movies = () => {
  const { trending, popular, nowPlaying, topRated, loading, enabled } = useTMDBMovies();
  const [search, setSearch] = useState("");
  const { results: searchResults, loading: searchLoading } = useTMDBSearch(search);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (!enabled) return (
    <div className="min-h-screen pt-16 pb-20 flex items-center justify-center">
      <p className="text-muted-foreground text-sm">Movies feature is disabled</p>
    </div>
  );

  return (
    <div className="min-h-screen pt-16 pb-20">
      {/* Search */}
      <div className="container py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search movies..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-secondary border border-border/50 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
        </div>
      </div>

      {loading ? (
        <div className="container grid grid-cols-3 gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-xl skeleton-shimmer" />
          ))}
        </div>
      ) : search.trim() ? (
        <div className="container space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {searchLoading ? "Searching..." : `Results for "${search}" (${searchResults.length})`}
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
            {searchResults.map(m => <MovieCard key={m.id} movie={m} onClick={() => setSelectedId(m.id)} />)}
          </div>
        </div>
      ) : (
        <div className="container space-y-6">
          <MovieSection title="Trending" icon={TrendingUp} movies={trending} onSelect={setSelectedId} />
          <MovieSection title="Now Playing" icon={Play} movies={nowPlaying} onSelect={setSelectedId} />
          <MovieSection title="Popular" icon={Film} movies={popular} onSelect={setSelectedId} />
          <MovieSection title="Top Rated" icon={Award} movies={topRated} onSelect={setSelectedId} />
        </div>
      )}

      {selectedId && <MovieDetailModal movieId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
};

export default Movies;
