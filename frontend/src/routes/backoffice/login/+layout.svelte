<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let isLoggedIn = false;

	onMount(async () => {
		// Si déjà authentifié, rediriger vers meals
		const token = typeof window !== 'undefined' ? localStorage.getItem('backoffice_token') : null;

		if (token) {
			try {
				const response = await fetch('/api/backoffice/auth/verify', {
					method: 'POST',
					headers: { 'Authorization': `Bearer ${token}` },
				});

				if (response.ok) {
					// Déjà authentifié, rediriger
					await goto('/backoffice/meals');
					return;
				}
			} catch (error) {
				console.error('Token verification failed:', error);
			}
		}

		isLoggedIn = false;
	});
</script>

<slot />
