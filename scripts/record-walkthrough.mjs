import { chromium } from 'playwright';
import { mkdirSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'output');
const TMP_DIR = path.join(OUTPUT_DIR, '_tmp');
const BASE_URL = process.env.WALKTHROUGH_BASE_URL || 'http://localhost:8081';
const EMAIL = 'seed.jordan@servepure.test';
const PASSWORD = 'seed-test-password';
const VIEWPORT = { width: 390, height: 844 };

mkdirSync(OUTPUT_DIR, { recursive: true });
rmSync(TMP_DIR, { recursive: true, force: true });
mkdirSync(TMP_DIR, { recursive: true });

// ---- caption overlay (burned-in text, no audio track is possible here) ----
async function showCaption(page, text) {
  await page.evaluate((caption) => {
    let el = document.getElementById('__walkthrough_caption__');
    if (!el) {
      el = document.createElement('div');
      el.id = '__walkthrough_caption__';
      Object.assign(el.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        zIndex: '999999',
        pointerEvents: 'none', // must not block clicks on the real UI underneath
        padding: '14px 16px 12px',
        background: 'rgba(15, 23, 42, 0.88)',
        color: '#fff',
        fontFamily: '-apple-system, system-ui, sans-serif',
        fontSize: '15px',
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: '1.3',
      });
      document.body.appendChild(el);
    }
    el.textContent = caption;
  }, text);
}

async function clearCaption(page) {
  await page.evaluate(() => document.getElementById('__walkthrough_caption__')?.remove());
}

// An always-mounted #error-toast container (tied to a Supabase "JWT issued
// at future" clock-skew warning firing repeatedly) sits at a fixed position
// and intercepts clicks even while visually empty. Neutralize it at the
// page level rather than fighting it per click.
async function neutralizeErrorToast(page) {
  await page.addInitScript(() => {
    const apply = () => {
      const el = document.getElementById('error-toast');
      if (el) el.style.pointerEvents = 'none';
    };
    apply();
    new MutationObserver(apply).observe(document.documentElement, { childList: true, subtree: true });
  });
}

async function step(page, label, caption, action, holdMs = 2800) {
  console.log(`  [step] ${label}`);
  if (action) await action();
  await page.waitForTimeout(500);
  await showCaption(page, caption);
  await page.waitForTimeout(holdMs);
}

async function login(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByPlaceholder('you@example.com').fill(EMAIL);
  await page.getByPlaceholder('••••••••').fill(PASSWORD);
  await page.getByText('Sign In', { exact: true }).click();
  await page.waitForFunction(() => !document.body.innerText.includes('Welcome back'), { timeout: 20000 });
  await page.waitForTimeout(800);
}

function tab(page, label) {
  // Both the personal and organization tab sets stay mounted at all times
  // (src/components/app-tabs.tsx); the one hidden for the current view mode
  // renders with no label text, so matching on visible label text alone is
  // already unambiguous without an extra visibility filter.
  return page.locator('a').filter({ hasText: label });
}

async function flushVideo(page, context, destPath) {
  const videoPromise = page.video()?.path();
  await context.close();
  if (!videoPromise) return null;
  const src = await videoPromise;
  renameSync(src, destPath);
  console.log(`  [video] saved ${destPath}`);
  return destPath;
}

// ---------------------------------------------------------------------------
// USER VIDEO
// ---------------------------------------------------------------------------
async function recordUserVideo(browser) {
  console.log('Recording user walkthrough...');
  const dir = path.join(TMP_DIR, 'user');
  mkdirSync(dir, { recursive: true });
  const context = await browser.newContext({ viewport: VIEWPORT, recordVideo: { dir, size: VIEWPORT } });
  const page = await context.newPage();
  await neutralizeErrorToast(page);

  await login(page);
  await step(page, 'home', 'Welcome to Serve Pure — find volunteer events and track your hours', null);

  await step(page, 'find', 'Find volunteer events near you', () => tab(page, 'Find').click());
  await step(page, 'find-discovered', 'AI-powered discovery finds organizations beyond the platform', () =>
    page.getByText('Discovered', { exact: true }).click(),
  );
  const gotIt = page.getByText('Got it', { exact: true });
  if (await gotIt.count()) {
    await gotIt.click();
    await page.waitForTimeout(500);
  }
  await step(page, 'find-events', 'Filter and sort by distance, date, category, and more', () =>
    page.getByText('Events', { exact: true }).click(),
  );
  await step(
    page,
    'event-detail',
    'See full details, requirements, and register in one tap',
    () => page.getByText('Seed: Neighborhood Park Cleanup', { exact: true }).click(),
    3200,
  );
  await step(page, 'back-to-find', 'Back to browsing', () => page.goBack());

  await step(page, 'map', 'Browse opportunities on the map', () => tab(page, 'Map').click());

  await step(page, 'groups', 'Join groups, compete on leaderboards', () => tab(page, 'Groups').click());
  await step(
    page,
    'group-detail',
    'Group stats, members, and shared impact',
    () => page.getByText('Seed: Test Volunteer Squad', { exact: true }).click(),
    3200,
  );
  await step(page, 'back-to-groups', 'Back to groups', () => page.goBack());

  await step(page, 'you', 'Your permanent record — verified and self-reported hours', () => tab(page, 'You').click(), 3200);

  await clearCaption(page);
  await flushVideo(page, context, path.join(OUTPUT_DIR, 'user-walkthrough.webm'));
}

// ---------------------------------------------------------------------------
// ORGANIZATION VIDEO
// ---------------------------------------------------------------------------
async function recordOrgVideo(browser) {
  console.log('Recording organization walkthrough...');
  const dir = path.join(TMP_DIR, 'org');
  mkdirSync(dir, { recursive: true });
  const context = await browser.newContext({ viewport: VIEWPORT, recordVideo: { dir, size: VIEWPORT } });
  const page = await context.newPage();
  await neutralizeErrorToast(page);
  await login(page);
  await step(page, 'you-personal', 'Serve Pure for organizations — one account, switchable context', () =>
    tab(page, 'You').click(),
  );
  await step(
    page,
    'switch-org',
    'Switch into your organization from any account',
    () => page.getByText('Organization', { exact: true }).click(),
    3200,
  );
  await step(page, 'org-you', 'Review and verify volunteer hours', null, 3200);

  await step(page, 'org-events', 'See and manage all of your organization’s events', () => tab(page, 'Events').click());
  await step(
    page,
    'org-event-detail',
    'Drill into any event your organization has posted',
    () => page.getByText('Seed: Upcoming But Cancelled Cleanup', { exact: true }).click(),
    3200,
  );
  await step(page, 'back-to-org-events', 'Back to events', () => page.goBack());

  await step(page, 'org-analytics', 'Analytics — coming soon', () => tab(page, 'Analytics').click());
  await step(page, 'org-groups', 'Manage your organization’s groups', () => tab(page, 'Groups').click());
  await step(
    page,
    'org-you-settings',
    'Full control over your organization, all from one account',
    () => tab(page, 'You').click(),
    3200,
  );

  await clearCaption(page);
  await flushVideo(page, context, path.join(OUTPUT_DIR, 'org-walkthrough.webm'));
}

const browser = await chromium.launch();
try {
  await recordUserVideo(browser);
  await recordOrgVideo(browser);
} finally {
  await browser.close();
}

rmSync(TMP_DIR, { recursive: true, force: true });
console.log('Done. Output in', OUTPUT_DIR);
