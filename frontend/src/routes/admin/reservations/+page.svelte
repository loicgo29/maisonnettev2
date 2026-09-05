<script lang="ts">
	import { onMount } from 'svelte';
	import { apiAdmin, ErreurAccesRefuse } from '$lib/apiAdmin';

	let reservations: any[] = $state([]);
	let erreur = $state('');
	let chargement = $state(true);
	let filtreStatut = $state('');
	let filtrePlateforme = $state('');

	async function charger() {
		chargement = true;
		try {
			reservations = await apiAdmin.reservations({
				...(filtreStatut && { statut: filtreStatut }),
				...(filtrePlateforme && { plateforme: filtrePlateforme }),
			});
		} catch (e) {
			erreur = e instanceof ErreurAccesRefuse ? e.message : 'Chargement impossible';
		} finally {
			chargement = false;
		}
	}

	onMount(charger);

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
	}
</script>

<div class="entete">
	<h1>Réservations</h1>
	<a href="/admin/reservations/nouvelle" class="bouton-principal">+ Nouvelle réservation</a>
</div>

<div class="filtres">
	<select bind:value={filtreStatut} onchange={charger}>
		<option value="">Tous les statuts</option>
		<option value="PENDING">En attente</option>
		<option value="CONFIRMED">Confirmée</option>
		<option value="CANCELLED">Annulée</option>
	</select>
	<select bind:value={filtrePlateforme} onchange={charger}>
		<option value="">Toutes les plateformes</option>
		<option value="AIRBNB">Airbnb</option>
		<option value="BOOKING">Booking</option>
		<option value="LEBONCOIN">Leboncoin</option>
		<option value="DIRECT">Direct</option>
		<option value="AUTRE">Autre</option>
	</select>
</div>

{#if chargement}
	<p>Chargement…</p>
{:else if erreur}
	<p class="erreur">{erreur}</p>
{:else if reservations.length === 0}
	<p class="vide">Aucune réservation ne correspond à ces filtres.</p>
{:else}
	<table>
		<thead>
			<tr><th>Client</th><th>Plateforme</th><th>Arrivée</th><th>Départ</th><th>Statut</th><th>Messages</th></tr>
		</thead>
		<tbody>
			{#each reservations as r}
				<tr>
					<td><a href="/admin/reservations/{r.id}">{r.clientPrenom} {r.clientNom}</a></td>
					<td>{r.plateforme}</td>
					<td>{formatDate(r.dateDebut)}</td>
					<td>{formatDate(r.dateFin)}</td>
					<td><span class="badge badge-{r.statut}">{r.statut}</span></td>
					<td>{r.messages?.length ?? 0}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

<style>
	.entete { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
	.bouton-principal {
		background: #14532d; color: white; text-decoration: none;
		padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.9rem;
	}
	.filtres { display: flex; gap: 0.75rem; margin-bottom: 1.25rem; }
	select { padding: 0.4rem 0.6rem; border-radius: 6px; border: 1px solid #d1d5db; }
	table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; }
	th, td { text-align: left; padding: 0.6rem 1rem; border-bottom: 1px solid #e5e7eb; }
	th { background: #f3f4f6; font-size: 0.85rem; color: #6b7280; }
	td a { color: #14532d; text-decoration: none; font-weight: 500; }
	.badge { padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
	.badge-PENDING { background: #fef3c7; color: #92400e; }
	.badge-CONFIRMED { background: #d1fae5; color: #065f46; }
	.badge-CANCELLED { background: #fee2e2; color: #991b1b; }
	.vide { color: #9ca3af; }
	.erreur { color: #b91c1c; }
</style>
