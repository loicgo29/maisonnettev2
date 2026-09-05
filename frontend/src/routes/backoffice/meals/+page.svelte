<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	export let data: { backofficeToken?: string } = {};

	interface AccountConfig {
		[key: string]: string[];
	}

	interface MealData {
		[date: string]: {
			[person: string]: number;
		};
	}

	let mealData: MealData = {};
	let loading = true;
	let error: string | null = null;
	let accountsConfig: AccountConfig = {
		gourmich: [],
		tigresse: [],
	};

	let selectedAccount: 'gourmich' | 'tigresse' = 'gourmich';
	let startDate = '';
	let endDate = new Date().toISOString().split('T')[0];
	let isExporting = false;

	const API_BASE = '/api';

	// Charger la configuration des comptes
	async function loadAccountsConfig() {
		try {
			const res = await fetch(`${API_BASE}/backoffice/meals/accounts`);
			if (res.ok) {
				accountsConfig = await res.json();
				// Initialiser startDate avec le premier jour du mois actuel
				const today = new Date();
				startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
			}
		} catch (err) {
			console.error('Erreur chargement config:', err);
		}
	}

	// Charger les repas
	async function loadMeals() {
		if (!startDate || !endDate) return;

		try {
			loading = true;
			error = null;
			const params = new URLSearchParams({
				startDate,
				endDate,
				account: selectedAccount,
			});

			const headers = data.backofficeToken ? { Authorization: `Bearer ${data.backofficeToken}` } : {};
			const res = await fetch(`${API_BASE}/backoffice/meals/range?${params}`, { headers });

			if (!res.ok) {
				throw new Error(`HTTP ${res.status}`);
			}

			mealData = await res.json();
		} catch (err: any) {
			error = `Erreur chargement: ${err.message}`;
			console.error('Error loading meals:', err);
		} finally {
			loading = false;
		}
	}

	// Enregistrer un repas
	async function saveMeal(dateStr: string, person: string, value: number) {
		try {
			const res = await fetch(`${API_BASE}/backoffice/meals/record`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(data.backofficeToken && { Authorization: `Bearer ${data.backofficeToken}` }),
				},
				body: JSON.stringify({
					date: dateStr,
					person,
					meal: value,
					account: selectedAccount,
				}),
			});

			if (!res.ok) {
				const detail = await res.json();
				throw new Error(detail.error || `HTTP ${res.status}`);
			}
		} catch (err: any) {
			error = `Erreur sauvegarde: ${err.message}`;
			console.error('Error saving meal:', err);
		}
	}

	// Exporter les repas
	async function exportMeals() {
		try {
			isExporting = true;
			const res = await fetch(`${API_BASE}/backoffice/meals/export`, {
				headers: data.backofficeToken ? { Authorization: `Bearer ${data.backofficeToken}` } : {},
			});

			if (!res.ok) {
				throw new Error(`HTTP ${res.status}`);
			}

			// Créer un blob et télécharger
			const blob = await res.blob();
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `meals-${new Date().toISOString().split('T')[0]}.jsonl`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);
		} catch (err: any) {
			error = `Erreur export: ${err.message}`;
			console.error('Error exporting meals:', err);
		} finally {
			isExporting = false;
		}
	}

	// Gestion changement repas
	function handleMealChange(dateStr: string, person: string, value: string) {
		const numValue = Math.max(0, Math.min(4, parseInt(value) || 0));
		if (!mealData[dateStr]) {
			mealData[dateStr] = {};
		}
		mealData[dateStr][person] = numValue;
		saveMeal(dateStr, person, numValue);
	}

	// Calculer totaux
	function calculateTotals() {
		const people = accountsConfig[selectedAccount] || [];
		const totals: { [person: string]: number } = {};
		let total = 0;

		Object.values(mealData).forEach((dayMeals) => {
			people.forEach((person) => {
				const count = dayMeals[person] || 0;
				totals[person] = (totals[person] || 0) + count;
				total += count;
			});
		});

		return { byPerson: totals, total };
	}

	// Trier les dates
	function getSortedDates() {
		return Object.keys(mealData).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
	}

	onMount(() => {
		// Auth check is done by +layout.server.ts (redirects to login if no token)
		loadAccountsConfig();
	});

	$: if (startDate && endDate) {
		loadMeals();
	}

	const totals = calculateTotals();
	const people = accountsConfig[selectedAccount] || [];
	const sortedDates = getSortedDates();

	// Couleurs personnalisées par personne
	const personColors: { [key: string]: string } = {
		'Loïc': '#2196F3',
		'Alice': '#FF5722',
		'Mahaut': '#4CAF50',
		'Alban': '#FFC107',
		'Ilan': '#9C27B0',
		'Adèle': '#00BCD4',
		'Oscar': '#8BC34A',
		'Albert': '#F44336',
		'Joséphine': '#E91E63',
	};

	const getPersonColor = (person: string) => personColors[person] || '#9E9E9E';
</script>

<div class="container">
	<h1>🍽️ Repas</h1>

	{#if error}
		<div class="error">{error}</div>
	{/if}

	<!-- Sélecteurs -->
	<div class="controls">
			<div>
				<label>
					Depuis
					<input
						type="date"
						bind:value={startDate}
					/>
				</label>
			</div>

			<div>
				<label>
					Jusqu'au
					<input
						type="date"
						bind:value={endDate}
					/>
				</label>
			</div>

			<div>
				<label>
					Compte
					<select bind:value={selectedAccount}>
						<option value="gourmich">Gourmich</option>
						<option value="tigresse">Tigresse</option>
					</select>
				</label>
			</div>

			<button
				on:click={exportMeals}
				disabled={isExporting}
				class="btn-export"
			>
				{isExporting ? '⏳ Export...' : '⬇️ Exporter'}
			</button>
		</div>

		<!-- Résumé -->
		<div class="summary">
			{#each people as person (person)}
				<div
					class="summary-card"
					style="background-color: {getPersonColor(person)}"
				>
					<div class="person-name">{person}</div>
					<div class="person-total">{totals.byPerson[person] || 0}</div>
					<div class="person-percent">
						{totals.total > 0
							? ((totals.byPerson[person] || 0) / totals.total * 100).toFixed(1)
							: '0'}%
					</div>
				</div>
			{/each}

			<div class="summary-card total-card">
				<div class="person-name">Total</div>
				<div class="person-total">{totals.total}</div>
				<div class="person-percent">repas</div>
			</div>
		</div>

		<!-- Tableau -->
		{#if loading}
			<div class="loading">Chargement…</div>
		{:else if sortedDates.length === 0}
			<div class="no-data">Aucun repas trouvé</div>
		{:else}
			<table class="meals-table">
				<thead>
					<tr>
						<th>Date</th>
						{#each people as person (person)}
							<th
								style="background-color: {getPersonColor(person)}; color: white;"
							>
								{person}
							</th>
						{/each}
						<th>Total</th>
					</tr>
				</thead>
				<tbody>
					{#each sortedDates as dateStr (dateStr)}
						{@const dayMeals = mealData[dateStr] || {}}
						{@const dayTotal = people.reduce((sum, p) => sum + (dayMeals[p] || 0), 0)}
						<tr>
							<td class="date-cell">
								{new Date(dateStr).toLocaleDateString('fr-FR', {
									weekday: 'short',
									month: 'short',
									day: 'numeric',
								})}
							</td>
							{#each people as person (person)}
								<td>
									<input
										type="number"
										min="0"
										max="4"
										value={dayMeals[person] || 0}
										on:change={(e) =>
											handleMealChange(dateStr, person, e.currentTarget.value)}
										class="meal-input"
									/>
								</td>
							{/each}
							<td class="total-cell">{dayTotal}</td>
						</tr>
					{/each}

					<!-- Ligne totaux -->
					<tr class="totals-row">
						<td class="date-cell"><strong>TOTAL</strong></td>
						{#each people as person (person)}
							<td><strong>{totals.byPerson[person] || 0}</strong></td>
						{/each}
						<td class="total-cell"><strong>{totals.total}</strong></td>
					</tr>
				</tbody>
			</table>
		{/if}
</div>

<style>
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 20px;
		font-family: system-ui, -apple-system, sans-serif;
	}

	h1 {
		margin-top: 0;
		color: #333;
	}

	.error {
		background-color: #ffebee;
		color: #c62828;
		padding: 12px;
		border-radius: 4px;
		margin-bottom: 20px;
	}

	.controls {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 15px;
		margin-bottom: 20px;
		align-items: end;
	}

	.controls label {
		display: flex;
		flex-direction: column;
		gap: 5px;
		font-weight: 500;
		font-size: 0.9em;
	}

	.controls input,
	.controls select {
		padding: 8px;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 1em;
	}

	.btn-export {
		padding: 8px 16px;
		background-color: #1976d2;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-weight: 500;
		transition: background-color 0.2s;
	}

	.btn-export:hover:not(:disabled) {
		background-color: #1565c0;
	}

	.btn-export:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.summary {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 15px;
		margin-bottom: 20px;
	}

	.summary-card {
		color: white;
		padding: 15px;
		border-radius: 8px;
		text-align: center;
	}

	.summary-card.total-card {
		background-color: #333;
	}

	.person-name {
		font-size: 0.9em;
		opacity: 0.9;
	}

	.person-total {
		font-size: 1.8em;
		font-weight: bold;
		margin-top: 5px;
	}

	.person-percent {
		font-size: 0.85em;
		opacity: 0.8;
		margin-top: 5px;
	}

	.loading,
	.no-data {
		text-align: center;
		padding: 20px;
		color: #999;
	}

	.meals-table {
		width: 100%;
		border-collapse: collapse;
		background: white;
		border: 1px solid #ddd;
		border-radius: 4px;
		overflow: hidden;
	}

	.meals-table thead {
		background-color: #f5f5f5;
	}

	.meals-table th,
	.meals-table td {
		padding: 10px;
		text-align: center;
		border-bottom: 1px solid #eee;
	}

	.meals-table th {
		font-weight: bold;
		min-width: 80px;
	}

	.date-cell {
		text-align: left;
		font-weight: 600;
		min-width: 120px;
	}

	.total-cell {
		font-weight: 600;
		background-color: #f0f0f0;
	}

	.meal-input {
		width: 60px;
		padding: 4px;
		text-align: center;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.9em;
	}

	.totals-row {
		background-color: #f0f0f0;
		font-weight: bold;
	}

	.totals-row td {
		border-bottom: 2px solid #ddd;
	}
</style>
