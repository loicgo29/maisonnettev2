<script lang="ts">
	import { onMount } from 'svelte';

	let currentDate = $state(new Date());
	let bookedDates = $state<Set<string>>(new Set());
	let loading = $state(true);
	let events = $state<any[]>([]);

	onMount(async () => {
		try {
			const response = await fetch('/api/calendar');
			const data = await response.json();
			events = data.events || [];

			// Extract booked dates from events
			events.forEach((event: any) => {
				const start = new Date(event.start.dateTime || event.start.date);
				const end = new Date(event.end.dateTime || event.end.date);

				for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
					bookedDates.add(d.toISOString().split('T')[0]);
				}
			});
		} catch (err) {
			console.error('Erreur calendrier:', err);
		} finally {
			loading = false;
		}
	});

	function getDaysInMonth(date: Date) {
		return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
	}

	function getFirstDayOfMonth(date: Date) {
		return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
	}

	function previousMonth() {
		currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
	}

	function nextMonth() {
		currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1);
	}

	function isBooked(day: number) {
		const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
			.toISOString()
			.split('T')[0];
		return bookedDates.has(dateStr);
	}

	function isToday(day: number) {
		const today = new Date();
		return (
			day === today.getDate() &&
			currentDate.getMonth() === today.getMonth() &&
			currentDate.getFullYear() === today.getFullYear()
		);
	}

	function isPast(day: number) {
		const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return checkDate < today;
	}

	const monthNames = [
		'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
		'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
	];
	const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

	let daysArray = $derived.by(() => {
		const days = [];
		const firstDay = getFirstDayOfMonth(currentDate);
		const daysInMonth = getDaysInMonth(currentDate);

		for (let i = 0; i < firstDay; i++) {
			days.push(null);
		}

		for (let i = 1; i <= daysInMonth; i++) {
			days.push(i);
		}

		return days;
	});
</script>

<div class="calendar-wrapper">
	<div class="calendar-header">
		<button class="nav-btn" onclick={previousMonth}>← Précédent</button>
		<h3>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
		<button class="nav-btn" onclick={nextMonth}>Suivant →</button>
	</div>

	{#if loading}
		<div class="loading">Chargement du calendrier...</div>
	{:else}
		<div class="calendar-grid">
			<div class="weekdays">
				{#each dayNames as day}
					<div class="weekday">{day}</div>
				{/each}
			</div>

			<div class="days">
				{#each daysArray as day}
					{#if day === null}
						<div class="day empty"></div>
					{:else}
						<div
							class="day"
							class:booked={isBooked(day)}
							class:today={isToday(day)}
							class:past={isPast(day)}
							class:available={!isBooked(day) && !isPast(day)}
						>
							<span class="day-number">{day}</span>
							{#if isBooked(day)}
								<span class="status">Réservé</span>
							{:else if !isPast(day)}
								<span class="status">Libre</span>
							{/if}
						</div>
					{/if}
				{/each}
			</div>
		</div>

		<div class="legend">
			<div class="legend-item">
				<div class="legend-color available"></div>
				<span>Disponible</span>
			</div>
			<div class="legend-item">
				<div class="legend-color booked"></div>
				<span>Réservé</span>
			</div>
			<div class="legend-item">
				<div class="legend-color past"></div>
				<span>Passé</span>
			</div>
		</div>

		{#if events.length > 0}
			<div class="upcoming-reservations">
				<h4>📅 Réservations à venir</h4>
				<div class="reservations-list">
					{#each events as event}
						<div class="reservation">
							<div class="res-title">{event.summary || 'Réservation'}</div>
							<div class="res-dates">
								{new Date(event.start.dateTime || event.start.date).toLocaleDateString('fr-FR')}
								→
								{new Date(event.end.dateTime || event.end.date).toLocaleDateString('fr-FR')}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	.calendar-wrapper {
		background: white;
		border-radius: 12px;
		padding: 2rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		max-width: 500px;
	}

	.calendar-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	.calendar-header h3 {
		margin: 0;
		font-size: 1.3rem;
		color: #333;
		min-width: 200px;
		text-align: center;
	}

	.nav-btn {
		background: #f0f0f0;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 600;
		transition: background 0.2s;
	}

	.nav-btn:hover {
		background: #e0e0e0;
	}

	.loading {
		text-align: center;
		padding: 2rem;
		color: #666;
	}

	.calendar-grid {
		margin-bottom: 2rem;
	}

	.weekdays {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.weekday {
		text-align: center;
		font-weight: 600;
		font-size: 0.85rem;
		color: #666;
		padding: 0.5rem;
	}

	.days {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 0.5rem;
	}

	.day {
		aspect-ratio: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		border: 2px solid #e0e0e0;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
		position: relative;
		padding: 0.25rem;
	}

	.day.empty {
		background: transparent;
		border: none;
		cursor: default;
	}

	.day.available {
		background: #e8f5e9;
		border-color: #4caf50;
	}

	.day.available:hover {
		background: #c8e6c9;
		transform: scale(1.05);
	}

	.day.booked {
		background: #ffebee;
		border-color: #f44336;
		opacity: 0.7;
	}

	.day.past {
		background: #f5f5f5;
		border-color: #bdbdbd;
		opacity: 0.5;
	}

	.day.today {
		border: 2px solid #2196f3;
		background: #bbdefb;
		font-weight: 700;
	}

	.day-number {
		font-size: 0.95rem;
		font-weight: 600;
		color: #333;
	}

	.status {
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		margin-top: -0.25rem;
	}

	.day.available .status {
		color: #2e7d32;
	}

	.day.booked .status {
		color: #c62828;
	}

	.day.past .status {
		color: #999;
	}

	.legend {
		display: flex;
		justify-content: center;
		gap: 2rem;
		margin-bottom: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid #e0e0e0;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
	}

	.legend-color {
		width: 20px;
		height: 20px;
		border-radius: 4px;
		border: 1px solid #ddd;
	}

	.legend-color.available {
		background: #e8f5e9;
		border-color: #4caf50;
	}

	.legend-color.booked {
		background: #ffebee;
		border-color: #f44336;
	}

	.legend-color.past {
		background: #f5f5f5;
		border-color: #bdbdbd;
	}

	.upcoming-reservations {
		padding-top: 1.5rem;
		border-top: 1px solid #e0e0e0;
	}

	.upcoming-reservations h4 {
		margin: 0 0 1rem 0;
		color: #333;
	}

	.reservations-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.reservation {
		background: #f5f5f5;
		border-left: 4px solid #667eea;
		padding: 1rem;
		border-radius: 4px;
	}

	.res-title {
		font-weight: 600;
		color: #333;
		margin-bottom: 0.25rem;
	}

	.res-dates {
		font-size: 0.9rem;
		color: #666;
	}

	@media (max-width: 600px) {
		.calendar-wrapper {
			padding: 1rem;
		}

		.calendar-header {
			flex-direction: column;
			gap: 1rem;
		}

		.calendar-header h3 {
			min-width: auto;
		}

		.legend {
			flex-direction: column;
			gap: 1rem;
		}
	}
</style>
