<script>
	import { goto } from '$app/navigation';

	let formData = {
		nom: '',
		email: '',
		telephone: '',
		message: ''
	};

	let loading = false;
	let submitted = false;
	let error = '';

	async function handleSubmit(e) {
		e.preventDefault();
		loading = true;
		error = '';

		try {
			const response = await fetch('/api/contact', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formData)
			});

			if (response.ok) {
				submitted = true;
				formData = { nom: '', email: '', telephone: '', message: '' };
				setTimeout(() => {
					goto('/');
				}, 3000);
			} else {
				const data = await response.json();
				error = data.message || 'Erreur lors de l\'envoi';
			}
		} catch (err) {
			error = 'Erreur de connexion. Veuillez réessayer.';
		}

		loading = false;
	}
</script>

<div class="page">
	<section class="hero">
		<h1>Nous Contacter</h1>
		<p class="tagline">Posez-nous vos questions</p>
	</section>

	<section class="contact-container">
		<div class="contact-form">
			{#if submitted}
				<div class="success-message">
					<h2>✅ Message envoyé!</h2>
					<p>Merci pour votre message. Nous vous répondrons très bientôt.</p>
					<p class="redirect">Redirection vers l'accueil...</p>
				</div>
			{:else}
				<form on:submit={handleSubmit}>
					{#if error}
						<div class="error-message">{error}</div>
					{/if}

					<div class="form-group">
						<label for="nom">Nom</label>
						<input
							type="text"
							id="nom"
							name="nom"
							bind:value={formData.nom}
							required
							placeholder="Votre nom"
						/>
					</div>

					<div class="form-group">
						<label for="email">Email</label>
						<input
							type="email"
							id="email"
							name="email"
							bind:value={formData.email}
							required
							placeholder="votre@email.com"
						/>
					</div>

					<div class="form-group">
						<label for="telephone">Téléphone</label>
						<input
							type="tel"
							id="telephone"
							name="telephone"
							bind:value={formData.telephone}
							required
							placeholder="+33 7 XX XX XX XX"
						/>
					</div>

					<div class="form-group">
						<label for="message">Message</label>
						<textarea
							id="message"
							name="message"
							bind:value={formData.message}
							required
							placeholder="Écrivez votre message ici..."
							rows="6"
						></textarea>
					</div>

					<button type="submit" class="btn-primary" disabled={loading}>
						{loading ? 'Envoi...' : 'Envoyer le message'}
					</button>
				</form>
			{/if}
		</div>

		<div class="contact-info">
			<h2>Infos de contact</h2>

			<div class="info-box">
				<h3>📞 Téléphone</h3>
				<p><a href="tel:+33781103889">+33 7 81 10 38 89</a></p>
				<p class="hours">24h/24, 7j/7</p>
			</div>

			<div class="info-box">
				<h3>📧 Email</h3>
				<p><a href="mailto:lgbertheaume@gmail.com">lgbertheaume@gmail.com</a></p>
			</div>

			<div class="info-box">
				<h3>📍 Adresse</h3>
				<p>Maisonnette de Bertheaume<br />Côtes d'Armor, France</p>
			</div>
		</div>
	</section>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.page {
		background: linear-gradient(to bottom, #f5f7fa 0%, #ffffff 100%);
		min-height: 100vh;
	}

	.hero {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		padding: 60px 20px;
		text-align: center;
	}

	.hero h1 {
		margin: 0 0 10px 0;
		font-size: 42px;
		font-weight: 700;
	}

	.tagline {
		font-size: 18px;
		margin: 0;
		opacity: 0.95;
	}

	.contact-container {
		max-width: 1200px;
		margin: 60px auto;
		padding: 0 20px;
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 40px;
	}

	.contact-form {
		background: white;
		padding: 40px;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.contact-info {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.contact-info h2 {
		font-size: 24px;
		margin: 0 0 20px 0;
		color: #1a1a1a;
	}

	.info-box {
		background: white;
		padding: 20px;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.info-box h3 {
		margin: 0 0 12px 0;
		font-size: 18px;
		color: #667eea;
	}

	.info-box p {
		margin: 8px 0;
		color: #333;
		line-height: 1.6;
	}

	.hours {
		font-size: 14px;
		color: #666;
		font-style: italic;
	}

	.info-box a {
		color: #667eea;
		text-decoration: none;
		font-weight: 600;
	}

	.info-box a:hover {
		text-decoration: underline;
	}

	.form-group {
		margin-bottom: 20px;
	}

	label {
		display: block;
		margin-bottom: 8px;
		font-weight: 600;
		color: #1a1a1a;
	}

	input,
	textarea {
		width: 100%;
		padding: 12px;
		border: 1px solid #ddd;
		border-radius: 6px;
		font-size: 16px;
		font-family: inherit;
		box-sizing: border-box;
	}

	input:focus,
	textarea:focus {
		outline: none;
		border-color: #667eea;
		box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
	}

	textarea {
		resize: vertical;
		min-height: 150px;
	}

	.btn-primary {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border: none;
		padding: 14px 32px;
		border-radius: 6px;
		font-size: 16px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		width: 100%;
	}

	.btn-primary:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
	}

	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.error-message {
		background: #fee;
		color: #c33;
		padding: 12px;
		border-radius: 6px;
		margin-bottom: 20px;
		border-left: 4px solid #c33;
	}

	.success-message {
		text-align: center;
		padding: 40px 20px;
	}

	.success-message h2 {
		color: #28a745;
		margin: 0 0 10px 0;
		font-size: 28px;
	}

	.success-message p {
		color: #666;
		margin: 0 0 10px 0;
	}

	.redirect {
		font-size: 14px;
		color: #999;
		font-style: italic;
	}

	@media (max-width: 768px) {
		.hero h1 {
			font-size: 28px;
		}

		.contact-container {
			grid-template-columns: 1fr;
			gap: 30px;
		}

		.contact-form {
			padding: 20px;
		}
	}
</style>
