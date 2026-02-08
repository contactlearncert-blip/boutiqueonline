#  Boutique Online

Un site web de boutique en ligne moderne permettant de consulter des produits et commander via WhatsApp.

## Fonctionnalités

- Interface responsive et moderne
- Panier d'achat fonctionnel
- Affichage des produits avec détails
- Intégration WhatsApp pour les commandes
- Calcul automatique du total

## Prérequis

- Python 3.8+
- pip (gestionnaire de paquets Python)

## Installation

1. **Cloner ou extraire le projet**
   ```bash
   cd c:\Users\HP\Desktop\Boutiqueonline
   ```

2. **Créer un environnement virtuel** (optionnel mais recommandé)
   ```bash
   python -m venv venv
   venv\Scripts\activate
   ```

3. **Installer les dépendances**
   ```bash
   pip install -r requirements.txt
   ```

##  Lancer l'application

```bash
python backend/app.py
```

Ouvrir votre navigateur et aller à: **http://localhost:5000**

##  Configuration

### Modifier le numéro WhatsApp

Dans [backend/app.py](backend/app.py), ligne 37, remplace:
```python
phone = "221764536464"  # Mets ton numéro WhatsApp ici
```

### Ajouter des produits

Modifie [backend/products.json](backend/products.json) pour ajouter/modifier les produits.

## Structure du Projet

```
Boutiqueonline/
├── backend/
│   ├── app.py                 # Application Flask
│   ├── products.json          # Base de données des produits
│   ├── templates/
│   │   └── index.html         # Page principale
│   └── static/
│       ├── css/
│       │   └── style.css      # Styles
│       └── js/
│           └── script.js      # Logique frontend
├── requirements.txt           # Dépendances Python
└── README.md                  # Ce fichier
```

## Comment ça marche

1. Les produits sont affichés depuis `products.json`
2. L'utilisateur ajoute des articles au panier
3. En cliquant sur "Commander", un message WhatsApp est généré
4. Le lien WhatsApp ouvre la conversation avec le numéro configuré

## Customisation

- Modifie les couleurs dans [backend/static/css/style.css](backend/static/css/style.css)
- Ajoute ton logo dans le header
- Personnalise le message WhatsApp dans [backend/app.py](backend/app.py)

## Support

Pour les questions ou problèmes, vérifie:
- Que Flask est bien installé
- Que le port 5000 est disponible
- Que ton numéro WhatsApp est valide (avec le code pays)

---

Made with by Boutique Online Team
