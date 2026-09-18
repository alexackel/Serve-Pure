# discover-ai-orgs

Backs the Find page's "AI Discovered" tab. See `supabase/migrations/0025_ai_discovered_orgs.sql`
for the schema and `PRODUCT_BRIEF1.md`'s "AI-Powered Volunteer Org Discovery" section for the
product rationale (region bucketing for cost control, etc).

## Required secrets

These are server-only — never add them to `.env.example` or any `EXPO_PUBLIC_*` variable, since
they're only ever read from `Deno.env` inside this function.

| Secret | Where to get it |
| --- | --- |
| `BRAVE_API_KEY` | [Brave Search API dashboard](https://brave.com/search/api/) — free tier is 2,000 queries/month |
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com/) — used to call `claude-haiku-4-5` for extraction |
| `MAPBOX_ACCESS_TOKEN` | Mapbox account → Access tokens page — use a **secret** (non-public) token, since this is only ever called server-side |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` don't need to be set manually — Supabase injects
them into every Edge Function's environment automatically.

Set the three secrets above with:

```sh
supabase secrets set BRAVE_API_KEY=... ANTHROPIC_API_KEY=... MAPBOX_ACCESS_TOKEN=...
```

Then deploy with:

```sh
supabase functions deploy discover-ai-orgs
```

This function requires a signed-in Supabase session to call (default `verify_jwt` behavior) — it's
not meant to be publicly invokable, to keep the free-tier Brave/Anthropic quotas from being spent
by anything outside the app.

## Search queries

A brand-new bucket (and a refresh, below) runs 3 Brave queries per area instead of 1: a generic
`volunteer organizations near X` catch-all, plus 2 queries targeting the categories most likely to
actually need volunteers — food banks/pantries + animal shelters, and hospitals/health clinics +
senior care/nursing homes. These are grouped (not 4 separate queries) to keep Brave usage down;
Haiku's extraction cost is one call regardless of query count, so query count only affects Brave
usage. Queries run sequentially with a short delay to stay under Brave's free-tier 1 req/sec limit,
and results are merged/de-duplicated by URL before extraction. There's no dedicated environmental-
conservation query — it falls back to the generic query like youth/education/disaster_relief — since
that budget goes to address/contact enrichment instead (below), which testing showed mattered more.

Every query includes an "address" term, biasing which part of a result page Brave surfaces as the
snippet toward location-bearing text. Requests also set `extra_snippets=1`, asking Brave for a few
additional excerpts from each page beyond its single (often-truncated) description — this is what
actually surfaces an address that's clearly listed on a page but didn't fit in that one short line.
(`extra_snippets` is a no-op if the API plan doesn't support it, not an error.)

Haiku's extraction prompt prioritizes finding a real street address over settling for null, and is
instructed to treat blog/"best of" roundup articles about volunteering as less reliable than an
organization's own page for time-sensitive details (time commitment, eligibility) — the failure mode
this addresses is a listicle citing an org's now-outdated volunteer program.

## Address/contact enrichment

Many orgs still come back from the main extraction with `address: null`, even when their own page
(`source_url`) states one plainly — Haiku only sees Brave's short snippet, not the full page. Two
enrichment tiers run after the main extraction, before geocoding, to close that gap:

1. **Source-page fetch (free)** — for orgs missing an address (capped at `MAX_ADDRESS_FETCH_TARGETS`,
   a latency bound, not a cost one), fetch each org's `source_url` directly and ask Haiku to pull an
   address/contact from the actual page text. This never touches Brave's quota.
2. **Search fallback (capped)** — for whatever's still missing an address after step 1, run one
   brand-new Brave query per org (`"Org Name" address near X`), capped at `MAX_ADDRESS_SEARCH_FALLBACK`
   orgs, and extract from those results the same way.

Both tiers are non-fatal — a failed fetch or search just leaves that org's address/contact as they
were, it never aborts the search.

## Cache refresh

A metro bucket is re-searched once it's 3+ months since its last search, but only if it's also seen
real traffic within the past month (`last_active_at`) — a single visit to a long-dormant bucket just
re-arms that timestamp rather than immediately spending a refresh, so refresh cost tracks areas with
actual recurring usage. The refresh runs via `EdgeRuntime.waitUntil` after the (still-cached) response
is already sent, so it never makes a request wait. It reconciles against existing rows rather than
blindly inserting — an org found again with an address it didn't have before gets that address
backfilled instead of creating a duplicate row.
