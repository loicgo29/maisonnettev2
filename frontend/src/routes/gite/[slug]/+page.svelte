<script>
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let gite = null;
	let loading = true;

	onMount(async () => {
		const res = await fetch(`http://localhost:3001/api/gites/${$page.params.slug}`);
		gite = await res.json();
		loading = false;
	});
</script>

{#if loading}
	<div class="min-h-screen flex items-center justify-center bg-gray-900">
		<p>Chargement...</p>
	</div>
{:else if gite}
	<div class="min-h-screen bg-gray-900 text-white">
		<div class="max-w-6xl mx-auto p-8">
			<a href="/" class="text-blue-400 mb-4">← Retour</a>
			<h1 class="text-4xl font-bold mb-2">{gite.nom}</h1>
			<p class="text-gray-400 mb-8">{gite.adresse}</p>

			<div class="grid grid-cols-2 gap-8 mb-12">
				<div class="bg-gray-800 p-6 rounded">
					<h2 class="text-2xl font-bold mb-4">Description</h2>
					<p>{gite.description}</p>
				</div>
				<div class="bg-gray-800 p-6 rounded">
					<h2 class="text-2xl font-bold mb-4">Info</h2>
					<p>Capacité: {gite.capacite} personnes</p>
					<p class="text-2xl text-blue-400">{gite.prixNuit}€/nuit</p>
				</div>
			</div>

			<div class="bg-gray-800 p-6 rounded">
				<h2 class="text-2xl font-bold mb-6">Galerie ({gite.photos?.length || 0} photos)</h2>
				<div class="grid grid-cols-3 gap-4">
					{#each gite.photos || [] as photo (photo.id)}
						<img
							src="/uploads/gites/{gite.slug}/{photo.filename}"
							alt="photo"
							class="w-full h-48 object-cover rounded"
						/>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background: #111;
	}
</style>
