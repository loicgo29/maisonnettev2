<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import axios from 'axios';
	import { API_URL } from '$lib/api';

  let invoice = null;
  let loading = true;
  let error = null;


  onMount(async () => {
    try {
      const { id } = $page.params;
      const response = await axios.get(`${API_URL}/invoices/${id}`);
      invoice = response.data.data;
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  });
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <a href="/invoices" class="text-blue-600 hover:underline">← Retour aux factures</a>
  </div>

  {#if loading}
    <p class="text-gray-600">Chargement...</p>
  {:else if error}
    <div class="bg-red-50 border border-red-200 p-4 rounded text-red-700">
      Erreur: {error}
    </div>
  {:else if invoice}
    <div class="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div class="mb-6">
        <h1 class="text-3xl font-bold mb-4">{invoice.vendor}</h1>
        <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <p class="text-gray-600 text-sm">Montant</p>
            <p class="text-2xl font-bold text-blue-600">€{invoice.amount.toFixed(2)}</p>
          </div>
          <div>
            <p class="text-gray-600 text-sm">Date</p>
            <p class="text-lg font-semibold">{new Date(invoice.date).toLocaleDateString('fr-FR')}</p>
          </div>
          <div>
            <p class="text-gray-600 text-sm">Source</p>
            <p class="text-lg font-semibold">
              <span class="px-2 py-1 rounded text-sm {invoice.source === 'gmail' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}">
                {invoice.source}
              </span>
            </p>
          </div>
          <div>
            <p class="text-gray-600 text-sm">Créée le</p>
            <p class="text-sm text-gray-600">{new Date(invoice.createdAt).toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
      </div>

      <div class="border-t pt-6">
        <h2 class="text-xl font-bold mb-4">Description</h2>
        <p class="text-gray-700">{invoice.description}</p>
      </div>

      {#if invoice.matches && invoice.matches.length > 0}
        <div class="border-t pt-6 mt-6">
          <h2 class="text-xl font-bold mb-4">Appairages</h2>
          <div class="space-y-3">
            {#each invoice.matches as match}
              <div class="bg-gray-50 rounded p-4 border border-gray-200">
                <p class="font-semibold">Transaction ID: {match.transactionId}</p>
                <p class="text-sm text-gray-600">Status: {match.status}</p>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      {#if invoice.syncLogs && invoice.syncLogs.length > 0}
        <div class="border-t pt-6 mt-6">
          <h2 class="text-xl font-bold mb-4">Historique de Synchronisation</h2>
          <div class="space-y-3">
            {#each invoice.syncLogs as log}
              <div class="bg-gray-50 rounded p-4 border border-gray-200">
                <p class="font-semibold">{log.service}</p>
                <p class="text-sm text-gray-600">Status: {log.status}</p>
                <p class="text-xs text-gray-500">{new Date(log.createdAt).toLocaleDateString('fr-FR')}</p>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {:else}
    <div class="bg-yellow-50 border border-yellow-200 p-4 rounded text-yellow-700">
      Facture introuvable
    </div>
  {/if}
</div>
