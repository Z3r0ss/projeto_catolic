const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

const CATALOG = {
    'cristo-redentor-20': {
        title: 'Cristo Redentor (20cm)',
        unit_price: 189.00,
        weight: 0.45,
        width: 14,
        height: 24,
        length: 14,
        insurance_value: 189.00
    },
    'nossa-senhora-15': {
        title: 'Nossa Senhora Aparecida (15cm)',
        unit_price: 219.00,
        weight: 0.52,
        width: 16,
        height: 22,
        length: 16,
        insurance_value: 219.00
    },
    'sagrada-familia-18': {
        title: 'Sagrada Família (18cm)',
        unit_price: 239.00,
        weight: 0.62,
        width: 18,
        height: 24,
        length: 18,
        insurance_value: 239.00
    },
    'chaveiro-sao-bento': {
        title: 'Chaveiro de São Bento',
        unit_price: 49.90,
        weight: 0.08,
        width: 10,
        height: 4,
        length: 12,
        insurance_value: 49.90
    },
    'chaveiro-divino': {
        title: 'Chaveiro Divino Espírito Santo',
        unit_price: 54.90,
        weight: 0.08,
        width: 10,
        height: 4,
        length: 12,
        insurance_value: 54.90
    },
    'mini-terco-lembranca': {
        title: 'Mini Terço de Lembrança',
        unit_price: 34.90,
        weight: 0.06,
        width: 9,
        height: 3,
        length: 11,
        insurance_value: 34.90
    }
};

function onlyDigits(value) {
    return String(value || '').replace(/\D/g, '');
}

function normalizeQuantity(value) {
    const quantity = Number(value);
    return Number.isFinite(quantity) && quantity > 0 ? Math.min(Math.floor(quantity), 99) : 1;
}

function normalizeCartItems(items = []) {
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Carrinho vazio.');
    }

    return items.map((item) => {
        const product = CATALOG[item.id];
        if (!product) throw new Error(`Produto inválido: ${item.id}`);
        return {
            id: item.id,
            quantity: normalizeQuantity(item.quantity),
            ...product
        };
    });
}

function toNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

app.post('/api/shipping/quote', async (req, res) => {
    try {
        const token = process.env.MELHOR_ENVIO_ACCESS_TOKEN;
        const originZip = onlyDigits(process.env.ORIGIN_ZIP);
        const destinationZip = onlyDigits(req.body.postalCode);

        if (!token) return res.status(500).json({ error: 'Configure MELHOR_ENVIO_ACCESS_TOKEN no arquivo .env.' });
        if (originZip.length !== 8) return res.status(500).json({ error: 'Configure ORIGIN_ZIP com 8 dígitos no arquivo .env.' });
        if (destinationZip.length !== 8) return res.status(400).json({ error: 'CEP de destino inválido.' });

        const cartItems = normalizeCartItems(req.body.items);

        const payload = {
            from: { postal_code: originZip },
            to: { postal_code: destinationZip },
            products: cartItems.map((item) => ({
                id: item.id,
                width: item.width,
                height: item.height,
                length: item.length,
                weight: item.weight,
                insurance_value: item.insurance_value,
                quantity: item.quantity
            })),
            options: {
                receipt: false,
                own_hand: false,
                collect: false
            }
        };

        if (process.env.MELHOR_ENVIO_SERVICES) {
            payload.services = process.env.MELHOR_ENVIO_SERVICES;
        }

        const apiUrl = process.env.MELHOR_ENVIO_API_URL || 'https://www.melhorenvio.com.br/api/v2/me/shipment/calculate';
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                'User-Agent': process.env.APP_USER_AGENT || 'Divino3D contato@divino3d.com.br'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
            return res.status(response.status).json({
                error: data?.message || data?.error || 'Erro retornado pelo Melhor Envio.',
                details: data
            });
        }

        const options = Array.isArray(data) ? data
            .filter((option) => !option.error && (option.custom_price || option.price))
            .map((option) => ({
                id: option.id,
                name: option.name,
                company: option.company?.name || 'Transportadora',
                price: toNumber(option.custom_price ?? option.price),
                deliveryTime: option.custom_delivery_time ?? option.delivery_time ?? null
            })) : [];

        res.json({ options });
    } catch (error) {
        res.status(400).json({ error: error.message || 'Erro ao calcular frete.' });
    }
});

app.post('/api/payments/mercadopago/preference', async (req, res) => {
    try {
        const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
        if (!accessToken) return res.status(500).json({ error: 'Configure MERCADO_PAGO_ACCESS_TOKEN no arquivo .env.' });

        const cartItems = normalizeCartItems(req.body.items);
        const shipping = req.body.shipping;
        const shippingPrice = shipping ? toNumber(shipping.price) : 0;

        if (!shipping || shippingPrice <= 0) {
            return res.status(400).json({ error: 'Selecione uma opção de frete antes de pagar.' });
        }

        const preferenceItems = cartItems.map((item) => ({
            id: item.id,
            title: item.title,
            quantity: item.quantity,
            unit_price: item.unit_price,
            currency_id: 'BRL'
        }));

        preferenceItems.push({
            id: 'frete',
            title: `Frete - ${shipping.company || 'Transportadora'} ${shipping.name || ''}`.trim(),
            quantity: 1,
            unit_price: shippingPrice,
            currency_id: 'BRL'
        });

        const baseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;
        const body = {
            items: preferenceItems,
            external_reference: `DIVINO3D-${Date.now()}`,
            statement_descriptor: 'DIVINO3D',
            back_urls: {
                success: `${baseUrl}/?payment=success`,
                failure: `${baseUrl}/?payment=failure`,
                pending: `${baseUrl}/?payment=pending`
            },
            auto_return: 'approved',
            metadata: {
                shipping_company: shipping.company,
                shipping_service: shipping.name,
                shipping_price: shippingPrice,
                shipping_delivery_time: shipping.deliveryTime || null
            }
        };

        if (process.env.MERCADO_PAGO_NOTIFICATION_URL) {
            body.notification_url = process.env.MERCADO_PAGO_NOTIFICATION_URL;
        }

        const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
            return res.status(response.status).json({
                error: data?.message || 'Erro retornado pelo Mercado Pago.',
                details: data
            });
        }

        res.json({
            id: data.id,
            init_point: data.init_point,
            sandbox_init_point: data.sandbox_init_point
        });
    } catch (error) {
        res.status(400).json({ error: error.message || 'Erro ao criar preferência de pagamento.' });
    }
});

app.post('/api/webhooks/mercadopago', (req, res) => {
    // Receba notificações do Mercado Pago aqui e consulte o pagamento pelo ID informado.
    // Em produção, valide a assinatura/webhook conforme a documentação oficial da sua aplicação.
    console.log('Webhook Mercado Pago:', req.body);
    res.sendStatus(200);
});

app.post('/api/webhooks/melhor-envio', (req, res) => {
    // Receba atualizações de envio/rastreio do Melhor Envio aqui.
    console.log('Webhook Melhor Envio:', req.body);
    res.sendStatus(200);
});

app.listen(PORT, () => {
    console.log(`Divino3D rodando em http://localhost:${PORT}`);
});
