<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { destinationApresConnexion } from '$lib/alo';

	let username = '';
	let pwd = '';
	let error = '';
	let loading = false;

	async function handleLogin(e: SubmitEvent) {
		e.preventDefault();
		loading = true;
		error = '';

		try {
			const response = await fetch('/api/backoffice/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, pwd }),
			});

			const data = await response.json();

			if (!response.ok) {
				error = data.error || 'Login failed';
				loading = false;
				return;
			}

			// Le cookie de session n'est plus posé ici : le serveur le renvoie
			// lui-même en HttpOnly, donc invisible aux scripts de la page. Écrit
			// en JavaScript, il était par construction lisible en JavaScript, et
			// une faille XSS suffisait à emporter la session.
			//
			// Seul le profil affiché reste côté client : il ne donne aucun accès.
			if (typeof window !== 'undefined') {
				localStorage.setItem('backoffice_user', JSON.stringify(data.user));
			}

			await invalidateAll();

			// Rediriger vers le backoffice dashboard (gestion des messages/relances)
			location.href = '/backoffice';
		} catch (err) {
			console.error('[Login] Error:', err);
			error = 'Connection error: ' + (err instanceof Error ? err.message : 'Unknown error');
			loading = false;
		}
	}
</script>

<div class="login-container">
	<div class="login-box">
		<h1>🔐 Backoffice Login</h1>
		<p class="subtitle">Staff only</p>

		{#if error}
			<div class="error-message">{error}</div>
		{/if}

		<form on:submit={handleLogin}>
			<div class="form-group">
				<label for="username">Username</label>
				<input
					id="username"
					type="text"
					bind:value={username}
					disabled={loading}
					required
					placeholder="admin"
				/>
			</div>

			<div class="form-group">
				<label for="pwd">Secret Key</label>
				<input
					id="pwd"
					type="password"
					bind:value={pwd}
					disabled={loading}
					required
					placeholder="••••••••"
				/>
			</div>

			<button type="submit" disabled={loading} class="btn-login">
				{loading ? 'Authenticating...' : 'Sign In'}
			</button>
		</form>
	</div>
</div>

<style>
	.login-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
			sans-serif;
	}

	.login-box {
		background: white;
		padding: 2rem;
		border-radius: 8px;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
		width: 100%;
		max-width: 400px;
	}

	h1 {
		margin: 0 0 0.5rem;
		font-size: 1.8rem;
		text-align: center;
		color: #333;
	}

	.subtitle {
		text-align: center;
		color: #999;
		font-size: 0.9rem;
		margin-bottom: 1.5rem;
	}

	.error-message {
		background: #fee;
		color: #c33;
		padding: 0.75rem;
		border-radius: 4px;
		margin-bottom: 1rem;
		font-size: 0.9rem;
		border-left: 4px solid #c33;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	label {
		display: block;
		font-weight: 500;
		color: #333;
		margin-bottom: 0.5rem;
		font-size: 0.9rem;
	}

	input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 1rem;
		transition: border-color 0.2s;
		box-sizing: border-box;
	}

	input:focus {
		outline: none;
		border-color: #667eea;
		box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
	}

	input:disabled {
		background: #f5f5f5;
		color: #999;
		cursor: not-allowed;
	}

	.btn-login {
		width: 100%;
		padding: 0.75rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.2s, box-shadow 0.2s;
	}

	.btn-login:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
	}

	.btn-login:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

</style>
