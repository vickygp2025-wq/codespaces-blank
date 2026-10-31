# MANDATORY on Day 3 (JavaScript)

1. LIVE SEARCH in Library (like YouTube):
   - Type in the search box and the lists show only matching titles.
   - Works on all 4 lists: Watchlist, Watched, Favorites, Shame List.
   - Search box id: "search". Lists ids: list-watchlist,
     list-watched, list-favorites, list-shame.

2. Movie + "Under 30 min" cannot be chosen together.
3. Show the "Tonight's picks" cards only after pressing the button.
4. "Other" service: show the text box only when "Other" is ticked.
5. Check that the country is chosen.
6. ROULETTE must never pick a title that is in Watched or Rejected.

# WHAT NOW? — JavaScript plan

## How the app works (the "funnel")
Each answer removes titles, until a short list is left:
1. Type: Movie / TV / "I dont care" -> removes the other type.
2. Mood -> keeps only the matching genres (Funny = Comedy, etc.).
3. Time -> removes anything longer than the chosen time.
   (TV uses the episode length.)
4. Services -> keeps only titles on the chosen services.
5. Country -> keeps only titles available in that country.
6. Take the top 10 / 50 / 100 that match.
7. Rank them using the user's own taste (ratings and favorites).
8. Show 3 results: The Safe Bet, The Wildcard, The Hidden Gem.

All titles come from TMDB. Never invent titles, posters, ratings or services.

## MANDATORY
- [ ] 1. LIVE SEARCH in Library (like YouTube).
      Type in the search box and the lists show only matching titles.
      Works on all 4 lists: Watchlist, Watched, Favorites, Shame List.
      Ids: search, list-watchlist, list-watched, list-favorites, list-shame.
- [ ] 2. Movie + "Under 30 min" cannot be chosen together.
      (TV Show + 30 min is OK, because an episode is about 30 min.)
- [ ] 3. "Tonight's picks" (id="results") is hidden until the button is pressed.
- [ ] 4. "Other" service: show the text box only when "Other" is ticked.
      "Other" is only information, it cannot filter results.
- [ ] 5. Country must be chosen before searching.
- [ ] 6. ROULETTE never picks a title that is in Watched or Rejected.
- [ ] 7. Taste test (new feature, not in the original app):
      the first time someone opens the site, show famous titles and let
      them mark "I saw it" / "I liked it". Save it in the browser and
      use it to rank recommendations. If they skip it, still work.

## Buttons
- Roulette: SPIN = random pick. Accept = tonight's choice.
  Reroll = spin again. Save = Watchlist. Reject = never show again.
  Watched = move to Watched (it also counts in Movie DNA).
- Library: add/remove, favorite, rate 1 to 10, search, filter by type, sort.
- Movie DNA: counts from Watched. Shows total, movies, TV, hours,
  average rating, top genres, favorite decades, top-rated titles.

## Data and saving
- Everything personal is saved in the browser (localStorage).
- No accounts, no server, no payment.
- TMDB token: free "API Read Access Token". Make the TMDB account WITH
  a parent's permission. Never put the token in a file we upload.
  The user pastes it in a setup box, and it is saved only in the browser.
- Show the TMDB notice in the footer (already there).

## Be honest in the app
- If a poster, trailer or service is missing, say "unavailable".
- Streaming data from TMDB is not always complete. Say so.

## Order we build it
1. script.js file + connect it to the pages
2. Show/hide results, Movie vs 30 min rule, Other box, country check
3. Save and load lists (localStorage)
4. Library: lists and live search
5. TMDB token setup box + first real search
6. The funnel + 3 results
7. Roulette
8. Movie DNA
9. Taste test
10. Polish and check on a phone

## Removed on purpose
- Discover page (Hidden Gems, Plot Twist Mode, Watch Together).
  It can be added back later if we want.