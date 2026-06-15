<template>
  <div class="student-dashboard container">
    <!-- Header Summary Panel -->
    <header class="dashboard-header glass-panel no-print">
      <div class="user-greeting">
        <img :src="authStore.currentUser?.avatarUrl" alt="Avatar" class="avatar-lg" />
        <div>
          <h2>哈囉，{{ authStore.currentUser?.username }}！ 👋</h2>
          <p>準備好聆聽神的話語了嗎？今天也是充滿恩典的一天！</p>
          <div class="flex flex-wrap gap-2 mt-2">
            <span v-if="assignedTeacher" class="assigned-teacher-label">🛡️ 輔導教師：<strong>{{ assignedTeacher }}</strong></span>
            <span v-if="assignedPastor" class="assigned-teacher-label" style="background: rgba(139, 92, 246, 0.08); color: var(--info);">⛪ 分區牧者：<strong>{{ assignedPastor }}</strong></span>
            <span v-if="assignedParent" class="assigned-teacher-label" style="background: rgba(59, 130, 246, 0.08); color: var(--primary);">👨‍👩‍👦 關懷家長：<strong>{{ assignedParent }}</strong></span>
            <span v-if="!assignedTeacher && !assignedPastor && !assignedParent" class="no-teacher-hint">💬 尚未分配輔導關懷人員</span>
          </div>
        </div>
      </div>
      <div class="progress-summary">
        <div class="summary-card">
          <span class="summary-num">{{ completedCount }}/{{ coursesStore.courses.length }}</span>
          <span class="summary-label">已完成聽課</span>
        </div>
        <div class="summary-card">
          <span class="summary-num">{{ overallProgressPercent }}%</span>
          <span class="summary-label">總體完成度</span>
        </div>
      </div>
    </header>

    <!-- Main Navigation Tab (Sermons vs Shining Project) -->
    <div class="main-tabs mb-4 no-print">
      <button 
        :class="['main-tab-btn', { active: activeDashboardTab === 'sermons' }]"
        @click="activeDashboardTab = 'sermons'"
      >
        🎧 聽課學習中心
      </button>
      <button 
        :class="['main-tab-btn', { active: activeDashboardTab === 'shining' }]"
        @click="activeDashboardTab = 'shining'"
      >
        ✨ SS 閃耀計畫 Dashboard
      </button>
    </div>

    <!-- TAB 1: Sermons Center -->
    <div v-if="activeDashboardTab === 'sermons'" class="dashboard-body no-print">
      <!-- Course Section -->
      <section class="courses-section">
        <div class="section-title-row">
          <h3>📖 課程與講座清單</h3>
          <div class="filter-tabs">
            <button 
              v-for="tab in filterTabs" 
              :key="tab"
              :class="['filter-btn', { active: currentFilter === tab }]"
              @click="currentFilter = tab"
            >
              {{ tab === 'all' ? '全部項目' : tab === 'bible' ? '聖經課程' : '專題講座' }}
            </button>
          </div>
        </div>

        <div class="courses-grid">
          <div 
            v-for="course in filteredCourses" 
            :key="course.id" 
            class="course-card glass-panel"
            :class="{ 'card-selected': selectedCourse?.id === course.id }"
            @click="selectCourse(course)"
          >
            <div class="card-cover" :style="{ background: course.coverColor }">
              <span class="category-badge">{{ course.category === 'bible' ? '聖經' : '講座' }}</span>
              <span v-if="getRecord(course.id).completed" class="completed-check">✓ 已完成</span>
            </div>
            <div class="card-content">
              <h4 class="course-title">{{ course.title }}</h4>
              <p class="course-desc">{{ course.description }}</p>
              
              <!-- Status info on card -->
              <div class="card-status-info mt-2">
                <!-- Listen count badge -->
                <span 
                  class="badge" 
                  :class="getRecord(course.id).completed ? 'badge-teacher' : 'badge-student'"
                >
                  <template v-if="getRecord(course.id).sessions.length > 0">
                    🎧 已聽 {{ getRecord(course.id).sessions.length }} 次
                  </template>
                  <template v-else>
                    📝 尚未登記
                  </template>
                </span>
                <!-- Show latest session lecturer -->
                <span 
                  class="lecturer-tag text-xs text-muted mt-1" 
                  v-if="getRecord(course.id).sessions.length > 0"
                  style="display: block;"
                >
                  🎤 講師：{{ getRecord(course.id).sessions[getRecord(course.id).sessions.length - 1].lecturer || '未填寫' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Course Notes Form Section -->
      <section class="player-section">
        <div v-if="selectedCourse" class="glass-panel sticky-panel">
          <h3 class="panel-header">📝 聽課與講座學習紀錄</h3>
          
          <!-- Course banner -->
          <div class="course-banner-card mt-4" :style="{ background: selectedCourse.coverColor, padding: '1.5rem', borderRadius: 'var(--radius-md)', color: 'white', boxShadow: 'var(--shadow-sm)' }">
            <h4 style="color: white; font-size: 1.2rem; margin-bottom: 0.25rem; font-weight: 700;">{{ selectedCourse.title }}</h4>
            <p style="color: rgba(255,255,255,0.85); font-size: 0.9rem; margin-bottom: 0;">{{ selectedCourse.description }}</p>
          </div>

          <!-- ── COMPLETED STATE ── -->
          <template v-if="currentRecord?.completed">

            <!-- Session history timeline -->
            <div class="session-history mt-4">
              <h4 class="section-sub-title">📋 聽課紀錄歷程（共 {{ currentRecord?.sessions.length ?? 0 }} 次）</h4>
              <div class="timeline">
                <div 
                  v-for="(session, idx) in [...(currentRecord?.sessions ?? [])].reverse()" 
                  :key="session.id" 
                  class="timeline-item"
                >
                  <div class="timeline-dot" :class="idx === 0 ? 'dot-latest' : 'dot-past'"></div>
                  <div class="timeline-content glass-panel-sm">
                    <div class="timeline-header">
                      <span class="timeline-count">第 {{ (currentRecord?.sessions.length ?? 0) - idx }} 次</span>
                      <span class="timeline-date">{{ session.listenedAt ? session.listenedAt.replace('T', ' ') : session.createdAt }}</span>
                    </div>
                    <p class="timeline-lecturer">🎤 {{ session.lecturer || '（未填寫講師）' }}</p>
                    <p class="timeline-notes" v-if="session.notes">{{ session.notes }}</p>
                    <p class="timeline-notes text-muted" v-else><em>（無心得）</em></p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Collapsible review panel -->
            <div class="review-section mt-4">
              <button 
                class="btn-review-toggle" 
                @click="showReviewPanel = !showReviewPanel"
              >
                <span>{{ showReviewPanel ? '▲' : '▼' }}</span>
                {{ showReviewPanel ? '收起複習紀錄' : '➕ 新增複習紀錄（再聽一次）' }}
              </button>

              <transition name="review-slide">
                <div v-if="showReviewPanel" class="review-form mt-3">
                  <div class="form-group mb-3">
                    <label class="form-label" for="review-lecturer-select">🎤 本次授課講師：</label>
                    <select v-model="selectedLecturer" id="review-lecturer-select" class="form-input">
                      <option value="">-- 請選擇授課講師 --</option>
                      <option 
                        v-for="lec in availableLecturers" 
                        :key="lec.id" 
                        :value="lec.name + ' ' + lec.title"
                      >
                        {{ lec.name }} ({{ lec.title }})
                      </option>
                    </select>
                  </div>

                  <div class="form-group mb-3">
                    <label class="form-label" for="review-listened-time">📅 本次聽課時間：</label>
                    <input 
                      v-model="listenedAt" 
                      id="review-listened-time" 
                      type="datetime-local" 
                      class="form-input datetime-input" 
                    />
                  </div>

                  <div class="form-group mb-3">
                    <label class="form-label" for="review-notes-input">✍️ 本次複習心得：</label>
                    <textarea 
                      v-model="notesText" 
                      id="review-notes-input"
                      class="form-input text-area" 
                      placeholder="這次複習有哪些新的體會或收穫？"
                      rows="4"
                    ></textarea>
                  </div>

                  <div class="save-row mt-3">
                    <span class="save-status" v-if="saveStatus">{{ saveStatus }}</span>
                    <button class="btn btn-secondary btn-sm" @click="saveNoteAndProgress">
                      💾 儲存複習紀錄
                    </button>
                  </div>
                </div>
              </transition>
            </div>
          </template>

          <!-- ── FIRST TIME STATE ── -->
          <template v-else>
            <div class="notes-container mt-4">
              <div class="form-group mb-3">
                <label class="form-label" for="lecturer-select">🎤 授課講師：</label>
                <select 
                  v-model="selectedLecturer" 
                  id="lecturer-select" 
                  class="form-input"
                >
                  <option value="">-- 請選擇授課講師 --</option>
                  <option 
                    v-for="lec in availableLecturers" 
                    :key="lec.id" 
                    :value="lec.name + ' ' + lec.title"
                  >
                    {{ lec.name }} ({{ lec.title }})
                  </option>
                </select>
              </div>

              <div class="form-group mb-3">
                <label class="form-label" for="listened-time-input">📅 登記聽課時間：</label>
                <input 
                  v-model="listenedAt" 
                  id="listened-time-input" 
                  type="datetime-local" 
                  class="form-input datetime-input" 
                />
              </div>

              <label class="form-label" for="notes-input">✍️ 我的聽課心得與學習筆記</label>
              <textarea 
                v-model="notesText" 
                id="notes-input"
                class="form-input text-area" 
                placeholder="寫下你的收穫、靈修心得，或任何你想對輔導教師說的話..."
                rows="5"
              ></textarea>
              
              <div class="save-row mt-4">
                <span class="save-status" v-if="saveStatus">{{ saveStatus }}</span>
                <button class="btn btn-secondary btn-sm" @click="saveNoteAndProgress">
                  💾 儲存初次聽課紀錄（標記為已完成）
                </button>
              </div>
            </div>
          </template>
        </div>
        
        <div v-else class="glass-panel sticky-panel empty-player-state text-center">
          <div class="empty-emoji">⛪✨</div>
          <h4>請選擇課程或講座</h4>
          <p class="desc">點擊左側的課程卡片，開啟右側面板填報您的學習心得與授課講師。</p>
        </div>
      </section>
    </div>

    <!-- TAB 2: SS Shining Project Dashboard -->
    <div v-else-if="activeDashboardTab === 'shining'" class="shining-dashboard-body no-print">
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

    <!-- DEDICATED HIGH-FIDELITY HTML PRINT TEMPLATE (Hidden on screen, displayed in print media) -->
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import type { Course } from '@/stores/courses'

const authStore = useAuthStore()
const coursesStore = useCoursesStore()

const characterThemes = computed(() => {
  const church = authStore.currentUser?.church || '愛與話語'
  return coursesStore.getThemesByChurch('character', church)
})
const comingOfAgeThemes = computed(() => {
  const church = authStore.currentUser?.church || '愛與話語'
  return coursesStore.getThemesByChurch('comingOfAge', church)
})

const activeDashboardTab = ref<'sermons' | 'shining'>('sermons')
const currentFilter = ref<'all' | 'bible' | 'lecture'>('all')
const filterTabs = ['all', 'bible', 'lecture'] as const
const selectedCourse = ref<Course | null>(null)
const selectedLecturer = ref('')
const notesText = ref('')
const listenedAt = ref(new Date().toISOString().slice(0, 16))
const saveStatus = ref('')
const showReviewPanel = ref(false)

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

const filteredCourses = computed(() => {
  if (currentFilter.value === 'all') return coursesStore.courses
  return coursesStore.courses.filter(c => c.category === currentFilter.value)
})

const completedCount = computed(() => {
  const username = authStore.currentUser?.username || ''
  const userRecords = coursesStore.progressDb[username]
  if (!userRecords) return 0
  return Object.values(userRecords).filter(r => r.completed).length
})

const overallProgressPercent = computed(() => {
  if (coursesStore.courses.length === 0) return 0
  return Math.round((completedCount.value / coursesStore.courses.length) * 100)
})

function getRecord(courseId: string) {
  const username = authStore.currentUser?.username || ''
  return coursesStore.getStudentProgress(username, courseId)
}

// Reactive record for the currently selected course (drives the panel UI)
const currentRecord = computed(() => {
  if (!selectedCourse.value) return null
  return getRecord(selectedCourse.value.id)
})

const availableLecturers = computed(() => {
  if (!selectedCourse.value) return []
  const courseId = selectedCourse.value.id
  const church = authStore.currentUser?.church || '愛與話語'
  const churchLecturers = coursesStore.getLecturersByChurch(church)
  const list = churchLecturers.filter(l => l.courseIds.includes(courseId))
  return list.length > 0 ? list : churchLecturers
})

function selectCourse(course: Course) {
  selectedCourse.value = course
  // Reset the form for a fresh entry (don't pre-fill from old data)
  selectedLecturer.value = ''
  notesText.value = ''
  listenedAt.value = new Date().toISOString().slice(0, 16)
  saveStatus.value = ''
  showReviewPanel.value = false
}

function saveNoteAndProgress() {
  if (!selectedCourse.value || !authStore.currentUser) return

  coursesStore.addListenSession(
    authStore.currentUser.username,
    selectedCourse.value.id,
    {
      lecturer: selectedLecturer.value,
      listenedAt: listenedAt.value,
      notes: notesText.value
    }
  )

  saveStatus.value = '✓ 已成功儲存聽課紀錄！'
  // Reset the form fields after saving
  selectedLecturer.value = ''
  notesText.value = ''
  listenedAt.value = new Date().toISOString().slice(0, 16)
  showReviewPanel.value = false
  setTimeout(() => {
    saveStatus.value = ''
  }, 3000)
}


function saveBasicInfo() {
  const username = authStore.currentUser?.username || ''
  coursesStore.updateShiningBasicInfo(username, basicInfo)
  basicSaveMsg.value = '✓ 儲存成功！'
  setTimeout(() => {
    basicSaveMsg.value = ''
  }, 3000)
}

function toggleCheck(category: 'faithPhase1' | 'faithPhase2' | 'advancedChallenges', key: any) {
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

<style scoped>
/* Main Tab Switcher */
.main-tabs {
  display: flex;
  background: white;
  padding: 0.35rem;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  gap: 0.5rem;
}

.main-tab-btn {
  flex: 1;
  padding: 0.85rem;
  font-family: var(--font-family);
  font-weight: 700;
  font-size: 1rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition-normal);
}

.main-tab-btn:hover {
  background: #F8FAFC;
  color: var(--primary);
}

.main-tab-btn.active {
  background: linear-gradient(135deg, var(--primary) 0%, #4F46E5 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.user-greeting {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.avatar-lg {
  width: 72px;
  height: 72px;
  border-radius: var(--radius-full);
  background: white;
  border: 3px solid var(--primary);
  box-shadow: var(--shadow-sm);
}

.progress-summary {
  display: flex;
  gap: 1rem;
}

.summary-card {
  background: white;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.summary-num {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--primary);
}

.summary-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
}

/* Main Layout Grid */
.dashboard-body {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 2rem;
}

@media (max-width: 900px) {
  .dashboard-body {
    grid-template-columns: 1fr;
  }
}

.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.filter-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.6);
  padding: 0.2rem;
  border-radius: var(--radius-full);
}

.filter-btn {
  padding: 0.4rem 1rem;
  border: none;
  background: transparent;
  font-family: var(--font-family);
  font-weight: 600;
  font-size: 0.85rem;
  border-radius: var(--radius-full);
  cursor: pointer;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.filter-btn.active {
  background: var(--primary);
  color: white;
}

/* Course Grid and Cards */
.courses-grid {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.course-card {
  display: flex;
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-normal);
}

.course-card:hover {
  transform: translateY(-3px);
}

.card-cover {
  width: 160px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.category-badge {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  background: rgba(0, 0, 0, 0.35);
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-full);
  backdrop-filter: blur(4px);
}

.completed-check {
  position: absolute;
  bottom: 0.75rem;
  right: 0.75rem;
  background: var(--secondary);
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-sm);
}

.card-content {
  padding: 1.25rem;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.course-title {
  font-size: 1.15rem;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.course-speaker {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.course-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-progress {
  margin-top: auto;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

/* Sticky Player Section */
.player-section {
  position: relative;
}

.sticky-panel {
  position: sticky;
  top: 96px;
  max-height: calc(100vh - 130px);
  overflow-y: auto;
  padding: 2rem;
  border-radius: var(--radius-lg);
  background: white;
}

/* 針對小螢幕設計精緻滾動條，確保按鈕必定能被看見 */
.sticky-panel::-webkit-scrollbar {
  width: 6px;
}
.sticky-panel::-webkit-scrollbar-track {
  background: transparent;
}
.sticky-panel::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12);
  border-radius: 3px;
}
.sticky-panel::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.22);
}

.panel-header {
  font-size: 1.25rem;
  color: var(--text-primary);
  border-bottom: 1px solid #E2E8F0;
  padding-bottom: 0.5rem;
}

.text-area {
  resize: vertical;
  border-radius: var(--radius-md);
  margin-top: 0.5rem;
}

.save-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.save-status {
  font-size: 0.8rem;
  color: var(--secondary-hover);
  font-weight: 600;
}

.empty-player-state {
  padding: 4rem 2rem;
}

.empty-emoji {
  font-size: 4rem;
  margin-bottom: 1.5rem;
  animation: float-pulse 3s infinite ease-in-out;
}

.empty-player-state h4 {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
}

.empty-player-state .desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* SHINING PROJECT DASHBOARD STYLE */
.shining-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.shining-grid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.shining-row-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

@media (max-width: 768px) {
  .shining-row-cols {
    grid-template-columns: 1fr;
  }
}

.shining-card-title {
  font-size: 1.2rem;
  border-bottom: 3px solid var(--warning);
  padding-bottom: 0.5rem;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Basic Info card */
.shining-card-basic {
  background: white;
  padding: 1.5rem;
  border-radius: var(--radius-md);
}

.form-group-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.85rem;
}

.info-dot {
  color: var(--warning);
  font-weight: 700;
}

.info-lbl {
  font-weight: 700;
  min-width: 90px;
  color: var(--text-secondary);
}

.form-input-clean {
  flex-grow: 1;
  border: none;
  border-bottom: 2px dashed #E2E8F0;
  padding: 0.35rem 0.5rem;
  font-family: var(--font-family);
  font-size: 0.95rem;
  color: var(--text-primary);
  background: transparent;
  outline: none;
  transition: border-color var(--transition-fast);
}

.form-input-clean:focus {
  border-bottom-color: var(--warning);
}

.save-alert-msg {
  font-size: 0.8rem;
  color: var(--secondary-hover);
  font-weight: 700;
  margin-left: 0.5rem;
}

.text-right {
  text-align: right;
}

/* Checklists styling */
.checklist-card {
  background: white;
  padding: 1.5rem;
  border-radius: var(--radius-md);
}

.checklist-items {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.check-item-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
}

.check-box-wrapper {
  position: relative;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

.check-box-wrapper input {
  opacity: 0;
  width: 0;
  height: 0;
}

.styled-checkbox {
  position: absolute;
  top: 0;
  left: 0;
  height: 20px;
  width: 20px;
  background-color: #F1F5F9;
  border: 2px solid #CBD5E1;
  border-radius: 50%; /* Circles matching images */
  transition: all var(--transition-fast);
}

.check-box-wrapper input:checked + .styled-checkbox {
  background-color: var(--warning);
  border-color: var(--warning);
}

.check-box-wrapper input:checked + .styled-checkbox:after {
  content: "✓";
  position: absolute;
  color: white;
  font-weight: 800;
  font-size: 0.75rem;
  left: 4px;
  top: -1px;
}

.disabled-check {
  background-color: #E2E8F0;
  border-color: #CBD5E1;
}

.check-box-wrapper input:checked + .disabled-check {
  background-color: var(--primary);
  border-color: var(--primary);
}

.check-label-text {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.special-progress-row {
  background-color: #EFF6FF;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  border-left: 4px solid var(--primary);
}

.check-label-text-progress {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.check-label-text-progress span {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}

.check-label-text-progress .progress-sub {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--primary);
}

.custom-challenge-wrap {
  flex-grow: 1;
}

.form-input-clean-custom {
  width: 100%;
  border: none;
  border-bottom: 2px dashed #E2E8F0;
  padding: 0.25rem 0.5rem;
  font-family: var(--font-family);
  font-size: 0.9rem;
  color: var(--text-primary);
  outline: none;
  background: transparent;
}

.form-input-clean-custom:focus {
  border-bottom-color: var(--warning);
}

/* Tables styling */
.shining-row-cols-tables {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

@media (max-width: 900px) {
  .shining-row-cols-tables {
    grid-template-columns: 1fr;
  }
}

.table-card {
  background: white;
  padding: 1.5rem;
  border-radius: var(--radius-md);
}

.table-sub-lbl {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 600;
  margin-top: 0.25rem;
}

.shining-lecture-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.shining-lecture-table th {
  background-color: #F8FAFC;
  padding: 0.6rem 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
  border-bottom: 2px solid #E2E8F0;
  font-size: 0.85rem;
}

.shining-lecture-table td {
  padding: 0.75rem 0.85rem;
  border-bottom: 1px solid #F1F5F9;
  font-size: 0.9rem;
}

.theme-title-cell {
  font-weight: 700;
  color: var(--text-primary);
}

.empty-input-cell {
  color: var(--text-muted);
  font-style: italic;
  font-size: 0.8rem;
}

/* Signature section */
.signatures-card {
  background: white;
  padding: 1.5rem;
  border-radius: var(--radius-md);
  margin-bottom: 1rem;
}

.signature-box-preview-container {
  display: flex;
  justify-content: space-around;
  gap: 1rem;
  flex-wrap: wrap;
}

.sig-box-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  min-width: 100px;
}

.sig-title-p {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.sig-circle-p {
  width: 72px;
  height: 72px;
  border: 2px dashed var(--text-muted);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.assigned-teacher-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--secondary-hover);
  background: rgba(16, 185, 129, 0.08);
  display: inline-block;
  padding: 0.35rem 0.85rem;
  border-radius: var(--radius-full);
}

.no-teacher-hint {
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 500;
}

.datetime-input {
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
}

@keyframes float-pulse {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

/* HIGH FIDELITY PRINT MEDIA OVERRIDES */
.print-only {
  display: none;
}

@media print {
  /* Hide all screen elements completely */
  .no-print, nav, header, .main-tabs, .btn, .shining-toolbar, #app-container, .main-content {
    display: none !important;
  }

  body {
    background: white !important;
    color: black !important;
  }

  .print-only {
    display: block !important;
  }

  .print-page-layout {
    width: 100%;
    max-width: 100%;
    margin: 0;
    padding: 20px;
    background-color: white;
  }

  .print-container {
    border: 3px double #000;
    border-radius: 12px;
    padding: 25px;
    background: white;
  }

  .print-banner {
    text-align: center;
    border-bottom: 2px solid #000;
    padding-bottom: 10px;
    margin-bottom: 20px;
  }

  .print-banner-logo {
    font-size: 2.2rem;
    font-weight: 800;
    letter-spacing: 2px;
  }

  .print-banner-sub {
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 3px;
    color: #444;
  }

  .print-flex-row {
    display: flex;
    justify-content: space-between;
    gap: 15px;
  }

  .print-w-45 { width: 45%; }
  .print-w-48 { width: 48%; }
  .print-w-50 { width: 50%; }

  .print-box {
    border: 1px solid #000;
    border-radius: 8px;
    padding: 15px;
    background: #fff;
  }

  .print-box-title {
    font-size: 1rem;
    font-weight: 800;
    border-bottom: 1px solid #eee;
    padding-bottom: 5px;
    margin-bottom: 10px;
  }

  .print-box-subtitle {
    font-size: 0.75rem;
    color: #555;
    margin-bottom: 8px;
    font-style: italic;
  }

  .print-info-line {
    font-size: 0.9rem;
    margin-bottom: 8px;
    border-bottom: 1px dashed #ddd;
    padding-bottom: 2px;
  }

  .print-checklist {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .print-check-line {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.85rem;
  }

  .print-check-circle {
    width: 16px;
    height: 16px;
    border: 1.5px solid #000;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 0.7rem;
    flex-shrink: 0;
  }

  .print-check-circle.checked {
    background-color: #000;
    color: #fff;
  }

  .print-table-box {
    border: 1px solid #000;
    border-radius: 8px;
    padding: 15px;
    background: #fff;
  }

  .print-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
  }

  .print-table th, .print-table td {
    border: 1px solid #000;
    padding: 6px 10px;
    font-size: 0.85rem;
    text-align: left;
  }

  .print-table th {
    background-color: #f2f2f2;
    font-weight: 700;
  }

  .print-signatures-box {
    border: 1px solid #000;
    border-radius: 8px;
    padding: 15px;
  }

  .print-signatures-row {
    display: flex;
    justify-content: space-around;
  }

  .print-sig-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .print-sig-lbl {
    font-size: 0.85rem;
    font-weight: 700;
  }

  .print-sig-space {
    width: 80px;
    height: 50px;
    border: 1.5px dashed #777;
    border-radius: 50%;
  }
}

/* ── Card selected state ── */
.course-card.card-selected {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* ── Section subtitle ── */
.section-sub-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
}

/* ── Small glass panel (used in timeline items) ── */
.glass-panel-sm {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: var(--radius-sm, 8px);
  padding: 0.75rem 1rem;
  backdrop-filter: blur(6px);
}

/* ── Timeline ── */
.session-history .timeline {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-left: 1.25rem;
  border-left: 2px solid rgba(99, 102, 241, 0.2);
}

.timeline-item {
  position: relative;
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.timeline-dot {
  position: absolute;
  left: -1.45rem;
  top: 0.5rem;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid white;
  flex-shrink: 0;
}

.timeline-dot.dot-latest {
  background: var(--primary, #6366f1);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
}

.timeline-dot.dot-past {
  background: var(--text-muted, #9ca3af);
}

.timeline-content {
  flex: 1;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.3rem;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.timeline-count {
  font-size: 0.8rem;
  font-weight: 700;
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary, #6366f1);
  padding: 1px 8px;
  border-radius: 20px;
}

.timeline-date {
  font-size: 0.75rem;
  color: var(--text-muted, #9ca3af);
}

.timeline-lecturer {
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0.2rem 0;
  color: var(--text-primary);
}

.timeline-notes {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.5;
}

/* ── Review toggle button ── */
.btn-review-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.7rem 1rem;
  background: rgba(99, 102, 241, 0.08);
  border: 1.5px dashed rgba(99, 102, 241, 0.4);
  border-radius: var(--radius-sm, 8px);
  color: var(--primary, #6366f1);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
  text-align: left;
}

.btn-review-toggle:hover {
  background: rgba(99, 102, 241, 0.15);
  border-color: var(--primary, #6366f1);
}

/* ── Review slide transition ── */
.review-slide-enter-active,
.review-slide-leave-active {
  transition: max-height 0.3s ease, opacity 0.3s ease;
  overflow: hidden;
  max-height: 600px;
}

.review-slide-enter-from,
.review-slide-leave-to {
  max-height: 0;
  opacity: 0;
}

.review-form {
  background: rgba(99, 102, 241, 0.04);
  border: 1px solid rgba(99, 102, 241, 0.12);
  border-radius: var(--radius-sm, 8px);
  padding: 1rem;
}
</style>

