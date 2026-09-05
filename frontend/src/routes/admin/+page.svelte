<script lang="ts">
	import { onMount } from 'svelte';
	import { apiAdmin, ErreurAccesRefuse } from '$lib/apiAdmin';

	let donnees: any = $state(null);
	let erreur = $state('');
	let chargement = $state(true);

	onMount(async () => {
		try {
			donnees = await apiAdmin.tableauDeBord();
		} catch (e) {
			erreur = e instanceof ErreurAccesRefuse ? e.message : 'Impossible de charger le tableau de bord';
		} finally {
			chargement = false;
		}
	});

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
	}
</script>

<h1>Tableau de bord</h1>

{#if chargement}
	<p>Chargement…</p>
{:else if erreur}
	<p class="erreur">{erreur}</p>
{:else if donnees}
	{#if !donnees.envoiAutomatique}
		<p class="bandeau">
			Envoi automatique désactivé : les messages sont planifiés mais n'attendent que ton clic dans
			<a href="/admin/messages">Messages</a>.
		</p>
	{/if}

	<div class="cartes">
		<div class="carte">
			<span class="nombre">{donnees.reservationsActives}</span>
			<span class="libelle">réservations actives</span>
		</div>
		<div class="carte">
			<span class="nombre">{donnees.messagesEnAttente}</span>
			<span class="libelle">messages à envoyer</span>
		</div>
	</div>

	<h2>Arrivées à venir (30 jours)</h2>
	{#if donnees.arrivees.length === 0}
		<p class="vide">Aucune arrivée prévue.</p>
	{:else}
		<table>
			<thead>
				<tr><th>Client</th><th>Plateforme</th><th>Arrivée</th><th>Départ</th></tr>
			</thead>
			<tbody>
				{#each donnees.arrivees as r}
					<tr>
						<td><a href="/admin/reservations/{r.id}">{r.clientPrenom} {r.clientNom}</a></td>
						<td>{r.plateforme}</td>
						<td>{formatDate(r.dateDebut)}</td>
						<td>{formatDate(r.dateFin)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
{/if}

<style>
	h1 { margin-bottom: 1rem; }
	.bandeau {
		background: #fef3c7;
		border: 1px solid #fcd34d;
		border-radius: 6px;
		padding: 0.75rem 1rem;
		margin-bottom: 1.5rem;
		font-size: 0.9rem;
	}
	.cartes {
		display: flex;
		gap: 1rem;
		margin-bottom: 2rem;
	}
	.carte {
		background: white;
		border-radius: 8px;
		padding: 1.25rem 1.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
		display: flex;
		flex-direction: column;
	}
	.nombre { font-size: 2rem; font-weight: 700; color: #14532d; }
	.libelle { color: #6b7280; font-size: 0.9rem; }
	table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; }
	th, td { text-align: left; padding: 0.6rem 1rem; border-bottom: 1px solid #e5e7eb; }
	th { background: #f3f4f6; font-size: 0.85rem; color: #6b7280; }
	td a { color: #14532d; text-decoration: none; font-weight: 500; }
	.vide { color: #9ca3af; }
	.erreur { color: #b91c1c; }
</style>
