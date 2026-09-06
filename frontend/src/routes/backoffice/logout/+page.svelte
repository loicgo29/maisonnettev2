<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(async () => {
		// Call logout endpoint to clear cookie
		await fetch('/api/backoffice/auth/logout', { method: 'POST' });

		// Clear localStorage
		localStorage.removeItem('backoffice_token');
		localStorage.removeItem('backoffice_user');

		// Redirect to login
		await goto('/backoffice/login');
	});
</script>

<div style="text-align: center; padding: 20px;">
	<p>Déconnexion en cours...</p>
</div>
