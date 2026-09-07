"""
UI Tests simples - ALO Frontend E2E avec Playwright
"""

import pytest
from playwright.async_api import async_playwright


BASE_URL = "http://localhost:8000"


@pytest.mark.asyncio
async def test_page_loads():
    """Vérifier que la page charge"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(BASE_URL)
        title = await page.title()
        assert "ALO" in title
        await browser.close()


@pytest.mark.asyncio
async def test_navigation():
    """Test navigation entre onglets"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(BASE_URL)
        await page.click("button:has-text('Périodes')")
        await page.wait_for_timeout(500)
        periods_visible = await page.locator("#periods").is_visible()
        assert periods_visible
        await browser.close()


@pytest.mark.asyncio
async def test_add_expense():
    """Ajouter une dépense via le formulaire"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(BASE_URL)
        await page.click("details summary")
        await page.wait_for_timeout(300)
        await page.fill("#exp-label", "Test Dépense")
        await page.fill("#exp-amount", "42.50")
        await page.select_option("#exp-category", "alimentation")
        await page.click("button[type='submit']")
        await page.wait_for_timeout(1500)
        success = await page.text_content("#expenses-message")
        assert success and "✓" in success
        await browser.close()


@pytest.mark.asyncio
async def test_create_period():
    """Créer une nouvelle période"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(BASE_URL)
        await page.click("button:has-text('Périodes')")
        await page.wait_for_timeout(500)
        await page.click("details summary")
        await page.wait_for_timeout(300)
        await page.fill("#period-name", "Test Période")
        await page.fill("#period-start", "2026-07-01")
        await page.fill("#period-end", "2026-07-31")
        await page.click("#period-form button[type='submit']")
        await page.wait_for_timeout(1500)
        msg = await page.text_content("#periods-message")
        assert msg and "✓" in msg
        await browser.close()


@pytest.mark.asyncio
async def test_filter_category():
    """Filtrer les dépenses par catégorie"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(BASE_URL)
        await page.click("details summary")
        await page.wait_for_timeout(300)
        await page.fill("#exp-label", "Lidl")
        await page.fill("#exp-amount", "30.00")
        await page.select_option("#exp-category", "alimentation")
        await page.click("button[type='submit']")
        await page.wait_for_timeout(1000)
        await page.select_option("#filter-category", "alimentation")
        await page.wait_for_timeout(500)
        table = await page.text_content("table")
        assert table is not None
        await browser.close()


@pytest.mark.asyncio
async def test_delete_expense():
    """Supprimer une dépense"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(BASE_URL)
        await page.click("details summary")
        await page.wait_for_timeout(300)
        await page.fill("#exp-label", "A supprimer")
        await page.fill("#exp-amount", "10.00")
        await page.click("button[type='submit']")
        await page.wait_for_timeout(1000)
        delete_btn = await page.query_selector("button:has-text('Supprimer')")
        if delete_btn:
            await delete_btn.click()
            await page.wait_for_timeout(500)
            confirm = await page.query_selector("button:has-text('Confirmer')")
            if confirm:
                await confirm.click()
                await page.wait_for_timeout(1000)
        await browser.close()


@pytest.mark.asyncio
async def test_modal_appears():
    """Modale de confirmation apparaît"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(BASE_URL)
        await page.click("details summary")
        await page.wait_for_timeout(300)
        await page.fill("#exp-label", "Test Modal")
        await page.fill("#exp-amount", "10.00")
        await page.click("button[type='submit']")
        await page.wait_for_timeout(1000)
        delete_btn = await page.query_selector("button:has-text('Supprimer')")
        if delete_btn:
            await delete_btn.click()
            await page.wait_for_timeout(500)
            modal_visible = await page.locator("#confirm-modal").is_visible()
            assert modal_visible
            cancel = await page.query_selector("button:has-text('Annuler')")
            if cancel:
                await cancel.click()
        await browser.close()
