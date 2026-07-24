import { test, expect } from '@playwright/test';

const publicRoutes = [
  '/', '/consultation/', '/consultation/confirmation/', '/consultation/booking-confirmation/',
  '/client-support/', '/client-support/confirmation/', '/careers/', '/careers/opportunities/',
  '/careers/process/', '/careers/apply/', '/careers/confirmation/', '/contact/',
  '/contact/confirmation/', '/privacy/', '/terms/', '/disclaimer/', '/cookies/', '/system-error.html'
];

test('all configured public routes return a non-error document status', async ({ request }) => {
  for (const route of publicRoutes) {
    const response = await request.get(route, { maxRedirects: 5 });
    expect(response.status(), `${route} returned ${response.status()}`).toBeLessThan(400);
    expect((response.headers()['content-type'] || '').toLowerCase(), `${route} content type`).toContain('text/html');
  }
});
