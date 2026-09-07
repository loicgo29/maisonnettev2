import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { presenceAPI } from '../services/api';
import ProfileSelector from '../components/ProfileSelector';

const ACCOUNTS_CONFIG = {
  gourmich: ['Loïc', 'Mahaut', 'Alban', 'Ilan'],
  tigresse: ['Alice', 'Adèle', 'Joséphine', 'Albert', 'Oscar'],
};

type PresenceData = Record<string, Record<string, { midi: boolean; soir: boolean }>>;

export default function PresenceRestitution() {
  const [profile, setProfile] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [presenceData, setPresenceData] = useState<PresenceData>({});
  const [loading, setLoading] = useState(false);

  const handleProfileSelect = (selectedProfile: string, selectedAccount: string) => {
    setProfile(selectedProfile);
    setAccount(selectedAccount);
  };

  useEffect(() => {
    if (!account || !profile) return;

    const loadPresence = async () => {
      try {
        setLoading(true);
        // Charger 3 ans de données (année précédente + année courante + année suivante)
        const now = new Date();
        const startDate = new Date(now.getFullYear() - 1, 0, 1);
        const endDate = new Date(now.getFullYear() + 2, 11, 31);

        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        const response = await presenceAPI.getRange(startStr, endStr, account);
        setPresenceData(response.data);
      } catch (err: any) {
        console.error('Erreur chargement présence:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPresence();
  }, [account, profile]);

  if (!profile || !account) {
    return (
      <div className="container">
        <h1>📋 Restitution Présence aux repas</h1>
        <ProfileSelector onProfileSelect={handleProfileSelect} />
      </div>
    );
  }

  const visiblePeople = profile === 'Loïc'
    ? ACCOUNTS_CONFIG.gourmich
    : profile === 'Alice'
    ? ACCOUNTS_CONFIG.tigresse
    : [profile];

  const sortedDates = Object.keys(presenceData).sort();

  return (
    <div className="container">
      <h1>📋 Restitution Présence aux repas</h1>

      <ProfileSelector onProfileSelect={handleProfileSelect} currentProfile={profile} />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : sortedDates.length === 0 ? (
        <Box sx={{ p: 3, backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <Typography>Aucune donnée de présence disponible.</Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead sx={{ backgroundColor: '#f5f5f5', position: 'sticky', top: 0 }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, minWidth: 100 }}>Jour</TableCell>
                {visiblePeople.map(person => (
                  <TableCell key={person} align="center" sx={{ fontWeight: 600, minWidth: 90 }}>
                    {person}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedDates.map(dateStr => {
                const d = new Date(dateStr + 'T12:00:00');
                const dayName = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' });

                return (
                  <TableRow key={dateStr}>
                    <TableCell sx={{ fontWeight: 500, minWidth: 100 }}>
                      {dayName}
                    </TableCell>
                    {visiblePeople.map(person => {
                      const presence = presenceData[dateStr]?.[person];
                      if (!presence) return <TableCell key={person} align="center">—</TableCell>;

                      return (
                        <TableCell key={person} align="center" sx={{ fontSize: '0.9rem' }}>
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', fontSize: '0.9rem' }}>
                            <Typography sx={{ fontSize: 'inherit' }}>
                              {presence.midi ? '✓' : '✗'} M
                            </Typography>
                            <Typography sx={{ fontSize: 'inherit' }}>
                              {presence.soir ? '✓' : '✗'} S
                            </Typography>
                          </Box>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Box sx={{ mt: 3, p: 2, backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
        <Typography variant="body2" sx={{ color: '#666' }}>
          <strong>Légende:</strong> M = Midi | S = Soir | ✓ = Présent | ✗ = Absent | — = Non renseigné
        </Typography>
      </Box>
    </div>
  );
}
