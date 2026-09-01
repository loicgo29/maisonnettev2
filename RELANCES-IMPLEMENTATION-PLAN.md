# Week 2 bis — Plan d'implémentation des Relances Client

**Objectif :** Système automatisé de relances SMS/Email/WhatsApp/Messagerie pour orchestrer l'expérience client du séjour.

---

## 🎯 Workflow Client-Centric (6 étapes)

| Timing | Type | Déclencheur | Contenu | Canaux |
|--------|------|-------------|---------|--------|
| **J (Jour réservation)** | 📖 ACCUEIL | Confirmation paiement | Guide complet + Question : SMS/WhatsApp/Email/Messagerie ? | EMAIL obligatoire |
| **J-2 (avant arrivée)** | 🔑 ARRIVEE_MOINS_2 | 2 jours avant | Adresse, boîte à clés, instructions + SMS d'arrivée ? | Préférence client |
| **J (jour d'arrivée)** | ✅ ARRIVEE_J0 | Jour arrivée 14h | "Tout va bien ? Besoin d'aide ?" | Préférence client |
| **J+3 (during stay)** | 🌱 SEJOUR_J3 | 3 jours après check-in | "Pensez à arroser les plantes!" (conseils gîte) | Préférence client |
| **Veille départ** | 🚪 CHECKOUT_VEILLE | Avant jour départ | Instructions checkout détaillées | Préférence client |
| **Jour départ** | ⭐ AVIS | Jour du départ | "Laissez-nous un avis !" + lien review | Préférence client |

---

## 📋 Plan d'implémentation (5 phases)

### **Phase 1 : Modèle de données + Migration**

**Fichiers à modifier :**
- `backend/prisma/schema.prisma`

**Modèle Relance :**
```prisma
model Relance {
  id             String   @id @default(cuid())
  reservationId  String
  reservation    Reservation @relation(fields: [reservationId], references: [id], onDelete: Cascade)
  type           String   // ACCUEIL | ARRIVEE_MOINS_2 | ARRIVEE_J0 | SEJOUR_J3 | CHECKOUT_VEILLE | AVIS
  canal          String   // EMAIL | SMS | WHATSAPP | MESSAGE_PLATEFORME
  statut         String   @default("PLANIFIEE") // PLANIFIEE | ENVOYEE | ECHEC | ANNULEE
  planifieeLe    DateTime
  envoyeeLe      DateTime?
  erreur         String?
  createdAt      DateTime @default(now())

  @@index([reservationId])
  @@index([statut, planifieeLe])
}
```

**Champs à ajouter sur Reservation :**
- `canalPreference String @default("EMAIL")` // EMAIL | SMS | WHATSAPP | MESSAGE
- `telClient String?` // Numéro de téléphone pour SMS/WhatsApp
- `notesInternes String?` // Notes du propriétaire

**Migration :**
```bash
cd backend
npx prisma migrate dev --name add_relances_model
```

**Livrable :** Migration appliquée, modèles compilés, `prisma.d.ts` à jour

---

### **Phase 2 : Endpoints `/api/admin`**

**Fichiers à créer :**
- `backend/src/routes/admin/reservations.ts`
- `backend/src/routes/admin/dashboard.ts`
- `backend/src/services/adminService.ts`

**Endpoints :**

| Méthode | Route | Fonction |
|---------|-------|----------|
| GET | `/api/admin/reservations` | Liste filtrable (statut, période, gîte, arrivées) |
| GET | `/api/admin/reservations/:id` | Détail + historique relances |
| PATCH | `/api/admin/reservations/:id` | Éditer canal préf., tél., notes |
| GET | `/api/admin/dashboard` | Arrivées aujourd'hui/demain, relances à envoyer |
| GET | `/api/admin/relances` | Relances planifiées + historique |
| POST | `/api/admin/relances/:id/envoyer` | Envoi manuel immédiat |
| DELETE | `/api/admin/relances/:id` | Annuler relance (non envoyée) |

**Protection :** Toutes les routes nécessitent le JWT + rôle `admin`

**Livrable :** Endpoints testables via Swagger `/api/docs`

---

### **Phase 3 : Service d'envoi (Email → SMS/WhatsApp)**

**Fichiers à créer :**
- `backend/src/services/emailService.ts` (Resend)
- `backend/src/services/smsService.ts` (Twilio)
- `backend/src/templates/relances/` (templates)

**Templates (Handlebars) :**
```
backend/src/templates/relances/
├── accueil.hbs
├── arrivee-moins-2.hbs
├── arrivee-j0.hbs
├── sejour-j3.hbs
├── checkout-veille.hbs
└── avis.hbs
```

**Variables disponibles :**
- `{{clientNom}}`
- `{{giteNom}}`
- `{{dateDebut}}`
- `{{dateFin}}`
- `{{adresse}}`
- `{{cleAcces}}`
- `{{lienAvis}}`

**Environnement :**
```bash
RESEND_API_KEY=re_xxxx
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_PHONE_NUMBER=+33xxxxxxxxx
```

**Livrable :** Email envoyable, SMS/WhatsApp configurés

---

### **Phase 4 : Job `node-cron` + Créateurs de relances**

**Fichiers à créer :**
- `backend/src/jobs/relancesJob.ts`
- `backend/src/jobs/relanceCreators.ts`

**Règles de création :**

1. **ACCUEIL (J)** ← Déclenché par webhook paiement confirmé
2. **ARRIVEE_MOINS_2** ← Job cron quotidien à minuit
3. **ARRIVEE_J0** ← Job cron quotidien à 14h
4. **SEJOUR_J3** ← Job cron quotidien (relatif check-in)
5. **CHECKOUT_VEILLE** ← Job cron quotidien (relatif départ)
6. **AVIS** ← Job cron quotidien (jour départ)

**Job d'envoi :**
- S'exécute chaque heure
- Cherche toutes les relances `PLANIFIEE` dont `planifieeLe <= now()`
- Envoie via le canal préféré
- Met à jour `statut=ENVOYEE` ou `ECHEC` + `erreur`
- Logs structurés (Pino)

**Livrable :** Relances créées automatiquement et envoyées selon délais

---

### **Phase 5 : Pages `/admin` (SvelteKit)**

**Fichiers à créer :**
- `frontend/src/routes/admin/+layout.svelte` (protection rôle)
- `frontend/src/routes/admin/+page.svelte` (dashboard)
- `frontend/src/routes/admin/reservations/+page.svelte` (liste)
- `frontend/src/routes/admin/reservations/[id]/+page.svelte` (détail)
- `frontend/src/routes/admin/relances/+page.svelte` (suivi)

**Dashboard `/admin` :**
- Arrivées aujourd'hui
- Arrivées demain
- Relances à envoyer aujourd'hui
- Totaux occupation/CA mois

**Réservations `/admin/reservations` :**
- Tableau filtrable
- Édition en ligne (canal, téléphone)
- Lien vers détail

**Détail `/admin/reservations/[id]` :**
- Infos réservation
- Historique relances (dates, canaux, statuts)
- Bouton "Envoyer relance manuelle"
- Édition notes

**Relances `/admin/relances` :**
- Relances planifiées (7 jours)
- Historique (30 jours)
- Bouton réessai (ECHEC)

**Livrable :** Pages fonctionnelles, accès protégé au rôle `admin`

---

## ✅ Critères de succès

- [ ] Relance ACCUEIL créée automatiquement à la confirmation
- [ ] Canal préféré respecté après première demande
- [ ] Historique relances visible dans `/admin/reservations/:id`
- [ ] `/admin` affiche relances à envoyer aujourd'hui
- [ ] Aucune relance en double, aucune sur réservation annulée
- [ ] Tous les délais respectés (J, J-2, J+3, veille, jour départ)
- [ ] Erreurs d'envoi visibles et réessayables

---

## 📅 Ordre de démarrage suggéré

**Jour 1:** Phase 1 (Modèle + Migration)  
**Jour 2:** Phase 2 (Endpoints `/api/admin`)  
**Jour 3:** Phase 3 (Email Resend)  
**Jour 4:** Phase 4 (Job cron)  
**Jour 5:** Phase 5 (Pages `/admin`)

**Tests BDD :** À chaque phase  
**Déploiement :** Après Phase 5 validée

---

## 🔑 Accès Keycloak (Admin)

```bash
# Accès local
http://localhost:8081/admin

# Vérifier les credentials
grep KC_BOOTSTRAP docker-compose.test.yml

# Client OAuth maisonnettev2
- Client ID: maisonnettev2-frontend
- Redirect URIs: http://localhost:8030/auth/callback
```

---

**Statut :** ⏳ En attente de démarrage Phase 1
