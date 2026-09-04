<script lang="ts">
	import { estConnecte, demarrerConnexion, deconnexion } from '../../lib/auth';
	import { jeton, chargeUtile, aLeRoleAdmin } from '../../lib/auth';

	let isConnected = estConnecte();
	let isAdmin = false;

	$: if (isConnected) {
		const token = jeton();
		isAdmin = token ? aLeRoleAdmin(token) : false;
		if (!isAdmin) {
			// Rediriger vers la page d'accueil si pas admin
			window.location.href = '/';
		}
	}

	function handleLogin() {
		demarrerConnexion('/backoffice/meals');
	}

	function handleLogout() {
		deconnexion();
	}
</script>

<nav class="backoffice-nav">
	<div class="nav-brand">🏠 Backoffice</div>
	<div class="nav-menu">
		<a href="/backoffice/meals" class="nav-link">🍽️ Repas</a>
		<!-- Futurs modules backoffice ici -->
	</div>
	<div class="nav-auth">
		{#if isConnected}
			<span class="user-info">Connecté</span>
			<button on:click={handleLogout} class="btn-logout">Se déconnecter</button>
		{:else}
			<button on:click={handleLogin} class="btn-login">Se connecter</button>
		{/if}
	</div>
</nav>

<slot />

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background-color: #fafafa;
	}

	.backoffice-nav {
		background-color: #2c3e50;
		color: white;
		padding: 12px 20px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 2px solid #1a252f;
		gap: 30px;
	}

	.nav-brand {
		font-size: 1.2em;
		font-weight: bold;
		flex-shrink: 0;
	}

	.nav-menu {
		display: flex;
		gap: 20px;
		flex: 1;
	}

	.nav-link {
		color: white;
		text-decoration: none;
		padding: 6px 12px;
		border-radius: 4px;
		transition: background-color 0.2s;
	}

	.nav-link:hover {
		background-color: rgba(255, 255, 255, 0.1);
	}

	.nav-auth {
		display: flex;
		gap: 12px;
		align-items: center;
		flex-shrink: 0;
	}

	.user-info {
		font-size: 0.9em;
		opacity: 0.9;
	}

	.btn-login,
	.btn-logout {
		padding: 6px 12px;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9em;
		transition: background-color 0.2s;
	}

	.btn-login {
		background-color: #4CAF50;
		color: white;
	}

	.btn-login:hover {
		background-color: #45a049;
	}

	.btn-logout {
		background-color: #f44336;
		color: white;
	}

	.btn-logout:hover {
		background-color: #da190b;
	}
</style>
