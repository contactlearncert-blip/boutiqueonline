/**
 * Boutique Online - Script Principal
 * Version: 2.4 (Sans compteur sur cartes produits)
 */

const CONFIG = {
    API_PRODUCTS: '/api/products',
    API_WHATSAPP: '/api/whatsapp-link',
    ITEMS_PER_PAGE: 10,
    NOTIFICATION_DURATION: 3000,
    CART_STORAGE_KEY: 'boutique_cart'
};

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

document.addEventListener('DOMContentLoaded', () => {
    console.log('Boutique Online - Initialisation...');
    
    loadCartFromStorage();
    initializeComponents();
    loadProducts();
});

function initializeComponents() {
    setupCartModal();
    setupMobileMenu();
    setupSearchHandlers();
    setupAccessibility();
}

function loadProducts() {
    if (state.isLoading) return;
    
    state.isLoading = true;
    showLoadingState(true);
    
    fetch(CONFIG.API_PRODUCTS)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            let products = data;
            
            if (data && data.data && Array.isArray(data.data)) {
                products = data.data;
            }
            else if (Array.isArray(data)) {
                products = data;
            }
            
            state.allProducts = products.map(product => ({
                id: parseInt(product.id) || 0,
                name: product.name || 'Produit sans nom',
                price: parseInt(product.price) || 0,
                description: product.description || '',
                image: product.image || 'img/placeholder.png',
                category: (product.category || 'Autres').trim().replace(/\s+/g, ' ')
            }));
            
            state.filteredProducts = [...state.allProducts];
            
            console.log(`${state.allProducts.length} produits chargés`, state.allProducts);
            
            renderProductsPage();
            updateCartCount();
        })
        .catch(error => {
            console.error('Erreur chargement produits:', error);
            showErrorNotification('Impossible de charger les produits');
            
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
        })
        .finally(() => {
            state.isLoading = false;
            showLoadingState(false);
        });
}

function filterCategory(category) {
    state.currentCategory = category;
    state.currentPage = 1;
    state.searchQuery = '';
    
    updateCategoryButtons();
    
    if (category === 'all') {
        state.filteredProducts = [...state.allProducts];
    } else {
        const normalizedCategory = category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        state.filteredProducts = state.allProducts.filter(p => {
            const productCat = (p.category || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return productCat === normalizedCategory;
        });
    }
    
    renderProductsPage();
    scrollToTop();
}

function updateCategoryButtons() {
    const buttons = document.querySelectorAll('.category-nav li, .mobile-menu-nav li');
    
    buttons.forEach(btn => {
        const btnText = btn.textContent.trim().toLowerCase();
        const isActive = state.currentCategory === 'all' 
            ? btnText === 'tous les produits' 
            : btnText === state.currentCategory.toLowerCase();
        
        if (isActive) {
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
        } else {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
        }
    });
}

function performSidebarSearch() {
    const input = document.getElementById('sidebarSearchInput');
    if (!input) return;
    
    const query = input.value.trim().toLowerCase();
    state.searchQuery = query;
    state.currentPage = 1;
    
    if (!query) {
        if (state.currentCategory === 'all') {
            state.filteredProducts = [...state.allProducts];
        } else {
            filterCategory(state.currentCategory);
        }
        return;
    }
    
    state.filteredProducts = state.allProducts.filter(product => {
        const name = (product.name || '').toLowerCase();
        const desc = (product.description || '').toLowerCase();
        const category = (product.category || '').toLowerCase();
        
        return name.includes(query) || desc.includes(query) || category.includes(query);
    });
    
    renderProductsPage();
    scrollToTop();
}

function renderProductsPage() {
    const productsGrid = document.getElementById('productsGrid');
    const paginationContainer = document.getElementById('paginationContainer');
    
    if (!productsGrid) return;
    
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const endIndex = startIndex + state.itemsPerPage;
    const pageProducts = state.filteredProducts.slice(startIndex, endIndex);
    
    if (state.filteredProducts.length === 0) {
        productsGrid.innerHTML = `
            <p id="emptyMessage" style="grid-column: 1/-1; text-align: center; color: #999; padding: 40px;">
                Aucun produit trouvé
            </p>
        `;
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }
    
    let html = '';
    pageProducts.forEach(product => {
        try {
            html += createProductCard(product);
        } catch (e) {
            console.warn('Erreur rendu produit', product.id, e);
            html += `
                <div class="product-card">
                    <div class="product-info">
                        <h3 class="product-name">Produit non disponible</h3>
                    </div>
                    <div class="product-footer">
                        <span class="product-price">0 FCFA</span>
                        <button class="btn" disabled>Indisponible</button>
                    </div>
                </div>
            `;
        }
    });
    
    productsGrid.innerHTML = html;
    // Ligne supprimée : addQuantitySelectors();
    renderPagination();
}

function createProductCard(product) {
    const name = escapeHtml(product.name || 'Produit sans nom');
    const image = escapeHtml(product.image || 'img/placeholder.png');
    const category = escapeHtml(product.category || 'Autres');
    const price = parseInt(product.price) || 0;
    const id = parseInt(product.id) || 0;
    
    return `
        <div class="product-card" role="article" aria-label="${name}">
            <a href="/product/${id}" class="product-link" tabindex="0">
                <img src="${image}" alt="${name}" class="product-image" loading="lazy" onerror="this.src='img/placeholder.png'">
                <div class="product-info">
                    <div class="product-category" aria-hidden="true">${category}</div>
                    <h3 class="product-name">${name}</h3>
                </div>
            </a>
            <div class="product-footer">
                <span class="product-price" aria-label="Prix ${price} FCFA">${price.toLocaleString('fr')} FCFA</span>
                <button class="btn" 
                    onclick="addToCart(${id}, '${name.replace(/'/g, "\\'")}', ${price})"
                    aria-label="Ajouter ${name} au panier">
                    Ajouter
                </button>
            </div>
        </div>
    `;
}

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
    
    createPaginationButtons(paginationContainer, totalPages);
}

function createPaginationButtons(container, totalPages) {
    createPageButton(container, '«', 1, state.currentPage === 1);
    createPageButton(container, '‹', state.currentPage - 1, state.currentPage === 1);
    renderPageNumbers(container, totalPages);
    createPageButton(container, '›', state.currentPage + 1, state.currentPage === totalPages);
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
    
    const productsGrid = document.getElementById('productsGrid');
    if (productsGrid) {
        productsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function addToCart(id, name, price) {
    if (!id || !name || !price) {
        console.warn('Données invalides pour ajout au panier', { id, name, price });
        return;
    }
    
    const existingItem = state.cart.find(item => item.id === id);
    
    if (existingItem) {
        existingItem.quantity++;
    } else {
        state.cart.push({ id, name, price: parseInt(price), quantity: 1 });
    }
    
    saveCartToStorage();
    updateCartCount();
    showNotification(`${name} ajouté au panier!`, 'success');
}

function updateCartCount() {
    const count = state.cart.reduce((total, item) => total + item.quantity, 0);
    const cartCountElements = document.querySelectorAll('.cart-count, #cartCountBadge');
    
    cartCountElements.forEach(element => {
        if (element) {
            element.textContent = count;
            element.setAttribute('aria-label', `${count} article${count > 1 ? 's' : ''} dans le panier`);
            
            if (count > 0) {
                element.style.animation = 'none';
                setTimeout(() => {
                    element.style.animation = 'pulse 2s infinite';
                }, 10);
            }
        }
    });
}

function setupCartModal() {
    const modal = document.getElementById('cartModal');
    const cartBtn = document.querySelector('.btn-cart');
    const closeBtn = document.querySelector('.close, .modal .close');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    if (!modal || !cartBtn) return;
    
    cartBtn.addEventListener('click', () => {
        displayCart();
        modal.style.display = 'flex';
        modal.removeAttribute('aria-hidden');
        
        setTimeout(() => {
            const firstFocusable = modal.querySelector('button:not([disabled])');
            if (firstFocusable) firstFocusable.focus();
        }, 100);
    });
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeCartModal);
    }
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeCartModal();
        }
    });
    
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', checkout);
    }
    
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
        
        setTimeout(() => {
            modal.setAttribute('aria-hidden', 'true');
        }, 100);
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

async function checkout() {
    if (state.cart.length === 0) {
        showNotification('Votre panier est vide!', 'warning');
        return;
    }
    
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
            signal: AbortSignal.timeout(10000)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.url) {
            window.open(data.url, '_blank', 'noopener,noreferrer');
            
            state.cart = [];
            saveCartToStorage();
            updateCartCount();
            
            closeCartModal();
            
            showNotification('Commande envoyée via WhatsApp!', 'success');
        } else {
            throw new Error('URL WhatsApp non générée');
        }
    } catch (error) {
        console.error('Erreur lors de la commande:', error);
        
        if (error.name === 'TimeoutError') {
            showNotification('Délai dépassé. Veuillez réessayer.', 'error');
        } else {
            showNotification('Erreur lors de la commande. Veuillez réessayer.', 'error');
        }
    } finally {
        if (checkoutBtn) {
            checkoutBtn.disabled = false;
            checkoutBtn.classList.remove('loading-btn');
        }
    }
}

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
            console.log(`Panier chargé depuis localStorage (${state.cart.length} articles)`);
        }
    } catch (error) {
        console.warn('Impossible de charger le panier:', error);
        state.cart = [];
    }
}

function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'assertive');
    
    const icon = type === 'success' ? '✅' : 
                 type === 'error' ? '❌' : 
                 type === 'warning' ? '⚠️' : 'ℹ️';
    
    notification.innerHTML = `
        <span aria-hidden="true">${icon}</span>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
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

function setupMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuBackdrop = document.getElementById('mobileMenuBackdrop');
    const mobileMenuClose = document.querySelector('.mobile-menu-close');
    const mobileMenuLinks = document.querySelectorAll('.mobile-menu-nav a');
    
    if (!hamburger || !mobileMenu) return;
    
    hamburger.addEventListener('click', toggleMobileMenu);
    
    if (mobileMenuClose) {
        mobileMenuClose.addEventListener('click', closeMobileMenu);
    }
    
    if (mobileMenuBackdrop) {
        mobileMenuBackdrop.addEventListener('click', closeMobileMenu);
    }
    
    mobileMenuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            handleMobileMenuLinkClick(e, link);
        });
    });
    
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
    
    mobileMenu.removeAttribute('aria-hidden');
    mobileMenuBackdrop.removeAttribute('aria-hidden');
    
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
    
    setTimeout(() => {
        mobileMenu.setAttribute('aria-hidden', 'true');
        mobileMenuBackdrop.setAttribute('aria-hidden', 'true');
    }, 100);
    
    const hamburger = document.querySelector('.hamburger');
    if (hamburger) hamburger.focus();
}

function handleMobileMenuLinkClick(e, link) {
    const href = link.getAttribute('href');
    
    if (href === '#') {
        e.preventDefault();
        const text = link.textContent.trim();
        
        closeMobileMenu();
        
        if (text === 'Tous les Produits') {
            filterCategory('all');
        } else {
            filterCategory(text);
        }
    } else {
        closeMobileMenu();
    }
}

function setupAccessibility() {
    addAriaAttributes();
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

function setupSearchHandlers() {
    const sidebarInput = document.getElementById('sidebarSearchInput');
    if (sidebarInput) {
        sidebarInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSidebarSearch();
        });
    }
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showLoadingState(show) {
    // À implémenter selon vos besoins
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

window.addToCart = addToCart;
window.filterCategory = filterCategory;
window.performSidebarSearch = performSidebarSearch;
window.updateCartCount = updateCartCount;

console.log('Script initialisé');