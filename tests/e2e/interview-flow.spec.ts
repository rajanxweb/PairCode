import { test, expect } from '@playwright/test';

test.describe('PairCode End-to-End Interview Workflow', () => {
  test('Landing Page renders refined developer-tool aesthetic and navigation', async ({ page }) => {
    await page.goto('/');

    // Check title and primary branding
    await expect(page).toHaveTitle(/PairCode/);
    await expect(page.locator('h1')).toContainText('Think together. Code together. Interview better.');

    // Check primary actions
    await expect(page.locator('text=Start an interview').first()).toBeVisible();
    await expect(page.locator('text=Browse questions').first()).toBeVisible();
  });

  test('Question Bank displays problems with filters and details', async ({ page }) => {
    await page.goto('/questions');

    // Verify question list loads
    await expect(page.locator('text=Two Sum')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Valid Anagram')).toBeVisible();

    // Click on Two Sum to view details
    await page.click('text=Two Sum');
    await expect(page).toHaveURL(/.*questions\/two-sum/);
    await expect(page.locator('h1')).toContainText('Two Sum');
    await expect(page.locator('text=Constraints')).toBeVisible();
    await expect(page.locator('text=Sample Test Cases')).toBeVisible();
  });

  test('Interviewer and Candidate multi-user session lifecycle', async ({ browser }) => {
    // Context 1: Interviewer (Browser Window 1)
    const interviewerContext = await browser.newContext();
    const interviewerPage = await interviewerContext.newPage();

    await interviewerPage.goto('/dashboard');
    await expect(interviewerPage.locator('text=Interviewer Dashboard')).toBeVisible();

    // Open interview creation page
    await interviewerPage.goto('/interviews/new');
    await expect(interviewerPage.locator('text=Schedule a New Interview')).toBeVisible();

    // Fill interview form
    await interviewerPage.fill('input[placeholder*="Senior Backend Engineer"]', 'Staff Full-Stack Loop');
    await interviewerPage.click('button:has-text("Create Interview Room")');

    // Wait for post-creation invitation dialog
    await expect(interviewerPage.locator('text=Candidate Invitation Link')).toBeVisible({ timeout: 10000 });

    const inviteUrlInput = interviewerPage.locator('input[readonly]');
    const inviteUrl = await inviteUrlInput.inputValue();
    expect(inviteUrl).toContain('/join/');

    // Context 2: Candidate in an isolated second browser context
    const candidateContext = await browser.newContext();
    const candidatePage = await candidateContext.newPage();

    await candidatePage.goto(inviteUrl);
    await expect(candidatePage.locator('text=PairCode Interview Invitation')).toBeVisible();

    // Clean up contexts
    await interviewerContext.close();
    await candidateContext.close();
  });
});

