// Panier
let cart = [];
let allProducts = [];
let currentCategory = 'all';
let currentPage = 1;
let itemsPerPage = 10;
let filteredProducts = [];
let productQuantities = {};

// Charger les produits au démarrage
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    setupCartModal();
    setupMobileMenu();
});

// Charger les produits depuis l'API
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        allProducts = await response.json();
        displayProducts(allProducts);
    } catch (error) {
        console.error('Erreur lors du chargement des produits:', error);
    }
}

// Filtrer par catégorie
function filterCategory(category) {
    currentCategory = category;
    const buttons = document.querySelectorAll('.category-item');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    if (category === 'all') {
        displayProducts(allProducts);
        buttons[0].classList.add('active');
    } else {
        const filtered = allProducts.filter(p => p.category === category);
        displayProducts(filtered);
        event.target.classList.add('active');
    }
}

// Filtrer par texte (barre de recherche côté barre latérale)
function performSidebarSearch() {
    const q = document.getElementById('sidebarSearchInput').value.trim().toLowerCase();
    if (!q) {
        // si vide, revenir à la catégorie en cours
        if (currentCategory === 'all') {
            displayProducts(allProducts);
        } else {
            filterCategory(currentCategory);
        }
        return;
    }

    const filtered = allProducts.filter(p => {
        return (
            String(p.name).toLowerCase().includes(q) ||
            String(p.description).toLowerCase().includes(q) ||
            String(p.category).toLowerCase().includes(q)
        );
    });

    // Ajouter les sélecteurs de quantité
    setTimeout(() => {
        addQuantitySelectorToCards();
    }, 0);

    displayProducts(filtered);
// Ajouter sélecteur de quantité aux cartes
function addQuantitySelectorToCards() {
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => {
        const footer = card.querySelector('.product-footer');
        if (footer && !footer.querySelector('.quantity-selector-card')) {
            const priceSpan = footer.querySelector('.product-price');
            const button = footer.querySelector('.btn');
            
            // Créer le sélecteur de quantité
            const selector = document.createElement('div');
            selector.className = 'quantity-selector-card';
            selector.innerHTML = `
                <button class="qty-btn" onclick="decreaseQtyCard(this)">−</button>
                <span class="qty-value">1</span>
                <button class="qty-btn" onclick="increaseQtyCard(this)">+</button>
            `;
            
            // Insérer avant le bouton
            footer.insertBefore(selector, button);
            
            // Modifier le bouton pour utiliser la quantité sélectionnée
            button.onclick = (e) => {
                e.preventDefault();
                const qty = parseInt(selector.querySelector('.qty-value').textContent);
                for (let i = 0; i < qty; i++) {
                    addToCart(parseInt(card.querySelector('.product-link').href.split('/').pop()), 
                             card.querySelector('.product-name').textContent, 
                             parseInt(card.querySelector('.product-price').textContent));
                }
                selector.querySelector('.qty-value').textContent = '1';
                showNotification(`${qty}x ${card.querySelector('.product-name').textContent} ajoutés au panier!`);
            };
        }
    });
}

// Augmenter quantité sur carte
function increaseQtyCard(btn) {
    const qty = btn.parentElement.querySelector('.qty-value');
    qty.textContent = parseInt(qty.textContent) + 1;
}

// Diminuer quantité sur carte
function decreaseQtyCard(btn) {
    const qty = btn.parentElement.querySelector('.qty-value');
    const current = parseInt(qty.textContent);
    if (current > 1) {
        qty.textContent = current - 1;
    }
}
}

// Afficher les produits avec pagination
function displayProducts(products) {
    filteredProducts = products;
    currentPage = 1;
    renderProductsPage();
}

// Afficher une page de produits
function renderProductsPage() {
    const productsGrid = document.getElementById('productsGrid');
    productsGrid.innerHTML = '';

    if (filteredProducts.length === 0) {
        productsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">Aucun produit trouvé</p>';
        renderPagination();
        return;
    }

    // Calculer les indices pour la page actuelle
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageProducts = filteredProducts.slice(startIndex, endIndex);

    pageProducts.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <a href="/product/${product.id}" class="product-link">
                <img src="${product.image}" alt="${product.name}" class="product-image">
                <div class="product-info">
                    <div class="product-category">${product.category}</div>
                    <h3 class="product-name">${product.name}</h3>
                </div>
            </a>
            <div class="product-footer">
                <span class="product-price">${product.price} FCFA</span>
                <button class="btn" onclick="addToCart(${product.id}, '${product.name}', ${product.price})">
                    Ajouter
                </button>
            </div>
        `;
        productsGrid.appendChild(productCard);
    });

    renderPagination();
}

// Afficher les boutons de pagination
function renderPagination() {
    const paginationContainer = document.getElementById('paginationContainer');
    paginationContainer.innerHTML = '';

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    if (totalPages <= 1) return;

    // Bouton << première page
    const firstBtn = document.createElement('button');
    firstBtn.className = 'pagination-btn';
    firstBtn.textContent = '«';
    firstBtn.disabled = currentPage === 1;
    firstBtn.addEventListener('click', () => goToPage(1));
    paginationContainer.appendChild(firstBtn);

    // Bouton < page précédente
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.textContent = '‹';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => goToPage(currentPage - 1));
    paginationContainer.appendChild(prevBtn);

    // Numéros de page
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = 'pagination-btn';
        if (i === currentPage) pageBtn.classList.add('active');
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => goToPage(i));
        paginationContainer.appendChild(pageBtn);
    }

    // Bouton > page suivante
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.textContent = '›';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => goToPage(currentPage + 1));
    paginationContainer.appendChild(nextBtn);

    // Bouton >> dernière page
    const lastBtn = document.createElement('button');
    lastBtn.className = 'pagination-btn';
    lastBtn.textContent = '»';
    lastBtn.disabled = currentPage === totalPages;
    lastBtn.addEventListener('click', () => goToPage(totalPages));
    paginationContainer.appendChild(lastBtn);
}

// Aller à une page spécifique
function goToPage(pageNum) {
    currentPage = pageNum;
    renderProductsPage();
    // Scroller vers le haut des produits
    document.getElementById('productsGrid').scrollIntoView({ behavior: 'smooth' });
}

// Ajouter au panier
function addToCart(id, name, price) {
    const existingItem = cart.find(item => item.id === id);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ id, name, price, quantity: 1 });
    }

    updateCartCount();
    showNotification(`${name} ajouté au panier!`);
}

// Mettre à jour le compteur du panier
function updateCartCount() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    document.querySelector('.cart-count').textContent = count;
}

// Afficher une notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #667eea;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 2000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 2000);
}

// Configurer le modal du panier
function setupCartModal() {
    const modal = document.getElementById('cartModal');
    const cartBtn = document.querySelector('.btn-cart');
    const closeBtn = document.querySelector('.close');
    const checkoutBtn = document.getElementById('checkoutBtn');

    cartBtn.addEventListener('click', () => {
        displayCart();
        modal.style.display = 'block';
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    checkoutBtn.addEventListener('click', checkout);
}

// Afficher le contenu du panier
function displayCart() {
    const cartItems = document.getElementById('cartItems');
    const totalPrice = document.getElementById('totalPrice');

    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Votre panier est vide</p>';
        totalPrice.textContent = '0';
        return;
    }

    let total = 0;
    cartItems.innerHTML = '';

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-quantity">
                    <button onclick="decreaseQuantity(${index})">−</button>
                    <span>${item.quantity}</span>
                    <button onclick="increaseQuantity(${index})">+</button>
                </div>
            </div>
            <div class="cart-item-price">${itemTotal} FCFA</div>
            <button class="cart-item-remove" onclick="removeFromCart(${index})">Supprimer</button>
        `;
        cartItems.appendChild(cartItem);
    });

    totalPrice.textContent = total;
}

// Augmenter la quantité
function increaseQuantity(index) {
    cart[index].quantity++;
    displayCart();
    updateCartCount();
}

// Diminuer la quantité
function decreaseQuantity(index) {
    if (cart[index].quantity > 1) {
        cart[index].quantity--;
    } else {
        removeFromCart(index);
    }
    displayCart();
    updateCartCount();
}

// Supprimer du panier
function removeFromCart(index) {
    cart.splice(index, 1);
    displayCart();
    updateCartCount();
}

// Valider la commande
async function checkout() {
    if (cart.length === 0) {
        showNotification('Votre panier est vide!');
        return;
    }

    try {
        const response = await fetch('/api/whatsapp-link', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ items: cart })
        });

        const data = await response.json();

        if (data.url) {
            // Ouvrir WhatsApp
            window.open(data.url, '_blank');
            
            // Vider le panier
            cart = [];
            updateCartCount();
            document.getElementById('cartModal').style.display = 'none';
            showNotification('Commande envoyée via WhatsApp!');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de la commande');
    }
}

// Animation CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// Setup mobile menu
function setupMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuBackdrop = document.getElementById('mobileMenuBackdrop');
    const mobileMenuClose = document.querySelector('.mobile-menu-close');
    const mobileMenuLinks = document.querySelectorAll('.mobile-menu-nav a');

    // Open menu
    hamburger.addEventListener('click', () => {
        mobileMenu.classList.add('active');
        mobileMenuBackdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    // Close menu
    function closeMenu() {
        mobileMenu.classList.remove('active');
        mobileMenuBackdrop.classList.remove('active');
        document.body.style.overflow = '';
    }

    mobileMenuClose.addEventListener('click', closeMenu);
    mobileMenuBackdrop.addEventListener('click', closeMenu);

    // Close menu when link is clicked
    mobileMenuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            // If it's an anchor for JS filtering (href="#"), prevent default and filter
            if (href === '#') {
                e.preventDefault();
                closeMenu();
                const text = link.textContent.trim();
                if (text === 'Tous les Produits') {
                    filterCategory('all');
                } else {
                    filterCategory(text);
                }
            } else {
                // allow navigation for real links (e.g. /about), close menu first
                closeMenu();
                // default action will navigate
            }
        });
    });
}
