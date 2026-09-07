import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Period, Reequilibrage } from '../types';
import { periodsAPI, reequilibrageAPI } from '../services/api';
import { getCategoryColor } from '../styles/colors';

function RivierSection({ periodId }: { periodId: number }) {
  const [riviere, setRiviere] = React.useState<any>(null);

  React.useEffect(() => {
    const loadRiviere = async () => {
      try {
        const response = await fetch(`/api/reequilibrage/${periodId}/riviere`);
        if (response.ok) {
          setRiviere(await response.json());
        }
      } catch (err) {
        console.error('Erreur chargement Rivière:', err);
      }
    };
    loadRiviere();
  }, [periodId]);

  if (!riviere || riviere.count === 0) return null;

  return (
    <Card sx={{ marginTop: '30px', backgroundColor: '#f3e5f5', borderLeft: '4px solid #7b1fa2' }}>
      <CardContent>
        <Typography variant="h6" sx={{ marginBottom: '10px', fontWeight: '600', color: '#7b1fa2' }}>
          🏠 Investissement Rivière (Bricolage - Loïc)
        </Typography>
        <Typography sx={{ fontSize: '1.3em', fontWeight: '700', color: '#7b1fa2' }}>
          {riviere.total.toFixed(2)}€
        </Typography>
        <Typography variant="body2" sx={{ color: '#999', marginTop: '5px' }}>
          Total depuis le début ({riviere.count} opérations)
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function ReequilibragePage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [reequilibrage, setReequilibrage] = useState<Reequilibrage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailCategory, setDetailCategory] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [financementDialogOpen, setFinancementDialogOpen] = useState(false);
  const [financementSource, setFinancementSource] = useState<string | null>(null);
  const [financementData, setFinancementData] = useState<any>(null);
  const [financementLoading, setFinancementLoading] = useState(false);

  useEffect(() => {
    const loadPeriods = async () => {
      try {
        const response = await periodsAPI.getAll();
        setPeriods(response.data);
        if (response.data.length > 0) {
          setSelectedPeriodId(response.data[0].id);
        }
      } catch (err) {
        setError('Erreur lors du chargement des périodes');
        console.error(err);
      }
    };
    loadPeriods();
  }, []);

  useEffect(() => {
    if (!selectedPeriodId) return;

    const loadReequilibrage = async () => {
      try {
        setLoading(true);
        const response = await reequilibrageAPI.getPeriod(selectedPeriodId);
        setReequilibrage(response.data);
        setError(null);
      } catch (err) {
        setError('Erreur lors du chargement du rééquilibrage');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadReequilibrage();
  }, [selectedPeriodId]);

  const handleShowDetails = async (category: string) => {
    if (!selectedPeriodId) return;
    try {
      setDetailLoading(true);
      setDetailCategory(category);
      const response = await fetch(`/api/reequilibrage/${selectedPeriodId}/expenses/${category}`);
      if (!response.ok) throw new Error('Erreur lors du chargement');
      const data = await response.json();
      setDetailData(data);
      setDetailDialogOpen(true);
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleShowFinancementDetails = async (source: string) => {
    if (!selectedPeriodId) return;
    try {
      setFinancementLoading(true);
      setFinancementSource(source);
      const response = await fetch(`/api/reequilibrage/${selectedPeriodId}/${source === 'Virements' ? 'virements' : 'telegram'}`);
      if (!response.ok) throw new Error('Erreur lors du chargement');
      const data = await response.json();
      setFinancementData(data);
      setFinancementDialogOpen(true);
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setFinancementLoading(false);
    }
  };

  if (!reequilibrage || loading) {
    return (
      <div className="container">
        <h1>⚖️ Rééquilibrage</h1>
        {error && (
          <div style={{ color: 'red', marginBottom: '20px', padding: '10px', backgroundColor: '#ffe0e0', borderRadius: '4px' }}>
            {error}
          </div>
        )}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <CircularProgress />
          </Box>
        )}
      </div>
    );
  }

  return (
    <div className="container">
      <h1>⚖️ Rééquilibrage</h1>

      {error && (
        <div style={{ color: 'red', marginBottom: '20px', padding: '10px', backgroundColor: '#ffe0e0', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {/* Sélecteur de période */}
      <Box sx={{ marginBottom: '20px', maxWidth: '300px' }}>
        <FormControl fullWidth>
          <InputLabel>Période</InputLabel>
          <Select
            value={selectedPeriodId || ''}
            label="Période"
            onChange={(e) => setSelectedPeriodId(Number(e.target.value))}
          >
            {periods.map(p => (
              <MenuItem key={p.id} value={p.id}>
                {p.name} ({p.start_date} → {p.end_date})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Quote-part */}
      <Box sx={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <Typography variant="body2" sx={{ fontSize: '0.9em', color: '#666' }}>
          Quote-part (ratios repas):
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: '600', marginTop: '5px' }}>
          Loïc: {(parseFloat(reequilibrage.quotepart.loic) * 100).toFixed(1)}%  •  Alice: {(parseFloat(reequilibrage.quotepart.alice) * 100).toFixed(1)}%
        </Typography>
      </Box>

      {/* Cartes de synthèse */}
      <Typography variant="h6" sx={{ marginBottom: '15px', marginTop: '20px' }}>
        Synthèse
      </Typography>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px', marginBottom: '30px' }}>
        <Card sx={{ backgroundColor: '#9C27B0' }}>
          <CardContent sx={{ color: 'white' }}>
            <Typography color="inherit" gutterBottom>
              Alice
            </Typography>
            <Box sx={{ marginTop: '10px' }}>
              <Typography variant="body2">
                Charges: <strong>{reequilibrage.charges.alice.toFixed(2)}€</strong>
              </Typography>
              <Typography variant="body2">
                Financement: <strong>{reequilibrage.financement.alice.toFixed(2)}€</strong>
              </Typography>
              <Typography variant="body2" sx={{ marginTop: '10px', fontSize: '1.2em', fontWeight: '700' }}>
                Solde: {reequilibrage.solde.alice.toFixed(2)}€
              </Typography>
            </Box>
          </CardContent>
        </Card>
        <Card sx={{ backgroundColor: '#4CAF50' }}>
          <CardContent sx={{ color: 'white' }}>
            <Typography color="inherit" gutterBottom>
              Loïc
            </Typography>
            <Box sx={{ marginTop: '10px' }}>
              <Typography variant="body2">
                Charges: <strong>{reequilibrage.charges.loic.toFixed(2)}€</strong>
              </Typography>
              <Typography variant="body2">
                Financement: <strong>{reequilibrage.financement.loic.toFixed(2)}€</strong>
              </Typography>
              <Typography variant="body2" sx={{ marginTop: '10px', fontSize: '1.2em', fontWeight: '700' }}>
                Solde: {reequilibrage.solde.loic.toFixed(2)}€
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </div>

      {/* Détail des charges */}
      <Typography variant="h6" sx={{ marginBottom: '15px', marginTop: '30px' }}>
        Détail des dépenses par catégorie
      </Typography>
      <TableContainer component={Paper} sx={{ marginBottom: '30px' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Catégorie</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#9C27B0', color: 'white' }}>
                Alice
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#4CAF50', color: 'white' }}>
                Loïc
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                Nombre
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reequilibrage.charges.detail.map((detail, idx) => (
              <TableRow key={idx} sx={{ '&:hover': { backgroundColor: '#f9f9f9' } }}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        backgroundColor: getCategoryColor(detail.category),
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.85em',
                        fontWeight: '600',
                      }}
                    >
                      {detail.category}
                    </span>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleShowDetails(detail.category)}
                      sx={{ fontSize: '0.75em', padding: '2px 6px' }}
                    >
                      Détail
                    </Button>
                  </Box>
                </TableCell>
                <TableCell align="right" sx={{ backgroundColor: '#f0e6fa' }}>
                  {detail.alice.toFixed(2)}€
                </TableCell>
                <TableCell align="right" sx={{ backgroundColor: '#e8f5e9' }}>
                  {detail.loic.toFixed(2)}€
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: '600', backgroundColor: '#f5f5f5' }}>
                  {detail.count}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Financement détail */}
      <Typography variant="h6" sx={{ marginBottom: '15px', marginTop: '30px' }}>
        Sources de financement
      </Typography>
      <TableContainer component={Paper} sx={{ marginBottom: '30px' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Source</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#9C27B0', color: 'white' }}>
                Alice
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#f0e6fa' }}>
                Nombre
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#4CAF50', color: 'white' }}>
                Loïc
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#e8f5e9' }}>
                Nombre
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell sx={{ fontWeight: '600' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>💳 Virements</span>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleShowFinancementDetails('Virements')}
                    sx={{ fontSize: '0.75em', padding: '2px 6px' }}
                  >
                    Détail
                  </Button>
                </Box>
              </TableCell>
              <TableCell align="right" sx={{ backgroundColor: '#f0e6fa' }}>
                {reequilibrage.financement.virements.alice.toFixed(2)}€
              </TableCell>
              <TableCell align="center" sx={{ backgroundColor: '#f0e6fa', fontWeight: '600' }}>
                {reequilibrage.financement.virements.alice_count}
              </TableCell>
              <TableCell align="right" sx={{ backgroundColor: '#e8f5e9' }}>
                {reequilibrage.financement.virements.loic.toFixed(2)}€
              </TableCell>
              <TableCell align="center" sx={{ backgroundColor: '#e8f5e9', fontWeight: '600' }}>
                {reequilibrage.financement.virements.loic_count}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: '600' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>📱 Telegram</span>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleShowFinancementDetails('Telegram')}
                    sx={{ fontSize: '0.75em', padding: '2px 6px' }}
                  >
                    Détail
                  </Button>
                </Box>
              </TableCell>
              <TableCell align="right" sx={{ backgroundColor: '#f0e6fa' }}>
                {reequilibrage.financement.telegram.alice.toFixed(2)}€
              </TableCell>
              <TableCell align="center" sx={{ backgroundColor: '#f0e6fa', fontWeight: '600' }}>
                {reequilibrage.financement.telegram.alice_count}
              </TableCell>
              <TableCell align="right" sx={{ backgroundColor: '#e8f5e9' }}>
                {reequilibrage.financement.telegram.loic.toFixed(2)}€
              </TableCell>
              <TableCell align="center" sx={{ backgroundColor: '#e8f5e9', fontWeight: '600' }}>
                {reequilibrage.financement.telegram.loic_count}
              </TableCell>
            </TableRow>
            <TableRow sx={{ backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#9C27B0', color: 'white' }}>
                {reequilibrage.financement.alice.toFixed(2)}€
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#9C27B0', color: 'white' }}>
                {reequilibrage.financement.virements.alice_count + reequilibrage.financement.telegram.alice_count}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#4CAF50', color: 'white' }}>
                {reequilibrage.financement.loic.toFixed(2)}€
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#4CAF50', color: 'white' }}>
                {reequilibrage.financement.virements.loic_count + reequilibrage.financement.telegram.loic_count}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Avances */}
      {(reequilibrage.avances.alice !== 0 || reequilibrage.avances.loic !== 0) && (
        <>
          <Typography variant="h6" sx={{ marginBottom: '15px', marginTop: '30px' }}>
            Avances
          </Typography>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography gutterBottom sx={{ color: '#9C27B0' }}>
                  Alice
                </Typography>
                <Typography variant="h6" sx={{ color: '#9C27B0', fontWeight: '700' }}>
                  {reequilibrage.avances.alice.toFixed(2)}€
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography gutterBottom sx={{ color: '#4CAF50' }}>
                  Loïc
                </Typography>
                <Typography variant="h6" sx={{ color: '#4CAF50', fontWeight: '700' }}>
                  {reequilibrage.avances.loic.toFixed(2)}€
                </Typography>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Dettes */}
      {(reequilibrage.dettes?.loic !== 0 || reequilibrage.dettes?.alice !== 0) && (
        <>
          <Typography variant="h6" sx={{ marginBottom: '15px', marginTop: '30px' }}>
            Dettes
          </Typography>

          {/* Synthèse des dettes */}
          <Card sx={{ marginBottom: '20px', backgroundColor: '#ffebee', borderLeft: '4px solid #E91E63' }}>
            <CardContent>
              {reequilibrage.dettes.loic > 0 && reequilibrage.dettes.alice === 0 && (
                <Typography sx={{ color: '#C2185B', fontWeight: '600' }}>
                  ✓ Loïc doit {reequilibrage.dettes.loic.toFixed(2)}€ à Alice
                </Typography>
              )}
              {reequilibrage.dettes.alice > 0 && reequilibrage.dettes.loic === 0 && (
                <Typography sx={{ color: '#C2185B', fontWeight: '600' }}>
                  ✓ Alice doit {reequilibrage.dettes.alice.toFixed(2)}€ à Loïc
                </Typography>
              )}
              {reequilibrage.dettes.loic > 0 && reequilibrage.dettes.alice > 0 && (
                <>
                  <Typography sx={{ color: '#C2185B', fontWeight: '600' }}>
                    Dettes mutuelles:
                  </Typography>
                  <Typography sx={{ color: '#C2185B', marginTop: '5px' }}>
                    • Loïc doit {reequilibrage.dettes.loic.toFixed(2)}€
                  </Typography>
                  <Typography sx={{ color: '#C2185B' }}>
                    • Alice doit {reequilibrage.dettes.alice.toFixed(2)}€
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography gutterBottom sx={{ color: '#9C27B0' }}>
                  Alice
                </Typography>
                <Typography variant="h6" sx={{ color: '#9C27B0', fontWeight: '700' }}>
                  {reequilibrage.dettes.alice.toFixed(2)}€
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography gutterBottom sx={{ color: '#4CAF50' }}>
                  Loïc
                </Typography>
                <Typography variant="h6" sx={{ color: '#4CAF50', fontWeight: '700' }}>
                  {reequilibrage.dettes.loic.toFixed(2)}€
                </Typography>
              </CardContent>
            </Card>
          </div>

          {reequilibrage.dettes.detail && reequilibrage.dettes.detail.length > 0 && (
            <TableContainer component={Paper} sx={{ marginBottom: '30px' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Description</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#f0e6fa' }}>
                      Alice
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#e8f5e9' }}>
                      Loïc
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reequilibrage.dettes.detail.map((dette, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{dette.label}</TableCell>
                      <TableCell align="right" sx={{ backgroundColor: '#f0e6fa' }}>
                        {dette.alice.toFixed(2)}€
                      </TableCell>
                      <TableCell align="right" sx={{ backgroundColor: '#e8f5e9' }}>
                        {dette.loic.toFixed(2)}€
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* Investissement Rivière */}
      <RivierSection periodId={selectedPeriodId || 1} />

      {/* Conclusion */}
      {reequilibrage.conclusion && (
        <Card sx={{ marginTop: '30px', backgroundColor: '#f5f5f5' }}>
          <CardContent>
            <Typography variant="h6" sx={{ marginBottom: '10px', fontWeight: '600' }}>
              Conclusion
            </Typography>
            <Typography sx={{ whiteSpace: 'pre-wrap' }}>
              {reequilibrage.conclusion}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Dialog détail du financement */}
      <Dialog
        open={financementDialogOpen}
        onClose={() => setFinancementDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Détail des opérations - {financementSource}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {financementLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : financementData ? (
            <Box>
              {/* Alice */}
              {financementData.alice && financementData.alice.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ color: '#9C27B0', fontWeight: '700', mb: 2 }}>
                    Alice ({financementData.alice.length} opération{financementData.alice.length > 1 ? 's' : ''})
                  </Typography>
                  <TableContainer component={Paper} sx={{ backgroundColor: '#f0e6fa' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Libellé</TableCell>
                          <TableCell align="right">Montant</TableCell>
                          <TableCell>Source</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {financementData.alice.map((exp: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell sx={{ fontSize: '0.9em' }}>{exp.date}</TableCell>
                            <TableCell>{exp.label}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: '600' }}>
                              {exp.amount.toFixed(2)}€
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.85em', color: '#666' }}>
                              {exp.source}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* Loïc */}
              {financementData.loic && financementData.loic.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ color: '#4CAF50', fontWeight: '700', mb: 2 }}>
                    Loïc ({financementData.loic.length} opération{financementData.loic.length > 1 ? 's' : ''})
                  </Typography>
                  <TableContainer component={Paper} sx={{ backgroundColor: '#e8f5e9' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Libellé</TableCell>
                          <TableCell align="right">Montant</TableCell>
                          <TableCell>Source</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {financementData.loic.map((exp: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell sx={{ fontSize: '0.9em' }}>{exp.date}</TableCell>
                            <TableCell>{exp.label}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: '600' }}>
                              {exp.amount.toFixed(2)}€
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.85em', color: '#666' }}>
                              {exp.source}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {financementData.alice?.length === 0 && financementData.loic?.length === 0 && (
                <Typography sx={{ color: '#999', textAlign: 'center', p: 2 }}>
                  Aucune opération trouvée
                </Typography>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFinancementDialogOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog détail des dépenses */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Détail des opérations - {String(detailCategory).toUpperCase()}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {detailLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : detailData ? (
            <Box>
              {/* Alice */}
              {detailData.alice && detailData.alice.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ color: '#9C27B0', fontWeight: '700', mb: 2 }}>
                    Alice ({detailData.alice.length} opération{detailData.alice.length > 1 ? 's' : ''})
                  </Typography>
                  <TableContainer component={Paper} sx={{ backgroundColor: '#f0e6fa' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Libellé</TableCell>
                          <TableCell align="right">Montant</TableCell>
                          <TableCell>Source</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detailData.alice.map((exp: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell sx={{ fontSize: '0.9em' }}>{exp.date}</TableCell>
                            <TableCell>{exp.label}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: '600' }}>
                              {exp.amount.toFixed(2)}€
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.85em', color: '#666' }}>
                              {exp.source}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* Loïc */}
              {detailData.loic && detailData.loic.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ color: '#4CAF50', fontWeight: '700', mb: 2 }}>
                    Loïc ({detailData.loic.length} opération{detailData.loic.length > 1 ? 's' : ''})
                  </Typography>
                  <TableContainer component={Paper} sx={{ backgroundColor: '#e8f5e9' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Libellé</TableCell>
                          <TableCell align="right">Montant</TableCell>
                          <TableCell>Source</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detailData.loic.map((exp: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell sx={{ fontSize: '0.9em' }}>{exp.date}</TableCell>
                            <TableCell>{exp.label}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: '600' }}>
                              {exp.amount.toFixed(2)}€
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.85em', color: '#666' }}>
                              {exp.source}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {detailData.alice?.length === 0 && detailData.loic?.length === 0 && (
                <Typography sx={{ color: '#999', textAlign: 'center', p: 2 }}>
                  Aucune opération trouvée
                </Typography>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
