import { prisma } from '../src/lib/prisma';
import * as fs from 'fs';
import * as path from 'path';

async function seedBertheaume() {
  try {
    // Créer le gîte Bertheaume
    const gite = await prisma.gite.create({
      data: {
        slug: 'bertheaume',
        nom: 'Maisonnette de Bertheaume',
        description: `Nichée à la pointe de Bertheaume, cette maisonnette et son très grand jardin arboré vous accueillent pour des vacances paisibles en bord de mer, dans un véritable havre de nature. La plage de sable fin se rejoint en 3 minutes à pied par un magnifique chemin piéton, le bourg et ses commerces sont à 10 minutes à pied, et le sentier côtier du GR34 passe à 200 m.

Récemment rénovée, chaleureuse et tout confort, la maison offre 45 m² fonctionnels pour 6 personnes :
- 1 chambre avec un lit double
- 1 chambre avec 2 lits superposés
- 1 canapé convertible au salon (couchage 2 personnes)
- 1 salle de bain équipée : lave-linge, sèche-linge, fer à repasser, aspirateur
- 1 WC indépendant
- Cuisine équipée : plaques de cuisson, lave-vaisselle, réfrigérateur, congélateur
- Wifi et prise Ethernet, box multimédia, grande télévision
- Poêle à bois cocooning
- Terrasse sous auvent avec mobilier extérieur
- Grand jardin arboré avec barbecue et jeux d'extérieur
- Stationnement aisé

Linge de maison fourni, ainsi que thé, café et quelques bases alimentaires.`,
        adresse: 'Pointe de Bertheaume, Plonéour-Lanvern, 29120 Finistère',
        capacite: 6,
        prixNuit: 90, // Prix moyen
        googleCalendarId: null,
      },
    });

    console.log(`✅ Gîte créé: ${gite.id}`);

    // Récupérer les photos depuis le répertoire
    const photoDir = path.join(__dirname, '../public/uploads/gites/bertheaume');
    const files = fs.readdirSync(photoDir).filter(f =>
      f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.jpeg')
    );

    console.log(`📸 ${files.length} photos trouvées`);

    // Ajouter les photos
    let ordre = 0;
    for (const file of files) {
      const urlPath = `/uploads/gites/bertheaume/${file}`;

      // Déterminer la catégorie basée sur le nom du fichier
      let categorie = 'EXTERIEUR';
      if (file.toLowerCase().includes('salon') || file.toLowerCase().includes('intérieur')) {
        categorie = 'SALON';
      } else if (file.toLowerCase().includes('cuisine')) {
        categorie = 'CUISINE';
      } else if (file.toLowerCase().includes('chambre')) {
        categorie = 'CHAMBRE';
      } else if (file.toLowerCase().includes('salle') || file.toLowerCase().includes('sdb')) {
        categorie = 'SDB';
      } else if (file.toLowerCase().includes('jardin') || file.toLowerCase().includes('outdoor')) {
        categorie = 'OUTDOOR';
      }

      await prisma.photo.create({
        data: {
          giteId: gite.id,
          url: urlPath,
          categorie,
          ordre: ordre++,
          alt: `Photo de la maisonnette de Bertheaume - ${categorie}`,
        },
      });

      console.log(`  ✅ ${file} (${categorie})`);
    }

    console.log(`\n✨ Bertheaume ajoutée avec ${files.length} photos!`);
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Erreur:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

seedBertheaume();
