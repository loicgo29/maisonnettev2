<script lang="ts">
	import { page } from '$app/stores';

	// La page de connexion n'a pas de menu : l'afficher y proposerait des liens
	// tous inaccessibles, et la redirection du +layout.ts les rejetterait.
	$: surLaConnexion = $page.url.pathname === '/backoffice/login';

	// alo vit sur son propre sous-domaine — son nginx sert /api, qui entrerait
	// en collision avec l'API de maisonnettev2 sous un simple chemin. L'URL se
	// déduit donc de l'hôte courant plutôt que d'être écrite en dur, pour valoir
	// aussi bien en développement qu'en production.
	$: urlAlo = construireUrlAlo($page.url);

	function construireUrlAlo(url: URL): string {
		const hote = url.hostname.replace(/^www\./, '');
		const port = url.port ? `:${url.port}` : '';
		return `${url.protocol}//alo.${hote}${port}/`;
	}
</script>

{#if surLaConnexion}
	<slot />
{:else}
	<nav>
		<span class="marque">Backoffice</span>
		<a href="/backoffice/meals" class:actif={$page.url.pathname.startsWith('/backoffice/meals')}>
			🍽️ Repas
		</a>
		<a href={urlAlo}>💶 alo</a>
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
