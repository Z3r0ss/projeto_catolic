// ============ CONFIGURAÇÕES GERAIS ============
const WHATSAPP_NUMBER = '5587992061091';
const CART_STORAGE_KEY = 'divino3d_cart_v2';

const money = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
});

let cart = loadCart();
let selectedShipping = null;

// ============ PARTÍCULAS NO FUNDO ============
const canvas = document.getElementById('particle-canvas');
const ctx = canvas?.getContext('2d');
let particles = [];
const particleColor = 'rgba(198, 166, 100, 0.72)';

function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.45;
        this.speedX = Math.random() * 0.34 - 0.17;
        this.speedY = Math.random() * 0.34 - 0.17;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
        if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = particleColor;
        ctx.fill();
    }
}

function initParticles() {
    if (!canvas) return;
    particles = [];
    const amount = Math.min(105, Math.floor((canvas.width * canvas.height) / 17000));
    for (let i = 0; i < amount; i++) particles.push(new Particle());
}

function animateParticles() {
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((particle) => {
        particle.update();
        particle.draw();
    });
    requestAnimationFrame(animateParticles);
}

if (canvas && ctx) {
    resizeCanvas();
    initParticles();
    animateParticles();
    window.addEventListener('resize', () => {
        resizeCanvas();
        initParticles();
    });
}

// ============ SCROLL REVEAL E NAVBAR ============
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('active');
    });
}, { threshold: 0.12 });

document.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el));

const nav = document.querySelector('.glass-nav');
window.addEventListener('scroll', () => {
    nav?.classList.toggle('scrolled', window.scrollY > 40);
});

// ============ FILTROS ============
const filterButtons = document.querySelectorAll('.filter-bar button');
const productItems = document.querySelectorAll('.product-item');

filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
        filterButtons.forEach((btn) => btn.classList.remove('active'));
        button.classList.add('active');

        const filterValue = button.dataset.filter;
        productItems.forEach((item) => {
            const isVisible = filterValue === 'all' || item.dataset.category === filterValue;
            item.style.display = isVisible ? 'block' : 'none';
            if (isVisible) {
                item.classList.remove('active');
                setTimeout(() => item.classList.add('active'), 40);
            }
        });
    });
});

// ============ CARRINHO ============
const cartIcon = document.getElementById('cart-icon');
const badge = cartIcon?.querySelector('.badge');
const cartModalOverlay = document.getElementById('cart-modal');
const closeCartBtn = document.getElementById('close-cart');
const cartItemsContainer = document.getElementById('cart-items-container');
const cartSubtotalSpan = document.getElementById('cart-subtotal');
const cartShippingSpan = document.getElementById('cart-shipping');
const cartTotalSpan = document.getElementById('cart-total');
const checkoutBtn = document.getElementById('checkout-btn');
const whatsappCheckoutBtn = document.getElementById('whatsapp-checkout');
const clearCartBtn = document.getElementById('clear-cart');
const catalogoLink = document.getElementById('catalogo-pdf');
const openCartHero = document.getElementById('open-cart-hero');
const openCartShipping = document.getElementById('open-cart-shipping');
const shippingZipInput = document.getElementById('shipping-zip');
const shippingBtn = document.getElementById('shipping-btn');
const shippingStatus = document.getElementById('shipping-status');
const shippingOptions = document.getElementById('shipping-options');

function loadCart() {
    try {
        return JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
    } catch {
        return [];
    }
}

function saveCart() {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function sanitizeQuantity(value) {
    const quantity = Number(value);
    return Number.isFinite(quantity) && quantity > 0 ? Math.min(Math.floor(quantity), 99) : 1;
}

function getProductFromButton(btn) {
    return {
        id: btn.dataset.id,
        name: btn.dataset.name,
        price: Number(btn.dataset.price),
        material: btn.dataset.material,
        weight: Number(btn.dataset.weight),
        width: Number(btn.dataset.width),
        height: Number(btn.dataset.height),
        length: Number(btn.dataset.length),
        quantity: 1
    };
}

function addToCart(product) {
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
        existing.quantity = sanitizeQuantity(existing.quantity + 1);
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    selectedShipping = null;
    saveCart();
    updateCartUI();
    openCart();
}

function changeQuantity(index, delta) {
    const item = cart[index];
    if (!item) return;
    item.quantity = sanitizeQuantity(item.quantity + delta);
    selectedShipping = null;
    saveCart();
    updateCartUI();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    selectedShipping = null;
    saveCart();
    updateCartUI();
}

function clearCart() {
    cart = [];
    selectedShipping = null;
    saveCart();
    updateCartUI();
}

function subtotal() {
    return cart.reduce((sum, item) => sum + Number(item.price) * sanitizeQuantity(item.quantity), 0);
}

function shippingTotal() {
    return selectedShipping ? Number(selectedShipping.price) : 0;
}

function orderTotal() {
    return subtotal() + shippingTotal();
}

function resetShippingUI(message = 'Informe o CEP para buscar opções do Melhor Envio.') {
    if (shippingStatus) shippingStatus.textContent = message;
    if (shippingOptions) shippingOptions.innerHTML = '';
    selectedShipping = null;
}

function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + sanitizeQuantity(item.quantity), 0);
    if (badge) badge.textContent = totalItems;

    if (!cartItemsContainer) return;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart">Seu carrinho está vazio. Escolha uma peça para começar.</p>';
        resetShippingUI();
    } else {
        cartItemsContainer.innerHTML = cart.map((item, index) => `
            <div class="cart-item">
                <div>
                    <div class="cart-item-name">${escapeHTML(item.name)}</div>
                    <div class="cart-item-material">${escapeHTML(item.material)} • ${item.weight}kg • ${item.width}x${item.height}x${item.length}cm</div>
                    <div class="cart-item-actions">
                        <button class="qty-btn" data-action="decrease" data-index="${index}" aria-label="Diminuir quantidade de ${escapeHTML(item.name)}">−</button>
                        <strong>${sanitizeQuantity(item.quantity)}</strong>
                        <button class="qty-btn" data-action="increase" data-index="${index}" aria-label="Aumentar quantidade de ${escapeHTML(item.name)}">+</button>
                        <button class="remove-item" data-action="remove" data-index="${index}">Remover</button>
                    </div>
                </div>
                <span class="cart-item-price">${money.format(Number(item.price) * sanitizeQuantity(item.quantity))}</span>
            </div>
        `).join('');
    }

    cartSubtotalSpan.textContent = money.format(subtotal());
    cartShippingSpan.textContent = selectedShipping ? money.format(shippingTotal()) : 'A calcular';
    cartTotalSpan.textContent = money.format(orderTotal());
}

function escapeHTML(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function openCart() {
    cartModalOverlay?.classList.add('active');
    cartModalOverlay?.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cart-open');
}

function closeCart() {
    cartModalOverlay?.classList.remove('active');
    cartModalOverlay?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cart-open');
}

document.querySelectorAll('.add-to-cart').forEach((button) => {
    button.addEventListener('click', (event) => addToCart(getProductFromButton(event.currentTarget)));
});

cartItemsContainer?.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const index = Number(button.dataset.index);
    if (button.dataset.action === 'increase') changeQuantity(index, 1);
    if (button.dataset.action === 'decrease') changeQuantity(index, -1);
    if (button.dataset.action === 'remove') removeFromCart(index);
});

cartIcon?.addEventListener('click', openCart);
openCartHero?.addEventListener('click', openCart);
openCartShipping?.addEventListener('click', openCart);
closeCartBtn?.addEventListener('click', closeCart);
cartModalOverlay?.addEventListener('click', (event) => {
    if (event.target === cartModalOverlay) closeCart();
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeCart();
});

clearCartBtn?.addEventListener('click', () => {
    if (cart.length > 0 && confirm('Tem certeza que deseja limpar o carrinho?')) clearCart();
});

// ============ FRETE / MELHOR ENVIO ============
function onlyDigits(value) {
    return String(value || '').replace(/\D/g, '');
}

shippingZipInput?.addEventListener('input', () => {
    const digits = onlyDigits(shippingZipInput.value).slice(0, 8);
    shippingZipInput.value = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
});

shippingBtn?.addEventListener('click', calculateShipping);
shippingZipInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') calculateShipping();
});

async function calculateShipping() {
    if (cart.length === 0) {
        alert('Adicione produtos ao carrinho antes de calcular o frete.');
        return;
    }

    const postalCode = onlyDigits(shippingZipInput?.value);
    if (postalCode.length !== 8) {
        shippingStatus.textContent = 'Digite um CEP válido com 8 números.';
        return;
    }

    selectedShipping = null;
    shippingOptions.innerHTML = '';
    shippingStatus.textContent = 'Buscando opções de frete no Melhor Envio...';
    shippingBtn.disabled = true;
    shippingBtn.textContent = 'Calculando...';

    try {
        const response = await fetch('/api/shipping/quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postalCode, items: cart })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Não foi possível calcular o frete.');

        renderShippingOptions(data.options || []);
    } catch (error) {
        shippingStatus.textContent = error.message || 'Erro ao calcular o frete.';
    } finally {
        shippingBtn.disabled = false;
        shippingBtn.textContent = 'Calcular';
        updateCartUI();
    }
}

function renderShippingOptions(options) {
    if (!options.length) {
        shippingStatus.textContent = 'Nenhuma opção de frete retornou para esse CEP.';
        return;
    }

    shippingStatus.textContent = 'Escolha uma opção de envio para continuar.';
    shippingOptions.innerHTML = options.map((option, index) => {
        const id = `shipping-${index}`;
        return `
            <label class="shipping-option" for="${id}">
                <input type="radio" name="shipping" id="${id}" value="${index}">
                <span>
                    <strong>${escapeHTML(option.company)} • ${escapeHTML(option.name)}</strong><br>
                    <small>${option.deliveryTime ? `${option.deliveryTime} dias úteis` : 'Prazo sob consulta'}</small>
                </span>
                <strong>${money.format(Number(option.price))}</strong>
            </label>
        `;
    }).join('');

    shippingOptions.querySelectorAll('input[name="shipping"]').forEach((input) => {
        input.addEventListener('change', () => {
            selectedShipping = options[Number(input.value)];
            updateCartUI();
        });
    });
}

// ============ PAGAMENTO / MERCADO PAGO ============
checkoutBtn?.addEventListener('click', async () => {
    if (cart.length === 0) {
        alert('Adicione produtos ao carrinho primeiro.');
        return;
    }

    if (!selectedShipping) {
        alert('Calcule e selecione uma opção de frete antes de pagar.');
        shippingZipInput?.focus();
        return;
    }

    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'Abrindo Mercado Pago...';

    try {
        const response = await fetch('/api/payments/mercadopago/preference', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: cart, shipping: selectedShipping })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Não foi possível iniciar o pagamento.');

        const redirectUrl = data.init_point || data.sandbox_init_point;
        if (!redirectUrl) throw new Error('O Mercado Pago não retornou o link de pagamento.');
        window.location.href = redirectUrl;
    } catch (error) {
        alert(error.message || 'Erro ao iniciar checkout do Mercado Pago.');
    } finally {
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = 'Pagar com Mercado Pago';
    }
});

// ============ WHATSAPP COMO PLANO B ============
whatsappCheckoutBtn?.addEventListener('click', () => openWhatsAppCheckout());

catalogoLink?.addEventListener('click', (event) => {
    event.preventDefault();
    const message = 'Olá, gostaria de mais informações sobre os produtos da Divino3D.';
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
});

function openWhatsAppCheckout() {
    if (cart.length === 0) {
        alert('Adicione produtos ao carrinho primeiro.');
        return;
    }

    let message = 'Olá, vim pelo site Divino3D e gostaria de finalizar este pedido:\n\n';
    cart.forEach((item) => {
        message += `• ${item.name} (${item.material}) - Qtd: ${sanitizeQuantity(item.quantity)} - Unit: ${money.format(Number(item.price))}\n`;
    });

    message += `\nProdutos: ${money.format(subtotal())}`;
    if (selectedShipping) {
        message += `\nFrete: ${selectedShipping.company} • ${selectedShipping.name} - ${money.format(Number(selectedShipping.price))}`;
    } else {
        message += '\nFrete: ainda não calculado';
    }
    message += `\nTotal: ${money.format(orderTotal())}`;

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
}

updateCartUI();
