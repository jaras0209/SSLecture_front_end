<template>
  <!-- Shining Dashboard Body -->
  <div class="shining-dashboard-body no-print">
    <!-- Toolbar with export -->
    <div class="shining-toolbar mb-4">
      <h3>✨ SS 閃耀計畫自我檢視平台</h3>
      <button class="btn btn-primary btn-sm" @click="triggerPrint">
        🖨️ 匯出簽名檔案 (PDF/列印)
      </button>
    </div>

    <div class="shining-grid">
      <!-- Row 1: Basic Info & Phase 1 Checklist -->
      <div class="shining-row-cols">
        <!-- Basic Info Form -->
        <div class="glass-panel shining-card-basic">
          <h4 class="shining-card-title">📝 個人基本資料</h4>
          <div class="basic-info-fields mt-4">
            <div class="form-group-inline">
              <span class="info-dot">✦</span>
              <label class="info-lbl">姓名：</label>
              <input v-model="basicInfo.name" type="text" class="form-input-clean" placeholder="請輸入姓名" />
            </div>
            <div class="form-group-inline">
              <span class="info-dot">✦</span>
              <label class="info-lbl">生日：</label>
              <input v-model="basicInfo.birthday" type="date" class="form-input-clean" />
            </div>
            <div class="form-group-inline">
              <span class="info-dot">✦</span>
              <label class="info-lbl">教會：</label>
              <input v-model="basicInfo.church" type="text" class="form-input-clean" placeholder="請輸入聚會教會" />
            </div>
            <div class="form-group-inline">
              <span class="info-dot">✦</span>
              <label class="info-lbl">學校/年級：</label>
              <input v-model="basicInfo.schoolGrade" type="text" class="form-input-clean" placeholder="例如: 師大附中 高一" />
            </div>
            <div class="text-right mt-2">
              <button class="btn btn-secondary btn-sm" @click="saveBasicInfo">儲存個人資料</button>
              <span v-if="basicSaveMsg" class="save-alert-msg">{{ basicSaveMsg }}</span>
            </div>
          </div>
        </div>

        <!-- Phase 1 Checklist -->
        <div class="glass-panel checklist-card">
          <h4 class="shining-card-title">🌟 信仰指標 Phase 1</h4>
          <div class="checklist-items mt-4">
            <label
              v-for="(label, key) in phase1Labels"
              :key="key"
              class="check-item-row"
            >
              <div class="check-box-wrapper">
                <input
                  type="checkbox"
                  :checked="shiningProject.faithPhase1[key]"
                  @change="toggleCheck('faithPhase1', key)"
                />
                <span class="styled-checkbox"></span>
              </div>
              <span class="check-label-text">{{ label }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Row 2: Phase 2 & Advanced Challenges -->
      <div class="shining-row-cols mt-4">
        <!-- Phase 2 Checklist -->
        <div class="glass-panel checklist-card">
          <h4 class="shining-card-title">🔥 信仰指標 Phase 2</h4>
          <div class="checklist-items mt-4">
            <template v-for="(label, key) in phase2Labels" :key="key">
              <label
                class="check-item-row"
                :class="{ 'special-progress-row': key === 'courses30' }"
              >
                <div class="check-box-wrapper">
                  <input
                    type="checkbox"
                    :checked="shiningProject.faithPhase2[key]"
                    @change="toggleCheck('faithPhase2', key)"
                  />
                  <span class="styled-checkbox"></span>
                </div>
                <div class="check-label-text-progress" v-if="key === 'courses30'">
                  <span>我已經聽完 30 個論</span>
                  <span class="progress-sub">{{ completedCount }}/30 堂課已聽完</span>
                </div>
                <span class="check-label-text" v-else>{{ label }}</span>
              </label>
            </template>
          </div>
        </div>

        <!-- Advanced Challenges Checklist -->
        <div class="glass-panel checklist-card">
          <h4 class="shining-card-title">🏆 進階挑戰</h4>
          <div class="checklist-items mt-4">
            <label
              v-for="(label, key) in advancedLabels"
              :key="key"
              class="check-item-row"
            >
              <div class="check-box-wrapper">
                <input
                  type="checkbox"
                  :checked="shiningProject.advancedChallenges[key]"
                  @change="toggleCheck('advancedChallenges', key)"
                />
                <span class="styled-checkbox"></span>
              </div>
              <!-- Custom item template -->
              <span v-if="key === 'custom'" class="custom-challenge-wrap">
                <input
                  type="text"
                  v-model="customChallengeText"
                  class="form-input-clean-custom"
                  placeholder="按此填寫您的自訂挑戰..."
                  @blur="saveCustomChallengeText"
                />
              </span>
              <span v-else class="check-label-text">{{ label }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Row 3: Special Lectures Tables -->
      <div class="shining-row-cols-tables mt-4">
        <!-- Character Lectures Table -->
        <div class="glass-panel table-card">
          <div class="table-card-header">
            <h4 class="shining-card-title">📖 不分階專題課：品格力</h4>
            <p class="table-sub-lbl">&lt;言語和行動&gt;會展現「人格」，在「人格」之上才有「信仰」和「主的話語」。</p>
          </div>
          <table class="shining-lecture-table mt-4">
            <thead>
              <tr>
                <th style="width: 40%">主題</th>
                <th style="width: 30%">講師</th>
                <th style="width: 30%">上課日期</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(theme, index) in characterThemes" :key="index">
                <td class="theme-title-cell">✦ {{ theme }}</td>
                <td>
                  <span v-if="shiningProject.characterLectures[theme]?.speaker">
                    {{ shiningProject.characterLectures[theme].speaker }}
                  </span>
                  <span v-else class="empty-input-cell">（待教師登錄）</span>
                </td>
                <td>
                  <span v-if="shiningProject.characterLectures[theme]?.date">
                    {{ shiningProject.characterLectures[theme].date }}
                  </span>
                  <span v-else class="empty-input-cell">（待教師登錄）</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Coming of Age Lectures Table -->
        <div class="glass-panel table-card mt-4">
          <div class="table-card-header">
            <h4 class="shining-card-title">🎓 成年禮必修專題課</h4>
            <p class="table-sub-lbl">向我學習後，也像這樣絕對相信、堅定地生活吧！</p>
          </div>
          <table class="shining-lecture-table mt-4">
            <thead>
              <tr>
                <th style="width: 40%">主題</th>
                <th style="width: 30%">講師</th>
                <th style="width: 30%">上課日期</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(theme, index) in comingOfAgeThemes" :key="index">
                <td class="theme-title-cell">✦ {{ theme }}</td>
                <td>
                  <span v-if="shiningProject.comingOfAgeTopics[theme]?.speaker">
                    {{ shiningProject.comingOfAgeTopics[theme].speaker }}
                  </span>
                  <span v-else class="empty-input-cell">（待教師登錄）</span>
                </td>
                <td>
                  <span v-if="shiningProject.comingOfAgeTopics[theme]?.date">
                    {{ shiningProject.comingOfAgeTopics[theme].date }}
                  </span>
                  <span v-else class="empty-input-cell">（待教師登錄）</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Signature boxes preview in UI -->
      <div class="glass-panel signatures-card mt-4">
        <h4 class="shining-card-title">📝 審核與簽章（實體匯出後供師長簽名）</h4>
        <div class="signature-box-preview-container mt-4">
          <div class="sig-box-preview">
            <span class="sig-title-p">✦ 教師 ✦</span>
            <div class="sig-circle-p">簽名處</div>
          </div>
          <div class="sig-box-preview">
            <span class="sig-title-p">✦ 牧者 ✦</span>
            <div class="sig-circle-p">簽名處</div>
          </div>
          <div class="sig-box-preview">
            <span class="sig-title-p">✦ SS中央 ✦</span>
            <div class="sig-circle-p">簽名處</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- DEDICATED HIGH-FIDELITY HTML PRINT TEMPLATE -->
  <!-- Teleport 到 body 以避免被 #app-container display:none 遮蔽 -->
  <Teleport to="body">
    <div class="print-page-layout print-only">
    <div class="print-container">
      <!-- Banner Header -->
      <div class="print-banner">
        <div class="print-banner-logo">SS閃耀計畫</div>
        <div class="print-banner-sub">SHINING PROJECT</div>
      </div>

      <!-- Grid Row 1: Basic Info & Phase 1 Check list -->
      <div class="print-flex-row mt-4">
        <!-- Basic Info Box -->
        <div class="print-box print-w-45">
          <h4 class="print-box-title">【基本資料】</h4>
          <div class="print-box-content">
            <p class="print-info-line"><span>✦ 姓名：</span><strong>{{ shiningProject.name || '____________' }}</strong></p>
            <p class="print-info-line"><span>✦ 生日：</span><strong>{{ shiningProject.birthday || '____________' }}</strong></p>
            <p class="print-info-line"><span>✦ 教會：</span><strong>{{ shiningProject.church || '____________' }}</strong></p>
            <p class="print-info-line"><span>✦ 學校/年級：</span><strong>{{ shiningProject.schoolGrade || '____________' }}</strong></p>
          </div>
        </div>

        <!-- Phase 1 Checklist Box -->
        <div class="print-box print-w-50">
          <h4 class="print-box-title">【信仰指標 PHASE 1】</h4>
          <div class="print-box-content print-checklist">
            <div
              v-for="(label, key) in phase1Labels"
              :key="key"
              class="print-check-line"
            >
              <span class="print-check-circle" :class="{ checked: shiningProject.faithPhase1[key] }">
                {{ shiningProject.faithPhase1[key] ? '✓' : '' }}
              </span>
              <span class="print-check-text">{{ label }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Grid Row 2: Phase 2 Checklist & Advanced Challenges -->
      <div class="print-flex-row mt-4">
        <!-- Phase 2 Checklist Box -->
        <div class="print-box print-w-48">
          <h4 class="print-box-title">【信仰指標 PHASE 2】</h4>
          <div class="print-box-content print-checklist">
            <template v-for="(label, key) in phase2Labels" :key="key">
              <div class="print-check-line">
                <span class="print-check-circle" :class="{ checked: shiningProject.faithPhase2[key] }">
                  {{ shiningProject.faithPhase2[key] ? '✓' : '' }}
                </span>
                <span class="print-check-text" v-if="key === 'courses30'">
                  我已經聽完 30 個論 (聽課數: {{ completedCount }}/30)
                </span>
                <span class="print-check-text" v-else>{{ label }}</span>
              </div>
            </template>
          </div>
        </div>

        <!-- Advanced Challenges Box -->
        <div class="print-box print-w-48">
          <h4 class="print-box-title">【進階挑戰】</h4>
          <div class="print-box-content print-checklist">
            <div
              v-for="(label, key) in advancedLabels"
              :key="key"
              class="print-check-line"
            >
              <span class="print-check-circle" :class="{ checked: shiningProject.advancedChallenges[key] }">
                {{ shiningProject.advancedChallenges[key] ? '✓' : '' }}
              </span>
              <span class="print-check-text" v-if="key === 'custom'">
                {{ shiningProject.customChallenge || '自訂挑戰項目（未填寫）' }}
              </span>
              <span class="print-check-text" v-else>{{ label }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Table 1: Character -->
      <div class="print-table-box mt-4">
        <h4 class="print-box-title">【不分階專題課：品格力】</h4>
        <p class="print-box-subtitle">&lt;言語和行動&gt;會展現「人格」。在「人格」之上才有「信仰」和「主的話語」。</p>
        <table class="print-table">
          <thead>
            <tr>
              <th>主題</th>
              <th>講師</th>
              <th>上課日期</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(theme, index) in characterThemes" :key="index">
              <td>✦ {{ theme }}</td>
              <td>{{ shiningProject.characterLectures[theme]?.speaker || '' }}</td>
              <td>{{ shiningProject.characterLectures[theme]?.date || '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Table 2: Coming of Age -->
      <div class="print-table-box mt-4">
        <h4 class="print-box-title">【成年禮必修專題課】</h4>
        <p class="print-box-subtitle">向我學習後，也像這樣絕對相信、堅定地生活吧！</p>
        <table class="print-table">
          <thead>
            <tr>
              <th>主題</th>
              <th>講師</th>
              <th>上課日期</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(theme, index) in comingOfAgeThemes" :key="index">
              <td>✦ {{ theme }}</td>
              <td>{{ shiningProject.comingOfAgeTopics[theme]?.speaker || '' }}</td>
              <td>{{ shiningProject.comingOfAgeTopics[theme]?.date || '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Bottom Signatures row -->
      <div class="print-signatures-box mt-4">
        <h4 class="print-box-title">【審核簽名】</h4>
        <div class="print-signatures-row mt-2">
          <div class="print-sig-col">
            <span class="print-sig-lbl">✦ 教師</span>
            <div class="print-sig-space">{{ assignedTeacher }}</div>
          </div>
          <div class="print-sig-col">
            <span class="print-sig-lbl">✦ 牧者</span>
            <div class="print-sig-space">{{ assignedPastor }}</div>
          </div>
          <div class="print-sig-col">
            <span class="print-sig-lbl">✦ 家長/導師</span>
            <div class="print-sig-space">{{ assignedParent }}</div>
          </div>
        </div>
      </div>
    </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import type { ShiningChecklistKey } from '@/stores/courses'

const authStore = useAuthStore()
const coursesStore = useCoursesStore()

// ── Shining Project Data ──────────────────────────────────────────────────────

const shiningProject = computed(() => {
  const username = authStore.currentUser?.username || ''
  return coursesStore.getShiningProject(username)
})

const basicInfo = reactive({
  name: '',
  birthday: '',
  church: '',
  schoolGrade: ''
})

const customChallengeText = ref('')
const basicSaveMsg = ref('')

watch(shiningProject, (newProj) => {
  if (newProj) {
    basicInfo.name = newProj.name || ''
    basicInfo.birthday = newProj.birthday || ''
    basicInfo.church = newProj.church || ''
    basicInfo.schoolGrade = newProj.schoolGrade || ''
    customChallengeText.value = newProj.customChallenge || ''
  }
}, { immediate: true })

// ── Caretaker Info (for print signatures) ────────────────────────────────────

const assignedTeacher = computed(() => {
  const username = authStore.currentUser?.username || ''
  return coursesStore.getStudentCaretaker(username, 'teacher')
})

const assignedPastor = computed(() => {
  const username = authStore.currentUser?.username || ''
  return coursesStore.getStudentCaretaker(username, 'pastor')
})

const assignedParent = computed(() => {
  const username = authStore.currentUser?.username || ''
  return coursesStore.getStudentCaretaker(username, 'parent')
})

// ── Themes ────────────────────────────────────────────────────────────────────

const characterThemes = computed(() => {
  const church = authStore.currentUser?.church || '愛與話語'
  return coursesStore.getThemesByChurch('character', church)
})
const comingOfAgeThemes = computed(() => {
  const church = authStore.currentUser?.church || '愛與話語'
  return coursesStore.getThemesByChurch('comingOfAge', church)
})

// ── Course Completion Count (for Phase 2 progress bar) ───────────────────────

const completedCount = computed(() => {
  const username = authStore.currentUser?.username || ''
  const userRecords = coursesStore.progressDb[username]
  if (!userRecords) return 0
  return Object.values(userRecords).filter(r => r.completed).length
})

// ── Actions ───────────────────────────────────────────────────────────────────

function saveBasicInfo() {
  const username = authStore.currentUser?.username || ''
  coursesStore.updateShiningBasicInfo(username, basicInfo)
  basicSaveMsg.value = '✓ 儲存成功！'
  setTimeout(() => { basicSaveMsg.value = '' }, 3000)
}

function toggleCheck(category: 'faithPhase1' | 'faithPhase2' | 'advancedChallenges', key: ShiningChecklistKey) {
  const username = authStore.currentUser?.username || ''
  const checklist = shiningProject.value[category] as Record<string, boolean>
  const currentValue = checklist[key]
  coursesStore.updateShiningChecklist(username, category, key, !currentValue)
}

function saveCustomChallengeText() {
  const username = authStore.currentUser?.username || ''
  coursesStore.updateShiningCustomChallenge(username, customChallengeText.value)
}

function triggerPrint() {
  window.print()
}

// ── Static Checklist Labels ───────────────────────────────────────────────────

const phase1Labels = {
  worship: '我每週都有持守主日禮拜',
  prayer: '我每天都會禱告至少 10-15 分鐘',
  independent: '我不會依賴父母，會自主參與信仰',
  reply: '我會主動聯絡教師並回覆訊息',
  share: '我願意分享我的體會和經歷'
}

const phase2Labels = {
  courses30: '我已經聽完 30 個論',
  prayerLong: '我每天都會禱告至少 20-30 分鐘',
  morningWorship: '我每週都至少參與一次清晨禮拜',
  readBible: '我已經讀完一遍新約和舊約',
  churchService: '我有參與教會服事或領受使命'
}

const advancedLabels = {
  wednesday: '定期參與週三禮拜',
  shareFaith: '願意和同學分享信仰',
  copySermon: '抄寫一篇主日話語',
  morningProverb: '每天閱讀清晨箴言',
  custom: '自訂挑戰：'
}
</script>

<!-- 不加 scoped：Teleport 將 print-only 移至 body，scoped 樣式無法跨越 -->
<style>
/* 螢幕上隱藏列印模板 */
.print-page-layout.print-only {
  display: none;
}

/* 列印時顯示 */
@media print {
  .print-page-layout.print-only {
    display: block !important;
  }
}
</style>
