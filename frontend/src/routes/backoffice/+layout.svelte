<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let isAuthenticated = false;
	let loading = true;

	onMount(async () => {
		// NE PAS rediriger si on est sur /backoffice/login
		if ($page.url.pathname === '/backoffice/login') {
			loading = false;
			return;
		}

		// Vérifie si token existe dans localStorage
		const token = typeof window !== 'undefined' ? localStorage.getItem('backoffice_token') : null;

		if (!token) {
			// Pas de token → rediriger au login
			await goto('/backoffice/login');
			return;
		}

		// Vérifie que le token est valide auprès du backend
		try {
			const response = await fetch('/api/backoffice/auth/verify', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
			});

			if (response.ok) {
				isAuthenticated = true;
				loading = false;
			} else {
				// Token invalide ou expiré
				localStorage.removeItem('backoffice_token');
				localStorage.removeItem('backoffice_user');
				await goto('/backoffice/login');
			}
		} catch (error) {
			console.error('Auth verification failed:', error);
			localStorage.removeItem('backoffice_token');
			await goto('/backoffice/login');
		}
	});

	function handleLogout() {
		localStorage.removeItem('backoffice_token');
		localStorage.removeItem('backoffice_user');
		goto('/backoffice/login');
	}
</script>

{#if loading}
	<div class="loading">Vérification de l'authentification...</div>
{:else if isAuthenticated}
	<nav class="backoffice-nav">
		<div class="nav-brand">🏠 Backoffice</div>
		<div class="nav-menu">
			<a href="/backoffice/meals" class="nav-link">🍽️ Repas</a>
			<!-- Futurs modules backoffice ici -->
		</div>
		<div class="nav-auth">
			<span class="user-info">Authentifié</span>
			<button on:click={handleLogout} class="btn-logout">Se déconnecter</button>
		</div>
	</nav>

	<slot />
{:else}
	<div class="auth-error">Redirection vers la connexion...</div>
{/if}

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background-color: #fafafa;
	}

	.loading,
	.auth-error {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		font-size: 1.1em;
		color: #666;
	}

	.auth-error {
		background-color: #fff3cd;
		color: #856404;
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
