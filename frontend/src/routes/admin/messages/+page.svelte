<script lang="ts">
	import { onMount } from 'svelte';
	import { apiAdmin, ErreurAccesRefuse } from '$lib/apiAdmin';

	let messages: any[] = $state([]);
	let erreur = $state('');
	let chargement = $state(true);
	let filtre = $state('PLANIFIE');
	// Vue par défaut : uniquement ce qui est dû aujourd'hui ou avant, pas tout
	// ce qui est planifié dans les mois à venir — c'est la liste du matin.
	let dusSeulement = $state(true);
	let envoiEnCours: Set<string> = $state(new Set());
	let copieId = $state('');

	async function charger() {
		chargement = true;
		try {
			messages = await apiAdmin.messages({
				statut: filtre || undefined,
				dus: filtre === 'PLANIFIE' ? dusSeulement : false,
			});
		} catch (e) {
			erreur = e instanceof ErreurAccesRefuse ? e.message : 'Chargement impossible';
		} finally {
			chargement = false;
		}
	}

	async function copier(m: any) {
		await navigator.clipboard.writeText(m.apercu.texte);
		copieId = m.id;
		setTimeout(() => { if (copieId === m.id) copieId = ''; }, 2000);
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
	{#if filtre === 'PLANIFIE'}
		<label class="dus">
			<input type="checkbox" bind:checked={dusSeulement} onchange={charger} />
			Dus aujourd'hui seulement
		</label>
	{/if}
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
				{#if m.apercu && (m.statut === 'PLANIFIE' || m.statut === 'ECHEC')}
					<tr class="ligne-apercu">
						<td colspan="5">
							<div class="apercu">
								<div class="apercu-entete">
									<strong>{m.apercu.sujet}</strong>
									<button class="petit copier" onclick={() => copier(m)}>
										{copieId === m.id ? 'Copié !' : 'Copier'}
									</button>
								</div>
								<pre class="apercu-texte">{m.apercu.texte}</pre>
							</div>
						</td>
					</tr>
				{/if}
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
	.dus { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: #4b5563; margin-left: 0.5rem; }
	.ligne-apercu td { padding: 0 1rem 0.75rem; border-bottom: 1px solid #e5e7eb; }
	.apercu { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 0.6rem 0.8rem; }
	.apercu-entete { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; }
	.apercu-texte { white-space: pre-wrap; font-family: inherit; font-size: 0.85rem; color: #374151; margin: 0; }
	.petit.copier { background: #374151; }
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
