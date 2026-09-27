<script>
  let customers = [];
  let invoices = [];
  let loading = false;
  let error = '';
  let customerId = '';
  let invoiceData = {
    reference: 'INV-001',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    amount: 100,
    lines: [{ description: 'Service', quantity: 1, unitPrice: 100, taxCode: 'FR_STANDARD' }]
  };

  async function listCustomers() {
    loading = true;
    error = '';
    try {
      const res = await fetch('/api/admin/comptabilite/oauth/customers', {
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        customers = data.customers || [];
      } else {
        error = data.error || 'Failed to list customers';
      }
    } catch (e) {
      error = String(e);
    }
    loading = false;
  }

  async function syncInvoice() {
    if (!customerId) {
      error = 'Select a customer first';
      return;
    }
    loading = true;
    error = '';
    try {
      const res = await fetch('/api/admin/comptabilite/invoices/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          invoiceId: `invoice-${Date.now()}`,
          customerId,
          ...invoiceData
        })
      });
      const data = await res.json();
      if (res.ok) {
        invoices = [data, ...invoices];
        error = 'Invoice synced!';
      } else {
        error = data.error || 'Failed to sync invoice';
      }
    } catch (e) {
      error = String(e);
    }
    loading = false;
  }
</script>

<div style="padding: 20px; max-width: 1000px; margin: 0 auto; font-family: monospace;">
  <h1>🧪 Sage API Test Panel</h1>

  <section style="margin-bottom: 30px; border: 1px solid #ccc; padding: 15px; border-radius: 5px;">
    <h2>1. List Customers</h2>
    <button on:click={listCustomers} disabled={loading} style="padding: 10px 20px; cursor: pointer;">
      {loading ? '⏳ Loading...' : '📋 Get Customers'}
    </button>

    {#if customers.length > 0}
      <div style="margin-top: 15px;">
        <label>
          Select Customer:
          <select bind:value={customerId} style="padding: 5px;">
            <option value="">-- Choose --</option>
            {#each customers as cust}
              <option value={cust.id}>{cust.name} ({cust.id})</option>
            {/each}
          </select>
        </label>
        <p style="color: #28a745; font-weight: bold;">✅ {customers.length} customers loaded</p>
      </div>
    {/if}
  </section>

  <section style="margin-bottom: 30px; border: 1px solid #ccc; padding: 15px; border-radius: 5px;">
    <h2>2. Sync Invoice to Sage</h2>
    <div style="margin-bottom: 10px;">
      <label>Reference: <input bind:value={invoiceData.reference} style="width: 200px; padding: 5px;" /></label>
    </div>
    <div style="margin-bottom: 10px;">
      <label>Amount: <input type="number" bind:value={invoiceData.amount} style="width: 100px; padding: 5px;" /></label>
    </div>
    <button on:click={syncInvoice} disabled={loading || !customerId} style="padding: 10px 20px; cursor: pointer;">
      {loading ? '⏳ Syncing...' : '📤 Sync Invoice'}
    </button>

    {#if invoices.length > 0}
      <div style="margin-top: 15px; background: #f0f0f0; padding: 10px; border-radius: 3px;">
        <p style="color: #28a745; font-weight: bold;">✅ {invoices.length} invoice(s) synced</p>
        {#each invoices as inv}
          <pre style="background: white; padding: 10px; border-radius: 3px; overflow-x: auto; font-size: 12px;">
{JSON.stringify(inv, null, 2).substring(0, 300)}...</pre>
        {/each}
      </div>
    {/if}
  </section>

  {#if error}
    <div style="margin-top: 20px; padding: 15px; border-radius: 5px; background: {error.includes('✅') ? '#d4edda' : '#f8d7da'}; color: {error.includes('✅') ? '#155724' : '#721c24'}; border: 1px solid {error.includes('✅') ? '#c3e6cb' : '#f5c6cb'};">
      <strong>{error.includes('✅') ? '✅ Success:' : '❌ Error:'}</strong> {error}
    </div>
  {/if}
</div>

<style>
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  button:not(:disabled):hover {
    background-color: #007bff;
    color: white;
  }
</style>
