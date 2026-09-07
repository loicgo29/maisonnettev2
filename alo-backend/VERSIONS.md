# 📦 Historique des Versions - ALO

## v1.0-reequilibrage (24/05/2026)

**Moteur de rééquilibrage complet avec conclusion actionnelle**

### ✨ Fonctionnalités
- ✅ Calcul automatique de la quote-part (repas)
- ✅ Charges théoriques (quotepart + 50/50)
- ✅ Financement réel (virements + avances)
- ✅ Soldes individuels et déficit du compte Fortuneo
- ✅ Conclusion actionnelle avec virements à effectuer
- ✅ Libellés auto-générés avec date: "reguleDD/MM/YYYY"

### 🎯 Logique formalisée

**Flux de règlement:**
```
1. Loïc verse X€ au compte Fortuneo
2. Le compte paie Y€ à Alice
3. Compte équilibré
```

**Architecture:**
- Compte Fortuneo = entité centrale (pas de dettes directes Loïc↔Alice)
- Déficit compte = charges totales - financement total
- Conclusion = actions concrètes avec montants et dates

### 📊 Exemple (Période 04/01 → 23/05/2026)

```
Quote-part:    Loïc 45.56% / Alice 54.44%
Charges:       Loïc 5207.60€ / Alice 6092.55€ (total 11300.15€)
Financement:   Loïc 3797.50€ / Alice 6401.20€ (total 10198.70€)
Déficit:       1101.45€

Conclusion:
✅ Loïc: Virement 1410.10€ vers compte (libellé: regule24/05/2026)
✅ Alice: Reçoit 308.65€ du compte (libellé: regule24/05/2026)
```

### 🗄️ Backup
- `data/alo_v1.0-reequilibrage_20260524.db`

### 🔗 Commit
- `924bf10` - Reformuler conclusion avec virements actionnables

---

## Antérieurs

- **v0.1-initial** - Création du projet
- **reequilibrage** - Page synthèse rééquilibrage
- **init2** - Configuration projet et import Fortuneo
