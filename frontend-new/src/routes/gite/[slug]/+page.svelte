<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import PhotoGallery from './PhotoGallery.svelte';

	let gite = $state<any>(null);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			const slug = $page.params.slug;
			const res = await fetch(`/api/gites/${slug}`);
			if (!res.ok) {
				if (res.status === 404) throw new Error('Gîte non trouvé');
				throw new Error(`HTTP ${res.status}`);
			}
			gite = await res.json();
		} catch (e) {
			error = String(e);
		} finally {
			loading = false;
		}
	});

	// Données structurées — à migrer en base si le catalogue s'agrandit
	const couchages = [
		{ icone: '🛏️', label: 'Chambre 1', detail: '1 lit double' },
		{ icone: '🛏️', label: 'Chambre 2', detail: '2 lits superposés' },
		{ icone: '🛋️', label: 'Salon', detail: 'Canapé convertible 2 personnes' }
	];

	const equipements = [
		{ icone: '🍳', label: 'Plaques de cuisson' },
		{ icone: '🧼', label: 'Lave-vaisselle' },
		{ icone: '🧊', label: 'Réfrigérateur & congélateur' },
		{ icone: '☕', label: 'Machine à café & grille-pain' },
		{ icone: '🍽️', label: 'Table et 4 chaises' },
		{ icone: '👕', label: 'Lave-linge & sèche-linge' },
		{ icone: '🧺', label: 'Fer à repasser & aspirateur' },
		{ icone: '🚿', label: 'Salle de bain équipée' },
		{ icone: '🚽', label: 'WC indépendant' },
		{ icone: '📶', label: 'Wifi & prise Ethernet' },
		{ icone: '📺', label: 'Grande TV & box multimédia' },
		{ icone: '🔥', label: 'Poêle à bois' },
		{ icone: '⛱️', label: 'Terrasse sous auvent' },
		{ icone: '🌳', label: 'Grand jardin arboré' },
		{ icone: '🍖', label: 'Barbecue' },
		{ icone: '🚗', label: 'Stationnement privé' }
	];

	const tarifs = [
		{ periode: 'Basse saison', dates: 'du 30 octobre au 15 avril', prix: '60 €' },
		{ periode: 'Ponts', dates: 'jours fériés et week-ends prolongés', prix: '90 €' },
		{ periode: 'Haute saison', dates: 'du 1er juillet au 31 août', prix: '120 €' }
	];

	const conditions = [
		'Forfait ménage obligatoire de 50 € par location (lits faits, draps lavés, ménage)',
		'Acompte de 30 % à la réservation, solde à l’arrivée',
		'Les lieux doivent être rendus propres par les locataires'
	];

	const alentours = [
		{ icone: '🏖️', label: 'Plage de sable fin', detail: '3 min à pied' },
		{ icone: '🥖', label: 'Bourg et commerces', detail: '10 min à pied' },
		{ icone: '🥾', label: 'Sentier côtier GR34', detail: '200 m' }
	];
</script>

<svelte:head>
	<title>{gite?.nom ?? 'Maisonnette de Bertheaume'} — Location de vacances en bord de mer</title>
	<meta
		name="description"
		content="Maisonnette rénovée 45 m² pour 6 personnes à la pointe de Bertheaume. Grand jardin arboré, plage à 3 minutes à pied, GR34 à 200 m."
	/>
</svelte:head>

{#if loading}
	<div class="state">Chargement…</div>
{:else if error}
	<div class="state error">
		<p>{error}</p>
		<a href="/">Retour à l’accueil</a>
	</div>
{:else if gite}
	<header class="hero-head">
		<h1>{gite.nom}</h1>
		<p class="adresse">📍 {gite.adresse}</p>

		<ul class="badges">
			<li><strong>45 m²</strong> habitables</li>
			<li><strong>{gite.capacite} personnes</strong></li>
			<li><strong>2 chambres</strong> + convertible</li>
			<li class="badge-prix">à partir de <strong>{gite.prixNuit} €</strong> / nuit</li>
		</ul>
	</header>

	{#if gite.photos?.length}
		<section class="galerie">
			<PhotoGallery photos={gite.photos} />
		</section>
	{/if}

	<div class="layout">
		<main>
			<section>
				<h2>Le logement</h2>
				{#each gite.description.split('\n\n') as paragraphe}
					<p>{paragraphe}</p>
				{/each}
			</section>

			<section>
				<h2>Couchages · {gite.capacite} personnes</h2>
				<ul class="cartes">
					{#each couchages as c}
						<li>
							<span class="icone">{c.icone}</span>
							<span><strong>{c.label}</strong><br /><span class="detail">{c.detail}</span></span>
						</li>
					{/each}
				</ul>
			</section>

			<section>
				<h2>Équipements</h2>
				<ul class="equipements">
					{#each equipements as e}
						<li><span class="icone">{e.icone}</span> {e.label}</li>
					{/each}
				</ul>
			</section>

			<section>
				<h2>Les alentours</h2>
				<ul class="cartes">
					{#each alentours as a}
						<li>
							<span class="icone">{a.icone}</span>
							<span><strong>{a.label}</strong><br /><span class="detail">{a.detail}</span></span>
						</li>
					{/each}
				</ul>
			</section>
		</main>

		<aside>
			<div class="panneau">
				<h2>Tarifs</h2>
				<table>
					<tbody>
						{#each tarifs as t}
							<tr>
								<td>
									<strong>{t.periode}</strong><br />
									<span class="detail">{t.dates}</span>
								</td>
								<td class="prix">{t.prix}<span class="unite">/nuit</span></td>
							</tr>
						{/each}
						<tr class="mois">
							<td>
								<strong>Au mois</strong><br />
								<span class="detail">du 15 septembre au 15 juin</span>
							</td>
							<td class="prix">720 €<span class="unite">hors charges</span></td>
						</tr>
					</tbody>
				</table>

				<a class="cta" href="mailto:contact@maisonnette-bertheaume.fr?subject=Demande%20de%20r%C3%A9servation">
					Demander une réservation
				</a>

				<h3>Conditions</h3>
				<ul class="conditions">
					{#each conditions as c}
						<li>{c}</li>
					{/each}
				</ul>
			</div>
		</aside>
	</div>
{/if}

<style>
	:global(body) {
		font-family: system-ui, -apple-system, sans-serif;
		max-width: 1120px;
		margin: 0 auto;
		padding: 2rem 1.25rem 4rem;
		color: #1f2421;
		line-height: 1.6;
	}

	.state {
		padding: 4rem 0;
		text-align: center;
		color: #6b7280;
	}
	.state.error {
		color: #b91c1c;
	}

	.hero-head h1 {
		font-size: clamp(1.9rem, 4vw, 2.6rem);
		margin: 0 0 0.35rem;
		letter-spacing: -0.02em;
	}
	.adresse {
		margin: 0 0 1rem;
		color: #6b7280;
	}

	.badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		list-style: none;
		padding: 0;
		margin: 0 0 1.75rem;
	}
	.badges li {
		background: #f3f4f2;
		border-radius: 999px;
		padding: 0.4rem 0.9rem;
		font-size: 0.92rem;
	}
	.badges li.badge-prix {
		background: #14532d;
		color: #fff;
	}

	.galerie {
		margin-bottom: 2.5rem;
	}

	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
		gap: 3rem;
		align-items: start;
	}

	section {
		margin-bottom: 2.5rem;
	}
	h2 {
		font-size: 1.3rem;
		margin: 0 0 1rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid #e5e7eb;
	}
	main p {
		margin: 0 0 1rem;
	}

	.cartes {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.75rem;
	}
	.cartes li {
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
		background: #f9faf9;
		border: 1px solid #eceeec;
		border-radius: 10px;
		padding: 0.85rem 1rem;
	}

	.equipements {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 0.6rem 1.25rem;
	}
	.equipements li {
		display: flex;
		gap: 0.6rem;
		align-items: center;
	}

	.icone {
		font-size: 1.15rem;
		line-height: 1.4;
	}
	.detail {
		color: #6b7280;
		font-size: 0.9rem;
	}

	.panneau {
		position: sticky;
		top: 1.5rem;
		border: 1px solid #e5e7eb;
		border-radius: 14px;
		padding: 1.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
	}
	.panneau h2 {
		margin-top: 0;
	}
	.panneau h3 {
		font-size: 1rem;
		margin: 1.75rem 0 0.6rem;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}
	td {
		padding: 0.7rem 0;
		border-bottom: 1px solid #f1f2f1;
		vertical-align: top;
	}
	tr:last-child td {
		border-bottom: none;
	}
	.prix {
		text-align: right;
		white-space: nowrap;
		font-weight: 700;
	}
	.unite {
		display: block;
		font-weight: 400;
		font-size: 0.78rem;
		color: #6b7280;
	}
	.mois td {
		border-top: 1px solid #e5e7eb;
	}

	.cta {
		display: block;
		margin-top: 1.25rem;
		padding: 0.9rem 1rem;
		background: #14532d;
		color: #fff;
		text-align: center;
		text-decoration: none;
		border-radius: 10px;
		font-weight: 600;
		transition: background 0.15s ease;
	}
	.cta:hover {
		background: #0f3d21;
	}

	.conditions {
		margin: 0;
		padding-left: 1.1rem;
		font-size: 0.9rem;
		color: #4b5563;
	}
	.conditions li {
		margin-bottom: 0.45rem;
	}

	@media (max-width: 860px) {
		.layout {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
		.panneau {
			position: static;
		}
	}
</style>
