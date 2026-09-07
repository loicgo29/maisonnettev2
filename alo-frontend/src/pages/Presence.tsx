import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Card,
  CardContent,
} from '@mui/material';
import { presenceAPI } from '../services/api';
import ProfileSelector from '../components/ProfileSelector';

const ACCOUNTS_CONFIG = {
  gourmich: ['Loïc', 'Mahaut', 'Alban', 'Ilan'],
  tigresse: ['Alice', 'Adèle', 'Joséphine', 'Albert', 'Oscar'],
};

type PresenceData = Record<string, Record<string, { midi: boolean; soir: boolean }>>;

export default function Presence() {
  const [profile, setProfile] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [presenceData, setPresenceData] = useState<PresenceData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProfileSelect = (selectedProfile: string, selectedAccount: string) => {
    setProfile(selectedProfile);
    setAccount(selectedAccount);
  };

  useEffect(() => {
    if (!account || !profile) return;

    const loadPresence = async () => {
      try {
        setLoading(true);
        const now = new Date();
        const start = new Date(now);
        start.setDate(start.getDate() - 3);
        const end = new Date(now);
        end.setDate(end.getDate() + 6);

        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        const response = await presenceAPI.getRange(startStr, endStr, account);
        setPresenceData(response.data);
        setError(null);
      } catch (err: any) {
        const errorMsg = err?.response?.data?.detail || err?.message || 'Erreur inconnue';
        setError(`Erreur : ${errorMsg}`);
        console.error('Erreur chargement présence:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPresence();
  }, [account, profile]);

  const handleToggle = async (dateStr: string, slot: 'midi' | 'soir', person: string) => {
    if (!account || !profile) return;

    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const current = presenceData[dateStr]?.[person] || { midi: true, soir: true };
      const isCurrentlyPresent = slot === 'midi' ? current.midi : current.soir;

      // Mise à jour optimiste
      setPresenceData(prev => ({
        ...prev,
        [dateStr]: {
          ...prev[dateStr],
          [person]: {
            ...prev[dateStr]?.[person],
            [slot]: !isCurrentlyPresent,
          },
        },
      }));

      await presenceAPI.toggle({
        year,
        month,
        day,
        account,
        person,
        slot,
        present: !isCurrentlyPresent,
      });
    } catch (err: any) {
      // Rollback en cas d'erreur
      await loadPresenceAgain();
      console.error('Erreur toggle:', err);
    }
  };

  const loadPresenceAgain = async () => {
    if (!account || !profile) return;
    try {
      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - 3);
      const end = new Date(now);
      end.setDate(end.getDate() + 6);

      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];

      const response = await presenceAPI.getRange(startStr, endStr, account);
      setPresenceData(response.data);
    } catch (err) {
      console.error('Erreur rechargement:', err);
    }
  };


  const getVisiblePeople = (): string[] => {
    if (!account || !profile) return [];
    if (profile === 'Loïc') return ACCOUNTS_CONFIG.gourmich;
    if (profile === 'Alice') return ACCOUNTS_CONFIG.tigresse;
    // Enfants : ne voient que eux-mêmes
    return [profile];
  };

  const visiblePeople = getVisiblePeople();

  // Trier les dates
  const sortedDates = Object.keys(presenceData).sort();

  if (!profile || !account) {
    return (
      <div className="container">
        <h1>🍽️ Présence aux repas</h1>
        <ProfileSelector onProfileSelect={handleProfileSelect} />
      </div>
    );
  }

  return (
    <div className="container">
      <h1>🍽️ Présence aux repas</h1>

      <ProfileSelector onProfileSelect={handleProfileSelect} currentProfile={profile} />

      {error && (
        <Box sx={{ color: 'red', mb: 2, p: 1.5, backgroundColor: '#ffe0e0', borderRadius: '4px' }}>
          {error}
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          {sortedDates.map(dateStr => {
            const d = new Date(dateStr + 'T12:00:00');
            const dayName = d.toLocaleDateString('fr-FR', { weekday: 'short', month: 'short', day: 'numeric' });

            return (
              <Card key={dateStr} sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    {dayName}
                  </Typography>

                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
                    {visiblePeople.map(person => {
                      const presence = presenceData[dateStr]?.[person] || { midi: true, soir: true };

                      return (
                        <Box key={person} sx={{ p: 1.5, backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                            {person}
                          </Typography>

                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              variant={presence.midi ? 'contained' : 'outlined'}
                              color={presence.midi ? 'success' : 'error'}
                              onClick={() => handleToggle(dateStr, 'midi', person)}
                              sx={{ flex: 1 }}
                            >
                              Midi {presence.midi ? '✓' : '✗'}
                            </Button>
                            <Button
                              size="small"
                              variant={presence.soir ? 'contained' : 'outlined'}
                              color={presence.soir ? 'success' : 'error'}
                              onClick={() => handleToggle(dateStr, 'soir', person)}
                              sx={{ flex: 1 }}
                            >
                              Soir {presence.soir ? '✓' : '✗'}
                            </Button>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}
    </div>
  );
}
