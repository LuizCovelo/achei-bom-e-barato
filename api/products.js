'use strict';

const { createHash } = require('node:crypto');

const SHOPEE_ENDPOINT = 'https://open-api.affiliate.shopee.com.br/graphql';
const LIMIT = 20;
const SEARCHES = [
  { alias: 'blusas_baratas', keyword: 'blusa feminina', sortType: 4, category: 'Blusas' },
  { alias: 'blusas_premium', keyword: 'blusa feminina', sortType: 3, category: 'Blusas' },
  { alias: 'vestidos_baratos', keyword: 'vestido feminino', sortType: 4, category: 'Vestidos' },
  { alias: 'vestidos_premium', keyword: 'vestido feminino', sortType: 3, category: 'Vestidos' },
  { alias: 'calcas_baratas', keyword: 'calça feminina', sortType: 4, category: 'Calças Femininas' },
  { alias: 'calcas_premium', keyword: 'calça feminina', sortType: 3, category: 'Calças Femininas' },
  { alias: 'saias_baratas', keyword: 'saia feminina', sortType: 4, category: 'Saias' },
  { alias: 'shorts_baratos', keyword: 'short feminino', sortType: 4, category: 'Shorts' },
  { alias: 'conjuntos_baratos', keyword: 'conjunto feminino', sortType: 4, category: 'Conjuntos' },
  { alias: 'lingerie_barata', keyword: 'lingerie feminina', sortType: 4, category: 'Lingerie' },
  { alias: 'moda_feminina_barata', keyword: 'roupa feminina', sortType: 4, category: 'Moda Feminina' },
  { alias: 'moda_feminina_premium', keyword: 'roupa feminina', sortType: 3, category: 'Moda Feminina' },
  { alias: 'geral_barato', keyword: null, sortType: 4, category: 'Ofertas gerais' },
  { alias: 'geral_variedade', keyword: null, sortType: 3, category: 'Ofertas gerais' }
];

const PRODUCT_FIELDS = `{
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
}`;

function buildProductQuery() {
  const fields = SEARCHES.map(({ alias, keyword, sortType }) => {
    const args = [
      'listType: 0',
      keyword ? `keyword: ${JSON.stringify(keyword)}` : null,
      `sortType: ${sortType}`,
      'page: 1',
      `limit: ${LIMIT}`
    ].filter(Boolean).join(', ');
    return `  ${alias}: productOfferV2(${args}) ${PRODUCT_FIELDS}`;
  });
  return `query {\n${fields.join('\n')}\n}`;
}

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

function mapOffer(offer, categoryMap, categoryLabel) {
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
    categoria: categoryLabel || categoryName(categoryIds[0]) || 'Ofertas Shopee',
    subcategoria: categoryName(categoryIds[1]),
    // offerLink é o link de oferta de afiliado retornado pela própria API.
    linkAfiliado: String(offer.offerLink || ''),
    loja: String(offer.shopName || '')
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
  const payload = JSON.stringify({ query: buildProductQuery() });
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

    if (!upstream.ok || !result?.data) {
      const details = Array.isArray(result?.errors)
        ? JSON.stringify(result.errors).slice(0, 700)
        : `HTTP ${upstream.status}`;
      console.error('Falha na Shopee Affiliate Open API:', details);
      return res.status(502).json({
        error: 'A Shopee rejeitou a consulta agrupada. Verifique as permissões da API de Afiliados e consulte os logs da função na Vercel.'
      });
    }

    if (result.errors?.length) {
      console.error('A Shopee retornou erros parciais:', JSON.stringify(result.errors).slice(0, 700));
    }
    const availableSearches = SEARCHES.filter(({ alias }) => Array.isArray(result.data[alias]?.nodes));
    if (!availableSearches.length) {
      console.error('Nenhuma busca retornou nodes na Shopee Affiliate Open API.');
      return res.status(502).json({ error: 'A resposta da Shopee não contém listas de ofertas utilizáveis.' });
    }

    const categoryMap = loadCategoryMap();
    const seen = new Set();
    const products = [];
    for (const search of availableSearches) {
      for (const offer of result.data[search.alias].nodes) {
        const product = mapOffer(offer, categoryMap, search.category);
        if (!product || seen.has(product.id)) continue;
        seen.add(product.id);
        products.push(product);
      }
    }

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-if-error=300');
    return res.status(200).json(products);
  } catch (error) {
    console.error('Erro ao consultar a Shopee Affiliate Open API:', error?.message || 'erro desconhecido');
    return res.status(502).json({ error: 'Não foi possível consultar a API da Shopee neste momento.' });
  }
};
