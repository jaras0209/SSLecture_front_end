# SSLecture OAuth2 社群登入設計規格

> **文件版本**：v1.0.0
> **最後更新**：2026-08-12
> **適用後端**：Spring Boot 3.x（Spring Security 6.x OAuth2 Client）
> **適用前端**：Vue 3 + TypeScript + Pinia

---

## 目錄

1. [設計概述](#1-設計概述)
2. [整體流程架構圖](#2-整體流程架構圖)
3. [Google 登入流程規格](#3-google-登入流程規格)
4. [LINE 登入流程規格](#4-line-登入流程規格)
5. [後端 Spring Boot 實作規格](#5-後端-spring-boot-實作規格)
6. [前端 Vue 3 整合規格](#6-前端-vue-3-整合規格)
7. [帳號綁定與衝突處理策略](#7-帳號綁定與衝突處理策略)
8. [安全性設計](#8-安全性設計)
9. [第三方平台設定清單](#9-第三方平台設定清單)
10. [API 端點定義](#10-api-端點定義)

---

## 1. 設計概述

### 1.1 目前前端實作的問題

目前 `auth.ts` 的 `loginWithThirdParty()` 是**純模擬**實作（行 177-204）：

```typescript
// 目前實作（auth.ts L177-204）—— 僅為 mock，不做任何實際 OAuth2 流程
async function loginWithThirdParty(method: 'google' | 'line', ...) {
  isAuthenticating.value = true
  await new Promise(resolve => setTimeout(resolve, 1500)) // 假延遲
  const username = `GoogleSS學員_${randomSuffix}`        // 假帳號
  currentUser.value = { username, role: customRole, ... } // 直接設定，無驗證
  isAuthenticating.value = false
}
```

`LoginView.vue` 中的 Google / LINE 按鈕（行 230-246）點擊後，
會開啟一個 4 步驟的模擬 Modal（role-select → church-select → student-bind → processing），
最終呼叫上述 mock 函式。

**缺失**：
- ❌ 沒有實際的 OAuth2 Authorization Code Flow
- ❌ 沒有向 Google/LINE 發起任何 HTTP 請求
- ❌ 角色由前端任意指定（安全漏洞）
- ❌ 沒有 state / CSRF 防護
- ❌ 沒有帳號首次登入的教會選擇流程（onboarding）
- ❌ 每次登入會產生不同的亂數 username，無法重複登入同一帳號

### 1.2 設計目標

採用業界標準的 **Authorization Code Flow**，由後端 Spring Boot 處理完整的 OAuth2 授權流程，
並在認證成功後發行 JWT，前端 Vue SPA 僅處理回調和 token 儲存。

### 1.3 版本備註

> **注意**：使用者提及 **Spring Boot 4.1.0**，但截至本文件撰寫時（2026-08），
> Spring Boot 穩定版為 **3.x**（含 Spring Security 6.x）。
> Spring Boot 4.x 需 Java 21+ 並預計稍後正式釋出，其 OAuth2 的 API 與以下規格**高度相容**。
> 本文件以 **Spring Boot 3.x / Spring Security 6.x** 為基準撰寫，差異處已加以標記。

---

## 2. 整體流程架構圖

### 2.1 Authorization Code Flow（標準 OAuth2 授權碼流程）

```
使用者瀏覽器              Vue 前端 SPA           Spring Boot 後端       Google / LINE
      |                        |                        |                    |
      | 點擊「Google 登入」     |                        |                    |
      |----------------------->|                        |                    |
      |                        | 導向後端 OAuth2 啟動端點 |                    |
      |                        | /oauth2/authorization/google                |
      |<---------------------------------------------------------------------------
      | 302 → 導向 Google 登入頁                                              |
      |--------------------------------------------------------------------------->|
      | 使用者同意授權                                                          |
      |<----------------------------------------------------------------------------|
      | 302 → /login/oauth2/code/google?code=AUTH_CODE&state=STATE            |
      |------------------------------------------------>|                    |
      |                                                  | 用 code 換 token   |
      |                                                  |-------------------->|
      |                                                  |<--------------------|
      |                                                  | 取得使用者 Profile  |
      |                                                  | 查詢或建立 User      |
      |                                                  | 產生 JWT（短效 code）|
      |                        | 302 → /login/callback?code=SHORT_CODE        |
      |<-----------------------|                        |                    |
      | 前端呼叫 POST /auth/exchange?code=SHORT_CODE     |                    |
      |------------------------------------------------>|                    |
      |                        |<------------------------|                    |
      |                        | 儲存 accessToken / refreshToken              |
      |                        | 導向對應 Dashboard                           |
```

### 2.2 首次登入 Onboarding 流程

```
OAuth 認證成功
      |
      v
後端回傳 needsOnboarding: true
      |
      v
前端導向 /onboarding 頁面
  |- 選擇所屬教會（必填）
  |- 設定 username（可選，預設用 displayName）
  `- 輸入邀請碼（可選，升級角色用）
      |
      v
PUT /auth/complete-profile
      |
      v
導向對應 Dashboard
```

---

## 3. Google 登入流程規格

### 3.1 前置準備（Google Cloud Console）

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立 OAuth 2.0 用戶端 ID（類型：**Web 應用程式**）
3. 加入「已授權的重新導向 URI」：

```
# 開發環境
http://localhost:8080/login/oauth2/code/google

# 正式環境
https://api.sslecture.example.com/login/oauth2/code/google
```

4. 取得 `Client ID` 和 `Client Secret`

### 3.2 取得的使用者資訊（Scope）

| Scope | 取得欄位 | 說明 |
|-------|---------|------|
| `openid` | `sub`（Google User ID）| 唯一識別碼 |
| `profile` | `name`、`given_name`、`picture` | 顯示名稱和頭像 |
| `email` | `email`、`email_verified` | 電子郵件 |

### 3.3 帳號對應邏輯

```
Google sub（唯一 ID）
    |
    v
SELECT * FROM social_accounts WHERE provider='google' AND provider_user_id=?
    |
    |-- 找到 --> 正常登入，更新 last_login_at
    |
    `-- 找不到 --> 查詢 email 是否存在於 users 表
                    |
                    |-- email 已存在 --> 綁定 google_sub 到現有帳號 --> 正常登入
                    |
                    `-- 全新使用者 --> 建立新 User（role=student, church=null）
                                       回傳 needsOnboarding=true
```

---

## 4. LINE 登入流程規格

### 4.1 前置準備（LINE Developers Console）

1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 建立 Provider 和 Channel（類型：**LINE Login**）
3. 加入 Callback URL：

```
# 開發環境
http://localhost:8080/login/oauth2/code/line

# 正式環境
https://api.sslecture.example.com/login/oauth2/code/line
```

4. 啟用 Scopes：`profile`、`openid`、`email`（email 需另外申請）
5. 取得 `Channel ID`（= Client ID）和 `Channel Secret`

### 4.2 取得的使用者資訊（Scope）

| Scope | 取得欄位 | 說明 |
|-------|---------|------|
| `openid` | `sub`（LINE User ID）| 唯一識別碼 |
| `profile` | `name`、`picture` | LINE 顯示名稱和頭像 |
| `email` | `email` | 需申請權限，部分地區受限 |

> **警告**：LINE 的 `email` scope 在部分地區需額外審查。
> 建議以 `sub`（LINE User ID）作為主要識別碼，而非依賴 email。
> 若 email 取不到，onboarding 流程中請使用者手動補填。

### 4.3 LINE API 端點

| 用途 | URL |
|------|-----|
| 授權 | `https://access.line.me/oauth2/v2.1/authorize` |
| Token 換發 | `https://api.line.me/oauth2/v2.1/token` |
| 使用者資訊 | `https://api.line.me/v2/profile` |
| Issuer（OIDC）| `https://access.line.me` |

---

## 5. 後端 Spring Boot 實作規格

### 5.1 Maven 依賴（pom.xml）

```xml
<dependencies>
    <!-- OAuth2 Client（處理 Authorization Code Flow） -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-oauth2-client</artifactId>
    </dependency>

    <!-- Spring Security -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>

    <!-- Web -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!-- JWT（JJWT 0.12+） -->
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-api</artifactId>
        <version>0.12.5</version>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-impl</artifactId>
        <version>0.12.5</version>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-jackson</artifactId>
        <version>0.12.5</version>
        <scope>runtime</scope>
    </dependency>

    <!-- Redis（儲存短效 code） -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-redis</artifactId>
    </dependency>
</dependencies>
```

### 5.2 application.yml 設定

```yaml
spring:
  security:
    oauth2:
      client:
        registration:
          google:
            client-id: ${GOOGLE_CLIENT_ID}
            client-secret: ${GOOGLE_CLIENT_SECRET}
            scope: openid, profile, email
            redirect-uri: "{baseUrl}/login/oauth2/code/{registrationId}"

          line:
            client-id: ${LINE_CHANNEL_ID}
            client-secret: ${LINE_CHANNEL_SECRET}
            scope: openid, profile, email
            authorization-grant-type: authorization_code
            redirect-uri: "{baseUrl}/login/oauth2/code/{registrationId}"
            client-name: LINE

        provider:
          line:
            authorization-uri: https://access.line.me/oauth2/v2.1/authorize
            token-uri: https://api.line.me/oauth2/v2.1/token
            user-info-uri: https://api.line.me/v2/profile
            user-name-attribute: sub

app:
  jwt:
    secret: ${JWT_SECRET}
    access-token-expiry: 3600       # 1 小時（秒）
    refresh-token-expiry: 2592000   # 30 天（秒）
  frontend:
    callback-url: ${FRONTEND_URL}/login/callback
  cors:
    allowed-origins:
      - http://localhost:5173
      - https://sslecture.example.com
```

### 5.3 SecurityConfig.java

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired private OAuth2AuthenticationSuccessHandler oAuth2SuccessHandler;
    @Autowired private OAuth2AuthenticationFailureHandler oAuth2FailureHandler;
    @Autowired private JwtAuthenticationFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/login/oauth2/**", "/oauth2/**").permitAll()
                .requestMatchers("/auth/login", "/auth/register",
                                 "/auth/refresh", "/auth/exchange").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2Login(oauth2 -> oauth2
                .successHandler(oAuth2SuccessHandler)
                .failureHandler(oAuth2FailureHandler)
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
```

### 5.4 OAuth2AuthenticationSuccessHandler.java（核心）

```java
@Component
public class OAuth2AuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    @Autowired private UserService userService;
    @Autowired private ShortCodeService shortCodeService; // Redis 短效 code 管理
    @Value("${app.frontend.callback-url}") private String frontendCallbackUrl;

    @Override
    public void onAuthenticationSuccess(
        HttpServletRequest request,
        HttpServletResponse response,
        Authentication authentication
    ) throws IOException {

        OidcUser oidcUser = (OidcUser) authentication.getPrincipal();

        String provider       = extractProvider(request); // "google" | "line"
        String providerUserId = oidcUser.getSubject();    // sub claim
        String email          = oidcUser.getEmail();
        String displayName    = oidcUser.getFullName();
        String avatarUrl      = oidcUser.getPicture();

        // 在 DB 查找或建立使用者
        UserResult result = userService.findOrCreateOAuthUser(
            provider, providerUserId, email, displayName, avatarUrl
        );

        // 產生短效一次性 code（60 秒，儲存於 Redis）
        String shortCode = shortCodeService.generate(result);

        // Redirect 到前端 callback（只帶短效 code，不帶 JWT）
        String redirectUrl = UriComponentsBuilder
            .fromUriString(frontendCallbackUrl)
            .queryParam("code", shortCode)
            .build().toUriString();

        response.sendRedirect(redirectUrl);
    }
}
```

### 5.5 UserService.findOrCreateOAuthUser（帳號查找或建立）

```java
@Transactional
public UserResult findOrCreateOAuthUser(
    String provider, String providerUserId,
    String email, String displayName, String avatarUrl
) {
    // 1. 查 social_accounts 表
    Optional<SocialAccount> social = socialAccountRepo
        .findByProviderAndProviderUserId(provider, providerUserId);

    if (social.isPresent()) {
        User user = social.get().getUser();
        user.setLastLoginAt(Instant.now());
        user.setAvatarUrl(avatarUrl);
        return new UserResult(userRepo.save(user), false);
    }

    // 2. 查 email 是否已有帳號
    if (email != null) {
        Optional<User> byEmail = userRepo.findByEmail(email);
        if (byEmail.isPresent()) {
            socialAccountRepo.save(new SocialAccount(provider, providerUserId, byEmail.get()));
            return new UserResult(byEmail.get(), false);
        }
    }

    // 3. 建立全新帳號
    User newUser = new User();
    newUser.setDisplayName(displayName);
    newUser.setEmail(email);
    newUser.setAvatarUrl(avatarUrl);
    newUser.setRole(UserRole.STUDENT);   // 預設學員
    newUser.setIsActive(true);
    newUser.setChurchId(null);           // onboarding 時補填
    userRepo.save(newUser);

    socialAccountRepo.save(new SocialAccount(provider, providerUserId, newUser));

    return new UserResult(newUser, true); // needsOnboarding = true
}
```

### 5.6 新增資料表：social_accounts

```sql
CREATE TABLE social_accounts (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider         VARCHAR(20)  NOT NULL,       -- 'google' | 'line'
  provider_user_id VARCHAR(100) NOT NULL,        -- Google sub / LINE userId
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_social_provider UNIQUE (provider, provider_user_id)
);

CREATE INDEX idx_social_accounts_user     ON social_accounts(user_id);
CREATE INDEX idx_social_accounts_provider ON social_accounts(provider, provider_user_id);
```

同時修改 `users` 表，補充 email 欄位：

```sql
ALTER TABLE users
  ADD COLUMN email          VARCHAR(255) UNIQUE,
  ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;
```

---

## 6. 前端 Vue 3 整合規格

### 6.1 修改 LoginView.vue（行 230-246 的按鈕邏輯）

移除 mock Modal，改為直接導向後端啟動端點：

```typescript
// 移除舊邏輯（openOAuthModal / confirmOAuthLogin 相關 Modal）
// 替換為：

const API_BASE = import.meta.env.VITE_API_BASE_URL

function loginWithGoogle() {
  window.location.href = `${API_BASE}/oauth2/authorization/google`
}

function loginWithLine() {
  window.location.href = `${API_BASE}/oauth2/authorization/line`
}
```

按鈕 template：

```html
<button @click="loginWithGoogle" type="button" class="social-btn google-btn">
  <img src="https://cdn-icons-png.flaticon.com/512/300/300221.png" alt="Google" />
  Google 登入
</button>
<button @click="loginWithLine" type="button" class="social-btn line-btn">
  <img src="https://cdn-icons-png.flaticon.com/512/124/124027.png" alt="LINE" />
  LINE 登入
</button>
```

### 6.2 新增 LoginCallback.vue（/login/callback）

```typescript
// src/views/LoginCallback.vue（新增）
<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route  = useRoute()
const authStore = useAuthStore()

onMounted(async () => {
  const code  = route.query.code as string
  const error = route.query.error as string

  if (error || !code) {
    router.push('/login?error=oauth_failed')
    return
  }

  // 用短效 code 換取 JWT
  const result = await authStore.exchangeOAuthCode(code)

  if (!result.success) {
    router.push('/login?error=oauth_failed')
    return
  }

  if (result.needsOnboarding) {
    router.push('/onboarding')
  } else {
    router.push(getRoleRedirectPath(authStore.currentUser?.role))
  }
})
</script>

<template>
  <div class="callback-loading">
    <div class="spinner" />
    <p>正在完成登入，請稍候...</p>
  </div>
</template>
```

### 6.3 新增 OnboardingView.vue（/onboarding）

首次社群登入後，引導使用者選擇教會並可選填邀請碼：

```typescript
// src/views/OnboardingView.vue（新增）

async function completeOnboarding() {
  if (!selectedChurchId.value) {
    showError('請選擇所屬教會')
    return
  }
  await authStore.completeProfile({
    churchId: selectedChurchId.value,
    username: customUsername.value || undefined,
    inviteCode: inviteCode.value || undefined
  })
  router.push(getRoleRedirectPath(authStore.currentUser?.role))
}
```

### 6.4 修改 auth.ts Store（新增 actions）

```typescript
// 新增：用短效 code 換取 JWT
async function exchangeOAuthCode(
  code: string
): Promise<{ success: boolean; needsOnboarding: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/auth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    })
    const data = await res.json()
    if (!data.success) return { success: false, needsOnboarding: false }

    safeSet('superstart_access_token',  data.data.accessToken)
    safeSet('superstart_refresh_token', data.data.refreshToken)
    currentUser.value = data.data.user

    return { success: true, needsOnboarding: data.data.needsOnboarding }
  } catch {
    return { success: false, needsOnboarding: false }
  }
}

// 新增：完成 onboarding 補充資料
async function completeProfile(payload: {
  churchId: string
  username?: string
  inviteCode?: string
}): Promise<{ success: boolean; message: string }> {
  const token = safeGet<string>('superstart_access_token', '')
  const res = await fetch(`${API_BASE}/auth/complete-profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  })
  const data = await res.json()
  if (data.success) currentUser.value = data.data.user
  return { success: data.success, message: data.error?.message ?? '完成' }
}

// 移除或保留（dev mock 用途）：loginWithThirdParty
// 建議以 IS_DEV_MOCK 環境變數決定是否保留
```

### 6.5 環境變數設定（.env）

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:8080

# .env.production
VITE_API_BASE_URL=https://api.sslecture.example.com
```

### 6.6 Router 新增路由

```typescript
// router/index.ts
{
  path: '/login/callback',
  component: () => import('@/views/LoginCallback.vue'),
  meta: { requiresAuth: false }
},
{
  path: '/onboarding',
  component: () => import('@/views/OnboardingView.vue'),
  meta: { requiresAuth: true }
}
```

---

## 7. 帳號綁定與衝突處理策略

### 7.1 衝突情境矩陣

| 情境 | 條件 | 處理方式 |
|------|------|---------|
| 首次 Google 登入 | 無現有帳號 | 建立新帳號（student），要求選教會 |
| 重複 Google 登入 | social_accounts 已有紀錄 | 直接登入，更新 last_login_at |
| Google 登入 email 與密碼帳號相同 | users.email 已存在 | 自動綁定，不建立新帳號 |
| 首次 LINE 登入 | 無現有帳號 | 建立新帳號，要求選教會 |
| LINE 無 email 首次登入 | LINE email scope 未授予 | 建立帳號，onboarding 時請使用者填 email |
| 同一人有 Google + LINE | 後登入 provider email 與前者相同 | 自動綁定到同一帳號 |
| 社群登入 + 邀請碼 | onboarding 時輸入邀請碼 | 角色升級為邀請碼指定角色 |

### 7.2 多 Provider 支援

一個 `user_id` 可對應多個 `social_accounts`：

```
users.id = "uuid-001"（王小明）
  └── social_accounts: provider=google, provider_user_id=G_12345
  └── social_accounts: provider=line,   provider_user_id=U_abcde
```

---

## 8. 安全性設計

### 8.1 短效 Code 換 Token（防 Token 出現在 URL 記錄中）

OAuth 回調不直接在 URL 帶 JWT，而是帶一個**短效一次性 code**：

```
後端成功驗證後 → 產生 short_code（UUID，TTL 60 秒，存 Redis）
                → Redirect 前端：/login/callback?code=short_code

前端拿到 code → POST /auth/exchange { code }
後端驗證 code → 刪除 Redis 中的 code（一次性）
              → 回傳 JWT { accessToken, refreshToken, needsOnboarding }
```

### 8.2 JWT 設計

```
Access Token：
  有效期：1 小時
  Payload：{ sub: userId, role, churchId, provider, iat, exp }
  儲存：localStorage（或 Pinia 記憶體）

Refresh Token：
  有效期：30 天
  儲存：後端 DB（refresh_tokens 表）+ 前端 localStorage
  Rotation：每次刷新後，舊 token 失效，發行新 token
```

### 8.3 Token 安全等級比較

| 傳遞方式 | 安全性 | 說明 |
|---------|--------|------|
| URL Query Parameter（直帶 JWT）| 低 | Token 出現在 server log / 瀏覽器歷史 |
| 短效 code → 再換 JWT（本方案）| 中高 | Code 60 秒過期，一次性使用 |
| HttpOnly Cookie | 最高 | 需處理跨域 SameSite 設定 |

### 8.4 帳號停用處理

`users.is_active = false` 時，JWT 過濾器拒絕所有請求，返回 `403 ACCOUNT_DISABLED`。

---

## 9. 第三方平台設定清單

### 9.1 Google Cloud Console

- [ ] 建立 OAuth 2.0 Client ID（Web 應用程式）
- [ ] 設定重新導向 URI：
  - `http://localhost:8080/login/oauth2/code/google`
  - `https://api.sslecture.example.com/login/oauth2/code/google`
- [ ] 取得 `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`

### 9.2 LINE Developers Console

- [ ] 建立 LINE Login Channel
- [ ] 設定 Callback URL：
  - `http://localhost:8080/login/oauth2/code/line`
  - `https://api.sslecture.example.com/login/oauth2/code/line`
- [ ] 申請 Email Address Permission
- [ ] 取得 `LINE_CHANNEL_ID`、`LINE_CHANNEL_SECRET`

### 9.3 環境變數清單

| 環境變數 | 說明 |
|---------|------|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `LINE_CHANNEL_ID` | LINE Channel ID |
| `LINE_CHANNEL_SECRET` | LINE Channel Secret |
| `JWT_SECRET` | JWT 簽名密鑰（256-bit+，用 `openssl rand -base64 32` 生成）|
| `FRONTEND_URL` | 前端 SPA URL（如 `https://sslecture.example.com`）|
| `REDIS_HOST` | Redis 主機（儲存短效 code）|

---

## 10. API 端點定義

### Spring Boot 自動提供的端點（無需手動實作）

| 端點 | 說明 | 誰呼叫 |
|------|------|--------|
| `GET /oauth2/authorization/google` | 啟動 Google OAuth2 流程 | 前端（window.location.href）|
| `GET /oauth2/authorization/line` | 啟動 LINE OAuth2 流程 | 前端（window.location.href）|
| `GET /login/oauth2/code/google` | Google 回調（Spring 自動處理）| Google |
| `GET /login/oauth2/code/line` | LINE 回調（Spring 自動處理）| LINE |

### 自定義 API 端點（需手動實作）

#### `POST /auth/exchange` ⭐ NEW
**說明**：使用短效一次性 code 換取 JWT

**權限**：公開

**Request Body**：
```json
{ "code": "550e8400-e29b-41d4-a716-446655440000" }
```

**Response**：
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "expiresIn": 3600,
    "needsOnboarding": false,
    "user": {
      "id": "uuid-001",
      "displayName": "王小明",
      "role": "student",
      "churchId": null,
      "avatarUrl": "https://lh3.googleusercontent.com/..."
    }
  }
}
```

**錯誤**：
- `400 INVALID_CODE`：code 不存在或已過期（60 秒）
- `400 CODE_ALREADY_USED`：code 已被使用（一次性）

---

#### `PUT /auth/complete-profile` ⭐ NEW
**說明**：首次社群登入後補充資料（教會、username、邀請碼）

**權限**：需 JWT

**Request Body**：
```json
{
  "churchId": "uuid-church-001",
  "username": "wangxiaoming",
  "inviteCode": "SS-TCH-A3F7"
}
```

**Response**：
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-001",
      "username": "wangxiaoming",
      "role": "teacher",
      "church": "愛與話語"
    }
  }
}
```

**錯誤**：
- `400 CHURCH_REQUIRED`：教會為必填
- `400 INVALID_INVITE_CODE`：邀請碼無效
- `409 USERNAME_TAKEN`：username 已存在

---

#### `GET /auth/social-accounts` ⭐ NEW
**說明**：取得目前登入使用者已綁定的社群帳號列表

**權限**：需 JWT

**Response**：
```json
{
  "success": true,
  "data": [
    { "provider": "google", "linkedAt": "2026-08-12T10:00:00Z" },
    { "provider": "line",   "linkedAt": "2026-08-12T11:00:00Z" }
  ]
}
```

---

#### `DELETE /auth/social-accounts/{provider}` ⭐ NEW
**說明**：解除特定社群帳號綁定

**權限**：需 JWT

**錯誤**：
- `400 CANNOT_UNLINK_ONLY_LOGIN`：這是唯一的登入方式，無法解除

---

## 附錄：資料庫異動摘要

| 異動 | 內容 |
|------|------|
| 新增 `social_accounts` 表 | 儲存 OAuth 帳號綁定（provider + provider_user_id）|
| `users` 表新增欄位 | `email VARCHAR(255) UNIQUE`、`email_verified BOOLEAN` |
| `login_method` ENUM 不變 | 原有 `credentials / google / line`，代表**首次**登入方式 |

---

*本文件由系統分析自動生成。後端工程師實作前，請確認已完成第 9 章的第三方平台設定，並正確配置環境變數。*
