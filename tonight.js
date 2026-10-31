
/* ==========================================
   WHAT NOW? — TONIGHT RECOMMENDATIONS
   ========================================== */

// MAIN GENRES

const tonightMoodGenres = {
  Funny: 35,
  Drama: 18,
  Romantic: 10749,
  Scary: 27,
  "Sci-Fi": 878
};

const tonightGenreIds = {
  Comedy: 35,
  Romance: 10749,
  Drama: 18,
  Horror: 27,
  Thriller: 53,
  Mystery: 9648,
  Action: 28,
  "Sci-Fi": 878
};

// STREAMING SERVICES

const tonightProviderNames = {
  Netflix: ["Netflix"],
  "Prime Video": ["Amazon Prime Video", "Prime Video"],
  "Disney Plus": ["Disney Plus", "Disney+"],
  Hulu: ["Hulu"],
  Max: ["Max", "HBO Max"],
  "Apple TV": ["Apple TV Plus", "Apple TV+"],
  Peacock: ["Peacock", "Peacock Premium"]
};

// SUBGENRE KEYWORDS

const tonightSubgenres = {
  "Dark comedy": ["dark comedy", "black comedy"],
  "Romantic comedy": ["romantic comedy", "romcom"],
  Slapstick: ["slapstick", "physical comedy"],
  Satire: ["satire"],

  "Romantic drama": ["romantic drama", "love story"],
  "Period romance": ["period romance", "period drama"],
  "Teen romance": ["teen romance", "high school romance"],

  "Family drama": ["family drama", "family conflict"],
  "Coming-of-age": ["coming of age", "growing up"],
  "Historical drama": ["historical drama"],
  "Crime drama": ["crime drama", "organized crime"],

  "Supernatural horror": ["supernatural", "haunting", "ghost"],
  Slasher: ["slasher", "serial killer"],
  "Psychological horror": ["psychological horror", "paranoia"],
  "Found footage": ["found footage"],

  "Psychological thriller": ["psychological thriller"],
  "Crime thriller": ["crime thriller", "criminal investigation"],
  "Survival thriller": ["survival"],
  "Action thriller": ["action thriller"],

  "Murder mystery": ["murder mystery", "whodunit"],
  "Detective stories": ["detective", "private investigator"],
  "Crime investigation": ["police investigation"],
  Whodunits: ["whodunit", "murder mystery"],

  Superheroes: ["superhero"],
  "Spy movies": ["spy", "espionage", "secret agent"],
  "Martial arts": ["martial arts", "kung fu"],
  Adventure: ["adventure", "expedition"],

  "Space exploration": ["space exploration", "astronaut"],
  "Time travel": ["time travel", "time loop"],
  Dystopian: ["dystopia", "dystopian future"],
  "Alien encounters": ["alien", "extraterrestrial"]
};

// APPLICATION STATE

let tonightPool = [];
let tonightSearching = false;
let tonightRatingProfile = {};

const tonightCache = new Map();
const tonightProviderCache = new Map();

// ==========================================
// TMDB REQUESTS
// ==========================================

async function tonightRequest(path) {

  const token = localStorage.getItem("tmdbToken");

  if (!token) {
    throw new Error("Please connect to TMDB first.");
  }

  if (tonightCache.has(path)) {
    return tonightCache.get(path);
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
    throw new Error("TMDB search failed. Please try again.");
  }

  const data = await response.json();

  tonightCache.set(path, data);

  return data;
}

// ==========================================
// READ TONIGHT'S ANSWERS
// ==========================================

function getTonightAnswers() {

  const form = document.getElementById("finder");

  const selected = name =>
    form.querySelector(
      `input[name="${name}"]:checked`
    )?.value;

  return {
    mood: selected("mood"),
    type: selected("type"),
    time: selected("time"),

    services: Array.from(
      form.querySelectorAll(
        'input[name="service"]:checked'
      )
    ).map(input => input.value),

    country: document.getElementById("country").value
  };
}

// ==========================================
// GET STREAMING PROVIDERS
// ==========================================

async function getTonightProviders(mediaType, answers) {

  const services = answers.services.filter(
    service => service !== "Other"
  );

  if (!services.length) {
    throw new Error(
      "Please select a listed streaming service. Other cannot be verified yet."
    );
  }

  const key = mediaType + ":" +
    answers.country + ":" + services.join(",");

  if (tonightProviderCache.has(key)) {
    return tonightProviderCache.get(key);
  }

  const data = await tonightRequest(
    "/watch/providers/" + mediaType +
    "?language=en-US&watch_region=" +
    encodeURIComponent(answers.country)
  );

  const ids = (data.results || [])
    .filter(provider =>
      services.some(service =>
        (tonightProviderNames[service] || [])
          .some(name =>
            name.toLowerCase() ===
            provider.provider_name.toLowerCase()
          )
      )
    )
    .map(provider => provider.provider_id);

  tonightProviderCache.set(key, ids);

  return ids;
}

// ==========================================
// RUNTIME
// ==========================================

function tonightDuration(movie) {

  if (movie.mediaType === "movie") {
    return movie.runtime || null;
  }

  const lengths = movie.episode_run_time || [];

  return lengths.find(length => length > 0) || null;
}

function tonightFitsTime(movie, time) {

  if (time === "any") return true;

  const duration = tonightDuration(movie);

  return duration > 0 && duration <= Number(time);
}

// ==========================================
// AGE SUITABILITY
// ==========================================

function tonightAgeAllowed(movie, preferences, country) {

  const age = preferences.age;

  if (!["under13", "13-17"].includes(age)) {
    return true;
  }

  // This first version supports movie certifications.
  // TV ratings are handled conservatively below.

  if (movie.mediaType === "tv") {
    const regions =
      movie["content_ratings"]?.results || [];

    const region = regions.find(
      item => item.iso_3166_1 === country
    );

    const us = regions.find(
      item => item.iso_3166_1 === "US"
    );

    const rating = country === "US"
      ? us?.rating
      : region?.rating || us?.rating;

    const allowed = age === "under13"
      ? ["TV-Y", "TV-Y7", "TV-G", "TV-PG"]
      : ["TV-Y", "TV-Y7", "TV-G", "TV-PG", "TV-14"];

    return allowed.includes(rating);
  }

  const regions =
    movie["release_dates"]?.results || [];

  const region = regions.find(
    item => item.iso_3166_1 === country
  );

  const us = regions.find(
    item => item.iso_3166_1 === "US"
  );

  // Use US certification labels only.
  // Foreign labels require a separate mapping.
  const source = country === "US"
    ? us
    : us;

  const certifications = (
    source?.release_dates || []
  )
    .map(item => item.certification)
    .filter(Boolean);

  const allowed = age === "under13"
    ? ["G", "PG"]
    : ["G", "PG", "PG-13"];

  return certifications.length > 0 &&
    certifications.every(label =>
      allowed.includes(label)
    );
}

// ==========================================
// DISLIKED GENRES
// ==========================================

function tonightDisliked(movie, preferences) {

  const genres = (movie.genres || [])
    .map(genre => genre.id);

  return Object.entries(preferences.genres || {})
    .some(([name, choice]) =>
      choice === "dislike" &&
      genres.includes(tonightGenreIds[name])
    );
}

// ==========================================
// LEARN FROM PERSONAL RATINGS
// ==========================================

async function buildTonightRatingProfile() {

  const ratings = JSON.parse(
    localStorage.getItem("movieRatings") || "{}"
  );

  const entries = Object.entries(ratings).slice(0, 20);

  const movies = await Promise.all(
    entries.map(async ([id, rating]) => {

      try {
        const movie = await tonightRequest("/movie/" + id);

        return {
          genres: movie.genres || [],
          rating: Number(rating)
        };

      } catch {
        return null;
      }
    })
  );

  const profile = {};

  movies.filter(Boolean).forEach(movie => {

    movie.genres.forEach(genre => {

      if (!profile[genre.id]) {
        profile[genre.id] = {
          total: 0,
          count: 0
        };
      }

      profile[genre.id].total += movie.rating;
      profile[genre.id].count++;
    });
  });

  tonightRatingProfile = profile;
}

// ==========================================
// SUBGENRE SCORING
// ==========================================

function scoreTonightSubgenres(movie, preferences) {

  let bonus = 0;

  const keywords = (
    movie.keywords?.keywords ||
    movie.keywords?.results ||
    []
  ).map(item => item.name.toLowerCase());

  Object.entries(preferences.subgenres || {})
    .forEach(([key, preference]) => {

      const subgenre = key.split(":").slice(1).join(":");

      const words = tonightSubgenres[subgenre] || [];

      const matches = words.some(word =>
        keywords.some(keyword =>
          keyword.includes(word)
        )
      );

      if (!matches) return;

      if (preference === "like") bonus += 20;
      if (preference === "dislike") bonus -= 30;
    });

  return bonus;
}

// ==========================================
// PERSONAL COMPATIBILITY
// ==========================================

function scoreTonightMovie(movie, preferences) {

  let score = movie.vote_average || 0;

  const genres = movie.genres || [];

  genres.forEach(genre => {

    const data = tonightRatingProfile[genre.id];

    if (data && data.count > 0) {
      const average = data.total / data.count;
      score += (average - 5.5) * 2;
    }
  });

  Object.entries(preferences.genres || {})
    .forEach(([name, choice]) => {

      if (
        choice === "like" &&
        genres.some(genre =>
          genre.id === tonightGenreIds[name]
        )
      ) {
        score += 15;
      }
    });

  score += scoreTonightSubgenres(movie, preferences);

  return score;
}

// ==========================================
// FAST TMDB SEARCH
// ==========================================

async function findTonightMovies(answers) {

  const preferences = JSON.parse(
    localStorage.getItem("tastePreferences") || "{}"
  );

  const watched = JSON.parse(
    localStorage.getItem("movieRatings") || "{}"
  );

  const mediaTypes = answers.type === "any"
    ? ["movie", "tv"]
    : [answers.type];

  const now = new Date();

  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");

  const candidates = [];
  const providerIdsByType = {};

  // Search TMDB by mood, service and country
  for (const mediaType of mediaTypes) {

    const providerIds = await getTonightProviders(
      mediaType,
      answers
    );

    providerIdsByType[mediaType] = providerIds;

    if (!providerIds.length) continue;

    const requests = [];

    for (let page = 1; page <= 3; page++) {

      const params = new URLSearchParams({
        language: "en-US",
        sort_by: "popularity.desc",
        include_adult: "false",
        "vote_count.gte": "100",
        watch_region: answers.country,
        with_watch_monetization_types: "flatrate",
        with_watch_providers: providerIds.join("|"),
        page: String(page)
      });

      if (answers.mood !== "Surprise Me") {

        let genre = tonightMoodGenres[answers.mood];

        if (
          mediaType === "tv" &&
          answers.mood === "Romantic"
        ) {
          genre = 10766;
        }

        if (genre) {
          params.set("with_genres", String(genre));
        }
      }

      if (mediaType === "movie") {

        params.set("primary_release_date.lte", today);

        if (answers.time !== "any") {
          params.set("with_runtime.gte", "1");
          params.set("with_runtime.lte", answers.time);
        }

      } else {
        params.set("first_air_date.lte", today);
      }

      requests.push(
        tonightRequest(
          "/discover/" + mediaType + "?" +
          params.toString()
        )
      );
    }

    const pages = await Promise.all(requests);

    pages.forEach(data => {

      (data.results || []).forEach(movie => {

        if (!movie.poster_path) return;

        if (
          mediaType === "movie" &&
          watched[movie.id] !== undefined
        ) {
          return;
        }

        const releaseDate = mediaType === "movie"
          ? movie.release_date
          : movie.first_air_date;

        if (!releaseDate || releaseDate > today) {
          return;
        }

        candidates.push({
          ...movie,
          mediaType
        });
      });
    });
  }

  // Remove duplicates
  const unique = new Map();

  candidates.forEach(movie => {
    unique.set(
      movie.mediaType + ":" + movie.id,
      movie
    );
  });

  const filtered = [...unique.values()];
  const matches = [];

  // Download details in parallel batches
  for (
    let start = 0;
    start < filtered.length && matches.length < 25;
    start += 6
  ) {

    const batch = filtered.slice(start, start + 6);

    const details = await Promise.all(
      batch.map(async candidate => {

        try {

          const append = candidate.mediaType === "movie"
            ? "watch/providers,keywords,release_dates"
            : "watch/providers,keywords,content_ratings";

          const movie = await tonightRequest(
            "/" + candidate.mediaType +
            "/" + candidate.id +
            "?append_to_response=" + append
          );

          return {
            ...movie,
            mediaType: candidate.mediaType
          };

        } catch (error) {
          console.warn("Movie details failed:", error);
          return null;
        }
      })
    );

    for (const movie of details) {

      if (!movie) continue;

      if (!tonightFitsTime(movie, answers.time)) {
        continue;
      }

      if (tonightDisliked(movie, preferences)) {
        continue;
      }

      if (!tonightAgeAllowed(
        movie,
        preferences,
        answers.country
      )) {
        continue;
      }

      const regional =
        movie["watch/providers"]?.results?.[answers.country];

      const available = regional?.flatrate || [];

      const ids =
        providerIdsByType[movie.mediaType] || [];

      const confirmed = available.some(provider =>
        ids.includes(provider.provider_id)
      );

      if (!confirmed) continue;

      matches.push(movie);

      if (matches.length >= 25) break;
    }
  }

  return matches.sort(
    (a, b) =>
      scoreTonightMovie(b, preferences) -
      scoreTonightMovie(a, preferences)
  );
}

// ==========================================
// SAFE BET, WILDCARD AND HIDDEN GEM
// ==========================================



/* SMART PICKS — MORE VARIETY */

/* FRANCHISE DETECTION */

function tonightSameFranchise(movieA, movieB) {

  if (!movieA || !movieB) {
    return false;
  }

  if (
    movieA.mediaType !== "movie" ||
    movieB.mediaType !== "movie"
  ) {
    return false;
  }

  const collectionA = movieA.belongs_to_collection?.id;
  const collectionB = movieB.belongs_to_collection?.id;

  return Boolean(
    collectionA &&
    collectionB &&
    collectionA === collectionB
  );
}

/* CHOOSE THE THREE PICKS */

function chooseTonightPicks(movies) {

  if (!movies.length) return [];

  const preferences = JSON.parse(
    localStorage.getItem("tastePreferences") || "{}"
  );

  const ranked = [...movies].sort(
    (a, b) =>
      scoreTonightMovie(b, preferences) -
      scoreTonightMovie(a, preferences)
  );

  // SAFE BET: strongest personal match
  const safe = ranked.shift();

  if (!ranked.length) return [safe];

  // Compare genre similarity
  function similarity(a, b) {

    const genresA = new Set(
      (a.genres || []).map(g => g.id)
    );

    const genresB = new Set(
      (b.genres || []).map(g => g.id)
    );

    const shared = [...genresA].filter(
      id => genresB.has(id)
    ).length;

    const total = new Set([
      ...genresA,
      ...genresB
    ]).size;

    return total ? shared / total : 0;
  }

  // WILDCARD: different, but still compatible
  const wildcardCandidates = ranked
    .filter(movie =>
      !tonightSameFranchise(safe, movie)
    )
    .map(movie => ({
      movie,
      score:
        scoreTonightMovie(movie, preferences) -
        similarity(safe, movie) * 12
    }))
    .sort((a, b) => b.score - a.score);

  const wildcard = wildcardCandidates[0]?.movie;

  // Exclude the Wildcard from remaining choices
  const remaining = ranked.filter(movie =>
    (!wildcard ||
      movie.mediaType !== wildcard.mediaType ||
      movie.id !== wildcard.id) &&
    !tonightSameFranchise(safe, movie) &&
    (!wildcard ||
      !tonightSameFranchise(wildcard, movie))
  );

  // HIDDEN GEM: less mainstream and reasonably rated
  const gemCandidates = remaining
    .filter(movie =>
      movie.vote_average >= 6.5 &&
      movie.vote_count >= 50
    )
    .sort((a, b) => {

      const scoreA =
        scoreTonightMovie(a, preferences) -
        (a.popularity || 0) * 0.03 -
        similarity(safe, a) * 8;

      const scoreB =
        scoreTonightMovie(b, preferences) -
        (b.popularity || 0) * 0.03 -
        similarity(safe, b) * 8;

      return scoreB - scoreA;
    });

  const gem = gemCandidates[0] || remaining[0];

  return [safe, wildcard, gem].filter(Boolean);
}

// ==========================================
// DISPLAY TONIGHT'S PICKS
// ==========================================

/* WHAT NOW? — SAVE TO WATCHLIST */

function saveToWatchlist(movie) {

  // Get the movies already saved
  const watchlist = JSON.parse(
    localStorage.getItem("whatNowWatchlist") || "[]"
  );

  // Check whether this movie is already saved
  const alreadySaved = watchlist.some(item =>
    item.id === movie.id &&
    item.mediaType === movie.mediaType
  );

  if (alreadySaved) {
    return false;
  }

  // Save only the information Library needs
  watchlist.push({
    id: movie.id,
    mediaType: movie.mediaType,
    title: movie.title || movie.name,
    poster_path: movie.poster_path,
    release_date: movie.release_date ||
      movie.first_air_date || ""
  });

  localStorage.setItem(
    "whatNowWatchlist",
    JSON.stringify(watchlist)
  );

  return true;
}

function displayTonightMovies(movies) {

  const results = document.getElementById("results");
  const message = document.getElementById("results-message");

  const labels = [
    "The Safe Bet",
    "The Wildcard",
    "The Hidden Gem"
  ];

  const cards = results.querySelectorAll("article");
  const country = document.getElementById("country").value;

  cards.forEach(card => {
    card.replaceChildren();
    card.hidden = true;
  });

  movies.forEach((movie, index) => {

    const card = cards[index];
    if (!card) return;

    const heading = document.createElement("h3");
    heading.textContent = labels[index];

    const poster = document.createElement("img");

    if (movie.poster_path) {
      poster.src =
        "https://image.tmdb.org/t/p/w342" +
        movie.poster_path;
    }

    poster.alt = (movie.title || movie.name) + " poster";

    const title = document.createElement("h4");
    title.textContent = movie.title || movie.name;

    // RELEASE YEAR
    const releaseDate =
      movie.release_date || movie.first_air_date || "";

    const year = releaseDate
      ? releaseDate.slice(0, 4)
      : "Year unknown";

    // RUNTIME
    const minutes = tonightDuration(movie);

    let runtime = "Time unknown";

    if (minutes > 0) {

      const hours = Math.floor(minutes / 60);
      const remaining = minutes % 60;

      runtime = hours > 0
        ? hours + "h " + remaining + "m"
        : remaining + "m";

      if (movie.mediaType === "tv") {
        runtime += " / episode";
      }
    }

    // TMDB RATING
    const rating = movie.vote_count > 0
      ? Number(movie.vote_average).toFixed(1) + "/10"
      : "Not rated";

    // INFORMATION BADGES
    const metadata = document.createElement("div");
    metadata.className = "tonight-metadata";

    metadata.style.setProperty(
      "display", "flex", "important"
    );
    metadata.style.setProperty(
      "flex-wrap", "wrap", "important"
    );
    metadata.style.setProperty(
      "justify-content", "center", "important"
    );
    metadata.style.setProperty(
      "gap", "10px", "important"
    );
    metadata.style.setProperty(
      "width", "100%", "important"
    );
    metadata.style.setProperty(
      "margin", "14px 0", "important"
    );

    function makeBadge(text, highlighted = false) {

      const badge = document.createElement("span");

      badge.textContent = text;

      badge.style.setProperty(
        "display", "inline-block", "important"
      );
      badge.style.setProperty(
        "padding", "7px 10px", "important"
      );
      badge.style.setProperty(
        "border-radius", "8px", "important"
      );
      badge.style.setProperty(
        "background", "#292637", "important"
      );
      badge.style.setProperty(
        "color",
        highlighted ? "#C4B5FD" : "#D5D0E3",
        "important"
      );
      badge.style.setProperty(
        "font-size", "13px", "important"
      );
      badge.style.setProperty(
        "white-space", "nowrap", "important"
      );

      return badge;
    }

    metadata.appendChild(makeBadge(year));
    metadata.appendChild(makeBadge(runtime));
    metadata.appendChild(makeBadge("★ " + rating, true));

    // STREAMING INFORMATION
    const providerBox = document.createElement("div");
    providerBox.className = "tonight-streaming";

    const regional =
      movie["watch/providers"]?.results?.[country];

    const providers = regional?.flatrate || [];

    const providerNames = [
      ...new Set(providers.map(p => p.provider_name))
    ];

    providerBox.textContent = providerNames.length
      ? "Streaming: " + providerNames.join(", ")
      : "Streaming information unavailable";

    providerBox.style.setProperty(
      "display", "block", "important"
    );
    providerBox.style.setProperty(
      "background", "#292637", "important"
    );
    providerBox.style.setProperty(
      "border", "1px solid #48405F", "important"
    );
    providerBox.style.setProperty(
      "border-radius", "10px", "important"
    );
    providerBox.style.setProperty(
      "padding", "12px", "important"
    );
    providerBox.style.setProperty(
      "margin", "0 0 18px", "important"
    );
    providerBox.style.setProperty(
      "width", "100%", "important"
    );
    providerBox.style.setProperty(
      "box-sizing", "border-box", "important"
    );
    providerBox.style.setProperty(
      "color", "#D4C6F7", "important"
    );
    providerBox.style.setProperty(
      "font-size", "13px", "important"
    );
    providerBox.style.setProperty(
      "line-height", "1.6", "important"
    );
    providerBox.style.setProperty(
      "text-align", "center", "important"
    );

    // DESCRIPTION
    const description = document.createElement("p");
    description.className = "tonight-description";

    const overview =
      movie.overview || "Description unavailable.";

    description.textContent = overview.length > 190
      ? overview.slice(0, 187).trimEnd() + "..."
      : overview;

// WATCHLIST BUTTON


    // WATCHLIST BUTTON

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "watchlist-button";

    const savedMovies = JSON.parse(
      localStorage.getItem("whatNowWatchlist") || "[]"
    );

    const isSaved = savedMovies.some(item =>
      item.id === movie.id &&
      item.mediaType === movie.mediaType
    );

    saveButton.textContent = isSaved
      ? "✓ SAVED TO WATCHLIST"
      : "+ SAVE TO WATCHLIST";

    saveButton.disabled = isSaved;

    saveButton.addEventListener("click", function() {

      const saved = saveToWatchlist(movie);

      if (saved) {
        saveButton.textContent = "✓ SAVED TO WATCHLIST";
        saveButton.disabled = true;
      }

    });



    // BUILD THE CARD
    card.appendChild(heading);
    card.appendChild(poster);
    card.appendChild(title);
    card.appendChild(metadata);
    card.appendChild(providerBox);
    card.appendChild(description);
    card.appendChild(saveButton);

    card.hidden = false;
  });

  message.textContent = movies.length
    ? "Three picks for your movie night."
    : "No confirmed matches found.";
}

// ==========================================
// TRY 3 MORE
// ==========================================

function showNextTonightPicks() {

  const message = document.getElementById("results-message");
  const button = document.getElementById("try-more");

  if (!tonightPool.length) {

    message.textContent =
      "No more matches. Try changing your filters.";

    if (button) button.hidden = true;

    return;
  }

  const picks = chooseTonightPicks(tonightPool);

  const chosen = new Set(
    picks.map(movie =>
      movie.mediaType + ":" + movie.id
    )
  );

  tonightPool = tonightPool.filter(movie =>
    !chosen.has(movie.mediaType + ":" + movie.id)
  );

  displayTonightMovies(picks);

  if (button) {
    button.hidden = tonightPool.length === 0;
  }
}

// ==========================================
// MAIN TONIGHT SEARCH
// ==========================================

async function runTonightSearch() {

  if (tonightSearching) return;

  const answers = getTonightAnswers();

  if (
    !answers.mood ||
    !answers.type ||
    !answers.time ||
    !answers.country ||
    !answers.services.length
  ) {
    alert("Please answer all five questions.");
    return;
  }

  const results = document.getElementById("results");

  let message = document.getElementById("results-message");

  if (!message) {

    message = document.createElement("p");
    message.id = "results-message";

    results.appendChild(message);
  }

  const button = document.getElementById("try-more");

  if (button) button.hidden = true;

  results.querySelectorAll("article").forEach(card => {
    card.hidden = true;
  });

  results.hidden = false;

  message.textContent =
    "Finding something good to watch...";

  tonightPool = [];
  tonightSearching = true;

  try {

    await buildTonightRatingProfile();

    const movies = await findTonightMovies(answers);

    tonightPool = movies;

    if (!movies.length) {

      message.textContent =
        "No confirmed matches found. Try another service, country, or time.";

      return;
    }

    showNextTonightPicks();

  } catch (error) {

    message.textContent = error.message;
    console.error(error);

  } finally {

    tonightSearching = false;
  }
}

// ==========================================
// TRY 3 MORE BUTTON
// ==========================================

const tryMoreButton = document.getElementById("try-more");

if (tryMoreButton) {

  tryMoreButton.hidden = true;

  tryMoreButton.addEventListener("click", function() {

    if (!tonightSearching) {
      showNextTonightPicks();
    }

  });
}

/* SHARE TONIGHT'S COUNTRY WITH ROULETTE */

const tonightCountrySelect = document.getElementById("country");

if (tonightCountrySelect) {

  tonightCountrySelect.addEventListener("change", function() {
    localStorage.setItem(
      "whatNowCountry",
      tonightCountrySelect.value
    );
  });

  const tonightFinder = document.getElementById("finder");

  if (tonightFinder) {
    tonightFinder.addEventListener("submit", function() {
      if (tonightCountrySelect.value) {
        localStorage.setItem(
          "whatNowCountry",
          tonightCountrySelect.value
        );
      }
    });
  }
}
