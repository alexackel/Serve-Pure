# Volunteer Platform — Product Brief

**Working name:** "Volunteer" (temporary, until branding is finalized)

## Core Concept

Make volunteering as easy to discover and participate in as a fitness activity (Strava-style UX: activity feeds, personal stats, map discovery), while making the resulting volunteer record as trustworthy as an official record.

Primary audience: high school and college students who need volunteer hours for scholarships, applications, or personal goals.

Target platform: React Native + Expo — one codebase for iOS, Android, and web.

Visual identity: white/blue, clean, modern, rounded cards, generous whitespace. Green = verified. Yellow = self-reported/pending. Red = warnings/errors only.

## User Roles

One account system; UI adapts per role. A single account can hold both a personal volunteer identity and administer one or more Organizations — see Roles & Navigation Model below for how that works in the UI.

- **Volunteer** — finds/registers for events, tracks hours, self-reports outside experiences, joins/creates groups, adds friends, appeals no-shows. Can also post one-off/casual events without becoming a formal Organization (see loophole rule below).
- **Organization/Organizer** — creates events, manages volunteers, confirms attendance, verifies self-reported hours. Does NOT need to be a registered nonprofit. An organization itself never volunteers — it's a distinct entity a personal account can administer.
- **Group Administrator** — a normal volunteer who additionally administers a Group. Not a separate account mode — see below.
- **Guardian** — not a full platform user. For volunteers under 18, guardian contact info is collected and guardians receive event notifications.
- **App Administrator** — resolves escalated appeals, platform moderation, safety intervention.

## Roles & Navigation Model

Three distinct navigation patterns depending on context:

**Volunteer (default, everyone):** the standard 5-tab shell — Home | Find | Map | Groups | You. This is the experience 100% of accounts have by default.

**Group Administrator:** stays inside the same 5-tab volunteer shell — no separate mode or switcher. Admin tools (member management, leaderboard controls, self-reported hours audit) live inline inside the Groups tab, as extra sections/buttons on the group's own profile screen when opened by an admin. A group admin is still a regular volunteer the rest of the time (finds events, tracks own hours, browses the real map), so they shouldn't be forced to toggle in and out of an "admin mode" just to do normal things.

**Organization:** a genuinely separate navigation structure, entered via an explicit context switcher (tap profile avatar → "Personal" vs. "[Org Name] — Admin"), similar to switching Slack workspaces. While in Organization context:
- Nav becomes something like Dashboard | Events | Volunteers | Settings (not the volunteer 5-tab shell) — orgs shouldn't be forced into a social-feed-centric interface.
- The Map tab is replaced with an **Analytics** view (event fill rates, volunteer reliability trends, hours issued over time) since geographic discovery is irrelevant to a management context.
- One person can administer multiple organizations; one organization can have multiple admins — the data model should support this from the start even if not needed on day one.

## The Self-Dealing Loophole (must-enforce rule)

Volunteers can post casual one-off events (neighborhood cleanups, etc.) without becoming a formal Organization. This creates a loophole: the creator could register for their own event and mark themselves "Attended" for free verified hours with no real check.

**Rule: the account that created an event can never register as a volunteer for that same event.** Enforce this as a hard block at registration — no exceptions, no approval workaround needed.

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

## Navigation (mobile, persistent bottom nav — default volunteer context)

**Home | Find | Map | Groups | You**

No separate Create tab — Create lives behind a "+" button inside Find (Volunteer Event or Add Volunteer Experience).

- **Home** — personal impact stats, reliability score (private, never shown in feed), friends activity feed with kudos
- **Find** — search/filter/sort events, event cards, "+" create button
- **Map** — event markers (not org markers), list/map toggle
- **Groups** — group profile, leaderboard, member stats; admin tools/self-reported hours audit appear inline here for group admins
- **You** — permanent record: total/verified/self-reported hours, Upcoming/Pending/History tabs

Organization context uses a different nav entirely — see Roles & Navigation Model above.

## Key Rules to Preserve

- Reliability score = only the volunteer's 10 most recent registered events. Visible only to the volunteer, an org they've registered with, and group admins — never public/friends.
- Organization verification always takes precedence over group verification.
- New organizations (first 5 events) show a non-alarmist safety notice to volunteers.
- Verified hours (🟢) and self-reported hours (🟡) must always be visually distinguishable — no complicated badge system.
- Minors: guardian info collected only if birthday indicates under 18; guardian auto-notified on event registration.
- An event's creator can never register as a volunteer for their own event (self-dealing block). This also applies to any other admin of the organization that posted the event — not just the literal creator.

## Open Product Decisions (not yet implemented)

- **Subgroup membership inheritance:** groups support a parent/subgroup structure, but it's undefined whether joining a subgroup should also join the parent group (or vice versa), or whether a parent group's admins should have implicit admin/visibility rights over a subgroup. Currently these are fully independent — subgroup membership has no effect on the parent group and vice versa. Needs a product decision before any inheritance behavior is built.
- **New-organization safety notice threshold:** "first 5 events" is fully computable from existing data (an org's event count), but the notice's UI/copy/placement hasn't been designed yet.
