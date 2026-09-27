import React, { useRef, useState } from 'react';
import client from '../services/api';

interface GourmElonExpense {
  who: string;
  for_whom: string;
  when: string;
  what: string;
  comment: string;
}

const initialState: GourmElonExpense = {
  who: 'Loïc',
  for_whom: '',
  when: new Date().toISOString().split('T')[0],
  what: '',
  comment: '',
};

export default function Gourmelon() {
  const [expense, setExpense] = useState<GourmElonExpense>(initialState);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const whoRef = useRef<HTMLInputElement>(null);
  const forWhomRef = useRef<HTMLInputElement>(null);
  const whenRef = useRef<HTMLInputElement>(null);
  const whatRef = useRef<HTMLTextAreaElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  const fields = [
    { ref: whoRef, name: 'who', label: 'Qui' },
    { ref: forWhomRef, name: 'for_whom', label: 'Pour qui' },
    { ref: whenRef, name: 'when', label: 'Quand' },
    { ref: whatRef, name: 'what', label: 'Quoi' },
    { ref: commentRef, name: 'comment', label: 'Commentaire' },
  ];

  const handleChange = (
    field: keyof GourmElonExpense,
    value: string
  ) => {
    setExpense(prev => ({ ...prev, [field]: value }));
  };

  const handleKeyDown = (e: React.KeyboardEvent, fieldIndex: number) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const nextIndex = (fieldIndex + 1) % fields.length;
      const nextRef = fields[nextIndex].ref;
      nextRef.current?.focus();
    } else if (e.key === 'Enter' && fieldIndex === fields.length - 1) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!expense.for_whom.trim() || !expense.what.trim()) {
      setMessage('⚠️ Pour qui et Quoi sont obligatoires');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      await client.post('/gourmelon/expenses', expense);
      setMessage('✅ Dépense enregistrée !');
      setExpense(initialState);
      whoRef.current?.focus();
    } catch (err: any) {
      setMessage(`❌ Erreur : ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2>🍽️ Gourmelon</h2>
      <p style={styles.subtitle}>Saisie rapide de dépenses (TAB pour naviguer, Entrée pour valider)</p>

      <div style={styles.form}>
        {/* Qui */}
        <div style={styles.field}>
          <label>Qui:</label>
          <input
            ref={whoRef}
            type="text"
            value={expense.who}
            onChange={(e) => handleChange('who', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 0)}
            style={styles.input}
          />
        </div>

        {/* Pour qui */}
        <div style={styles.field}>
          <label>Pour qui:</label>
          <input
            ref={forWhomRef}
            type="text"
            value={expense.for_whom}
            onChange={(e) => handleChange('for_whom', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 1)}
            placeholder="Loïc, Alban, etc."
            style={styles.input}
          />
        </div>

        {/* Quand */}
        <div style={styles.field}>
          <label>Quand:</label>
          <input
            ref={whenRef}
            type="date"
            value={expense.when}
            onChange={(e) => handleChange('when', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 2)}
            style={styles.input}
          />
        </div>

        {/* Quoi */}
        <div style={styles.field}>
          <label>Quoi:</label>
          <textarea
            ref={whatRef}
            value={expense.what}
            onChange={(e) => handleChange('what', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 3)}
            placeholder="Description de la dépense"
            style={{...styles.textarea, minHeight: '60px'}}
          />
        </div>

        {/* Commentaire */}
        <div style={styles.field}>
          <label>Commentaire:</label>
          <textarea
            ref={commentRef}
            value={expense.comment}
            onChange={(e) => handleChange('comment', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 4)}
            placeholder="Notes optionnelles"
            style={{...styles.textarea, minHeight: '60px'}}
          />
        </div>

        {/* Bouton + Message */}
        <div style={styles.actions}>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '⏳ Enregistrement...' : '✅ Valider'}
          </button>
          {message && <p style={styles.message}>{message}</p>}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
  },
  subtitle: {
    fontSize: '12px',
    color: '#666',
    marginTop: '-5px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
    marginTop: '20px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '5px',
  },
  input: {
    padding: '8px 10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'sans-serif',
  },
  textarea: {
    padding: '8px 10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'sans-serif',
    resize: 'vertical' as const,
  },
  actions: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    marginTop: '10px',
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  message: {
    margin: 0,
    fontSize: '13px',
  },
};
