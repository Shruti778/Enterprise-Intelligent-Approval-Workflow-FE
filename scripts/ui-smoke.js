/* eslint-disable no-console */
/**
 * Headless UI smoke test: drives the real browser UI through the core flows.
 * Usage: node scripts/ui-smoke.js   (needs the backend and frontend running)
 */
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const BASE = process.env.UI_URL || 'http://localhost:3001';
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const SHOTS = path.resolve(__dirname, '../.ui-screenshots');

let passed = 0;
let failed = 0;

function check(label, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${label}${detail ? ` (${detail})` : ''}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}${detail ? ` (${detail})` : ''}`);
  }
}

// innerText reflects CSS text-transform, so compare case-insensitively.
const text = (page) => page.evaluate(() => document.body.innerText);
const has = (body, fragment) => body.toLowerCase().includes(fragment.toLowerCase());

/**
 * Sets a controlled React input. Synthetic CDP key events do not reach the page
 * in this environment, so drive the value through the native setter and fire the
 * `input` event React actually listens for.
 */
async function setInput(page, selector, value) {
  await page.$eval(
    selector,
    (el, v) => {
      const proto =
        el.type === 'checkbox' ? window.HTMLInputElement.prototype : el.tagName === 'TEXTAREA'
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(el, String(v));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    },
    value
  );
}

/** Clicks an element through the DOM (bypasses CDP mouse delivery). */
async function clickEl(page, selector, index = 0) {
  await page.evaluate(
    (sel, i) => {
      const els = Array.from(document.querySelectorAll(sel));
      if (els[i]) els[i].click();
    },
    selector,
    index
  );
}

/** Clicks the first button whose text contains the given fragment. */
async function clickButtonContaining(page, fragment) {
  const clicked = await page.evaluate((text) => {
    const button = Array.from(document.querySelectorAll('button')).find((b) =>
      b.innerText.includes(text)
    );
    if (button) button.click();
    return Boolean(button);
  }, fragment);
  if (!clicked) throw new Error(`Button not found containing: ${fragment}`);
}

/** Clicks the first button whose text starts with the given label. */
async function clickButton(page, label) {
  const clicked = await page.evaluate((text) => {
    const button = Array.from(document.querySelectorAll('button')).find((b) =>
      b.innerText.trim().startsWith(text)
    );
    if (button) button.click();
    return Boolean(button);
  }, label);
  if (!clicked) throw new Error(`Button not found: ${label}`);
}

async function signIn(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    window.localStorage.clear();
  });
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });

  await page.waitForSelector('input[type=email]');
  await setInput(page, 'input[type=email]', email);
  await setInput(page, 'input[type=password]', 'password123');

  await clickEl(page, 'button[type=submit]');
  await page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 15000 });
  await page.waitForFunction(() => !document.body.innerText.includes('Loading dashboard'), { timeout: 15000 });
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));

  console.log(`\n=== UI smoke test against ${BASE} ===\n`);

  /* ---------------------------- employee ---------------------------- */
  console.log('1. Employee sign-in and dashboard');
  await signIn(page, 'employee@company.com');
  await page.screenshot({ path: `${SHOTS}/01-dashboard.png` });
  let body = await text(page);
  check('lands on the dashboard', page.url().includes('/dashboard'));
  check('greets the signed-in user', body.includes('Aarav'));
  check('renders the four stat cards',
    ['Total Requests', 'Pending Requests', 'Approved Requests', 'Rejected Requests']
      .every((label) => body.includes(label)));
  check('recent requests table shows seeded data', body.includes('REQ-'), body.match(/REQ-\d+/)?.[0]);
  check('risk levels render in the table', /HIGH|LOW|MEDIUM/.test(body));

  console.log('\n2. Request detail with timeline and risk');
  await page.goto(`${BASE}/requests`, { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => document.body.innerText.includes('REQ-'), { timeout: 15000 });
  const firstLink = await page.$$eval('a', (as) => {
    const hit = as.find((a) => /\/requests\/\d+$/.test(a.getAttribute('href') || ''));
    return hit ? hit.getAttribute('href') : null;
  });
  check('requests list links to a detail page', Boolean(firstLink), firstLink || '');
  await page.goto(`${BASE}${firstLink}`, { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => !document.body.innerText.includes('Loading request'), { timeout: 15000 });
  await page.screenshot({ path: `${SHOTS}/02-request-detail.png`, fullPage: true });
  body = await text(page);
  check('shows request information', body.includes('Request information'));
  check('shows the risk assessment panel', body.includes('Risk assessment'));
  check('shows the approval timeline', body.includes('Approval timeline'));
  check('shows the audit trail', body.includes('Audit trail'));

  console.log('\n3. Create request - live risk preview');
  await page.goto(`${BASE}/requests/new`, { waitUntil: 'networkidle2' });
  // Wait for the client-rendered preview: proves React has hydrated.
  await page.waitForFunction(() => document.body.innerText.includes('Manager Approval'), { timeout: 20000 });
  await setInput(page, 'input[type=number]', '30000');
  await page.waitForFunction(
    () => document.body.innerText.includes('MANAGER') && document.body.innerText.includes('IT'),
    { timeout: 15000 }
  );
  await page.screenshot({ path: `${SHOTS}/03-new-request-low-risk.png`, fullPage: true });
  body = await text(page);
  check('low-risk preview resolves to Manager then IT',
    body.includes('Manager Approval') && body.includes('IT Verification'));
  check('low-risk preview reports LOW', body.includes('LOW'));

  // Push it into high risk and watch the chain grow.
  await setInput(page, 'input[type=number]', '150000');
  const urgency = await page.$$eval('select', (selects) => selects.length);
  await page.select('select', 'HIGH').catch(() => {});
  await clickEl(page, 'input[type=checkbox]');
  await page.waitForFunction(
    () => document.body.innerText.includes('Director Sign-off'),
    { timeout: 15000 }
  );
  await page.screenshot({ path: `${SHOTS}/04-new-request-high-risk.png`, fullPage: true });
  body = await text(page);
  check('high-risk preview escalates to the four-stage chain',
    ['Manager Approval', 'Finance Review', 'Compliance Review', 'Director Sign-off']
      .every((step) => body.includes(step)));
  check('high-risk preview reports HIGH', body.includes('HIGH'));
  check('risk reasons are listed', body.includes('High amount') || body.includes('New vendor'),
    `${urgency} selects on the form`);

  console.log('\n4. Workflow simulator');
  await page.goto(`${BASE}/simulator`, { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => document.body.innerText.includes('Resulting workflow'), { timeout: 15000 });
  await clickButtonContaining(page, '2,00,000');
  await page.waitForFunction(
    () => document.body.innerText.includes('FINANCE + COMPLIANCE'),
    { timeout: 15000 }
  );
  await page.screenshot({ path: `${SHOTS}/05-simulator-parallel.png`, fullPage: true });
  body = await text(page);
  check('international travel preset resolves to HIGH risk', body.includes('HIGH'));
  check('parallel stage renders as FINANCE + COMPLIANCE', body.includes('FINANCE + COMPLIANCE'));
  check('parallel stage is labelled', has(body, 'Parallel stage'));

  console.log('\n5. Workflow catalogue');
  await page.goto(`${BASE}/workflows`, { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => document.body.innerText.includes('Laptop - Standard Approval'), { timeout: 15000 });
  await page.screenshot({ path: `${SHOTS}/06-workflow-catalogue.png`, fullPage: true });
  body = await text(page);
  const definitionCount = (body.match(/selection rules/gi) || []).length;
  check('lists all ten workflow definitions', definitionCount === 10, `${definitionCount} definitions`);
  check('shows the catch-all fallback', has(body, 'catch-all fallback'));

  /* ---------------------------- approver ---------------------------- */
  console.log('\n6. Manager approval queue and review');
  await signIn(page, 'manager@company.com');
  await page.goto(`${BASE}/approvals`, { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => !document.body.innerText.includes('Loading approval queue'), { timeout: 15000 });
  await page.screenshot({ path: `${SHOTS}/07-approver-queue.png`, fullPage: true });
  body = await text(page);
  check('approver queue lists pending requests', body.includes('REQ-'));
  check('queue shows requester, amount and risk',
    has(body, 'Requester') && has(body, 'Amount') && has(body, 'Risk'));

  const reviewHref = await page.$$eval('a', (as) => {
    const hit = as.find((a) => /\/approvals\/\d+$/.test(a.getAttribute('href') || ''));
    return hit ? hit.getAttribute('href') : null;
  });
  check('queue links to a review page', Boolean(reviewHref), reviewHref || '');

  await page.goto(`${BASE}${reviewHref}`, { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => document.body.innerText.includes('Your decision'), { timeout: 15000 });
  await page.screenshot({ path: `${SHOTS}/08-approval-review.png`, fullPage: true });
  body = await text(page);
  check('review page shows the request under review', body.includes('Request under review'));
  check('review page shows risk factors', body.includes('Risk assessment'));
  check('review page shows the approval workflow', body.includes('Approval workflow'));
  check('review page offers Approve and Reject', body.includes('Approve') && body.includes('Reject'));

  console.log('\n7. Approving through the UI');
  await setInput(page, 'textarea', 'Approved via UI smoke test');
  await clickButton(page, 'Approve');
  await page.waitForFunction(() => document.body.innerText.includes('Step approved'), { timeout: 20000 });
  await page.screenshot({ path: `${SHOTS}/09-after-approval.png`, fullPage: true });
  body = await text(page);
  check('approval confirmation is shown', body.includes('Step approved'));
  check('request status advanced', /IN REVIEW|APPROVED/.test(body));

  /* ----------------------------- errors ----------------------------- */
  console.log('\n8. Browser console');
  const realErrors = consoleErrors.filter(
    (message) =>
      !message.includes('Download the React DevTools') &&
      !message.includes('favicon') &&
      !/404 \(Not Found\)/.test(message)
  );
  check('no uncaught console errors', realErrors.length === 0, realErrors.slice(0, 2).join(' | '));

  await browser.close();
  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  console.log(`Screenshots: ${SHOTS}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('\nUI smoke test crashed:', error);
  process.exit(1);
});
