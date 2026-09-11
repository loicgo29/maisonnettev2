<script lang="ts">
	import { page } from '$app/stores';
	import { deconnexion, chargeUtile, jeton } from '$lib/auth';

	let nomUtilisateur = $derived.by(() => {
		const t = jeton();
		return t ? (chargeUtile(t)?.preferred_username ?? chargeUtile(t)?.email ?? 'Admin') : 'Admin';
	});

	function buildAloLink(): string {
		const token = jeton();
		if (!token) return 'https://alo.maisonnette-pecheur-bertheaume.fr/';
		return `https://alo.maisonnette-pecheur-bertheaume.fr/login?token=${encodeURIComponent(token)}`;
	}
</script>

<div class="dashboard">
	<div class="header">
		<h1>🏠 Maisonnette Pécheur Bértheaume</h1>
		<div class="user-info">
			<span>Connecté: <strong>{nomUtilisateur}</strong></span>
			<button on:click={deconnexion} class="btn-logout">Déconnexion</button>
		</div>
	</div>

	<div class="content">
		<h2>Administration</h2>
		<div class="links-grid">
			<a href="/admin/reservations" class="link-card">
				<div class="icon">📅</div>
				<h3>Réservations</h3>
				<p>Gérer les réservations et les messages des clients</p>
			</a>

			<a href="/admin/messages" class="link-card">
				<div class="icon">📬</div>
				<h3>Messages</h3>
				<p>Gérer les messages et les relances de paiement</p>
			</a>

			<a href={buildAloLink()} class="link-card">
				<div class="icon">💶</div>
				<h3>Comptes ALO</h3>
				<p>Gérer les comptes et la comptabilité</p>
			</a>
		</div>
	</div>
</div>

<style>
	.dashboard {
		min-height: 100vh;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
			sans-serif;
	}

	.header {
		background: rgba(255, 255, 255, 0.95);
		padding: 1.5rem 2rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	h1 {
		margin: 0;
		font-size: 1.8rem;
		color: #333;
	}

	.user-info {
		display: flex;
		gap: 1rem;
		align-items: center;
		color: #666;
	}

	.btn-logout {
		padding: 0.5rem 1rem;
		background: #667eea;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
		font-weight: 500;
	}

	.btn-logout:hover {
		background: #764ba2;
	}

	.content {
		max-width: 1000px;
		margin: 2rem auto;
		padding: 0 1rem;
	}

	h2 {
		color: white;
		font-size: 1.5rem;
		margin-bottom: 2rem;
	}

	.links-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.link-card {
		background: white;
		padding: 2rem;
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		text-decoration: none;
		color: inherit;
		transition: transform 0.2s, box-shadow 0.2s;
	}

	.link-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
	}

	.icon {
		font-size: 2.5rem;
		margin-bottom: 1rem;
	}

	.link-card h3 {
		margin: 0 0 0.5rem;
		font-size: 1.3rem;
		color: #333;
	}

	.link-card p {
		margin: 0;
		color: #666;
		font-size: 0.95rem;
	}
</style>
