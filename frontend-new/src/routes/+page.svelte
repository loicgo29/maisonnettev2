<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(async () => {
		// Redirect to the unique property
		await goto('/gite/bertheaume', { replaceState: true });
	});
</script>

<!-- Redirection en cours... -->
<p style="text-align: center; padding: 2rem;">Redirection vers Maisonnette de Bertheaume...</p>

<style>
	:global(body) {
		font-family: system-ui, sans-serif;
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}
</style>
