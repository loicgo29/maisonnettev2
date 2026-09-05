<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { apiAdmin, ErreurAccesRefuse } from '$lib/apiAdmin';

	let reservation: any = $state(null);
	let erreur = $state('');
	let chargement = $state(true);
	let notesLocales = $state('');

	async function charger() {
		try {
			const toutes = await apiAdmin.reservations();
			reservation = toutes.find((r: any) => r.id === $page.params.id);
			notesLocales = reservation?.notesInternes ?? '';
			if (!reservation) erreur = 'Réservation introuvable';
		} catch (e) {
			erreur = e instanceof ErreurAccesRefuse ? e.message : 'Chargement impossible';
		} finally {
			chargement = false;
		}
	}

	onMount(charger);

	async function enregistrerNotes() {
		await apiAdmin.modifierReservation(reservation.id, { notesInternes: notesLocales });
	}

	async function basculerPaiement(champ: 'acompteVerse' | 'soldeVerse') {
		await apiAdmin.modifierReservation(reservation.id, { [champ]: !reservation[champ] });
		await charger();
	}

	async function annuler() {
		await apiAdmin.modifierReservation(reservation.id, { statut: 'CANCELLED' });
		await charger();
	}

	async function envoyerMaintenant(messageId: string) {
		try {
			await apiAdmin.envoyerMessage(messageId);
		} catch {
			// Le motif exact est déjà visible dans la colonne statut après
			// rechargement : pas besoin de le dupliquer dans une alerte.
		}
		await charger();
	}

	function formatDateHeure(d: string) {
		return new Date(d).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
	}

	const libellesStatut: Record<string, string> = {
		PLANIFIE: 'Planifié',
		ENVOYE: 'Envoyé',
		ECHEC: 'Échec',
		ANNULE: 'Annulé',
		IMPOSSIBLE: 'Pas d’adresse e-mail',
	};
</script>

{#if chargement}
	<p>Chargement…</p>
{:else if erreur}
	<p class="erreur">{erreur}</p>
{:else if reservation}
	<div class="entete">
		<h1>{reservation.clientPrenom} {reservation.clientNom}</h1>
		<span class="badge badge-{reservation.statut}">{reservation.statut}</span>
	</div>

	<div class="colonnes">
		<section>
			<h2>Séjour</h2>
			<dl>
				<dt>Plateforme</dt><dd>{reservation.plateforme}</dd>
				<dt>Arrivée</dt><dd>{formatDateHeure(reservation.dateDebut)}</dd>
				<dt>Départ</dt><dd>{formatDateHeure(reservation.dateFin)}</dd>
				<dt>Téléphone</dt><dd>{reservation.clientTelephone || '—'}</dd>
				<dt>E-mail</dt><dd>{reservation.clientEmail || '— non communiqué —'}</dd>
			</dl>

			<label class="case">
				<input type="checkbox" checked={reservation.acompteVerse} onchange={() => basculerPaiement('acompteVerse')} />
				Acompte versé
			</label>
			<label class="case">
				<input type="checkbox" checked={reservation.soldeVerse} onchange={() => basculerPaiement('soldeVerse')} />
				Solde versé
			</label>

			<h3>Notes internes</h3>
			<textarea bind:value={notesLocales} rows="4"></textarea>
			<button onclick={enregistrerNotes}>Enregistrer les notes</button>

			{#if reservation.statut !== 'CANCELLED'}
				<button class="danger" onclick={annuler}>Annuler la réservation</button>
			{/if}
		</section>

		<section>
			<h2>Messages du séjour</h2>
			{#if reservation.messages.length === 0}
				<p class="vide">Aucun message planifié.</p>
			{:else}
				<ul class="chronologie">
					{#each reservation.messages as m}
						<li>
							<div class="ligne-message">
								<span class="type">{m.type}</span>
								<span class="statut statut-{m.statut}">{libellesStatut[m.statut] ?? m.statut}</span>
							</div>
							<div class="date-message">{formatDateHeure(m.planifieLe)}</div>
							{#if m.erreur}<div class="motif">{m.erreur}</div>{/if}
							{#if m.statut === 'PLANIFIE'}
								<button class="petit" onclick={() => envoyerMaintenant(m.id)}>Envoyer maintenant</button>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
{/if}

<style>
	.entete { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
	.colonnes { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; align-items: start; }
	section { background: white; border-radius: 8px; padding: 1.25rem; }
	dl { display: grid; grid-template-columns: auto 1fr; gap: 0.3rem 1rem; margin-bottom: 1rem; }
	dt { color: #6b7280; font-size: 0.85rem; }
	dd { margin: 0; }
	.case { display: flex; align-items: center; gap: 0.5rem; margin: 0.4rem 0; font-size: 0.9rem; }
	textarea { width: 100%; margin: 0.5rem 0; padding: 0.5rem; border-radius: 6px; border: 1px solid #d1d5db; }
	button {
		background: #14532d; color: white; border: none; border-radius: 6px;
		padding: 0.45rem 1rem; font-size: 0.9rem; cursor: pointer; margin-top: 0.4rem;
	}
	button.danger { background: #b91c1c; margin-left: 0.5rem; }
	button.petit { padding: 0.25rem 0.6rem; font-size: 0.8rem; margin-top: 0.5rem; }
	.badge { padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; }
	.badge-PENDING { background: #fef3c7; color: #92400e; }
	.badge-CONFIRMED { background: #d1fae5; color: #065f46; }
	.badge-CANCELLED { background: #fee2e2; color: #991b1b; }
	.chronologie { list-style: none; padding: 0; margin: 0; }
	.chronologie li { padding: 0.6rem 0; border-bottom: 1px solid #e5e7eb; }
	.ligne-message { display: flex; justify-content: space-between; align-items: center; }
	.type { font-weight: 600; }
	.date-message { color: #6b7280; font-size: 0.85rem; }
	.motif { color: #b91c1c; font-size: 0.85rem; margin-top: 0.2rem; }
	.statut { font-size: 0.8rem; padding: 0.1rem 0.5rem; border-radius: 999px; }
	.statut-PLANIFIE { background: #dbeafe; color: #1e40af; }
	.statut-ENVOYE { background: #d1fae5; color: #065f46; }
	.statut-ECHEC, .statut-IMPOSSIBLE { background: #fee2e2; color: #991b1b; }
	.statut-ANNULE { background: #f3f4f6; color: #6b7280; }
	.vide { color: #9ca3af; }
	.erreur { color: #b91c1c; }
</style>
