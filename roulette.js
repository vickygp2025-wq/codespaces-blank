
/* WHAT NOW? — MOVIE ROULETTE */

const spinButton = document.getElementById("spin");
const rouletteWheel = document.getElementById("roulette-wheel");
const rouletteMessage = document.querySelector(".roulette-card p");
const rouletteResult = document.getElementById("pick");

let rouletteRotation = 0;
let rouletteSpinning = false;
let rouletteCurrentMovie = null;

const rouletteGenres = {
  Comedy: 35,
  Romance: 10749,
  Drama: 18,
  Horror: 27,
  Thriller: 53,
  Mystery: 9648,
  Action: 28,
  "Sci-Fi": 878
};

function rouletteRead(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || fallback);
  } catch {
    return JSON.parse(fallback);
  }
}

function rouletteMovieKey(movie) {
  return "movie:" + movie.id;
}

// CONTACT TMDB

async function rouletteRequest(path) {

  const token = localStorage.getItem("tmdbToken");

  if (!token) {
    throw new Error("Please complete the Taste Test first.");
  }

  const response = await fetch(
    "https://api.themoviedb.org/3" + path,
    {
      headers: {
        Authorization: "Bearer " + token,
        accept: "application/json"
      }
    }
  );

  if (!response.ok) {
    throw new Error("Could not load movies from TMDB.");
  }

  return response.json();
}

// FIND A MOVIE

async function findRouletteMovie() {

  const preferences = rouletteRead("tastePreferences", "{}");
  const ratings = rouletteRead("movieRatings", "{}");
  const rejected = rouletteRead("rouletteRejected", "[]");
  const watched = rouletteRead("rouletteWatched", "[]");

  const likedGenres = Object.entries(preferences.genres || {})
    .filter(([genre, choice]) => choice === "like")
    .map(([genre]) => rouletteGenres[genre])
    .filter(Boolean);

  const dislikedGenres = Object.entries(preferences.genres || {})
    .filter(([genre, choice]) => choice === "dislike")
    .map(([genre]) => rouletteGenres[genre])
    .filter(Boolean);

  const params = new URLSearchParams({
    language: "en-US",
    sort_by: "popularity.desc",
    include_adult: "false",
    "vote_count.gte": "200",
    page: String(Math.floor(Math.random() * 5) + 1)
  });

  if (likedGenres.length) {
    params.set("with_genres", likedGenres.join("|"));
  }

  if (dislikedGenres.length) {
    params.set("without_genres", dislikedGenres.join(","));
  }

  const data = await rouletteRequest(
    "/discover/movie?" + params.toString()
  );

  const today = new Date().toLocaleDateString("en-CA");

  const candidates = (data.results || []).filter(movie => {

    const key = rouletteMovieKey(movie);

    return (
      movie.poster_path &&
      movie.release_date &&
      movie.release_date <= today &&
      ratings[movie.id] === undefined &&
      !rejected.includes(key) &&
      !watched.includes(key) &&
      movie.id !== rouletteCurrentMovie?.id
    );
  });

  if (!candidates.length) {
    throw new Error(
      "No new movies found on this spin. Try again."
    );
  }

  return candidates[
    Math.floor(Math.random() * candidates.length)
  ];
}

// SAVE TO WATCHLIST

function rouletteSaveMovie(movie) {

  const watchlist = rouletteRead("whatNowWatchlist", "[]");

  const alreadySaved = watchlist.some(item =>
    item.id === movie.id &&
    item.mediaType === "movie"
  );

  if (alreadySaved) return false;

  watchlist.push({
    id: movie.id,
    mediaType: "movie",
    title: movie.title,
    poster_path: movie.poster_path,
    release_date: movie.release_date || ""
  });

  localStorage.setItem(
    "whatNowWatchlist",
    JSON.stringify(watchlist)
  );

  return true;
}

// REMEMBER REJECTIONS AND WATCHED MOVIES

function rouletteRemember(key, movie) {

  const saved = rouletteRead(key, "[]");
  const movieKey = rouletteMovieKey(movie);

  if (!saved.includes(movieKey)) {
    saved.push(movieKey);
    localStorage.setItem(key, JSON.stringify(saved));
  }
}

// DISPLAY THE MOVIE


/* DISPLAY ROULETTE RESULT */

function showRouletteMovie(movie) {

  rouletteResult.replaceChildren();

  const heading = document.createElement("h3");
  heading.textContent = "FATE CHOSE...";
  heading.className = "roulette-result-heading";

  const layout = document.createElement("div");
  layout.className = "roulette-movie-layout";

  // POSTER
  const poster = document.createElement("img");
  poster.src =
    "https://image.tmdb.org/t/p/w342" + movie.poster_path;
  poster.alt = movie.title + " poster";
  poster.className = "roulette-poster";

  // MOVIE INFORMATION
  const information = document.createElement("div");
  information.className = "roulette-movie-info";

  const title = document.createElement("h4");
  title.textContent = movie.title;

  // YEAR AND TMDB RATING
  const metadata = document.createElement("div");
  metadata.className = "roulette-metadata";

  const year = document.createElement("span");
  year.textContent = (movie.release_date || "").slice(0, 4);

  const rating = document.createElement("span");
  rating.textContent =
    "★ " + Number(movie.vote_average || 0).toFixed(1) + "/10";

  metadata.appendChild(year);
  metadata.appendChild(rating);

  // DESCRIPTION
  const description = document.createElement("p");
  description.textContent =
    movie.overview || "Description unavailable.";

  information.appendChild(title);
  information.appendChild(metadata);
  information.appendChild(description);

  layout.appendChild(poster);
  layout.appendChild(information);

  // ACTION BUTTONS
  const actions = document.createElement("div");
  actions.className = "roulette-actions";

  function makeButton(text, className, action) {

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.className = className;

    button.addEventListener("click", action);
    actions.appendChild(button);

    return button;
  }

  // WATCH THIS
  makeButton(
    "▶ WATCH THIS",
    "roulette-watch",
    function() {
      window.open(
        "https://www.themoviedb.org/movie/" +
        movie.id + "/watch",
        "_blank",
        "noopener,noreferrer"
      );
    }
  );

  // TRY AGAIN
  makeButton(
    "↻ Try Again",
    "roulette-secondary",
    function() {
      spinButton.click();
    }
  );

  // SAVE TO WATCHLIST
  const saveButton = makeButton(
    "♡ Save",
    "roulette-secondary",
    function() {

      rouletteSaveMovie(movie);

      saveButton.textContent = "✓ Saved";
      saveButton.disabled = true;
    }
  );

  const watchlist = rouletteRead(
    "whatNowWatchlist",
    "[]"
  );

  if (watchlist.some(item =>
    item.id === movie.id &&
    item.mediaType === "movie"
  )) {
    saveButton.textContent = "✓ Saved";
    saveButton.disabled = true;
  }

  // NOT INTERESTED
  makeButton(
    "✕ Not Interested",
    "roulette-secondary",
    function() {
      rouletteRemember("rouletteRejected", movie);
      spinButton.click();
    }
  );

  // ALREADY WATCHED
  makeButton(
    "✓ Already Watched",
    "roulette-secondary",
    function() {
      rouletteRemember("rouletteWatched", movie);
      spinButton.click();
    }
  );

  // ASSEMBLE RESULT
  rouletteResult.appendChild(heading);
  rouletteResult.appendChild(layout);
  rouletteResult.appendChild(actions);

  rouletteResult.style.display = "block";
}


// SPIN THE WHEEL

if (spinButton && rouletteWheel && rouletteResult) {

  spinButton.addEventListener("click", async function() {

    if (rouletteSpinning) return;

    rouletteSpinning = true;
    spinButton.disabled = true;
    rouletteResult.style.display = "none";

    if (rouletteMessage) {
      rouletteMessage.textContent =
        "Finding your next movie...";
    }

    try {

      const movie = await findRouletteMovie();

      rouletteRotation +=
        1800 + Math.floor(Math.random() * 360);

      rouletteWheel.style.transform =
        "rotate(" + rouletteRotation + "deg)";

      if (rouletteMessage) {
        rouletteMessage.textContent = "Spinning...";
      }

      await new Promise(resolve =>
        setTimeout(resolve, 4000)
      );

      
rouletteCurrentMovie = movie;
showRouletteMovie(movie);
showRouletteStreaming(movie);


      if (rouletteMessage) {
        rouletteMessage.textContent =
          "The wheel has spoken!";
      }

    } catch (error) {

      if (rouletteMessage) {
        rouletteMessage.textContent = error.message;
      }

      // Keep the previous movie accessible after an error
      if (rouletteCurrentMovie) {
        rouletteResult.style.display = "block";
      }

    } finally {

      rouletteSpinning = false;
      spinButton.disabled = false;
    }
  });
}

/* ROULETTE — COUNTRY AND STREAMING */

const rouletteCountrySelect =
  document.getElementById("roulette-country");

function getRouletteCountry() {
  return rouletteCountrySelect?.value || "";
}

function rememberRouletteCountry() {

  const country = getRouletteCountry();

  if (country) {
    localStorage.setItem("whatNowCountry", country);
  }
}

// Restore the country previously selected in Tonight
if (rouletteCountrySelect) {

  const savedCountry =
    localStorage.getItem("whatNowCountry") || "";

  if (savedCountry) {

    const existingOption = Array.from(
      rouletteCountrySelect.options
    ).find(option => option.value === savedCountry);

    if (!existingOption) {

      const option = document.createElement("option");
      option.value = savedCountry;

      try {
        option.textContent = new Intl.DisplayNames(
          ["en"], { type: "region" }
        ).of(savedCountry) || savedCountry;
      } catch {
        option.textContent = savedCountry;
      }

      rouletteCountrySelect.appendChild(option);
    }

    rouletteCountrySelect.value = savedCountry;
  }

  rouletteCountrySelect.addEventListener(
    "change",
    function() {

      rememberRouletteCountry();

      if (rouletteCurrentMovie) {
        showRouletteStreaming(rouletteCurrentMovie);
      }
    }
  );
}

// Get streaming availability from TMDB
async function showRouletteStreaming(movie) {

  if (!rouletteResult || !movie) return;

  let streamingBox = rouletteResult.querySelector(
    ".roulette-streaming-box"
  );

  if (!streamingBox) {

    streamingBox = document.createElement("div");
    streamingBox.className = "roulette-streaming-box";

    const actions = rouletteResult.querySelector(
      ".roulette-actions"
    );

    if (actions) {
      actions.before(streamingBox);
    } else {
      rouletteResult.appendChild(streamingBox);
    }
  }

  const country = getRouletteCountry();

  if (!country) {
    streamingBox.textContent =
      "Choose your country to see streaming services.";
    return;
  }

  const requestMovieId = movie.id;
  streamingBox.textContent =
    "Checking streaming availability...";

  try {

    const data = await rouletteRequest(
      "/movie/" + movie.id + "/watch/providers"
    );

    // Ignore results from an older movie or country
    if (
      rouletteCurrentMovie?.id !== requestMovieId ||
      getRouletteCountry() !== country ||
      !streamingBox.isConnected
    ) {
      return;
    }

    const regional = data.results?.[country];

    const providers = regional?.flatrate || [];

    const names = [
      ...new Set(
        providers.map(provider => provider.provider_name)
      )
    ];

    streamingBox.replaceChildren();

    const heading = document.createElement("strong");
    heading.textContent = "Where to watch";

    const details = document.createElement("p");
    details.textContent = names.length
      ? "Subscription streaming: " + names.join(", ")
      : "No subscription streaming confirmed for this country.";

    const credit = document.createElement("small");
    credit.textContent = "Availability data: JustWatch via TMDB";

    streamingBox.appendChild(heading);
    streamingBox.appendChild(details);
    streamingBox.appendChild(credit);

    if (regional?.link) {

      const link = document.createElement("a");
      link.href = regional.link;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "View watching options ↗";

      streamingBox.appendChild(link);
    }

  } catch (error) {

    if (
      rouletteCurrentMovie?.id === requestMovieId &&
      getRouletteCountry() === country &&
      streamingBox.isConnected
    ) {
      streamingBox.textContent =
        "Streaming information unavailable right now.";
    }
  }
}


