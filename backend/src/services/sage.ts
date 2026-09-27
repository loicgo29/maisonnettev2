import axios, { AxiosError } from 'axios';

/**
 * Sage API Service
 * Handles OAuth2 authentication and invoice operations with Sage
 */

interface SageConfig {
  clientId: string;
  clientSecret: string;
  subscriptionKey: string;
  redirectUri: string;
}

interface SageTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface SageInvoice {
  id?: string;
  reference: string;
  date: string;
  dueDate: string;
  customerId: string;
  amount: number;
  status: 'draft' | 'submitted' | 'paid' | 'cancelled';
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxCode?: string;
  }>;
}

interface SageInvoiceResponse {
  id: string;
  reference: string;
  date: string;
  dueDate: string;
  customerId: string;
  amount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const SAGE_AUTH_URL = 'https://sbcauth.sage.fr/connect/authorize';
const SAGE_TOKEN_URL = 'https://sbcauth.sage.fr/connect/token';
const SAGE_API_URL = 'https://api.fr.active.sage.com/graphql';

class SageService {
  private config: SageConfig;
  private accessToken?: string;
  private tokenExpiry?: Date;

  constructor(config: SageConfig) {
    this.config = config;
  }

  /**
   * Step 1: Generate authorization URL for OAuth2 flow
   * User should visit this URL and grant permissions
   */
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      scope: 'RDSA WDSA offline_access',
      state: state || Math.random().toString(36).substring(7),
    });

    return `${SAGE_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Step 2: Exchange authorization code for access token
   * Call this endpoint after user grants permissions
   */
  async exchangeCodeForToken(code: string): Promise<SageTokenResponse> {
    try {
      const response = await axios.post(
        SAGE_TOKEN_URL,
        {
          grant_type: 'authorization_code',
          code,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          redirect_uri: this.config.redirectUri,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'x-api-key': this.config.subscriptionKey,
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(`Sage OAuth error: ${error.response?.data?.error_description || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get or refresh access token
   */
  private async getAccessToken(): Promise<string> {
    if (!this.accessToken) {
      throw new Error('Access token not available. Run exchangeCodeForToken first.');
    }

    if (this.tokenExpiry && this.tokenExpiry <= new Date()) {
      throw new Error('Access token expired. Need to re-authenticate.');
    }

    return this.accessToken;
  }

  /**
   * Set access token directly (for testing or refresh token flows)
   */
  setAccessToken(token: string, expiresIn: number = 3600): void {
    this.accessToken = token;
    this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);
  }

  /**
   * Execute GraphQL query/mutation
   */
  private async executeGraphQL(query: string, variables?: Record<string, unknown>): Promise<unknown> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.post(
        SAGE_API_URL,
        {
          query,
          variables: variables || {},
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-api-key': this.config.subscriptionKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.errors) {
        throw new Error(`GraphQL error: ${response.data.errors[0]?.message}`);
      }

      return response.data.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(`Sage GraphQL error: ${error.response?.data?.errors?.[0]?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Create an invoice in Sage using GraphQL
   */
  async createInvoice(invoice: SageInvoice): Promise<SageInvoiceResponse> {
    const mutation = `
      mutation createSalesInvoice($input: SalesInvoiceCreateGLDtoInput!) {
        createSalesInvoice(input: $input) {
          id
        }
      }
    `;

    const variables = {
      input: {
        customerId: invoice.customerId,
        reference: invoice.reference,
        documentDate: invoice.date,
        dueDate: invoice.dueDate,
        lines: invoice.lines.map(line => ({
          description: line.description,
          totalQuantity: line.quantity,
          unitPrice: line.unitPrice,
          taxCode: line.taxCode || 'FR_STANDARD',
        })),
      },
    };

    const result = await this.executeGraphQL(mutation, variables);
    const data = (result as Record<string, unknown>).createSalesInvoice as Record<string, unknown>;

    return {
      id: (data.id as string) || '',
      reference: (data.reference as string) || invoice.reference,
      date: invoice.date,
      dueDate: invoice.dueDate,
      customerId: invoice.customerId,
      amount: invoice.amount,
      status: (data.status as string) || 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get invoice details from Sage
   */
  async getInvoice(invoiceId: string): Promise<SageInvoiceResponse> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(`${SAGE_API_URL}/invoices/${invoiceId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-api-key': this.config.subscriptionKey,
        },
      });

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(`Sage invoice fetch error: ${error.response?.data?.error || error.message}`);
      }
      throw error;
    }
  }

  /**
   * List all invoices
   */
  async listInvoices(filters?: { status?: string; customerId?: string }): Promise<SageInvoiceResponse[]> {
    try {
      const token = await this.getAccessToken();

      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.customerId) params.append('customerId', filters.customerId);

      const response = await axios.get(`${SAGE_API_URL}/invoices?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-api-key': this.config.subscriptionKey,
        },
      });

      return response.data.invoices || response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(`Sage invoices fetch error: ${error.response?.data?.error || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(
    invoiceId: string,
    status: 'draft' | 'submitted' | 'paid' | 'cancelled'
  ): Promise<SageInvoiceResponse> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.patch(`${SAGE_API_URL}/invoices/${invoiceId}`, { status }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-api-key': this.config.subscriptionKey,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(`Sage invoice update error: ${error.response?.data?.error || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get customer information
   */
  async getCustomer(customerId: string) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(`${SAGE_API_URL}/customers/${customerId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-api-key': this.config.subscriptionKey,
        },
      });

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(`Sage customer fetch error: ${error.response?.data?.error || error.message}`);
      }
      throw error;
    }
  }

  /**
   * List customers from Sage
   */
  async listCustomers(limit: number = 10): Promise<Array<{ id: string; name: string }>> {
    try {
      console.log(`[Sage] Querying customers...`);
      const query = `
        query {
          customers {
            id
            code
            socialName
          }
        }
      `;
      const result = await this.executeGraphQL(query);
      console.log(`[Sage] ✓ Query succeeded! Result:`, JSON.stringify(result).substring(0, 200));

      const customersArray = (result as Record<string, unknown>).customers;
      if (!Array.isArray(customersArray)) {
        console.log(`[Sage] Expected array, got:`, typeof customersArray);
        return [];
      }

      return (customersArray as Array<Record<string, unknown>>).map((customer) => ({
        id: (customer.id as string) || '',
        name: ((customer.socialName || customer.code) as string) || '',
      }));
    } catch (error) {
      console.error(`[Sage] Query failed:`, (error as Error).message);
      throw new Error(`Failed to list customers: ${(error as Error).message}`);
    }
  }

  /**
   * Test connection to Sage API
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.accessToken) {
        console.log('⚠️ No access token. Skipping API connection test.');
        return false;
      }

      await this.listInvoices();
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

export { SageService, SageConfig, SageTokenResponse, SageInvoice, SageInvoiceResponse };
