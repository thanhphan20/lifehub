# LifeHub Roadmap

A focused, realistic roadmap to evolve **LifeHub** into a personal life tracking system that matches real usage and avoids unnecessary complexity.

---

## 🎯 Vision

LifeHub is a **personal data hub** that helps you understand your body, productivity, and growth over time by combining **manual reflection** with **selective integrations**.

Principles:

- Manual-first, integrations where they _actually add value_
- Event-driven & analytics-ready
- Simple inputs → meaningful insights
- No duplicate tools (LifeHub summarizes, not replaces)

---

## 📊 Feature Scope (Final)

### 1. Health & Fitness

#### 1.1 Workouts (via Strava) ✅

- Sync workouts from Strava
- Distance, duration, calories, heart rate (if available)
- Activity types: run, ride, walk, etc.

**Integration**

- Strava Public API

**Core APIs**

```
GET /workouts
GET /workouts/stats?period=week
```

---

#### 1.2 Nutrition Tracking (via Nutritionix)

- Manual meal logging using natural language
- Calories & macro breakdown (protein, carbs, fat)
- Store calculated nutrition snapshot (not raw API dependency)

**Integration**

- Nutritionix API

**Core APIs**

```
POST /nutrition/meals
GET /nutrition/meals?date=YYYY-MM-DD
GET /nutrition/stats?period=week
```

---

#### 1.3 Mood Logging

- Daily mood rating (1–10)
- Optional mood tags (calm, stressed, focused)
- Lightweight notes

**Core APIs**

```
POST /mood/logs
GET /mood/stats?period=week
```

---

### 2. Productivity

#### 2.1 Daily To-Dos + Day Summary

- Simple daily checklist
- Mark done / skipped
- Auto-rollover unfinished tasks
- End-of-day summary (wins, blockers)

**Core APIs**

```
POST /daily-todos
POST /daily-summary
GET /daily?date=YYYY-MM-DD
```

---

#### 2.2 Habit Tracking

- Daily / weekly habits
- Streak tracking
- Visual consistency (chains)
- Manual-first logging with optional automation

**Habit Types**

- BOOLEAN (did or not)
- COUNT (number-based, e.g. problems solved)

**Core APIs**

```
POST /habits
POST /habits/:id/log
GET /habits/:id/streak
```

---

#### 2.3 Habit Integration: LeetCode

- Track LeetCode practice as a daily habit
- Auto-complete habit using LeetCode public GraphQL API (best-effort)
- Fallback to manual logging if sync fails
- Manual logs always override automation

**Integration**

- LeetCode GraphQL endpoint (read-only, public data)

**Tracked Signals**

- Daily submission activity
- Submission count per day

**Notes**

- No official API, integration is non-critical
- Feature-flagged and optional per user

---

#### 2.4 Notion Integration

- Pull tasks & notes from Notion
- Optional push of daily / weekly summaries
- Notion remains source of truth

**Integration**

- Notion API (read-first)

---

### 3. Learning & Growth

#### 3.1 Reading Log

- Track books: reading / completed / wishlist
- Manual progress tracking
- Notes & ratings

**Core APIs**

```
POST /reading/books
POST /reading/sessions
GET /reading/books?status=reading
```

---

#### 3.2 Skill & Self-Test Tracking

- Track skills being learned
- Self-assessed proficiency
- Practice sessions & notes

**Core APIs**

```
POST /learning/skills
PUT /learning/skills/:id/progress
POST /learning/self-tests
```

---

### 4. Personal & Reflection

#### 4.1 Daily Review

- What went well
- Challenges
- Tomorrow’s focus
- Weekly rollups

**Core APIs**

```
POST /reviews/daily
GET /reviews/weekly?week=YYYY-WW
```

---

#### 4.2 Life Events (Google Calendar – Read Only)

- Import major life events from Google Calendar
- Trips, anniversaries, milestones
- Enrich analytics (mood, productivity context)

**Integration**

- Google Calendar API (read-only)

---

## 🔗 Integrations Summary

### Active Integrations

- Strava (workouts)
- Nutritionix (nutrition)
- Notion (productivity)
- Google Calendar (life events)

### Explicitly Excluded (for now)

- Sleep tracking
- Health vitals / medical data
- Passive time tracking
- Social / community features

---

## 📈 Analytics (Phase Later)

- Weekly & monthly summaries
- Habit streaks
- Nutrition vs workout correlation
- Mood vs productivity trends

Analytics is **read-only** and built after sufficient data exists.

---

## 🚀 Implementation Phases

### Phase 1 – Core Health (Weeks 1–2)

1. Nutrition tracking (Nutritionix)
2. Mood logging
3. Workout stats aggregation

---

### Phase 2 – Productivity (Weeks 3–4)

1. Daily to-dos + summaries
2. Habit tracking
3. Notion sync (read-only)

---

### Phase 3 – Learning (Weeks 5–6)

1. Reading log
2. Skill & self-tests

---

### Phase 4 – Context & Insights (Weeks 7–8)

1. Google Calendar life events
2. Weekly / monthly reports
3. Basic dashboards

---

## 🧱 Architecture Notes

- API-first (REST)
- Prisma ORM
- Kafka for domain events
- Manual-first input strategy
- Integrations are _enhancements_, not dependencies

---

## 🎯 Guiding Rule

> If a feature does not help daily reflection or long-term insight, it does not belong in LifeHub.

---

Happy building 🚀
