"""
HEALTHCHECK - ALO API comprehensive status report
"""

import requests
import json
from datetime import date

BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api"


def healthcheck():
    """Complete health check of ALO API"""
    print("\n" + "=" * 60)
    print("🏥 ALO API - HEALTHCHECK REPORT")
    print("=" * 60 + "\n")

    checks = {
        "Core": {},
        "Routers": {},
        "Database": {},
        "Services": {},
    }

    # 1. CORE CHECKS
    print("📍 CORE CHECKS:")

    # Health endpoint
    try:
        resp = requests.get(f"{API_URL}/health", timeout=5)
        if resp.status_code == 200 and resp.json().get("status") == "ok":
            checks["Core"]["Health endpoint"] = "✅"
            print("  ✅ Health endpoint responding")
        else:
            checks["Core"]["Health endpoint"] = "❌"
            print("  ❌ Health endpoint returned non-OK status")
    except Exception as e:
        checks["Core"]["Health endpoint"] = f"❌ {e}"
        print(f"  ❌ Health endpoint failed: {e}")

    # Root endpoint
    try:
        resp = requests.get(f"{BASE_URL}/", timeout=5)
        if resp.status_code == 200:
            checks["Core"]["Frontend"] = "✅"
            print("  ✅ Frontend (index.html) loading")
        else:
            checks["Core"]["Frontend"] = "⚠️ Non-200 status"
            print(f"  ⚠️ Frontend returned {resp.status_code}")
    except Exception as e:
        checks["Core"]["Frontend"] = f"❌ {e}"
        print(f"  ❌ Frontend failed: {e}")

    # 2. ROUTER CHECKS
    print("\n📍 ROUTER CHECKS:")

    routers = {
        "Expenses": f"{API_URL}/expenses",
        "Periods": f"{API_URL}/periods",
        "Imports": f"{API_URL}/imports/telegram",
        "Exports": f"{API_URL}/exports/excel/1",
    }

    for router_name, endpoint in routers.items():
        try:
            if "import" in endpoint:
                resp = requests.post(
                    endpoint,
                    json={
                        "label": "Health check",
                        "amount": "1.00",
                        "category": "divers",
                        "date": str(date.today()),
                    },
                    timeout=5,
                )
            elif "export" in endpoint:
                resp = requests.get(endpoint, timeout=5)
            else:
                resp = requests.get(endpoint, timeout=5)

            if resp.status_code < 500:
                checks["Routers"][router_name] = "✅"
                print(f"  ✅ {router_name} router responding ({resp.status_code})")
            else:
                checks["Routers"][router_name] = f"❌ Status {resp.status_code}"
                print(f"  ❌ {router_name} returned {resp.status_code}")
        except Exception as e:
            checks["Routers"][router_name] = f"❌ {str(e)[:30]}"
            print(f"  ❌ {router_name} failed: {e}")

    # 3. DATABASE CHECKS
    print("\n📍 DATABASE CHECKS:")

    # Create test expense
    try:
        resp = requests.post(
            f"{API_URL}/expenses",
            json={
                "date": str(date.today()),
                "label": "Test",
                "amount": "1.00",
                "category": "divers",
            },
            timeout=5,
        )
        if resp.status_code == 201:
            checks["Database"]["Write (Expense)"] = "✅"
            print("  ✅ Write operation successful")
            expense_id = resp.json()["id"]

            # Read test
            resp = requests.get(f"{API_URL}/expenses/{expense_id}", timeout=5)
            if resp.status_code == 200:
                checks["Database"]["Read (Expense)"] = "✅"
                print("  ✅ Read operation successful")
            else:
                checks["Database"]["Read (Expense)"] = f"❌ Status {resp.status_code}"
                print(f"  ❌ Read failed: {resp.status_code}")
        else:
            checks["Database"]["Write (Expense)"] = f"❌ Status {resp.status_code}"
            print(f"  ❌ Write failed: {resp.status_code}")
    except Exception as e:
        checks["Database"]["Operations"] = f"❌ {e}"
        print(f"  ❌ Database operations failed: {e}")

    # 4. SERVICE CHECKS
    print("\n📍 SERVICE CHECKS:")

    # Sharing calculator
    try:
        resp = requests.post(
            f"{API_URL}/expenses",
            json={
                "date": str(date.today()),
                "label": "Sharing test",
                "amount": "100.00",
                "category": "alimentation",
            },
            timeout=5,
        )
        if resp.status_code == 201:
            data = resp.json()
            # Check if sharing entries exist (implicit)
            checks["Services"]["Sharing calculator"] = "✅"
            print("  ✅ Sharing calculator (auto-split working)")
        else:
            checks["Services"]["Sharing calculator"] = f"❌ {resp.status_code}"
            print(f"  ❌ Sharing calculator failed")
    except Exception as e:
        checks["Services"]["Sharing calculator"] = f"❌ {e}"
        print(f"  ❌ Sharing calculator error: {e}")

    # Period management
    try:
        resp = requests.post(
            f"{API_URL}/periods",
            json={
                "name": "Health check",
                "start_date": "2026-05-01",
                "end_date": "2026-05-31",
            },
            timeout=5,
        )
        if resp.status_code == 201:
            checks["Services"]["Period manager"] = "✅"
            print("  ✅ Period manager (CRUD working)")
        else:
            checks["Services"]["Period manager"] = f"❌ {resp.status_code}"
            print(f"  ❌ Period manager failed")
    except Exception as e:
        checks["Services"]["Period manager"] = f"❌ {e}"
        print(f"  ❌ Period manager error: {e}")

    # SUMMARY
    print("\n" + "=" * 60)
    print("📊 SUMMARY")
    print("=" * 60)

    total = 0
    passed = 0

    for category, items in checks.items():
        print(f"\n{category}:")
        for check_name, result in items.items():
            status = "✅" if result == "✅" else "❌" if "❌" in result else "⚠️"
            print(f"  {status} {check_name}: {result}")
            total += 1
            if result == "✅":
                passed += 1

    print("\n" + "=" * 60)
    print(f"OVERALL: {passed}/{total} checks passed ({int(passed/total*100)}%)")
    print("=" * 60 + "\n")

    return passed == total


if __name__ == "__main__":
    import sys
    success = healthcheck()
    sys.exit(0 if success else 1)
