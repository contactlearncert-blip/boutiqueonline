from flask import Flask, render_template, jsonify, request, url_for
import json
from urllib.parse import quote
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

# Chemin absolu du dossier backend (là où se trouve app.py)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Chemins explicites pour templates et static
TEMPLATES_DIR = os.path.join(BASE_DIR, 'templates')
STATIC_DIR = os.path.join(BASE_DIR, 'static')

# Debug: afficher les chemins utilisés
print(f"BASE_DIR: {BASE_DIR}")
print(f"TEMPLATES_DIR: {TEMPLATES_DIR} {'[EXISTE]' if os.path.exists(TEMPLATES_DIR) else '[MANQUANT]'}")
print(f"STATIC_DIR: {STATIC_DIR} {'[EXISTE]' if os.path.exists(STATIC_DIR) else '[MANQUANT]'}")

# Création de l'application avec chemins absolus
app = Flask(
    __name__,
    template_folder=TEMPLATES_DIR,
    static_folder=STATIC_DIR,
    static_url_path='/static'
)

# Initialiser le client Supabase avec logs détaillés
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_ANON_KEY')

print(f"\n--- Configuration Supabase ---")
print(f"SUPABASE_URL: {supabase_url}")
print(f"SUPABASE_ANON_KEY: {supabase_key[:10] + '...' if supabase_key else 'None'}")

supabase = None
if supabase_url and supabase_key:
    try:
        supabase = create_client(supabase_url, supabase_key)
        print("✅ Supabase connecté avec succès")
        
        # Tester la connexion en lisant une table
        try:
            test_response = supabase.table('products').select('id').limit(1).execute()
            print(f"✅ Test connexion Supabase réussi - {len(test_response.data)} produit(s) trouvé(s)")
        except Exception as test_error:
            print(f"⚠️  Connexion Supabase établie mais erreur lors du test: {test_error}")
    except Exception as e:
        print(f"❌ Erreur initialisation Supabase: {e}")
        supabase = None
else:
    print("⚠️  Supabase credentials non définis (vérifie .env)")
    print("⚠️  Mode fallback JSON activé")

# Charger les produits depuis Supabase ou JSON (fallback)
def load_products():
    # Essayer Supabase en premier
    if supabase is not None:
        try:
            response = supabase.table('products').select('*').execute()
            if response and hasattr(response, 'data') and response.data:
                print(f"📦 Chargement {len(response.data)} produits depuis Supabase")
                return response.data
            else:
                print("⚠️  Supabase: réponse vide ou invalide")
        except Exception as e:
            print(f"❌ Erreur lecture Supabase: {e}")
    
    # Fallback: charger depuis JSON
    try:
        products_file = os.path.join(BASE_DIR, 'products.json')
        print(f"📁 Fallback: chargement depuis {products_file}")
        
        if not os.path.exists(products_file):
            print(f"⚠️  Fichier {products_file} non trouvé, création d'un fichier vide")
            empty_products = []
            with open(products_file, 'w', encoding='utf-8') as f:
                json.dump(empty_products, f, indent=2)
            return empty_products
        
        with open(products_file, 'r', encoding='utf-8') as f:
            products = json.load(f)
            print(f"📦 Chargement {len(products)} produits depuis JSON")
            
            # Si Supabase est disponible mais vide, importer les produits JSON
            if supabase is not None:
                try:
                    existing = supabase.table('products').select('*').execute()
                    if not (existing and hasattr(existing, 'data') and existing.data):
                        print("📤 Importation des produits JSON vers Supabase...")
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
                                print(f"❌ Erreur insertion produit '{product.get('name')}': {ie}")
                        print("✅ Importation terminée")
                except Exception as e:
                    print(f"❌ Erreur vérification/import Supabase: {e}")
            
            return products
    except Exception as e:
        print(f"❌ Erreur chargement products.json: {e}")
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
    
    # Correction: pas d'espaces dans l'URL WhatsApp
    whatsapp_url = f"https://wa.me/{phone}?text={quote(message)}"
    
    return jsonify({'url': whatsapp_url})

if __name__ == '__main__':
    print("\n" + "="*60)
    print("Lancement de l'application Flask")
    print(f"Dossier de travail: {os.getcwd()}")
    print(f"Fichier app.py: {__file__}")
    print(f"Templates folder: {app.template_folder}")
    print(f"Static folder: {app.static_folder}")
    print("="*60 + "\n")
    app.run(debug=True, port=5000)
# backend/app.py
if os.environ.get("VERCEL"):
    # Configuration spécifique pour Vercel
    app = Flask(
        __name__,
        template_folder="templates",
        static_folder="static",
        static_url_path="/static"
    )
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    app = Flask(
        __name__,
        template_folder=os.path.join(BASE_DIR, 'templates'),
        static_folder=os.path.join(BASE_DIR, 'static'),
        static_url_path="/static"
    )