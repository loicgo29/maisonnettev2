<script lang="ts">
	import { onMount } from 'svelte';

	let gites = $state<any[]>([]);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			const res = await fetch('/api/gites');
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			gites = await res.json();
		} catch (e) {
			error = String(e);
		} finally {
			loading = false;
		}
	});
</script>

<h1>Nos Gîtes</h1>

{#if loading}
	<p>Chargement...</p>
{:else if error}
	<p style="color: red;">Erreur: {error}</p>
{:else if gites.length === 0}
	<p>Aucun gîte disponible</p>
{:else}
	<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
		{#each gites as gite (gite.id)}
			<div style="border: 1px solid #ddd; padding: 1rem; border-radius: 8px;">
				<h2>{gite.nom}</h2>
				<p>{gite.description}</p>
				<a href="/gite/{gite.slug}">Voir les détails</a>
			</div>
		{/each}
	</div>
{/if}

<style>
	:global(body) {
		font-family: system-ui, sans-serif;
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}
</style>
