<script>
  import { onMount } from 'svelte';

  let gites = [];
  let loading = true;

  onMount(async () => {
    try {
      const res = await fetch('http://localhost:3001/api/gites');
      gites = await res.json();
    } catch (e) {
      console.error('Error:', e);
    }
    loading = false;
  });
</script>

<div class="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
  <div class="max-w-6xl mx-auto px-4 py-20">
    <h1 class="text-5xl font-bold text-white mb-4">Maisonnette</h1>
    <p class="text-xl text-gray-300 mb-12">Découvrez nos gîtes de charme</p>

    {#if loading}
      <div class="text-center py-20">
        <p class="text-gray-400">Chargement...</p>
      </div>
    {:else if gites.length > 0}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {#each gites as gite (gite.id)}
          <a href="/gite/{gite.slug}" class="group">
            <div class="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition transform hover:scale-105">
              {#if gite.photos && gite.photos.length > 0}
                <img
                  src="/uploads/gites/{gite.slug}/{gite.photos[0].filename}"
                  alt={gite.nom}
                  class="w-full h-48 object-cover"
                />
              {/if}
              <div class="p-6">
                <h2 class="text-2xl font-bold text-white mb-2 group-hover:text-blue-400">{gite.nom}</h2>
                <p class="text-gray-400 mb-4">{gite.adresse}</p>
                <div class="flex justify-between items-center">
                  <span class="text-xl font-bold text-blue-400">{gite.prixNuit}€/nuit</span>
                  <span class="text-sm bg-blue-600 text-white px-3 py-1 rounded">{gite.photos?.length || 0} photos</span>
                </div>
              </div>
            </div>
          </a>
        {/each}
      </div>
    {:else}
      <p class="text-gray-400">Aucun gîte disponible</p>
    {/if}
  </div>
</div>
