
/* ==========================================
   WHAT NOW? — YOUR ROULETTE
   Automatic Search + Fair Spin + Confetti
   ========================================== */

const customForm = document.getElementById("custom-movie-form");
const customInput = document.getElementById("custom-movie-input");
const customList = document.getElementById("custom-movie-list");
const customCount = document.getElementById("custom-movie-count");
const customCanvas = document.getElementById("custom-wheel");
const customSpin = document.getElementById("custom-spin");
const customWinner = document.getElementById("custom-winner");

const customContext = customCanvas.getContext("2d");

let customMovies = [];
let customRotation = 0;
let customSpinning = false;
let customAdding = false;

const customColors = [
  "#8B5CF6", "#49347B", "#A78BFA", "#63469B",
  "#7554B5", "#382451", "#9D79E5", "#57407A"
];

// ==========================================
// TMDB CONNECTION
// ==========================================

async function customTMDB(path) {

  const token = localStorage.getItem("tmdbToken");

  if (!token) {
    throw new Error(
      "TMDB isn't connected. Open the Taste Test setup first."
    );
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
    throw new Error("TMDB search failed. Try again.");
  }

  return response.json();
}

// ==========================================
// RECOGNIZE MOVIE TITLES
// ==========================================

function customNormalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function customDistance(a, b) {

  const previous = Array.from(
    { length: b.length + 1 },
    (_, i) => i
  );

  for (let i = 1; i <= a.length; i++) {

    let diagonal = previous[0];
    previous[0] = i;

    for (let j = 1; j <= b.length; j++) {

      const old = previous[j];

      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1)
      );

      diagonal = old;
    }
  }

  return previous[b.length];
}

function customSimilarity(a, b) {

  a = customNormalize(a);
  b = customNormalize(b);

  if (!a || !b) return 0;
  if (a === b) return 1;

  if (b.startsWith(a + " ")) return 0.92;

  return 1 -
    customDistance(a, b) / Math.max(a.length, b.length);
}

// Prefer the first installment if the query is a franchise
function customSequelPenalty(movie, query) {

  const title = customNormalize(movie.title);
  const search = customNormalize(query);

  if (title === search) return 0;

  if (
    /\b(2|3|4|5|ii|iii|iv|part 2|part 3)\b/.test(title) &&
    !/\b(2|3|4|5|ii|iii|iv|part 2|part 3)\b/.test(search)
  ) {
    return 0.18;
  }

  return 0;
}


/* SMART MOVIE RECOGNITION */

async function customFindMovie(query) {

  const original = customNormalize(query);

  if (!original) {
    throw new Error("Please enter a movie title.");
  }

  // Common misspellings and franchise names
  const knownTitles = {
    "mena girls": "Mean Girls",
    "mena girlks": "Mean Girls",
    "mean girl": "Mean Girls",
    "hary potter": "Harry Potter and the Philosopher's Stone",
    "hary potte": "Harry Potter and the Philosopher's Stone",
    "harry potter": "Harry Potter and the Philosopher's Stone",
    "tittanic": "Titanic",
    "titanik": "Titanic",
    "avngers endgame": "Avengers: Endgame",
    "spidr man": "Spider-Man",
    "shreck": "Shrek",
    "cruella de vil": "Cruella",
    "cruela de vil": "Cruella",
    "cruella devil": "Cruella",
    "cruella": "Cruella",
  };

  // First try the title the user entered
  const queries = [query];

  // If we recognize a common spelling mistake,
  // search the corrected title as well.
  if (knownTitles[original]) {
    queries.unshift(knownTitles[original]);
  }

  // Try progressively shorter searches.
  // This helps with some longer movie titles.
  const words = original.split(" ");

  if (words.length > 2) {
    queries.push(words.slice(0, 2).join(" "));
  }

  const candidates = new Map();

  // Search TMDB using each variation
  for (const search of [...new Set(queries)]) {

    const params = new URLSearchParams({
      query: search,
      language: "en-US",
      include_adult: "false"
    });

    const data = await customTMDB(
      "/search/movie?" + params.toString()
    );

    (data.results || []).forEach(movie => {

      if (movie.title && movie.id) {
        candidates.set(movie.id, movie);
      }
    });
  }

  if (!candidates.size) {
    throw new Error(
      "I couldn't find that movie. Try another spelling."
    );
  }

  // Use the corrected title for comparison
  const target = knownTitles[original] || query;

  const ranked = [...candidates.values()]
    .map(movie => {

      const similarity = Math.max(
        customSimilarity(target, movie.title),
        customSimilarity(
          target,
          movie.original_title || ""
        )
      );

      const popularityBonus = Math.min(
        Math.log10((movie.popularity || 0) + 1) * 0.035,
        0.10
      );

      const sequelPenalty =
        customSequelPenalty(movie, target);

      return {
        movie,
        score:
          similarity +
          popularityBonus -
          sequelPenalty
      };
    })
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];

  // Avoid adding an unrelated movie
  if (!best || best.score < 0.38) {
    throw new Error(
      "I couldn't recognize that movie. Try another spelling."
    );
  }

  return best.movie;
}

// ==========================================
// ADD MOVIES AUTOMATICALLY
// ==========================================

customForm.addEventListener("submit", async function(event) {

  event.preventDefault();

  if (customSpinning || customAdding) return;

  const query = customInput.value.trim();
  if (!query) return;

  customAdding = true;
  customWinner.textContent = "Recognizing your movie...";

  const addButton = customForm.querySelector(
    'button[type="submit"]'
  );

  if (addButton) addButton.disabled = true;

  try {

    const movie = await customFindMovie(query);

    if (customMovies.some(item => item.id === movie.id)) {
      customWinner.textContent =
        "That movie is already on the wheel.";
      return;
    }

    customMovies.push({
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path,
      release_date: movie.release_date || "",
      vote_average: movie.vote_average || 0,
      overview: movie.overview || ""
    });

    customInput.value = "";

    customWinner.textContent =
      "Added: " + movie.title + "!";

    updateCustomMovies();

  } catch (error) {

    customWinner.textContent = error.message;

  } finally {

    customAdding = false;

    
if (addButton) addButton.disabled = false;

updateCustomMovies();

  }
});

// ==========================================
// MOVIE LIST
// ==========================================

function updateCustomMovies() {

  customList.replaceChildren();

  customMovies.forEach((movie, index) => {

    const item = document.createElement("li");

    const name = document.createElement("span");
    name.textContent = movie.title;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "✕";

    remove.disabled = customSpinning;

    remove.addEventListener("click", function() {

      if (customSpinning) return;

      customMovies.splice(index, 1);

      customWinner.textContent =
        "Movie removed.";

      updateCustomMovies();
    });

    item.appendChild(name);
    item.appendChild(remove);
    customList.appendChild(item);
  });

  customCount.textContent =
    customMovies.length + " movies added";

  customSpin.disabled =
    customSpinning || customAdding ||
    customMovies.length < 2;

  drawCustomWheel();
}

// ==========================================
// DRAW WHEEL
// ==========================================

function drawCustomWheel() {

  const size = customCanvas.width;
  const center = size / 2;
  const radius = center - 12;

  customContext.clearRect(0, 0, size, size);

  if (!customMovies.length) {

    customContext.beginPath();
    customContext.arc(
      center, center, radius, 0, Math.PI * 2
    );

    customContext.fillStyle = "#292637";
    customContext.fill();

    customContext.fillStyle = "white";
    customContext.font = "bold 80px Arial";
    customContext.textAlign = "center";
    customContext.textBaseline = "middle";
    customContext.fillText("?", center, center);

    return;
  }

  const slice = Math.PI * 2 / customMovies.length;

  customMovies.forEach((movie, index) => {

    const start = -Math.PI / 2 + index * slice;
    const end = start + slice;

    customContext.beginPath();
    customContext.moveTo(center, center);
    customContext.arc(
      center, center, radius, start, end
    );
    customContext.closePath();

    customContext.fillStyle =
      customColors[index % customColors.length];

    customContext.fill();

    customContext.strokeStyle = "#181822";
    customContext.lineWidth = 3;
    customContext.stroke();

    const middle = start + slice / 2;
    const textRadius = radius * 0.66;

    const x = center + Math.cos(middle) * textRadius;
    const y = center + Math.sin(middle) * textRadius;

    const shortTitle = movie.title.length > 15
      ? movie.title.slice(0, 13) + "..."
      : movie.title;

    customContext.save();
    customContext.translate(x, y);

    customContext.fillStyle = "white";
    customContext.font = "bold 21px Arial";
    customContext.textAlign = "center";
    customContext.textBaseline = "middle";
    customContext.shadowColor = "#181822";
    customContext.shadowBlur = 5;

    customContext.fillText(
      shortTitle, 0, 0, radius * 0.65
    );

    customContext.restore();
  });

  customContext.beginPath();
  customContext.arc(
    center, center, radius, 0, Math.PI * 2
  );

  customContext.strokeStyle = "#C4B5FD";
  customContext.lineWidth = 10;
  customContext.stroke();

  customContext.beginPath();
  customContext.arc(
    center, center, 45, 0, Math.PI * 2
  );

  customContext.fillStyle = "#171420";
  customContext.fill();

  customContext.strokeStyle = "#D4C6F7";
  customContext.lineWidth = 5;
  customContext.stroke();

  customContext.fillStyle = "white";
  customContext.font = "bold 38px Arial";
  customContext.textAlign = "center";
  customContext.textBaseline = "middle";
  customContext.fillText("?", center, center);
}

// ==========================================
// WINNER POPUP
// ==========================================

const customPopup = document.createElement("div");
customPopup.className = "custom-popup";
customPopup.hidden = true;
document.body.appendChild(customPopup);

function closeCustomPopup() {
  customPopup.hidden = true;
  customPopup.replaceChildren();
}

function showCustomWinner(movie) {

  customPopup.replaceChildren();

  const card = document.createElement("article");
  card.className = "custom-popup-card";

  const close = document.createElement("button");
  close.type = "button";
  close.className = "custom-popup-close";
  close.textContent = "✕";
  close.setAttribute("aria-label", "Close movie details");
  close.addEventListener("click", closeCustomPopup);

  const heading = document.createElement("h3");
  heading.textContent = "🎉 HURRAY!!! 🎉";

  const poster = document.createElement("img");

  if (movie.poster_path) {
    poster.src =
      "https://image.tmdb.org/t/p/w342" +
      movie.poster_path;
  }

  poster.alt = movie.title + " poster";

  const title = document.createElement("h4");
  title.textContent = movie.title;

  const metadata = document.createElement("p");
  metadata.textContent =
    (movie.release_date || "").slice(0, 4) +
    "  ·  ★ " +
    Number(movie.vote_average).toFixed(1) + "/10";

  const description = document.createElement("p");
  description.textContent =
    movie.overview || "Description unavailable.";

  card.appendChild(close);
  card.appendChild(heading);

  if (movie.poster_path) {
    card.appendChild(poster);
  }

  card.appendChild(title);
  card.appendChild(metadata);
  card.appendChild(description);

  customPopup.appendChild(card);
  customPopup.hidden = false;
}

customPopup.addEventListener("click", function(event) {
  if (event.target === customPopup) {
    closeCustomPopup();
  }
});

document.addEventListener("keydown", function(event) {
  if (event.key === "Escape") {
    closeCustomPopup();
  }
});

// ==========================================
// FAIR SPIN
// ==========================================

customSpin.addEventListener("click", function() {

  if (customSpinning || customMovies.length < 2) return;

  customSpinning = true;
  customSpin.disabled = true;

  closeCustomPopup();
  customWinner.textContent = "Spinning...";

  const winnerIndex = Math.floor(
    Math.random() * customMovies.length
  );

  const sliceDegrees = 360 / customMovies.length;

  // First slice starts at -90 degrees.
  // Its center is half a slice clockwise.
  const desiredAngle =
    360 - (winnerIndex + 0.5) * sliceDegrees;

  const currentAngle =
    ((customRotation % 360) + 360) % 360;

  const adjustment =
    ((desiredAngle - currentAngle) % 360 + 360) % 360;

  customRotation += 1800 + adjustment;

  customCanvas.style.transition =
    "transform 4s cubic-bezier(0.12, 0.7, 0.15, 1)";

  customCanvas.style.transform =
    "rotate(" + customRotation + "deg)";

  setTimeout(function() {

    customSpinning = false;

    const movie = customMovies[winnerIndex];

    customWinner.textContent =
      "🎉 HURRAY!!! THE WINNER IS... " +
      movie.title + "!";

    showCustomWinner(movie);
    launchConfetti();

    updateCustomMovies();

  }, 4000);
});

// ==========================================
// ANIMATED CONFETTI
// ==========================================

function launchConfetti() {

  const colors = [
    "#A78BFA", "#FBBF24", "#F472B6",
    "#34D399", "#60A5FA", "#FFFFFF"
  ];

  for (let i = 0; i < 150; i++) {

    const piece = document.createElement("div");
    piece.className = "confetti-piece";

    piece.style.position = "fixed";
    piece.style.top = "-25px";
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.width = "10px";
    piece.style.height = "16px";

    piece.style.backgroundColor =
      colors[Math.floor(Math.random() * colors.length)];

    piece.style.pointerEvents = "none";
    piece.style.zIndex = "9999";

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
      Math.random() * 0.8 + "s";

    document.body.appendChild(piece);

    piece.addEventListener(
      "animationend",
      () => piece.remove(),
      { once: true }
    );
  }
}

// START

updateCustomMovies();

