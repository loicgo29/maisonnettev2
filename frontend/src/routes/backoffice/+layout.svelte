<script lang="ts">
	import { page } from '$app/stores';
	import { urlAlo } from '$lib/alo';

	// La page de connexion n'a pas de menu : l'afficher y proposerait des liens
	// tous inaccessibles, et la redirection du +layout.ts les rejetterait.
	$: surLaConnexion = $page.url.pathname === '/backoffice/login';

	$: lienAlo = urlAlo($page.url);
</script>

{#if surLaConnexion}
	<slot />
{:else}
	<nav>
		<span class="marque">Backoffice</span>
		<a href="/backoffice/meals" class:actif={$page.url.pathname.startsWith('/backoffice/meals')}>
			🍽️ Repas
		</a>
		<a href={lienAlo}>💶 alo</a>
		<a href="/backoffice/logout" class="deconnexion">Déconnexion</a>
	</nav>

	<slot />
{/if}

<style>
	nav {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.marque {
		font-weight: 600;
		color: #fff;
		margin-right: 1rem;
	}

	nav a {
		color: rgba(255, 255, 255, 0.85);
		text-decoration: none;
		padding: 0.4rem 0.75rem;
		border-radius: 4px;
		font-size: 0.9rem;
		transition: background 0.2s, color 0.2s;
	}

	nav a:hover {
		background: rgba(255, 255, 255, 0.15);
		color: #fff;
	}

	nav a.actif {
		background: rgba(255, 255, 255, 0.22);
		color: #fff;
		font-weight: 600;
	}

	.deconnexion {
		margin-left: auto;
	}
</style>
