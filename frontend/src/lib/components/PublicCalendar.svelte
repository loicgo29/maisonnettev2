<script lang="ts">
	import { onMount } from 'svelte';

	interface CalendarEvent {
		id: string;
		summary: string;
		start: { dateTime?: string; date?: string };
		end: { dateTime?: string; date?: string };
		description?: string;
	}

	interface CalendarData {
		calendar: { id: string; summary: string };
		events: CalendarEvent[];
	}

	let events: CalendarEvent[] = [];
	let currentDate = new Date();
	let daysInMonth: (number | null)[] = [];
	let loading = true;
	let error = '';

	onMount(async () => {
		generateCalendarDays();
		try {
			const response = await fetch('/api/calendar/public');
			if (!response.ok) throw new Error('Failed to fetch calendar');
			const data: CalendarData = await response.json();
			events = data.events || [];
			loading = false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error loading calendar';
			loading = false;
		}
	});

	function generateCalendarDays() {
		const year = currentDate.getFullYear();
		const month = currentDate.getMonth();
		const firstDay = new Date(year, month, 1).getDay();
		const daysCount = new Date(year, month + 1, 0).getDate();

		daysInMonth = [];
		for (let i = 0; i < firstDay; i++) daysInMonth.push(null);
		for (let i = 1; i <= daysCount; i++) daysInMonth.push(i);
	}

	function hasEvent(day: number | null): boolean {
		if (!day) return false;
		const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
		return events.some(e => {
			const eventDate = e.start.date || e.start.dateTime?.split('T')[0];
			return eventDate === dateStr;
		});
	}

	function getEventForDay(day: number | null): CalendarEvent | null {
		if (!day) return null;
		const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
		return events.find(e => {
			const eventDate = e.start.date || e.start.dateTime?.split('T')[0];
			return eventDate === dateStr;
		}) || null;
	}

	function prevMonth() {
		currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
		generateCalendarDays();
	}

	function nextMonth() {
		currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1);
		generateCalendarDays();
	}
</script>

<div class="public-calendar">
	<h2>Calendrier de disponibilité</h2>

	{#if loading}
		<p class="loading">Chargement du calendrier...</p>
	{:else if error}
		<p class="error">Erreur: {error}</p>
	{:else}
		<div class="calendar">
			<div class="calendar-header">
				<button on:click={prevMonth}>←</button>
				<h3>
					{currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
				</h3>
				<button on:click={nextMonth}>→</button>
			</div>

			<div class="weekdays">
				<div class="weekday">Lun</div>
				<div class="weekday">Mar</div>
				<div class="weekday">Mer</div>
				<div class="weekday">Jeu</div>
				<div class="weekday">Ven</div>
				<div class="weekday">Sam</div>
				<div class="weekday">Dim</div>
			</div>

			<div class="days-grid">
				{#each daysInMonth as day}
					<div class="day" class:empty={day === null} class:has-event={hasEvent(day)}>
						{#if day}
							<div class="day-number">{day}</div>
							{#if hasEvent(day)}
								<div class="event-dot"></div>
								<div class="event-tooltip">
									{getEventForDay(day)?.summary}
								</div>
							{/if}
						{/if}
					</div>
				{/each}
			</div>
		</div>

	{/if}
</div>

<style>
	.public-calendar {
		padding: 2rem;
		background: #f9f9f9;
		border-radius: 8px;
		margin: 2rem 0;
	}

	.public-calendar h2 {
		margin-bottom: 1.5rem;
		color: #333;
	}

	.calendar {
		background: white;
		border-radius: 8px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.calendar-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.calendar-header button {
		background: #0066cc;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 1rem;
	}

	.calendar-header button:hover {
		background: #0052a3;
	}

	.calendar-header h3 {
		margin: 0;
		font-size: 1.2rem;
		text-transform: capitalize;
	}

	.weekdays {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 0.5rem;
		margin-bottom: 1rem;
		font-weight: bold;
		text-align: center;
		color: #666;
		font-size: 0.9rem;
	}

	.weekday {
		padding: 0.5rem;
	}

	.days-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 0.5rem;
	}

	.day {
		aspect-ratio: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid #ddd;
		border-radius: 4px;
		position: relative;
		background: white;
		cursor: pointer;
		transition: all 0.2s;
	}

	.day:not(.empty):hover {
		background: #f0f0f0;
		border-color: #0066cc;
	}

	.day.empty {
		background: transparent;
		border: none;
	}

	.day.has-event {
		background: #e6f2ff;
		border-color: #0066cc;
		font-weight: bold;
	}

	.day-number {
		font-size: 0.9rem;
	}

	.event-dot {
		position: absolute;
		top: 2px;
		right: 2px;
		width: 6px;
		height: 6px;
		background: #0066cc;
		border-radius: 50%;
	}

	.event-tooltip {
		display: none;
		position: absolute;
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		background: #333;
		color: white;
		padding: 0.5rem;
		border-radius: 4px;
		font-size: 0.8rem;
		white-space: nowrap;
		z-index: 10;
		margin-bottom: 0.5rem;
	}

	.day.has-event:hover .event-tooltip {
		display: block;
	}


	.loading,
	.error {
		text-align: center;
		padding: 2rem;
		color: #666;
	}

	.error {
		color: #d32f2f;
	}
</style>
