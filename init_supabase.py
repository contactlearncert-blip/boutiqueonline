#!/usr/bin/env python3
"""
Script pour initialiser les produits dans Supabase
"""

import os
import json
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_KEY')

supabase = create_client(supabase_url, supabase_key)

# Charger les produits depuis products.json
with open('backend/products.json', 'r', encoding='utf-8') as f:
    products = json.load(f)

print("Initialisation de la table products dans Supabase...")

try:
    # Vérifier si la table existe et a des données
    existing = supabase.table('products').select('*').execute()
    if existing.data:
        print(f"✓ {len(existing.data)} produits trouvés dans Supabase")
    else:
        print("Table vide, ajout des produits...")
        for product in products:
            supabase.table('products').insert({
                'id': product['id'],
                'name': product['name'],
                'price': product['price'],
                'description': product['description'],
                'image': product['image'],
                'category': product['category']
            }).execute()
        print(f"✓ {len(products)} produits ajoutés avec succès")
        
except Exception as e:
    print(f"✗ Erreur: {e}")
    print("\nAssurez-vous que:")
    print("1. Une table 'products' existe dans Supabase")
    print("2. Les colonnes: id, name, price, description, image, category")
    print("3. L'authentification est correcte")
