<script lang="ts">
	interface Photo {
		id: string;
		url: string;
		alt?: string;
	}

	let { photos }: { photos: Photo[] } = $props();
	let selectedPhotoIndex = $state<number | null>(null);

	function openPhoto(index: number) {
		selectedPhotoIndex = index;
	}

	function closeModal() {
		selectedPhotoIndex = null;
	}

	function nextPhoto() {
		if (selectedPhotoIndex !== null && selectedPhotoIndex < photos.length - 1) {
			selectedPhotoIndex++;
		}
	}

	function prevPhoto() {
		if (selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
			selectedPhotoIndex--;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (selectedPhotoIndex === null) return;
		if (e.key === 'ArrowRight') nextPhoto();
		if (e.key === 'ArrowLeft') prevPhoto();
		if (e.key === 'Escape') closeModal();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
	{#each photos as photo, index (photo.id)}
		<button
			onclick={() => openPhoto(index)}
			style="cursor: pointer; border: none; padding: 0; background: none;"
			aria-label="Ouvrir photo"
		>
			<img
				src={photo.url}
				alt={photo.alt || 'Photo'}
				style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; transition: transform 0.2s;"
				onmouseover={(e) => ((e.target as HTMLImageElement).style.transform = 'scale(1.05)')}
				onmouseout={(e) => ((e.target as HTMLImageElement).style.transform = 'scale(1)')}
			/>
			{#if photo.alt}
				<p style="font-size: 0.9rem; margin: 0.5rem 0; color: #666;">{photo.alt}</p>
			{/if}
		</button>
	{/each}
</div>

{#if selectedPhotoIndex !== null}
	<div
		style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.95); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 1000;"
		onclick={closeModal}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
	>
		<button
			onclick|stopPropagation={closeModal}
			style="position: absolute; top: 20px; right: 20px; background: white; border: none; font-size: 24px; cursor: pointer; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;"
			aria-label="Fermer"
		>
			×
		</button>

		<img
			src={photos[selectedPhotoIndex].url}
			alt={photos[selectedPhotoIndex].alt || 'Photo'}
			style="max-width: 90%; max-height: 85%; object-fit: contain; border-radius: 8px;"
			onclick|stopPropagation
		/>

		<div style="display: flex; gap: 1rem; margin-top: 1rem; align-items: center;">
			<button
				onclick|stopPropagation={prevPhoto}
				disabled={selectedPhotoIndex === 0}
				style="background: white; border: none; padding: 8px 16px; cursor: pointer; border-radius: 4px; font-weight: bold;"
			>
				← Précédent
			</button>
			<span style="color: white;">
				{selectedPhotoIndex + 1} / {photos.length}
			</span>
			<button
				onclick|stopPropagation={nextPhoto}
				disabled={selectedPhotoIndex === photos.length - 1}
				style="background: white; border: none; padding: 8px 16px; cursor: pointer; border-radius: 4px; font-weight: bold;"
			>
				Suivant →
			</button>
		</div>
	</div>
{/if}

<style>
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
