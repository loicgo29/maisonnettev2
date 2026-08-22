import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth';

interface Photo {
  id: string;
  url: string;
  categorie: string;
  alt?: string;
}

interface Gite {
  id: string;
  slug: string;
  nom: string;
  description: string;
  adresse: string;
  capacite: number;
  prixNuit: number;
  photos: Photo[];
}

export function GiteDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();

  const { data: gite, isLoading, error } = useQuery<Gite>({
    queryKey: ['gite', slug],
    queryFn: async () => {
      const res = await api.get(`/api/gites/${slug}`);
      return res.data;
    },
    enabled: !!slug,
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;

  if (error || !gite) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Gîte non trouvé</h1>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  // Group photos by category
  const photosByCategory = gite.photos.reduce(
    (acc, photo) => {
      if (!acc[photo.categorie]) acc[photo.categorie] = [];
      acc[photo.categorie].push(photo);
      return acc;
    },
    {} as Record<string, Photo[]>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:underline mb-4"
          >
            ← Retour
          </button>
          <h1 className="text-4xl font-bold mb-2">{gite.nom}</h1>
          <p className="text-gray-600">{gite.adresse}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Description */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Description</h2>
          <p className="text-gray-700 leading-relaxed">{gite.description}</p>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-600">Capacité:</span>
              <p className="text-2xl font-bold">{gite.capacite} personnes</p>
            </div>
            <div>
              <span className="text-gray-600">Prix:</span>
              <p className="text-2xl font-bold text-blue-600">
                {gite.prixNuit.toFixed(2)} €/nuit
              </p>
            </div>
          </div>
        </div>

        {/* Photo Gallery */}
        {Object.keys(photosByCategory).length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-2xl font-bold mb-6">Photos</h2>

            {Object.entries(photosByCategory).map(([category, photos]) => (
              <div key={category} className="mb-8 last:mb-0">
                <h3 className="text-lg font-bold mb-4 text-gray-700">
                  {category.replace(/_/g, ' ')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {photos.map((photo) => (
                    <div key={photo.id} className="overflow-hidden rounded-lg bg-gray-200">
                      <img
                        src={photo.url}
                        alt={photo.alt || category}
                        className="w-full h-48 object-cover hover:scale-105 transition"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Booking Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-6">Réserver</h2>

          {!isAuthenticated ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                Veuillez vous connecter pour faire une réservation
              </p>
              <button
                onClick={login}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 text-lg font-bold"
              >
                Se connecter
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                La réservation en ligne sera disponible bientôt
              </p>
              <p className="text-sm text-gray-500">
                Pour réserver maintenant, veuillez nous contacter par email ou téléphone
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
