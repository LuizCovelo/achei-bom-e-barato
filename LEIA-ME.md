# Achei Bom e Barato — configuração da API e publicação

## O que já está conectado

O site consulta o endpoint `/api/products`, executado como função serverless na Vercel. Essa função chama a Shopee Affiliate Open API brasileira (`productOfferV2`), calcula a assinatura no servidor e converte os resultados para o formato usado pelo site. O frontend não recebe nem conhece o App Secret.

Sem credenciais, o endpoint responde com erro de configuração e o site informa quais variáveis faltam. Ele **não** troca silenciosamente para os dados fictícios de `produtos.json`; esse arquivo foi mantido apenas como referência/demonstração e não é usado pelo site conectado.

A integração retorna até 20 ofertas da primeira página por consulta. A categoria exibida usa os IDs de categoria da API; para apresentar nomes mais amigáveis, configure o mapa opcional descrito abaixo.

## Colocar seu AppID e sua Senha/Secret na Vercel

As credenciais citadas como `AppID` e `Senha` devem ser adicionadas como variáveis privadas do projeto. Na Vercel, abra o projeto, entre em **Settings → Environment Variables** e crie:

- `SHOPEE_APP_ID` — valor do seu AppID.
- `SHOPEE_APP_SECRET` — valor chamado **Secret** no portal da Shopee. Não é a senha de login da sua conta.

Adicione ambas aos ambientes necessários, principalmente **Production**; marque também **Preview** e **Development** se for testar nesses ambientes. Não use `--` como valor real. Salve as variáveis e faça um novo deploy (ou redeploy) para que a função passe a recebê-las.

**Importante:** este endpoint usa a Shopee **Affiliate Open API** do Brasil, disponível no portal de afiliados. Credenciais da API de vendedor/loja da Open Platform podem ser de outro produto e não necessariamente funcionarão aqui. O App Secret nunca deve ser colocado em `app.js`, em HTML, em `produtos.json`, em `vercel.json` nem em um arquivo enviado ao GitHub. O `.gitignore` já protege arquivos `.env` locais; `.env.example` contém apenas nomes vazios.

## Conectar a Vercel ao GitHub

Importe `LuizCovelo/achei-bom-e-barato` em **Add New → Project** na Vercel. Use **Framework Preset: Other**, **Root Directory: `.`** e não configure comando de build. Como o projeto é HTML/CSS/JavaScript sem etapa de compilação, os arquivos na raiz são servidos diretamente e `api/products.js` vira a função serverless. Depois de cadastrar as variáveis de ambiente, faça o deploy de produção.

Quando conectado ao GitHub, novos commits na branch `main` podem iniciar deployments automaticamente. Para desenvolvimento local com a função de API, use a CLI da Vercel (`vercel dev`); `python3 -m http.server` sozinho não executa funções serverless.

## Categorias opcionais

O campo `productCatIds` da API contém IDs, não os nomes localizados. Se quiser rótulos legíveis, crie a variável opcional `SHOPEE_CATEGORY_MAP` na Vercel com um objeto JSON que mapeie IDs para nomes, por exemplo `{"123":"Casa e Cozinha","456":"Beleza"}`. Use os IDs efetivamente retornados pela API. Sem esse mapa, o site mostra `Categoria <ID>`.

## Dados e limites da integração

O endpoint usa a operação `productOfferV2`, consulta 20 produtos e utiliza o link `offerLink` retornado pela Shopee. Preço, imagem, avaliação, vendas e percentual de desconto são mapeados dos campos retornados pela API. O schema consultado não fornece preço original confiável nem confirma frete grátis; por isso, o site não inventa preço anterior e não anuncia frete grátis.

Os botões de compra só funcionam quando a API devolve `offerLink`. A disponibilidade, os preços, a taxa de chamadas e a validade dos links continuam sujeitos às regras e permissões da Shopee e à conta usada. Faça uma validação real depois de incluir as credenciais; elas não foram fornecidas neste projeto e a chamada autenticada ainda precisa ser testada na sua conta.

## Antes de divulgar

1. Confirme no portal de afiliados que AppID e Secret estão habilitados para a Affiliate Open API brasileira.
2. Cadastre as duas variáveis privadas na Vercel e publique novamente.
3. Abra `/api/products` no domínio publicado. Uma resposta JSON com ofertas indica que a função conseguiu consultar e normalizar a API; erro 503 indica credenciais ausentes e erro 502 indica falha na consulta. Para erros 502, confira os logs de Functions na Vercel e as credenciais/permissões da Shopee.
4. Teste busca, categorias e links de compra. Revise o contato, os textos legais, a política de privacidade e o domínio em `sitemap.xml` e `robots.txt` antes de anunciar o site.

## Referências

- [Explorador oficial da Shopee Affiliate Open API Brasil](https://open-api.affiliate.shopee.com.br/explorer/v2)
- [Documentação da Vercel: configurar builds e arquivos estáticos](https://vercel.com/docs/builds/configure-a-build)
- [Documentação da Vercel: funções serverless](https://vercel.com/docs/functions)
