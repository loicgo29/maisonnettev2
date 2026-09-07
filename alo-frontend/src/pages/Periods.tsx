import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LockIcon from '@mui/icons-material/Lock';
import { Period } from '../types';
import { periodsAPI } from '../services/api';

export default function Periods() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    status: 'draft' as const,
  });

  useEffect(() => {
    const loadPeriods = async () => {
      try {
        setLoading(true);
        const response = await periodsAPI.getAll();
        setPeriods(response.data);
        setError(null);
      } catch (err) {
        setError('Erreur lors du chargement des périodes');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadPeriods();
  }, []);

  const handleOpenDialog = () => {
    setFormData({
      name: '',
      start_date: '',
      end_date: '',
      status: 'draft',
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleSave = async () => {
    try {
      await periodsAPI.create(formData);
      const response = await periodsAPI.getAll();
      setPeriods(response.data);
      handleCloseDialog();
    } catch (err) {
      setError('Erreur lors de la création de la période');
      console.error(err);
    }
  };

  const handleFreeze = async (id: number) => {
    if (window.confirm('Geler cette période ? Les dépenses ne pourront plus être modifiées.')) {
      try {
        await periodsAPI.freeze(id);
        const response = await periodsAPI.getAll();
        setPeriods(response.data);
      } catch (err) {
        setError('Erreur lors de la congélation de la période');
        console.error(err);
      }
    }
  };

  const handleExport = async (periodId: number, periodName: string) => {
    try {
      const response = await fetch(`/api/periods/${periodId}/export`);
      if (!response.ok) throw new Error('Erreur export');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${periodName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Erreur lors de l\'export');
      console.error(err);
    }
  };

  return (
    <div className="container">
      <h1>📅 Périodes</h1>

      {error && (
        <div style={{ color: 'red', marginBottom: '20px', padding: '10px', backgroundColor: '#ffe0e0', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      <Box sx={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
          sx={{ backgroundColor: '#667eea' }}
        >
          Nouvelle période
        </Button>
        <span style={{ marginLeft: 'auto', color: '#666' }}>
          {periods.length} période{periods.length !== 1 ? 's' : ''}
        </span>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell>Nom</TableCell>
              <TableCell>Date de début</TableCell>
              <TableCell>Date de fin</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ padding: '20px' }}>
                  Chargement…
                </TableCell>
              </TableRow>
            ) : periods.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ padding: '20px', color: '#999' }}>
                  Aucune période
                </TableCell>
              </TableRow>
            ) : (
              periods.map(period => (
                <TableRow key={period.id} sx={{ '&:hover': { backgroundColor: '#f9f9f9' } }}>
                  <TableCell sx={{ fontWeight: '600' }}>{period.name}</TableCell>
                  <TableCell>{period.start_date}</TableCell>
                  <TableCell>{period.end_date}</TableCell>
                  <TableCell>
                    <span
                      style={{
                        backgroundColor: period.status === 'frozen' ? '#999' : '#FFC107',
                        color: period.status === 'frozen' ? 'white' : '#000',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.85em',
                        fontWeight: '600',
                      }}
                    >
                      {period.status === 'frozen' ? '🔒 Gelée' : '📝 Brouillon'}
                    </span>
                  </TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    <Button
                      size="small"
                      startIcon={<span>📄</span>}
                      onClick={() => handleExport(period.id, period.name)}
                      variant="text"
                      sx={{ marginRight: '8px' }}
                    >
                      Exporter
                    </Button>
                    {period.status === 'draft' && (
                      <Button
                        size="small"
                        startIcon={<LockIcon />}
                        onClick={() => handleFreeze(period.id)}
                        variant="outlined"
                        color="warning"
                      >
                        Geler
                      </Button>
                    )}
                    {period.status === 'frozen' && (
                      <span style={{ color: '#999', fontSize: '0.9em' }}>Gelée</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog Créer */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Nouvelle période</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
          <TextField
            label="Nom"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="ex: Mai 2026"
            fullWidth
          />
          <TextField
            label="Date de début"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
          <TextField
            label="Date de fin"
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handleSave} variant="contained" sx={{ backgroundColor: '#667eea' }}>
            Créer
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
