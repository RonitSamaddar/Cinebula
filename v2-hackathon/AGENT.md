# AGENT.md

## Project

Cinebula - Intelligent Entertainment Discovery Platform

## Goal

Reduce decision fatigue and help users quickly decide what to watch through semantic, behavior-aware, and emotion-based content discovery.

Current focus:

* Phone-first application
* Future Smart TV integration
* Powered by content metadata and ACR-driven personalization

---

## Core Principles

1. Optimize for decision confidence, not endless exploration.
2. Users should reach a watch decision faster.
3. Recommendation spaces are dynamic and evolve based on user actions.
4. User actions create pivots, not filters.
5. Navigation should feel exploratory but remain low cognitive load.

---

## Recommendation Model

Content is represented as weighted semantic features.

Example:

* Sci-Fi
* Emotional Depth
* Spectacle
* Darkness
* Humor
* Action
* Cerebral Complexity
* Hopefulness

The system maintains a recommendation space and adjusts weights based on user interactions.

Example:

* "More Sci-Fi"
* "Less Dark"
* "More Emotional"
* "Scarlett Johansson"

These actions reshape the recommendation space instead of applying strict filters.

---

## User Flow

Search
→ Initial Recommendation Space
→ Explore Nearby Semantic Spaces
→ Pivot Based On Content / Actor / Genre / Language
→ Refined Recommendation Space
→ Watch Decision

---

## Backend Services

### API Gateway

Routes all client requests.

### User Profile Service

Stores:

* preferences
* likes/dislikes
* ACR-derived interests
* watch history

### Content Metadata Service

Stores:

* titles
* genres
* actors
* languages
* runtime
* semantic tags
* OTT availability

### Search Service

Handles:

* autocomplete
* fuzzy search
* actor search
* movie search
* semantic search

### Recommendation Service

Responsible for:

* candidate generation
* scoring
* ranking
* recommendation space generation
* semantic pivots

---

## Recommendation Space

A recommendation space contains:

* current recommendations
* nearby semantic directions
* 1-level and 2-level prefetched exploration paths

Movement within prefetched space should not require API calls.

New pivots require backend requests.

Examples:

* actor selection
* language selection
* movie selection
* semantic refinement

---

## Search Strategy

For current scale (~1500-3000 titles):

* Fuzzy Search
* Prefix Matching
* Metadata Search

No Elasticsearch required for MVP.

---

## Data Sources

Potential inputs:

* TMDB metadata
* IMDb metadata
* ACR viewing behavior
* User preferences

---

## Authentication

Phone-based authentication.

Recommended:

* JWT session tokens
* QR pairing for future TV integration

Only paired devices may control a TV session.

---

## Future TV Integration

Architecture:

Phone
→ API Gateway
→ Recommendation Engine
→ TV Renderer

Phone acts as:

* search interface
* refinement interface
* personalization layer

TV acts as:

* immersive discovery surface
* recommendation display
* playback launcher

---

## Success Metric

Primary KPI:

Time-to-Decision

Measure how quickly a user reaches a title they are willing to watch.

Secondary KPIs:

* Recommendation acceptance rate
* Search-to-watch conversion
* Exploration depth
* Session completion rate
