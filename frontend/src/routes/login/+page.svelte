<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(async () => {
		// Redirect /login to /backoffice/login
		await goto('/backoffice/login', { replaceState: true });
	});
</script>

<!-- Redirecting... -->
