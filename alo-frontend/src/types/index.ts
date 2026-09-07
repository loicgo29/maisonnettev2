export interface Expense {
  id: number;
  date: string;
  amount: number;
  label: string;
  category: string;
  source: string;
  status: 'draft' | 'frozen';
  account_id: number;
  sharing_mode?: string;
  comment?: string;
}

export interface Period {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'frozen';
}

export interface Reequilibrage {
  quotepart: Record<string, string>;
  charges: {
    loic: number;
    alice: number;
    detail: Array<{
      category: string;
      loic: number;
      alice: number;
      count: number;
    }>;
  };
  financement: {
    loic: number;
    alice: number;
    virements: { loic: number; alice: number; loic_count: number; alice_count: number; count: number };
    telegram: { loic: number; alice: number; loic_count: number; alice_count: number; count: number };
  };
  solde: {
    loic: number;
    alice: number;
  };
  avances: {
    loic: number;
    alice: number;
  };
  dettes: {
    loic: number;
    alice: number;
    detail: Array<{
      label: string;
      loic: number;
      alice: number;
    }>;
  };
  conclusion: string;
}

export interface MealRecord {
  date: string;
  account: string;
  person: string;
  repas: number;
}
