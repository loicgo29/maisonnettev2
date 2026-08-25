import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				runes: true
			},
			// adapter-node : le site est auto-hébergé en conteneur derrière Caddy.
			// Produit un serveur Node autonome démarré par `node build/index.js`.
			adapter: adapter()
		})
	],
	server: {
		host: '0.0.0.0',
		port: 8030,
		proxy: {
			'/api/gites': {
				target: 'http://localhost:3001',
				changeOrigin: true
			},
			'/api/reservations': {
				target: 'http://localhost:3001',
				changeOrigin: true
			},
			'/uploads': {
				target: 'http://localhost:3001',
				changeOrigin: true
			}
		}
	}
});
