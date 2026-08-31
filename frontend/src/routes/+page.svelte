<script>
	import BookingCalendar from '$lib/components/BookingCalendar.svelte';
	import GoogleCalendar from '$lib/components/GoogleCalendar.svelte';

	const photos = [
		{ src: '/images/IMG_0618.JPG', alt: 'Jardin à gauche' },
		{ src: '/images/IMG_0627.JPG', alt: 'Vue d\'ensemble' },
		{ src: '/images/IMG_0632.JPG', alt: 'Maison' },
		{ src: '/images/IMG_0621.JPG', alt: 'Terrasse' },
		{ src: '/images/GOPR5979.JPG', alt: 'Extérieur 1' },
		{ src: '/images/IMG_0613.JPG', alt: 'Jardin' },
		{ src: '/images/IMG_0619.JPG', alt: 'Extérieur 2' },
		{ src: '/images/GOPR5983.JPG', alt: 'Piscine' }
	];

	let lightboxOpen = false;
	let selectedPhoto = null;
	let showCalendar = false;

	function openLightbox(photo) {
		selectedPhoto = photo;
		lightboxOpen = true;
		document.body.style.overflow = 'hidden';
	}

	function closeLightbox() {
		lightboxOpen = false;
		document.body.style.overflow = '';
		selectedPhoto = null;
	}

	function toggleCalendar() {
		showCalendar = !showCalendar;
		if (showCalendar) {
			setTimeout(() => {
				document.getElementById('calendar-section')?.scrollIntoView({ behavior: 'smooth' });
			}, 100);
		}
	}

	function handleKeydown(e) {
		if (e.key === 'Escape') {
			closeLightbox();
			if (showCalendar) {
				showCalendar = false;
			}
		}
	}
</script>

<svelte:head>
	<title>Maisonnette de Bertheaume - Gîte de vacances Côtes d'Armor</title>
	<meta name="description" content="Maisonnette de Bertheaume: gîte de 45m² pour 6 personnes aux Côtes d'Armor. À 3 min de la plage. Jardin arboré, chauffage, tout confort." />
	<meta name="og:title" content="Maisonnette de Bertheaume - Gîte de vacances" />
	<meta name="og:description" content="Maisonnette idéale pour vos vacances en famille aux Côtes d'Armor" />
</svelte:head>

<svelte:window on:keydown={handleKeydown} />

<div class="page">
	<section class="hero">
		<h1>Maisonnette de Bertheaume</h1>
		<p class="tagline">Maison entière · Côtes d'Armor · 6 personnes · 2 chambres</p>
		<p class="description">
			Nichée à la pointe de Bertheaume, cette maisonnette et son très grand jardin arboré vous
			accueillent pour des vacances inoubliables. Récemment rénovée, chaleureuse et tout confort,
			la maison offre 45 m² fonctionnels pour 6 personnes.
		</p>
	</section>

	<section class="gallery">
		<h2>Photos de la propriété</h2>
		<div class="photo-grid">
			{#each photos as photo, i}
				<div class="photo-card" title={photo.alt} on:click={() => openLightbox(photo)} role="button" tabindex="0">
					<img src={photo.src} alt={photo.alt} loading="lazy" />
					<span class="photo-number">{i + 1}</span>
				</div>
			{/each}
		</div>
	</section>

	<section class="info-grid">
		<div class="info-card">
			<h3>🏖️ Localisation</h3>
			<p>3 minutes à pied de la plage de sable fin</p>
		</div>
		<div class="info-card">
			<h3>🛏️ Chambres</h3>
			<p>2 chambres + canapé convertible</p>
		</div>
		<div class="info-card">
			<h3>👥 Capacité</h3>
			<p>6 personnes confortablement</p>
		</div>
		<div class="info-card">
			<h3>📏 Surface</h3>
			<p>45 m² entièrement équipés</p>
		</div>
	</section>

	<section class="cta">
		<h2>Prêt pour vos vacances?</h2>
		<button class="btn-primary" on:click={toggleCalendar}>
			{showCalendar ? 'Masquer le calendrier' : 'Consulter les disponibilités'}
		</button>
	</section>

	{#if showCalendar}
		<section id="calendar-section" class="calendar-section">
			<h2>📅 Calendrier de Réservation</h2>
			<div class="calendar-grid">
				<div class="calendar-main">
					<BookingCalendar />
				</div>
				<div class="calendar-auth">
					<GoogleCalendar />
				</div>
			</div>
		</section>
	{/if}
</div>

{#if lightboxOpen && selectedPhoto}
	<div class="lightbox" on:click={closeLightbox} role="button" tabindex="-1">
		<div class="lightbox-content" on:click|stopPropagation={() => {}}>
			<button class="lightbox-close" on:click={closeLightbox}>✕</button>
			<img src={selectedPhoto.src} alt={selectedPhoto.alt} />
		</div>
	</div>
{/if}

<footer class="footer">
	<p>&copy; 2026 Maisonnette de Bertheaume. Tous droits réservés.</p>
	<p><a href="/contact">Nous contacter</a> | Téléphone: <a href="tel:+33781103889">+33 7 81 10 38 89</a></p>
</footer>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu,
			Cantarell, sans-serif;
	}

	.page {
		background: linear-gradient(to bottom, #f5f7fa 0%, #ffffff 100%);
		min-height: 100vh;
	}

	/* Hero */
	.hero {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		padding: 60px 20px;
		text-align: center;
	}

	.hero h1 {
		margin: 0 0 10px 0;
		font-size: 42px;
		font-weight: 700;
	}

	.tagline {
		font-size: 18px;
		margin: 0 0 30px 0;
		opacity: 0.95;
	}

	.description {
		max-width: 600px;
		margin: 0 auto;
		font-size: 16px;
		line-height: 1.6;
		opacity: 0.9;
	}

	/* Gallery */
	.gallery {
		max-width: 1200px;
		margin: 60px auto;
		padding: 0 20px;
	}

	.gallery h2 {
		text-align: center;
		font-size: 32px;
		margin: 0 0 40px 0;
		color: #1a1a1a;
	}

	.photo-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 16px;
		margin-bottom: 60px;
	}

	.photo-card {
		position: relative;
		aspect-ratio: 1;
		border-radius: 8px;
		overflow: hidden;
		background: #e0e0e0;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		transition: transform 0.3s ease, box-shadow 0.3s ease;
		cursor: pointer;
	}

	.photo-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
	}

	.photo-card img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.photo-number {
		position: absolute;
		top: 12px;
		right: 12px;
		background: rgba(0, 0, 0, 0.6);
		color: white;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 14px;
		font-weight: bold;
		backdrop-filter: blur(4px);
	}

	/* Info Grid */
	.info-grid {
		max-width: 1200px;
		margin: 0 auto 60px;
		padding: 0 20px;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 24px;
	}

	.info-card {
		background: white;
		padding: 30px 20px;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
		text-align: center;
	}

	.info-card h3 {
		margin: 0 0 12px 0;
		font-size: 20px;
	}

	.info-card p {
		margin: 0;
		color: #666;
		font-size: 15px;
	}

	/* CTA */
	.cta {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		padding: 60px 20px;
		text-align: center;
	}

	.cta h2 {
		margin: 0 0 30px 0;
		font-size: 32px;
	}

	.btn-primary {
		background: white;
		color: #667eea;
		border: none;
		padding: 16px 40px;
		border-radius: 8px;
		font-size: 16px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
	}

	.btn-primary:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
	}

	/* Lightbox */
	.lightbox {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.9);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 20px;
		cursor: pointer;
	}

	.lightbox-content {
		position: relative;
		max-width: 90vw;
		max-height: 90vh;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: default;
	}

	.lightbox-content img {
		max-width: 100%;
		max-height: 100%;
		border-radius: 4px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
	}

	.lightbox-close {
		position: absolute;
		top: -40px;
		right: 0;
		background: rgba(255, 255, 255, 0.2);
		border: none;
		color: white;
		font-size: 32px;
		width: 50px;
		height: 50px;
		border-radius: 50%;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.3s ease;
	}

	.lightbox-close:hover {
		background: rgba(255, 255, 255, 0.4);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.hero h1 {
			font-size: 28px;
		}

		.tagline {
			font-size: 16px;
		}

		.gallery h2 {
			font-size: 24px;
		}

		.photo-grid {
			grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
			gap: 12px;
		}

		.cta h2 {
			font-size: 24px;
		}

		.calendar-grid {
			grid-template-columns: 1fr;
		}
	}

	/* Footer */
	.footer {
		background: #1a1a1a;
		color: white;
		padding: 40px 20px;
		text-align: center;
		font-size: 14px;
		margin-top: 60px;
	}

	.footer p {
		margin: 8px 0;
	}

	.footer a {
		color: #667eea;
		text-decoration: none;
	}

	.footer a:hover {
		text-decoration: underline;
	}

	/* Calendar Section */
	.calendar-section {
		background: #f5f7fa;
		padding: 60px 20px;
		margin-top: 40px;
	}

	.calendar-section h2 {
		text-align: center;
		font-size: 32px;
		margin: 0 0 40px 0;
		color: #1a1a1a;
	}

	.calendar-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 30px;
		max-width: 1200px;
		margin: 0 auto;
	}

	.calendar-main {
		order: 1;
	}

	.calendar-auth {
		order: 2;
	}

	@media (max-width: 900px) {
		.calendar-grid {
			grid-template-columns: 1fr;
		}

		.calendar-auth {
			order: 2;
		}
	}
</style>
