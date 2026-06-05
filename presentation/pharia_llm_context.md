# PHARIA — Full Project Context for LLM Continuation

> **How to use this document:** Paste this entire file into any LLM (ChatGPT, Gemini, Claude, internal company model, etc.) at the start of a new conversation. It contains all decisions, reasoning, constraints, and current state needed to continue working on this project without re-explaining anything. Tell the LLM: *"This is the full context for a project I'm working on. Read it, then help me with [your task]."*

---

## 0. TL;DR (read this first)

**Pharia** is a phone-native TV-content discovery product paired with a TV-side experience, being built for an **internal hackathon at LG Ads Solutions (Alphonso Inc).** The core insight: people fail to find something to watch not because recommendation algorithms are bad, but because they're forced to *decide at the worst possible moment* — 8 PM, tired, on the couch. Pharia moves discovery to downtime (commute, breaks) on the phone, and the TV "already knows" what to play in the evening. The unique, defensible asset is **ACR data** (Automatic Content Recognition, built into every LG TV) which sees what users watch across *every* app and input — something no single streaming service can replicate.

**Current phase:** Idea submitted. Build window is **June 3–5**. Building as a **team of 4**.

**Recommended UX:** Combo of a "Daily Card" front door + a spatial "mood galaxy" explorer beneath it.

---

## 1. The company & constraints

- **Employer:** LG Ads Solutions (Alphonso Inc), a TV-data company, majority-owned by LG Electronics.
- **What the company does:** Captures ACR (Automatic Content Recognition) viewership data — fingerprints what's on the TV screen for live TV and HDMI/OTT content. **Cannot** capture inside standard streaming apps like Netflix directly (only what ACR detects on-screen / via HDMI). Uses this data to segment audiences and serve targeted TV ads / run ad campaigns.
- **The hackathon:** Internal. One of the listed build scopes is "gamifying the home screen" — making people spend more time on the TV home screen / webOS.
- **Strategic implication:** The judges are LG/Alphonso people. They care about *business* outcomes (dwell time, ad inventory, first-party data, differentiation vs. Samsung/Google TV), not UX awards. Pitch in their language.
- **Important:** Using real ACR/viewership data in a prototype may require sponsor/manager clearance. The current plan leans toward FAKING the data for the demo to avoid permissions issues and keep the demo narrative fully controllable.

---

## 2. The problem (the "why")

- It's 8 PM. User sits down, reaches for the remote, scrolls 20+ minutes, settles for something already seen.
- This is NOT primarily a recommendation-algorithm problem — Netflix's algorithm is among the best commercial recommenders ever built.
- It's a **timing problem**: the couch at 8 PM is peak decision fatigue, the worst cognitive moment to choose. And a **silo problem**: every app only knows its own catalog. And a **UX problem**: the grid hasn't changed in 15 years and feels like a spreadsheet.
- The webOS home screen is currently a *launcher* (a doorway to apps), not a *destination*. Users bounce into Netflix in seconds.

## 3. The solution & positioning

- **Two surfaces, one continuous taste profile.**
  - **Phone, during downtime** (commute, lunch, before bed): a mood-driven content explorer that feels like *unwinding, not researching*. 3–7 min session. Browse, queue, leave.
  - **TV, in the evening**: the home screen surfaces the queue. "Tonight: [Show]" with a play button. One click, watching.
- **Refined positioning (important nuance):** This is NOT a leisure feed competing with TikTok for attention. The user *already has the intent* to find something to watch. The mood galaxy, ambient feedback, and gamification exist to make a goal-directed task *pleasant*, not to maximize engagement. A session that ends with the user queuing 2-3 things and closing the app is a SUCCESS, not a churn.
- **The session has a natural end.** Anti-engagement-farming is a deliberate brand stance: NO streaks, NO daily-login rewards, NO leaderboards. Gamification = "your personal mood map fills in over time" (self-knowledge as reward).

## 4. The USP — three defensible layers

1. **ACR is the moat.** ~200M LG TVs globally, each fingerprinting on-screen content regardless of source (Netflix, Prime, HBO, console via HDMI, antenna, etc.). Netflix knows only Netflix; Pharia knows *everything*. No streaming service can replicate — the cross-app data simply isn't theirs to access.
2. **The async-timing model is unowned.** Every competitor optimizes the 8 PM couch moment. Moving discovery to downtime has no incumbent.
3. **webOS layer, not app layer.** Pharia is the TV home screen, not another app. Users get value before launching Netflix. Competitors can copy a UI; they cannot copy the surface or the data.

## 5. The five core features

1. **The mood galaxy** — pannable spatial UI on phone; shows as floating points; color + ambient sound shift with the mood region.
2. **ACR-aware recommendations** — informed by actual cross-app viewing, not one app's slice.
3. **Phone-to-TV handoff** — queue on phone → materializes as featured tile on TV home screen.
4. **Personal mood map** — taste fills in visually over time; light, non-addictive gamification.
5. **Ambient environment** — color/audio shift with mood; the signature differentiator that makes browsing feel like winding down.

## 6. Business case (ROI for LG)

No new business model needed — amplifies an asset LG already owns:
- **Dwell time** on home screen ↑ → more ad inventory exposure.
- **New first-party data** (mood preferences, exploration patterns, queue/skip behavior) → entirely new ad-targeting axes, premium CPMs.
- **Reduced app-launch bounce** → more value captured at the OS layer.
- **Differentiation** vs. Samsung Tizen & Google TV (both compete on app catalog + panel quality only).

## 7. Brand name

- **Chosen working name: Pharia.** From "Pharos" (the ancient lighthouse) + "-ia" place suffix → "realm of guided light." Positions the product as a *destination* (a place you visit) rather than a *tool*. Unclaimed in streaming, distinctive.
- **Alternatives on file (for future reference):** Drift (strong verb form), Cinebula (cinema+nebula, most distinctive), Glean (real word, "gather subtly," best natural verb form), Nebulens, Cinetheca, Cinegrove, Reelhaven, Foralume, Pharolens, Scout, Forage, Orbit, Mira, Lyra, Lantern, Lull.
- **Naming insight learned:** Names with a verb form ("I'm drifting," "I gleaned tonight's pick") have longer marketing legs. Pure proper nouns (Pharia, Cinebula) don't verb naturally — Pharia compensates by being a *place*.

## 8. UX directions explored (7 + 3 combos)

1. **Spatial Galaxy** — pannable 2D mood-map. Both surfaces. Distinctive but cognitively heavy; doesn't serve tired users.
2. **Endless Feed** — TikTok-style vertical full-screen auto-playing cards. Mobile only. Great signal/familiarity but reinforces the addiction pattern the brand rejects.
3. **Daily Card** — one perfect pick/day, 3 actions, 3 skips max. Both surfaces. Solves decision fatigue maximally; cheap to build; doesn't serve explorers.
4. **Tarot Pull** — daily 5-card spread with position roles (Mood/Stretch/Familiar/Together/Wild). Both surfaces. Ritual-driven; risks twee; limited surface area.
5. **Mood Radio** — pick a mood, get a continuous channel; TV just plays. TV-primary. Solves "just play something"; blocked by streaming-app fragmentation (works best with FAST/LG Channels content).
6. **Conversational** — chat/voice with Pharia. Mobile-primary, TV via voice. Plays to post-LLM expectations; unproven for leisure discovery; TV voice unreliable.
7. **The Map** — illustrated cartographic UI with named neighborhoods. Both surfaces. Most distinctive, aligns with "Pharia is a place"; most expensive to produce; risks looking like a game.

**Combinations:**
- **Combo 01 — Galaxy + Daily Card** (RECOMMENDED): Daily Card is the front door for tired users + the demo hook; swipe up reveals the Galaxy for explorers. Most feasible. Both feed one taste graph + one TV surface.
- **Combo 02 — Map + Mood Radio**: map as identity, tap a region → mood-radio channel. Most distinctive in market.
- **Combo 03 — Galaxy + Tarot**: galaxy main UI + daily "Tonight's Spread" 5-card pull. Most poetic, closest to current brand stance.

**Current recommendation: Combo 01 (Galaxy + Daily Card).**

## 9. Hackathon build plan

- **Timeline:** Idea submitted. **Code window June 3–5.** ~2.5 weeks of prep runway before that.
- **Demo scope discipline:** Build phone-real (runs on an actual phone), mock the TV handoff (styled screen / second device / screen recording). Do NOT build both surfaces fully — too much scope.
- **Real vs. faked for the demo:**
  - REAL: phone galaxy UI, queue interaction, mood navigation, daily card.
  - FAKED: ACR data (hardcoded viewing-history JSON), recommendation results (scripted or LLM-generated to look smart), TV handoff (mock).
- **The magic moment:** "Queue on phone during the day → sit down at night → TV already knows." Design the demo backward from this beat.
- **Always record a backup demo video by end of Day 2** — live demos fail; the video makes you immune.

## 10. Team-of-4 division of labor

Split by *layer/surface*, not by feature (feature-splitting causes collisions):
- **Person 1 — Phone UI (galaxy + daily card):** the star of the demo, highest polish, strongest frontend dev.
- **Person 2 — TV surface + handoff:** owns the magic moment; phone→TV sync must actually work.
- **Person 3 — Data + recommendation logic:** fake ACR history, show metadata, mood mappings, LLM/scripted recs. Mostly independent slice.
- **Person 4 — Integration/deploy/glue/demo prep:** owns repo, deploy pipeline, stitching, backup video, rehearsal. The "closer." **Integration must be someone's primary job** or the hackathon dies in merge hell.

**Critical safeguards for AI-assisted team build:**
1. Define interfaces FIRST (data model, what phone passes to TV, component boundaries) so 4 people + AI generate compatible code.
2. Integrate continuously (merge to main daily), not at the end.

## 11. Recommended tech stack & AI workflow

- **Framework:** Next.js + Tailwind CSS (deploys trivially to Vercel; existing HTML prototypes port over cleanly).
- **Build tool:** **Claude Code** on a shared **GitHub** repo (branch per person, PR merges reviewed by Person 4). Multi-file, version-controlled — far better than copy-pasting chat outputs.
- **Deploy:** Vercel (auto-deploy from repo, live URL everyone can see).
- **Design source of truth:** either Figma OR the existing HTML prototypes (the HTML is arguably better since it's already real code).
- **Recommendation logic in demo:** an LLM API can BE the recommender — feed it fake viewing history + a mood, get picks + reasons. Fast way to look intelligent without an ML pipeline.
- **Planning/spec/debugging:** an LLM (this context doc enables any of them).
- **Lean stack principle:** HTML prototypes as design → build-spec doc → Claude Code on GitHub → Vercel. Don't add tools without a specific need.

## 12. Artifacts already produced

1. **Pitch deck** (`drift_pitch.html`) — 7-section animated pitch site. Interactive phone galaxy mockup: 25 shows across 5 mood regions (cozy center, cerebral N, nostalgic E, escape S, intense W), drag-pan, hover-detail popup, compass navigation, live brand-name switcher.
2. **UX exploration** (`pharia_ux_exploration.html`) — all 7 UX directions with distinct animated mockups, suitability (mobile/TV) indicators, strengths/weaknesses/best-for, the 3 combinations, and a decision framework.
3. **Context docs** (this file + an earlier `pharia_context.md`).

Mood regions used throughout: **Cozy/Reflective (center, violet), Cerebral (north, blue), Nostalgic (east, amber), Escape (south, teal), Intense (west, red).** Example shows by region — Cozy: Past Lives, Normal People, Fleabag, Aftersun, Lady Bird. Cerebral: Severance, Westworld, Dark, Mr. Robot, Devs. Nostalgic: Stranger Things, Mad Men, That '70s Show, Bridgerton, Freaks and Geeks. Escape: Schitt's Creek, Ted Lasso, The White Lotus, Emily in Paris, Loot. Intense: Succession, Breaking Bad, The Wire, The Bear, Better Call Saul.

## 13. Open decisions / next steps

1. **Lock the UX direction** (Combo 01 recommended) — must be settled before June 3.
2. **Write the build spec** (component tree, data model, real-vs-faked, interface contracts between the 4 slices). Highest-leverage artifact for parallel team work.
3. **Write the 90-second demo script** (beat-by-beat performance plan; forces all decisions closed).
4. **Set up repo + deploy skeleton before June 3** so the window is feature work, not setup.
5. **Decide brand name finally** (Pharia is working pick).
6. **Resolve ACR-data permission question** with sponsor/manager (or fake the data).
7. **Mock the magic-remote input model** if/when the TV side is real.

## 14. Design language reference (for visual consistency)

- **Fonts:** Instrument Serif (display, with italic for emphasis), Geist (body), JetBrains Mono (labels/eyebrows).
- **Palette:** very dark base (#07070c), warm off-white ink (#f4ebd9), mood accents as above. Atmospheric/cosmic, glassmorphism on popups, subtle film grain, ambient glows, generous negative space. Editorial, A24-adjacent sophistication — NOT generic SaaS.
- **Tone:** confident, specific, evenhanded. Anti-hype.

---

*End of context. Ask the user what they want to work on next.*
