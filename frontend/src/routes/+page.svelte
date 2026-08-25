<script>
	const photos = [
		'/images/IMG_0618.JPG',
		'/images/IMG_0627.JPG',
		'/images/IMG_0632.JPG',
		'/images/IMG_0621.JPG',
		'/images/GOPR5979.JPG',
		'/images/IMG_0613.JPG',
		'/images/IMG_0619.JPG',
		'/images/GOPR5983.JPG'
	];
</script>

<div class="page">
	<section class="gallery-section">
		<div class="carousel-container">
			<!-- Radio inputs pour navigation (cachés) -->
			{#each photos as _, index}
				<input
					type="radio"
					id="photo-{index}"
					name="gallery"
					defaultChecked={index === 0}
					class="carousel-input"
				/>
			{/each}

			<!-- Photos avec transitions -->
			<div class="carousel-track">
				{#each photos as photo, index}
					<div class="carousel-slide">
						<img src={photo} alt="Photo {index + 1}" />
					</div>
				{/each}
			</div>

			<!-- Navigation dots (labels) -->
			<div class="carousel-nav">
				{#each photos as _, index}
					<label for="photo-{index}" class="nav-dot" title="Photo {index + 1}">
						{index + 1}
					</label>
				{/each}
			</div>

			<!-- Counter -->
			<div class="carousel-counter">
				<span id="current-photo">1</span> / {photos.length}
			</div>
		</div>

		<!-- Infos -->
		<div class="gallery-info">
			<h1>Maisonnette de Bertheaume</h1>
			<p class="subtitle">Maison entière · Côtes d'Armor · 6 personnes · 2 chambres</p>
			<p class="description">
				Nichée à la pointe de Bertheaume, cette maisonnette et son très grand jardin arboré vous
				accueillent pour des vacances inoubliables.
			</p>
			<button class="btn-reserve">Voir les disponibilités et réserver</button>
		</div>
	</section>
</div>

<style>
	.page {
		min-height: 100vh;
		background: linear-gradient(to bottom, #f8f9fa, #ffffff);
		padding: 40px 20px;
	}

	.gallery-section {
		max-width: 900px;
		margin: 0 auto;
	}

	/* Carousel Container */
	.carousel-container {
		position: relative;
		width: 100%;
		aspect-ratio: 16 / 9;
		border-radius: 12px;
		overflow: hidden;
		background: #000;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
		margin-bottom: 40px;
	}

	/* Cacher les inputs radio */
	.carousel-input {
		display: none;
	}

	/* Track des photos */
	.carousel-track {
		display: flex;
		width: 100%;
		height: 100%;
		position: relative;
	}

	.carousel-slide {
		flex: 0 0 100%;
		width: 100%;
		height: 100%;
		opacity: 0;
		transition: opacity 0.8s ease-in-out;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.carousel-slide img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/* Montrer la photo sélectionnée */
	#photo-0:checked ~ .carousel-track .carousel-slide:nth-child(1),
	#photo-1:checked ~ .carousel-track .carousel-slide:nth-child(2),
	#photo-2:checked ~ .carousel-track .carousel-slide:nth-child(3),
	#photo-3:checked ~ .carousel-track .carousel-slide:nth-child(4),
	#photo-4:checked ~ .carousel-track .carousel-slide:nth-child(5),
	#photo-5:checked ~ .carousel-track .carousel-slide:nth-child(6),
	#photo-6:checked ~ .carousel-track .carousel-slide:nth-child(7),
	#photo-7:checked ~ .carousel-track .carousel-slide:nth-child(8) {
		opacity: 1;
	}

	/* Mettre à jour le compteur */
	#photo-0:checked ~ .carousel-counter #current-photo { content: '1'; }
	#photo-1:checked ~ .carousel-counter #current-photo { content: '2'; }
	#photo-2:checked ~ .carousel-counter #current-photo { content: '3'; }
	#photo-3:checked ~ .carousel-counter #current-photo { content: '4'; }
	#photo-4:checked ~ .carousel-counter #current-photo { content: '5'; }
	#photo-5:checked ~ .carousel-counter #current-photo { content: '6'; }
	#photo-6:checked ~ .carousel-counter #current-photo { content: '7'; }
	#photo-7:checked ~ .carousel-counter #current-photo { content: '8'; }

	/* Navigation dots */
	.carousel-nav {
		position: absolute;
		bottom: 20px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		gap: 12px;
		z-index: 10;
	}

	.nav-dot {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.5);
		border: 2px solid white;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		font-weight: bold;
		color: white;
		transition: all 0.3s ease;
		user-select: none;
	}

	.nav-dot:hover {
		background: rgba(255, 255, 255, 0.7);
		transform: scale(1.1);
	}

	/* Photo sélectionnée = dot actif */
	#photo-0:checked ~ .carousel-nav label:nth-child(1),
	#photo-1:checked ~ .carousel-nav label:nth-child(2),
	#photo-2:checked ~ .carousel-nav label:nth-child(3),
	#photo-3:checked ~ .carousel-nav label:nth-child(4),
	#photo-4:checked ~ .carousel-nav label:nth-child(5),
	#photo-5:checked ~ .carousel-nav label:nth-child(6),
	#photo-6:checked ~ .carousel-nav label:nth-child(7),
	#photo-7:checked ~ .carousel-nav label:nth-child(8) {
		background: white;
		color: #667eea;
		font-weight: bold;
	}

	/* Counter */
	.carousel-counter {
		position: absolute;
		top: 20px;
		right: 20px;
		background: rgba(0, 0, 0, 0.6);
		color: white;
		padding: 8px 16px;
		border-radius: 6px;
		font-size: 14px;
		font-weight: bold;
		z-index: 10;
		backdrop-filter: blur(4px);
	}

	/* Auto-rotation avec animation CSS */
	.carousel-container {
		--rotation-index: 0;
		animation: autoRotate 40s linear infinite;
	}

	.carousel-container:hover {
		animation-play-state: paused;
	}

	@keyframes autoRotate {
		0% { --rotation-index: 0; }
		12.5% { --rotation-index: 1; }
		25% { --rotation-index: 2; }
		37.5% { --rotation-index: 3; }
		50% { --rotation-index: 4; }
		62.5% { --rotation-index: 5; }
		75% { --rotation-index: 6; }
		87.5% { --rotation-index: 7; }
		100% { --rotation-index: 0; }
	}

	/* Simuler l'auto-rotation avec inputs cachés */
	#photo-0 { animation: rotate-to-0 40s linear infinite; }
	#photo-1 { animation: rotate-to-1 40s linear infinite; }
	#photo-2 { animation: rotate-to-2 40s linear infinite; }
	#photo-3 { animation: rotate-to-3 40s linear infinite; }
	#photo-4 { animation: rotate-to-4 40s linear infinite; }
	#photo-5 { animation: rotate-to-5 40s linear infinite; }
	#photo-6 { animation: rotate-to-6 40s linear infinite; }
	#photo-7 { animation: rotate-to-7 40s linear infinite; }

	@keyframes rotate-to-0 {
		0% { opacity: 1; }
		12.4% { opacity: 1; }
		12.5% { opacity: 0; }
		100% { opacity: 0; }
	}

	@keyframes rotate-to-1 {
		0% { opacity: 0; }
		12.5% { opacity: 1; }
		25% { opacity: 1; }
		25.1% { opacity: 0; }
		100% { opacity: 0; }
	}

	@keyframes rotate-to-2 {
		0% { opacity: 0; }
		25% { opacity: 1; }
		37.5% { opacity: 1; }
		37.6% { opacity: 0; }
		100% { opacity: 0; }
	}

	@keyframes rotate-to-3 {
		0% { opacity: 0; }
		37.5% { opacity: 1; }
		50% { opacity: 1; }
		50.1% { opacity: 0; }
		100% { opacity: 0; }
	}

	@keyframes rotate-to-4 {
		0% { opacity: 0; }
		50% { opacity: 1; }
		62.5% { opacity: 1; }
		62.6% { opacity: 0; }
		100% { opacity: 0; }
	}

	@keyframes rotate-to-5 {
		0% { opacity: 0; }
		62.5% { opacity: 1; }
		75% { opacity: 1; }
		75.1% { opacity: 0; }
		100% { opacity: 0; }
	}

	@keyframes rotate-to-6 {
		0% { opacity: 0; }
		75% { opacity: 1; }
		87.5% { opacity: 1; }
		87.6% { opacity: 0; }
		100% { opacity: 0; }
	}

	@keyframes rotate-to-7 {
		0% { opacity: 0; }
		87.5% { opacity: 1; }
		99.9% { opacity: 1; }
		100% { opacity: 0; }
	}

	/* Info section */
	.gallery-info {
		background: white;
		padding: 40px 30px;
		border-radius: 12px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
	}

	h1 {
		font-size: 32px;
		font-weight: 700;
		margin: 0 0 10px 0;
		color: #1a1a1a;
	}

	.subtitle {
		font-size: 16px;
		color: #666;
		margin: 0 0 20px 0;
	}

	.description {
		font-size: 15px;
		line-height: 1.6;
		color: #555;
		margin: 0 0 25px 0;
	}

	.btn-reserve {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border: none;
		padding: 14px 32px;
		border-radius: 8px;
		font-size: 16px;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
		box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
	}

	.btn-reserve:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.carousel-nav {
			bottom: 15px;
			gap: 8px;
		}

		.nav-dot {
			width: 32px;
			height: 32px;
			font-size: 11px;
		}

		.carousel-counter {
			top: 15px;
			right: 15px;
			font-size: 13px;
		}

		h1 {
			font-size: 24px;
		}

		.gallery-info {
			padding: 30px 20px;
		}
	}
</style>
