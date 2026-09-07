"""Parse et importe les exports CSV Fortuneo."""

import csv
import zipfile
import io
from datetime import datetime
from decimal import Decimal
from typing import List, Dict


class CsvImporter:
    """Parse les fichiers CSV Fortuneo."""

    @staticmethod
    def extract_csv_from_zip(file_content: bytes) -> str:
        """Extrait le fichier CSV depuis un ZIP Fortuneo."""
        try:
            with zipfile.ZipFile(io.BytesIO(file_content)) as zip_file:
                # Cherche le fichier CSV
                csv_files = [f for f in zip_file.namelist() if f.endswith('.csv')]
                if not csv_files:
                    raise ValueError("Aucun fichier CSV trouvé dans le ZIP")

                # Prend le premier fichier CSV
                csv_filename = csv_files[0]
                with zip_file.open(csv_filename) as csv_file:
                    # Détecte l'encodage
                    content = csv_file.read()
                    try:
                        return content.decode('utf-8-sig')
                    except UnicodeDecodeError:
                        return content.decode('iso-8859-1')
        except Exception as e:
            raise ValueError(f"Erreur extraction ZIP: {str(e)}")

    @staticmethod
    def parse_csv(content: str) -> List[Dict]:
        """Parse un fichier CSV Fortuneo.

        Format: Date opération;Date valeur;libellé;Débit;Crédit;
        """
        expenses = []

        # Détecte l'encodage (UTF-8 avec BOM ou ISO-8859-1)
        try:
            lines = content.split('\n')
        except Exception:
            return []

        if not lines:
            return []

        # Skip header
        for i, line in enumerate(lines[1:], 1):
            if not line.strip():
                continue

            try:
                parts = line.split(';')
                if len(parts) < 5:
                    continue

                date_str = parts[0].strip()
                # date_value = parts[1].strip()  # Not used
                label = parts[2].strip()
                debit_str = parts[3].strip().replace(',', '.')
                credit_str = parts[4].strip().replace(',', '.')

                # Parse la date (DD/MM/YYYY)
                try:
                    date_obj = datetime.strptime(date_str, "%d/%m/%Y").date()
                except ValueError:
                    continue

                # Détermine le montant et le type
                amount = None
                is_income = False

                # Traite les débits (peuvent être positifs ou négatifs)
                if debit_str:
                    try:
                        debit_val = float(debit_str)
                        # Débits sont des dépenses (négatif dans la logique bancaire)
                        # Stocker en positif mais marquer is_income=False
                        if debit_val != 0:
                            amount = abs(debit_val)
                            is_income = False
                    except ValueError:
                        pass

                # Traite les crédits (revenus)
                if not amount and credit_str:
                    try:
                        credit_val = float(credit_str)
                        if credit_val > 0:
                            amount = credit_val
                            is_income = True
                    except ValueError:
                        pass

                # Skip si pas de montant valide
                if amount is None or amount == 0:
                    continue

                expenses.append({
                    'date': date_obj,
                    'label': label,
                    'amount': amount,  # Already positive from above
                    'is_income': is_income,
                })

            except Exception:
                continue

        return expenses
