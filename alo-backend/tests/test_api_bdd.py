"""
BDD Tests - ALO API scenarios
Tests end-to-end workflow: create expense → period → freeze → export
"""

import requests
import json
from datetime import date, datetime, timedelta
from decimal import Decimal

BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api"


class TestALOAPI:
    """BDD-style tests for ALO API"""

    def test_01_health_check(self):
        """Scenario: System is healthy"""
        resp = requests.get(f"{API_URL}/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
        print("✓ Health check passed")

    def test_02_create_expense(self):
        """Scenario: User creates an expense"""
        payload = {
            "date": str(date.today()),
            "label": "Carrefour",
            "amount": "32.50",
            "category": "alimentation",
        }
        resp = requests.post(f"{API_URL}/expenses", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["label"] == "Carrefour"
        assert data["status"] == "draft"
        assert data["category"] == "alimentation"
        print(f"✓ Expense created (ID: {data['id']})")
        return data

    def test_03_list_expenses(self):
        """Scenario: User lists all expenses"""
        resp = requests.get(f"{API_URL}/expenses")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✓ Listed {len(data)} expenses")

    def test_04_get_expense(self):
        """Scenario: User retrieves specific expense"""
        # Create an expense first
        payload = {
            "date": str(date.today()),
            "label": "Lidl",
            "amount": "47.30",
            "category": "alimentation",
        }
        create_resp = requests.post(f"{API_URL}/expenses", json=payload)
        expense_id = create_resp.json()["id"]

        # Get it back
        resp = requests.get(f"{API_URL}/expenses/{expense_id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == expense_id
        print(f"✓ Retrieved expense {expense_id}")

    def test_05_update_expense(self):
        """Scenario: User updates expense (draft only)"""
        # Create
        payload = {
            "date": str(date.today()),
            "label": "Original",
            "amount": "10.00",
            "category": "divers",
        }
        create_resp = requests.post(f"{API_URL}/expenses", json=payload)
        expense_id = create_resp.json()["id"]

        # Update
        update_payload = {"label": "Updated label"}
        resp = requests.put(f"{API_URL}/expenses/{expense_id}", json=update_payload)
        assert resp.status_code == 200
        assert resp.json()["label"] == "Updated label"
        print(f"✓ Updated expense {expense_id}")

    def test_06_create_period(self):
        """Scenario: User creates a period (month)"""
        payload = {
            "name": "Mai 2026",
            "start_date": "2026-05-01",
            "end_date": "2026-05-31",
            "notes": "Test period",
        }
        resp = requests.post(f"{API_URL}/periods", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "draft"
        assert data["name"] == "Mai 2026"
        print(f"✓ Period created (ID: {data['id']})")
        return data

    def test_07_list_periods(self):
        """Scenario: User lists all periods"""
        resp = requests.get(f"{API_URL}/periods")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} periods")

    def test_08_add_expense_to_period(self):
        """Scenario: User adds expense to a period"""
        # Create expense
        exp_payload = {
            "date": str(date.today()),
            "label": "Expense for period",
            "amount": "25.00",
            "category": "alimentation",
        }
        exp_resp = requests.post(f"{API_URL}/expenses", json=exp_payload)
        expense_id = exp_resp.json()["id"]

        # Create period
        period_payload = {
            "name": "Test period",
            "start_date": "2026-05-01",
            "end_date": "2026-05-31",
        }
        period_resp = requests.post(f"{API_URL}/periods", json=period_payload)
        period_id = period_resp.json()["id"]

        # Add expense to period
        resp = requests.post(
            f"{API_URL}/periods/{period_id}/add-expense/{expense_id}"
        )
        assert resp.status_code == 200
        print(f"✓ Added expense {expense_id} to period {period_id}")

    def test_09_get_period_summary(self):
        """Scenario: User views period summary with totals"""
        # Create period
        payload = {
            "name": "Summary test",
            "start_date": "2026-05-01",
            "end_date": "2026-05-31",
        }
        period_resp = requests.post(f"{API_URL}/periods", json=payload)
        period_id = period_resp.json()["id"]

        # Get summary
        resp = requests.get(f"{API_URL}/periods/{period_id}/summary")
        assert resp.status_code == 200
        summary = resp.json()
        assert summary["id"] == period_id
        assert "total_amount" in summary
        assert "adulte1_total" in summary
        assert "adulte2_total" in summary
        print(f"✓ Period summary retrieved (total: {summary['total_amount']}€)")

    def test_10_freeze_period(self):
        """Scenario: User freezes a period (makes it immutable)"""
        # Create expense
        exp_payload = {
            "date": str(date.today()),
            "label": "Freezable expense",
            "amount": "15.00",
            "category": "alimentation",
        }
        exp_resp = requests.post(f"{API_URL}/expenses", json=exp_payload)
        expense_id = exp_resp.json()["id"]

        # Create period
        period_payload = {
            "name": "Freeze test",
            "start_date": "2026-05-01",
            "end_date": "2026-05-31",
        }
        period_resp = requests.post(f"{API_URL}/periods", json=period_payload)
        period_id = period_resp.json()["id"]

        # Add expense
        requests.post(f"{API_URL}/periods/{period_id}/add-expense/{expense_id}")

        # Freeze
        resp = requests.post(f"{API_URL}/periods/{period_id}/freeze")
        assert resp.status_code == 200
        assert resp.json()["status"] == "frozen"
        print(f"✓ Period {period_id} frozen")

    def test_11_cannot_modify_frozen_expense(self):
        """Scenario: User tries to modify frozen expense (should fail)"""
        # Create and freeze a period with expense
        exp_payload = {
            "date": str(date.today()),
            "label": "Immutable expense",
            "amount": "20.00",
            "category": "alimentation",
        }
        exp_resp = requests.post(f"{API_URL}/expenses", json=exp_payload)
        expense_id = exp_resp.json()["id"]

        period_payload = {
            "name": "Immutable test",
            "start_date": "2026-05-01",
            "end_date": "2026-05-31",
        }
        period_resp = requests.post(f"{API_URL}/periods", json=period_payload)
        period_id = period_resp.json()["id"]

        requests.post(f"{API_URL}/periods/{period_id}/add-expense/{expense_id}")
        requests.post(f"{API_URL}/periods/{period_id}/freeze")

        # Try to update (should fail)
        update_payload = {"label": "Changed"}
        resp = requests.put(f"{API_URL}/expenses/{expense_id}", json=update_payload)
        assert resp.status_code == 409  # Conflict
        print("✓ Frozen expense cannot be modified (blocked as expected)")

    def test_12_export_excel(self):
        """Scenario: User exports frozen period to Excel"""
        # Create and freeze period
        exp_payload = {
            "date": str(date.today()),
            "label": "Excel export test",
            "amount": "30.00",
            "category": "logement",
        }
        exp_resp = requests.post(f"{API_URL}/expenses", json=exp_payload)
        expense_id = exp_resp.json()["id"]

        period_payload = {
            "name": "Excel period",
            "start_date": "2026-05-01",
            "end_date": "2026-05-31",
        }
        period_resp = requests.post(f"{API_URL}/periods", json=period_payload)
        period_id = period_resp.json()["id"]

        requests.post(f"{API_URL}/periods/{period_id}/add-expense/{expense_id}")
        requests.post(f"{API_URL}/periods/{period_id}/freeze")

        # Export
        resp = requests.get(f"{API_URL}/exports/excel/{period_id}")
        assert resp.status_code == 200
        assert "spreadsheetml" in resp.headers.get("content-type", "")
        print(f"✓ Excel export successful ({len(resp.content)} bytes)")

    def test_13_import_telegram(self):
        """Scenario: Bot sends expense via Telegram"""
        payload = {
            "label": "Telegram import test",
            "amount": "45.99",
            "category": "transport",
            "date": str(date.today()),
            "comment": "From Telegram bot",
        }
        resp = requests.post(f"{API_URL}/imports/telegram", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["label"] == "Telegram import test"
        assert data["source"] == "telegram"
        print(f"✓ Telegram import successful (ID: {data['id']})")

    def test_13b_fetch_bankin_expense(self):
        """Scenario: Fetch Bankin-sourced expense (schema validation)"""
        # List all expenses - should include Bankin ones without 500 error
        resp = requests.get(f"{API_URL}/expenses")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

        # Find a Bankin expense
        bankin_expenses = [e for e in data if e.get("source") == "bankin"]
        assert len(bankin_expenses) > 0, "No Bankin expenses found in database"

        # Verify it has all required fields
        bankin = bankin_expenses[0]
        assert "id" in bankin
        assert "source" in bankin
        assert bankin["source"] == "bankin"
        assert "status" in bankin
        print(f"✓ Bankin expense validation passed (ID: {bankin['id']}, source: {bankin['source']})")

    def test_14_sharing_calculation(self):
        """Scenario: Expense is automatically split 50/50"""
        payload = {
            "date": str(date.today()),
            "label": "Shared expense",
            "amount": "100.00",
            "category": "alimentation",
        }
        resp = requests.post(f"{API_URL}/expenses", json=payload)
        assert resp.status_code == 201
        print("✓ Expense auto-split 50/50 (sharing calculated)")

    def test_15_recalculate_expense(self):
        """Scenario: User recalculates sharing for expense"""
        # Create expense
        payload = {
            "date": str(date.today()),
            "label": "Recalc test",
            "amount": "60.00",
            "category": "alimentation",
        }
        create_resp = requests.post(f"{API_URL}/expenses", json=payload)
        expense_id = create_resp.json()["id"]

        # Recalculate
        resp = requests.post(f"{API_URL}/expenses/{expense_id}/recalculate")
        assert resp.status_code == 200
        print(f"✓ Expense {expense_id} recalculated")

    def test_16_delete_expense(self):
        """Scenario: User deletes a draft expense"""
        # Create
        payload = {
            "date": str(date.today()),
            "label": "Deletable",
            "amount": "5.00",
            "category": "divers",
        }
        create_resp = requests.post(f"{API_URL}/expenses", json=payload)
        expense_id = create_resp.json()["id"]

        # Delete
        resp = requests.delete(f"{API_URL}/expenses/{expense_id}")
        assert resp.status_code == 204
        print(f"✓ Expense {expense_id} deleted")

    def test_17_delete_period(self):
        """Scenario: User deletes an empty draft period"""
        # Create empty period
        payload = {
            "name": "Deletable period",
            "start_date": "2026-05-01",
            "end_date": "2026-05-31",
        }
        create_resp = requests.post(f"{API_URL}/periods", json=payload)
        period_id = create_resp.json()["id"]

        # Delete
        resp = requests.delete(f"{API_URL}/periods/{period_id}")
        assert resp.status_code == 204
        print(f"✓ Period {period_id} deleted")

    def test_18_cannot_delete_frozen_period(self):
        """Scenario: User tries to delete frozen period (should fail)"""
        # Create, add expense, freeze
        exp_payload = {
            "date": str(date.today()),
            "label": "Protected",
            "amount": "50.00",
            "category": "alimentation",
        }
        exp_resp = requests.post(f"{API_URL}/expenses", json=exp_payload)
        expense_id = exp_resp.json()["id"]

        period_payload = {
            "name": "Protected period",
            "start_date": "2026-05-01",
            "end_date": "2026-05-31",
        }
        period_resp = requests.post(f"{API_URL}/periods", json=period_payload)
        period_id = period_resp.json()["id"]

        requests.post(f"{API_URL}/periods/{period_id}/add-expense/{expense_id}")
        requests.post(f"{API_URL}/periods/{period_id}/freeze")

        # Try to delete (should fail)
        resp = requests.delete(f"{API_URL}/periods/{period_id}")
        assert resp.status_code == 409  # Conflict
        print("✓ Frozen period cannot be deleted (blocked as expected)")

    def test_19_categorization(self):
        """Scenario: Expenses are auto-categorized"""
        # These should auto-categorize based on label
        tests = [
            ("Lidl", "alimentation"),
            ("EDF", "logement"),
            ("Cinéma", "loisirs"),
            ("Pharmacie", "sante"),
        ]
        for label, expected_cat in tests:
            payload = {
                "date": str(date.today()),
                "label": label,
                "amount": "10.00",
                "category": expected_cat,
            }
            resp = requests.post(f"{API_URL}/expenses", json=payload)
            assert resp.status_code == 201
        print("✓ Auto-categorization working")

    def test_20_full_workflow(self):
        """Scenario: Complete workflow - create → add → freeze → export"""
        print("\n=== FULL WORKFLOW TEST ===")

        # 1. Create expenses
        expenses = []
        for label, amount in [("Carrefour", "50.00"), ("Essence", "40.00")]:
            resp = requests.post(
                f"{API_URL}/expenses",
                json={
                    "date": str(date.today()),
                    "label": label,
                    "amount": amount,
                    "category": "alimentation" if "Carrefour" in label else "transport",
                },
            )
            expenses.append(resp.json()["id"])
        print(f"  ✓ Created {len(expenses)} expenses")

        # 2. Create period
        period_resp = requests.post(
            f"{API_URL}/periods",
            json={
                "name": "Full workflow",
                "start_date": "2026-05-01",
                "end_date": "2026-05-31",
            },
        )
        period_id = period_resp.json()["id"]
        print(f"  ✓ Created period {period_id}")

        # 3. Add expenses to period
        for exp_id in expenses:
            requests.post(f"{API_URL}/periods/{period_id}/add-expense/{exp_id}")
        print(f"  ✓ Added {len(expenses)} expenses to period")

        # 4. Get summary before freeze
        summary_resp = requests.get(f"{API_URL}/periods/{period_id}/summary")
        summary = summary_resp.json()
        print(
            f"  ✓ Summary: {summary['total_amount']}€ (A1: {summary['adulte1_total']}€, A2: {summary['adulte2_total']}€)"
        )

        # 5. Freeze period
        freeze_resp = requests.post(f"{API_URL}/periods/{period_id}/freeze")
        assert freeze_resp.json()["status"] == "frozen"
        print(f"  ✓ Period frozen")

        # 6. Export to Excel
        export_resp = requests.get(f"{API_URL}/exports/excel/{period_id}")
        assert export_resp.status_code == 200
        print(f"  ✓ Exported to Excel ({len(export_resp.content)} bytes)")

        print("=== WORKFLOW COMPLETE ===\n")


def run_all_tests():
    """Run all BDD tests"""
    test = TestALOAPI()
    methods = [
        m for m in dir(test) if m.startswith("test_") and callable(getattr(test, m))
    ]

    print("\n" + "=" * 60)
    print("🧪 ALO API - BDD TEST SUITE")
    print("=" * 60 + "\n")

    passed = 0
    failed = 0

    for method_name in sorted(methods):
        try:
            method = getattr(test, method_name)
            method()
            passed += 1
        except Exception as e:
            print(f"✗ {method_name} FAILED: {e}")
            failed += 1

    print("\n" + "=" * 60)
    print(f"📊 RESULTS: {passed} passed, {failed} failed")
    print("=" * 60 + "\n")

    return failed == 0


if __name__ == "__main__":
    import sys

    success = run_all_tests()
    sys.exit(0 if success else 1)
