<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { terminerConnexion } from '$lib/auth';

	let erreur = $state('');

	onMount(async () => {
		const code = $page.url.searchParams.get('code');
		const erreurKeycloak = $page.url.searchParams.get('error');

		if (erreurKeycloak) {
			erreur = `Connexion refusée par Keycloak : ${erreurKeycloak}`;
			return;
		}
		if (!code) {
			erreur = "Aucun code d'autorisation reçu.";
			return;
		}

		try {
			const retour = await terminerConnexion(code);
			await goto(retour, { replaceState: true });
		} catch (e) {
			erreur = e instanceof Error ? e.message : String(e);
		}
	});
</script>

<div class="callback">
	{#if erreur}
		<p class="erreur">{erreur}</p>
		<a href="/admin">Réessayer</a>
	{:else}
		<p>Connexion en cours…</p>
	{/if}
</div>

<style>
	.callback {
		display: grid;
		place-items: center;
		height: 100vh;
		gap: 1rem;
		font-family: -apple-system, 'Segoe UI', sans-serif;
	}
	.erreur {
		color: #b91c1c;
	}
</style>
