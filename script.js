
console.log("WHAT NOW? is ready!");

/* FIRST VISIT — TASTE TEST */

if (document.getElementById("finder")) {

  const completed = localStorage.getItem(
    "tasteTestCompleted"
  );

  if (completed !== "true") {
    window.location.replace("taste.html");
  }

}

// ======================================
// TONIGHT: MOVIE AND TIME RULE
// ======================================

const finderForm = document.getElementById("finder");

if (finderForm) {
  const movieOption = document.querySelector(
    'input[name="type"][value="movie"]'
  );
  const shortTimeOption = document.querySelector(
    'input[name="time"][value="30"]'
  );
  const anyTimeOption = document.querySelector(
    'input[name="time"][value="any"]'
  );

  function updateTimeOptions() {
    const isMovie = movieOption.checked;
    shortTimeOption.disabled = isMovie;

    if (isMovie && shortTimeOption.checked) {
      anyTimeOption.checked = true;
    }
  }

  document.querySelectorAll('input[name="type"]').forEach(
    option => option.addEventListener("change", updateTimeOptions)
  );

  updateTimeOptions();

  finderForm.addEventListener("submit", function(event) {
    event.preventDefault();

/* CHECK ALL TONIGHT QUESTIONS */

const selectedMood = finderForm.querySelector(
  'input[name="mood"]:checked'
);

const selectedType = finderForm.querySelector(
  'input[name="type"]:checked'
);

const selectedTime = finderForm.querySelector(
  'input[name="time"]:checked'
);

const selectedServices = finderForm.querySelectorAll(
  'input[name="service"]:checked'
);

// Check mood
if (!selectedMood) {
  alert("Please choose your mood.");
  return;
}

// Check type
if (!selectedType) {
  alert("Please choose Movie, TV Show, or I Don't Care.");
  return;
}

// Check time
if (!selectedTime) {
  alert("Please choose how much time you have.");
  return;
}

// Check streaming services
if (selectedServices.length === 0) {
  alert("Please select at least one streaming service.");
  return;
}

    const country = document.getElementById("country");
    const results = document.getElementById("results");

    if (!country.value) {
      country.reportValidity();
      return;
    }

    
if (results) {

  // Show the results section
  results.hidden = false;

  // Hide the placeholder cards for now
  results.querySelectorAll("article").forEach(function(card) {
    card.hidden = true;
  });

  // Create a loading message if it doesn't exist
  let message = document.getElementById("results-message");

  if (!message) {
    message = document.createElement("p");
    message.id = "results-message";
    results.appendChild(message);
  }

  message.textContent = "Finding something good to watch...";
  runTonightSearch();

  // Move down to the results
  results.scrollIntoView({
    behavior: "smooth"
  });

}

  });
}

// ======================================
// SAVING MOVIE RATINGS
// ======================================

function getRatings() {
  return JSON.parse(localStorage.getItem("movieRatings") || "{}");
}

function saveMovieRating(id, rating) {
  const ratings = getRatings();
  ratings[id] = rating;

  localStorage.setItem("movieRatings", JSON.stringify(ratings));
}

function removeMovieRating(id) {
  const ratings = getRatings();
  delete ratings[id];

  localStorage.setItem("movieRatings", JSON.stringify(ratings));
}

// ======================================
// SHARED MOVIE CARD WITH LAVENDER SLIDER
// ======================================

function createMovieCard(movie) {
  const card = document.createElement("div");
  card.className = "movie-card";

  const poster = document.createElement("img");

  if (movie.poster_path) {
    poster.src =
      "https://image.tmdb.org/t/p/w342" + movie.poster_path;
  }

  poster.alt = movie.title + " poster";

  const title = document.createElement("p");
  title.textContent = movie.title;

  const watchedButton = document.createElement("button");
  watchedButton.type = "button";
  watchedButton.className = "watched-button";

  const ratingBox = document.createElement("div");
  ratingBox.className = "rating-box";

  const ratingLabel = document.createElement("label");
  ratingLabel.textContent = "Your rating";

  // Create the draggable slider
  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "1";
  slider.max = "10";
  slider.step = "1";

  const ratingNumber = document.createElement("span");
  ratingNumber.className = "rating-number";

  const savedRating = getRatings()[movie.id];

  let isWatched = savedRating !== undefined;

  slider.value = isWatched ? String(savedRating) : "5";

  function updateCard() {
    watchedButton.dataset.watched = String(isWatched);

    watchedButton.textContent = isWatched
      ? "✓ Watched"
      : "I've watched this";

    ratingBox.hidden = !isWatched;
    ratingNumber.textContent = slider.value + "/10";
  }

  watchedButton.addEventListener("click", function() {
    isWatched = !isWatched;

    if (isWatched) {
      saveMovieRating(movie.id, Number(slider.value));
    } else {
      removeMovieRating(movie.id);
    }

    updateCard();
  });

  // Update the displayed number while dragging
  slider.addEventListener("input", function() {
    ratingNumber.textContent = slider.value + "/10";
  });

  // Save when the rating changes
  slider.addEventListener("change", function() {
    if (isWatched) {
      saveMovieRating(movie.id, Number(slider.value));
    }
  });

  ratingLabel.appendChild(slider);
  ratingLabel.appendChild(ratingNumber);
  ratingBox.appendChild(ratingLabel);

  card.appendChild(poster);
  card.appendChild(title);
  card.appendChild(watchedButton);
  card.appendChild(ratingBox);

  updateCard();

  return card;
}

// ======================================
// SAVE TASTE PREFERENCES
// ======================================

function saveTastePreferences() {
  const age = document.querySelector('input[name="age"]:checked');

  const preferences = {
    age: age ? age.value : null,
    genres: {},
    subgenres: {}
  };

  document.querySelectorAll(
    "#taste-genres .genre-card"
  ).forEach(card => {
    preferences.genres[card.dataset.genre] =
      card.dataset.preference;
  });

  document.querySelectorAll(
    "#taste-subgenres .genre-card"
  ).forEach(card => {
    const key = card.dataset.genre + ":" + card.dataset.subgenre;
    preferences.subgenres[key] = card.dataset.preference;
  });

  localStorage.setItem(
    "tastePreferences",
    JSON.stringify(preferences)
  );
}

// ======================================
// TASTE TEST: AGE, GENRES, SUBGENRES
// ======================================

const tasteNext = document.getElementById("taste-next");
const tasteAge = document.getElementById("taste-age");
const tasteGenres = document.getElementById("taste-genres");
const tasteSubgenres = document.getElementById("taste-subgenres");
const tasteProgress = document.querySelector(".taste-progress");

if (tasteNext && tasteAge && tasteGenres && tasteSubgenres) {
  let tasteStep = 1;

  const subgenreData = {
    Comedy: [
      "Dark comedy", "Romantic comedy", "Slapstick", "Satire"
    ],
    Romance: [
      "Romantic drama", "Romantic comedy",
      "Period romance", "Teen romance"
    ],
    Drama: [
      "Family drama", "Coming-of-age",
      "Historical drama", "Crime drama"
    ],
    Horror: [
      "Supernatural horror", "Slasher",
      "Psychological horror", "Found footage"
    ],
    Thriller: [
      "Psychological thriller", "Crime thriller",
      "Survival thriller", "Action thriller"
    ],
    Mystery: [
      "Murder mystery", "Detective stories",
      "Crime investigation", "Whodunits"
    ],
    Action: [
      "Superheroes", "Spy movies",
      "Martial arts", "Adventure"
    ],
    "Sci-Fi": [
      "Space exploration", "Time travel",
      "Dystopian", "Alien encounters"
    ]
  };

  function changePreference(card) {
    const current = card.dataset.preference;

    if (current === "neutral") {
      card.dataset.preference = "like";
      card.querySelector("span").textContent = "Like";
    } else if (current === "like") {
      card.dataset.preference = "dislike";
      card.querySelector("span").textContent = "Dislike";
    } else {
      card.dataset.preference = "neutral";
      card.querySelector("span").textContent = "Neutral";
    }
  }

  document.querySelectorAll(
    "#taste-genres .genre-card"
  ).forEach(card => {
    card.addEventListener("click", () => changePreference(card));
  });

  function buildSubgenres() {
    const container = document.getElementById("subgenre-options");
    container.replaceChildren();

    const likedGenres = document.querySelectorAll(
      '#taste-genres .genre-card[data-preference="like"]'
    );

    if (likedGenres.length === 0) {
      const message = document.createElement("p");
      message.textContent =
        "No favorite genres selected. You can continue.";
      container.appendChild(message);
      return;
    }

    likedGenres.forEach(genreCard => {
      const genre = genreCard.dataset.genre;

      const group = document.createElement("div");
      group.className = "subgenre-group";

      const heading = document.createElement("h4");
      heading.textContent = genre;

      const grid = document.createElement("div");
      grid.className = "subgenre-grid";

      (subgenreData[genre] || []).forEach(name => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "genre-card";
        card.dataset.genre = genre;
        card.dataset.subgenre = name;
        card.dataset.preference = "neutral";

        const status = document.createElement("span");
        status.textContent = "Neutral";

        card.appendChild(document.createTextNode(name));
        card.appendChild(status);

        card.addEventListener("click", () => changePreference(card));

        grid.appendChild(card);
      });

      group.appendChild(heading);
      group.appendChild(grid);
      container.appendChild(group);
    });
  }

  tasteNext.addEventListener("click", function() {
    if (tasteStep === 1) {
      const age = document.querySelector(
        'input[name="age"]:checked'
      );

      if (!age) {
        alert("Please choose your age range first.");
        return;
      }

      tasteAge.hidden = true;
      tasteGenres.hidden = false;
      tasteStep = 2;

    } else if (tasteStep === 2) {
      buildSubgenres();
      tasteGenres.hidden = true;
      tasteSubgenres.hidden = false;
      tasteStep = 3;

    } else if (tasteStep === 3) {
      saveTastePreferences();

      tasteSubgenres.hidden = true;
      document.getElementById("taste-movies").hidden = false;

      tasteStep = 4;
      tasteNext.textContent = "Finish";
      loadTestMovie();

    } else if (tasteStep === 4) {
      saveTastePreferences();
      localStorage.setItem("tasteTestCompleted", "true");
      window.location.href = "index.html";
      return;
    }

    tasteProgress.textContent = "Step " + tasteStep + " of 4";
  });
}

// ======================================
// TMDB CONNECTION
// ======================================

const tokenInput = document.getElementById("tmdb-token");
const connectButton = document.getElementById("save-token");
const tmdbStatus = document.getElementById("tmdb-status");

if (tokenInput && connectButton && tmdbStatus) {
  connectButton.addEventListener("click", async function() {
    const token = tokenInput.value.trim();

    if (!token) {
      tmdbStatus.textContent = "Please enter your TMDB token.";
      return;
    }

    connectButton.disabled = true;
    tmdbStatus.textContent = "Connecting to TMDB...";

    try {
      const response = await fetch(
        "https://api.themoviedb.org/3/authentication",
        {
          headers: {
            Authorization: "Bearer " + token,
            accept: "application/json"
          }
        }
      );

      if (!response.ok) {
        throw new Error("Invalid token");
      }

      localStorage.setItem("tmdbToken", token);
      tokenInput.value = "";
      tmdbStatus.textContent = "Connected to TMDB successfully!";

      document.getElementById("tmdb-setup").hidden = true;

    } catch (error) {
      tmdbStatus.textContent =
        "Connection failed. Check your token.";
    } finally {
      connectButton.disabled = false;
    }
  });
}

const setupBox = document.getElementById("tmdb-setup");

if (setupBox && localStorage.getItem("tmdbToken")) {
  setupBox.hidden = true;
}

// ======================================
// MOVIE BATCHES
// ======================================

let movieBatch = 0;

const movieBatches = [
  [18785, 10625, 597, 11036, 138843, 546554, 155, 27205, 603, 157336],
  [1018, 13, 98, 862, 680, 807, 120, 550, 238, 496243],
  [2108, 508, 194, 585, 603692, 150540, 274, 78, 105, 424]
];

async function tmdbRequest(path) {
  const token = localStorage.getItem("tmdbToken");

  if (!token) {
    throw new Error("Connect to TMDB first.");
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
    throw new Error("TMDB request failed.");
  }

  return response.json();
}

async function loadTestMovie() {
  const container = document.getElementById("movie-options");
  const status = document.getElementById("movie-status");

  if (!container || !status) return;

  status.textContent = "Loading movies...";
  container.replaceChildren();

  try {
    const movies = await Promise.all(
      movieBatches[movieBatch].map(id =>
        tmdbRequest("/movie/" + id + "?language=en-US")
      )
    );

    movies.forEach(movie => {
      container.appendChild(createMovieCard(movie));
    });

    status.textContent = "Which of these have you watched?";

  } catch (error) {
    status.textContent = error.message;
    console.error(error);
  }
}

// ======================================
// SHOW ME 10 MORE
// ======================================

const moreMoviesButton = document.getElementById("more-movies");

if (moreMoviesButton) {
  moreMoviesButton.addEventListener("click", function() {
    movieBatch = (movieBatch + 1) % movieBatches.length;
    loadTestMovie();
  });
}

// ======================================
// PERSONALIZED FOLLOW-UP MOVIES
// ======================================

const personalizedButton = document.getElementById(
  "personalized-movies"
);

if (personalizedButton) {
  personalizedButton.addEventListener("click", async function() {
    const status = document.getElementById("movie-status");
    const container = document.getElementById("movie-options");

    const preferences = JSON.parse(
      localStorage.getItem("tastePreferences") || "{}"
    );

    const ratings = getRatings();

    const genreIds = {
      Comedy: 35,
      Romance: 10749,
      Drama: 18,
      Horror: 27,
      Thriller: 53,
      Mystery: 9648,
      Action: 28,
      "Sci-Fi": 878
    };

    const subgenreKeywords = {
      "Murder mystery": ["murder", "detective", "investigation"],
      "Detective stories": ["detective", "investigation"],
      "Crime investigation": ["crime", "investigation"],
      "Whodunits": ["murder", "mystery"],
      "Dark comedy": ["dark comedy", "satire"],
      "Romantic comedy": ["romance", "comedy"],
      "Slapstick": ["slapstick"],
      "Satire": ["satire"],
      "Supernatural horror": ["ghost", "supernatural", "haunting"],
      "Slasher": ["serial killer", "slasher"],
      "Psychological horror": ["psychological", "paranoia"],
      "Found footage": ["found footage"],
      "Psychological thriller": ["psychological", "suspense"],
      "Crime thriller": ["crime", "murder"],
      "Survival thriller": ["survival"],
      "Action thriller": ["action", "chase"],
      "Romantic drama": ["romance", "relationship"],
      "Period romance": ["period drama", "romance"],
      "Teen romance": ["teenager", "romance"],
      "Family drama": ["family", "relationship"],
      "Coming-of-age": ["coming of age", "teenager"],
      "Historical drama": ["history", "historical"],
      "Crime drama": ["crime", "gangster"],
      "Superheroes": ["superhero"],
      "Spy movies": ["spy", "espionage"],
      "Martial arts": ["martial arts"],
      "Adventure": ["adventure"],
      "Space exploration": ["space", "astronaut"],
      "Time travel": ["time travel"],
      "Dystopian": ["dystopia"],
      "Alien encounters": ["alien", "extraterrestrial"]
    };

    const likedGenres = Object.keys(preferences.genres || {})
      .filter(g => preferences.genres[g] === "like");

    const dislikedGenres = Object.keys(preferences.genres || {})
      .filter(g => preferences.genres[g] === "dislike");

    personalizedButton.disabled = true;
    status.textContent = "Finding movies based on your taste...";

    try {
      const candidates = [];

      for (let page = 1; page <= 4; page++) {
        const params = new URLSearchParams({
          language: "en-US",
          sort_by: "popularity.desc",
          "vote_count.gte": "200",
          include_adult: "false",
          page: String(page)
        });

        if (likedGenres.length) {
          params.set(
            "with_genres",
            likedGenres.map(g => genreIds[g])
              .filter(Boolean).join("|")
          );
        }

        const data = await tmdbRequest(
          "/discover/movie?" + params.toString()
        );

        candidates.push(...data.results);
      }

      const unique = new Set();

      const filtered = candidates.filter(movie => {
        if (unique.has(movie.id)) return false;
        unique.add(movie.id);

        return movie.poster_path &&
          ratings[movie.id] === undefined;
      });

      const details = await Promise.all(
        filtered.slice(0, 40).map(async movie => {
          try {
            return await tmdbRequest(
              "/movie/" + movie.id +
              "?append_to_response=keywords&language=en-US"
            );
          } catch {
            return null;
          }
        })
      );

      function scoreMovie(movie) {
        let score = (movie.vote_average || 0) * 1.5;

        const genres = (movie.genres || []).map(g => g.id);

        likedGenres.forEach(g => {
          if (genres.includes(genreIds[g])) score += 15;
        });

        dislikedGenres.forEach(g => {
          if (genres.includes(genreIds[g])) score -= 25;
        });

        const keywords = (movie.keywords?.keywords || [])
          .map(k => k.name.toLowerCase());

        Object.entries(preferences.subgenres || {})
          .forEach(([key, preference]) => {
            const name = key.split(":").slice(1).join(":");
            const words = subgenreKeywords[name] || [];

            const matches = words.some(word =>
              keywords.some(k => k.includes(word))
            );

            if (matches && preference === "like") score += 25;
            if (matches && preference === "dislike") score -= 35;
          });

        return score;
      }

      const selected = details
        .filter(Boolean)
        .map(movie => ({
          movie,
          score: scoreMovie(movie)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      if (!selected.length) {
        status.textContent = "No matching movies found.";
        return;
      }

      container.replaceChildren();

      selected.forEach(result => {
        container.appendChild(createMovieCard(result.movie));
      });

      status.textContent =
        "Five more movies to help us learn your taste.";

    } catch (error) {
      status.textContent =
        "Couldn't load movies. Please try again.";
      console.error(error);

    } finally {
      personalizedButton.disabled = false;
    }
  });
}

 ;personalizedButton;personalizedButton;personalizedButton;personalizedButton;personalizedButton;personalizedButton;personalizedButton;personalizedButton;personalizedButton;personalizedButton;personalizedButton;personalizedButton;

