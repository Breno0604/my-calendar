# Plano de Implementação PWA — Sincronia Calendar

## Resumo

Transformar o Sincronia Calendar em um Progressive Web App (PWA) para permitir:
- **Instalação** como app nativo no celular/desktop
- **Funcionamento offline** com dados do localStorage
- **Cache inteligente** dos assets estáticos
- **Notificações push** (futuro, após PWA base)

---

## Stack Recomendada

| Ferramenta | Função | Por quê |
|------------|--------|---------|
| `vite-plugin-pwa` | Gera service worker + manifest | Integração nativa com Vite 8, mantém build atual |
| `Workbox` (via plugin) | Estratégias de cache | Maturidade, suporte a runtime caching |

Alternativa: service worker manual. Não recomendado — `vite-plugin-pwa` abstrai 90% do trabalho.

---

## Passo 1 — Instalação

```bash
npm install -D vite-plugin-pwa
```

Adicionar ao `vite.config.js`:

```js
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'Sincronia — Calendário Compartilhado',
        short_name: 'Sincronia',
        description: 'Organize seus compromissos pessoais e profissionais.',
        theme_color: '#8b5cf6',
        background_color: '#0f0f13',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            urlPattern: /^https:\/\/zrlkquovxffkpzghlfyr\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 5
            }
          }
        ]
      }
    })
  ]
})
```

### `registerType: 'autoUpdate'`

O service worker é atualizado silenciosamente quando o usuário recarrega a página. Sem popup "Atualizar". Decisão consciente para app pessoal.

---

## Passo 2 — Ícones PWA

Gerar a partir do `public/favicon.svg` ou `public/icons.svg`:

| Arquivo | Tamanho | Uso |
|---------|---------|-----|
| `public/pwa-192x192.png` | 192×192 | Icone de instalação |
| `public/pwa-512x512.png` | 512×512 | Splash screen / máscara |

**Ferramentas:**
- https://realfavicongenerator.net — gera todos os tamanhos a partir de um SVG
- Ou `npx pwa-asset-generator public/icons.svg public/`

---

## Passo 3 — Meta tags no `index.html`

Já existem:
- `<meta name="theme-color" content="#8b5cf6" />` ✅
- `<meta name="viewport" content="width=device-width, initial-scale=1.0" />` ✅
- `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` ✅

Adicionar:
```html
<link rel="apple-touch-icon" href="/pwa-192x192.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Sincronia" />
```

---

## Passo 4 — Offline com localStorage

O app **já funciona offline** porque os dados ficam em `localStorage` (`sincronia_events`, `sincronia_categories`). O service worker só precisa garantir que os assets (HTML, CSS, JS) estejam em cache.

### Estratégia de cache

| Recurso | Estratégia | Motivo |
|---------|-----------|--------|
| HTML (`index.html`) | `NetworkFirst` | Sempre tentar rede primeiro, fallback para cache |
| JS/CSS (hash Vite) | `CacheFirst` | Imutáveis (hash no nome do arquivo) |
| Imagens (`public/`) | `CacheFirst` | Mudam raramente |
| Google Fonts | `CacheFirst` | Carregadas uma vez, válidas por 1 ano |
| Supabase API | `NetworkFirst` | Dados atualizados, fallback para última resposta |

### Comportamento offline

| Ação | Online | Offline |
|------|--------|---------|
| Criar evento | Salva em localStorage + Supabase | Salva só em localStorage |
| Editar evento | Salva em localStorage + Supabase | Salva só em localStorage |
| Excluir evento | Remove de ambos | Remove só do localStorage |
| Visualizar calendário | Dados do Supabase via fetch | Dados do localStorage |
| Sincronia multi-dispositivo | Realtime + polling 30s | Não disponível (sem rede) |

Quando voltar a ficar online, o `doSync` (visibility change + polling) sincroniza automaticamente.

---

## Passo 5 — Service Worker Detalhado

O `vite-plugin-pwa` gera o service worker automaticamente com base na config do `workbox`. Não é necessário escrever SW manual.

### O que o SW gerado faz

1. **Pre-cache** de todos os assets no `build` (JS, CSS, HTML, SVG, PNG)
2. **Runtime cache** para Google Fonts e Supabase API
3. **Atualização automática** via `registerType: 'autoUpdate'`
4. **Skip waiting** na instalação (ativa o novo SW imediatamente no próximo reload)

### Arquivos gerados

| Arquivo | Localização | Função |
|---------|-------------|--------|
| `dist/sw.js` | Service worker | Cache runtime + pre-cache |
| `dist/workbox-*.js` | Workbox lib | Engine de cache |
| `dist/manifest.webmanifest` | Manifest PWA | Metadados de instalação |
| `dist/pwa-192x192.png` | Icone | Instalação |
| `dist/pwa-512x512.png` | Icone | Splash |

---

## Passo 6 — Netlify

### `netlify.toml` — sem alterações necessárias

O SPA redirect `/* → /index.html` já está configurado. O service worker (`/sw.js`) estará em `dist/sw.js` e será servido normalmente.

### Cache Headers (opcional)

Adicionar ao `netlify.toml` para maxizar cache dos assets com hash:

```toml
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

---

## Passo 7 — Testes

### Teste manual

1. `npm run build && npm run preview`
2. Abrir no Chrome, DevTools → Application → Manifest (verificar ícones, nome, cores)
3. DevTools → Application → Service Workers (verificar se está registrado)
4. DevTools → Network → Check "Offline" → recarregar → app deve carregar sem rede
5. Lighthouse → PWA audit (alvo: score 90+)

### Teste no Playwright

Adicionar ao `tests/features.spec.js` ou criar `tests/pwa.spec.js`:

```js
test('P1: manifest possui os campos obrigatórios', async ({ page }) => {
  await page.goto('/')
  const manifestLink = page.locator('link[rel="manifest"]')
  await expect(manifestLink).toHaveAttribute('href', /manifest\.webmanifest/)
})

test('P2: service worker está registrado', async ({ page }) => {
  await page.goto('/')
  const sw = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL)
  expect(sw).toContain('sw.js')
})
```

---

## Passo 8 — Sequência de Implementação

| Ordem | Tarefa | Depende de | Esforço |
|-------|--------|-----------|---------|
| 1 | Instalar `vite-plugin-pwa` | — | 1 min |
| 2 | Configurar `vite.config.js` com manifest + workbox | #1 | 15 min |
| 3 | Gerar ícones PWA (192×192, 512×512) | — | 5 min |
| 4 | Adicionar meta tags iOS no `index.html` | — | 2 min |
| 5 | Build + deploy + testar no Netlify | #2, #3, #4 | 10 min |
| 6 | Adicionar testes PWA no Playwright | #5 | 10 min |
| 7 | Lighthouse audit + ajustes finos | #5 | 15 min |

**Esforço total estimado:** ~1 hora

---

## Considerações

### Cache do Supabase

O runtime caching do Supabase (`NetworkFirst`) guarda a última resposta da API. Se o usuário criar um evento offline, ele aparecerá na UI (localStorage) mas o cache do Supabase pode estar desatualizado. O `doSync` na reconexão resolve.

### Tamanho do bundle

O Workbox adiciona ~20-30 KB ao JS total. Não impacta significativamente o app (já usa Supabase + XLSX).

### iOS (Safari)

O Safari suporta PWA desde iOS 11.3, mas com limitações:
- Service worker funciona ✅
- Push notifications ❌ (não suportadas no iOS)
- Cache de fontes pode falhar em modo offline

### Notificações Push (futuro)

Após o PWA base, implementar via:
- Supabase Realtime + Service Worker Push API
- VAPID keys (geradas no Supabase Dashboard)
- Requer permissão do usuário (`Notification.requestPermission`)

---

## Referências

- https://vite-pwa-org.netlify.app/guide/
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps
- https://web.dev/learn/pwa/
