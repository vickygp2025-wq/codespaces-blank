
/* =====================================
   WHAT NOW? — LIBRARY
   ===================================== */

const librarySearch = document.getElementById("search");
const libraryKind = document.getElementById("kind");
const librarySort = document.getElementById("sort");

// READ SAVED INFORMATION

function libraryRead(key, fallback) {
  try {
    return JSON.parse(
      localStorage.getItem(key) || fallback
    );
  } catch {
    return JSON.parse(fallback);
  }
}

// IDENTIFY EACH MOVIE

function libraryKey(movie) {
  return (movie.mediaType || "movie") + ":" + movie.id;
}

// GET SAVED MOVIES

function libraryGetMovies() {

  const watchlist = libraryRead("whatNowWatchlist", "[]");
  const watched = libraryRead("rouletteWatched", "[]");
  const ratings = libraryRead("movieRatings", "{}");
  const favorites = libraryRead("whatNowFavorites", "[]");
  const shame = libraryRead("rouletteRejected", "[]");

  const movies = new Map();

  watchlist.forEach(movie => {
    movies.set(libraryKey(movie), {
      ...movie,
      mediaType: movie.mediaType || "movie"
    });
  });

  return {
    movies,
    watchlist,
    watched,
    ratings,
    favorites,
    shame
  };
}

// SEARCH AND TYPE FILTERS

function libraryMatches(movie) {

  const search = librarySearch.value
    .trim()
    .toLowerCase();

  const kind = libraryKind.value;

  const title = (
    movie.title || movie.name || ""
  ).toLowerCase();

  if (search && !title.includes(search)) {
    return false;
  }

  if (kind === "Movies" && movie.mediaType !== "movie") {
    return false;
  }

  if (kind === "TV Shows" && movie.mediaType !== "tv") {
    return false;
  }

  return true;
}

// SORT MOVIES BY TITLE OR RATING

function librarySortMovies(movies) {

  const sort = librarySort.value;

  const personalRatings = libraryRead(
    "movieRatings",
    "{}"
  );

  return [...movies].sort((a, b) => {

    if (sort === "Title") {
      return (a.title || "").localeCompare(
        b.title || ""
      );
    }

    if (sort === "Rating") {

      const ratingA = personalRatings[a.id];
      const ratingB = personalRatings[b.id];

      // Personal ratings come first
      if (
        ratingA !== undefined &&
        ratingB === undefined
      ) {
        return -1;
      }

      if (
        ratingB !== undefined &&
        ratingA === undefined
      ) {
        return 1;
      }

      // Compare personal ratings
      if (
        ratingA !== undefined &&
        ratingB !== undefined
      ) {
        return Number(ratingB) - Number(ratingA);
      }

      // Otherwise compare TMDB ratings
      return (b.vote_average || 0) -
             (a.vote_average || 0);
    }

    // Preserve existing order for Recently added
    return 0;
  });
}

// ADD OR REMOVE FAVORITES

function libraryToggleFavorite(movie) {

  const favorites = libraryRead(
    "whatNowFavorites",
    "[]"
  );

  const movieKey = libraryKey(movie);

  const alreadyFavorite = favorites.some(
    item => libraryKey(item) === movieKey
  );

  const updated = alreadyFavorite
    ? favorites.filter(
        item => libraryKey(item) !== movieKey
      )
    : [
        ...favorites,
        {
          id: movie.id,
          mediaType: movie.mediaType || "movie",
          title: movie.title || movie.name,
          poster_path: movie.poster_path,
          release_date:
            movie.release_date ||
            movie.first_air_date ||
            "",
          vote_average: movie.vote_average || 0
        }
      ];

  localStorage.setItem(
    "whatNowFavorites",
    JSON.stringify(updated)
  );

  renderLibrary();
}

// CREATE MOVIE CARDS

function libraryCreateCard(movie, section) {

  const item = document.createElement("li");
  item.className = "library-movie-card";

  // POSTER
  if (movie.poster_path) {

    const poster = document.createElement("img");

    poster.src =
      "https://image.tmdb.org/t/p/w342" +
      movie.poster_path;

    poster.alt =
      (movie.title || movie.name || "Movie") +
      " poster";

    item.appendChild(poster);
  }

  // TITLE
  const title = document.createElement("h4");
  title.textContent =
    movie.title || movie.name || "Unknown title";

  item.appendChild(title);

  // TYPE
  const type = document.createElement("p");
  type.textContent =
    movie.mediaType === "tv" ? "TV Show" : "Movie";

  item.appendChild(type);

  // PERSONAL TASTE TEST RATING

  const personalRatings = libraryRead(
    "movieRatings",
    "{}"
  );

  const personalRating = personalRatings[movie.id];

  if (
    movie.mediaType === "movie" &&
    personalRating !== undefined &&
    personalRating !== null
  ) {

    const ratingLabel = document.createElement("p");
    ratingLabel.className = "library-personal-rating";

    ratingLabel.textContent =
      "★ Your rating: " + personalRating + "/10";

    item.appendChild(ratingLabel);
  }

  // FAVORITES BUTTON

  const favorites = libraryRead(
    "whatNowFavorites",
    "[]"
  );

  const isFavorite = favorites.some(
    saved => libraryKey(saved) === libraryKey(movie)
  );

  const favoriteButton = document.createElement("button");
  favoriteButton.type = "button";
  favoriteButton.className = "library-favorite-button";

  favoriteButton.textContent = isFavorite
    ? "♥ Favorited"
    : "♡ Add to Favorites";

  if (isFavorite) {
    favoriteButton.classList.add("is-favorite");
  }

  favoriteButton.addEventListener("click", function() {
    libraryToggleFavorite(movie);
  });

  item.appendChild(favoriteButton);

  // REMOVE FROM WATCHLIST

  if (section === "watchlist") {

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";

    remove.addEventListener("click", function() {

      const watchlist = libraryRead(
        "whatNowWatchlist",
        "[]"
      );

      const updated = watchlist.filter(saved =>
        libraryKey(saved) !== libraryKey(movie)
      );

      localStorage.setItem(
        "whatNowWatchlist",
        JSON.stringify(updated)
      );

      renderLibrary();
    });

    item.appendChild(remove);
  }

  return item;
}

// DISPLAY A LIBRARY SECTION

function libraryRenderSection(id, movies, section) {

  const list = document.getElementById(id);
  if (!list) return;

  list.replaceChildren();

  const filtered = librarySortMovies(
    movies.filter(libraryMatches)
  );

  if (!filtered.length) {

    const empty = document.createElement("li");
    empty.className = "library-empty";
    empty.textContent = "No movies here yet.";

    list.appendChild(empty);
    return;
  }

  filtered.forEach(movie => {
    list.appendChild(
      libraryCreateCard(movie, section)
    );
  });
}

// LOAD MOVIE DETAILS FROM TMDB

async function libraryLoadMovies(keys) {

  const token = localStorage.getItem("tmdbToken");

  if (!token || !Array.isArray(keys)) {
    return [];
  }

  const uniqueKeys = [...new Set(keys)];

  const movies = await Promise.all(
    uniqueKeys.map(async key => {

      try {

        const parts = String(key).split(":");

        const mediaType = parts[0];
        const id = Number(parts[1]);

        if (
          !["movie", "tv"].includes(mediaType) ||
          !Number.isInteger(id) ||
          id <= 0
        ) {
          return null;
        }

        const response = await fetch(
          "https://api.themoviedb.org/3/" +
          mediaType + "/" + id,
          {
            headers: {
              Authorization: "Bearer " + token,
              accept: "application/json"
            }
          }
        );

        if (!response.ok) return null;

        const movie = await response.json();

        return {
          ...movie,
          mediaType,
          title: movie.title || movie.name
        };

      } catch (error) {
        console.warn(
          "Library movie unavailable:",
          error
        );

        return null;
      }
    })
  );

  return movies.filter(Boolean);
}

// DISPLAY ALL LIBRARY COLLECTIONS

let libraryRenderVersion = 0;

async function renderLibrary() {

  const version = ++libraryRenderVersion;

  const data = libraryGetMovies();

  // WATCHLIST
  libraryRenderSection(
    "list-watchlist",
    data.watchlist,
    "watchlist"
  );

  // INCLUDE TASTE TEST MOVIES IN WATCHED

  const tasteTestIds = Object.keys(data.ratings)
    .filter(id =>
      Number.isInteger(Number(id)) &&
      Number(id) > 0
    )
    .map(id => "movie:" + id);

  const allWatchedKeys = [
    ...new Set([
      ...data.watched,
      ...tasteTestIds
    ])
  ];

  // LOAD WATCHED AND SHAME LIST

  const [watchedMovies, shameMovies] = await Promise.all([
    libraryLoadMovies(allWatchedKeys),
    libraryLoadMovies(data.shame)
  ]);

  // Ignore older requests
  if (version !== libraryRenderVersion) {
    return;
  }

  libraryRenderSection(
    "list-watched",
    watchedMovies,
    "watched"
  );

  libraryRenderSection(
    "list-shame",
    shameMovies,
    "shame"
  );

  // FAVORITES
  libraryRenderSection(
    "list-favorites",
    libraryRead("whatNowFavorites", "[]"),
    "favorites"
  );
}

// FILTERS

librarySearch.addEventListener("input", renderLibrary);
libraryKind.addEventListener("change", renderLibrary);
librarySort.addEventListener("change", renderLibrary);

// PREVENT SEARCH FORM FROM REFRESHING PAGE

const libraryForm = document.querySelector(
  ".library-page form"
);

if (libraryForm) {

  libraryForm.addEventListener("submit", function(event) {
    event.preventDefault();
  });
}

// START LIBRARY

renderLibrary();
 
/* =====================================
   WHAT NOW? — CONFETTI CELEBRATION
   ===================================== */

function launchConfetti() {

  const colors = [
    "#A78BFA",
    "#FBBF24",
    "#F472B6",
    "#34D399",
    "#60A5FA",
    "#FFFFFF"
  ];

  // Create 150 colorful pieces
  for (let i = 0; i < 150; i++) {

    const piece = document.createElement("div");
    piece.className = "confetti-piece";

    piece.style.left =
      Math.random() * 100 + "vw";

    piece.style.backgroundColor =
      colors[Math.floor(Math.random() * colors.length)];

    piece.style.width =
      (6 + Math.random() * 8) + "px";

    piece.style.height =
      (8 + Math.random() * 12) + "px";

    piece.style.borderRadius =
      Math.random() > 0.5 ? "50%" : "2px";

    piece.style.setProperty(
      "--duration",
      (3 + Math.random() * 3) + "s"
    );

    piece.style.setProperty(
      "--drift",
      (Math.random() * 400 - 200) + "px"
    );

    piece.style.setProperty(
      "--rotation",
      (Math.random() * 1440 - 720) + "deg"
    );

    piece.style.animationDelay =
      (Math.random() * 0.8) + "s";

    document.body.appendChild(piece);

    // Remove the piece after the animation
    piece.addEventListener(
      "animationend",
      function() {
        piece.remove();
      },
      { once: true }
    );
  }
}

