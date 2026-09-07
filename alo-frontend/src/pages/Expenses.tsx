import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  TableSortLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Expense, Period } from '../types';
import { expensesAPI, periodsAPI } from '../services/api';
import { getCategoryColor, getPersonColor, getSourceColor } from '../styles/colors';

type SortField = 'date' | 'amount' | 'label' | 'category';
type SortOrder = 'asc' | 'desc';

const categories = ['quotepart', '50/50', 'dette', 'brico', 'virement', 'trop_plein', 'regule_periode'];
const sources = ['manuel', 'telegram', 'csv_import', 'brico'];
const sourceLabels: Record<string, string> = {
  'manuel': 'Manuel',
  'telegram': 'Telegram',
  'csv_import': 'Fortuneo',
  'brico': 'Brico',
};
const people = ['Loïc', 'Alice', 'Fortuneo'];

const getPersonName = (accountId: number): string => {
  if (accountId === 1) return 'Loïc';
  if (accountId === 2) return 'Alice';
  if (accountId === 5) return 'Fortuneo';
  return 'Inconnu';
};

const getAccountId = (personName: string): number => {
  if (personName === 'Loïc') return 1;
  if (personName === 'Alice') return 2;
  if (personName === 'Fortuneo') return 5;
  return 1;
};

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchLabel, setSearchLabel] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterPerson, setFilterPerson] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [originalData, setOriginalData] = useState<Partial<Expense> & {
    date: string;
    amount: number;
    label: string;
    category: string;
    source: string;
    status: 'draft' | 'frozen';
    account_id: number;
  } | null>(null);
  const [formData, setFormData] = useState<Partial<Expense> & {
    date: string;
    amount: number;
    label: string;
    category: string;
    source: string;
    status: 'draft' | 'frozen';
    account_id: number;
  }>({
    date: '',
    amount: 0,
    label: '',
    category: 'quotepart',
    source: 'telegram',
    status: 'draft',
    account_id: 1,
  });

  // Load periods and set default date filter
  useEffect(() => {
    const loadPeriods = async () => {
      try {
        const response = await periodsAPI.getAll();
        const activePeriod = response.data.find((p: Period) => p.status === 'draft');
        if (activePeriod) {
          setFilterDateFrom(activePeriod.start_date);
        }
      } catch (err) {
        console.error('Erreur lors du chargement de la période active:', err);
      }
    };
    loadPeriods();
  }, []);

  // Load expenses
  useEffect(() => {
    const loadExpenses = async () => {
      try {
        setLoading(true);
        const response = await expensesAPI.getAll(0, 1000);
        setExpenses(response.data);
        setError(null);
      } catch (err) {
        setError('Erreur lors du chargement des dépenses');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadExpenses();
  }, []);

  // Filter and sort
  const filteredExpenses = useMemo(() => {
    let result = [...expenses];

    if (searchLabel) {
      result = result.filter(e =>
        e.label && typeof e.label === 'string' && e.label.toLowerCase().includes(searchLabel.toLowerCase())
      );
    }
    if (filterCategory) {
      result = result.filter(e => e.category === filterCategory);
    }
    if (filterSource) {
      result = result.filter(e => e.source === filterSource);
    }
    if (filterPerson) {
      result = result.filter(e => e.account_id === getAccountId(filterPerson));
    }
    if (filterStatus) {
      result = result.filter(e => e.status === filterStatus);
    }
    if (filterDateFrom) {
      result = result.filter(e => e.date >= filterDateFrom);
    }
    if (filterDateTo) {
      result = result.filter(e => e.date <= filterDateTo);
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'amount') {
        aVal = parseFloat(String(aVal));
        bVal = parseFloat(String(bVal));
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [
    expenses,
    searchLabel,
    filterCategory,
    filterSource,
    filterPerson,
    filterStatus,
    filterDateFrom,
    filterDateTo,
    sortField,
    sortOrder,
  ]);

  // Calculate filtered total
  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  }, [filteredExpenses]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleOpenDialog = (expense?: Expense) => {
    const formatDate = (date: any): string => {
      if (!date) return new Date().toISOString().split('T')[0];
      if (typeof date === 'string') {
        // Si c'est une date courte comme "2026", la compléter
        if (date.length === 4) return `${date}-01-01`;
        // Si c'est déjà au bon format, la retourner
        if (date.match(/^\d{4}-\d{2}-\d{2}$/)) return date;
        // Sinon, essayer de la parser
        const d = new Date(date);
        return d.toISOString().split('T')[0];
      }
      // Si c'est un objet Date
      return new Date(date).toISOString().split('T')[0];
    };

    if (expense) {
      const data = {
        date: formatDate(expense.date),
        amount: Number(expense.amount),
        label: expense.label || '',
        category: expense.category as any,
        source: expense.source,
        status: expense.status,
        account_id: Number(expense.account_id),
      };
      setEditingId(expense.id);
      setOriginalData(data);
      setFormData(data);
    } else {
      setEditingId(null);
      setOriginalData(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        label: '',
        category: 'quotepart',
        source: 'telegram',
        status: 'draft',
        account_id: 1,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    try {
      console.log('Saving expense:', { editingId, formData, originalData });
      if (editingId && originalData) {
        // Envoyer UNIQUEMENT les champs qui ont changé
        const dataToSend: Record<string, any> = {};
        Object.keys(formData).forEach(key => {
          const currentVal = formData[key as keyof typeof formData];
          const originalVal = originalData[key as keyof typeof originalData];
          console.log(`Compare ${key}: "${currentVal}" (${typeof currentVal}) vs "${originalVal}" (${typeof originalVal})`);
          if (currentVal !== originalVal) {
            console.log(`  → Changed! Sending ${key}: ${currentVal}`);
            dataToSend[key] = currentVal;
          }
        });
        console.log('Sending only changed fields:', dataToSend);
        const response = await expensesAPI.update(editingId, dataToSend as Partial<Expense>);
        console.log('Update response:', response);
      } else {
        const response = await expensesAPI.create(formData);
        console.log('Create response:', response);
      }
      const response = await expensesAPI.getAll(0, 1000);
      setExpenses(response.data);
      setError(null);
      handleCloseDialog();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(`Erreur lors de la sauvegarde: ${errorMsg}`);
      console.error('Save error:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Confirmer la suppression ?')) {
      try {
        await expensesAPI.delete(id);
        const response = await expensesAPI.getAll(0, 1000);
        setExpenses(response.data);
      } catch (err) {
        setError('Erreur lors de la suppression');
        console.error(err);
      }
    }
  };

  const resetFilters = () => {
    setSearchLabel('');
    setFilterCategory('');
    setFilterSource('');
    setFilterPerson('');
    setFilterStatus('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  return (
    <div className="container">
      <h1>💸 Dépenses</h1>

      {error && (
        <div style={{ color: 'red', marginBottom: '20px', padding: '10px', backgroundColor: '#ffe0e0', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {/* Barre de contrôle */}
      <Box sx={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ backgroundColor: '#667eea' }}
        >
          Nouvelle dépense
        </Button>
        <Button
          variant="outlined"
          onClick={resetFilters}
        >
          ✕ Reset filtres
        </Button>
        <span style={{ marginLeft: 'auto', color: '#666' }}>
          {filteredExpenses.length} dépense{filteredExpenses.length !== 1 ? 's' : ''}
        </span>
      </Box>

      {/* Carte Total filtré */}
      <Box sx={{
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: '#667eea',
        color: 'white',
        borderRadius: '8px',
        fontWeight: '600',
        fontSize: '1.1em',
        display: 'inline-block',
      }}>
        Total filtré : {filteredTotal.toFixed(2)}€
      </Box>

      {/* Recherche et filtres */}
      <Box sx={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
        <TextField
          placeholder="Rechercher par libellé…"
          value={searchLabel}
          onChange={(e) => setSearchLabel(e.target.value)}
          size="small"
        />
        <FormControl size="small">
          <InputLabel>Catégorie</InputLabel>
          <Select
            value={filterCategory}
            label="Catégorie"
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <MenuItem value="">Toutes</MenuItem>
            {categories.map(cat => (
              <MenuItem key={cat} value={cat}>{cat}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small">
          <InputLabel>Source</InputLabel>
          <Select
            value={filterSource}
            label="Source"
            onChange={(e) => setFilterSource(e.target.value)}
          >
            <MenuItem value="">Toutes</MenuItem>
            {sources.map(src => (
              <MenuItem key={src} value={src}>{sourceLabels[src]}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small">
          <InputLabel>Personne</InputLabel>
          <Select
            value={filterPerson}
            label="Personne"
            onChange={(e) => setFilterPerson(e.target.value)}
          >
            <MenuItem value="">Tous</MenuItem>
            {people.map(p => (
              <MenuItem key={p} value={p}>{p}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small">
          <InputLabel>Statut</InputLabel>
          <Select
            value={filterStatus}
            label="Statut"
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <MenuItem value="">Tous</MenuItem>
            <MenuItem value="draft">Brouillon</MenuItem>
            <MenuItem value="frozen">Gelé</MenuItem>
          </Select>
        </FormControl>
        <TextField
          type="date"
          label="Du"
          value={filterDateFrom}
          onChange={(e) => setFilterDateFrom(e.target.value)}
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          type="date"
          label="Au"
          value={filterDateTo}
          onChange={(e) => setFilterDateTo(e.target.value)}
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Box>

      {/* Tableau */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'date'}
                  direction={sortField === 'date' ? sortOrder : 'asc'}
                  onClick={() => handleSort('date')}
                >
                  Date
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'amount'}
                  direction={sortField === 'amount' ? sortOrder : 'asc'}
                  onClick={() => handleSort('amount')}
                >
                  Montant
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'label'}
                  direction={sortField === 'label' ? sortOrder : 'asc'}
                  onClick={() => handleSort('label')}
                >
                  Libellé
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'category'}
                  direction={sortField === 'category' ? sortOrder : 'asc'}
                  onClick={() => handleSort('category')}
                >
                  Catégorie
                </TableSortLabel>
              </TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Personne</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ padding: '20px' }}>
                  Chargement…
                </TableCell>
              </TableRow>
            ) : filteredExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ padding: '20px', color: '#999' }}>
                  Aucune dépense trouvée
                </TableCell>
              </TableRow>
            ) : (
              filteredExpenses.map(expense => (
                <TableRow key={expense.id} sx={{ '&:hover': { backgroundColor: '#f9f9f9' } }}>
                  <TableCell>
                    {typeof expense.date === 'string' ? expense.date : new Date(expense.date).toISOString().split('T')[0]}
                  </TableCell>
                  <TableCell align="right">{expense.amount.toFixed(2)}€</TableCell>
                  <TableCell>{expense.label}</TableCell>
                  <TableCell>
                    <span
                      style={{
                        backgroundColor: getCategoryColor(expense.category),
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.85em',
                        fontWeight: '600',
                      }}
                    >
                      {expense.category}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      style={{
                        backgroundColor: getSourceColor(expense.source),
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.85em',
                      }}
                    >
                      {sourceLabels[expense.source] || expense.source}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      style={{
                        backgroundColor: getPersonColor(getPersonName(expense.account_id)),
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.85em',
                        fontWeight: '600',
                      }}
                    >
                      {getPersonName(expense.account_id)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      style={{
                        backgroundColor: expense.status === 'frozen' ? '#999' : '#FFC107',
                        color: expense.status === 'frozen' ? 'white' : '#000',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.85em',
                      }}
                    >
                      {expense.status === 'frozen' ? 'Gelé' : 'Brouillon'}
                    </span>
                  </TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => handleOpenDialog(expense)}
                      sx={{ marginRight: '5px' }}
                    >
                      Éditer
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDelete(expense.id)}
                    >
                      Supprimer
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog Ajouter/Éditer */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingId ? 'Éditer la dépense' : 'Nouvelle dépense'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
          <TextField
            label="Date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
          <TextField
            label="Montant"
            type="number"
            slotProps={{ htmlInput: { step: '0.01' } }}
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
            fullWidth
          />
          <TextField
            label="Libellé"
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Catégorie</InputLabel>
            <Select
              value={formData.category}
              label="Catégorie"
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
            >
              {categories.map(cat => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Source</InputLabel>
            <Select
              value={formData.source}
              label="Source"
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
            >
              {sources.map(src => (
                <MenuItem key={src} value={src}>{sourceLabels[src]}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Personne</InputLabel>
            <Select
              value={String(formData.account_id)}
              label="Personne"
              onChange={(e) => {
                const newId = Number(e.target.value);
                console.log('Changed account_id:', { old: formData.account_id, new: newId });
                setFormData({ ...formData, account_id: newId });
              }}
            >
              <MenuItem value="1">Loïc</MenuItem>
              <MenuItem value="2">Alice</MenuItem>
              <MenuItem value="5">Fortuneo</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Statut</InputLabel>
            <Select
              value={formData.status}
              label="Statut"
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            >
              <MenuItem value="draft">Brouillon</MenuItem>
              <MenuItem value="frozen">Gelé</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handleSave} variant="contained" sx={{ backgroundColor: '#667eea' }}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
