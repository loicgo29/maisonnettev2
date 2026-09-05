<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { jeton, demarrerConnexion, deconnexion, chargeUtile } from '$lib/auth';

	let { children } = $props();

	let pret = $state(false);
	let nomUtilisateur = $state('');

	// La page de callback gère elle-même l'échange du code : ce layout ne doit
	// pas interférer avec elle en tentant une connexion en parallèle.
	const estCallback = $derived($page.url.pathname === '/admin/callback');

	onMount(async () => {
		if (estCallback) {
			pret = true;
			return;
		}
		const t = jeton();
		if (!t) {
			await demarrerConnexion(location.pathname);
			return;
		}
		nomUtilisateur = chargeUtile(t)?.preferred_username ?? chargeUtile(t)?.email ?? '';
		pret = true;
	});
</script>

{#if estCallback}
	{@render children()}
{:else if pret}
	<div class="cadre-admin">
		<header class="entete-admin">
			<a href="/admin" class="marque">Maisonnette — Administration</a>
			<nav>
				<a href="/admin">Tableau de bord</a>
				<a href="/admin/reservations">Réservations</a>
				<a href="/admin/reservations/nouvelle">Nouvelle réservation</a>
				<a href="/admin/messages">Messages</a>
			</nav>
			<div class="utilisateur">
				<span>{nomUtilisateur}</span>
				<button onclick={deconnexion}>Se déconnecter</button>
			</div>
		</header>
		<main>
			{@render children()}
		</main>
	</div>
{:else}
	<p class="attente">Connexion…</p>
{/if}

<style>
	.cadre-admin {
		min-height: 100vh;
		background: #f7f7f5;
		font-family: -apple-system, 'Segoe UI', sans-serif;
		color: #1f2933;
	}
	.entete-admin {
		display: flex;
		align-items: center;
		gap: 2rem;
		padding: 1rem 1.5rem;
		background: #14532d;
		color: white;
	}
	.marque {
		color: white;
		text-decoration: none;
		font-weight: 600;
	}
	nav {
		display: flex;
		gap: 1.25rem;
		flex: 1;
	}
	nav a {
		color: #d1fae5;
		text-decoration: none;
		font-size: 0.95rem;
	}
	nav a:hover {
		color: white;
	}
	.utilisateur {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.9rem;
	}
	.utilisateur button {
		background: transparent;
		border: 1px solid #d1fae5;
		color: white;
		border-radius: 4px;
		padding: 0.35rem 0.75rem;
		cursor: pointer;
	}
	main {
		padding: 1.5rem;
		max-width: 1100px;
		margin: 0 auto;
	}
	.attente {
		display: grid;
		place-items: center;
		height: 100vh;
		color: #6b7280;
	}
</style>
