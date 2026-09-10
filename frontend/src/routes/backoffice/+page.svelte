<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(async () => {
		const token = typeof window !== 'undefined' ? localStorage.getItem('backoffice_token') : null;

		if (!token) {
			await goto('/backoffice/login');
		}
	});
</script>

<div class="container">
	<h1>Backoffice Dashboard</h1>
	<p>Bienvenue! Choisissez une section:</p>
	<ul>
		<li><a href="/backoffice/reservations">Réservations</a></li>
		<li><a href="/backoffice/calendar">Calendrier</a></li>
		<li><a href="/backoffice/settings">Paramètres</a></li>
	</ul>
</div>

<style>
	.container {
		max-width: 800px;
		margin: 2rem auto;
		padding: 2rem;
	}
	h1 {
		color: #333;
	}
	ul {
		list-style: none;
		padding: 0;
	}
	li {
		margin: 1rem 0;
	}
	a {
		color: #007bff;
		text-decoration: none;
		font-size: 1.1rem;
	}
	a:hover {
		text-decoration: underline;
	}
</style>
