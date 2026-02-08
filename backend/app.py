from flask import Flask, render_template, jsonify, request, url_for
import json
from urllib.parse import quote
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Initialiser le client Supabase
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

# Charger les produits depuis Supabase ou JSON (fallback)
def load_products():
    try:
        # Essayer de charger depuis Supabase
        response = supabase.table('products').select('*').execute()
        if response.data:
            return response.data
    except Exception as e:
        print(f"Erreur Supabase: {e}")
        # Fallback: charger depuis JSON
        pass
    
    # Fallback: charger depuis JSON
    try:
        with open('products.json', 'r', encoding='utf-8') as f:
            products = json.load(f)
            # Charger dans Supabase si vide
            if not supabase.table('products').select('*').execute().data:
                for product in products:
                    supabase.table('products').insert({
                        'id': product['id'],
                        'name': product['name'],
                        'price': product['price'],
                        'description': product['description'],
                        'image': product['image'],
                        'category': product['category']
                    }).execute()
            return products
    except:
        return []

# Route pour la page d'accueil
@app.route('/')
def index():
    products = load_products()
    return render_template('index.html', products=products)

# Route pour la page détail d'un produit
@app.route('/product/<int:product_id>')
def product_detail(product_id):
    products = load_products()
    product = next((p for p in products if p['id'] == product_id), None)
    if product:
        return render_template('product_detail.html', product=product)
    return "Produit non trouvé", 404


@app.route('/about')
def about():
    return render_template('about.html')

# API pour obtenir tous les produits
@app.route('/api/products')
def get_products():
    products = load_products()
    return jsonify(products)

# API pour obtenir un produit spécifique
@app.route('/api/product/<int:product_id>')
def get_product(product_id):
    products = load_products()
    product = next((p for p in products if p['id'] == product_id), None)
    if product:
        return jsonify(product)
    return jsonify({'error': 'Produit non trouvé'}), 404

# Générer le lien WhatsApp
@app.route('/api/whatsapp-link', methods=['POST'])
def whatsapp_link():
    data = request.json
    phone = "221764536464"  # Remplace par ton numéro WhatsApp
    
    # Construire le message
    message = f"Bonjour, je voudrais commander:\n\n"
    total = 0
    
    for item in data.get('items', []):
        product_id = item['id']
        quantity = item['quantity']
        products = load_products()
        product = next((p for p in products if p['id'] == product_id), None)
        
        if product:
            price = product['price'] * quantity
            total += price
            message += f"- {product['name']} x{quantity} = {price} FCFA\n"
            # ajouter l'URL de l'image (résolue en URL absolue si nécessaire)
            img = product.get('image', '')
            if img:
                if img.startswith('http'):
                    img_url = img
                else:
                    try:
                        img_url = url_for('static', filename=img, _external=True)
                    except Exception:
                        img_url = request.host_url.rstrip('/') + '/' + img.lstrip('/')
                message += f"Image: {img_url}\n"
    
    message += f"\nTotal: {total} FCFA"
    
    # Créer le lien WhatsApp
    whatsapp_url = f"https://wa.me/{phone}?text={quote(message)}"
    
    return jsonify({'url': whatsapp_url})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
