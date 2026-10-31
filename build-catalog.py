
import json
import os
import time
import urllib.parse
import urllib.request

# WHAT NOW? — AUTOMATIC MOVIE CATALOG

TOKEN = os.environ.get("TMDB_TOKEN", "")

if not TOKEN:
    raise SystemExit(
        "TMDB_TOKEN is missing. Set it before running."
    )

movies = {}

def request_tmdb(path):
    url = "https://api.themoviedb.org/3" + path

    request = urllib.request.Request(
        url,
        headers={
            "Authorization": "Bearer " + TOKEN,
            "accept": "application/json"
        }
    )

    with urllib.request.urlopen(
        request, timeout=20
    ) as response:
        return json.load(response)

# Retrieve popular movies automatically
for page in range(1, 101):

    params = urllib.parse.urlencode({
        "language": "en-US",
        "page": page
    })

    data = request_tmdb(
        "/movie/popular?" + params
    )

    for movie in data.get("results", []):
        if movie.get("id") and movie.get("title"):
            movies[movie["id"]] = {
                "id": movie["id"],
                "title": movie["title"],
                "original_title": movie.get(
                    "original_title", ""
                ),
                "popularity": movie.get(
                    "popularity", 0
                )
            }

    print(f"Loaded page {page}")
    time.sleep(0.15)

with open(
    "movie-catalog.json",
    "w",
    encoding="utf-8"
) as file:
    json.dump(
        list(movies.values()),
        file,
        ensure_ascii=False
    )

print(f"Saved {len(movies)} movies.")






