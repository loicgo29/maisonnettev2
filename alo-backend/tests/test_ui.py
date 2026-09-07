"""
UI Tests - ALO Frontend E2E avec Playwright
Tests l'interface utilisateur: navigation, formulaires, actions, confirmations
"""

import asyncio
from playwright.async_api import async_playwright, expect
import pytest


class TestALOUI:
    """Tests E2E de l'interface utilisateur ALO"""

    BASE_URL = "http://localhost:8000"

    @pytest.fixture
    async def browser_context(self):
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context()
            yield context
            await context.close()
            await browser.close()

    @pytest.mark.asyncio
    async def test_page_loads(self, browser_context):
        """Vérifier que la page charge correctement"""
        page = await browser_context.new_page()
        await page.goto(self.BASE_URL)

        # Vérifier le titre
        title = await page.title()
        assert "ALO" in title

        # Vérifier l'en-tête
        header = await page.locator("header h1").text_content()
        assert "💰 ALO" in header

        # Vérifier les onglets
        dépenses_btn = await page.locator("button", has_text="💸 Dépenses").count()
        periods_btn = await page.locator("button", has_text="📅 Périodes").count()
        assert dépenses_btn == 1
        assert periods_btn == 1

    @pytest.mark.asyncio
    async def test_navigation_tabs(self, browser_context):
        """Tester la navigation entre les onglets"""
        page = await browser_context.new_page()
        await page.goto(self.BASE_URL)

        # Par défaut, Dépenses est actif
        dépenses_section = page.locator("#expenses")
        await expect(dépenses_section).to_have_class("active")

        # Cliquer sur Périodes
        périodes_btn = page.locator("button", has_text="📅 Périodes")
        await périodes_btn.click()

        # Dépenses ne doit plus être actif
        await expect(dépenses_section).not_to_have_class("active")

        # Périodes doit être actif
        périodes_section = page.locator("#periods")
        await expect(périodes_section).to_have_class("active")

        # Revenir à Dépenses
        dépenses_btn = page.locator("button", has_text="💸 Dépenses")
        await dépenses_btn.click()
        await expect(dépenses_section).to_have_class("active")

    @pytest.mark.asyncio
    async def test_add_expense_form_visible(self, browser_context):
        """Vérifier que le formulaire d'ajout de dépense est présent"""
        page = await browser_context.new_page()
        await page.goto(self.BASE_URL)

        # Chercher le formulaire
        form = page.locator("#expense-form")
        await expect(form).to_be_visible()

        # Vérifier les champs
        date_input = form.locator("#exp-date")
        label_input = form.locator("#exp-label")
        amount_input = form.locator("#exp-amount")
        category_select = form.locator("#exp-category")

        await expect(date_input).to_be_visible()
        await expect(label_input).to_be_visible()
        await expect(amount_input).to_be_visible()
        await expect(category_select).to_be_visible()

    @pytest.mark.asyncio
    async def test_add_expense(self, browser_context):
        """Tester l'ajout d'une dépense via le formulaire"""
        page = await browser_context.new_page()
        await page.goto(self.BASE_URL)

        # Remplir le formulaire
        await page.fill("#exp-label", "Supermarché Test UI")
        await page.fill("#exp-amount", "35.75")
        await page.select_option("#exp-category", "alimentation")

        # Soumettre
        submit_btn = page.locator("button[type='submit']")
        await submit_btn.click()

        # Vérifier le message de succès
        success_msg = page.locator("text=✓ Dépense enregistrée")
        await expect(success_msg).to_be_visible()

        # Attendre que la table soit rechargée
        await page.wait_for_timeout(1000)

        # Vérifier que la dépense apparaît dans le tableau
        table = page.locator("text=Supermarché Test UI")
        await expect(table).to_be_visible()

    @pytest.mark.asyncio
    async def test_filter_by_category(self, browser_context):
        """Tester le filtre par catégorie"""
        page = await browser_context.new_page()
        await page.goto(self.BASE_URL)

        # Ajouter une dépense "Alimentation"
        await page.fill("#exp-label", "Lidl")
        await page.fill("#exp-amount", "25.00")
        await page.select_option("#exp-category", "alimentation")
        await page.click("button[type='submit']")
        await page.wait_for_timeout(1000)

        # Ajouter une dépense "Transport"
        await page.fill("#exp-label", "Essence")
        await page.fill("#exp-amount", "60.00")
        await page.select_option("#exp-category", "transport")
        await page.click("button[type='submit']")
        await page.wait_for_timeout(1000)

        # Filtrer par "Transport"
        await page.select_option("#filter-category", "transport")
        await page.wait_for_timeout(500)

        # Vérifier que seules les dépenses Transport apparaissent
        table = page.locator("tbody tr")
        rows = await table.count()

        # Au moins une ligne devrait contenir "Essence"
        essence_row = page.locator("text=Essence")
        await expect(essence_row).to_be_visible()

    @pytest.mark.asyncio
    async def test_delete_expense_confirmation(self, browser_context):
        """Tester la suppression d'une dépense avec confirmation"""
        page = await browser_context.new_page()
        await page.goto(self.BASE_URL)

        # Ajouter une dépense
        await page.fill("#exp-label", "À supprimer")
        await page.fill("#exp-amount", "10.00")
        await page.select_option("#exp-category", "divers")
        await page.click("button[type='submit']")
        await page.wait_for_timeout(1000)

        # Chercher le bouton Supprimer
        delete_btn = page.locator("button:has-text('Supprimer')")
        await expect(delete_btn).to_be_visible()

        # Cliquer sur Supprimer
        await delete_btn.click()

        # Vérifier la modale de confirmation
        modal = page.locator("#confirm-modal")
        await expect(modal).to_have_class("active")

        # Vérifier le titre
        modal_title = page.locator("#modal-title")
        title_text = await modal_title.text_content()
        assert "suppression" in title_text.lower()

        # Confirmer
        confirm_btn = page.locator("button:has-text('Confirmer'):nth-of-type(2)")
        await confirm_btn.click()

        # Attendre la suppression
        await page.wait_for_timeout(1000)

        # Vérifier le message de succès
        success_msg = page.locator("text=✓ Dépense supprimée")
        await expect(success_msg).to_be_visible()

    @pytest.mark.asyncio
    async def test_cancel_delete_confirmation(self, browser_context):
        """Tester l'annulation d'une suppression via la modale"""
        page = await browser_context.new_page()
        await page.goto(self.BASE_URL)

        # Ajouter une dépense
        await page.fill("#exp-label", "Ne pas supprimer")
        await page.fill("#exp-amount", "15.00")
        await page.click("button[type='submit']")
        await page.wait_for_timeout(1000)

        # Cliquer sur Supprimer
        delete_btn = page.locator("button:has-text('Supprimer')")
        await delete_btn.click()

        # Vérifier la modale
        modal = page.locator("#confirm-modal")
        await expect(modal).to_have_class("active")

        # Cliquer Annuler
        cancel_btn = page.locator("button:has-text('Annuler')")
        await cancel_btn.click()

        # Modale doit fermer
        await expect(modal).not_to_have_class("active")

        # La dépense doit toujours être là
        item = page.locator("text=Ne pas supprimer")
        await expect(item).to_be_visible()

    @pytest.mark.asyncio
    async def test_create_period_form_visible(self, browser_context):
        """Vérifier que le formulaire de création de période est présent"""
        page = await browser_context.new_page()
        await page.goto(self.BASE_URL)

        # Aller à l'onglet Périodes
        await page.click("button:has-text('📅 Périodes')")

        # Vérifier le formulaire
        form = page.locator("#period-form")
        await expect(form).to_be_visible()

        # Vérifier les champs
        name_input = form.locator("#period-name")
        start_input = form.locator("#period-start")
        end_input = form.locator("#period-end")

        await expect(name_input).to_be_visible()
        await expect(start_input).to_be_visible()
        await expect(end_input).to_be_visible()

    @pytest.mark.asyncio
    async def test_create_period(self, browser_context):
        """Tester la création d'une période"""
        page = await browser_context.new_page()
        await page.goto(self.BASE_URL)

        # Aller aux Périodes
        await page.click("button:has-text('📅 Périodes')")
        await page.wait_for_timeout(500)

        # Remplir le formulaire
        await page.fill("#period-name", "Juin 2026 Test")
        await page.fill("#period-start", "2026-06-01")
        await page.fill("#period-end", "2026-06-30")

        # Soumettre
        submit_btn = page.locator("button[type='submit']")
        await submit_btn.click()

        # Vérifier le message de succès
        success_msg = page.locator("text=✓ Période créée")
        await expect(success_msg).to_be_visible()

        # Attendre le rechargement
        await page.wait_for_timeout(1000)

        # Vérifier que la période apparaît
        period_name = page.locator("text=Juin 2026 Test")
        await expect(period_name).to_be_visible()

    @pytest.mark.asyncio
    async def test_periods_table_columns(self, browser_context):
        """Vérifier que le tableau des périodes a les bonnes colonnes"""
        page = await browser_context.new_page()
        await page.goto(self.BASE_URL)

        # Aller aux Périodes
        await page.click("button:has-text('📅 Périodes')")
        await page.wait_for_timeout(500)

        # Vérifier les en-têtes du tableau
        headers = page.locator("th")
        header_text = await headers.all_text_contents()

        assert any("Nom" in h for h in header_text)
        assert any("Période" in h for h in header_text)
        assert any("Statut" in h for h in header_text)
        assert any("Total" in h for h in header_text)
        assert any("Adulte" in h for h in header_text)

    @pytest.mark.asyncio
    async def test_freeze_period_confirmation(self, browser_context):
        """Tester le gel d'une période avec confirmation"""
        page = await browser_context.new_page()
        await page.goto(self.BASE_URL)

        # Aller aux Périodes
        await page.click("button:has-text('📅 Périodes')")
        await page.wait_for_timeout(500)

        # Créer une période
        await page.fill("#period-name", "À geler")
        await page.fill("#period-start", "2026-07-01")
        await page.fill("#period-end", "2026-07-31")
        await page.click("button[type='submit']")
        await page.wait_for_timeout(1000)

        # Trouver le bouton Geler
        freeze_btn = page.locator("button:has-text('Geler')")
        await expect(freeze_btn).to_be_visible()

        # Cliquer
        await freeze_btn.click()

        # Vérifier la modale de confirmation
        modal = page.locator("#confirm-modal")
        await expect(modal).to_have_class("active")

        modal_title = page.locator("#modal-title")
        title_text = await modal_title.text_content()
        assert "gel" in title_text.lower()

        # Confirmer
        confirm_btn = page.locator("button:has-text('Confirmer'):nth-of-type(2)")
        await confirm_btn.click()

        # Attendre
        await page.wait_for_timeout(1500)

        # Vérifier le message de succès
        success_msg = page.locator("text=✓ Période gelée")
        await expect(success_msg).to_be_visible()

    @pytest.mark.asyncio
    async def test_frozen_period_has_export_button(self, browser_context):
        """Vérifier qu'une période gelée a un bouton Exporter"""
        page = await browser_context.new_page()
        await page.goto(self.BASE_URL)

        # Aller aux Périodes
        await page.click("button:has-text('📅 Périodes')")
        await page.wait_for_timeout(500)

        # Créer une période
        await page.fill("#period-name", "Exporter Test")
        await page.fill("#period-start", "2026-08-01")
        await page.fill("#period-end", "2026-08-31")
        await page.click("button[type='submit']")
        await page.wait_for_timeout(1000)

        # Geler
        freeze_btn = page.locator("button:has-text('Geler')")
        await freeze_btn.click()

        # Confirmer
        confirm_btn = page.locator("button:has-text('Confirmer'):nth-of-type(2)")
        await confirm_btn.click()
        await page.wait_for_timeout(1500)

        # Vérifier que le bouton Exporter apparaît
        export_btn = page.locator("button:has-text('Exporter')")
        await expect(export_btn).to_be_visible()

    @pytest.mark.asyncio
    async def test_details_collapsible(self, browser_context):
        """Tester que les formulaires en <details> sont collapsibles"""
        page = await browser_context.new_page()
        await page.goto(self.BASE_URL)

        # Vérifier que le formulaire est dans un <details>
        details = page.locator("details")
        count = await details.count()
        assert count >= 1, "Au moins un élément <details> devrait être présent"

        # Cliquer sur le premier <details> pour l'ouvrir/fermer
        summary = details.first.locator("summary")

        # Vérifier qu'on peut cliquer
        await summary.click()
        await page.wait_for_timeout(300)

        # Le <details> devrait être "open"
        is_open = await details.first.evaluate("el => el.open")
        assert is_open

    @pytest.mark.asyncio
    async def test_date_fields_default_to_today(self, browser_context):
        """Vérifier que le champ date par défaut est aujourd'hui"""
        page = await browser_context.new_page()
        await page.goto(self.BASE_URL)

        # Vérifier le champ date du formulaire dépense
        date_input = page.locator("#exp-date")
        date_value = await date_input.input_value()

        # La date ne doit pas être vide
        assert date_value != ""
        assert len(date_value) == 10  # Format YYYY-MM-DD

    @pytest.mark.asyncio
    async def test_amount_input_accepts_decimals(self, browser_context):
        """Tester que le champ montant accepte les décimales"""
        page = await browser_context.new_page()
        await page.goto(self.BASE_URL)

        # Entrer un montant avec décimales
        amount_input = page.locator("#exp-amount")
        await amount_input.fill("123.45")

        value = await amount_input.input_value()
        assert "123.45" in value or "123,45" in value

    @pytest.mark.asyncio
    async def test_responsive_layout(self, browser_context):
        """Tester que la mise en page est responsive"""
        page = await browser_context.new_page()

        # Desktop view
        await page.set_viewport_size({"width": 1200, "height": 800})
        await page.goto(self.BASE_URL)

        header = page.locator("header")
        await expect(header).to_be_visible()

        # Mobile view
        await page.set_viewport_size({"width": 375, "height": 667})
        await page.wait_for_timeout(300)

        # Les éléments doivent rester visibles
        nav = page.locator(".nav")
        await expect(nav).to_be_visible()


def run_async_test(coro):
    """Helper pour exécuter les tests async"""
    return asyncio.run(coro)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])
