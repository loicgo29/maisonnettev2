<script>
	import '../app.css';
</script>

<div class="min-h-screen bg-gray-50 flex flex-col">
	<!-- Navigation -->
	<nav class="bg-white shadow-sm border-b border-gray-200">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between h-16">
				<div class="flex items-center">
					<a href="/" class="text-xl font-bold text-blue-600">SASU</a>
					<div class="hidden md:flex ml-8 space-x-8">
						<a href="/dashboard" class="text-gray-600 hover:text-gray-900 px-3 py-2">Dashboard</a>
						<a href="/invoices" class="text-gray-600 hover:text-gray-900 px-3 py-2">Invoices</a>
						<a href="/transactions" class="text-gray-600 hover:text-gray-900 px-3 py-2">Transactions</a>
						<a href="/matches" class="text-gray-600 hover:text-gray-900 px-3 py-2">Matches</a>
						<a href="/sync" class="text-gray-600 hover:text-gray-900 px-3 py-2">Sync</a>
						<a href="/pending-emails" class="text-gray-600 hover:text-gray-900 px-3 py-2">📧 Emails</a>
					</div>
				</div>
			</div>
		</div>
	</nav>

	<!-- Main Content -->
	<main class="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
		<slot />
	</main>

	<!-- Footer -->
	<footer class="bg-white border-t border-gray-200 py-8 mt-12">
		<div class="max-w-7xl mx-auto px-4 text-center text-gray-600">
			<p>&copy; 2026 SASU Automation Platform. All rights reserved.</p>
		</div>
	</footer>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu',
			'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
	}
</style>
