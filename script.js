// --- Animação de Partículas no Fundo (Canvas) ---
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');

let particles = [];
const particleColor = 'rgba(198, 166, 100, 0.8)'; // Dourado

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.speedY = Math.random() * 0.5 - 0.25;
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
    particles = [];
    const numberOfParticles = (canvas.width * canvas.height) / 15000;
    for (let i = 0; i < numberOfParticles; i++) {
        particles.push(new Particle());
    }
}
initParticles();
window.addEventListener('resize', initParticles);

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    requestAnimationFrame(animateParticles);
}
animateParticles();

// --- Efeito de surgimento ao rolar a página (Scroll Reveal) ---
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el));

// --- Mudança de cor da Navbar ao rolar ---
const nav = document.querySelector('.glass-nav');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        nav.style.padding = '1rem 5%';
        nav.style.boxShadow = '0 10px 30px rgba(0,0,0,0.05)';
    } else {
        nav.style.padding = '1.5rem 5%';
        nav.style.boxShadow = 'none';
    }
});

// --- Filtro de Categoria (Simples) ---
const filterButtons = document.querySelectorAll('.filter-bar button');
const productItems = document.querySelectorAll('.product-item');

filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        const filterValue = button.getAttribute('data-filter');

        productItems.forEach(item => {
            const category = item.getAttribute('data-category');
            if (filterValue === 'all' || category === filterValue) {
                item.style.display = 'block';
                item.classList.remove('active');
                setTimeout(() => item.classList.add('active'), 50);
            } else {
                item.style.display = 'none';
            }
        });
    });
});

// ============ CARRINHO DE COMPRAS ============

let cart = [];

// Elementos do carrinho
const cartIcon = document.getElementById('cart-icon');
const badge = cartIcon.querySelector('.badge');
const cartModalOverlay = document.getElementById('cart-modal');
const closeCartBtn = document.getElementById('close-cart');
const cartItemsContainer = document.getElementById('cart-items-container');
const cartTotalSpan = document.getElementById('cart-total');
const checkoutBtn = document.getElementById('checkout-btn');
const clearCartBtn = document.getElementById('clear-cart');
const catalogoLink = document.getElementById('catalogo-pdf');

// Adicionar evento aos botões "Adicionar ao Carrinho"
document.querySelectorAll('.add-to-cart').forEach(button => {
    button.addEventListener('click', (e) => {
        const btn = e.currentTarget;
        const product = {
            name: btn.dataset.name,
            price: parseFloat(btn.dataset.price),
            material: btn.dataset.material
        };
        addToCart(product);
    });
});

function addToCart(product) {
    // Verifica se o produto já existe no carrinho (pode adicionar quantidade depois)
    const existing = cart.find(item => item.name === product.name && item.material === product.material);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({...product, quantity: 1});
    }
    updateCartUI();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

function clearCart() {
    cart = [];
    updateCartUI();
}

function updateCartUI() {
    // Atualiza badge
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    badge.textContent = totalItems;

    // Renderiza itens no modal
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align:center; color:#888;">Seu carrinho está vazio.</p>';
    } else {
        let html = '';
        cart.forEach((item, index) => {
            html += `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.name} (${item.material})</div>
                        <div style="font-size:0.9rem;">Quantidade: ${item.quantity}</div>
                    </div>
                    <span class="cart-item-price">R$ ${(item.price * item.quantity).toFixed(2)}</span>
                    <button class="remove-item" data-index="${index}">🗑️</button>
                </div>
            `;
        });
        cartItemsContainer.innerHTML = html;

        // Eventos de remover item
        document.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                removeFromCart(index);
            });
        });
    }

    // Atualiza total
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    cartTotalSpan.textContent = `R$ ${total.toFixed(2)}`;
}

// Abrir/fechar modal
cartIcon.addEventListener('click', () => {
    cartModalOverlay.classList.add('active');
});

closeCartBtn.addEventListener('click', () => {
    cartModalOverlay.classList.remove('active');
});

cartModalOverlay.addEventListener('click', (e) => {
    if (e.target === cartModalOverlay) {
        cartModalOverlay.classList.remove('active');
    }
});

// Finalizar compra pelo WhatsApp
checkoutBtn.addEventListener('click', () => {
    if (cart.length === 0) {
        alert('Adicione produtos ao carrinho primeiro.');
        return;
    }
    const numeroWhatsApp = '5587992061091'; // Seu número
    let mensagem = 'Olá, gostaria de finalizar o pedido:\n\n';
    cart.forEach(item => {
        mensagem += `➡️ ${item.name} (${item.material}) - Quantidade: ${item.quantity} - Preço unitário: R$ ${item.price.toFixed(2)}\n`;
    });
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    mensagem += `\n💰 Total do pedido: R$ ${total.toFixed(2)}`;
    const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
});

// Limpar carrinho
clearCartBtn.addEventListener('click', () => {
    if (cart.length > 0 && confirm('Tem certeza que deseja limpar o carrinho?')) {
        clearCart();
    }
});

// Link do catálogo com mensagem automática
catalogoLink.addEventListener('click', (e) => {
    e.preventDefault();
    const numeroWhatsApp = '5587992061091';
    const mensagem = 'Olá, gostaria de receber o catálogo dos produtos da Sacra 3D.';
    const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
});

// Inicializa UI do carrinho
updateCartUI();