/**
 * Boutique Online - Script Principal
 * Version: 2.0
 * Description: Gestion du panier, filtrage produits, pagination et interactions
 */

// ========================================
// CONFIGURATION & VARIABLES GLOBALES
// ========================================

// Constantes de configuration
const CONFIG = {
    API_PRODUCTS: '/api/products',
    API_WHATSAPP: '/api/whatsapp-link',
    ITEMS_PER_PAGE: 10,
    NOTIFICATION_DURATION: 3000,
    CART_STORAGE_KEY: 'boutique_cart'
};

// État de l'application
const state = {
    cart: [],
    allProducts: [],
    filteredProducts: [],
    currentCategory: 'all',
    currentPage: 1,
    itemsPerPage: CONFIG.ITEMS_PER_PAGE,
    searchQuery: '',
    isLoading: false
};

// ========================================
// ÉVÉNEMENTS AU CHARGEMENT
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Boutique Online - Initialisation...');
    
    // Charger les données depuis localStorage
    loadCartFromStorage();
    
    // Initialiser les composants
    initializeComponents();
    
    // Charger les produits
    loadProducts();
});

// ========================================
// INITIALISATION DES COMPOSANTS
// ========================================

function initializeComponents() {
    setupCartModal();
    setupMobileMenu();
    setupSearchHandlers();
    setupAccessibility();
    setupKeyboardShortcuts();
}

// ========================================
// CHARGEMENT DES PRODUITS
// ========================================

async function loadProducts() {
    if (state.isLoading) return;
    
    state.isLoading = true;
    showLoadingState(true);
    
    try {
        const response = await fetch(CONFIG.API_PRODUCTS, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const products = await response.json();
        
        if (!Array.isArray(products)) {
            throw new Error('Invalid products data format');
        }
        
        state.allProducts = products;
        state.filteredProducts = products;
        
        console.log(`✅ ${products.length} produits chargés`);
        
        // Afficher les produits
        renderProductsPage();
        
        // Mettre à jour le compteur du panier
        updateCartCount();
        
    } catch (error) {
        console.error('❌ Erreur lors du chargement des produits:', error);
        showErrorNotification('Impossible de charger les produits. Veuillez réessayer.');
        
        // Afficher un message d'erreur dans l'interface
        const productsGrid = document.getElementById('productsGrid');
        if (productsGrid) {
            productsGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                    <p style="color: #dc3545; font-size: 18px; margin-bottom: 10px;">
                        <strong>Erreur de chargement</strong>
                    </p>
                    <p style="color: #666;">
                        Impossible de charger les produits. Veuillez réessayer plus tard.
                    </p>
                </div>
            `;
        }
    } finally {
        state.isLoading = false;
        showLoadingState(false);
    }
}

// ========================================
// FILTRAGE PAR CATÉGORIE
// ========================================

function filterCategory(category) {
    state.currentCategory = category;
    state.currentPage = 1;
    state.searchQuery = '';
    
    // Mettre à jour l'interface des boutons de catégorie
    updateCategoryButtons();
    
    // Filtrer les produits
    if (category === 'all') {
        state.filteredProducts = [...state.allProducts];
    } else {
        state.filteredProducts = state.allProducts.filter(p => 
            p.category && p.category.toLowerCase() === category.toLowerCase()
        );
    }
    
    // Afficher les produits filtrés
    renderProductsPage();
    
    // Scroller vers le haut
    scrollToTop();
}

function updateCategoryButtons() {
    const buttons = document.querySelectorAll('.category-nav li, .mobile-menu-nav li');
    
    buttons.forEach(btn => {
        const isActive = btn.textContent.trim().toLowerCase() === 
                        (state.currentCategory === 'all' ? 'tous les produits' : state.currentCategory.toLowerCase());
        
        if (isActive) {
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
        } else {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
        }
    });
}

// ========================================
// RECHERCHE DE PRODUITS
// ========================================

function performSidebarSearch() {
    const input = document.getElementById('sidebarSearchInput');
    if (!input) return;
    
    const query = input.value.trim().toLowerCase();
    state.searchQuery = query;
    state.currentPage = 1;
    
    if (!query) {
        // Si la recherche est vide, revenir au filtrage par catégorie
        if (state.currentCategory === 'all') {
            state.filteredProducts = [...state.allProducts];
        } else {
            filterCategory(state.currentCategory);
        }
        return;
    }
    
    // Filtrer les produits par recherche
    state.filteredProducts = state.allProducts.filter(product => {
        const nameMatch = product.name && product.name.toLowerCase().includes(query);
        const descMatch = product.description && product.description.toLowerCase().includes(query);
        const categoryMatch = product.category && product.category.toLowerCase().includes(query);
        
        return nameMatch || descMatch || categoryMatch;
    });
    
    // Afficher les résultats
    renderProductsPage();
    
    // Scroller vers le haut
    scrollToTop();
}

// ========================================
// AFFICHAGE DES PRODUITS
// ========================================

function renderProductsPage() {
    const productsGrid = document.getElementById('productsGrid');
    const paginationContainer = document.getElementById('paginationContainer');
    
    if (!productsGrid) return;
    
    // Calculer les indices pour la pagination
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const endIndex = startIndex + state.itemsPerPage;
    const pageProducts = state.filteredProducts.slice(startIndex, endIndex);
    
    // Afficher le message approprié
    if (state.filteredProducts.length === 0) {
        productsGrid.innerHTML = `
            <p id="emptyMessage" style="grid-column: 1/-1; text-align: center; color: #999; padding: 40px;">
                Aucun produit trouvé
            </p>
        `;
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }
    
    // Générer les cartes de produits
    productsGrid.innerHTML = pageProducts.map(product => createProductCard(product)).join('');
    
    // Ajouter les sélecteurs de quantité
    addQuantitySelectors();
    
    // Rendre la pagination
    renderPagination();
    
    // Annoncer le changement pour les lecteurs d'écran
    announcePageChange();
}

function createProductCard(product) {
    return `
        <div class="product-card" role="article" aria-label="${product.name}">
            <a href="/product/${product.id}" class="product-link" tabindex="0">
                <img src="${product.image}" alt="${product.name}" class="product-image" loading="lazy">
                <div class="product-info">
                    <div class="product-category" aria-hidden="true">${product.category || 'Produit'}</div>
                    <h3 class="product-name">${product.name}</h3>
                </div>
            </a>
            <div class="product-footer">
                <span class="product-price" aria-label="Prix ${product.price} FCFA">${product.price} FCFA</span>
                <button class="btn" 
                    onclick="addToCart(${product.id}, '${escapeHtml(product.name)}', ${product.price})"
                    aria-label="Ajouter ${product.name} au panier">
                    Ajouter
                </button>
            </div>
        </div>
    `;
}

// ========================================
// SÉLECTEURS DE QUANTITÉ
// ========================================

function addQuantitySelectors() {
    const cards = document.querySelectorAll('.product-card');
    
    cards.forEach(card => {
        const footer = card.querySelector('.product-footer');
        if (!footer || footer.querySelector('.quantity-selector-card')) return;
        
        const button = footer.querySelector('.btn');
        if (!button) return;
        
        // Créer le sélecteur de quantité
        const selector = document.createElement('div');
        selector.className = 'quantity-selector-card';
        selector.setAttribute('role', 'group');
        selector.setAttribute('aria-label', 'Sélection de la quantité');
        selector.innerHTML = `
            <button class="qty-btn" 
                onclick="decreaseQtyCard(this)" 
                aria-label="Diminuer la quantité"
                aria-controls="qty-${card.dataset.productId || Date.now()}">
                −
            </button>
            <span class="qty-value" id="qty-${card.dataset.productId || Date.now()}">1</span>
            <button class="qty-btn" 
                onclick="increaseQtyCard(this)" 
                aria-label="Augmenter la quantité"
                aria-controls="qty-${card.dataset.productId || Date.now()}">
                +
            </button>
        `;
        
        // Insérer avant le bouton
        footer.insertBefore(selector, button);
        
        // Modifier le comportement du bouton pour utiliser la quantité
        button.onclick = (e) => {
            e.preventDefault();
            handleAddToCartWithQuantity(card, selector);
        };
    });
}

function increaseQtyCard(btn) {
    const qtyElement = btn.parentElement.querySelector('.qty-value');
    let currentQty = parseInt(qtyElement.textContent);
    qtyElement.textContent = currentQty + 1;
    
    // Annoncer le changement pour les lecteurs d'écran
    announceQuantityChange(currentQty + 1);
}

function decreaseQtyCard(btn) {
    const qtyElement = btn.parentElement.querySelector('.qty-value');
    let currentQty = parseInt(qtyElement.textContent);
    
    if (currentQty > 1) {
        qtyElement.textContent = currentQty - 1;
        announceQuantityChange(currentQty - 1);
    }
}

function handleAddToCartWithQuantity(card, selector) {
    const qty = parseInt(selector.querySelector('.qty-value').textContent);
    const productId = parseInt(card.querySelector('.product-link').href.split('/').pop());
    const productName = card.querySelector('.product-name').textContent;
    const productPrice = parseInt(card.querySelector('.product-price').textContent.replace(' FCFA', ''));
    
    // Ajouter au panier
    for (let i = 0; i < qty; i++) {
        addToCart(productId, productName, productPrice);
    }
    
    // Réinitialiser la quantité
    selector.querySelector('.qty-value').textContent = '1';
    
    // Afficher la notification
    showNotification(`${qty}x ${productName} ajouté${qty > 1 ? 's' : ''} au panier!`, 'success');
}

// ========================================
// PAGINATION
// ========================================

function renderPagination() {
    const paginationContainer = document.getElementById('paginationContainer');
    if (!paginationContainer) return;
    
    const totalPages = Math.ceil(state.filteredProducts.length / state.itemsPerPage);
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    paginationContainer.innerHTML = '';
    paginationContainer.setAttribute('aria-label', `Pagination - Page ${state.currentPage} sur ${totalPages}`);
    
    // Créer les boutons de pagination
    createPaginationButtons(paginationContainer, totalPages);
}

function createPaginationButtons(container, totalPages) {
    // Bouton première page
    createPageButton(container, '«', 1, state.currentPage === 1);
    
    // Bouton page précédente
    createPageButton(container, '‹', state.currentPage - 1, state.currentPage === 1);
    
    // Numéros de page
    renderPageNumbers(container, totalPages);
    
    // Bouton page suivante
    createPageButton(container, '›', state.currentPage + 1, state.currentPage === totalPages);
    
    // Bouton dernière page
    createPageButton(container, '»', totalPages, state.currentPage === totalPages);
}

function createPageButton(container, text, pageNumber, disabled) {
    const button = document.createElement('button');
    button.className = 'pagination-btn';
    button.textContent = text;
    button.disabled = disabled;
    button.setAttribute('aria-label', 
        text === '«' ? 'Première page' :
        text === '‹' ? 'Page précédente' :
        text === '›' ? 'Page suivante' :
        text === '»' ? 'Dernière page' :
        `Page ${pageNumber}`
    );
    
    if (!disabled && pageNumber >= 1 && pageNumber <= Math.ceil(state.filteredProducts.length / state.itemsPerPage)) {
        button.addEventListener('click', () => goToPage(pageNumber));
    }
    
    if (pageNumber === state.currentPage) {
        button.classList.add('active');
        button.setAttribute('aria-current', 'page');
    }
    
    container.appendChild(button);
}

function renderPageNumbers(container, totalPages) {
    const maxVisible = 5;
    let start = Math.max(1, state.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
        createPageButton(container, i.toString(), i, false);
    }
}

function goToPage(page) {
    const totalPages = Math.ceil(state.filteredProducts.length / state.itemsPerPage);
    
    if (page < 1 || page > totalPages || page === state.currentPage) return;
    
    state.currentPage = page;
    renderProductsPage();
    
    // Scroller vers les produits
    const productsGrid = document.getElementById('productsGrid');
    if (productsGrid) {
        productsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ========================================
// GESTION DU PANIER
// ========================================

function addToCart(id, name, price) {
    // Trouver l'article existant
    const existingItem = state.cart.find(item => item.id === id);
    
    if (existingItem) {
        existingItem.quantity++;
    } else {
        state.cart.push({
            id,
            name,
            price,
            quantity: 1
        });
    }
    
    // Sauvegarder dans localStorage
    saveCartToStorage();
    
    // Mettre à jour l'interface
    updateCartCount();
    
    // Afficher la notification
    showNotification(`${name} ajouté au panier!`, 'success');
}

function updateCartCount() {
    const count = state.cart.reduce((total, item) => total + item.quantity, 0);
    const cartCountElements = document.querySelectorAll('.cart-count, #cartCountBadge');
    
    cartCountElements.forEach(element => {
        if (element) {
            element.textContent = count;
            element.setAttribute('aria-label', `${count} article${count > 1 ? 's' : ''} dans le panier`);
            
            // Animation si le compteur change
            if (count > 0) {
                element.style.animation = 'none';
                setTimeout(() => {
                    element.style.animation = 'pulse 2s infinite';
                }, 10);
            }
        }
    });
}

// ========================================
// MODAL DU PANIER
// ========================================

function setupCartModal() {
    const modal = document.getElementById('cartModal');
    const cartBtn = document.querySelector('.btn-cart');
    const closeBtn = document.querySelector('.close, .modal .close');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    if (!modal || !cartBtn) return;
    
    // Ouvrir le modal
    cartBtn.addEventListener('click', () => {
        displayCart();
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
        
        // Focus sur le premier élément focusable
        setTimeout(() => {
            const firstFocusable = modal.querySelector('button:not([disabled])');
            if (firstFocusable) firstFocusable.focus();
        }, 100);
    });
    
    // Fermer le modal
    if (closeBtn) {
        closeBtn.addEventListener('click', closeCartModal);
    }
    
    // Fermer en cliquant à l'extérieur
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeCartModal();
        }
    });
    
    // Gérer l'événement checkout
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', checkout);
    }
    
    // Fermer avec la touche Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closeCartModal();
        }
    });
}

function closeCartModal() {
    const modal = document.getElementById('cartModal');
    if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
    }
}

function displayCart() {
    const cartItems = document.getElementById('cartItems');
    const totalPrice = document.getElementById('totalPrice');
    
    if (!cartItems || !totalPrice) return;
    
    if (state.cart.length === 0) {
        cartItems.innerHTML = `
            <p style="text-align: center; color: #999; padding: 40px; grid-column: 1/-1;">
                Votre panier est vide
            </p>
        `;
        totalPrice.textContent = '0';
        return;
    }
    
    let total = 0;
    let html = '';
    
    state.cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        html += `
            <div class="cart-item" role="listitem">
                <div class="cart-item-info">
                    <div class="cart-item-name" aria-label="Produit: ${item.name}">${item.name}</div>
                    <div class="cart-item-quantity" role="group" aria-label="Quantité">
                        <button 
                            onclick="decreaseQuantity(${index})" 
                            aria-label="Diminuer la quantité de ${item.name}"
                            ${item.quantity <= 1 ? 'disabled' : ''}>
                            −
                        </button>
                        <span aria-live="polite">${item.quantity}</span>
                        <button 
                            onclick="increaseQuantity(${index})" 
                            aria-label="Augmenter la quantité de ${item.name}">
                            +
                        </button>
                    </div>
                </div>
                <div class="cart-item-price" aria-label="Total: ${itemTotal} FCFA">
                    ${itemTotal} FCFA
                </div>
                <button 
                    class="cart-item-remove" 
                    onclick="removeFromCart(${index})" 
                    aria-label="Supprimer ${item.name} du panier">
                    Supprimer
                </button>
            </div>
        `;
    });
    
    cartItems.innerHTML = html;
    totalPrice.textContent = total;
}

function increaseQuantity(index) {
    if (state.cart[index]) {
        state.cart[index].quantity++;
        saveCartToStorage();
        displayCart();
        updateCartCount();
        showNotification('Quantité augmentée', 'info');
    }
}

function decreaseQuantity(index) {
    if (state.cart[index]) {
        if (state.cart[index].quantity > 1) {
            state.cart[index].quantity--;
            saveCartToStorage();
            displayCart();
            updateCartCount();
            showNotification('Quantité diminuée', 'info');
        } else {
            removeFromCart(index);
        }
    }
}

function removeFromCart(index) {
    if (index >= 0 && index < state.cart.length) {
        const removedItem = state.cart[index].name;
        state.cart.splice(index, 1);
        saveCartToStorage();
        displayCart();
        updateCartCount();
        showNotification(`${removedItem} supprimé du panier`, 'warning');
    }
}

// ========================================
// COMMANDE VIA WHATSAPP
// ========================================

async function checkout() {
    if (state.cart.length === 0) {
        showNotification('Votre panier est vide!', 'warning');
        return;
    }
    
    // Afficher l'état de chargement
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.disabled = true;
        checkoutBtn.classList.add('loading-btn');
    }
    
    try {
        const response = await fetch(CONFIG.API_WHATSAPP, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ items: state.cart }),
            signal: AbortSignal.timeout(10000) // Timeout après 10s
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.url) {
            // Ouvrir WhatsApp
            window.open(data.url, '_blank', 'noopener,noreferrer');
            
            // Vider le panier
            state.cart = [];
            saveCartToStorage();
            updateCartCount();
            
            // Fermer le modal
            closeCartModal();
            
            // Afficher la notification
            showNotification('Commande envoyée via WhatsApp! 📱', 'success');
        } else {
            throw new Error('URL WhatsApp non générée');
        }
    } catch (error) {
        console.error('❌ Erreur lors de la commande:', error);
        
        if (error.name === 'TimeoutError') {
            showNotification('Délai dépassé. Veuillez réessayer.', 'error');
        } else {
            showNotification('Erreur lors de la commande. Veuillez réessayer.', 'error');
        }
    } finally {
        // Réactiver le bouton
        if (checkoutBtn) {
            checkoutBtn.disabled = false;
            checkoutBtn.classList.remove('loading-btn');
        }
    }
}

// ========================================
// GESTION DU LOCAL STORAGE
// ========================================

function saveCartToStorage() {
    try {
        localStorage.setItem(CONFIG.CART_STORAGE_KEY, JSON.stringify(state.cart));
    } catch (error) {
        console.warn('Impossible de sauvegarder le panier:', error);
    }
}

function loadCartFromStorage() {
    try {
        const savedCart = localStorage.getItem(CONFIG.CART_STORAGE_KEY);
        if (savedCart) {
            state.cart = JSON.parse(savedCart);
            console.log(`✅ Panier chargé depuis localStorage (${state.cart.length} articles)`);
        }
    } catch (error) {
        console.warn('Impossible de charger le panier:', error);
        state.cart = [];
    }
}

// ========================================
// NOTIFICATIONS
// ========================================

function showNotification(message, type = 'info') {
    // Supprimer les anciennes notifications
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    // Créer la notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'assertive');
    
    // Icône selon le type
    const icon = type === 'success' ? '✅' : 
                 type === 'error' ? '❌' : 
                 type === 'warning' ? '⚠️' : 'ℹ️';
    
    notification.innerHTML = `
        <span aria-hidden="true">${icon}</span>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Afficher
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Supprimer après le délai
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, CONFIG.NOTIFICATION_DURATION);
}

function showErrorNotification(message) {
    showNotification(message, 'error');
}

// ========================================
// MENU MOBILE
// ========================================

function setupMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuBackdrop = document.getElementById('mobileMenuBackdrop');
    const mobileMenuClose = document.querySelector('.mobile-menu-close');
    const mobileMenuLinks = document.querySelectorAll('.mobile-menu-nav a');
    
    if (!hamburger || !mobileMenu) return;
    
    // Ouvrir le menu
    hamburger.addEventListener('click', toggleMobileMenu);
    
    // Fermer le menu
    if (mobileMenuClose) {
        mobileMenuClose.addEventListener('click', closeMobileMenu);
    }
    
    if (mobileMenuBackdrop) {
        mobileMenuBackdrop.addEventListener('click', closeMobileMenu);
    }
    
    // Gérer les liens du menu
    mobileMenuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            handleMobileMenuLinkClick(e, link);
        });
    });
    
    // Fermer avec Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
            closeMobileMenu();
        }
    });
}

function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuBackdrop = document.getElementById('mobileMenuBackdrop');
    
    if (mobileMenu.classList.contains('active')) {
        closeMobileMenu();
    } else {
        openMobileMenu();
    }
}

function openMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuBackdrop = document.getElementById('mobileMenuBackdrop');
    
    mobileMenu.classList.add('active');
    mobileMenuBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
    mobileMenu.setAttribute('aria-hidden', 'false');
    
    // Focus sur le premier lien
    setTimeout(() => {
        const firstLink = mobileMenu.querySelector('a');
        if (firstLink) firstLink.focus();
    }, 100);
}

function closeMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuBackdrop = document.getElementById('mobileMenuBackdrop');
    
    mobileMenu.classList.remove('active');
    mobileMenuBackdrop.classList.remove('active');
    document.body.style.overflow = '';
    mobileMenu.setAttribute('aria-hidden', 'true');
    
    // Focus sur le hamburger
    const hamburger = document.querySelector('.hamburger');
    if (hamburger) hamburger.focus();
}

function handleMobileMenuLinkClick(e, link) {
    const href = link.getAttribute('href');
    
    if (href === '#') {
        e.preventDefault();
        const text = link.textContent.trim();
        
        // Fermer le menu
        closeMobileMenu();
        
        // Appliquer le filtre
        if (text === 'Tous les Produits') {
            filterCategory('all');
        } else {
            filterCategory(text);
        }
    } else {
        // Laisser la navigation se faire, mais fermer le menu d'abord
        closeMobileMenu();
    }
}

// ========================================
// ACCESSIBILITÉ
// ========================================

function setupAccessibility() {
    // Ajouter des attributs ARIA
    addAriaAttributes();
    
    // Gérer le focus trap pour les modales
    setupFocusTrap();
}

function addAriaAttributes() {
    const cartBtn = document.querySelector('.btn-cart');
    if (cartBtn) {
        cartBtn.setAttribute('aria-haspopup', 'dialog');
    }
    
    const searchInputs = document.querySelectorAll('.search-input');
    searchInputs.forEach(input => {
        input.setAttribute('aria-label', 'Rechercher des produits');
    });
}

function setupFocusTrap() {
    document.addEventListener('keydown', (e) => {
        const modal = document.getElementById('cartModal');
        
        if (modal && modal.style.display === 'flex' && e.key === 'Tab') {
            const focusableElements = modal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            
            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    });
}

// ========================================
// RACCOURCIS CLAVIER
// ========================================

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // 'c' pour ouvrir le panier
        if (e.key === 'c' && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
            const cartBtn = document.querySelector('.btn-cart');
            if (cartBtn) cartBtn.click();
        }
        
        // '/' pour focus sur la recherche
        if (e.key === '/' && !e.ctrlKey && !e.altKey && !e.metaKey) {
            e.preventDefault();
            const searchInput = document.querySelector('.search-input');
            if (searchInput) searchInput.focus();
        }
    });
}

// ========================================
// UTILITAIRES
// ========================================

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function showLoadingState(show) {
    // À implémenter selon vos besoins
}

function announcePageChange() {
    // Créer un élément aria-live pour annoncer le changement
    const announcer = document.getElementById('aria-announcer');
    if (!announcer) {
        const newAnnouncer = document.createElement('div');
        newAnnouncer.id = 'aria-announcer';
        newAnnouncer.setAttribute('aria-live', 'polite');
        newAnnouncer.setAttribute('aria-atomic', 'true');
        newAnnouncer.style.position = 'absolute';
        newAnnouncer.style.width = '1px';
        newAnnouncer.style.height = '1px';
        newAnnouncer.style.overflow = 'hidden';
        document.body.appendChild(newAnnouncer);
    }
    
    setTimeout(() => {
        const pageAnnouncer = document.getElementById('aria-announcer');
        if (pageAnnouncer) {
            pageAnnouncer.textContent = `Page ${state.currentPage}, ${state.filteredProducts.length} produits affichés`;
        }
    }, 100);
}

function announceQuantityChange(quantity) {
    const announcer = document.getElementById('aria-announcer');
    if (announcer) {
        announcer.textContent = `Quantité: ${quantity}`;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ========================================
// EXPORT POUR LES AUTRES PAGES
// ========================================

// Rendre les fonctions accessibles globalement si nécessaire
window.addToCart = addToCart;
window.filterCategory = filterCategory;
window.performSidebarSearch = performSidebarSearch;
window.updateCartCount = updateCartCount;

console.log('✅ Script initialisé avec succès');