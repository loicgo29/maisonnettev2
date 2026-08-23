const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function seed() {
  try {
    const gite = await prisma.gite.create({
      data: {
        slug: 'bertheaume',
        nom: 'Maisonnette de Bertheaume',
        description: `Nichée à la pointe de Bertheaume, cette maisonnette et son très grand jardin arboré vous accueillent pour des vacances paisibles en bord de mer, dans un véritable havre de nature. 

Récemment rénovée, chaleureuse et tout confort, la maison offre 45 m² fonctionnels pour 6 personnes :
- 1 chambre avec lit double
- 1 chambre avec 2 lits superposés  
- 1 canapé convertible (couchage 2)
- Salle de bain équipée, WC indépendant
- Cuisine équipée avec lave-vaisselle
- WiFi, télévision, poêle à bois
- Terrasse et grand jardin arboré avec barbecue
- Stationnement aisé

La plage se rejoint en 3 minutes à pied, le GR34 passe à 200 m.`,
        adresse: 'Pointe de Bertheaume, 29120 Plonéour-Lanvern, Finistère',
        capacite: 6,
        prixNuit: 90,
      },
    });

    console.log(`✅ Gîte créé: ${gite.id}`);

    const photoDir = path.join(__dirname, '../public/uploads/gites/bertheaume');
    const files = fs.readdirSync(photoDir).filter(f => /\.(jpg|jpeg|JPG|JPEG)$/i.test(f));

    console.log(`📸 ${files.length} photos trouvées`);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await prisma.photo.create({
        data: {
          giteId: gite.id,
          url: `/uploads/gites/bertheaume/${file}`,
          categorie: 'EXTERIEUR',
          ordre: i,
          alt: `Maisonnette de Bertheaume - Photo ${i + 1}`,
        },
      });
      console.log(`  ✅ ${file}`);
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
