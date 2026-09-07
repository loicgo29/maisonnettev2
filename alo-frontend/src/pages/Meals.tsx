import React, { useState, useEffect } from 'react';
import {
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
  TextField,
} from '@mui/material';
import { mealsAPI, periodsAPI } from '../services/api';
import { getPersonColor } from '../styles/colors';
import { Period } from '../types';

const accountsConfig = {
  gourmich: ['Loïc', 'Mahaut', 'Alban', 'Ilan'],
  tigresse: ['Alice', 'Adèle', 'Joséphine', 'Albert', 'Oscar'],
};

type MealData = Record<string, Record<string, number>>;

export default function Meals() {
  const [mealData, setMealData] = useState<MealData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState<Period | null>(null);

  const [selectedAccount, setSelectedAccount] = useState<'gourmich' | 'tigresse'>('gourmich');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Charger la période active au démarrage
  useEffect(() => {
    const loadPeriod = async () => {
      try {
        const response = await periodsAPI.getAll();
        const periods = response.data || [];
        const active = periods.find((p: Period) => p.status === 'draft');
        if (active) {
          setActivePeriod(active);
          setStartDate(active.start_date);
        }
      } catch (err) {
        console.error('Erreur chargement période:', err);
      }
    };
    loadPeriod();
  }, []);

  // Charger les repas sur la plage de dates
  useEffect(() => {
    if (!startDate || !endDate) return;

    const loadMeals = async () => {
      try {
        setLoading(true);
        const response = await mealsAPI.getRange(startDate, endDate, selectedAccount);
        setMealData(response.data);
        setError(null);
      } catch (err: any) {
        const errorMsg = err?.response?.data?.detail || err?.message || 'Erreur inconnue';
        setError(`Erreur : ${errorMsg}`);
        console.error('Erreur chargement repas:', { err, startDate, endDate, selectedAccount });
      } finally {
        setLoading(false);
      }
    };
    loadMeals();
  }, [startDate, endDate, selectedAccount]);

  const people = accountsConfig[selectedAccount];

  // Fonction pour obtenir le numéro de semaine ISO
  const getWeekNumber = (dateStr: string): number => {
    const d = new Date(dateStr);
    const dayNum = d.getDay() || 7;
    d.setDate(d.getDate() - dayNum + 4);
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNum;
  };

  // Fonction pour calculer Pâques (algorithme de Meeus)
  const getEasterDate = (year: number): Date => {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  };

  // Jours fériés français
  const isPublicHoliday = (dateStr: string): boolean => {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();

    const dateCheck = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Jours fériés fixes
    const fixedHolidays = [
      `${year}-01-01`, // Jour de l'an
      `${year}-05-01`, // Fête du Travail
      `${year}-05-08`, // Victoire 1945
      `${year}-07-14`, // Fête nationale
      `${year}-08-15`, // Assomption
      `${year}-11-01`, // Toussaint
      `${year}-11-11`, // Armistice
      `${year}-12-25`, // Noël
    ];

    if (fixedHolidays.includes(dateCheck)) return true;

    // Jours fériés mobiles basés sur Pâques
    const easter = getEasterDate(year);

    // Lundi de Pâques (jour après Pâques)
    const easterMonday = new Date(easter);
    easterMonday.setDate(easterMonday.getDate() + 1);
    const mondayMonth = easterMonday.getMonth() + 1;
    const mondayDay = easterMonday.getDate();

    if (month === mondayMonth && day === mondayDay) return true;

    // Ascension (39 jours après Pâques)
    const ascension = new Date(easter);
    ascension.setDate(ascension.getDate() + 39);
    const ascensionMonth = ascension.getMonth() + 1;
    const ascensionDay = ascension.getDate();
    if (month === ascensionMonth && day === ascensionDay) return true;

    // Lundi de Pentecôte (50 jours après Pâques)
    const pentecost = new Date(easter);
    pentecost.setDate(pentecost.getDate() + 50);
    const pentecostMonth = pentecost.getMonth() + 1;
    const pentecostDay = pentecost.getDate();
    if (month === pentecostMonth && day === pentecostDay) return true;

    return false;
  };

  // Fonction pour vérifier si c'est un weekend (samedi=6, dimanche=0)
  const isWeekend = (dateStr: string): boolean => {
    const d = new Date(dateStr);
    const dayOfWeek = d.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  const saveMeal = async (dateStr: string, person: string, value: number) => {
    try {
      const d = new Date(dateStr);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const day = d.getDate();

      await mealsAPI.saveMeal({
        year,
        month,
        day,
        account: selectedAccount,
        person,
        repas: value,
      });
    } catch (err: any) {
      console.error('Erreur sauvegarde repas:', err);
      setError(`Erreur sauvegarde: ${err?.response?.data?.detail || err?.message}`);
    }
  };

  const handleMealChange = (dateStr: string, person: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setMealData(prev => ({
      ...prev,
      [dateStr]: {
        ...prev[dateStr],
        [person]: numValue,
      },
    }));
    saveMeal(dateStr, person, numValue);
  };

  // Calculer les totaux
  const totals = {
    byPerson: {} as Record<string, number>,
    total: 0,
  };

  Object.values(mealData).forEach(dayMeals => {
    people.forEach(person => {
      const count = dayMeals?.[person] || 0;
      totals.byPerson[person] = (totals.byPerson[person] || 0) + count;
    });
  });

  totals.total = Object.values(totals.byPerson).reduce((a, b) => a + b, 0);

  // Trier les dates en ordre décroissant (plus récent en haut)
  const sortedDates = Object.keys(mealData).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const periodLabel = activePeriod ? `${activePeriod.name} (${activePeriod.start_date} → ${activePeriod.end_date})` : 'Aucune période active';

  return (
    <div className="container">
      <h1>🍽️ Repas</h1>

      {error && (
        <div style={{ color: 'red', marginBottom: '20px', padding: '10px', backgroundColor: '#ffe0e0', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {/* Sélecteurs */}
      <Box sx={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
        <TextField
          label="Depuis"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="Jusqu'au"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <FormControl>
          <InputLabel>Compte</InputLabel>
          <Select
            value={selectedAccount}
            label="Compte"
            onChange={(e) => setSelectedAccount(e.target.value as 'gourmich' | 'tigresse')}
          >
            <MenuItem value="gourmich">Gourmich</MenuItem>
            <MenuItem value="tigresse">Tigresse</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Info période */}
      <Box sx={{ marginBottom: '15px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '4px', fontSize: '0.9em' }}>
        <strong>Période active :</strong> {periodLabel}
      </Box>

      {/* Résumé */}
      <Box sx={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
        {people.map(person => (
          <div key={person} style={{
            backgroundColor: getPersonColor(person as any),
            color: 'white',
            padding: '15px',
            borderRadius: '8px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.9em', opacity: 0.9 }}>{person}</div>
            <div style={{ fontSize: '1.8em', fontWeight: 'bold', marginTop: '5px' }}>
              {totals.byPerson[person] || 0}
            </div>
            <div style={{ fontSize: '0.85em', opacity: 0.8, marginTop: '5px' }}>
              {totals.total > 0 ? `${((totals.byPerson[person] || 0) / totals.total * 100).toFixed(1)}%` : '0%'}
            </div>
          </div>
        ))}
        {/* Carte Total */}
        <div style={{
          backgroundColor: '#333333',
          color: 'white',
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.9em', opacity: 0.9 }}>Total</div>
          <div style={{ fontSize: '1.8em', fontWeight: 'bold', marginTop: '5px' }}>
            {totals.total}
          </div>
          <div style={{ fontSize: '0.85em', opacity: 0.8, marginTop: '5px' }}>
            repas
          </div>
        </div>
      </Box>

      {/* Tableau chronologique */}
      <TableContainer component={Paper} sx={{ marginBottom: '30px' }}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', minWidth: '120px' }}>Date</TableCell>
              {people.map(person => (
                <TableCell
                  key={person}
                  align="center"
                  sx={{
                    fontWeight: 'bold',
                    backgroundColor: getPersonColor(person as any),
                    color: 'white',
                    minWidth: '80px',
                  }}
                >
                  {person}
                </TableCell>
              ))}
              <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#e0e0e0', minWidth: '70px' }}>
                Total
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={people.length + 2} align="center" sx={{ padding: '20px' }}>
                  Chargement…
                </TableCell>
              </TableRow>
            ) : sortedDates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={people.length + 2} align="center" sx={{ padding: '20px', color: '#999' }}>
                  Aucun repas trouvé
                </TableCell>
              </TableRow>
            ) : (
              sortedDates.map(dateStr => {
                const dayMeals = mealData[dateStr];
                const dayTotal = people.reduce((sum, p) => sum + (dayMeals[p] || 0), 0);

                const weekNumber = getWeekNumber(dateStr);
                const isHoliday = isPublicHoliday(dateStr);
                const isWknd = isWeekend(dateStr);
                const isOddWeek = weekNumber % 2 === 1;

                let bgColor = '#ffffff';
                if (isHoliday || isWknd) {
                  bgColor = '#ffcccc';
                } else if (isOddWeek) {
                  bgColor = '#f0f4ff';
                }

                return (
                  <TableRow key={dateStr} sx={{ backgroundColor: bgColor, '&:hover': { backgroundColor: isHoliday || isWknd ? '#ffb3b3' : isOddWeek ? '#e8ecff' : '#f9f9f9' } }}>
                    <TableCell sx={{ fontWeight: '600', backgroundColor: 'inherit' }}>
                      {new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </TableCell>
                    {people.map(person => (
                      <TableCell key={`${dateStr}-${person}`} align="center" sx={{ backgroundColor: 'inherit' }}>
                        <TextField
                          type="number"
                          size="small"
                          slotProps={{ htmlInput: { min: 0, max: 4, style: { textAlign: 'center' } } }}
                          value={dayMeals[person] || 0}
                          onChange={(e) => handleMealChange(dateStr, person, e.target.value)}
                          sx={{
                            width: '60px',
                            '& input': { padding: '4px', fontSize: '0.9em' },
                          }}
                        />
                      </TableCell>
                    ))}
                    <TableCell align="center" sx={{ backgroundColor: 'inherit', fontWeight: '600' }}>
                      {dayTotal}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
            {/* Ligne de totaux */}
            {sortedDates.length > 0 && (
              <TableRow sx={{ backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>TOTAL</TableCell>
                {people.map(person => (
                  <TableCell key={`total-${person}`} align="center" sx={{ fontWeight: 'bold' }}>
                    {totals.byPerson[person] || 0}
                  </TableCell>
                ))}
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  {totals.total}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
