import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';
import { colors } from './styles/colors';

// Pages (à créer)
import Home from './pages/Home';
import Expenses from './pages/Expenses';
import Periods from './pages/Periods';
import Meals from './pages/Meals';
import Reequilibrage from './pages/Reequilibrage';
import Import from './pages/Import';
import Presence from './pages/Presence';
import PresenceRestitution from './pages/PresenceRestitution';

function App() {
  return (
    <Router>
      <div style={{ minHeight: '100vh', background: colors.background }}>
        <Header />
        <div className="container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/periods" element={<Periods />} />
            <Route path="/meals" element={<Meals />} />
            <Route path="/presence" element={<Presence />} />
            <Route path="/presence-restitution" element={<PresenceRestitution />} />
            <Route path="/reequilibrage" element={<Reequilibrage />} />
            <Route path="/import" element={<Import />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

function Header() {
  const navigate = useNavigate();

  return (
    <header style={{
      background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
      color: colors.white,
      padding: '30px 20px',
      marginBottom: '30px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    }}>
      <div className="container">
        <h1>💰 ALO - Gestion des dépenses familiales</h1>
        <p>Centralise, partage et analyse tes dépenses en famille</p>

        <nav style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <NavButton onClick={() => navigate('/')}>🏠 Accueil</NavButton>
          <NavButton onClick={() => navigate('/expenses')}>💸 Dépenses</NavButton>
          <NavButton onClick={() => navigate('/periods')}>📅 Périodes</NavButton>
          <NavButton onClick={() => navigate('/meals')}>🍽️ Repas</NavButton>
          <NavButton onClick={() => navigate('/presence')}>👥 Présence</NavButton>
          <NavButton onClick={() => navigate('/presence-restitution')}>📋 Restitution</NavButton>
          <NavButton onClick={() => navigate('/reequilibrage')}>⚖️ Rééquilibrage</NavButton>
          <NavButton onClick={() => navigate('/import')}>📥 Import</NavButton>
        </nav>
      </div>
    </header>
  );
}

function NavButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 20px',
        border: 'none',
        borderRadius: '4px',
        background: colors.white,
        color: colors.primary,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.3s',
      }}
      onMouseOver={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = '#f0f0f0';
      }}
      onMouseOut={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = colors.white;
      }}
    >
      {children}
    </button>
  );
}

export default App;
