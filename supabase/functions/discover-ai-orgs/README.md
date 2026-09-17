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
