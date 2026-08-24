<script>
	import GoogleCalendar from '$lib/components/GoogleCalendar.svelte';
	// Fixed: Calendar route is working
</script>

<div class="page">
	<header>
		<h1>Calendrier de Maisonnette</h1>
		<p class="subtitle">Consultez la disponibilité des chambres</p>
	</header>

	<main>
		<GoogleCalendar />
	</main>
</div>

<style>
	.page {
		min-height: 100vh;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}

	header {
		text-align: center;
		color: white;
		padding: 3rem 2rem;
	}

	h1 {
		font-size: 2.5rem;
		margin: 0;
		margin-bottom: 0.5rem;
	}

	.subtitle {
		font-size: 1.2rem;
		opacity: 0.9;
		margin: 0;
	}

	main {
		padding-bottom: 3rem;
	}
</style>
