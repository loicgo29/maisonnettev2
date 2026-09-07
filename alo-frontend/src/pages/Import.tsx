import React, { useState } from 'react';
import {
  Container,
  Paper,
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import axios from 'axios';

export default function Import() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [authStep, setAuthStep] = useState<'none' | 'need_auth' | 'waiting_code' | 'confirmed'>('none');
  const [smsCode, setSmsCode] = useState('');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreviewData, setCsvPreviewData] = useState<any[]>([]);
  const [showCsvPreview, setShowCsvPreview] = useState(false);

  const handleAuthStart = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post('/api/imports/telegram/auth/start');

      if (response.data.status === 'already_authorized') {
        setAuthStep('confirmed');
      } else if (response.data.status === 'code_sent') {
        setAuthStep('waiting_code');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur authentification');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthConfirm = async () => {
    if (!smsCode) {
      setError('Veuillez entrer le code SMS');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(`/api/imports/telegram/auth/confirm?code=${smsCode}`);

      if (response.data.status === 'authenticated') {
        setAuthStep('confirmed');
        setSmsCode('');
      } else {
        setError(response.data.message);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Code invalide');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await axios.post(
        `/api/imports/telegram/preview${params.toString() ? '?' + params.toString() : ''}`,
        {}
      );

      setPreviewData(response.data.expenses || []);
      setShowPreview(true);
    } catch (err: any) {
      if (err.response?.data?.detail?.includes('expir')) {
        setAuthStep('need_auth');
      }
      setError(err.response?.data?.detail || 'Erreur aperçu Telegram');
    } finally {
      setLoading(false);
    }
  };

  const handleImportTelegram = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await axios.post(
        `/api/imports/telegram/import${params.toString() ? '?' + params.toString() : ''}`,
        {}
      );

      setResult(response.data);
      setShowPreview(false);
    } catch (err: any) {
      if (err.response?.data?.detail?.includes('expir')) {
        setAuthStep('need_auth');
      }
      setError(err.response?.data?.detail || 'Erreur import Telegram');
    } finally {
      setLoading(false);
    }
  };

  const handleCsvPreview = async () => {
    if (!csvFile) {
      setError('Veuillez sélectionner un fichier CSV');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', csvFile);

      const response = await axios.post('/api/imports/csv/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setCsvPreviewData(response.data.expenses || []);
      setShowCsvPreview(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur aperçu CSV');
    } finally {
      setLoading(false);
    }
  };

  const handleImportCsv = async () => {
    if (!csvFile) return;

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const formData = new FormData();
      formData.append('file', csvFile);

      const response = await axios.post('/api/imports/csv/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResult(response.data);
      setShowCsvPreview(false);
      setCsvFile(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur import CSV');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h3" sx={{ mb: 4, textAlign: 'center' }}>
        📥 Import de Dépenses
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 3 }}>
          📱 Import Telegram
        </Typography>

        {/* Auth Step: Initial or Session Expired */}
        {(authStep === 'none' || authStep === 'need_auth') && (
          <Alert severity={authStep === 'none' ? 'info' : 'warning'} sx={{ mb: 3 }}>
            {authStep === 'none'
              ? 'Authentifiez-vous auprès de Telegram pour commencer.'
              : 'Session Telegram expirée. Veuillez vous authentifier.'}
            <Button
              variant="contained"
              size="small"
              onClick={handleAuthStart}
              disabled={loading}
              sx={{ ml: 2 }}
            >
              🔐 S'authentifier
            </Button>
          </Alert>
        )}

        {/* Auth Step: Waiting for SMS Code */}
        {authStep === 'waiting_code' && (
          <Box sx={{ mb: 3, p: 2, backgroundColor: '#e3f2fd', borderRadius: 1 }}>
            <Typography sx={{ mb: 2 }}>
              📨 Code SMS envoyé à +33781103889
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label="Code SMS"
                type="text"
                value={smsCode}
                onChange={(e) => setSmsCode(e.target.value)}
                size="small"
                sx={{ minWidth: 150 }}
              />
              <Button
                variant="contained"
                onClick={handleAuthConfirm}
                disabled={loading || !smsCode}
              >
                {loading ? <CircularProgress size={20} /> : 'Valider'}
              </Button>
            </Box>
          </Box>
        )}

        {/* Auth Step: Confirmed */}
        {authStep === 'confirmed' && (
          <Alert severity="success" sx={{ mb: 3 }}>
            ✅ Authentification réussie! Vous pouvez importer.
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            label="Date de début"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            size="small"
          />
          <TextField
            label="Date de fin"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            size="small"
          />
        </Box>

        <Button
          variant="contained"
          size="large"
          onClick={handlePreview}
          disabled={loading || authStep !== 'confirmed'}
          fullWidth
          sx={{ mb: 2 }}
        >
          {loading ? <CircularProgress size={24} /> : '👁️ Aperçu avant import'}
        </Button>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 3 }}>
          📄 Import CSV (Fortuneo)
        </Typography>

        <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1, border: '2px dashed #ccc' }}>
          <input
            type="file"
            accept=".csv,.zip"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                setCsvFile(e.target.files[0]);
                setError(null);
              }
            }}
            style={{ width: '100%', padding: '10px', cursor: 'pointer' }}
          />
          {csvFile && (
            <Typography variant="body2" sx={{ mt: 1, color: 'green' }}>
              ✅ {csvFile.name}
            </Typography>
          )}
        </Box>

        <Button
          variant="contained"
          size="large"
          onClick={handleCsvPreview}
          disabled={loading || !csvFile}
          fullWidth
          sx={{ mb: 2 }}
        >
          {loading ? <CircularProgress size={24} /> : '👁️ Aperçu avant import'}
        </Button>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Preview Table */}
      {showPreview && previewData.length > 0 && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            📋 Aperçu des dépenses ({previewData.length})
          </Typography>

          <TableContainer sx={{ maxHeight: 400, overflow: 'auto', mb: 3 }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Label</TableCell>
                  <TableCell align="right">Montant</TableCell>
                  <TableCell>Compte</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {previewData.map((expense, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{expense.date}</TableCell>
                    <TableCell>{expense.label}</TableCell>
                    <TableCell align="right">{expense.amount}€</TableCell>
                    <TableCell>{expense.account}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => setShowPreview(false)}
              sx={{ flex: 1 }}
            >
              ← Annuler
            </Button>
            <Button
              variant="contained"
              color="success"
              size="large"
              onClick={handleImportTelegram}
              disabled={loading}
              sx={{ flex: 1 }}
            >
              {loading ? <CircularProgress size={24} /> : '✅ Confirmer Import'}
            </Button>
          </Box>
        </Paper>
      )}

      {/* CSV Preview Table */}
      {showCsvPreview && csvPreviewData.length > 0 && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            📋 Aperçu CSV ({csvPreviewData.length})
          </Typography>

          <TableContainer sx={{ maxHeight: 400, overflow: 'auto', mb: 3 }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Label</TableCell>
                  <TableCell align="right">Montant</TableCell>
                  <TableCell>Catégorie</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {csvPreviewData.map((expense, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{expense.date}</TableCell>
                    <TableCell>{expense.label}</TableCell>
                    <TableCell align="right">{expense.amount}€</TableCell>
                    <TableCell>{expense.category}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => setShowCsvPreview(false)}
              sx={{ flex: 1 }}
            >
              ← Annuler
            </Button>
            <Button
              variant="contained"
              color="success"
              size="large"
              onClick={handleImportCsv}
              disabled={loading}
              sx={{ flex: 1 }}
            >
              {loading ? <CircularProgress size={24} /> : '✅ Confirmer Import'}
            </Button>
          </Box>
        </Paper>
      )}

      {result && (
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Card sx={{ flex: 1, minWidth: 200 }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                ✅ Créées
              </Typography>
              <Typography variant="h3" sx={{ color: 'green' }}>
                {result.created}
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ flex: 1, minWidth: 200 }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                ⏭️ Ignorées
              </Typography>
              <Typography variant="h3" sx={{ color: 'orange' }}>
                {result.skipped}
              </Typography>
            </CardContent>
          </Card>

          {result.filtered !== undefined && (
            <Card sx={{ flex: 1, minWidth: 200 }}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  🔚 Hors plage
                </Typography>
                <Typography variant="h3">
                  {result.filtered}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      )}
    </Container>
  );
}
