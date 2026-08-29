<script lang="ts">
	import { onMount } from 'svelte';
	import { apiAdmin, ErreurAccesRefuse } from '$lib/apiAdmin';

	let messages: any[] = $state([]);
	let erreur = $state('');
	let chargement = $state(true);
	let filtre = $state('PLANIFIE');
	let envoiEnCours: Set<string> = $state(new Set());

	async function charger() {
		chargement = true;
		try {
			messages = await apiAdmin.messages(filtre || undefined);
		} catch (e) {
			erreur = e instanceof ErreurAccesRefuse ? e.message : 'Chargement impossible';
		} finally {
			chargement = false;
		}
	}

	onMount(charger);

	async function envoyer(id: string) {
		envoiEnCours.add(id);
		envoiEnCours = new Set(envoiEnCours);
		try {
			await apiAdmin.envoyerMessage(id);
		} catch {
			/* le statut rechargé montrera ECHEC ou IMPOSSIBLE avec le motif */
		}
		envoiEnCours.delete(id);
		envoiEnCours = new Set(envoiEnCours);
		await charger();
	}

	async function envoyerTout() {
		const aEnvoyer = messages.filter((m) => m.statut === 'PLANIFIE');
		for (const m of aEnvoyer) await envoyer(m.id);
	}

	async function annuler(id: string) {
		await apiAdmin.annulerMessage(id);
		await charger();
	}

	function formatDateHeure(d: string) {
		return new Date(d).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
	}
</script>

<div class="entete">
	<h1>Messages</h1>
	{#if filtre === 'PLANIFIE' && messages.length > 0}
		<button onclick={envoyerTout}>Tout envoyer ({messages.length})</button>
	{/if}
</div>

<div class="filtres">
	{#each [['PLANIFIE', 'À envoyer'], ['ENVOYE', 'Envoyés'], ['ECHEC', 'Échecs'], ['IMPOSSIBLE', 'Sans adresse'], ['', 'Tous']] as [valeur, libelle]}
		<button class="filtre" class:actif={filtre === valeur} onclick={() => { filtre = valeur; charger(); }}>
			{libelle}
		</button>
	{/each}
</div>

{#if chargement}
	<p>Chargement…</p>
{:else if erreur}
	<p class="erreur">{erreur}</p>
{:else if messages.length === 0}
	<p class="vide">Aucun message dans cette catégorie.</p>
{:else}
	<table>
		<thead>
			<tr><th>Client</th><th>Type</th><th>Prévu le</th><th>Statut</th><th></th></tr>
		</thead>
		<tbody>
			{#each messages as m}
				<tr>
					<td>{m.reservation.clientPrenom} {m.reservation.clientNom}</td>
					<td>{m.type}</td>
					<td>{formatDateHeure(m.planifieLe)}</td>
					<td>
						<span class="statut statut-{m.statut}">{m.statut}</span>
						{#if m.erreur}<div class="motif">{m.erreur}</div>{/if}
					</td>
					<td>
						{#if m.statut === 'PLANIFIE' || m.statut === 'ECHEC'}
							<button class="petit" disabled={envoiEnCours.has(m.id)} onclick={() => envoyer(m.id)}>
								{envoiEnCours.has(m.id) ? '…' : m.statut === 'ECHEC' ? 'Réessayer' : 'Envoyer'}
							</button>
							<button class="petit annuler" onclick={() => annuler(m.id)}>Annuler</button>
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

<style>
	.entete { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
	.entete button { background: #14532d; color: white; border: none; border-radius: 6px; padding: 0.5rem 1rem; cursor: pointer; }
	.filtres { display: flex; gap: 0.5rem; margin-bottom: 1.25rem; }
	.filtre { background: white; border: 1px solid #d1d5db; border-radius: 999px; padding: 0.35rem 0.9rem; font-size: 0.85rem; cursor: pointer; }
	.filtre.actif { background: #14532d; color: white; border-color: #14532d; }
	table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; }
	th, td { text-align: left; padding: 0.6rem 1rem; border-bottom: 1px solid #e5e7eb; }
	th { background: #f3f4f6; font-size: 0.85rem; color: #6b7280; }
	.statut { font-size: 0.8rem; padding: 0.1rem 0.5rem; border-radius: 999px; }
	.statut-PLANIFIE { background: #dbeafe; color: #1e40af; }
	.statut-ENVOYE { background: #d1fae5; color: #065f46; }
	.statut-ECHEC, .statut-IMPOSSIBLE { background: #fee2e2; color: #991b1b; }
	.statut-ANNULE { background: #f3f4f6; color: #6b7280; }
	.motif { font-size: 0.78rem; color: #b91c1c; margin-top: 0.2rem; }
	.petit { padding: 0.25rem 0.6rem; font-size: 0.8rem; background: #14532d; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 0.3rem; }
	.petit.annuler { background: #6b7280; }
	.petit:disabled { opacity: 0.6; cursor: wait; }
	.vide { color: #9ca3af; }
	.erreur { color: #b91c1c; }
</style>
