from flask import Flask, render_template, jsonify, request, url_for
import json
from urllib.parse import quote
from supabase import create_client
import os

# Configuration universelle (fonctionne partout)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, 'templates'),
    static_folder=os.path.join(BASE_DIR, 'static'),
    static_url_path="/static"
)

print(f"BASE_DIR: {BASE_DIR}")
print(f"Templates folder: {app.template_folder}")
print(f"Static folder: {app.static_folder}")

# Initialiser Supabase
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_ANON_KEY')

print(f"\n--- Configuration Supabase ---")
if supabase_url:
    print(f"SUPABASE_URL: {supabase_url}")
else:
    print("SUPABASE_URL: NON DEFINI")

if supabase_key:
    print(f"SUPABASE_ANON_KEY: {supabase_key[:10]}...")
else:
    print("SUPABASE_ANON_KEY: NON DEFINI")

supabase = None
if supabase_url and supabase_key:
    try:
        supabase = create_client(supabase_url, supabase_key)
        print("Supabase connecté avec succès")
        
        try:
            test_response = supabase.table('products').select('id').limit(1).execute()
            if hasattr(test_response, 'data'):
                print(f"Test Supabase OK - {len(test_response.data)} produit(s) trouvé(s)")
        except Exception as test_error:
            print(f"Attention: Connexion établie mais erreur de test: {test_error}")
    except Exception as e:
        print(f"Erreur initialisation Supabase: {e}")
        print(f"Utilisation du mode fallback JSON")
        supabase = None
else:
    print("Supabase non configuré - Mode fallback JSON")

# CORRECTION CRITIQUE : Fonction pour extraire les données correctement
def extract_supabase_data(response):
    """
    Extrait les données de la réponse Supabase, quelle que soit la version.
    Gère les formats : 
    - {'data': [...], 'count': X} (version 1.x)
    - [...] (version 2.x ou format direct)
    """
    if not response:
        return []
    
    # Cas 1 : réponse est déjà une liste
    if isinstance(response, list):
        return response
    
    # Cas 2 : réponse est un dict avec clé 'data'
    if isinstance(response, dict):
        if 'data' in response and isinstance(response['data'], list):
            return response['data']
        # Si c'est un dict mais pas le bon format, retourner vide
        return []
    
    # Cas 3 : réponse a un attribut 'data'
    if hasattr(response, 'data'):
        data = response.data
        if isinstance(data, list):
            return data
        if isinstance(data, dict) and 'data' in data and isinstance(data['data'], list):
            return data['data']
    
    return []

# Charger les produits depuis Supabase ou JSON
def load_products():
    if supabase is not None:
        try:
            response = supabase.table('products').select('*').execute()
            products = extract_supabase_data(response)
            
            if products:
                print(f"Chargement {len(products)} produits depuis Supabase")
                # CORRECTION : Formater les données pour le frontend
                formatted_products = []
                for p in products:
                    formatted_products.append({
                        'id': p.get('id'),
                        'name': p.get('name', 'Produit sans nom'),
                        'price': int(p.get('price', 0)),
                        'description': p.get('description', ''),
                        'image': p.get('image', 'img/placeholder.png'),
                        'category': p.get('category', 'Autres')
                    })
                return formatted_products
            else:
                print("Supabase: réponse vide ou invalide")
        except Exception as e:
            print(f"Erreur lecture Supabase: {e}")
            import traceback
            traceback.print_exc()
    
    # Fallback: charger depuis JSON
    try:
        products_file = os.path.join(BASE_DIR, 'products.json')
        print(f"Fallback: chargement depuis {products_file}")
        print(f"Fichier existe: {os.path.exists(products_file)}")
        
        if not os.path.exists(products_file):
            print(f"Fichier {products_file} non trouvé")
            return []
        
        with open(products_file, 'r', encoding='utf-8') as f:
            products = json.load(f)
            print(f"Chargement {len(products)} produits depuis JSON")
            
            if supabase is not None:
                try:
                    existing = supabase.table('products').select('*').execute()
                    existing_data = extract_supabase_data(existing)
                    
                    if not existing_data:
                        print("Importation des produits JSON vers Supabase...")
                        for product in products:
                            try:
                                supabase.table('products').insert({
                                    'name': product['name'],
                                    'price': product['price'],
                                    'description': product['description'],
                                    'image': product['image'],
                                    'category': product['category']
                                }).execute()
                            except Exception as ie:
                                print(f"Erreur insertion produit '{product.get('name')}': {ie}")
                        print("Importation terminée")
                except Exception as e:
                    print(f"Erreur vérification/import Supabase: {e}")
            
            return products
    except Exception as e:
        print(f"Erreur chargement products.json: {e}")
        import traceback
        traceback.print_exc()
        return []

# Route pour la page d'accueil
@app.route('/')
def index():
    try:
        products = load_products()
        print(f"Produits envoyés au template: {len(products)}")
        return render_template('index.html', products=products)
    except Exception as e:
        print(f"Erreur dans route /: {e}")
        import traceback
        traceback.print_exc()
        return f"Erreur: {str(e)}", 500

# Route pour la page détail d'un produit
@app.route('/product/<int:product_id>')
def product_detail(product_id):
    try:
        products = load_products()
        product = next((p for p in products if p['id'] == product_id), None)
        if product:
            return render_template('product_detail.html', product=product)
        return "Produit non trouvé", 404
    except Exception as e:
        print(f"Erreur dans route /product/{product_id}: {e}")
        return f"Erreur: {str(e)}", 500

# Route pour la page À propos
@app.route('/about')
def about():
    try:
        return render_template('about.html')
    except Exception as e:
        print(f"Erreur dans route /about: {e}")
        return f"Erreur: {str(e)}", 500

# API pour obtenir tous les produits
@app.route('/api/products')
def get_products():
    try:
        products = load_products()
        print(f"API /api/products: {len(products)} produits renvoyés")
        return jsonify(products)
    except Exception as e:
        print(f"Erreur dans API /api/products: {e}")
        return jsonify({'error': str(e)}), 500

# API pour obtenir un produit spécifique
@app.route('/api/product/<int:product_id>')
def get_product(product_id):
    try:
        products = load_products()
        product = next((p for p in products if p['id'] == product_id), None)
        if product:
            return jsonify(product)
        return jsonify({'error': 'Produit non trouvé'}), 404
    except Exception as e:
        print(f"Erreur dans API /api/product/{product_id}: {e}")
        return jsonify({'error': str(e)}), 500

# Générer le lien WhatsApp
@app.route('/api/whatsapp-link', methods=['POST'])
def whatsapp_link():
    try:
        data = request.json
        phone = "221764536464"
        
        message = "Bonjour, je voudrais commander:\n\n"
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
        
        # CORRECTION : Suppression des espaces
        whatsapp_url = f"https://wa.me/{phone}?text={quote(message)}"
        
        return jsonify({'url': whatsapp_url})
    except Exception as e:
        print(f"Erreur dans API /api/whatsapp-link: {e}")
        return jsonify({'error': str(e)}), 500

# Route de santé
@app.route('/_health')
def health():
    return jsonify({'status': 'ok'}), 200

if __name__ == '__main__':
    print("\n" + "="*60)
    print("Lancement de l'application Flask")
    print("="*60)
    app.run(host='0.0.0.0', debug=True, port=int(os.environ.get('PORT', 5000)))