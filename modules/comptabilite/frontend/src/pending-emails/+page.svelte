<script>
  import { onMount } from 'svelte';

  let pendingEmails = [];
  let loading = true;
  let error = null;
  let retryCount = 0;

  const checkEmails = async () => {
    loading = true;
    error = null;
    try {
      const response = await fetch('/api/invoices/pending-emails');
      if (!response.ok) {
        throw new Error(`Failed to fetch pending emails: ${response.statusText}`);
      }
      const data = await response.json();
      pendingEmails = data.data || [];
      retryCount = 0;
    } catch (err) {
      error = err.message;
      retryCount++;
    } finally {
      loading = false;
    }
  };

  const retryEmail = async (emailId) => {
    try {
      const response = await fetch(`/api/invoices/retry-email/${emailId}`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Retry failed');
      }
      // Remove from list
      pendingEmails = pendingEmails.filter(e => e.id !== emailId);
    } catch (err) {
      error = `Failed to retry email: ${err.message}`;
    }
  };

  const dismissEmail = (emailId) => {
    pendingEmails = pendingEmails.filter(e => e.id !== emailId);
  };

  onMount(() => {
    checkEmails();
    const interval = setInterval(checkEmails, 30000); // Check every 30s
    return () => clearInterval(interval);
  });
</script>

<svelte:head>
	<title>Emails en attente — SASU</title>
</svelte:head>


<div class="space-y-6">
  <div class="flex justify-between items-center">
    <h1 class="text-3xl font-bold">📧 Emails en Souffrance</h1>
    <button
      on:click={checkEmails}
      disabled={loading}
      class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
    >
      {loading ? '⏳ Vérification...' : '🔄 Vérifier'}
    </button>
  </div>

  {#if error}
    <div class="bg-red-50 border border-red-200 rounded-lg p-4">
      <p class="text-red-800">
        <strong>❌ Erreur:</strong> {error}
      </p>
      {#if retryCount > 0}
        <p class="text-red-600 text-sm mt-2">Tentatives: {retryCount}</p>
      {/if}
    </div>
  {/if}

  {#if loading}
    <div class="text-center py-12">
      <p class="text-gray-600">Chargement des emails en souffrance...</p>
    </div>
  {:else if pendingEmails.length === 0}
    <div class="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
      <p class="text-green-800 text-lg font-medium">✅ Tous les emails ont été traités!</p>
      <p class="text-green-600 text-sm mt-2">Aucun email en attente</p>
    </div>
  {:else}
    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <p class="text-yellow-800">
        <strong>⚠️ {pendingEmails.length} email(s) en attente de traitement</strong>
      </p>
    </div>

    <div class="space-y-4">
      {#each pendingEmails as email (email.id)}
        <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
          <div class="flex justify-between items-start mb-3">
            <div class="flex-1">
              <h3 class="font-bold text-lg">{email.subject || 'Sans sujet'}</h3>
              <p class="text-gray-600 text-sm">
                De: <strong>{email.from || 'Inconnu'}</strong>
              </p>
              <p class="text-gray-500 text-xs mt-1">
                📅 {new Date(email.date).toLocaleDateString('fr-FR')} à{' '}
                {new Date(email.date).toLocaleTimeString('fr-FR')}
              </p>
            </div>
            <div class="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
              En attente
            </div>
          </div>

          {#if email.error}
            <div class="bg-red-50 border border-red-200 rounded p-3 mb-3 text-sm">
              <p class="text-red-700">
                <strong>Erreur:</strong> {email.error}
              </p>
            </div>
          {/if}

          {#if email.attachment}
            <div class="bg-gray-50 border border-gray-200 rounded p-2 mb-3 text-sm">
              <p class="text-gray-700">
                📎 <strong>{email.attachment.filename}</strong>
                <span class="text-gray-500">({(email.attachment.size / 1024).toFixed(2)} KB)</span>
              </p>
            </div>
          {/if}

          <div class="flex gap-2">
            <button
              on:click={() => retryEmail(email.id)}
              class="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              🔄 Réessayer
            </button>
            <button
              on:click={() => dismissEmail(email.id)}
              class="px-3 py-1 bg-gray-300 text-gray-800 rounded text-sm hover:bg-gray-400"
            >
              ✗ Ignorer
            </button>
            {#if email.retry_count}
              <span class="text-xs text-gray-500 py-1 px-2">
                Tentatives: {email.retry_count}
              </span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <div class="mt-8 text-xs text-gray-500">
    <p>✓ La page se met à jour automatiquement toutes les 30 secondes</p>
  </div>
</div>

<style>
  :global(body) {
    background-color: #f9fafb;
  }
</style>
