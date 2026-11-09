/**
 * @file csp.ts
 * @description 網站的內容安全政策（Content-Security-Policy）。
 *
 * 告訴瀏覽器只執行、只連線到我們自己的東西：萬一日後某處不小心把使用者輸入當成 HTML
 * 插入頁面（目前沒有：所有輸入都以文字顯示），被插入的程式也不會執行，也不能把資料
 * 送到別的網站。
 *
 * GitHub Pages 無法設定回應標頭，所以由 vite.config.ts 在建置時以 <meta> 標籤放進
 * index.html；開發伺服器的熱更新需要內嵌腳本，所以只在建置時加上。<meta> 版本的 CSP
 * 不支援 frame-ancestors（禁止被別的網站嵌入），之後改由自己的伺服器提供時請加在標頭。
 */

/** The policy for the built site; `apiBaseUrl` is VITE_API_BASE_URL */
export function contentSecurityPolicy(apiBaseUrl: string | undefined): string {
  const connect = ["'self'"]
  const api = originOf(apiBaseUrl)
  if (api) connect.push(api)

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    // Only our own bundled scripts: no inline scripts, no eval
    'script-src': ["'self'"],
    // Our stylesheets; Vue's :style bindings set styles through the DOM, which CSP allows
    'style-src': ["'self'"],
    // Avatars: built-in ones are data: URIs, a custom one may be any https address
    'img-src': ["'self'", 'data:', 'https:'],
    // Fonts are bundled; small ones may be inlined as data: URIs
    'font-src': ["'self'", 'data:'],
    // Our own files, and the API
    'connect-src': connect,
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"]
  }
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ')
}

/** "https://api.example.com" from "https://api.example.com/v1", or undefined if not a URL */
function originOf(url: string | undefined): string | undefined {
  if (!url) return undefined
  try {
    const { origin } = new URL(url)
    return origin === 'null' ? undefined : origin
  } catch {
    return undefined
  }
}
