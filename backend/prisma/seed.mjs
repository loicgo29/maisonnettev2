/**
 * Provisionnement de la base — idempotent.
 *
 * Rejouable sans erreur : le gîte est mis à jour s'il existe déjà, et les
 * photos sont resynchronisées à partir des fichiers réellement présents sur le
 * disque. Un fichier absent n'est jamais référencé en base.
 *
 * Ce fichier fait autorité sur la description, les tarifs et l'ordre des
 * photos : une modification faite à la main en base sera écrasée au prochain
 * déploiement.
 *
 *   node prisma/seed.mjs
 */
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const SLUG = 'bertheaume';
const DOSSIER_PHOTOS = path.join(__dirname, '..', 'public', 'uploads', 'gites', SLUG);
const URL_PUBLIQUE = `/uploads/gites/${SLUG}`;

const GITE = {
  slug: SLUG,
  nom: 'Maisonnette de Bertheaume',
  adresse: 'Pointe de Bertheaume, 29120 Plonéour-Lanvern',
  capacite: 6,
  // Tarif d'appel (basse saison). La grille complète est présentée côté front.
  prixNuit: 60,
  description: `Nichée à la pointe de Bertheaume, cette maisonnette et son très grand jardin arboré vous accueillent pour des vacances paisibles en bord de mer, dans un véritable havre de nature. La plage de sable fin se rejoint en 3 minutes à pied par un magnifique chemin piéton, le bourg et ses commerces sont à 10 minutes à pied, et le sentier côtier du GR34 passe à 200 m.

Récemment rénovée, chaleureuse et tout confort, la maison offre 45 m² fonctionnels pour 6 personnes. Un poêle à bois vous réchauffe dans un esprit cocooning au retour de vos balades sur les sentiers côtiers.

Dehors, profitez d'une terrasse sous auvent avec mobilier extérieur, et surtout d'un grand jardin arboré, abrité du vent et à l'abri des regards : barbecue, jeux d'extérieur, farniente au calme. Stationnement aisé en haut du terrain.

Le linge de maison (draps, serviettes, torchons) est fourni, ainsi que thé, café et quelques bases alimentaires.`,
};

// Ordre d'ouverture de la galerie. La première photo est l'image d'accueil :
// elle doit montrer le bien, jamais une pièce d'eau.
const EN_TETE = ['GOPR5954.JPG', 'GOPR5979.JPG', 'GOPR5870.JPG', 'OkGOPR6005.JPG'];

// Reléguées en fin de galerie.
const EN_QUEUE = ['20240514_113640.jpg'];

// Photos identifiées visuellement. Les autres reçoivent une légende générique :
// la classification fine reste à compléter.
const IDENTIFIEES = {
  'GOPR5954.JPG': { alt: 'La maisonnette et son jardin arboré', categorie: 'EXTERIEUR' },
  'GOPR5979.JPG': { alt: "Le grand jardin et l'accès à la maison", categorie: 'EXTERIEUR' },
  'GOPR5870.JPG': { alt: 'Cuisine équipée et coin repas', categorie: 'CUISINE' },
  'OkGOPR6005.JPG': { alt: 'La plage à 3 minutes à pied', categorie: 'EXTERIEUR' },
  '20240514_113640.jpg': { alt: 'WC indépendant', categorie: 'SDB' },
};

function listerPhotos() {
  if (!fs.existsSync(DOSSIER_PHOTOS)) {
    throw new Error(
      `Dossier des photos introuvable : ${DOSSIER_PHOTOS}\n` +
        `Le déploiement doit copier les fichiers avant de lancer le seed.`
    );
  }

  const fichiers = fs
    .readdirSync(DOSSIER_PHOTOS)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f));

  const presents = (liste) => liste.filter((f) => fichiers.includes(f));
  const tete = presents(EN_TETE);
  const queue = presents(EN_QUEUE);
  const milieu = fichiers
    .filter((f) => !tete.includes(f) && !queue.includes(f))
    .sort((a, b) => a.localeCompare(b, 'fr'));

  return [...tete, ...milieu, ...queue];
}

async function seed() {
  const fichiers = listerPhotos();
  if (fichiers.length === 0) {
    throw new Error(`Aucune photo dans ${DOSSIER_PHOTOS} — provisionnement interrompu.`);
  }

  const gite = await prisma.gite.upsert({
    where: { slug: SLUG },
    update: GITE,
    create: GITE,
  });

  // Resynchronisation complète : le disque fait foi.
  await prisma.photo.deleteMany({ where: { giteId: gite.id } });
  await prisma.photo.createMany({
    data: fichiers.map((fichier, index) => ({
      giteId: gite.id,
      url: `${URL_PUBLIQUE}/${fichier}`,
      ordre: index,
      alt: IDENTIFIEES[fichier]?.alt ?? `Maisonnette de Bertheaume — photo ${index + 1}`,
      categorie: IDENTIFIEES[fichier]?.categorie ?? 'INTERIEUR',
    })),
  });

  console.log(`✅ Gîte « ${gite.nom} » provisionné`);
  console.log(`✅ ${fichiers.length} photos référencées (accueil : ${fichiers[0]})`);
}

seed()
  .catch((e) => {
    console.error('❌ Échec du provisionnement :', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
