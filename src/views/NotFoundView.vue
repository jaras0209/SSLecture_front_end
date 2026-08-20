<template>
  <div class="notfound-wrapper">
    <div class="glass-panel notfound-card text-center">
      <div class="notfound-emoji">🌌</div>
      <h1 class="notfound-code">404</h1>
      <h2 class="notfound-title">找不到這個頁面</h2>
      <p class="notfound-desc">您輸入的網址不存在，或頁面已被移除。</p>
      <button class="btn btn-primary mt-4" @click="goHome">回到首頁</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
function goHome() { router.push('/') }
</script>

<style scoped>
.notfound-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}
.notfound-card {
  max-width: 420px;
  width: 100%;
  padding: 3rem 2rem;
}
.notfound-emoji {
  font-size: 4rem;
  margin-bottom: 1rem;
}
.notfound-code {
  font-size: 5rem;
  font-weight: 900;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1;
  margin-bottom: 0.5rem;
}
.notfound-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 0.75rem;
}
.notfound-desc {
  color: var(--color-text-muted);
  font-size: 0.95rem;
}
</style>
