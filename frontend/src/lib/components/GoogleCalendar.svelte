<script lang="ts">
	import { onMount } from 'svelte';

	let events = $state<any[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let authUrl = $state<string | null>(null);

	onMount(async () => {
		try {
			console.log('[Calendar] Fetch started...');
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 8000);

			console.log('[Calendar] Fetching /api/calendar/public');
			const response = await fetch('/api/calendar/public', { signal: controller.signal });
			clearTimeout(timeoutId);

			console.log('[Calendar] Response status:', response.status);
			const text = await response.text();
			console.log('[Calendar] Response text:', text);

			if (!text) {
				error = 'Réponse vide du serveur';
				loading = false;
				return;
			}

			const data = JSON.parse(text);
			console.log('[Calendar] Data received:', data);

			if (data.error) {
				error = data.error;
			} else if (data.authUrl) {
				authUrl = data.authUrl;
				error = null;
				console.log('[Calendar] AuthUrl set, ready for authentication');
			} else {
				events = data.events || [];
				error = null;
			}
		} catch (err) {
			if (err instanceof Error && err.name === 'AbortError') {
				error = 'Timeout : le serveur a mis trop de temps à répondre';
			} else {
				error = 'Erreur lors de la récupération du calendrier';
			}
			console.error('[Calendar] Error:', err);
		} finally {
			loading = false;
		}
	});

	const authenticate = () => {
		if (authUrl) {
			window.location.href = authUrl;
		}
	};
</script>

<div class="calendar-container">
	<h2>Calendrier de disponibilité</h2>

	{#if loading}
		<div class="loading">Chargement du calendrier...</div>
	{:else if authUrl}
		<div class="auth-needed">
			<div class="auth-message">
				<h3>Accès au calendrier requis</h3>
				<p>Cliquez pour autoriser l'accès à votre calendrier Google</p>
			</div>
			<button class="auth-button" onclick={authenticate}>
				🔓 Se connecter avec Google
			</button>
		</div>
	{:else if error}
		<div class="error">{error}</div>
	{:else if events.length === 0}
		<div class="no-events">Aucun événement trouvé</div>
	{:else}
		<div class="events-list">
			{#each events as event (event.id)}
				<div class="event">
					<div class="event-title">{event.summary}</div>
					<div class="event-time">
						{new Date(event.start.dateTime || event.start.date).toLocaleString('fr-FR')}
					</div>
					{#if event.description}
						<div class="event-description">{event.description}</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.calendar-container {
		padding: 2rem;
		max-width: 800px;
		margin: 0 auto;
	}

	h2 {
		margin-bottom: 1.5rem;
		color: #333;
	}

	.loading,
	.error,
	.no-events {
		padding: 1rem;
		border-radius: 8px;
		text-align: center;
		font-size: 1.1rem;
	}

	.loading {
		background: #e3f2fd;
		color: #1976d2;
	}

	.error {
		background: #ffebee;
		color: #c62828;
	}

	.no-events {
		background: #f5f5f5;
		color: #666;
	}

	.auth-needed {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		border-radius: 12px;
		padding: 2rem;
		text-align: center;
		color: white;
	}

	.auth-message h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.3rem;
	}

	.auth-message p {
		margin: 0 0 1.5rem 0;
		opacity: 0.9;
	}

	.auth-button {
		background: white;
		color: #667eea;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.2s, box-shadow 0.2s;
	}

	.auth-button:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.events-list {
		display: grid;
		gap: 1rem;
	}

	.event {
		border: 1px solid #ddd;
		border-radius: 8px;
		padding: 1rem;
		background: #fff;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		transition: box-shadow 0.2s;
	}

	.event:hover {
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
	}

	.event-title {
		font-weight: 600;
		font-size: 1.1rem;
		margin-bottom: 0.5rem;
		color: #333;
	}

	.event-time {
		font-size: 0.9rem;
		color: #666;
		margin-bottom: 0.5rem;
	}

	.event-description {
		font-size: 0.95rem;
		color: #777;
		margin-top: 0.5rem;
		line-height: 1.4;
	}
</style>