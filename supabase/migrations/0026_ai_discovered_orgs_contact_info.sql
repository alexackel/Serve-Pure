-- Adds a freeform contact-info field (phone/email) to ai_discovered_orgs,
-- extracted by discover-ai-orgs especially when no street address is
-- available, so a volunteer still has a way to reach the org.
alter table public.ai_discovered_orgs add column contact_info text;
