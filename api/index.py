import sys
import os

# Ajouter le répertoire backend au chemin pour les imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Importer l'app Flask depuis backend/app.py
from app import app

# Vercel utilise la variable 'app' comme point d'entrée
if __name__ == '__main__':
    app.run()
