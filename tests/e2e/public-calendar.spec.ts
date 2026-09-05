import { test, expect } from '@playwright/test';

test.describe('Page d\'accueil - Calendrier public', () => {
	test('affiche la section Consulter les disponibilités', async ({ page }) => {
		await page.goto('http://localhost:8030/');

		// Vérifier que le bouton existe
		const button = page.locator('button:has-text("Consulter les disponibilités")');
		await expect(button).toBeVisible();
	});

	test('affiche le calendrier public après clic', async ({ page }) => {
		await page.goto('http://localhost:8030/');

		// Cliquer sur le bouton
		const button = page.locator('button:has-text("Consulter les disponibilités")');
		await button.click();

		// Attendre le calendrier et les données
		await page.waitForTimeout(2000);

		// Vérifier que le titre du calendrier apparaît
		const calendarTitle = page.locator('h2:has-text("Calendrier de disponibilité")');
		await expect(calendarTitle).toBeVisible();
	});

	test('charge les événements du calendrier public', async ({ page }) => {
		await page.goto('http://localhost:8030/');

		// Cliquer sur le bouton
		const button = page.locator('button:has-text("Consulter les disponibilités")');
		await button.click();

		// Attendre le chargement
		await page.waitForTimeout(2000);

		// Vérifier que les événements s'affichent
		const eventList = page.locator('h3:has-text("Événements à venir")');
		await expect(eventList).toBeVisible();

		// Vérifier qu'il y a au moins un événement
		const events = page.locator('.event-item');
		const count = await events.count();
		expect(count).toBeGreaterThan(0);
	});

	test('affiche la grille de calendrier avec les jours', async ({ page }) => {
		await page.goto('http://localhost:8030/');

		// Cliquer sur le bouton
		const button = page.locator('button:has-text("Consulter les disponibilités")');
		await button.click();

		// Attendre le rendu
		await page.waitForTimeout(2000);

		// Vérifier la présence de la grille
		const grid = page.locator('.days-grid');
		await expect(grid).toBeVisible();

		// Vérifier qu'il y a des jours affichés
		const days = page.locator('.day:not(.empty)');
		const dayCount = await days.count();
		expect(dayCount).toBeGreaterThan(0);
	});

	test('affiche les boutons de navigation du mois', async ({ page }) => {
		await page.goto('http://localhost:8030/');

		// Cliquer sur le bouton
		const button = page.locator('button:has-text("Consulter les disponibilités")');
		await button.click();

		// Attendre le rendu
		await page.waitForTimeout(2000);

		// Vérifier la grille du calendrier
		const grid = page.locator('.days-grid');
		await expect(grid).toBeVisible();
	});

	test('change de mois avec les boutons', async ({ page }) => {
		await page.goto('http://localhost:8030/');

		// Cliquer sur le bouton de disponibilités
		const button = page.locator('button:has-text("Consulter les disponibilités")');
		await button.click();

		// Attendre le rendu
		await page.waitForTimeout(2000);

		// Récupérer le mois actuel
		const calendarHeader = page.locator('.calendar-header h3').first();
		const monthBefore = await calendarHeader.textContent();

		// Cliquer sur le bouton suivant
		const nextButton = page.locator('.calendar-header button').nth(1);
		await nextButton.click();

		// Attendre le changement
		await page.waitForTimeout(500);

		// Vérifier que le mois a changé
		const monthAfter = await calendarHeader.textContent();
		expect(monthAfter).not.toBe(monthBefore);
	});
});
