-- Richer AI-discovered-org details: a distinct volunteer sign-up link
-- (separate from source_url), the org's own website, and freeform time
-- commitment / eligibility notes when the search snippets state them.
-- All nullable/freeform, same pattern as contact_info in migration 0026 --
-- Haiku is extracting from noisy web snippets, not structured input, so
-- these aren't split into rigid sub-fields.
alter table public.ai_discovered_orgs add column signup_url text;
alter table public.ai_discovered_orgs add column website text;
alter table public.ai_discovered_orgs add column time_commitment text;
alter table public.ai_discovered_orgs add column eligibility text;
