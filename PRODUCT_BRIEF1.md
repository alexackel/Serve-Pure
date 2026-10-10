# Volunteer Platform — Product Brief

**Working name:** "Volunteer" (temporary, until branding is finalized)

## Core Concept

Make volunteering as easy to discover and participate in as a fitness activity (Strava-style UX: activity feeds, personal stats, map discovery), while making the resulting volunteer record as trustworthy as an official record.

Primary audience: high school and college students who need volunteer hours for scholarships, applications, or personal goals.

Target platform: React Native + Expo — one codebase for iOS, Android, and web.

Visual identity: white/blue, clean, modern, rounded cards, generous whitespace. Green = verified. Yellow = self-reported/pending. Red = warnings/errors only.

## User Roles

Each login is one of two account types: a **personal** account (volunteer identity) or an **organization** login (administers one Organization). An organization login is signed up first with its business email and is managed by exactly one person; there are no shared org logins. A person can hold a personal login and several org logins. Each login verifies its own mobile number by SMS. Usernames are unique across all logins. UI adapts per role. See Roles & Navigation Model below for how that works in the UI.

- **Volunteer** — finds/registers for events, tracks hours, self-reports outside experiences, joins/creates groups, adds friends, appeals no-shows. Can also post one-off/casual events without becoming a formal Organization (see loophole rule below).
- **Organization/Organizer** — creates events, manages volunteers, confirms attendance, verifies self-reported hours. Does NOT need to be a registered nonprofit. An organization itself never volunteers — it's a distinct entity a personal account can administer.
- **Group Administrator** — a normal volunteer who additionally administers a Group. Not a separate account mode — see below.
- **Guardian** — not a full platform user. For volunteers under 18, guardian contact info is collected and guardians receive event notifications.
- **App Administrator** — resolves escalated appeals, platform moderation, safety intervention.

## Roles & Navigation Model

Three distinct navigation patterns depending on context:

**Volunteer (default, everyone):** the standard 5-tab shell — Home | Find | Map | Groups | You. This is the experience 100% of accounts have by default.

**Group Administrator:** stays inside the same 5-tab volunteer shell — no separate mode or switcher. Admin tools (member management, leaderboard controls, self-reported hours audit) live inline inside the Groups tab, as extra sections/buttons on the group's own profile screen when opened by an admin. A group admin is still a regular volunteer the rest of the time (finds events, tracks own hours, browses the real map), so they shouldn't be forced to toggle in and out of an "admin mode" just to do normal things.

**Organization:** a genuinely separate navigation structure, entered via an explicit context switcher (a dropdown listing "Personal" and each "[Org Name] — Admin"), similar to switching Slack workspaces. The dropdown lists the logins signed into on this device; it is device-only for now, so on a new device each org login is signed in again. The dropdown is hidden when only one login is on the device. Volunteers set up an organization login from Settings ("Set up organization account"); that does not sign them out. An organization login has no volunteer identity of its own, so it cannot register for events. While in Organization context:
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
- **Phone-match block:** a volunteer cannot register for an organization's event when their verified personal phone equals the verified phone on one of that organization's logins (or when it equals the event creator's verified phone). Enforced in the database. A second, unrelated phone is not caught by this check. Verified personal phones are unique among personal logins, and verified org-login phones are unique among org logins; a personal phone may equal an org login's phone so the manager's own number can be matched.
- **Phone verification (deferred):** the intended rule is that every login verifies its mobile by SMS before using the app. For now the SMS gate is removed and all phone numbers are treated as verified, so the app can be tested end to end. Phone numbers are still required on sign-up forms. Because nothing sets `phone_verified_at` yet, the phone-match and phone-uniqueness checks in the database do not fire until verification returns.
- **Future: phone-check provider.** Two options were considered. (A) Supabase's built-in phone auth with Twilio. This fits the current schema, which relies on `auth.users.phone_confirmed_at`. (B) Firebase Auth as the phone checker, with Supabase accepting Firebase ID tokens via third-party auth. Option B would require reworking the phone-sync trigger and any RLS that uses `auth.uid()`. No decision yet; no implementation.
- **Organization sign-up:** requires a self-declared date of birth of 18 or older, a 501(c)(3) yes/no (with EIN when yes), a website whose domain matches the business email domain (required), and an optional Facebook page URL that is not used for verification. Free-mail providers are rejected for organizations.

## AI-Powered Volunteer Org Discovery ("AI Discovered" tab)

A second, independent discovery channel on the Find page, alongside the existing org-verified/self-reported events tab. Instead of events posted on-platform, this surfaces volunteer *organizations* found via live web search — for areas where the platform doesn't yet have organic coverage.

- Find gets a second tappable tab, "AI Discovered," next to the existing (unchanged) events tab. Card list of AI-found orgs, sorted by distance, with category filter chips (fixed enum: food, environment, youth, seniors, animals, education, health, disaster_relief, other).
- **Cost control via region bucketing:** the platform never re-searches per exact zip code. A user's location is geocoded and checked against already-searched "metro buckets" (~15-20 mile radius); if one exists nearby, its cached results are reused. Only a genuinely new area triggers a fresh web search (Brave Search, free tier) + AI extraction (Claude Haiku, cheapest current model) + geocoding (Mapbox). This keeps the feature at near-$0 operating cost regardless of user count.
- **Preloading:** the bucket-check-and-search flow kicks off in the background as soon as the app opens and location resolves, so results are typically already cached by the time a volunteer taps the tab. A subtle loading indicator only appears if the background fetch hasn't finished yet.
- **Role visibility:** shown whenever a volunteer is in their personal context (the same shell Group Admins already use) — hidden only when viewing Find from an Organization's admin context, since discovering third-party orgs isn't relevant to managing your own.
- **Trust/moderation:** each AI-discovered org has a lightweight "Report incorrect info" control that increments a flag counter. No review queue or auto-removal yet — this is a soft signal for future moderation tooling, not an enforcement mechanism.

## Multi-Group Hours Review & Self-Dealing-by-Proxy Protection

A self-reported activity can be routed to more than one of the volunteer's Groups at once for independent review — each group approves or denies on its own copy, hours are awarded once (the first approval wins, regardless of how many groups it was sent to), and a denial can optionally allow the volunteer to edit and resubmit. Resubmitting only reopens the groups still in play (still pending, or awaiting that resubmission) — a group that already approved, or denied without allowing a re-upload, is unaffected and never sees the update. Review is drill-down only: an admin opens one submission at a time (oldest-submitted first), acts, sees a full-screen approved/denied confirmation, and is automatically carried to the next pending item until the queue is empty. A volunteer can't route a submission to a group they themselves administer in the first place — it's excluded from the group-selection list, since the self-dealing block below would refuse to let it ever be approved.

Self-dealing-by-proxy protections, enforced as hard blocks at the database level (mirroring the existing event-registration self-dealing rule): a group admin can never approve or deny their own submission, and can never review a submission from a volunteer they are a registered guardian for (matched by contact info, since guardians aren't linked to a real platform account). Two lightweight statistical signals — an admin repeatedly approving the same submitter, and an admin who never denies anything while running a very small group — are detected and logged for a future moderation review surface; there is no App Administrator UI to act on them yet, so today this is detection-and-storage only, the same posture as the AI-discovered-org "Report incorrect info" flag.

## Open Product Decisions (not yet implemented)

- **Subgroup membership inheritance:** groups support a parent/subgroup structure, but it's undefined whether joining a subgroup should also join the parent group (or vice versa), or whether a parent group's admins should have implicit admin/visibility rights over a subgroup. Currently these are fully independent — subgroup membership has no effect on the parent group and vice versa. Needs a product decision before any inheritance behavior is built.
- **New-organization safety notice threshold:** "first 5 events" is fully computable from existing data (an org's event count), but the notice's UI/copy/placement hasn't been designed yet.
- **Automatic approvals:** today every self-reported submission requires an explicit human approve/deny per group. A future enhancement could let a group admin configure auto-approval rules (e.g. trusted submitters, activities under a certain hour threshold, or a pre-approved organization list) to cut down on review burden for high-volume groups — not designed or built yet, flagged here as a future decision.

## Accounts Rollout: Test Status and Next Steps (as of 2026-10-06)

Scope: account types, usernames, org logins, device account switching (see `docs/handoff-accounts.md` for the full design).

**Done and verified**
- Migration `0052_accounts_usernames_org_login.sql` is applied to production. The read-only checks in `supabase/verify-0052.md` pass: 11 new columns, the old person-link design removed, 9 functions, grants, and reserved-username behavior.
- `npx tsc --noEmit` passes.
- Sign-up helper logic passes 28 of 28 assertions: username rules, phone formatting and E.164 conversion, free-mail rejection, website-domain matching, and the 18+ cutoff.
- The reserved-username list is identical in the app (`src/utils/username.ts`) and the database (`private.fn_username_reserved`).
- Your account (`alex.ackel45@gmail.com`) already administers **GreenFuture Coalition** (verified). No second org was added.

**Known gaps**
- `npx expo lint` reports 3 errors, all "setState inside an effect": two in `src/context/auth-context.tsx` (around lines 105 and 134) and one in `src/hooks/use-username-availability.ts`. Not runtime failures; fix later.
- The `triggers` check in `verify-0052.md` was truncated in the results view. Confirm `trg_handle_new_user` and `trg_sync_verified_phone` exist on `auth.users`.
- Phone verification is removed for now. Nothing sets `profiles.phone_verified_at`, so the phone-match and phone-uniqueness checks in the database never fire.
- No end-to-end app test has run yet. Volunteer sign-up, org sign-up, the Settings path, the dropdown, add-account, sign-out, and the self-dealing blocks are all untested.

**Next steps, in order**
1. **Pick a test database.** The app currently points at production (`urriwvuhvcfjgdnfslfa`). Decide between a Supabase branch (needs a paid plan) or a second free project (replay migrations 0001–0052 in order). Until then, don't write test data to production.
2. **Render-only UI pass on localhost (no submits).** Run `npx expo start --web`, then open sign-in, the path picker, the org form, and Settings in the browser. Confirm they render and the inline validation messages match the helper rules. Don't submit anything.
3. **Once a test database exists, run the handoff test plan** (`docs/handoff-accounts.md`, section 5) in order:
   1. Volunteer sign-up
   2. Duplicate username rejected
   3. Org sign-up: free-mail rejected, website mismatch rejected, under 18 rejected, valid data accepted
   4. Settings path: volunteer stays signed in, org login becomes active
   5. Dropdown switches between two logins
   6. Add account from the dropdown
   7. Sign-out clears all device logins
   8. Self-dealing: needs verified phones, so it's blocked until phone verification returns. The creator/admin block doesn't need phones: create an event for GreenFuture Coalition, then try to register for it from the same login. It should be rejected.
4. **Clean up before release:** confirm `.env.local` has no `EXPO_PUBLIC_SKIP_PHONE_VERIFICATION` line (already removed), and fix the 3 lint errors.
5. **Update `docs/handoff-accounts.md`.** Sections 4 and 5 still describe the removed SMS gate and bypass flag.
6. **Restore phone verification** when a provider is chosen (see the future phone-check entry above). Then set `phone_verified_at` through the real flow and re-run the self-dealing tests.
