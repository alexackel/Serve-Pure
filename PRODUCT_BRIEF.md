# Volunteer Platform — Product Brief

**Working name:** "Volunteer" (temporary, until branding is finalized)

## Core Concept

Make volunteering as easy to discover and participate in as a fitness activity (Strava-style UX: activity feeds, personal stats, map discovery), while making the resulting volunteer record as trustworthy as an official record.

Primary audience: high school and college students who need volunteer hours for scholarships, applications, or personal goals.

Target platform: React Native + Expo — one codebase for iOS, Android, and web.

Visual identity: white/blue, clean, modern, rounded cards, generous whitespace. Green = verified. Yellow = self-reported/pending. Red = warnings/errors only.

## User Roles

One account system; UI adapts per role.

- **Volunteer** — finds/registers for events, tracks hours, self-reports outside experiences, joins/creates groups, adds friends, appeals no-shows.
- **Organization/Organizer** — creates events, manages volunteers, confirms attendance, verifies self-reported hours. Does NOT need to be a registered nonprofit.
- **Group Administrator** — creates/manages groups, audits member hours, approves/rejects self-reported submissions.
- **Guardian** — not a full platform user. For volunteers under 18, guardian contact info is collected and guardians receive event notifications.
- **App Administrator** — resolves escalated appeals, platform moderation, safety intervention.

## The Five Core States (volunteer lifecycle)

1. **Available** — event is published and open for registration
2. **Registered** — volunteer has signed up (auto-confirmed if registration is within 48 hours of the event)
3. **Completed / Pending Verification** — event has happened; awaiting organization confirmation
4. **Verified** (or **Partial** / **No-show**) — organization has confirmed attendance:
   - Attended → full hours verified, positive reliability impact
   - Partial → actual hours entered, no reliability penalty
   - No-show → negative reliability impact, appealable
5. **Appealed** (if applicable) — volunteer disputes a no-show; escalates from organization review to app-admin review if rejected

Additional states: Cancelled (24+ hrs before = no penalty; within 24 hrs = penalty applied; org-initiated = never a penalty).

## Navigation (mobile, persistent bottom nav)

**Home | Find | Map | Groups | You**

No separate Create tab — Create lives behind a "+" button inside Find (Volunteer Event or Add Volunteer Experience).

- **Home** — personal impact stats, reliability score (private, never shown in feed), friends activity feed with kudos
- **Find** — search/filter/sort events, event cards, "+" create button
- **Map** — event markers (not org markers), list/map toggle
- **Groups** — group profile, leaderboard, member stats, self-reported hours audit (admins)
- **You** — permanent record: total/verified/self-reported hours, Upcoming/Pending/History tabs

## Key Rules to Preserve

- Reliability score = only the volunteer's 10 most recent registered events. Visible only to the volunteer, an org they've registered with, and group admins — never public/friends.
- Organization verification always takes precedence over group verification.
- New organizations (first 5 events) show a non-alarmist safety notice to volunteers.
- Verified hours (🟢) and self-reported hours (🟡) must always be visually distinguishable — no complicated badge system.
- Minors: guardian info collected only if birthday indicates under 18; guardian auto-notified on event registration.
