<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import PhotoGallery from './PhotoGallery.svelte';

	let gite = $state<any>(null);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			const slug = $page.params.slug;
			const res = await fetch(`/api/gites/${slug}`);
			if (!res.ok) {
				if (res.status === 404) throw new Error('Gîte non trouvé');
				throw new Error(`HTTP ${res.status}`);
			}
			gite = await res.json();
		} catch (e) {
			error = String(e);
		} finally {
			loading = false;
		}
	});
</script>

{#if loading}
	<p>Chargement...</p>
{:else if error}
	<div style="color: red;">
		<p>{error}</p>
		<a href="/">← Retour à l'accueil</a>
	</div>
{:else if gite}
	<h1>{gite.nom}</h1>
	<p>{gite.description}</p>

	{#if gite.photos && gite.photos.length > 0}
		<h2>Galerie ({gite.photos.length} photos)</h2>
		<PhotoGallery photos={gite.photos} />
	{/if}

	<a href="/">← Retour à l'accueil</a>
{:else}
	<p>Gîte non trouvé</p>
	<a href="/">← Retour à l'accueil</a>
{/if}

<style>
	:global(body) {
		font-family: system-ui, sans-serif;
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	h1 {
		margin-top: 0;
	}

	h2 {
		margin-top: 2rem;
	}

	a {
		color: #0066cc;
		text-decoration: none;
	}

	a:hover {
		text-decoration: underline;
	}
</style>
