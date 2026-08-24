<script lang="ts">
	import { goto } from '$app/navigation';

	function goToProperty() {
		goto('/gite/bertheaume');
	}

	function goToCalendar() {
		goto('/calendar');
	}
</script>

<div class="hero">
	<div class="hero-content">
		<h1>Maisonnette de Bertheaume</h1>
		<p class="subtitle">Échappée en bord de mer, 45m² de charme breton</p>

		<div class="cta-buttons">
			<button class="btn-primary" onclick={goToProperty}>
				📍 Voir la maisonnette
			</button>
			<button class="btn-secondary" onclick={goToCalendar}>
				📅 Consulter les disponibilités
			</button>
		</div>

		<div class="highlights">
			<div class="highlight-item">
				<span class="icon">🏠</span>
				<span>45 m² cosy</span>
			</div>
			<div class="highlight-item">
				<span class="icon">👥</span>
				<span>6 personnes max</span>
			</div>
			<div class="highlight-item">
				<span class="icon">🏖️</span>
				<span>3 min à pied de la plage</span>
			</div>
			<div class="highlight-item">
				<span class="icon">⭐</span>
				<span>Tout équipé</span>
			</div>
		</div>
	</div>

	<div class="hero-image">
		<img src="https://via.placeholder.com/600x400?text=Maisonnette+de+Bertheaume" alt="Vue de la maisonnette" />
	</div>
</div>

<div class="availability-preview">
	<div class="container">
		<h2>📅 Tarifs & Disponibilités</h2>
		<p class="lead">Consultez nos tarifs selon la saison et réservez directement en ligne</p>

		<div class="pricing-grid">
			<div class="price-card">
				<div class="season">Basse saison</div>
				<div class="dates">30 oct - 15 avr</div>
				<div class="price">60€<span>/nuit</span></div>
				<button class="btn-small" onclick={goToCalendar}>Voir disponibilités</button>
			</div>

			<div class="price-card highlight">
				<div class="season">Haute saison</div>
				<div class="dates">1 juil - 31 août</div>
				<div class="price">120€<span>/nuit</span></div>
				<button class="btn-small" onclick={goToCalendar}>Voir disponibilités</button>
			</div>

			<div class="price-card">
				<div class="season">Au mois</div>
				<div class="dates">15 sep - 15 juin</div>
				<div class="price">720€<span>/mois</span></div>
				<button class="btn-small" onclick={goToCalendar}>Voir disponibilités</button>
			</div>
		</div>

		<div class="cta-section">
			<h3>Prêt(e) à réserver ?</h3>
			<button class="btn-large" onclick={goToCalendar}>
				Consulter le calendrier & réserver
			</button>
			<p class="info">✨ Connexion directe à Google Calendar pour suivi des réservations</p>
		</div>
	</div>
</div>

<style>
	:global(body) {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		margin: 0;
		padding: 0;
		background: #f8f9fa;
	}

	.hero {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 3rem;
		align-items: center;
		padding: 4rem 2rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		margin: -2rem -2rem 4rem -2rem;
	}

	.hero-content h1 {
		font-size: 3rem;
		font-weight: 700;
		margin: 0 0 0.5rem 0;
		line-height: 1.2;
	}

	.subtitle {
		font-size: 1.3rem;
		margin: 0 0 2rem 0;
		opacity: 0.95;
	}

	.cta-buttons {
		display: flex;
		gap: 1rem;
		margin-bottom: 3rem;
		flex-wrap: wrap;
	}

	.btn-primary, .btn-secondary, .btn-small, .btn-large {
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		padding: 0.75rem 1.5rem;
	}

	.btn-primary {
		background: white;
		color: #667eea;
		padding: 1rem 2rem;
		font-size: 1.1rem;
		box-shadow: 0 4px 12px rgba(0,0,0,0.15);
	}

	.btn-primary:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 20px rgba(0,0,0,0.2);
	}

	.btn-secondary {
		background: rgba(255,255,255,0.2);
		color: white;
		border: 2px solid white;
		padding: 0.9rem 2rem;
		font-size: 1.1rem;
	}

	.btn-secondary:hover {
		background: rgba(255,255,255,0.3);
	}

	.highlights {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		margin-top: 2rem;
	}

	.highlight-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 1.05rem;
	}

	.icon {
		font-size: 1.8rem;
	}

	.hero-image {
		position: relative;
		border-radius: 12px;
		overflow: hidden;
		box-shadow: 0 10px 40px rgba(0,0,0,0.2);
	}

	.hero-image img {
		width: 100%;
		height: 400px;
		object-fit: cover;
	}

	.availability-preview {
		padding: 4rem 2rem;
		background: white;
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
	}

	.availability-preview h2 {
		font-size: 2rem;
		text-align: center;
		margin: 0 0 1rem 0;
		color: #333;
	}

	.lead {
		text-align: center;
		font-size: 1.1rem;
		color: #666;
		margin: 0 0 3rem 0;
	}

	.pricing-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 2rem;
		margin-bottom: 3rem;
	}

	.price-card {
		background: #f8f9fa;
		border: 1px solid #e0e0e0;
		border-radius: 12px;
		padding: 2rem;
		text-align: center;
		transition: all 0.3s ease;
	}

	.price-card:hover {
		box-shadow: 0 8px 24px rgba(0,0,0,0.1);
		transform: translateY(-4px);
	}

	.price-card.highlight {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border: none;
		box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
	}

	.season {
		font-weight: 600;
		font-size: 1.1rem;
		margin-bottom: 0.5rem;
	}

	.dates {
		font-size: 0.9rem;
		opacity: 0.7;
		margin-bottom: 1.5rem;
	}

	.price {
		font-size: 2.5rem;
		font-weight: 700;
		margin: 1rem 0;
	}

	.price span {
		font-size: 1rem;
		opacity: 0.8;
	}

	.btn-small {
		background: #667eea;
		color: white;
		width: 100%;
		margin-top: 1rem;
	}

	.price-card.highlight .btn-small {
		background: rgba(255,255,255,0.2);
		border: 2px solid white;
	}

	.btn-small:hover {
		opacity: 0.9;
	}

	.cta-section {
		text-align: center;
		padding: 3rem 2rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		border-radius: 12px;
		color: white;
		margin-top: 3rem;
	}

	.cta-section h3 {
		font-size: 2rem;
		margin: 0 0 1.5rem 0;
	}

	.btn-large {
		background: white;
		color: #667eea;
		padding: 1rem 3rem;
		font-size: 1.2rem;
		font-weight: 700;
		width: auto;
	}

	.btn-large:hover {
		transform: scale(1.05);
	}

	.info {
		margin-top: 1rem;
		opacity: 0.95;
		font-size: 0.95rem;
	}

	@media (max-width: 768px) {
		.hero {
			grid-template-columns: 1fr;
			padding: 2rem 1rem;
			margin: -1rem -1rem 2rem -1rem;
		}

		.hero-content h1 {
			font-size: 2rem;
		}

		.hero-image img {
			height: 300px;
		}

		.highlights {
			grid-template-columns: 1fr;
		}

		.cta-buttons {
			flex-direction: column;
		}

		.btn-primary, .btn-secondary {
			width: 100%;
		}

		.pricing-grid {
			grid-template-columns: 1fr;
		}

		.availability-preview h2 {
			font-size: 1.5rem;
		}
	}
</style>
