export const colors = {
  alice: '#9C27B0',      // Mauve
  loic: '#4CAF50',       // Vert
  quotepart: '#FFC107',  // Jaune
  '50_50': '#8BC34A',    // Vert clair
  dette: '#E91E63',      // Rose
  telegram: '#2196F3',   // Bleu
  primary: '#667eea',
  secondary: '#764ba2',
  background: '#f5f5f5',
  white: '#ffffff',
  text: '#333333',
  border: '#eeeeee',
};

export const getCategoryColor = (category: string): string => {
  const categoryMap: Record<string, string> = {
    quotepart: colors.quotepart,
    '50/50': colors['50_50'],
    dette: colors.dette,
    brico: colors.loic,
    virement: colors.loic,
    trop_plein: '#FF9800',  // Orange pour virements de trop-plein
    regule_periode: '#673AB7',  // Violet pour régulation de période
  };
  return categoryMap[category] || colors.primary;
};

export const getPersonColor = (person: string): string => {
  const personMap: Record<string, string> = {
    'Alice': colors.alice,
    'Loïc': colors.loic,
    'Fortuneo': '#9C9C9C',  // Gris pour le compte commun
  };
  return personMap[person] || colors.primary;
};

export const getSourceColor = (source: string): string => {
  const sourceMap: Record<string, string> = {
    'telegram': colors.telegram,
    'csv_import': '#9C9C9C',  // Gris pour Fortuneo
    'manuel': colors.primary,
    'brico': colors.loic,
  };
  return sourceMap[source] || colors.primary;
};
