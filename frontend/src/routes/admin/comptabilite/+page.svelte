<script lang="ts">
	import { onMount } from 'svelte';

	let status = 'Comptabilité';
	let sageAuthorized = false;
	let sageExpiresIn = 0;
	let loading = false;
	let message = '';

	onMount(async () => {
		// Check Sage auth status
		try {
			const r = await fetch('/api/admin/comptabilite/status', {
				credentials: 'include'
			});
			const data = await r.json();
			sageAuthorized = data.sage_authenticated || false;
			sageExpiresIn = data.expires_in || 0;
		} catch (e) {
			console.error('Status fetch failed:', e);
		}
	});

	async function authorizeSage() {
		loading = true;
		message = 'Redirection vers Sage...';

		try {
			const r = await fetch('/api/admin/comptabilite/oauth/authorize', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include'
			});
			const data = await r.json();

			if (data.authUrl) {
				// Redirect to Sage OAuth
				window.location.href = data.authUrl;
			} else {
				message = '❌ Erreur: URL manquante';
				loading = false;
			}
		} catch (e) {
			message = `❌ Erreur: ${e}`;
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>{status}</title>
</svelte:head>

<div class="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
	<div class="bg-white rounded-lg shadow-2xl max-w-md w-full p-8">
		<h1 class="text-3xl font-bold text-blue-600 mb-2 text-center">📊 Comptabilité</h1>
		<p class="text-gray-600 text-center mb-8">Gestion des factures (SASU)</p>

		<div class="space-y-4">
			<!-- Sage Status -->
			<div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
				<p class="text-sm font-semibold text-gray-700 mb-2">🔗 Connexion Sage</p>
				{#if sageAuthorized}
					<p class="text-green-600 font-medium">✅ Autorisé</p>
					<p class="text-xs text-gray-500 mt-1">Expire dans {sageExpiresIn}s</p>
				{:else}
					<p class="text-red-600 font-medium">❌ Non autorisé</p>
					<p class="text-xs text-gray-500 mt-1">Cliquez pour autoriser</p>
				{/if}
			</div>

			<!-- Authorize Button -->
			<button
				on:click={authorizeSage}
				disabled={loading}
				class="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
			>
				{loading ? '⏳ Chargement...' : '🔐 Autoriser Sage'}
			</button>

			<!-- Message -->
			{#if message}
				<p class="text-sm {message.includes('✅') ? 'text-green-600' : 'text-red-600'} text-center">
					{message}
				</p>
			{/if}
		</div>

		<!-- Footer -->
		<p class="text-xs text-gray-500 text-center mt-8">
			⚠️ Cette page est protégée par SSO Admin (Keycloak)
		</p>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
	}
</style>
