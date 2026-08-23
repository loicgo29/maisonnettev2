<script lang="ts">
	interface Photo {
		id: string;
		url: string;
		alt?: string;
		categorie?: string;
		ordre?: number;
	}

	let { photos }: { photos: Photo[] } = $props();
	let mainPhotoIndex = $state(0);
	let lightboxOpen = $state(false);

	function openLightbox(index: number) {
		mainPhotoIndex = index;
		lightboxOpen = true;
	}

	function closeLightbox() {
		lightboxOpen = false;
	}

	function nextPhoto() {
		if (mainPhotoIndex < photos.length - 1) {
			mainPhotoIndex++;
		}
	}

	function prevPhoto() {
		if (mainPhotoIndex > 0) {
			mainPhotoIndex--;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!lightboxOpen) return;
		if (e.key === 'ArrowRight') nextPhoto();
		if (e.key === 'ArrowLeft') prevPhoto();
		if (e.key === 'Escape') closeLightbox();
	}

	let touchStartX = 0;
	function handleTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
	}

	function handleTouchEnd(e: TouchEvent) {
		const touchEndX = e.changedTouches[0].clientX;
		const diff = touchStartX - touchEndX;
		if (Math.abs(diff) > 50) {
			if (diff > 0) nextPhoto();
			else prevPhoto();
		}
	}

	const thumbnailsPerPage = 5;
	const startIdx = Math.max(0, mainPhotoIndex - Math.floor(thumbnailsPerPage / 2));
	const endIdx = Math.min(photos.length, startIdx + thumbnailsPerPage);
	const visibleThumbnails = photos.slice(startIdx, endIdx);
</script>

<svelte:window on:keydown={handleKeydown} />

<div style="width: 100%;">
	<!-- Hero principale image -->
	<div
		style="position: relative; width: 100%; aspect-ratio: 16/9; overflow: hidden; border-radius: 12px; background: #f0f0f0; margin-bottom: 1rem; cursor: pointer;"
		on:click={() => openLightbox(mainPhotoIndex)}
	>
		<img
			src={photos[mainPhotoIndex].url}
			alt={photos[mainPhotoIndex].alt || 'Photo'}
			style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease;"
		/>
		<div
			style="position: absolute; top: 1rem; right: 1rem; background: rgba(0,0,0,0.6); color: white; padding: 0.5rem 1rem; border-radius: 24px; font-size: 0.9rem; font-weight: bold;"
		>
			{mainPhotoIndex + 1} / {photos.length}
		</div>
	</div>

	<!-- Dots navigation -->
	<div style="display: flex; gap: 0.5rem; justify-content: center; margin-bottom: 1.5rem; flex-wrap: wrap;">
		{#each photos as _, index (index)}
			<button
				on:click={() => (mainPhotoIndex = index)}
				style="width: 8px; height: 8px; border-radius: 50%; border: 2px solid {index === mainPhotoIndex ? '#333' : '#ddd'}; background: {index === mainPhotoIndex ? '#333' : 'white'}; cursor: pointer; padding: 0;"
				aria-label="Photo {index + 1}"
			/>
		{/each}
	</div>

	<!-- Thumbnails scroll -->
	<div style="overflow-x: auto; padding: 0.5rem 0; margin-bottom: 1rem;">
		<div style="display: flex; gap: 0.5rem; min-width: min-content;">
			{#each visibleThumbnails as photo, idx (photo.id)}
				{@const realIdx = startIdx + idx}
				<button
					on:click={() => (mainPhotoIndex = realIdx)}
					style="flex-shrink: 0; width: 80px; height: 80px; border: {realIdx === mainPhotoIndex ? '3px solid #333' : '2px solid #ddd'}; border-radius: 8px; overflow: hidden; padding: 0; background: none; cursor: pointer; transition: all 0.2s;"
				>
					<img
						src={photo.url}
						alt={photo.alt || 'Thumbnail'}
						loading="lazy"
						style="width: 100%; height: 100%; object-fit: cover;"
					/>
				</button>
			{/each}
		</div>
	</div>

	<!-- "Voir toutes les photos" button -->
	<button
		on:click={() => openLightbox(mainPhotoIndex)}
		style="width: 100%; padding: 1rem; background: #f5f5f5; border: 1px solid #ddd; border-radius: 8px; cursor: pointer; font-weight: 600; transition: background 0.2s;"
	>
		📸 Voir toutes les {photos.length} photos
	</button>
</div>

<!-- Lightbox fullscreen -->
{#if lightboxOpen}
	<div
		style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.98); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 1000; touch-action: none;"
		on:click={closeLightbox}
		on:keydown={handleKeydown}
		on:touchstart={handleTouchStart}
		on:touchend={handleTouchEnd}
		role="dialog"
		aria-modal="true"
	>
		<!-- Close button -->
		<button
			on:click|stopPropagation={closeLightbox}
			style="position: absolute; top: 1rem; right: 1rem; background: white; border: none; font-size: 28px; cursor: pointer; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 1001; transition: transform 0.2s;"
			aria-label="Fermer"
		>
			×
		</button>

		<!-- Main image -->
		<img
			src={photos[mainPhotoIndex].url}
			alt={photos[mainPhotoIndex].alt || 'Photo'}
			style="max-width: 95%; max-height: 90%; object-fit: contain; border-radius: 8px; animation: fadeIn 0.3s ease-in;"
			on:click|stopPropagation
		/>

		<!-- Bottom navigation bar -->
		<div
			style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); padding: 2rem 1rem 1rem; display: flex; justify-content: space-between; align-items: center;"
		>
			<button
				on:click|stopPropagation={prevPhoto}
				disabled={mainPhotoIndex === 0}
				style="background: white; color: #333; border: none; padding: 0.75rem 1.5rem; cursor: pointer; border-radius: 6px; font-weight: 600; transition: all 0.2s; opacity: {mainPhotoIndex === 0 ? 0.5 : 1};"
			>
				← Précédent
			</button>

			<div style="color: white; font-weight: 600; text-align: center;">
				<div>{mainPhotoIndex + 1} / {photos.length}</div>
				{#if photos[mainPhotoIndex].categorie}
					<div style="font-size: 0.85rem; opacity: 0.8;">{photos[mainPhotoIndex].categorie}</div>
				{/if}
			</div>

			<button
				on:click|stopPropagation={nextPhoto}
				disabled={mainPhotoIndex === photos.length - 1}
				style="background: white; color: #333; border: none; padding: 0.75rem 1.5rem; cursor: pointer; border-radius: 6px; font-weight: 600; transition: all 0.2s; opacity: {mainPhotoIndex === photos.length - 1 ? 0.5 : 1};"
			>
				Suivant →
			</button>
		</div>
	</div>
{/if}

<style>
	:global {
		@keyframes fadeIn {
			from {
				opacity: 0.8;
				transform: scale(0.98);
			}
			to {
				opacity: 1;
				transform: scale(1);
			}
		}
	}

	button:disabled {
		cursor: not-allowed;
	}

	button:not(:disabled):hover {
		transform: translateY(-2px);
	}
</style>
