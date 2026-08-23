<script>
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  let gite = null;
  let loading = true;
  let error = null;

  onMount(async () => {
    try {
      const slug = $page.params.slug;
      const res = await fetch(`http://localhost:3001/api/gites/${slug}`);
      if (!res.ok) throw new Error('Gîte not found');
      gite = await res.json();
    } catch (e) {
      error = e.message;
    }
    loading = false;
  });
</script>

{#if loading}
  <div class="min-h-screen flex items-center justify-center bg-gray-900">
    <p class="text-gray-300">Chargement...</p>
  </div>
{:else if error}
  <div class="min-h-screen flex items-center justify-center bg-gray-900">
    <div class="text-center">
      <h1 class="text-3xl font-bold text-red-500 mb-4">Erreur</h1>
      <p class="text-gray-400 mb-8">{error}</p>
      <a href="/" class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">Retour</a>
    </div>
  </div>
{:else if gite}
  <div class="min-h-screen bg-gray-900">
    <!-- Header -->
    <div class="bg-gray-800 text-white py-8">
      <div class="max-w-6xl mx-auto px-4">
        <a href="/" class="text-blue-400 hover:text-blue-300 mb-4 inline-block">← Retour</a>
        <h1 class="text-4xl font-bold mb-2">{gite.nom}</h1>
        <p class="text-gray-400">{gite.adresse}</p>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-6xl mx-auto px-4 py-12">
      <!-- Info Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div class="bg-gray-800 rounded-lg p-6">
          <h2 class="text-2xl font-bold text-white mb-4">À propos</h2>
          <p class="text-gray-300 leading-relaxed">{gite.description}</p>
        </div>
        <div class="bg-gray-800 rounded-lg p-6">
          <h2 class="text-2xl font-bold text-white mb-4">Informations</h2>
          <div class="space-y-4">
            <div>
              <p class="text-gray-400">Capacité</p>
              <p class="text-2xl font-bold text-white">{gite.capacite} personnes</p>
            </div>
            <div>
              <p class="text-gray-400">Prix</p>
              <p class="text-2xl font-bold text-blue-400">{gite.prixNuit}€ / nuit</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Gallery -->
      {#if gite.photos && gite.photos.length > 0}
        <div class="bg-gray-800 rounded-lg p-8">
          <h2 class="text-2xl font-bold text-white mb-6">Galerie ({gite.photos.length} photos)</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each gite.photos as photo (photo.id)}
              <div class="aspect-video bg-gray-700 rounded overflow-hidden hover:shadow-lg transition">
                <img
                  src="/uploads/gites/{gite.slug}/{photo.filename}"
                  alt={photo.alt || gite.nom}
                  class="w-full h-full object-cover hover:scale-105 transition"
                />
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- CTA -->
      <div class="text-center mt-12">
        <button class="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition">
          Réserver maintenant
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }
</style>
