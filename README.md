# Universe

> A living digital universe where people can visualize relationships, memories, support, dreams, and hope.

Universe is not a healthcare app, a patient-management system, or a dashboard. It's a quiet, beautiful place. **The person is always the center; the diagnosis never is.**

This repository is the **Phase 1** build — the smallest version that validates one assumption: _"Users feel less alone after using the platform."_

## What's here (Phase 1)

A user enters their own universe and can:

1. **Enter their universe** — a warm, full-screen 3D space (their own central celestial body).
2. **Add people they care about** — Mother, Partner, Friend… each becomes an orbiting celestial body.
3. **Explore relationships visually** — smooth zoom, pan, and a calm camera that drifts to focus on whoever you select.
4. **Store memories** — _Memory Stars_ that orbit the relationship they belong to.
5. **Leave messages of support** — _Messages of Light_ (text, image, or voice note) that float nearby as glowing capsules.

There are no charts, KPIs, or CRUD forms. The universe itself is the interface.

## Phase 2 — Messages of Light

Support is usually invisible: someone says _"I'm proud of you,"_ and it vanishes
into a chat thread. Phase 2 makes support a **permanent object in the universe**.

Each message becomes a glowing **Light** orbiting your star — never a chat bubble,
never a notification, never a red badge:

- **Light Note** (text) · **Voice Light** · **Memory Light** (photo + caption)
- **Future Light Capsule** — sealed until its moment: _when you feel scared_,
  _lonely_, _need motivation_, _on your birthday_, _when treatment is complete_,
  or _one year from now_.

How it feels:

- **Comet arrival** — a new light streaks in, slows, and settles into orbit.
- **Unread** lights pulse softly (no badges, ever).
- **Opening** a light is like opening a letter: the camera glides in, the universe
  blurs, and one message expands to fill your attention.
- **Reactions** are human, not metrics: _Thank you · This helped · Saved for later_.
- **"When you need it"** — name the moment you're in, and the light kept for exactly
  that moment unlocks and finds you.

Zoom out and the point lands without a single number: _look how much love surrounds you._

In this build, a Light is **inbound support you keep** — attributed to a person already
in your sky (`senderId`), addressed to you (`receiverId: "self"`). When auth + Firebase
land, real person-to-person sending drops into the same `Light` model unchanged. Phase 1
message capsules are migrated into this system automatically on first load.

## Tech

- **React + TypeScript + Vite**
- **Three.js + React Three Fiber + Drei** — the universe
- **Framer Motion** — gentle UI transitions
- **Zustand** — state
- **Local-first persistence** — everything saves to `localStorage` today (see below)

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

## Data & the Firebase path

The spec calls for Firebase. So the app doesn't block on backend setup, Phase 1
persists through a **swappable repository** ([`src/data/repository.ts`](src/data/repository.ts)):

- **Today:** `LocalRepository` saves the whole universe to `localStorage` — runs offline, zero config.
- **Later:** implement [`FirebaseRepository`](src/data/firebaseRepository.ts) (Firestore + Storage + Auth) and change one line. The UI depends only on the `UniverseRepository` interface, so nothing else changes.

Hand over your Firebase config whenever you're ready and the sync layer drops in.

## Project shape

```
src/
  types.ts                 Domain model (people, messages, memories)
  utils.ts                 Orbit math, ids, media helpers
  store/useUniverseStore   App state + persistence orchestration
  data/                    Repository interface + local & firebase adapters
  three/                   The universe: scene, central star, bodies,
                           orbit rings, memory satellites, light capsules,
                           floating particles, camera rig
  ui/                      Onboarding, add-person, person detail panel,
                           composers, voice recorder
```

## The product question

Every feature was measured against one rule:

> _"Does this make the user feel more connected, hopeful, or understood?"_

If the answer was no, it wasn't built.
