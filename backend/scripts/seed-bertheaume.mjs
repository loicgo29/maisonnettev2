import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

async function seed() {
  try {
    const gite = await prisma.gite.create({
      data: {
        slug: 'bertheaume',
        nom: 'Maisonnette de Bertheaume',
        description: `Nichée à la pointe de Bertheaume, cette maisonnette et son très grand jardin arboré vous accueillent pour des vacances paisibles en bord de mer.

Récemment rénovée, chaleureuse et tout confort, 45 m² pour 6 personnes :
- 2 chambres (1 lit double, 2 lits superposés)
- Canapé convertible (2 couchages)
- Salle de bain équipée, WC indépendant
- Cuisine complète avec lave-vaisselle
- WiFi, TV, poêle à bois
- Terrasse et grand jardin avec barbecue
- Stationnement aisé

La plage se rejoint en 3 minutes à pied. GR34 à 200m. Linge fourni.`,
        adresse: 'Pointe de Bertheaume, 29120 Plonéour-Lanvern',
        capacite: 6,
        prixNuit: 90,
      },
    });

    console.log(`✅ Gîte créé: ${gite.id}`);

    const photoDir = path.join(__dirname, '../public/uploads/gites/bertheaume');
    const files = fs.readdirSync(photoDir).filter(f => /\.(jpg|jpeg|JPG|JPEG)$/i.test(f));

    console.log(`📸 ${files.length} photos trouvées`);

    for (let i = 0; i < files.length; i++) {
      await prisma.photo.create({
        data: {
          giteId: gite.id,
          url: `/uploads/gites/bertheaume/${files[i]}`,
          categorie: 'EXTERIEUR',
          ordre: i,
          alt: `Maisonnette de Bertheaume - Photo ${i + 1}`,
        },
      });
      console.log(`  ✅ ${files[i]}`);
    }

    console.log(`\n✨ Bertheaume ajoutée avec ${files.length} photos!`);
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
