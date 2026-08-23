<script>
	import { onMount } from 'svelte';

	let gites = [];
	let loading = true;

	onMount(async () => {
		const res = await fetch('http://localhost:3001/api/gites');
		gites = await res.json();
		loading = false;
	});
</script>

<div class="min-h-screen bg-gray-900 p-8">
	<div class="max-w-6xl mx-auto">
		<h1 class="text-5xl font-bold text-white mb-4">Maisonnette</h1>
		<p class="text-xl text-gray-300 mb-12">Découvrez nos gîtes</p>

		{#if loading}
			<p class="text-gray-300">Chargement...</p>
		{:else}
			<div class="grid grid-cols-3 gap-6">
				{#each gites as gite (gite.id)}
					<a href="/gite/{gite.slug}" class="bg-gray-800 rounded-lg p-4 hover:shadow-xl">
						<h2 class="text-2xl font-bold text-white mb-2">{gite.nom}</h2>
						<p class="text-gray-400">{gite.prixNuit}€/nuit</p>
						<p class="text-sm text-blue-400">{gite.photos?.length || 0} photos</p>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</div>
