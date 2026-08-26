import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
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
	},
	preview: {
		host: '0.0.0.0',
		port: 5173,
		allowedHosts: [
			'localhost',
			'127.0.0.1',
			'frontend',
			'caddy',
			'maisonnette-pecheur-bertheaume.fr',
			'www.maisonnette-pecheur-bertheaume.fr'
		]
	}
});
