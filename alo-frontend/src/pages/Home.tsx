import React, { useEffect, useState } from 'react';
import { colors } from '../styles/colors';
import { reequilibrageAPI, periodsAPI } from '../services/api';

export default function Home() {
  const [latestPeriod, setLatestPeriod] = useState<any>(null);
  const [reequilibrage, setReequilibrage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const periods = await periodsAPI.getAll();
      const latest = periods.data[0];
      setLatestPeriod(latest);

      if (latest) {
        const data = await reequilibrageAPI.getPeriod(latest.id);
        setReequilibrage(data.data);
      }
    } catch (error) {
      console.error('Erreur chargement home:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <div>
      <h1>Bienvenue dans ALO! 👋</h1>

      {latestPeriod && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '30px' }}>
          {/* Carte Loïc */}
          <Card
            title="Loïc"
            emoji="🧑"
            color={colors.loic}
            content={
              reequilibrage ? (
                <>
                  <p>Charges: <strong>{reequilibrage.charges.loic.toFixed(2)}€</strong></p>
                  <p>Financé: <strong>{reequilibrage.financement.loic.toFixed(2)}€</strong></p>
                  <p style={{
                    color: reequilibrage.solde.loic >= 0 ? colors.loic : colors.dette,
                    fontSize: '1.2em',
                    fontWeight: 'bold'
                  }}>
                    {reequilibrage.solde.loic >= 0 ? '✅ A avancé' : '⚠️ Doit rembourser'}
                  </p>
                  <p style={{ fontSize: '1.5em', fontWeight: 'bold', color: colors.loic }}>
                    {Math.abs(reequilibrage.solde.loic).toFixed(2)}€
                  </p>
                </>
              ) : null
            }
          />

          {/* Carte Alice */}
          <Card
            title="Alice"
            emoji="👩"
            color={colors.alice}
            content={
              reequilibrage ? (
                <>
                  <p>Charges: <strong>{reequilibrage.charges.alice.toFixed(2)}€</strong></p>
                  <p>Financé: <strong>{reequilibrage.financement.alice.toFixed(2)}€</strong></p>
                  <p style={{
                    color: reequilibrage.solde.alice >= 0 ? colors.loic : colors.dette,
                    fontSize: '1.2em',
                    fontWeight: 'bold'
                  }}>
                    {reequilibrage.solde.alice >= 0 ? '✅ A avancé' : '⚠️ Doit rembourser'}
                  </p>
                  <p style={{ fontSize: '1.5em', fontWeight: 'bold', color: colors.alice }}>
                    {Math.abs(reequilibrage.solde.alice).toFixed(2)}€
                  </p>
                </>
              ) : null
            }
          />

          {/* Carte Quotepart */}
          <Card
            title="Quotepart"
            emoji="📊"
            color={colors.quotepart}
            content={
              reequilibrage ? (
                <>
                  <p>Loïc: <strong>{(parseFloat(reequilibrage.quotepart.loic) * 100).toFixed(1)}%</strong></p>
                  <p>Alice: <strong>{(parseFloat(reequilibrage.quotepart.alice) * 100).toFixed(1)}%</strong></p>
                </>
              ) : null
            }
          />

          {/* Carte 50/50 */}
          <Card
            title="50/50"
            emoji="⚡"
            color={colors['50_50']}
            content={
              reequilibrage ? (
                <>
                  <p>Total: <strong>{reequilibrage.charges.detail.find((d: any) => d.category === '50/50')?.loic ? (reequilibrage.charges.detail.find((d: any) => d.category === '50/50').loic + reequilibrage.charges.detail.find((d: any) => d.category === '50/50').alice).toFixed(2) : '0.00'}€</strong></p>
                  <p>Chacun paie: <strong>50%</strong></p>
                </>
              ) : null
            }
          />

          {/* Carte Telegram */}
          <Card
            title="Telegram"
            emoji="💬"
            color={colors.telegram}
            content={
              reequilibrage ? (
                <>
                  <p>Loïc: <strong>{reequilibrage.financement.telegram.loic.toFixed(2)}€</strong></p>
                  <p>Alice: <strong>{reequilibrage.financement.telegram.alice.toFixed(2)}€</strong></p>
                </>
              ) : null
            }
          />

          {/* Carte Total */}
          <Card
            title="Total Dépenses"
            emoji="💰"
            color={colors.primary}
            content={
              reequilibrage ? (
                <>
                  <p style={{ fontSize: '2em', fontWeight: 'bold', color: colors.primary }}>
                    {(reequilibrage.charges.loic + reequilibrage.charges.alice).toFixed(2)}€
                  </p>
                </>
              ) : null
            }
          />
        </div>
      )}
    </div>
  );
}

function Card({ title, emoji, color, content }: any) {
  return (
    <div style={{
      background: colors.white,
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      borderTop: `4px solid ${color}`,
      transition: 'transform 0.2s',
    }}
      onMouseOver={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
      }}
      onMouseOut={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      <h2 style={{ color, marginBottom: '10px' }}>{emoji} {title}</h2>
      {content}
    </div>
  );
}
