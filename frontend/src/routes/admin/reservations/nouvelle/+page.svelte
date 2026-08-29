<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { apiAdmin, ErreurAccesRefuse } from '$lib/apiAdmin';

	let regles: { type: string; libelle: string; cochePardefaut: boolean }[] = $state([]);
	let typesCoches: Set<string> = $state(new Set());

	let giteId = $state('');
	let clientNom = $state('');
	let clientPrenom = $state('');
	let clientEmail = $state('');
	let clientTelephone = $state('');
	let plateforme = $state('AIRBNB');
	let dateDebut = $state('');
	let dateFin = $state('');
	let montantTotal = $state('');
	let notesInternes = $state('');

	let enregistrement = $state(false);
	let erreur = $state('');

	onMount(async () => {
		try {
			regles = await apiAdmin.reglesMessages();
			typesCoches = new Set(regles.filter((r) => r.cochePardefaut).map((r) => r.type));
		} catch {
			erreur = 'Impossible de charger la liste des messages';
		}
		// Le gîte est unique aujourd'hui : le formulaire ne demande pas de le
		// choisir. S'il devait y en avoir plusieurs, un sélecteur remplacerait
		// cette valeur — l'identifiant réel est résolu côté serveur.
		try {
			const reponse = await fetch('/api/gites');
			const gites = await reponse.json();
			if (gites[0]) giteId = gites[0].id;
		} catch {
			/* le champ restera vide, la création échouera avec un message clair */
		}
	});

	function bascule(type: string) {
		if (typesCoches.has(type)) typesCoches.delete(type);
		else typesCoches.add(type);
		typesCoches = new Set(typesCoches);
	}

	async function enregistrer(evenement: SubmitEvent) {
		evenement.preventDefault();
		erreur = '';

		if (!giteId || !clientNom || !dateDebut || !dateFin) {
			erreur = 'Le nom du client et les dates sont obligatoires.';
			return;
		}

		enregistrement = true;
		try {
			const creee = await apiAdmin.creerReservation({
				giteId,
				clientNom,
				clientPrenom,
				clientEmail: clientEmail || undefined,
				clientTelephone,
				plateforme,
				dateDebut: new Date(dateDebut).toISOString(),
				dateFin: new Date(dateFin).toISOString(),
				montantTotal: montantTotal ? Number(montantTotal) : 0,
				notesInternes,
				messages: [...typesCoches],
			});
			await goto(`/admin/reservations/${creee.id}`);
		} catch (e) {
			erreur = e instanceof ErreurAccesRefuse ? e.message : "Enregistrement impossible";
		} finally {
			enregistrement = false;
		}
	}
</script>

<h1>Nouvelle réservation</h1>
<p class="aide">Saisie manuelle : les réservations arrivent d'Airbnb, Booking ou Leboncoin.</p>

<form onsubmit={enregistrer}>
	<div class="grille">
		<label>
			Nom
			<input bind:value={clientNom} required />
		</label>
		<label>
			Prénom
			<input bind:value={clientPrenom} />
		</label>
		<label>
			Téléphone
			<input bind:value={clientTelephone} />
		</label>
		<label>
			E-mail <span class="optionnel">(souvent masqué par la plateforme)</span>
			<input type="email" bind:value={clientEmail} />
		</label>
		<label>
			Plateforme
			<select bind:value={plateforme}>
				<option value="AIRBNB">Airbnb</option>
				<option value="BOOKING">Booking</option>
				<option value="LEBONCOIN">Leboncoin</option>
				<option value="DIRECT">Direct</option>
				<option value="AUTRE">Autre</option>
			</select>
		</label>
		<label>
			Montant total (€)
			<input type="number" step="0.01" bind:value={montantTotal} />
		</label>
		<label>
			Arrivée
			<input type="date" bind:value={dateDebut} required />
		</label>
		<label>
			Départ
			<input type="date" bind:value={dateFin} required />
		</label>
	</div>

	<label class="pleine-largeur">
		Notes internes
		<textarea bind:value={notesInternes} rows="2"></textarea>
	</label>

	<fieldset>
		<legend>Messages à programmer</legend>
		{#each regles as r}
			<label class="case">
				<input type="checkbox" checked={typesCoches.has(r.type)} onchange={() => bascule(r.type)} />
				{r.libelle}
			</label>
		{/each}
	</fieldset>

	{#if erreur}<p class="erreur">{erreur}</p>{/if}

	<button type="submit" disabled={enregistrement}>
		{enregistrement ? 'Enregistrement…' : 'Créer la réservation'}
	</button>
</form>

<style>
	.aide { color: #6b7280; margin-bottom: 1.5rem; }
	form { background: white; border-radius: 8px; padding: 1.5rem; max-width: 640px; }
	.grille { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
	label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.9rem; color: #374151; }
	.pleine-largeur { grid-column: 1 / -1; margin-bottom: 1rem; }
	.optionnel { font-weight: 400; color: #9ca3af; font-size: 0.8rem; }
	input, select, textarea {
		padding: 0.5rem 0.6rem; border-radius: 6px; border: 1px solid #d1d5db; font-size: 0.95rem;
	}
	fieldset { border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem; }
	legend { font-weight: 600; padding: 0 0.4rem; }
	.case { flex-direction: row; align-items: center; gap: 0.5rem; margin: 0.4rem 0; }
	button {
		background: #14532d; color: white; border: none; border-radius: 6px;
		padding: 0.6rem 1.5rem; font-size: 1rem; cursor: pointer;
	}
	button:disabled { opacity: 0.6; cursor: wait; }
	.erreur { color: #b91c1c; margin-bottom: 1rem; }
</style>
