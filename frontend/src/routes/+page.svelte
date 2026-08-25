<script>
	let photoIndex = 0;
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

	function handleNext() {
		console.log('handleNext called, photoIndex before:', photoIndex);
		photoIndex = (photoIndex + 1) % photos.length;
		console.log('photoIndex after:', photoIndex);
	}

	function handlePrev() {
		photoIndex = (photoIndex - 1 + photos.length) % photos.length;
	}
</script>

<div class="container">
	<section class="gallery">
		<div class="main-photo">
			<img src={photos[photoIndex]} alt="Photo {photoIndex + 1}" />
		</div>
		<div class="controls">
			<button on:click={handlePrev}>❮ Précédent</button>
			<span class="counter">{photoIndex + 1} / {photos.length}</span>
			<button on:click={handleNext}>Suivant ❯</button>
		</div>
	</section>
</div>

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 40px 20px;
	}

	.gallery {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		border-radius: 12px;
		padding: 30px;
		box-shadow: 0 10px 40px rgba(0,0,0,0.2);
	}

	.main-photo {
		position: relative;
		width: 100%;
		aspect-ratio: 16 / 9;
		margin-bottom: 20px;
		border-radius: 8px;
		overflow: hidden;
		background: #000;
	}

	.main-photo img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.controls {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 20px;
	}

	button {
		padding: 10px 20px;
		background: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-weight: bold;
		transition: all 0.3s ease;
	}

	button:hover {
		transform: scale(1.05);
		box-shadow: 0 4px 12px rgba(0,0,0,0.2);
	}

	.counter {
		color: white;
		font-size: 18px;
		font-weight: bold;
		min-width: 60px;
		text-align: center;
	}
</style>
