<script>
	import GoogleCalendar from '$lib/components/GoogleCalendar.svelte';
	import BookingCalendar from '$lib/components/BookingCalendar.svelte';
</script>

<div class="page">
	<header>
		<h1>📅 Calendrier de Réservation</h1>
		<p class="subtitle">Consultez les disponibilités et réservez votre séjour</p>
	</header>

	<main>
		<div class="calendar-section">
			<div class="calendar-main">
				<BookingCalendar />
			</div>
			<div class="calendar-auth">
				<GoogleCalendar />
			</div>
		</div>
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
		margin-bottom: 2rem;
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

	.calendar-section {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 2rem;
	}

	.calendar-main {
		order: 1;
	}

	.calendar-auth {
		order: 2;
	}

	@media (max-width: 900px) {
		.calendar-section {
			grid-template-columns: 1fr;
		}

		.calendar-auth {
			order: 2;
		}
	}
</style>
