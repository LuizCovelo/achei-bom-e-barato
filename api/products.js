'use strict';

const { createHash } = require('node:crypto');

const SHOPEE_ENDPOINT = 'https://open-api.affiliate.shopee.com.br/graphql';
const PRODUCT_QUERY = `query {
  productOfferV2(listType: 0, sortType: 2, page: 1, limit: 20) {
    nodes {
      itemId
      price
      sales
      imageUrl
      productName
      shopName
      offerLink
      ratingStar
      priceDiscountRate
      productCatIds
    }
    pageInfo {
      page
      limit
      hasNextPage
    }
  }
}`;

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function loadCategoryMap() {
  try {
    const value = JSON.parse(process.env.SHOPEE_CATEGORY_MAP || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function mapOffer(offer, categoryMap) {
  const categoryIds = Array.isArray(offer.productCatIds) ? offer.productCatIds : [];
  const categoryName = (id) => id === null || id === undefined
    ? ''
    : String(categoryMap[String(id)] || `Categoria ${id}`);
  const price = numberOrNull(offer.price);

  if (!offer.productName || price === null) return null;

  return {
    id: String(offer.itemId),
    titulo: String(offer.productName),
    imagem: String(offer.imageUrl || ''),
    preco: price,
    // A API não informa preço original; não inventamos uma comparação.
    precoOriginal: null,
    desconto: numberOrNull(offer.priceDiscountRate) ?? 0,
    avaliacao: numberOrNull(offer.ratingStar) ?? 0,
    vendidos: numberOrNull(offer.sales) ?? 0,
    // O schema consultado não garante informação de frete grátis.
    freteGratis: false,
    categoria: categoryName(categoryIds[0]) || 'Ofertas Shopee',
    subcategoria: categoryName(categoryIds[1]),
    // offerLink é o link de oferta de afiliado retornado pela própria API.
    linkAfiliado: String(offer.offerLink || ''),
    loja: String(offer.shopName || ''),
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const appId = String(process.env.SHOPEE_APP_ID || '').trim();
  const secret = String(process.env.SHOPEE_APP_SECRET || '').trim();
  if (!appId || !secret || appId === '--' || secret === '--') {
    return res.status(503).json({
      error: 'Cadastre SHOPEE_APP_ID e SHOPEE_APP_SECRET nas variáveis de ambiente da Vercel.'
    });
  }

  const timestamp = Math.ceil(Date.now() / 1000);
  const payload = JSON.stringify({ query: PRODUCT_QUERY });
  // Formato indicado pelo explorador oficial: SHA256(AppId + timestamp + payload + Secret).
  const signature = createHash('sha256')
    .update(`${appId}${timestamp}${payload}${secret}`, 'utf8')
    .digest('hex');

  try {
    const upstream = await fetch(SHOPEE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`
      },
      body: payload
    });
    const result = await upstream.json().catch(() => null);

    if (!upstream.ok || result?.errors?.length) {
      const details = Array.isArray(result?.errors)
        ? JSON.stringify(result.errors).slice(0, 700)
        : `HTTP ${upstream.status}`;
      console.error('Falha na Shopee Affiliate Open API:', details);
      return res.status(502).json({
        error: 'A Shopee rejeitou a consulta. Verifique se as credenciais são da API de Afiliados e se o acesso está habilitado; consulte os logs da função na Vercel.'
      });
    }

    const offers = result?.data?.productOfferV2?.nodes;
    if (!Array.isArray(offers)) {
      console.error('Resposta sem data.productOfferV2.nodes na Shopee Affiliate Open API.');
      return res.status(502).json({ error: 'A resposta da Shopee não contém a lista de ofertas esperada.' });
    }

    const categoryMap = loadCategoryMap();
    const products = offers.map((offer) => mapOffer(offer, categoryMap)).filter(Boolean);
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-if-error=300');
    return res.status(200).json(products);
  } catch (error) {
    console.error('Erro ao consultar a Shopee Affiliate Open API:', error?.message || 'erro desconhecido');
    return res.status(502).json({ error: 'Não foi possível consultar a API da Shopee neste momento.' });
  }
};
