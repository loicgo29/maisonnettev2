import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Dialog, DialogTitle, DialogContent } from '@mui/material';

const ACCOUNTS_CONFIG = {
  gourmich: ['Loïc', 'Mahaut', 'Alban', 'Ilan'],
  tigresse: ['Alice', 'Adèle', 'Joséphine', 'Albert', 'Oscar'],
};

type ProfileSelectorProps = {
  onProfileSelect: (profile: string, account: string) => void;
  currentProfile?: string | null;
};

export default function ProfileSelector({ onProfileSelect, currentProfile }: ProfileSelectorProps) {
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('alo_profile');
    const storedAccount = localStorage.getItem('alo_account');
    if (stored && storedAccount) {
      setSelectedProfile(stored);
      setSelectedAccount(storedAccount);
      onProfileSelect(stored, storedAccount);
    } else {
      setDialogOpen(true);
    }
  }, [onProfileSelect]);

  const handleSelectProfile = (profile: string, account: string) => {
    setSelectedProfile(profile);
    setSelectedAccount(account);
    localStorage.setItem('alo_profile', profile);
    localStorage.setItem('alo_account', account);
    onProfileSelect(profile, account);
    setDialogOpen(false);
  };

  const handleChangeProfile = () => {
    setDialogOpen(true);
  };

  return (
    <>
      {/* Bandeau affichant le profil actuel (si sélectionné) */}
      {selectedProfile && selectedAccount && (
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          p: 1.5,
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          border: '1px solid #ddd'
        }}>
          <Typography variant="body2" sx={{ color: '#666' }}>
            🔐 Connecté en tant que <strong>{selectedProfile}</strong> ({selectedAccount})
          </Typography>
          <Button size="small" variant="outlined" onClick={handleChangeProfile}>
            Changer de profil
          </Button>
        </Box>
      )}

      {/* Dialog de sélection de profil */}
      <Dialog open={dialogOpen} maxWidth="sm" fullWidth>
        <DialogTitle>Sélectionner un profil</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
            Choisissez votre profil pour continuer
          </Typography>
          {Object.entries(ACCOUNTS_CONFIG).map(([accountName, people]) => (
            <Box key={accountName} sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, textTransform: 'capitalize' }}>
                {accountName}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 1 }}>
                {people.map(person => (
                  <Button
                    key={person}
                    variant="outlined"
                    onClick={() => handleSelectProfile(person, accountName)}
                    sx={{
                      py: 1.5,
                      '&:hover': {
                        backgroundColor: accountName === 'gourmich' ? '#e8f5e9' : '#f0e6fa'
                      }
                    }}
                  >
                    {person}
                  </Button>
                ))}
              </Box>
            </Box>
          ))}
        </DialogContent>
      </Dialog>
    </>
  );
}
