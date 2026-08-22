import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';

interface Gite {
  id: string;
  slug: string;
  nom: string;
  description: string;
  capacite: number;
  prixNuit: number;
  photos?: Array<{
    url: string;
    alt?: string;
  }>;
}

export function Home() {
  const { user, isAuthenticated } = useAuth();

  const { data: gites = [], isLoading, error } = useQuery<Gite[]>({
    queryKey: ['gites'],
    queryFn: async () => {
      const res = await api.get('/api/gites');
      return res.data;
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-blue-600 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Bienvenue à maisonnettev2</h1>
          <p className="text-lg">Découvrez nos gîtes et réservez votre séjour</p>
          {isAuthenticated && user && (
            <p className="text-sm mt-4">Connecté en tant que {user.profile?.email}</p>
          )}
        </div>
      </div>

      {/* Gites Grid */}
      <div className="max-w-4xl mx-auto py-12 px-4">
        <h2 className="text-3xl font-bold mb-8">Nos Gîtes</h2>

        {isLoading && <div className="text-center py-8">Chargement...</div>}

        {error && (
          <div className="bg-red-100 text-red-800 p-4 rounded mb-8">
            Erreur lors du chargement des gîtes
          </div>
        )}

        {gites.length === 0 && !isLoading && (
          <div className="text-center py-8 text-gray-600">
            Aucun gîte disponible pour le moment
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gites.map((gite) => (
            <Link key={gite.id} to={`/gite/${gite.slug}`}>
              <div className="bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer overflow-hidden">
                {/* Image placeholder */}
                <div className="h-48 bg-gray-200 flex items-center justify-center">
                  {gite.photos?.[0]?.url ? (
                    <img
                      src={gite.photos[0].url}
                      alt={gite.photos[0].alt || gite.nom}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-400">Photo du gîte</span>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-lg mb-2">{gite.nom}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {gite.description}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-600 font-bold">
                      {gite.prixNuit.toFixed(2)} €/nuit
                    </span>
                    <span className="text-sm text-gray-500">
                      {gite.capacite} personnes
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
