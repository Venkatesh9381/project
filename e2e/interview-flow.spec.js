import { test, expect } from '@playwright/test';

test('candidate can register, review answers, resume and complete an interview', async ({ page }) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `browser-${suffix}@example.test`;
  const password = 'InterviewOS-browser-test-2026';

  await page.goto('/');
  await page.locator('.auth-switch button').click();
  await page.getByLabel('Your name').fill('Browser Test Candidate');
  await page.getByLabel('Email address').fill(email);
  await page.getByPlaceholder('At least 10 characters').fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();

  await expect(page.getByRole('heading', { name: /Good afternoon/ })).toBeVisible();
  await page.getByRole('button', { name: 'Mock interview' }).click();
  await page.getByLabel('Target role').fill('QA Automation Engineer');
  await page.getByLabel('Number of questions').selectOption('3');
  await page.getByRole('button', { name: /Start practice session/ }).click();

  const questionOne = await page.locator('.question-panel h2').innerText();
  const answerOne = 'I would build a reliable automation framework by separating test data, page objects, assertions, and reporting.';
  await page.locator('#answer').fill(answerOne);
  await page.getByRole('button', { name: 'Review my answer' }).click();
  await expect(page.locator('.feedback-card')).toBeVisible();
  await expect(page.locator('.feedback-card .eyebrow')).toContainText('FEEDBACK');

  // A browser reload must not lose the saved question, answer or feedback.
  await page.reload();
  await page.getByRole('button', { name: 'Interview history' }).click();
  await expect(page.getByRole('button', { name: 'Resume interview' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume interview' }).click();
  await expect(page.locator('.question-panel h2')).toHaveText(questionOne);
  await expect(page.locator('#answer')).toHaveValue(answerOne);
  await expect(page.locator('.feedback-card')).toBeVisible();

  // Moving forward persists the next question position as well.
  await page.getByRole('button', { name: 'Next question' }).click();
  await expect(page.locator('.question-panel .label-pill')).toContainText('QUESTION 2');
  await page.reload();
  await page.getByRole('button', { name: 'Interview history' }).click();
  await page.getByRole('button', { name: 'Resume interview' }).click();
  await expect(page.locator('.question-panel .label-pill')).toContainText('QUESTION 2');

  const answerTwo = 'I investigate flaky tests by checking timing, test data, environment stability, logs, and reproducibility.';
  await page.locator('#answer').fill(answerTwo);
  await page.getByRole('button', { name: 'Review my answer' }).click();
  await expect(page.locator('.feedback-card')).toBeVisible();
  await page.getByRole('button', { name: 'Next question' }).click();
  await expect(page.locator('.question-panel .label-pill')).toContainText('QUESTION 3');

  const answerThree = 'I validate critical API workflows with positive, negative, boundary, authorization, and persistence tests.';
  await page.locator('#answer').fill(answerThree);
  await page.getByRole('button', { name: 'Review my answer' }).click();
  await expect(page.locator('.feedback-card')).toBeVisible();
  await page.getByRole('button', { name: 'Finish interview' }).click();

  await expect(page.getByRole('heading', { name: /Good afternoon/ })).toBeVisible();
  await page.getByRole('button', { name: 'Interview history' }).click();
  const completedRow = page.getByRole('row').filter({ hasText: 'QA Automation Engineer' });
  await expect(completedRow).toContainText('Completed');
});
