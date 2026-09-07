"""Auto-classifie les dépenses Telegram selon les mots-clés"""


QUOTEPART_KEYWORDS = [
    "biocoop", "carrefour", "leclerc", "auchan", "intermarché", "carrefour market",
    "courses", "marché", "marche", "sefa", "kerbio", "boulangerie", "boucherie",
    "fromagerie", "alimentation", "épicerie", "fruits", "légumes", "viande", "poisson",
    "fromage", "pain", "baguette", "lait", "oeufs", "beurre", "crème", "huile",
    "café", "thé", "chocolat", "sucre", "farine", "riz", "pâtes", "conserves",
    "crowdfarming", "la fourche", "fourche", "cantine", "restaurant",
    "essence", "carburant", "gazole", "diesel", "pharmacie",
    "supermarchés", "magasin", "action", "grande surface",
    "câble", "ampoule", "électrique", "électronique", "seche cheveux", "appareil"
]

BRICO_KEYWORDS = [
    "leroy", "merlin", "castorama", "brico", "bricodépôt", "casto", "mr bricolage",
    "amazon", "cedeo", "placo", "carrelage", "peinture", "vernis", "enduit",
    "vis", "clou", "maçonnerie", "plomberie", "électricité", "chauffage",
    "fenêtre", "porte", "serrure", "poignée", "robinet", "mitigeur", "tuyau",
    "tuyauterie", "béton", "sable", "ciment", "pierre", "brique", "tuile",
    "terrasse", "dalle", "escalier", "rampe", "barrière", "grillage",
    "outil", "perceuse", "scie", "marteau", "tournevis", "clé", "lime",
    "burin", "chisel", "meuleuse", "sauteuse", "rabot", "établi"
]

DETTE_KEYWORDS = [
    "doit", "dette", "prêt", "remboursement", "remboursé", "rembourser",
    "emprunté", "emprunter", "avance", "avancé", "retour", "rendre",
    "rendez", "tu dois", "je dois", "il doit", "elle doit"
]

VIREMENT_KEYWORDS = [
    "vir", "virement", "transfert", "envoyé", "reçu", "payé",
    "loic", "alice", "lannion", "brest", "vasseur", "gourmelon"
]

# Mots-clés pour identifier la banque (CMB vs Fortuneo)
CMB_KEYWORDS = ["cb ", "carte bleu", "carte bancaire"]
FORTUNEO_KEYWORDS = ["vir ", "prlv ", "prelevement", "transfert", "ech pret"]

# Catégories pour les dépenses (alimentation, logement, enfants, transport, loisirs, sante, divers)
LOGEMENT_KEYWORDS = ["edf", "gdf", "gaz", "eau", "orange", "fibre", "internet", "electricite", "chauffage", "assurance", "maif", "loyer"]
TRANSPORT_KEYWORDS = ["essence", "carburant", "gazole", "diesel", "sncf", "ratp", "transport", "uber", "taxi", "parking"]
SANTE_KEYWORDS = ["pharmacie", "sante", "docteur", "medecin", "hopital", "dentiste", "opticien"]
LOISIRS_KEYWORDS = ["restaurant", "cinema", "theatre", "loisirs", "hotel", "vacances", "spotify", "netflix"]


def auto_classify(label: str) -> str:
    """Auto-classifie une dépense selon son libellé.

    Retourne: 'quotepart' (alimentation), 'brico', 'dette', ou '50/50' (par défaut)
    """
    if not label:
        return "50/50"

    label_lower = label.lower()

    # Vérifier dans chaque liste de mots-clés (ordre : dette, brico, quotepart)
    for keyword in DETTE_KEYWORDS:
        if keyword in label_lower:
            return "dette"

    for keyword in BRICO_KEYWORDS:
        if keyword in label_lower:
            return "brico"

    for keyword in QUOTEPART_KEYWORDS:
        if keyword in label_lower:
            return "quotepart"

    # Par défaut = 50/50 (ce qui n'est ni brico ni alimentation)
    return "50/50"


def classify_category(label: str) -> str:
    """Classifie une dépense par catégorie (quotepart, brico, dette, virement, 50/50).

    Retourne une catégorie parmi:
    virement (transfert entre comptes), quotepart (alimentation),
    brico (bricolage), dette (prêt), 50/50 (défaut)
    """
    if not label:
        return "50/50"

    label_lower = label.lower()

    # Vérifier virement d'abord
    for keyword in VIREMENT_KEYWORDS:
        if keyword in label_lower:
            return "virement"

    # Vérifier dette
    for keyword in DETTE_KEYWORDS:
        if keyword in label_lower:
            return "dette"

    # Vérifier brico
    for keyword in BRICO_KEYWORDS:
        if keyword in label_lower:
            return "brico"

    # Vérifier quotepart (alimentation)
    for keyword in QUOTEPART_KEYWORDS:
        if keyword in label_lower:
            return "quotepart"

    return "50/50"


def detect_account_from_transfer(label: str) -> int:
    """Détecte le compte destinataire d'un virement (Loïc=1 ou Alice=2).

    Retourne l'account_id (1 pour Loïc, 2 pour Alice, None si indéterminé)
    """
    if not label:
        return None

    label_lower = label.lower()

    loic_keywords = ["loic", "lannion", "gourmelon"]
    alice_keywords = ["alice", "vasseur"]

    for kw in loic_keywords:
        if kw in label_lower:
            return 1

    for kw in alice_keywords:
        if kw in label_lower:
            return 2

    return None


def classify_bankin_expense(label: str) -> tuple[str, str]:
    """Classifie une dépense bancaire Bankin.

    Retourne un tuple (compte_bancaire, category):
    - Virement → "virement"
    - CMB → "50/50"
    - Fortuneo → "quotepart"
    """
    if not label:
        return "fortuneo", "quotepart"

    label_lower = label.lower()

    # Vérifier virement d'abord
    for keyword in VIREMENT_KEYWORDS:
        if keyword in label_lower:
            return "fortuneo", "virement"

    for keyword in CMB_KEYWORDS:
        if keyword in label_lower:
            return "cmb", "50/50"

    for keyword in FORTUNEO_KEYWORDS:
        if keyword in label_lower:
            return "fortuneo", "quotepart"

    return "fortuneo", "quotepart"
