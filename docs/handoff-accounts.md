# Handoff: account types, phone verification, org logins

Project: `C:\Users\alexa\Projects\serve-pure` (Expo SDK 57, React Native, Supabase).
Plan file: `C:\Users\alexa\.claude\plans\buzzing-leaping-codd.md` (latest approved plan).
Product brief: `PRODUCT_BRIEF1.md` (updated for this work).

## 1. What the user asked for

Expand sign-up so first-time users pick a path:
- **"I'm here to help"** = Volunteer (personal account).
- **"I need volunteers"** = Organization (org login).

Other requirements:
- Usernames, unique across all logins.
- Phone required and verified by SMS, one account per verified number.
- Org logins sign up with a business email and are managed by exactly one person.
- Volunteers can add an org login from Settings, without signing out.
- A dropdown switches between the logins on this device.
- Self-dealing guards: a volunteer can't register for, review, or like-boost work tied to an org they run through a login that shares their verified phone.

## 2. Decisions (final, confirmed by the user)

| Topic | Decision |
|---|---|
| Org sign-up order | Org first, with a business email. No personal account needed. |
| Linking personal and org logins | **None.** The earlier `person_id` link was dropped. |
| Org logins | One person per login. No shared logins. |
| Org login login identifier | Business email plus password. Username is display only. |
| Usernames | 3-20 chars, `a-z 0-9 _`, case-insensitive, unique across all logins, reserved words blocked, change once per 30 days. |
| Phone | Required for every login. Verified by SMS. Shown as `+1(###)-###-####`, stored as E.164 (`+1XXXXXXXXXX`). US only for now. |
| Phone uniqueness | Unique among verified personal logins. Unique among verified org logins. A personal phone may equal an org login's phone. |
| Self-dealing check | Block when a volunteer's verified phone equals the verified phone of the event creator or any admin login of the event's org. |
| Org manager age | Self-declared DOB must be 18+. Enforced in the sign-up trigger, not just the form. |
| Org website | Required. Its domain must match the business email's domain. |
| Org Facebook | Optional, not used for verification. |
| Free-mail | Rejected for org business emails. |
| Dropdown | Lists logins signed into on this device. Device-only: a new device needs each org login signed in again. |
| Sessions on device | Kept so the dropdown can switch without a password. Cleared on sign-out. |
| Existing org admins | Unchanged. Their `org_admins` orgs still work, via the old personal/org toggle. |
| Firebase Auth | Planned future phone-check provider. Recorded in the brief as future only. Not built. |

## 3. Database (migration `supabase/migrations/0052_accounts_usernames_org_login.sql`)

**Status: applied by the user.** The user accidentally ran an earlier draft (`person_id` version) first. A cleanup was run (drops `private.account_persons`, `fn_person_of`, `fn_link_new_profile_person`, the old global phone index, and `profiles.phone_verified_at`), then this file was run.

Verified by the user with `supabase/verify-0052.md`. All sections matched (checks 1-7).

What the migration does:
- **Columns on `profiles`:** `account_type` (`personal` | `organization`, default `personal`), `username` (lowercased, format-checked, unique), `username_changed_at`, `phone_verified_at`, `school`, `terms_accepted_at`.
- **Columns on `organizations`:** `facebook_url`, `ein`, `is_501c3`, `manager_name`, `manager_title`.
- **Indexes:** `profiles_username_unique` (on `lower(username)`), `profiles_phone_verified_personal_unique`, `profiles_phone_verified_organization_unique`.
- **`check_username_available(text)`:** callable by `anon` and `authenticated`. Rate-limit it in the dashboard.
- **`set_username(text)`:** authenticated only. 30-day cooldown. **No client UI yet.**
- **`handle_new_user()`:** replaced. Reads metadata for username, school, terms, and account type. For org logins, requires 18+ (raises `organization_manager_must_be_18`) and creates the `organizations` row with `created_by` = the login (the existing `fn_org_auto_admin` makes it admin).
- **`fn_sync_verified_phone()` on `auth.users`:** when `phone_confirmed_at` becomes set, copies the phone into `profiles` and sets `phone_verified_at`. Raises `phone_already_registered` on a duplicate.
- **`private.fn_is_event_operator_conflict(user, event)`:** the phone-match check. Used by the registration insert and update triggers.
- **Guards replaced:** `fn_registrations_before_insert`, `fn_registrations_before_update`, `private.fn_group_review_self_dealing_reason` (group hours review), `fn_block_self_like`. Each now also blocks a matching verified phone.

## 4. Client code (all type-checks with `npx tsc --noEmit`; web bundle built with `npx expo export --platform web`)

**Auth and sessions**
- `src/context/auth-context.tsx`: session plus profile load (`account_type`, `phone_verified_at`). Device accounts. Exposes `signIn`, `addAccount`, `switchAccount`, `signUpPersonal`, `signUpOrganization`, `sendPhoneCode`, `verifyPhoneCode`, `signOut`, `needsPhoneVerification`, `activeAccountType`, `deviceAccounts`, `activeUserId`.
  - `signUpOrganization` uses a non-persisting client, so a volunteer stays signed in. It then makes the org login active.
  - `signOut` clears all device accounts.
- `src/lib/device-accounts.ts`: device-local list of `{userId, email, accountType, accessToken, refreshToken}` in the key-value store (localStorage on web, SQLite shim on native).
- `src/lib/supabase.ts`: adds `createTemporaryAuthClient()` (no persistence).

**Screens and components**
- `src/app/sign-in.tsx`: sign-in, plus sign-up with the path picker, then the volunteer form or the org form.
- `src/components/organization-signup-form.tsx`: org form, shared by sign-in and the Settings route.
- `src/app/organization-signup.tsx`: Settings route for an org login. On success it goes to `/org-you`.
- `src/app/add-account.tsx`: sign in to another existing login and keep it on the device.
- `src/app/verify-phone.tsx`: SMS gate. Send code, then verify.
- `src/app/settings.tsx`: "Set up organization account" row, shown only for personal accounts.
- `src/app/_layout.tsx`: protected routes. Tabs and app screens are behind `!needsPhoneVerification`. `verify-phone` is behind `needsPhoneVerification`.
- `src/components/account-switcher.tsx`: dropdown of device logins, with "Sign in to another account." Falls back to `SwitchViewModeButton` when the device has one login or fewer. Used in `src/app/(tabs)/you.tsx` and `src/app/(tabs)/org-you.tsx`.
- `src/components/switch-view-mode-button.tsx`: the old toggle, kept as the fallback for existing org admins.
- `src/components/auth-field.tsx`: `AuthField` (labelled input with error or hint) and `CheckRow` (checkbox).
- `src/context/organization-context.tsx`: `viewMode` is forced to `organization` when the active login is an org login. Otherwise the old in-memory toggle applies.

**Helpers**
- `src/utils/phone.ts`: `formatUsPhone` (display), `normalizePhone` (E.164, US 10-digit), `PHONE_PLACEHOLDER`, `PHONE_ERROR`.
- `src/utils/username.ts`: `normalizeUsername`, `usernameError`.
- `src/utils/email.ts`: `emailDomain`, `isFreeMailEmail`, `websiteDomain`, `businessEmailMatchesWebsite`.
- `src/utils/birthdate.ts`: `parseBirthdate` (YYYY-MM-DD, real calendar date), `isAtLeastAge`.
- `src/hooks/use-username-availability.ts`: debounced live check via RPC.

**Product brief**
- `PRODUCT_BRIEF1.md`: updated for the org-login model, device-only dropdown, phone rule, self-dealing phone block, org sign-up requirements, and the Firebase future note.

## 5. Current testing state

- **Temporary SMS bypass is ON** in `.env.local` (git-ignored): `EXPO_PUBLIC_SKIP_PHONE_VERIFICATION=true`.
  - Effect: `needsPhoneVerification` is forced to false in `src/context/auth-context.tsx`, so the verify-phone screen is skipped.
  - Dev server must be restarted after editing `.env.local`.
  - Phone numbers are still required on the forms, but are not verified, so the phone-uniqueness and phone-match blocks don't apply during these tests.
  - **Must be removed before release.** Delete the flag line from `.env.local`, and delete the temporary check in `auth-context.tsx` (marked `TEMPORARY`).
- **Not yet tested live:** volunteer sign-up, org sign-up, the Settings entry, the dropdown switch, add-account, and the self-dealing blocks. The SMS flow itself is untested, because the SMS provider and phone auth aren't confirmed enabled in the dashboard.
- Note: `npx expo export` produced a bundle with no errors.

### Suggested test plan (with the bypass on)
1. **Volunteer sign-up:** "I'm here to help", fill in the form, check the username live check, submit. Confirm the app opens.
2. **Duplicate username:** a second sign-up with the same username should be rejected.
3. **Org sign-up from sign-in:** "I need volunteers". Test: free-mail rejected, website domain mismatch rejected, under-18 rejected (the DB also rejects this), good data accepted.
4. **Settings path:** signed in as a volunteer, Settings → "Set up organization account". The volunteer should stay signed in, and the org login should become active.
5. **Dropdown:** with two logins on the device, switch between them. With one login, the old toggle should show for existing admins.
6. **Add account:** sign in to an existing org login from the dropdown's "Sign in to another account."
7. **Sign-out:** clears all device logins.
8. **Self-dealing (needs SMS verified):** can't be tested with the bypass on. Re-enable SMS first.

## 6. Known gaps and open items

- **SMS flow:** needs the phone provider and rate limits configured in the Supabase dashboard. Not verified end to end.
- **Firebase Auth:** future phone-check provider. Not built.
- **Username change UI:** `set_username` exists, but there's no screen.
- **Get verified:** the first-time prompt is still a placeholder. Copy is undecided.
- **Minors and guardians:** a minor's phone rule (guardian phone instead of their own) is undecided. Currently every personal login must verify a phone.
- **Phone visibility:** `profiles.phone` may be readable by event organizers and group members under existing RLS. Verified phones make this more sensitive. Consider moving it out of the readable columns before launch.
- **Dropdown labels:** an inactive org login shows its email, not its organization name.
- **Device tokens:** refresh tokens for every device login are stored in local storage. Acceptable for now, but a shared-device risk.
- **Phone-match limit:** a volunteer using a second phone bypasses the block. This is a known limit of the design.
- **Memory note:** `project_no-local-supabase-env.md` in the memory folder needs updating once testing finishes. It should say `0052` is applied.
- **Old files:** `src/components/switch-view-mode-button.tsx` remains as the fallback, by design.

## 7. Files changed or created in this work (for review)

- New: `supabase/migrations/0052_accounts_usernames_org_login.sql`, `supabase/verify-0052.md`, `docs/handoff-accounts.md`
- New: `src/app/verify-phone.tsx`, `src/app/add-account.tsx`, `src/app/organization-signup.tsx`
- New: `src/components/account-switcher.tsx`, `src/components/auth-field.tsx`, `src/components/organization-signup-form.tsx`
- New: `src/hooks/use-username-availability.ts`, `src/lib/device-accounts.ts`
- New: `src/utils/phone.ts`, `src/utils/username.ts`, `src/utils/email.ts`, `src/utils/birthdate.ts`
- Changed: `src/context/auth-context.tsx`, `src/context/organization-context.tsx`, `src/lib/supabase.ts`
- Changed: `src/app/sign-in.tsx`, `src/app/_layout.tsx`, `src/app/settings.tsx`
- Changed: `src/app/(tabs)/you.tsx`, `src/app/(tabs)/org-you.tsx`
- Changed: `PRODUCT_BRIEF1.md`
- Local only (git-ignored): `.env.local` (temporary bypass flag)
