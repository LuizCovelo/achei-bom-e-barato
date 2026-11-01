# Achei Bom e Barato — instruções

## Testar
O projeto é estático. Execute `python3 -m http.server 8000` nesta pasta e acesse http://localhost:8000. Não abra o HTML diretamente pelo `file://`: o navegador bloqueia o carregamento do JSON. Google Fonts exige conexão; as fontes do sistema são usadas como alternativa. A logo fornecida e as imagens ilustrativas estão em `assets/`.

**Demonstração:** os 46 produtos e todos os números, lojas e imagens são fictícios. Os botões de compra estão desativados; não representam ofertas reais. Os modais de promoção e saída só aparecem quando existirem links reais, com desconto informado. O modal de boas-vindas espera o aviso de armazenamento ser resolvido. O botão Voltar do celular não é interceptado: a saída não é bloqueada. No celular o modal de saída pode ser acionado por rolagem rápida para cima ou 2 minutos de inatividade.

## Trocar o JSON pela API
1. Crie uma função no servidor para consultar a API do programa de afiliados da Shopee. Consulte a documentação oficial vigente para credenciais, assinatura, limites, disponibilidade e formato. Guarde segredos em variáveis de ambiente do servidor; jamais no frontend ou em arquivos públicos.
2. O endpoint deve retornar uma lista JSON com os campos de `produtos.json`: `id`, `titulo`, `imagem`, `preco`, `precoOriginal`, `desconto`, `avaliacao`, `vendidos`, `freteGratis`, `categoria`, `subcategoria`, `linkAfiliado` e `loja`. Os valores devem vir da fonte, ser atuais e confiáveis. Se informações forem ausentes, ajuste a renderização para não exibir dados não informados. Remova `exemplo` ou defina como `false` apenas para dados reais e verificados.
3. Em `app.js`, substitua o `fetch('produtos.json')` em `buscarProdutos()` pelo endpoint de seu servidor. Configure acesso de mesma origem, HTTPS e, se necessário, CORS. O cache opcional dura 30 minutos somente após aceitação. Determine uma validade apropriada às regras da Shopee e às ofertas. Atualize e revise política de privacidade e termos.
4. As imagens de exemplo são SVGs locais. Use imagens reais autorizadas, e revise alt e permissões de uso; hospede-as localmente se não quiser solicitações externas.

## Configurar links e subId
1. Gere seus links de afiliado reais pelo programa oficial ou no servidor autorizado. Não há ID de afiliado neste exemplo, e não basta trocar o domínio de links fictícios. Coloque os links corretos em `linkAfiliado` no retorno da API. Nunca publique a chave secreta de API no navegador.
2. Em `CONFIG` no começo de `app.js`, configure `subIdParametro` apenas depois de confirmar o nome do parâmetro, o formato e o suporte no seu programa/link; deixe vazio se não tiver certeza. O valor enviado combina `subIdPrefixo`, página e ID do produto. Confirme na documentação se subIDs precisam ser gerados no servidor ou incluídos ao criar o link: neste caso implemente a geração do link no backend, sem anexar parâmetros no navegador.
3. Configure `emailContato` com um e-mail válido. O formulário abre o programa de e-mail do visitante, não envia mensagens por servidor. Revise as informações legais e a política de privacidade antes de publicar.

## Publicação
1. Substitua o catálogo fictício, configure contato e links, e teste cada página, busca, filtros, favoritos, consentimento, modais e links reais. Verifique a validade da parceria e das afirmações de proteção. Ajuste a política LGPD à sua operação com orientação adequada.
2. Em `sitemap.xml` e `robots.txt`, substitua `https://www.seudominio.com.br` pelo seu domínio HTTPS real. Configure metadados, imagens de compartilhamento e dados estruturados definitivos depois de ter domínio e dados reais. Não inclua dados estruturados de produtos fictícios.
3. Publique todos os arquivos desta pasta e `assets/` em hospedagem estática com HTTPS, na raiz do site. Publique o endpoint em um serviço de backend seguro separado ou por funções serverless. Teste o domínio público no celular e no computador.
