<template>
  <div class="teacher-dashboard container">
    <!-- Header panel with statistics -->
    <header class="dashboard-header glass-panel no-print">
      <div class="header-intro">
        <div class="header-user-row">
          <div class="teacher-avatar-wrap" @click="showProfileDialog = true" title="點擊編輯個人資料">
            <img :src="authStore.currentUser?.avatarUrl" alt="avatar" class="teacher-avatar-sm" />
            <span class="teacher-role-badge">{{ teacherRoleBadge }}</span>
          </div>
          <div>
            <h2 v-if="authStore.currentUser?.role === 'pastor'">牧養分析控制台 ⛪</h2>
            <h2 v-else-if="authStore.currentUser?.role === 'admin'">SS中央分析控制台 👑</h2>
            <h2 v-else>關懷與輔導分析控制台 👨‍🏫</h2>
            <p>{{ teacherDisplayName }}，追蹤 SS學員 的聽課狀況與心得紀錄，給予支持與回饋。</p>
            <p v-if="authStore.currentUser?.lastLoginAt" class="last-login-hint-sm">🕐 上次登入：{{ authStore.currentUser?.lastLoginAt }}</p>
          </div>
        </div>
      </div>
      <div class="stats-grid">
        <div class="stat-box">
          <span class="stat-val">{{ studentsList.length }}</span>
          <span class="stat-lbl">學員總數</span>
        </div>
        <div class="stat-box">
          <span class="stat-val">{{ myStudentsCount }}</span>
          <span class="stat-lbl">我管理的學員</span>
        </div>
        <div class="stat-box">
          <span class="stat-val">{{ totalNotesSubmitted }}</span>
          <span class="stat-lbl">累計心得筆數</span>
        </div>
      </div>
    </header>

    <!-- Profile Dialog -->
    <ProfileDialog v-model="showProfileDialog" />

    <!-- Main Tab Switcher for settings tab -->
    <div class="main-tabs mb-4 no-print" v-if="authStore.currentUser?.role !== 'parent'">
      <button 
        :class="['main-tab-btn', { active: activeMainTab === 'care' }]"
        @click="activeMainTab = 'care'"
      >
        <span v-if="authStore.currentUser?.role === 'pastor'">👥 教會學員進度</span>
        <span v-else-if="authStore.currentUser?.role === 'admin'">👥 全站學員名冊</span>
        <span v-else>👥 班級輔導與關懷</span>
      </button>
      <!-- Pastor-only: Church Overview Tab -->
      <button 
        v-if="authStore.currentUser?.role === 'pastor'"
        :class="['main-tab-btn', { active: activeMainTab === 'pastor-overview' }]"
        @click="activeMainTab = 'pastor-overview'"
      >
        📊 教會總覽
      </button>
      <button 
        :class="['main-tab-btn', { active: activeMainTab === 'settings' }]"
        @click="activeMainTab = 'settings'"
      >
        🛠️ 專題與講師設定控制台
      </button>
      <!-- Booking Tab: teacher + admin -->
      <button
        v-if="authStore.currentUser?.role === 'teacher' || authStore.currentUser?.role === 'admin'"
        :class="['main-tab-btn', { active: activeMainTab === 'bookings' }]"
        @click="activeMainTab = 'bookings'"
        id="tab-bookings"
      >
        📅 聽課預約
        <span v-if="pendingBookingsCount > 0" class="tab-badge">{{ pendingBookingsCount }}</span>
      </button>
    </div>

    <!-- Tab 1: Care & Progress Dashboard -->
    <div v-if="activeMainTab === 'care'" class="dashboard-body no-print">
      <!-- Search & Student List -->
      <section class="students-list-panel glass-panel">
        <div class="panel-header-row">
          <div class="tab-selectors" v-if="authStore.currentUser?.role !== 'parent'">
            <button 
              v-if="authStore.currentUser?.role === 'teacher'"
              :class="['tab-btn', { active: currentTab === 'my-students' }]"
              @click="currentTab = 'my-students'"
            >
              🛡️ 我負責的學員 ({{ myStudentsCount }})
            </button>
            <button 
              :class="['tab-btn', { active: currentTab === 'all-students' }]"
              @click="currentTab = 'all-students'"
            >
              👥 全體學員名冊
            </button>
          </div>
          <div v-else class="tab-selectors-parent-title">
            <h3 style="margin: 0; font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem; color: var(--primary);">
              👨‍👩‍👦 我的孩子進度一覽
            </h3>
          </div>
          <input 
            v-model="searchQuery" 
            type="text" 
            class="form-input search-input" 
            placeholder="🔍 搜尋學員姓名..." 
            v-if="authStore.currentUser?.role !== 'parent'"
          />
        </div>

        <div class="table-container mt-4">
          <table class="students-table">
            <thead>
              <tr>
                <th>學員姓名</th>
                <th>管理狀態</th>
                <th>已聽完課堂</th>
                <th>總聽課進度</th>
                <th>操作項目</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="student in filteredStudents" :key="student.username">
                <td class="student-cell">
                  <img :src="student.avatarUrl" class="avatar-sm" alt="Avatar" />
                  <div class="student-name-col">
                    <span class="student-name">{{ student.realName || student.username }}</span>
                    <span v-if="student.realName" class="student-id-tag">@{{ student.username }}</span>
                  </div>
                </td>
                <td>
                  <span class="badge" :class="getCaretakerBadgeClass(student.username)">
                    {{ getCaretakerStatusText(student.username) }}
                  </span>
                </td>
                <td>
                  <span class="badge badge-student">
                    {{ student.completedCount }} / {{ coursesStore.courses.length }}
                  </span>
                </td>
                <td>
                  <div class="table-progress">
                    <span class="percent-label">{{ student.totalProgressPercent }}%</span>
                    <div class="progress-bar-container table-bar">
                      <div 
                        class="progress-bar-fill" 
                        :style="{ width: student.totalProgressPercent + '%' }"
                      ></div>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="action-buttons">
                    <button 
                      @click="viewStudentDetails(student)" 
                      class="btn btn-secondary btn-sm"
                    >
                      🔍 檢視進度
                    </button>
                    
                    <template v-if="authStore.currentUser?.role !== 'parent'">
                      <button 
                        v-if="isStudentManaged(student.username) && authStore.currentUser?.role === 'teacher'"
                        @click="unmanageStudent(student.username)"
                        class="btn btn-danger btn-sm"
                      >
                        ❌ 取消管理
                      </button>
                      <button 
                        v-else-if="!coursesStore.getStudentCaretaker(student.username, authStore.currentUser?.role as any) && authStore.currentUser?.role === 'teacher'"
                        @click="manageStudent(student.username)"
                        class="btn btn-primary btn-sm"
                      >
                        🤝 加入管理
                      </button>
                    </template>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredStudents.length === 0">
                <td colspan="5" class="text-center empty-row">
                  目前列表沒有學員喔！
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Student Detail Drawer / Overlay Panel -->
      <section v-if="selectedStudent" class="student-details-drawer glass-panel">
        <div class="drawer-header">
          <div class="student-profile">
            <img :src="selectedStudent.avatarUrl" class="avatar-md" alt="Avatar" />
            <div>
              <h4>
                {{ selectedStudent.realName || selectedStudent.username }} 的學習檔案
                <span v-if="selectedStudent.realName" class="student-id-tag-sm">@{{ selectedStudent.username }}</span>
              </h4>
              <p>總進度完成率：{{ selectedStudent.totalProgressPercent }}%</p>
            </div>
          </div>
          <button @click="selectedStudent = null" class="close-btn">×</button>
        </div>

        <!-- Tab switches inside drawer: shining only now; notes opens dedicated dialog -->
        <div class="drawer-tabs mt-4">
          <button 
            class="drawer-tab-btn"
            @click="openNotesDialog(selectedStudent)"
          >
            📝 查看心得與筆記
          </button>
          <button 
            :class="['drawer-tab-btn', { active: activeDrawerTab === 'shining' }]"
            @click="activeDrawerTab = 'shining'"
          >
            ✨ 閃耀計畫審查
          </button>
        </div>

        <div class="drawer-body mt-2">
          <!-- SUB-TAB 1 (now only shining) -->
          <div v-if="activeDrawerTab === 'shining'" class="shining-audit-panel">
            <div class="flex justify-between align-center mb-4">
              <h5 class="section-title mb-0">✨ 閃耀計畫指標與進修專題</h5>
              <button class="btn btn-primary btn-sm" @click="triggerPrint(selectedStudent.username)">
                🖨️ 匯出 PDF/列印
              </button>
            </div>

            <!-- Read Only Basic Info -->
            <div class="basic-info-readonly-card mb-4">
              <h6>📋 學員基本資料</h6>
              <div class="readonly-grid mt-2">
                <div><span>姓名：</span><strong>{{ getShining(selectedStudent.username).name || '未填寫' }}</strong></div>
                <div><span>生日：</span><strong>{{ getShining(selectedStudent.username).birthday || '未填寫' }}</strong></div>
                <div><span>教會：</span><strong>{{ getShining(selectedStudent.username).church || '未填寫' }}</strong></div>
                <div><span>年級：</span><strong>{{ getShining(selectedStudent.username).schoolGrade || '未填寫' }}</strong></div>
              </div>
            </div>

            <!-- Read Only Checklist Statuses -->
            <div class="checklists-readonly-container mb-4">
              <h6>🌟 信仰自我檢視與挑戰</h6>
              <div class="checklist-grid mt-2">
                <!-- Phase 1 -->
                <div class="checklist-ro-column">
                  <div class="checklist-ro-title">信仰指標 Phase 1</div>
                  <div class="checklist-ro-list">
                    <div 
                      v-for="(label, key) in phase1Labels" 
                      :key="key" 
                      :class="['ro-check-row', { active: getShining(selectedStudent.username).faithPhase1[key] }]"
                    >
                      <span>{{ getShining(selectedStudent.username).faithPhase1[key] ? '✅' : '❌' }}</span>
                      <span class="text-ro">{{ label }}</span>
                    </div>
                  </div>
                </div>

                <!-- Phase 2 -->
                <div class="checklist-ro-column">
                  <div class="checklist-ro-title">信仰指標 Phase 2</div>
                  <div class="checklist-ro-list">
                    <template v-for="(label, key) in phase2Labels" :key="key">
                      <div 
                        :class="['ro-check-row', { active: getShining(selectedStudent.username).faithPhase2[key] }]"
                      >
                        <span>{{ getShining(selectedStudent.username).faithPhase2[key] ? '✅' : '❌' }}</span>
                        <span class="text-ro" v-if="key === 'courses30'">
                          我已經聽完 30 個論 ({{ selectedStudent.completedCount }}/30)
                        </span>
                        <span class="text-ro" v-else>{{ label }}</span>
                      </div>
                    </template>
                  </div>
                </div>

                <!-- Challenges -->
                <div class="checklist-ro-column">
                  <div class="checklist-ro-title">進階挑戰項目</div>
                  <div class="checklist-ro-list">
                    <div 
                      v-for="(label, key) in advancedLabels" 
                      :key="key" 
                      :class="['ro-check-row', { active: getShining(selectedStudent.username).advancedChallenges[key] }]"
                    >
                      <span>{{ getShining(selectedStudent.username).advancedChallenges[key] ? '✅' : '❌' }}</span>
                      <span class="text-ro" v-if="key === 'custom'">
                        自訂：{{ getShining(selectedStudent.username).customChallenge || '未填寫自訂挑戰' }}
                      </span>
                      <span class="text-ro" v-else>{{ label }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Editable Lecture Logs -->
            <div class="lectures-edit-section">
              <!-- Character Tables -->
              <div class="lecture-edit-group mb-4">
                <h6>📖 品格力專題登記 (講師與日期)</h6>
                <div class="lecture-inputs-stack mt-2">
                  <div 
                    v-for="theme in characterThemes" 
                    :key="theme" 
                    class="lecture-edit-row"
                  >
                    <div class="row-theme-name">✦ {{ theme }}</div>
                    
                    <!-- Editable row for teachers/admins/pastors -->
                    <div class="inputs-row" v-if="authStore.currentUser?.role !== 'parent'">
                      <input 
                        type="text" 
                        v-model="lectureForms[theme].speaker" 
                        class="form-input text-xs pt-1 pb-1" 
                        placeholder="講師名稱" 
                      />
                      <input 
                        type="date" 
                        v-model="lectureForms[theme].date" 
                        class="form-input text-xs pt-1 pb-1" 
                      />
                      <button 
                        @click="saveLectureRow(selectedStudent.username, 'character', theme)"
                        class="btn btn-secondary btn-sm pt-1 pb-1"
                      >
                        儲存
                      </button>
                    </div>

                    <!-- Readonly row for parents -->
                    <div class="inputs-row-readonly text-sm" v-else>
                      <span v-if="lectureForms[theme]?.speaker" class="mr-4">🎤 講師：<strong>{{ lectureForms[theme].speaker }}</strong></span>
                      <span v-if="lectureForms[theme]?.date">📅 日期：<strong>{{ lectureForms[theme].date }}</strong></span>
                      <span v-if="!lectureForms[theme]?.speaker && !lectureForms[theme]?.date" class="text-muted text-xs italic">（尚未登記）</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Coming of Age Tables -->
              <div class="lecture-edit-group mb-4">
                <h6>🎓 成年禮必修專題登記</h6>
                <div class="lecture-inputs-stack mt-2">
                  <div 
                    v-for="theme in comingOfAgeThemes" 
                    :key="theme" 
                    class="lecture-edit-row"
                  >
                    <div class="row-theme-name">✦ {{ theme }}</div>
                    
                    <!-- Editable row for teachers/admins/pastors -->
                    <div class="inputs-row" v-if="authStore.currentUser?.role !== 'parent'">
                      <input 
                        type="text" 
                        v-model="lectureForms[theme].speaker" 
                        class="form-input text-xs pt-1 pb-1" 
                        placeholder="講師名稱" 
                      />
                      <input 
                        type="date" 
                        v-model="lectureForms[theme].date" 
                        class="form-input text-xs pt-1 pb-1" 
                      />
                      <button 
                        @click="saveLectureRow(selectedStudent.username, 'comingOfAge', theme)"
                        class="btn btn-secondary btn-sm pt-1 pb-1"
                      >
                        儲存
                      </button>
                    </div>

                    <!-- Readonly row for parents -->
                    <div class="inputs-row-readonly text-sm" v-else>
                      <span v-if="lectureForms[theme]?.speaker" class="mr-4">🎤 講師：<strong>{{ lectureForms[theme].speaker }}</strong></span>
                      <span v-if="lectureForms[theme]?.date">📅 日期：<strong>{{ lectureForms[theme].date }}</strong></span>
                      <span v-if="!lectureForms[theme]?.speaker && !lectureForms[theme]?.date" class="text-muted text-xs italic">（尚未登記）</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      <section v-else class="student-details-drawer empty-drawer glass-panel text-center no-print">
        <div class="empty-illustration">👩‍🏫🎓</div>
        <h4>學員進度與紀錄詳細資訊</h4>
        <p>點擊左側學生清單的「檢視進度」按鈕，可以查看詳細的聽課時長、靈修心得與對其進行回饋。</p>
      </section>
    </div>

    <!-- Tab: Pastor Church Overview (牧者教會總覽) -->
    <div v-if="activeMainTab === 'pastor-overview'" class="no-print">
      <div class="pastor-overview-grid">
        <!-- Church Stats Header -->
        <section class="glass-panel pastor-stats-panel">
          <h3>⛪ {{ authStore.currentUser?.church }} — 教會總覽</h3>
          <div class="pastor-stats-grid mt-4">
            <div class="stat-box">
              <span class="stat-val">{{ pastorChurchStudents.length }}</span>
              <span class="stat-lbl">SS 學員總數</span>
            </div>
            <div class="stat-box">
              <span class="stat-val">{{ pastorChurchTeachers.length }}</span>
              <span class="stat-lbl">輔導教師數量</span>
            </div>
            <div class="stat-box">
              <span class="stat-val">{{ totalNotesSubmitted }}</span>
              <span class="stat-lbl">累計心得筆數</span>
            </div>
          </div>
        </section>

        <!-- Caretaker Assignments Matching Panel -->
        <section class="glass-panel pastor-match-panel">
          <h4 class="mb-4">📋 教會專屬配對管理板</h4>
          <p class="section-desc mb-4 text-sm text-muted">分區牧者專用：直接為您教會內的學員指派專屬輔導教師</p>
          <div class="table-container">
            <table class="students-table match-table">
              <thead>
                <tr>
                  <th>SS學員</th>
                  <th>輔導教師</th>
                  <th>關懷家長</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="stdUsername in pastorChurchStudents" :key="stdUsername">
                  <td class="student-cell">
                    <img
                      :src="authStore.usersDb[stdUsername]?.avatarUrl || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${stdUsername}`"
                      class="avatar-sm" alt="Avatar"
                    />
                    <div class="student-name-col">
                      <strong>{{ authStore.usersDb[stdUsername]?.realName || stdUsername }}</strong>
                      <span v-if="authStore.usersDb[stdUsername]?.displayName" class="student-nickname-tag">
                        「{{ authStore.usersDb[stdUsername]?.displayName }}」
                      </span>
                      <span v-if="authStore.usersDb[stdUsername]?.realName" class="student-id-tag">@{{ stdUsername }}</span>
                    </div>
                  </td>
                  <td>
                    <select 
                      :value="coursesStore.getStudentCaretaker(stdUsername, 'teacher')"
                      @change="(e) => setCaretaker(stdUsername, 'teacher', (e.target as HTMLSelectElement).value)"
                      class="form-input text-sm"
                    >
                      <option value="">-- 未指派 --</option>
                      <option v-for="t in pastorChurchTeachers" :key="t" :value="t">
                        {{ authStore.usersDb[t]?.realName || t }}
                        {{ authStore.usersDb[t]?.displayName ? `「${authStore.usersDb[t]?.displayName}」` : '' }}
                      </option>
                    </select>
                  </td>
                  <td>
                    <select 
                      :value="coursesStore.getStudentCaretaker(stdUsername, 'parent')"
                      @change="(e) => setCaretaker(stdUsername, 'parent', (e.target as HTMLSelectElement).value)"
                      class="form-input text-sm"
                    >
                      <option value="">-- 未指派 --</option>
                      <option v-for="pa in pastorChurchParents" :key="pa" :value="pa">
                        {{ authStore.usersDb[pa]?.realName || pa }}
                        {{ authStore.usersDb[pa]?.displayName ? `「${authStore.usersDb[pa]?.displayName}」` : '' }}
                      </option>
                    </select>
                  </td>
                </tr>
                <tr v-if="pastorChurchStudents.length === 0">
                  <td colspan="3" class="text-center empty-row">目前教會中無學員帳號</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Teacher Management Overview Table -->
        <section class="glass-panel pastor-teacher-panel">
          <h4 class="mb-4">👨‍🏫 教師管理概況</h4>
          <div class="table-container">
            <table class="students-table">
              <thead>
                <tr>
                  <th>輔導教師</th>
                  <th>管理的 SS 數量</th>
                  <th>管理的 SS 學員</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="teacher in pastorChurchTeachers" :key="teacher">
                  <td class="student-cell">
                    <img
                      :src="authStore.usersDb[teacher]?.avatarUrl || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${teacher}`"
                      class="avatar-sm" alt="Avatar"
                    />
                    <div class="student-name-col">
                      <span class="student-name">{{ authStore.usersDb[teacher]?.realName || teacher }}</span>
                      <span v-if="authStore.usersDb[teacher]?.displayName" class="student-nickname-tag">
                        「{{ authStore.usersDb[teacher]?.displayName }}」
                      </span>
                      <span v-if="authStore.usersDb[teacher]?.realName" class="student-id-tag">@{{ teacher }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="badge badge-teacher">{{ getTeacherManagedStudents(teacher).length }} 位</span>
                  </td>
                  <td>
                    <div class="managed-students-list">
                      <span
                        v-for="s in getTeacherManagedStudents(teacher)"
                        :key="s"
                        class="badge badge-student mr-1"
                        :title="`帳號：${s}`"
                      >🎒 {{ authStore.usersDb[s]?.realName || s }}</span>
                      <span v-if="getTeacherManagedStudents(teacher).length === 0" class="text-muted text-xs italic">尚未管理任何學員</span>
                    </div>
                  </td>
                </tr>
                <tr v-if="pastorChurchTeachers.length === 0">
                  <td colspan="3" class="text-center empty-row">目前教會中無輔導教師帳號</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Lecturer Stats -->
        <section class="glass-panel pastor-lecturer-panel">
          <h4 class="mb-4">📊 講師授課統計（本教會 SS）</h4>
          <div class="table-container">
            <table class="students-table">
              <thead>
                <tr>
                  <th>講師姓名</th>
                  <th>授課次數</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="stat in pastorLecturerStats" :key="stat.lecturerName">
                  <td><span class="student-name">🎤 {{ stat.lecturerName }}</span></td>
                  <td><span class="badge badge-teacher">{{ stat.sessionCount }} 次</span></td>
                </tr>
                <tr v-if="pastorLecturerStats.length === 0">
                  <td colspan="2" class="text-center empty-row">本教會學員尚未登記任何授課講師</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>

    <!-- Tab 2: Settings Console -->
    <div v-if="activeMainTab === 'settings' && authStore.currentUser?.role !== 'parent'" class="dashboard-body no-print">
      <!-- Admin Church Selector -->
      <div v-if="authStore.currentUser?.role === 'admin'" class="glass-panel p-6 mb-4" style="padding: 1.75rem;">
        <h4 class="mb-2">⛪ 管理教會切換</h4>
        <select v-model="adminSettingsChurch" class="form-input select-input" style="max-width: 300px;">
          <option v-for="c in CHURCHES" :key="c" :value="c">{{ c }}</option>
        </select>
        <p class="text-xs text-muted mt-2">身為 SS 中央，您可以在此切換查看各個獨立教會的專題大綱與講師清單。</p>
      </div>

      <!-- Section 1: Themes Management -->
      <section class="glass-panel p-6" style="padding: 1.75rem;">
        <h3 class="mb-4">📋 專題大綱科目編輯器</h3>
        
        <!-- Character Themes -->
        <div class="theme-manage-block mb-4 pt-4">
          <h5>品格力專題大綱：</h5>
          <ul class="theme-list mt-2">
            <li v-for="theme in characterThemes" :key="theme" class="theme-item">
              <span>✦ {{ theme }}</span>
              <div class="theme-item-actions">
                <button class="btn btn-secondary btn-sm" style="padding: 0.15rem 0.5rem; font-size: 0.75rem;" @click="handleRenameTheme('character', theme)">重新命名</button>
                <button class="btn btn-danger btn-sm" style="padding: 0.15rem 0.5rem; font-size: 0.75rem;" @click="handleDeleteTheme('character', theme)">刪除</button>
              </div>
            </li>
          </ul>
          <div class="add-theme-row mt-2 flex gap-2">
            <input v-model="newCharacterTheme" type="text" class="form-input text-xs" placeholder="輸入新增品格力主題..." />
            <button class="btn btn-primary btn-sm" @click="handleAddTheme('character')">新增主題</button>
          </div>
        </div>

        <!-- Coming of Age Themes -->
        <div class="theme-manage-block mb-4 pt-4 border-t">
          <h5>成年禮必修專題大綱：</h5>
          <ul class="theme-list mt-2">
            <li v-for="theme in comingOfAgeThemes" :key="theme" class="theme-item">
              <span>✦ {{ theme }}</span>
              <div class="theme-item-actions">
                <button class="btn btn-secondary btn-sm" style="padding: 0.15rem 0.5rem; font-size: 0.75rem;" @click="handleRenameTheme('comingOfAge', theme)">重新命名</button>
                <button class="btn btn-danger btn-sm" style="padding: 0.15rem 0.5rem; font-size: 0.75rem;" @click="handleDeleteTheme('comingOfAge', theme)">刪除</button>
              </div>
            </li>
          </ul>
          <div class="add-theme-row mt-2 flex gap-2">
            <input v-model="newComingOfAgeTheme" type="text" class="form-input text-xs" placeholder="輸入新增成年禮主題..." />
            <button class="btn btn-primary btn-sm" @click="handleAddTheme('comingOfAge')">新增主題</button>
          </div>
        </div>
      </section>

      <!-- Section 2: Lecturers Management -->
      <section class="glass-panel p-6" style="padding: 1.75rem;">
        <div class="flex justify-between align-center mb-4">
          <h3 class="mb-0">👨‍🏫 講師管理資料庫</h3>
          <button class="btn btn-primary btn-sm" @click="openAddLecturer">➕ 新增講師</button>
        </div>
        
        <div class="lecturers-grid mt-4">
          <div v-for="lec in filteredLecturers" :key="lec.id" class="lecturer-card glass-card">
            <div class="flex justify-between align-center">
              <div>
                <h5 style="margin: 0;">
                  <strong>{{ lec.name }}</strong>
                  <span class="badge badge-teacher ml-2">{{ lec.title }}</span>
                </h5>
                <div class="lec-link-tags mt-1">
                  <span v-if="lec.linkedUsername" class="lec-linked-badge">
                    🔗 @{{ lec.linkedUsername }}
                  </span>
                  <span v-else class="lec-custom-badge">
                    ✍️ 外來講員
                  </span>
                </div>
              </div>
              <div class="flex gap-2">
                <button class="btn btn-outline btn-sm" style="padding: 0.15rem 0.5rem; font-size: 0.75rem;" @click="openEditLecturer(lec)">編輯</button>
                <button class="btn btn-danger btn-sm" style="padding: 0.15rem 0.5rem; font-size: 0.75rem;" @click="deleteLecturer(lec.id)">刪除</button>
              </div>
            </div>
            <div class="course-badges mt-2">
              <span class="text-xs text-muted block">可講授課程 ({{ lec.courseIds.length }} 堂指派)：</span>
              <div class="flex flex-wrap gap-1 mt-1">
                <span v-for="cid in lec.courseIds" :key="cid" class="badge badge-student" style="font-size: 0.7rem;">
                  {{ coursesStore.courses.find(c => c.id === cid)?.title || cid }}
                </span>
                <span v-if="lec.courseIds.length === 0" class="text-xs text-muted italic">尚未分配課程</span>
              </div>
            </div>
          </div>
          <div v-if="filteredLecturers.length === 0" class="text-center text-muted py-8 italic">
            目前講師資料庫空無一人，請點擊上方按鈕手動新增。
          </div>
        </div><!-- end lecturers-grid -->
      </section>
    </div>

    <!-- ─── Tab: 聽課預約管理 ─────────────────────────────────────────── -->
    <div
      v-if="activeMainTab === 'bookings' && (authStore.currentUser?.role === 'teacher' || authStore.currentUser?.role === 'admin')"
      class="dashboard-body no-print"
    >
      <section class="glass-panel bookings-panel">
        <div class="panel-header-row">
          <h3 class="section-title">📅 聽課預約管理</h3>
          <button class="btn btn-primary" @click="openCreateBooking" id="btn-create-booking">
            ➕ 新增預約
          </button>
        </div>

        <!-- Status Filter Tabs -->
        <div class="booking-filter-tabs mt-3">
          <button
            v-for="f in bookingFilters"
            :key="f.value"
            :class="['booking-filter-btn', { active: bookingFilter === f.value }]"
            @click="bookingFilter = f.value as typeof bookingFilter"
          >
            {{ f.label }}
            <span v-if="f.count > 0" class="filter-count">{{ f.count }}</span>
          </button>
        </div>

        <!-- Session List -->
        <div class="booking-list mt-4">
          <div
            v-for="session in filteredBookingSessions"
            :key="session.id"
            class="booking-card glass-card"
          >
            <div class="booking-card-header">
              <div class="booking-card-title">
                <span :class="['booking-status-badge', `status-${session.status}`]">
                  {{ bookingStatusLabel(session.status) }}
                </span>
                <span v-if="session.isGroupSession" class="booking-group-badge">👥 團體場次</span>
              </div>
              <div class="booking-card-actions">
                <button v-if="session.status === 'pending'" class="btn btn-sm btn-outline" @click="confirmBooking(session)">✅ 確認時間</button>
                <button v-if="session.status === 'confirmed'" class="btn btn-sm btn-primary" @click="openCompleteBooking(session)">🎉 標記完成</button>
                <button v-if="session.status === 'pending' || session.status === 'confirmed'" class="btn btn-sm btn-danger" @click="cancelBooking(session)">取消</button>
              </div>
            </div>

            <div class="booking-info-row mt-2">
              <div class="booking-info-item">
                <span class="info-label">📚 課程</span>
                <span class="info-value">{{ session.courseTitle }}</span>
              </div>
              <div class="booking-info-item">
                <span class="info-label">🎤 講師</span>
                <span class="info-value">{{ session.lecturerTitle }} {{ session.lecturerName }}</span>
              </div>
              <div class="booking-info-item">
                <span class="info-label">🕐 時間</span>
                <span class="info-value">{{ formatBookingTime(session) }}</span>
              </div>
              <div class="booking-info-item" v-if="session.durationMinutes">
                <span class="info-label">⏱ 時長</span>
                <span class="info-value">{{ session.durationMinutes }} 分鐘</span>
              </div>
            </div>

            <div class="booking-attendees mt-2">
              <span class="info-label">👤 學員：</span>
              <span
                v-for="att in bookingsStore.getAttendeesForSession(session.id)"
                :key="att.id"
                :class="['att-chip', `att-${att.attendanceStatus}`]"
              >
                {{ getStudentDisplayName(att.studentUsername) }}
                <span :title="attendanceLabel(att.attendanceStatus)">{{ attendanceIcon(att.attendanceStatus) }}</span>
              </span>
            </div>

            <div v-if="session.prep.scriptures.length || session.prep.readingNotes || session.prep.materials" class="booking-prep mt-2">
              <div class="prep-header" @click="togglePrepExpand(session.id)" style="cursor:pointer; display:flex; align-items:center; gap:0.5rem;">
                <span class="prep-toggle-label">📖 預習內容</span>
                <span>{{ expandedPreps.has(session.id) ? '▲' : '▼' }}</span>
              </div>
              <div v-if="expandedPreps.has(session.id)" class="prep-body mt-1">
                <div v-if="session.prep.scriptures.length" class="prep-section">
                  <strong>📜 預習經文：</strong>
                  <span v-for="(s, i) in session.prep.scriptures" :key="i" class="scripture-chip">{{ s }}</span>
                </div>
                <div v-if="session.prep.readingNotes" class="prep-section mt-1">
                  <strong>📝 準備說明：</strong>{{ session.prep.readingNotes }}
                </div>
                <div v-if="session.prep.materials" class="prep-section mt-1">
                  <strong>📎 補充材料：</strong>{{ session.prep.materials }}
                </div>
              </div>
            </div>

            <div v-if="session.status === 'completed' && session.teacherSessionNotes" class="booking-completed-notes mt-2">
              <strong>🗒️ 場次記錄：</strong>{{ session.teacherSessionNotes }}
            </div>
            <div v-if="session.status === 'cancelled' && session.cancelReason" class="booking-cancel-reason mt-2">
              <strong>❌ 取消原因：</strong>{{ session.cancelReason }}
            </div>
          </div>

          <div v-if="filteredBookingSessions.length === 0" class="text-center text-muted py-8 italic">
            {{ bookingFilter === 'all' ? '目前沒有任何預約紀錄，點擊「新增預約」開始' : '此狀態下沒有預約' }}
          </div>
        </div>
      </section>
    </div>

    <!-- ─── Modal: 新增預約 ──────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showCreateBookingModal" class="modal-overlay" @click.self="showCreateBookingModal = false">
        <div class="glass-panel modal-card booking-modal-card">
          <h3>➕ 新增聽課預約</h3>
          <div class="form-grid mt-4">
            <div class="form-group">
              <label class="form-label">📚 課程 *</label>
              <select v-model="bookingForm.courseId" class="form-input" id="booking-course-select" @change="onBookingCourseChange">
                <option value="">請選擇課程</option>
                <option v-for="c in coursesStore.courses" :key="c.id" :value="c.id">{{ c.title }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">🎤 講師 *</label>
              <select v-model="bookingForm.lecturerId" class="form-input" id="booking-lecturer-select">
                <option value="">請選擇講師</option>
                <option v-for="l in availableLecturers" :key="l.id" :value="l.id">
                  {{ l.title }} {{ l.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">🕐 提議時間 *</label>
              <input type="datetime-local" v-model="bookingForm.proposedAt" class="form-input" id="booking-time" />
            </div>
            <div class="form-group">
              <label class="form-label">⏱ 預計時長</label>
              <select v-model="bookingForm.durationMinutes" class="form-input" id="booking-duration">
                <option :value="60">60 分鐘</option>
                <option :value="90">90 分鐘</option>
                <option :value="120">120 分鐘</option>
              </select>
            </div>
          </div>

          <div class="form-group mt-3">
            <label class="form-label">👤 參與學員（可多選）</label>
            <div class="attendee-selector">
              <label v-for="s in myStudentsList" :key="s.username" class="attendee-check-item">
                <input type="checkbox" :value="s.username" v-model="bookingForm.studentUsernames" />
                <span>{{ s.realName || s.displayName || s.username }}</span>
                <span class="att-username-hint">@{{ s.username }}</span>
              </label>
              <div v-if="myStudentsList.length === 0" class="text-muted text-xs italic">您目前沒有直接負責的學員</div>
            </div>
          </div>

          <div class="form-group mt-3">
            <label class="form-label">📖 預習內容（選填）</label>
            <div class="mb-2">
              <div class="flex gap-2 mb-1" v-for="(_, i) in bookingForm.prep.scriptures" :key="i">
                <input class="form-input flex-1" v-model="bookingForm.prep.scriptures[i]" :placeholder="`如：約翰福音 1:1-18`" />
                <button class="btn btn-sm btn-danger" @click="bookingForm.prep.scriptures.splice(i, 1)">✕</button>
              </div>
              <button class="btn btn-sm btn-outline mt-1" @click="bookingForm.prep.scriptures.push('')" id="btn-add-scripture">＋ 新增經文</button>
            </div>
            <textarea v-model="bookingForm.prep.readingNotes" class="form-input" rows="2" placeholder="需要做什麼準備？" id="booking-prep-notes"></textarea>
            <input class="form-input mt-2" v-model="bookingForm.prep.materials" placeholder="補充材料說明（選填）" id="booking-prep-materials" />
          </div>

          <div class="modal-footer mt-4">
            <button class="btn btn-outline" @click="showCreateBookingModal = false">取消</button>
            <button class="btn btn-primary" @click="submitCreateBooking" id="btn-submit-booking">建立預約</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ─── Modal: 確認時間 ─────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showConfirmBookingModal" class="modal-overlay" @click.self="showConfirmBookingModal = false">
        <div class="glass-panel modal-card" style="max-width:420px;width:90%;padding:1.5rem;">
          <h3>✅ 確認聽課時間</h3>
          <p class="text-muted mt-2 text-sm">與講師商定的最終時間（可與提議時間不同）。</p>
          <div class="form-group mt-3">
            <label class="form-label">確認時間 *</label>
            <input type="datetime-local" v-model="confirmForm.confirmedAt" class="form-input" id="confirm-time-input" />
          </div>
          <div class="modal-footer mt-4">
            <button class="btn btn-outline" @click="showConfirmBookingModal = false">取消</button>
            <button class="btn btn-primary" @click="submitConfirmBooking" id="btn-submit-confirm">確認時間</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ─── Modal: 標記完成 + 回饋 ──────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showCompleteModal" class="modal-overlay" @click.self="showCompleteModal = false">
        <div class="glass-panel modal-card complete-modal-card">
          <h3>🎉 課後回饋記錄</h3>
          <p class="text-muted mt-1 text-sm" v-if="completingSession">
            {{ completingSession.courseTitle }} ／ {{ completingSession.lecturerTitle }} {{ completingSession.lecturerName }}
            ／ {{ formatBookingTime(completingSession) }}
          </p>
          <div class="form-group mt-4">
            <label class="form-label">🗒️ 場次整體備注（教師填）</label>
            <textarea v-model="completeForm.teacherNotes" class="form-input" rows="2" placeholder="整體場次情況..." id="complete-session-notes"></textarea>
          </div>
          <div class="complete-attendees mt-4">
            <label class="form-label mb-2">👤 個別學員回饋</label>
            <div v-for="att in completingAttendees" :key="att.studentUsername" class="complete-attendee-card">
              <div class="complete-att-header">
                <div>
                  <strong>{{ getStudentDisplayName(att.studentUsername) }}</strong>
                  <span class="text-muted text-xs ml-2">@{{ att.studentUsername }}</span>
                </div>
                <div class="att-status-toggle">
                  <button
                    :class="['att-toggle-btn', { active: completeForm.attendeeData[att.studentUsername]?.attendanceStatus === 'attended' }]"
                    @click="setAttStatus(att.studentUsername, 'attended')"
                  >✅ 已出席</button>
                  <button
                    :class="['att-toggle-btn danger', { active: completeForm.attendeeData[att.studentUsername]?.attendanceStatus === 'absent' }]"
                    @click="setAttStatus(att.studentUsername, 'absent')"
                  >❌ 缺席</button>
                </div>
              </div>
              <div class="mt-2">
                <textarea
                  v-model="completeForm.attendeeData[att.studentUsername].teacherFeedback"
                  class="form-input form-input-sm"
                  rows="2"
                  :placeholder="`對 ${getStudentDisplayName(att.studentUsername)} 的個別回饋`"
                ></textarea>
                <textarea
                  v-model="completeForm.attendeeData[att.studentUsername].studentFeedback"
                  class="form-input form-input-sm mt-1"
                  rows="2"
                  :placeholder="`${getStudentDisplayName(att.studentUsername)} 的課後心得（可代填）`"
                ></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer mt-4">
            <button class="btn btn-outline" @click="showCompleteModal = false">取消</button>
            <button class="btn btn-primary" @click="submitCompleteBooking" id="btn-submit-complete">儲存回饋並標記完成</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showLecturerModal" class="modal-overlay">
      <div class="glass-panel modal-card lecturer-modal-card">
        <h3>{{ editingLecturerId ? '📝 編輯講師資訊' : '➕ 新增講師' }}</h3>

        <!-- Mode Toggle -->
        <div class="link-mode-toggle mt-4">
          <button
            class="link-mode-btn"
            :class="{ active: lecturerForm.linkMode === 'link' }"
            @click="lecturerForm.linkMode = 'link'; lecturerForm.linkedUsername = ''; lecturerForm.name = ''"
            id="btn-link-mode"
          >
            🔗 連結現有教師帳號
          </button>
          <button
            class="link-mode-btn"
            :class="{ active: lecturerForm.linkMode === 'custom' }"
            @click="lecturerForm.linkMode = 'custom'; lecturerForm.linkedUsername = ''"
            id="btn-custom-mode"
          >
            ✍️ 自訂姓名（外來講員）
          </button>
        </div>

        <!-- Link Mode: pick from teachers in church -->
        <div v-if="lecturerForm.linkMode === 'link'" class="form-group mt-4">
          <label class="form-label">選取教師帳號</label>
          <select
            v-model="lecturerForm.linkedUsername"
            class="form-input select-input"
            @change="onLinkedUsernameChange(lecturerForm.linkedUsername)"
            id="select-linked-teacher"
          >
            <option value="">— 請選擇 —</option>
            <option v-for="t in teachersInChurch" :key="t.username" :value="t.username">
              {{ t.displayLabel }}
            </option>
          </select>
          <p v-if="teachersInChurch.length === 0" class="text-xs text-muted mt-1">
            ⚠️ 本教會目前無任何教師帳號
          </p>
          <div v-if="lecturerForm.linkedUsername" class="linked-user-preview mt-2">
            <span class="linked-chip">🔗 已連結 @{{ lecturerForm.linkedUsername }}</span>
            <span class="text-xs text-muted ml-2">名稱將自動同步</span>
          </div>
        </div>

        <!-- Lecturer display name (editable in custom mode, auto in link mode) -->
        <div class="form-group" :class="{ 'mt-4': lecturerForm.linkMode !== 'link' }">
          <label class="form-label">
            講師顯示名稱
            <span v-if="lecturerForm.linkMode === 'link'" class="text-xs text-muted ml-1">（已從帳號自動帶入，可修改）</span>
          </label>
          <input
            v-model="lecturerForm.name"
            type="text"
            class="form-input"
            placeholder="請輸入姓名"
            id="input-lecturer-name"
          />
        </div>

        <div class="form-group">
          <label class="form-label">講師稱號</label>
          <select v-model="lecturerForm.title" class="form-input select-input" id="select-lecturer-title">
            <option value="牧師">牧師</option>
            <option value="傳道">傳道</option>
            <option value="長老">長老</option>
            <option value="輔導">輔導</option>
            <option value="老師">老師</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">指派講授課程 <span class="text-xs text-muted">（可複選，代表此人可被學員選取為授課講師）</span></label>
          <div class="courses-checkboxes-grid mt-2">
            <label v-for="c in coursesStore.courses" :key="c.id" class="check-item-row">
              <input type="checkbox" :value="c.id" v-model="lecturerForm.courseIds" />
              <span>{{ c.title }} <span class="text-xs text-muted">({{ c.category === 'bible' ? '聖經' : '講座' }})</span></span>
            </label>
          </div>
        </div>

        <div class="flex justify-end gap-2 mt-6" style="display: flex; justify-content: flex-end;">
          <button @click="showLecturerModal = false" class="btn btn-outline btn-sm">取消</button>
          <button @click="saveLecturer" class="btn btn-secondary btn-sm" id="btn-save-lecturer">儲存</button>
        </div>
      </div>
    </div>
    </Teleport>

    <!-- HIGH-FIDELITY PRINT LAYOUT IN TEACHER VIEW (Hidden on screen) -->
    <div v-if="selectedStudent" class="print-page-layout print-only">
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
              <p class="print-info-line"><span>✦ 姓名：</span><strong>{{ getShining(selectedStudent.username).name || '____________' }}</strong></p>
              <p class="print-info-line"><span>✦ 生日：</span><strong>{{ getShining(selectedStudent.username).birthday || '____________' }}</strong></p>
              <p class="print-info-line"><span>✦ 教會：</span><strong>{{ getShining(selectedStudent.username).church || '____________' }}</strong></p>
              <p class="print-info-line"><span>✦ 學校/年級：</span><strong>{{ getShining(selectedStudent.username).schoolGrade || '____________' }}</strong></p>
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
                <span class="print-check-circle" :class="{ checked: getShining(selectedStudent.username).faithPhase1[key] }">
                  {{ getShining(selectedStudent.username).faithPhase1[key] ? '✓' : '' }}
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
                  <span class="print-check-circle" :class="{ checked: getShining(selectedStudent.username).faithPhase2[key] }">
                    {{ getShining(selectedStudent.username).faithPhase2[key] ? '✓' : '' }}
                  </span>
                  <span class="print-check-text" v-if="key === 'courses30'">
                    我已經聽完 30 個論 (聽課數: {{ selectedStudent.completedCount }}/30)
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
                <span class="print-check-circle" :class="{ checked: getShining(selectedStudent.username).advancedChallenges[key] }">
                  {{ getShining(selectedStudent.username).advancedChallenges[key] ? '✓' : '' }}
                </span>
                <span class="print-check-text" v-if="key === 'custom'">
                  {{ getShining(selectedStudent.username).customChallenge || '自訂挑戰項目（未填寫）' }}
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
                <td>{{ getShining(selectedStudent.username).characterLectures[theme]?.speaker || '' }}</td>
                <td>{{ getShining(selectedStudent.username).characterLectures[theme]?.date || '' }}</td>
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
                <td>{{ getShining(selectedStudent.username).comingOfAgeTopics[theme]?.speaker || '' }}</td>
                <td>{{ getShining(selectedStudent.username).comingOfAgeTopics[theme]?.date || '' }}</td>
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
              <div class="print-sig-space">
                {{ coursesStore.getStudentCaretaker(selectedStudent.username, 'teacher') }}
              </div>
            </div>
            <div class="print-sig-col">
              <span class="print-sig-lbl">✦ 牧者</span>
              <div class="print-sig-space">
                {{ coursesStore.getStudentCaretaker(selectedStudent.username, 'pastor') }}
              </div>
            </div>
            <div class="print-sig-col">
              <span class="print-sig-lbl">✦ 家長/導師</span>
              <div class="print-sig-space">
                {{ coursesStore.getStudentCaretaker(selectedStudent.username, 'parent') }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

      <!-- Section: Annual Teaching Stats -->
      <section class="glass-panel stats-report-panel"
        v-if="activeMainTab === 'settings' && (authStore.currentUser?.role === 'teacher' || authStore.currentUser?.role === 'admin')"
      >
        <div class="stats-report-header">
          <div>
            <h3>📊 年度教學人次申報</h3>
            <p class="section-desc text-sm text-muted mt-1">
              每年度結束後，請填寫您該年度的講義教學人次。<br/>
              一次對多人講義，依「人次」計算（如一次對3人 = 3人次）。
            </p>
          </div>
          <select v-model="statsYear" class="form-input select-input stats-year-select">
            <option v-for="y in availableYears" :key="y" :value="y">{{ y }} 年度</option>
          </select>
        </div>

        <div class="stats-form-grid mt-4">
          <!-- 三十個論 block -->
          <div class="stats-group-card">
            <div class="stats-group-title">📖 三十個論</div>
            <p class="stats-group-desc text-xs text-muted mb-3">
              聖經與講義課程（bible / lecture 分類的所有課堂）
            </p>
            <div class="stats-fields">
              <div class="stats-field-item">
                <label class="form-label">
                  1對1 講義人次
                  <span class="stats-badge">一位教師 × 一位學員</span>
                </label>
                <div class="stats-input-row">
                  <input
                    v-model.number="statsForm.oneOnOne30"
                    type="number" min="0"
                    class="form-input stats-number-input"
                    placeholder="0"
                    id="stat-one-on-one-30"
                  />
                  <span class="stats-unit">人次</span>
                </div>
              </div>
              <div class="stats-field-item">
                <label class="form-label">
                  1對多 講義人次
                  <span class="stats-badge stats-badge-multi">一次對3人 = 3人次</span>
                </label>
                <div class="stats-input-row">
                  <input
                    v-model.number="statsForm.oneToMany30"
                    type="number" min="0"
                    class="form-input stats-number-input"
                    placeholder="0"
                    id="stat-one-to-many-30"
                  />
                  <span class="stats-unit">人次</span>
                </div>
              </div>
            </div>
            <div class="stats-subtotal">
              小計：<strong>{{ (statsForm.oneOnOne30 || 0) + (statsForm.oneToMany30 || 0) }}</strong> 人次
            </div>
          </div>

          <!-- 閃耀計畫課程 block -->
          <div class="stats-group-card">
            <div class="stats-group-title">✨ 閃耀計畫課程</div>
            <p class="stats-group-desc text-xs text-muted mb-3">
              品格力課程、基督教歷史、情感教育、老師的使命與精神等
            </p>
            <div class="stats-fields">
              <div class="stats-field-item">
                <label class="form-label">
                  1對1 講義人次
                  <span class="stats-badge">一位教師 × 一位學員</span>
                </label>
                <div class="stats-input-row">
                  <input
                    v-model.number="statsForm.oneOnOneShining"
                    type="number" min="0"
                    class="form-input stats-number-input"
                    placeholder="0"
                    id="stat-one-on-one-shining"
                  />
                  <span class="stats-unit">人次</span>
                </div>
              </div>
              <div class="stats-field-item">
                <label class="form-label">
                  1對多 講義人次
                  <span class="stats-badge stats-badge-multi">一次對3人 = 3人次</span>
                </label>
                <div class="stats-input-row">
                  <input
                    v-model.number="statsForm.oneToManyShining"
                    type="number" min="0"
                    class="form-input stats-number-input"
                    placeholder="0"
                    id="stat-one-to-many-shining"
                  />
                  <span class="stats-unit">人次</span>
                </div>
              </div>
            </div>
            <div class="stats-subtotal">
              小計：<strong>{{ (statsForm.oneOnOneShining || 0) + (statsForm.oneToManyShining || 0) }}</strong> 人次
            </div>
          </div>
        </div>

        <!-- Total summary -->
        <div class="stats-total-row mt-4">
          <span>{{ statsYear }} 年度合計教學人次</span>
          <span class="stats-total-num">
            {{ (statsForm.oneOnOne30 || 0) + (statsForm.oneToMany30 || 0) + (statsForm.oneOnOneShining || 0) + (statsForm.oneToManyShining || 0) }}
            人次
          </span>
        </div>

        <div class="stats-action-row mt-4">
          <span v-if="statsSavedMsg" class="stats-saved-msg">{{ statsSavedMsg }}</span>
          <button class="btn btn-primary" @click="handleSaveStats" id="btn-save-stats">
            💾 儲存 {{ statsYear }} 年度申報
          </button>
        </div>
        <p v-if="statsLastSubmit" class="stats-last-submit text-xs text-muted mt-2">
          最後更新：{{ statsLastSubmit }}
        </p>
      </section>

  <!-- Notes Dialog (placed at root level to avoid parent overflow constraints) -->
  <Teleport to="body">
    <div v-if="showNotesDialog && notesDialogStudent" class="notes-dialog-overlay" @click.self="showNotesDialog = false">
    <div class="notes-dialog-card">
      <!-- Dialog Header -->
      <div class="notes-dialog-header">
        <div class="notes-dialog-profile">
          <img :src="notesDialogStudent.avatarUrl" class="avatar-md" alt="Avatar" />
          <div>
            <h3>
              {{ notesDialogStudent.realName || notesDialogStudent.username }} 的心得與筆記
              <span v-if="notesDialogStudent.realName" class="student-id-tag-sm">@{{ notesDialogStudent.username }}</span>
            </h3>
            <p class="notes-dialog-subtitle">總完成 {{ notesDialogStudent.completedCount }} / {{ coursesStore.courses.length }} 堂課 · {{ notesDialogStudent.totalProgressPercent }}%</p>
          </div>
        </div>
        <button class="notes-close-btn" @click="showNotesDialog = false">×</button>
      </div>

      <!-- Filter Bar -->
      <div class="notes-filter-bar">
        <span class="filter-label">🔍 篩選顯示：</span>
        <div class="filter-btns">
          <button 
            :class="['filter-btn', { active: notesFilter === 'all' }]"
            @click="notesFilter = 'all'"
          >
            📚 全部 ({{ notesDialogStudent.records.length }})
          </button>
          <button 
            :class="['filter-btn', { active: notesFilter === 'completed' }]"
            @click="notesFilter = 'completed'"
          >
            ✅ 已完成 ({{ notesDialogStudent.records.filter(r => r.completed).length }})
          </button>
          <button 
            :class="['filter-btn', { active: notesFilter === 'incomplete' }]"
            @click="notesFilter = 'incomplete'"
          >
            ⏳ 未完成 ({{ notesDialogStudent.records.filter(r => !r.completed).length }})
          </button>
          <button 
            :class="['filter-btn', { active: notesFilter === 'has-notes' }]"
            @click="notesFilter = 'has-notes'"
          >
            📝 已有心得 ({{ notesDialogStudent.records.filter(r => r.notes && r.notes.trim()).length }})
          </button>
        </div>
      </div>

      <!-- Records List -->
      <div class="notes-dialog-body">
        <div v-if="filteredDialogRecords.length === 0" class="notes-empty-state">
          <div class="notes-empty-icon">💭</div>
          <p>目前沒有符合條件的紀錄</p>
        </div>
        <div 
          v-for="record in filteredDialogRecords" 
          :key="record.courseId"
          class="notes-record-card"
          :class="{ 'notes-record-completed': record.completed, 'notes-record-incomplete': !record.completed }"
        >
          <!-- Card Header -->
          <div class="notes-record-header">
            <div class="notes-record-title-row">
              <span class="notes-record-index">📖</span>
              <h5 class="notes-record-title">{{ record.courseTitle }}</h5>
            </div>
            <span :class="['notes-status-badge', record.completed ? 'status-done' : 'status-pending']">
              {{ record.completed ? '✅ 已聽完' : '⏳ 聽講中' }}
            </span>
          </div>

          <!-- Meta Info -->
          <div class="notes-record-meta">
            <span class="meta-chip">🎤 {{ record.lecturer || '未指定講師' }}</span>
            <span class="meta-chip" v-if="record.listenedAt">📅 {{ formatDateTime(record.listenedAt) }}</span>
            <span class="meta-chip" v-if="record.lastUpdated">📥 提交：{{ record.lastUpdated }}</span>
          </div>

          <!-- Notes Content -->
          <div class="notes-record-content">
            <div v-if="record.notes && record.notes.trim()" class="notes-text-box">
              <div class="notes-text-header">📝 學員心得日誌</div>
              <div class="notes-text-body">{{ record.notes }}</div>
            </div>
            <div v-else class="notes-empty-note">
              <span>🌟 學員尚未填寫心得筆記</span>
            </div>
          </div>

          <!-- Feedback Area -->
          <div class="notes-feedback-area" v-if="record.notes && authStore.currentUser?.role !== 'parent'">
            <label class="feedback-label">💬 回覆給學員</label>
            <div class="feedback-input-row">
              <input 
                v-model="feedbackInputs[notesDialogStudent.username + '_' + record.courseId]" 
                type="text" 
                class="form-input" 
                placeholder="寫下鼓勵話語、心得回应..."
              />
              <button 
                class="btn btn-primary btn-sm"
                @click="sendFeedback(notesDialogStudent.username, record.courseId)"
              >傳送</button>
            </div>
            <p v-if="feedbacksSent[notesDialogStudent.username + '_' + record.courseId]" class="feedback-sent-msg">
              {{ feedbacksSent[notesDialogStudent.username + '_' + record.courseId] }}
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuthStore, CHURCHES } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { useBookingsStore } from '@/stores/bookings'
import type { BookingSession, BookingAttendee, AttendanceStatus } from '@/stores/bookings'
import ProfileDialog from '@/components/ProfileDialog.vue'

const authStore = useAuthStore()
const coursesStore = useCoursesStore()
const bookingsStore = useBookingsStore()

const showProfileDialog = ref(false)

const teacherDisplayName = computed(() => {
  const u = authStore.currentUser
  return u?.displayName || u?.username || ''
})

const teacherBadgeMap: Record<string, string> = {
  student: '🎒', teacher: '👨‍🏫', pastor: '⛪', parent: '👨‍👩‍👦', admin: '👑'
}
const teacherRoleBadge = computed(() => teacherBadgeMap[authStore.currentUser?.role || ''] || '👤')

const currentTab = ref<'my-students' | 'all-students'>('my-students')
const searchQuery = ref('')
const selectedStudent = ref<StudentProgressSummary | null>(null)

// Main tab inside dashboard: 'care', 'settings', 'pastor-overview', or 'bookings'
const activeMainTab = ref<'care' | 'settings' | 'pastor-overview' | 'bookings'>('care')
const newCharacterTheme = ref('')
const newComingOfAgeTheme = ref('')

// Lecturer Form Modal States
const showLecturerModal = ref(false)
const editingLecturerId = ref<string | null>(null)
const lecturerForm = ref({
  name: '',
  title: '牧師',
  courseIds: [] as string[],
  linkedUsername: '',   // '' = 自訂姓名模式
  linkMode: 'custom' as 'link' | 'custom'  // 'link'=連結帳號, 'custom'=自訂
})

// Teachers available in current church for the link-account dropdown
const teachersInChurch = computed(() => {
  const church = currentContextChurch.value
  return Object.entries(authStore.usersDb)
    .filter(([, u]) => u.role === 'teacher' && u.church === church)
    .map(([username, u]) => ({
      username,
      displayLabel: u.realName
        ? `${u.realName}（@${username}）`
        : u.displayName
          ? `${u.displayName}（@${username}）`
          : `@${username}`,
      name: u.realName || u.displayName || username
    }))
})

// When linkedUsername changes in link-mode, auto-fill name from user db
function onLinkedUsernameChange(username: string) {
  if (!username) return
  const u = authStore.usersDb[username]
  if (u) {
    lecturerForm.value.name = u.realName || u.displayName || username
  }
}

// Sub tab inside details drawer: only shining now
const activeDrawerTab = ref<'notes' | 'shining'>('shining')

// Notes Dialog state
const showNotesDialog = ref(false)
const notesDialogStudent = ref<StudentProgressSummary | null>(null)
const notesFilter = ref<'all' | 'completed' | 'incomplete' | 'has-notes'>('all')

// Local models for lectures entry
const lectureForms = ref<Record<string, { speaker: string; date: string }>>({})

const adminSettingsChurch = ref('愛與話語')
const currentContextChurch = computed(() => {
  return authStore.currentUser?.role === 'admin' 
    ? adminSettingsChurch.value 
    : (authStore.currentUser?.church || '愛與話語')
})

// For mock feedback
const feedbackInputs = ref<Record<string, string>>({})
const feedbacksSent = ref<Record<string, string>>({})

// ── Teaching Stats State ────────────────────────────────
const currentYear = new Date().getFullYear()
const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i)
const statsYear = ref(currentYear)

const statsForm = ref({
  oneOnOne30: 0,
  oneToMany30: 0,
  oneOnOneShining: 0,
  oneToManyShining: 0
})

const statsSavedMsg = ref('')
const statsLastSubmit = ref('')

function loadStatsForYear(year: number) {
  const username = authStore.currentUser?.username
  if (!username) return
  const existing = coursesStore.getTeachingStats(username, year)
  statsForm.value = {
    oneOnOne30: existing.oneOnOne30,
    oneToMany30: existing.oneToMany30,
    oneOnOneShining: existing.oneOnOneShining,
    oneToManyShining: existing.oneToManyShining
  }
  statsLastSubmit.value = existing.submittedAt || ''
}

watch(statsYear, (y) => {
  loadStatsForYear(y)
  statsSavedMsg.value = ''
})

// Load on mount
loadStatsForYear(currentYear)

function handleSaveStats() {
  const username = authStore.currentUser?.username
  const church = authStore.currentUser?.church || ''
  if (!username) return
  coursesStore.saveTeachingStats(username, statsYear.value, church, {
    oneOnOne30: statsForm.value.oneOnOne30 || 0,
    oneToMany30: statsForm.value.oneToMany30 || 0,
    oneOnOneShining: statsForm.value.oneOnOneShining || 0,
    oneToManyShining: statsForm.value.oneToManyShining || 0
  })
  statsLastSubmit.value = new Date().toLocaleString('zh-TW', { hour12: false })
  statsSavedMsg.value = '✅ 已儲存！'
  setTimeout(() => { statsSavedMsg.value = '' }, 3000)
}

interface StudentRecordDetail {
  courseTitle: string
  courseId: string
  listenedTime: number
  totalDuration: number
  percent: number
  completed: boolean
  notes: string
  lastUpdated: string
  listenedAt?: string
  lecturer?: string
}

interface StudentProgressSummary {
  username: string
  realName?: string
  avatarUrl: string
  completedCount: number
  totalProgressPercent: number
  lastActive: string
  records: StudentRecordDetail[]
}

// Watch role changes to force my-students for parent
watch(() => authStore.currentUser?.role, (role) => {
  if (role === 'parent') {
    currentTab.value = 'my-students'
    activeMainTab.value = 'care'
  } else if (role === 'pastor' || role === 'admin') {
    currentTab.value = 'all-students'
  }
}, { immediate: true })

// Actions
function manageStudent(studentUsername: string) {
  if (authStore.currentUser) {
    const role = authStore.currentUser.role
    if (role === 'teacher' || role === 'pastor' || role === 'parent') {
      coursesStore.assignStudentCaretaker(studentUsername, role, authStore.currentUser.username)
    }
  }
}

function unmanageStudent(studentUsername: string) {
  if (authStore.currentUser) {
    const role = authStore.currentUser.role
    if (role === 'teacher' || role === 'pastor' || role === 'parent') {
      coursesStore.removeStudentCaretaker(studentUsername, role)
    }
  }
}

function isStudentManaged(studentUsername: string): boolean {
  if (!authStore.currentUser) return false
  const role = authStore.currentUser.role
  if (role === 'teacher' || role === 'pastor' || role === 'parent') {
    return coursesStore.getStudentCaretaker(studentUsername, role) === authStore.currentUser.username
  }
  return false
}

function getShining(username: string) {
  return coursesStore.getShiningProject(username)
}

function getCaretakerStatusText(studentUsername: string): string {
  const role = authStore.currentUser?.role
  if (role === 'teacher') {
    const t = coursesStore.getStudentCaretaker(studentUsername, 'teacher')
    return t === authStore.currentUser?.username ? '🛡️ 您負責輔導' : (t ? `由 ${t} 輔導` : '無管理輔導')
  } else if (role === 'pastor') {
    const p = coursesStore.getStudentCaretaker(studentUsername, 'pastor')
    return p === authStore.currentUser?.username ? '⛪ 您負責牧養' : (p ? `由 ${p} 牧養` : '無管理牧者')
  } else if (role === 'parent') {
    const pa = coursesStore.getStudentCaretaker(studentUsername, 'parent')
    return pa === authStore.currentUser?.username ? '👨‍👩‍👦 您負責關懷' : (pa ? `由 ${pa} 關懷` : '無管理家長')
  }
  const t = coursesStore.getStudentCaretaker(studentUsername, 'teacher')
  return t ? `由 ${t} 輔導` : '無指派人員'
}

function getCaretakerBadgeClass(studentUsername: string): string {
  const role = authStore.currentUser?.role
  const val = coursesStore.getStudentCaretaker(studentUsername, role as any)
  if (val === authStore.currentUser?.username) return 'badge-teacher'
  if (val) return 'badge-admin'
  return 'badge-student'
}

// Initialize lectures forms with student values
function initShiningForm(username: string) {
  const proj = coursesStore.getShiningProject(username)
  const form: Record<string, { speaker: string; date: string }> = {}
  
  const allThemes = [
    ...characterThemes.value,
    ...comingOfAgeThemes.value
  ]
  
  allThemes.forEach(theme => {
    const charLecture = proj.characterLectures[theme]
    const ageLecture = proj.comingOfAgeTopics[theme]
    
    form[theme] = {
      speaker: charLecture?.speaker || ageLecture?.speaker || '',
      date: charLecture?.date || ageLecture?.date || ''
    }
  })
  
  lectureForms.value = form
}

function saveLectureRow(username: string, type: 'character' | 'comingOfAge', theme: string) {
  const row = lectureForms.value[theme]
  if (!row) return
  
  coursesStore.updateShiningLecture(username, type, theme, row.speaker, row.date)
  alert(`✓ ${theme} 登記成功！`)
}

function triggerPrint(username: string) {
  console.log('Printing project for student:', username)
  window.print()
}

// Settings theme managers
function handleAddTheme(type: 'character' | 'comingOfAge') {
  const themeInput = type === 'character' ? newCharacterTheme : newComingOfAgeTheme
  if (!themeInput.value.trim()) {
    alert('請輸入主題名稱！')
    return
  }
  coursesStore.addTheme(type, themeInput.value.trim(), currentContextChurch.value)
  themeInput.value = ''
  alert('✓ 主題新增成功！')
}

function handleRenameTheme(type: 'character' | 'comingOfAge', oldName: string) {
  const newName = prompt('請輸入新的主題名稱：', oldName)
  if (newName && newName.trim() && newName.trim() !== oldName) {
    coursesStore.updateTheme(type, oldName, newName.trim(), currentContextChurch.value)
    alert('✓ 主題重新命名成功！')
  }
}

function handleDeleteTheme(type: 'character' | 'comingOfAge', themeName: string) {
  if (confirm(`確定要刪除「${themeName}」主題嗎？這將會刪除該主題在所有學員中的登錄紀錄。`)) {
    coursesStore.deleteTheme(type, themeName, currentContextChurch.value)
    alert('✓ 主題已刪除！')
  }
}

// Lecturer Actions
function openAddLecturer() {
  editingLecturerId.value = null
  lecturerForm.value = {
    name: '',
    title: '牧師',
    courseIds: [],
    linkedUsername: '',
    linkMode: 'custom'
  }
  showLecturerModal.value = true
}

function openEditLecturer(lec: any) {
  editingLecturerId.value = lec.id
  lecturerForm.value = {
    name: lec.name,
    title: lec.title,
    courseIds: [...lec.courseIds],
    linkedUsername: lec.linkedUsername || '',
    linkMode: lec.linkedUsername ? 'link' : 'custom'
  }
  showLecturerModal.value = true
}

function saveLecturer() {
  if (!lecturerForm.value.name.trim()) {
    alert('請輸入講師姓名！')
    return
  }
  const linkedUsername = lecturerForm.value.linkMode === 'link'
    ? (lecturerForm.value.linkedUsername || '')
    : ''

  if (editingLecturerId.value) {
    coursesStore.updateLecturer(
      editingLecturerId.value,
      lecturerForm.value.name,
      lecturerForm.value.title,
      lecturerForm.value.courseIds,
      currentContextChurch.value,
      linkedUsername
    )
  } else {
    coursesStore.addLecturer(
      lecturerForm.value.name,
      lecturerForm.value.title,
      lecturerForm.value.courseIds,
      currentContextChurch.value,
      linkedUsername || undefined
    )
  }
  showLecturerModal.value = false
  alert('✓ 講師儲存成功！')
}

function deleteLecturer(id: string) {
  if (confirm('確定要刪除此講師嗎？')) {
    coursesStore.deleteLecturer(id)
    alert('✓ 講師已刪除！')
  }
}

// ─── Booking Logic ───────────────────────────────────────────────────────────

/** 當前教師所在教會（教師專屬） */
const currentContextChurchForBooking = computed(() => authStore.currentUser?.church || '')

/** 我負責的學員列表（用於預約時多選） */
const myStudentsList = computed(() => {
  const me = authStore.currentUser
  if (!me) return [] as Array<{ username: string; displayName?: string; realName?: string; church?: string }>
  return Object.entries(authStore.usersDb)
    .filter(([, u]) => u.role === 'student' && u.church === me.church)
    .map(([username, u]) => ({ username, ...u }))
})

/** 教師所有場次（本人創建的） */
const myBookingSessions = computed(() => {
  const me = authStore.currentUser
  if (!me) return []
  return bookingsStore.getSessionsByTeacher(me.username)
})

/** 待確認場次數（用於 tab badge） */
const pendingBookingsCount = computed(() =>
  myBookingSessions.value.filter(s => s.status === 'pending').length
)

/** 過濾狀態 */
const bookingFilter = ref<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all')

const bookingFilters = computed(() => [
  { value: 'all',       label: '全部',   count: myBookingSessions.value.length },
  { value: 'pending',   label: '⏳ 待確認', count: myBookingSessions.value.filter(s => s.status === 'pending').length },
  { value: 'confirmed', label: '📅 已確認', count: myBookingSessions.value.filter(s => s.status === 'confirmed').length },
  { value: 'completed', label: '✅ 已完成', count: myBookingSessions.value.filter(s => s.status === 'completed').length },
  { value: 'cancelled', label: '❌ 已取消', count: myBookingSessions.value.filter(s => s.status === 'cancelled').length },
])

const filteredBookingSessions = computed<BookingSession[]>(() => {
  if (bookingFilter.value === 'all') return myBookingSessions.value
  return myBookingSessions.value.filter(s => s.status === bookingFilter.value)
})

/** 依選擇課程篩選可用講師 */
const availableLecturers = computed(() => {
  const courseId = bookingForm.value.courseId
  if (!courseId) return coursesStore.lecturers.filter(l => l.church === currentContextChurchForBooking.value)
  return coursesStore.lecturers.filter(l =>
    l.church === currentContextChurchForBooking.value &&
    l.courseIds.includes(courseId)
  )
})

// ── Booking Create Modal ────────────────────────────────────────────────────

const showCreateBookingModal = ref(false)
const bookingForm = ref({
  courseId: '',
  lecturerId: '',
  proposedAt: '',
  durationMinutes: 90,
  studentUsernames: [] as string[],
  prep: {
    scriptures: [] as string[],
    readingNotes: '',
    materials: ''
  }
})

function openCreateBooking() {
  bookingForm.value = {
    courseId: '', lecturerId: '', proposedAt: '',
    durationMinutes: 90, studentUsernames: [],
    prep: { scriptures: [], readingNotes: '', materials: '' }
  }
  showCreateBookingModal.value = true
}

function onBookingCourseChange() {
  bookingForm.value.lecturerId = '' // 重置講師選擇
}

function submitCreateBooking() {
  const f = bookingForm.value
  if (!f.courseId || !f.lecturerId || !f.proposedAt) {
    alert('請填寫必填欄位：課程、講師、提議時間')
    return
  }
  if (f.studentUsernames.length === 0) {
    alert('請至少選擇一位學員')
    return
  }
  const course = coursesStore.courses.find(c => c.id === f.courseId)
  const lecturer = coursesStore.lecturers.find(l => l.id === f.lecturerId)
  if (!course || !lecturer) return

  // Filter out empty scripture entries
  const cleanScriptures = f.prep.scriptures.filter(s => s.trim() !== '')

  bookingsStore.createSession({
    courseId: f.courseId,
    courseTitle: course.title,
    lecturerId: f.lecturerId,
    lecturerName: lecturer.name,
    lecturerTitle: lecturer.title,
    teacherUsername: authStore.currentUser!.username,
    proposedAt: f.proposedAt,
    durationMinutes: f.durationMinutes,
    prep: { ...f.prep, scriptures: cleanScriptures },
    studentUsernames: f.studentUsernames,
    church: currentContextChurchForBooking.value
  })
  showCreateBookingModal.value = false
  alert('✅ 預約已建立！')
}

// ── Confirm Modal ────────────────────────────────────────────────────────────

const showConfirmBookingModal = ref(false)
const confirmingSessionId = ref('')
const confirmForm = ref({ confirmedAt: '' })

function confirmBooking(session: BookingSession) {
  confirmingSessionId.value = session.id
  confirmForm.value.confirmedAt = session.proposedAt  // 預填提議時間
  showConfirmBookingModal.value = true
}

function submitConfirmBooking() {
  if (!confirmForm.value.confirmedAt) {
    alert('請填寫確認時間')
    return
  }
  bookingsStore.updateSessionStatus(confirmingSessionId.value, 'confirmed', {
    confirmedAt: confirmForm.value.confirmedAt
  })
  showConfirmBookingModal.value = false
  alert('✅ 時間已確認！')
}

// ── Complete Modal ────────────────────────────────────────────────────────────

const showCompleteModal = ref(false)
const completingSession = ref<BookingSession | null>(null)
const completingAttendees = ref<BookingAttendee[]>([])
const completeForm = ref<{
  teacherNotes: string
  attendeeData: Record<string, { attendanceStatus: AttendanceStatus; teacherFeedback: string; studentFeedback: string }>
}>({ teacherNotes: '', attendeeData: {} })

function openCompleteBooking(session: BookingSession) {
  completingSession.value = session
  completingAttendees.value = bookingsStore.getAttendeesForSession(session.id)
  completeForm.value = {
    teacherNotes: session.teacherSessionNotes || '',
    attendeeData: Object.fromEntries(
      completingAttendees.value.map(a => [a.studentUsername, {
        attendanceStatus: a.attendanceStatus === 'invited' ? 'attended' : a.attendanceStatus,
        teacherFeedback: a.teacherFeedback || '',
        studentFeedback: a.studentFeedback || ''
      }])
    )
  }
  showCompleteModal.value = true
}

function setAttStatus(username: string, status: AttendanceStatus) {
  if (completeForm.value.attendeeData[username]) {
    completeForm.value.attendeeData[username].attendanceStatus = status
  }
}

function submitCompleteBooking() {
  if (!completingSession.value) return
  const sessionId = completingSession.value.id

  // Update each attendee
  Object.entries(completeForm.value.attendeeData).forEach(([username, data]) => {
    bookingsStore.updateAttendee(sessionId, username, {
      attendanceStatus: data.attendanceStatus,
      teacherFeedback: data.teacherFeedback,
      studentFeedback: data.studentFeedback
    })
  })

  bookingsStore.completeSession(sessionId, completeForm.value.teacherNotes)
  showCompleteModal.value = false
  alert('✅ 課後回饋已儲存，場次標記為完成！')
}

// ── Cancel ────────────────────────────────────────────────────────────────────

function cancelBooking(session: BookingSession) {
  const reason = prompt('請輸入取消原因（選填）：')
  if (reason === null) return  // 按取消 = 不操作
  bookingsStore.updateSessionStatus(session.id, 'cancelled', { cancelReason: reason })
}

// ── Expand/Collapse Prep ─────────────────────────────────────────────────────

const expandedPreps = ref<Set<string>>(new Set())
function togglePrepExpand(sessionId: string) {
  if (expandedPreps.value.has(sessionId)) {
    expandedPreps.value.delete(sessionId)
  } else {
    expandedPreps.value.add(sessionId)
  }
}

// ── Display Helpers ───────────────────────────────────────────────────────────

function bookingStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '⏳ 待確認',
    confirmed: '📅 已確認',
    completed: '✅ 已完成',
    cancelled: '❌ 已取消'
  }
  return map[status] || status
}

function attendanceLabel(status: string): string {
  const map: Record<string, string> = {
    invited: '已邀請', attended: '已出席', absent: '缺席'
  }
  return map[status] || status
}

function attendanceIcon(status: string): string {
  return status === 'attended' ? '✅' : status === 'absent' ? '❌' : '📩'
}

function formatBookingTime(session: BookingSession): string {
  const dt = session.confirmedAt || session.proposedAt
  if (!dt) return '—'
  const d = new Date(dt)
  const dateStr = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
  const timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  const hasPendingConf = !session.confirmedAt && session.status === 'pending'
  return `${dateStr} ${timeStr}${hasPendingConf ? '（提議）' : ''}`
}

function getStudentDisplayName(username: string): string {
  const u = authStore.usersDb[username]
  return u?.realName || u?.displayName || username
}

// Generate the students progress summary list from databases
const studentsList = computed<StudentProgressSummary[]>(() => {
  const students: StudentProgressSummary[] = []
  const currentUserRole = authStore.currentUser?.role
  const currentChurch = authStore.currentUser?.church
  const childUsernames = authStore.currentUser?.childUsernames || []

  // 1. Determine which usernames to include based on role
  const usernamesSet = new Set<string>()

  if (currentUserRole === 'parent') {
    // Parent: only their bound children
    childUsernames.forEach(u => usernamesSet.add(u))
  } else {
    // Teacher / Pastor: gather student accounts from SAME church
    Object.keys(authStore.usersDb).forEach(username => {
      const user = authStore.usersDb[username]
      if (user.role === 'student') {
        const sameChurch = !currentChurch || user.church === currentChurch
        if (sameChurch) usernamesSet.add(username)
      }
    })
    // Also include students who have progress records but may not be in usersDb
    // (only if their church matches or if we don't know their church)
    Object.keys(coursesStore.progressDb).forEach(username => {
      if (usernamesSet.has(username)) return
      const userInDb = authStore.usersDb[username]
      if (!userInDb) {
        // Legacy record without usersDb entry — include only if no church filter
        if (!currentChurch) usernamesSet.add(username)
      }
    })
  }

  // 2. For each username, calculate completion metrics
  usernamesSet.forEach(username => {
    const records: StudentRecordDetail[] = []
    let totalCompleted = 0
    let lastActiveTime = ''
    let totalProgressSum = 0

    coursesStore.courses.forEach(course => {
      const record = coursesStore.getStudentProgress(username, course.id)
      const percent = record.completed ? 100 : 0
      
      if (record.completed) totalCompleted++
      if (record.lastUpdated && (!lastActiveTime || record.lastUpdated > lastActiveTime)) {
        lastActiveTime = record.lastUpdated
      }
      
      totalProgressSum += percent
      records.push({
        courseTitle: course.title,
        courseId: course.id,
        listenedTime: record.durationListened ?? 0,
        totalDuration: course.duration,
        percent,
        completed: record.completed,
        notes: record.notes,
        lastUpdated: record.lastUpdated,
        listenedAt: record.listenedAt,
        lecturer: record.lecturer
      })
    })

    const totalProgressPercent = coursesStore.courses.length > 0 
      ? Math.round(totalProgressSum / coursesStore.courses.length) 
      : 0

    students.push({
      username,
      realName: authStore.usersDb[username]?.realName,
      avatarUrl: authStore.usersDb[username]?.avatarUrl || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${username}`,
      completedCount: totalCompleted,
      totalProgressPercent,
      lastActive: lastActiveTime,
      records
    })
  })

  return students
})

const myStudentsCount = computed(() => {
  const currentUserRole = authStore.currentUser?.role
  const currentUsername = authStore.currentUser?.username
  return studentsList.value.filter(s => {
    if (currentUserRole === 'teacher' || currentUserRole === 'pastor' || currentUserRole === 'parent') {
      return coursesStore.getStudentCaretaker(s.username, currentUserRole) === currentUsername
    }
    return false
  }).length
})

const filteredStudents = computed(() => {
  let list = studentsList.value
  
  const currentUserRole = authStore.currentUser?.role
  const currentUsername = authStore.currentUser?.username
  
  // For parent: always show only bound children (already filtered in studentsList)
  // For teacher/pastor with my-students tab: filter to only managed students
  if (currentUserRole !== 'parent' && currentTab.value === 'my-students') {
    list = list.filter(student => {
      if (currentUserRole === 'teacher' || currentUserRole === 'pastor') {
        return coursesStore.getStudentCaretaker(student.username, currentUserRole) === currentUsername
      }
      return true
    })
  }
  
  return list.filter(student => 
    student.username.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const totalNotesSubmitted = computed(() => {
  let count = 0
  studentsList.value.forEach(s => {
    s.records.forEach(r => {
      if (r.notes && r.notes.trim() !== '') count++
    })
  })
  return count
})

// Pastor-specific computed properties
const pastorChurchStudents = computed(() => {
  const church = authStore.currentUser?.church
  if (!church) return []
  return coursesStore.getStudentsByChurch(authStore.usersDb, church)
})

const pastorChurchTeachers = computed(() => {
  const church = authStore.currentUser?.church
  if (!church) return []
  return coursesStore.getTeachersByChurch(authStore.usersDb, church)
})

const pastorChurchParents = computed(() => {
  const church = authStore.currentUser?.church
  if (!church) return []
  return coursesStore.getParentsByChurch(authStore.usersDb, church)
})

function setCaretaker(studentUsername: string, role: 'teacher' | 'pastor' | 'parent', value: string) {
  if (role === 'parent') {
    const oldParent = coursesStore.getStudentCaretaker(studentUsername, 'parent')
    if (oldParent && authStore.usersDb[oldParent]) {
      const oldList = authStore.usersDb[oldParent].childUsernames || []
      authStore.usersDb[oldParent].childUsernames = oldList.filter(u => u !== studentUsername)
    }
    if (value && authStore.usersDb[value]) {
      const newList = authStore.usersDb[value].childUsernames || []
      if (!newList.includes(studentUsername)) {
        newList.push(studentUsername)
      }
      authStore.usersDb[value].childUsernames = newList
    }
  }

  if (value === '') {
    coursesStore.removeStudentCaretaker(studentUsername, role)
  } else {
    coursesStore.assignStudentCaretaker(studentUsername, role, value)
  }
}

const pastorLecturerStats = computed(() => {
  const church = authStore.currentUser?.church
  if (!church) return []
  return coursesStore.getLecturerStatsForChurch(authStore.usersDb, church)
})

function getTeacherManagedStudents(teacherUsername: string): string[] {
  return coursesStore.getStudentsManagedByTeacher(teacherUsername)
}

function openNotesDialog(student: StudentProgressSummary) {
  notesDialogStudent.value = student
  notesFilter.value = 'all'
  showNotesDialog.value = true
}

const filteredDialogRecords = computed(() => {
  if (!notesDialogStudent.value) return []
  const records = notesDialogStudent.value.records
  switch (notesFilter.value) {
    case 'completed': return records.filter(r => r.completed)
    case 'incomplete': return records.filter(r => !r.completed)
    case 'has-notes': return records.filter(r => r.notes && r.notes.trim() !== '')
    default: return records
  }
})

function viewStudentDetails(student: StudentProgressSummary) {
  selectedStudent.value = student
  activeDrawerTab.value = 'shining'
  initShiningForm(student.username)
}

function sendFeedback(username: string, courseId: string) {
  const key = `${username}_${courseId}`
  const text = feedbackInputs.value[key]
  if (!text || text.trim() === '') return
  
  feedbacksSent.value[key] = `已送出鼓勵給 ${username}：「${text}」`
  feedbackInputs.value[key] = ''
  
  setTimeout(() => {
    delete feedbacksSent.value[key]
  }, 4000)
}



function formatDateTime(dateTimeStr?: string): string {
  if (!dateTimeStr) return '未登記時間'
  return dateTimeStr.replace('T', ' ')
}

// Static Checklist Metadata
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

const characterThemes = computed(() => coursesStore.getThemesByChurch('character', currentContextChurch.value))
const comingOfAgeThemes = computed(() => coursesStore.getThemesByChurch('comingOfAge', currentContextChurch.value))
const filteredLecturers = computed(() => coursesStore.getLecturersByChurch(currentContextChurch.value))
</script>

<style scoped>
/* Drawer Tabs Selector Styles */
.drawer-tabs {
  display: flex;
  background: #F1F5F9;
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  gap: 0.25rem;
}

.drawer-tab-btn {
  flex: 1;
  padding: 0.5rem;
  border: none;
  background: transparent;
  font-family: var(--font-family);
  font-weight: 700;
  font-size: 0.85rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.drawer-tab-btn.active {
  background: white;
  color: var(--secondary-hover);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
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

.header-user-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}
.teacher-avatar-wrap {
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
}
.teacher-avatar-sm {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px solid rgba(99,102,241,0.25);
  object-fit: cover;
  transition: opacity 0.2s;
}
.teacher-avatar-wrap:hover .teacher-avatar-sm {
  opacity: 0.8;
}
.teacher-role-badge {
  position: absolute;
  bottom: -3px;
  right: -3px;
  background: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.last-login-hint-sm {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin-top: 2px;
}


.stats-grid {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.stat-box {
  background: white;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 120px;
}

.stat-val {
  font-size: 2rem;
  font-weight: 700;
  color: var(--secondary);
}

.stat-lbl {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
}

/* Dashboard Columns */
.dashboard-body {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 2rem;
}

@media (max-width: 950px) {
  .dashboard-body {
    grid-template-columns: 1fr;
  }
}

.panel-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.tab-selectors {
  display: flex;
  background: rgba(255, 255, 255, 0.5);
  padding: 0.2rem;
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: var(--radius-full);
}

.tab-btn {
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

.tab-btn.active {
  background: var(--secondary);
  color: white;
}

.search-input {
  max-width: 250px;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-full);
}

/* Table styling */
.table-container {
  overflow-x: auto;
}

.students-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.students-table th {
  padding: 0.75rem 1rem;
  color: var(--text-secondary);
  font-weight: 700;
  border-bottom: 2px solid #E2E8F0;
  font-size: 0.9rem;
}

.students-table td {
  padding: 1rem;
  border-bottom: 1px solid #E2E8F0;
  vertical-align: middle;
  font-size: 0.9rem;
}

.student-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.avatar-sm {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-full);
  background: #F1F5F9;
  border: 2px solid var(--secondary);
}

.student-name {
  font-weight: 700;
  color: var(--text-primary);
}

/* Name + account ID layout in student table */
.student-name-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.student-id-tag {
  font-size: 0.68rem;
  color: var(--text-muted);
  font-weight: 600;
  letter-spacing: 0.02em;
}

/* Smaller inline tag for drawer / dialog headers */
.student-id-tag-sm {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-weight: 500;
  background: rgba(0,0,0,0.05);
  padding: 1px 6px;
  border-radius: 4px;
  margin-left: 6px;
  vertical-align: middle;
}

/* Nickname tag shown below real name */
.student-nickname-tag {
  font-size: 0.68rem;
  color: var(--text-muted);
  font-weight: 500;
  font-style: italic;
}


.table-progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.percent-label {
  font-weight: 700;
  color: var(--text-secondary);
  font-size: 0.8rem;
  min-width: 32px;
}

.table-bar {
  flex-grow: 1;
  max-width: 120px;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.empty-row {
  color: var(--text-muted);
  padding: 3rem;
}

/* Drawer Section */
.student-details-drawer {
  background: white;
  padding: 2rem;
  border-radius: var(--radius-lg);
  align-self: start;
  position: sticky;
  top: 96px;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #E2E8F0;
  padding-bottom: 1rem;
}

.student-profile {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.avatar-md {
  width: 50px;
  height: 50px;
  border-radius: var(--radius-full);
  background: #F1F5F9;
  border: 2px solid var(--secondary);
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 1.8rem;
  color: var(--text-muted);
  cursor: pointer;
  line-height: 1;
  padding: 0.25rem;
}

.close-btn:hover {
  color: var(--text-primary);
}

.drawer-body {
  max-height: 520px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.section-title {
  font-size: 1rem;
  color: var(--text-primary);
  margin-bottom: 1rem;
  border-left: 4px solid var(--secondary);
  padding-left: 0.5rem;
  display: flex;
  align-items: center;
}

.records-stack {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.record-detail-card {
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: var(--radius-md);
  padding: 1rem;
}

.record-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.record-title-row h6 {
  font-size: 0.95rem;
  color: var(--text-primary);
}

.record-meta {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: 0.25rem;
}

.record-timestamps {
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.4;
  border-bottom: 1px dashed #E2E8F0;
  padding-bottom: 0.5rem;
  margin-bottom: 0.5rem;
}

.text-highlight {
  color: var(--primary);
}

.record-notes {
  background: white;
  border: 1px solid #E2E8F0;
  border-radius: var(--radius-sm);
  padding: 0.75rem;
}

.notes-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.notes-content {
  font-size: 0.85rem;
  color: var(--text-primary);
  white-space: pre-wrap;
}

/* Feedback Box */
.feedback-input-area {
  border-top: 1px dashed #E2E8F0;
  padding-top: 0.75rem;
}

.font-bold { font-weight: 700; }
.text-xs { font-size: 0.75rem; }

.feedback-row {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.feedback-row input {
  padding: 0.4rem 0.75rem;
}

.feedback-status {
  color: var(--primary);
  font-size: 0.75rem;
  font-weight: 600;
}

.empty-drawer {
  padding: 4rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.empty-illustration {
  font-size: 4rem;
  margin-bottom: 1.5rem;
}

.empty-drawer h4 {
  font-size: 1.15rem;
  margin-bottom: 0.5rem;
}

.empty-drawer p {
  font-size: 0.85rem;
  color: var(--text-secondary);
  max-width: 280px;
}

/* SHINING AUDIT VIEW STYLES */
.basic-info-readonly-card {
  background-color: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: var(--radius-sm);
  padding: 1rem;
}

.basic-info-readonly-card h6 {
  font-size: 0.9rem;
  border-bottom: 1px solid #E2E8F0;
  padding-bottom: 0.25rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.readonly-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.checklists-readonly-container h6 {
  font-size: 0.9rem;
  color: var(--text-primary);
}

.checklist-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.checklist-ro-column {
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: var(--radius-sm);
  padding: 0.75rem;
}

.checklist-ro-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--secondary-hover);
  border-bottom: 1px solid #E2E8F0;
  padding-bottom: 0.25rem;
  margin-bottom: 0.5rem;
}

.checklist-ro-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.ro-check-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.ro-check-row.active {
  color: var(--text-primary);
  font-weight: 600;
}

.ro-check-row .text-ro {
  line-height: 1.2;
}

.lectures-edit-section h6 {
  font-size: 0.9rem;
  color: var(--text-primary);
}

.lecture-inputs-stack {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.lecture-edit-row {
  background-color: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: var(--radius-sm);
  padding: 0.65rem 0.85rem;
}

.row-theme-name {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.35rem;
}

.inputs-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.inputs-row input {
  padding: 0.35rem 0.5rem;
  flex: 1;
}

.mb-0 {
  margin-bottom: 0;
}

/* HIGH FIDELITY PRINT MEDIA OVERRIDES FOR TEACHER VIEW */
.print-only {
  display: none;
}

@media print {
  /* Hide all screen elements completely */
  .no-print, nav, header, .main-tabs, .btn, .tab-selectors, #app-container, .main-content, .student-details-drawer {
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

/* Settings tab controls */
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

.theme-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 220px;
  overflow-y: auto;
}

.theme-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: #F8FAFC;
  border-radius: 6px;
  margin-bottom: 0.35rem;
  border: 1px solid #E2E8F0;
  font-size: 0.9rem;
}

.theme-item-actions {
  display: flex;
  gap: 0.25rem;
}

.lecturers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
  max-height: 500px;
  overflow-y: auto;
}

.lecturer-card {
  background: white;
  border-radius: var(--radius-sm);
  padding: 1.25rem;
  border: 1px solid #E2E8F0;
  box-shadow: var(--shadow-sm);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-card {
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
}

/* ─── Lecturer Modal ─── */
.lecturer-modal-card {
  max-width: 620px;
  width: 90%;
  max-height: 88vh;
  overflow-y: auto;
  padding: 2rem;
}

.link-mode-toggle {
  display: flex;
  gap: 0.5rem;
  background: rgba(99, 102, 241, 0.05);
  border: 1px solid rgba(99, 102, 241, 0.12);
  border-radius: 10px;
  padding: 0.35rem;
}

.link-mode-btn {
  flex: 1;
  padding: 0.55rem 0.75rem;
  font-size: 0.82rem;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.link-mode-btn.active {
  background: var(--primary);
  color: white;
  box-shadow: 0 2px 8px rgba(99,102,241,0.3);
}

.linked-user-preview {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: rgba(16, 185, 129, 0.06);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 8px;
}

.linked-chip {
  font-size: 0.78rem;
  font-weight: 700;
  color: #059669;
}

/* Lecturer card link badges */
.lec-link-tags {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.lec-linked-badge {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 20px;
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.lec-custom-badge {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 20px;
  background: rgba(245, 158, 11, 0.1);
  color: #D97706;
  border: 1px solid rgba(245, 158, 11, 0.25);
}

.courses-checkboxes-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  max-height: 220px;
  overflow-y: auto;
  padding: 8px;
  border: 1px solid rgba(99,102,241,0.12);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.8);
}

.check-item-row {
  font-size: 0.82rem;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  cursor: pointer;
  padding: 2px 0;
}

.inputs-row-readonly {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  background: #F8FAFC;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  border: 1px dashed #E2E8F0;
  color: var(--text-secondary);
}

/* Pastor Overview Grid */
/* ─── Annual Teaching Stats Report Panel ─── */
.stats-report-panel {
  padding: 2rem;
  margin-top: 1.5rem;
}

.stats-report-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.stats-year-select {
  min-width: 120px;
  flex-shrink: 0;
}

.stats-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}

@media (max-width: 768px) {
  .stats-form-grid {
    grid-template-columns: 1fr;
  }
}

.stats-group-card {
  background: rgba(99, 102, 241, 0.04);
  border: 1px solid rgba(99, 102, 241, 0.1);
  border-radius: 12px;
  padding: 1.25rem;
}

.stats-group-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.stats-group-desc {
  line-height: 1.5;
}

.stats-fields {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.stats-field-item .form-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 0.35rem;
  font-size: 0.82rem;
}

.stats-badge {
  display: inline-block;
  font-size: 0.62rem;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 20px;
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary);
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.stats-badge-multi {
  background: rgba(245, 158, 11, 0.1);
  color: #D97706;
  border-color: rgba(245, 158, 11, 0.2);
}

.stats-input-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stats-number-input {
  width: 90px !important;
  text-align: center;
  font-weight: 700;
  font-size: 1.1rem;
}

.stats-unit {
  font-size: 0.82rem;
  color: var(--text-muted);
  font-weight: 500;
}

.stats-subtotal {
  margin-top: 0.75rem;
  padding-top: 0.65rem;
  border-top: 1px solid rgba(99, 102, 241, 0.1);
  font-size: 0.82rem;
  color: var(--text-secondary);
  text-align: right;
}

.stats-subtotal strong {
  color: var(--primary);
  font-size: 1rem;
}

.stats-total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.08) 100%);
  border: 1px solid rgba(99,102,241,0.15);
  border-radius: 10px;
  padding: 0.85rem 1.25rem;
  font-weight: 600;
}

.stats-total-num {
  font-size: 1.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stats-action-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 1rem;
}

.stats-saved-msg {
  font-size: 0.85rem;
  color: #10B981;
  font-weight: 600;
}

.stats-last-submit {
  text-align: right;
}

.pastor-overview-grid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.pastor-stats-panel {
  padding: 2rem;
  border-radius: var(--radius-lg);
}

.pastor-stats-panel h3 {
  font-size: 1.4rem;
  color: var(--primary);
}

.pastor-stats-grid {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.pastor-teacher-panel,
.pastor-lecturer-panel {
  padding: 1.75rem;
  border-radius: var(--radius-lg);
}

.managed-students-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.mr-1 { margin-right: 0.25rem; }

/* ===================== Notes Dialog ===================== */
.notes-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(6px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  padding: 1rem;
}

.notes-dialog-card {
  width: 100%;
  max-width: 840px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 32px 96px rgba(0, 0, 0, 0.28);
  overflow: hidden;
}

.notes-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #E2E8F0;
  background: linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 100%);
  flex-shrink: 0;
}

.notes-dialog-profile {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.notes-dialog-profile h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: #1e293b;
}

.notes-dialog-subtitle {
  margin: 0;
  font-size: 0.82rem;
  color: #64748B;
}

.notes-close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(0,0,0,0.06);
  border-radius: 50%;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #475569;
  transition: background 0.15s;
  flex-shrink: 0;
}

.notes-close-btn:hover {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}

/* Filter Bar */
.notes-filter-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 2rem;
  background: #F8FAFC;
  border-bottom: 1px solid #E2E8F0;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.filter-label {
  font-size: 0.82rem;
  font-weight: 700;
  color: #64748B;
  white-space: nowrap;
}

.filter-btns {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 0.35rem 0.9rem;
  border: 2px solid #E2E8F0;
  border-radius: 999px;
  background: white;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748B;
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1.5;
}

.filter-btn:hover {
  border-color: #6366F1;
  color: #6366F1;
  background: #EEF2FF;
}

.filter-btn.active {
  background: #6366F1;
  border-color: #6366F1;
  color: white;
  box-shadow: 0 3px 10px rgba(99, 102, 241, 0.3);
}

/* Dialog Body */
.notes-dialog-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 1.25rem 1.75rem;
  /* Use block layout (not flex) so cards do NOT flex-shrink to zero */
  display: block;
  background: #F1F5F9;
}

.notes-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #94A3B8;
  gap: 0.5rem;
}

.notes-empty-icon {
  font-size: 2.5rem;
  opacity: 0.5;
}

/* Individual record card */
.notes-record-card {
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #E2E8F0;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
  overflow: hidden;
  transition: box-shadow 0.2s ease;
  flex-shrink: 0;       /* prevent flex shrinking (safety net) */
  margin-bottom: 0.85rem; /* gap replacement for block layout */
}

.notes-record-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.notes-record-completed {
  border-left: 4px solid #10B981;
}

.notes-record-incomplete {
  border-left: 4px solid #F59E0B;
}

.notes-record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.85rem 1.25rem;
  background: #FAFBFC;
  border-bottom: 1px solid #F0F2F5;
}

.notes-record-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  flex: 1;
}

.notes-record-index {
  font-size: 1rem;
  flex-shrink: 0;
}

.notes-record-title {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 700;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notes-status-badge {
  padding: 0.2rem 0.7rem;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
  margin-left: 0.75rem;
}

.status-done {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.status-pending {
  background: rgba(245, 158, 11, 0.1);
  color: #D97706;
}

.notes-record-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0.55rem 1.25rem;
  background: white;
  border-bottom: 1px dashed #EAECF0;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.75rem;
  color: #64748B;
  background: #F1F5F9;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  border: 1px solid #E2E8F0;
}

.notes-record-content {
  padding: 0.85rem 1.25rem;
  background: white;
}

.notes-text-box {
  background: #F0FDF4;
  border: 1px solid #BBF7D0;
  border-radius: 8px;
  overflow: hidden;
}

.notes-text-header {
  font-size: 0.73rem;
  font-weight: 700;
  color: #16A34A;
  padding: 0.35rem 0.8rem;
  background: rgba(22, 163, 74, 0.07);
  border-bottom: 1px solid #BBF7D0;
}

.notes-text-body {
  padding: 0.7rem 0.8rem;
  font-size: 0.88rem;
  line-height: 1.75;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.notes-empty-note {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.65rem;
  background: #F8FAFC;
  border-radius: 8px;
  font-size: 0.83rem;
  color: #94A3B8;
  font-style: italic;
  border: 1px dashed #E2E8F0;
}

/* Feedback */
.notes-feedback-area {
  padding: 0.8rem 1.25rem;
  border-top: 1px dashed #E2E8F0;
  background: #FFFBEB;
}

.feedback-label {
  display: block;
  font-size: 0.76rem;
  font-weight: 700;
  color: #92400E;
  margin-bottom: 0.45rem;
}

.feedback-input-row {
  display: flex;
  gap: 0.5rem;
}

.feedback-sent-msg {
  font-size: 0.77rem;
  color: #16A34A;
  margin-top: 0.4rem;
  font-weight: 600;
}

/* ─── Booking Styles ─────────────────────────────────────────── */

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #EF4444;
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  border-radius: 10px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  margin-left: 4px;
  vertical-align: middle;
}

.bookings-panel {
  padding: 1.5rem;
}

/* Filter tabs */
.booking-filter-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.booking-filter-btn {
  padding: 0.35rem 0.85rem;
  font-size: 0.8rem;
  font-weight: 600;
  border: 1.5px solid rgba(99, 102, 241, 0.2);
  border-radius: 20px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.18s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.booking-filter-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.filter-count {
  font-size: 0.68rem;
  background: rgba(255,255,255,0.25);
  border-radius: 10px;
  padding: 0 5px;
}

/* Booking list */
.booking-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.booking-card {
  padding: 1rem 1.25rem;
  border-radius: 12px;
  background: white;
  border: 1px solid rgba(99,102,241,0.1);
  transition: box-shadow 0.2s;
}

.booking-card:hover {
  box-shadow: 0 4px 20px rgba(99,102,241,0.1);
}

.booking-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.booking-card-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.booking-card-actions {
  display: flex;
  gap: 0.4rem;
}

/* Status badges */
.booking-status-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 700;
}

.status-pending {
  background: rgba(245, 158, 11, 0.12);
  color: #D97706;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.status-confirmed {
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary);
  border: 1px solid rgba(99, 102, 241, 0.25);
}

.status-completed {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.status-cancelled {
  background: rgba(107, 114, 128, 0.1);
  color: #6B7280;
  border: 1px solid rgba(107, 114, 128, 0.25);
}

.booking-group-badge {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  background: rgba(99, 102, 241, 0.08);
  color: var(--primary);
}

/* Info row */
.booking-info-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.5rem;
}

.booking-info-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.83rem;
}

.info-label {
  color: var(--text-secondary);
  font-size: 0.78rem;
}

.info-value {
  font-weight: 600;
  color: var(--text-primary);
}

/* Attendee chips */
.booking-attendees {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
}

.att-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.att-invited  { background: rgba(107, 114, 128, 0.08); color: #6B7280; border: 1px solid rgba(107,114,128,0.2); }
.att-attended { background: rgba(16, 185, 129, 0.1); color: #059669; border: 1px solid rgba(16,185,129,0.25); }
.att-absent   { background: rgba(239, 68, 68, 0.08); color: #DC2626; border: 1px solid rgba(239,68,68,0.2); }

/* Prep section */
.booking-prep {
  background: rgba(248, 250, 252, 0.9);
  border: 1px dashed rgba(99,102,241,0.18);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
}

.prep-toggle-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--primary);
}

.prep-section {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.scripture-chip {
  display: inline-block;
  background: rgba(99, 102, 241, 0.08);
  color: var(--primary);
  border-radius: 6px;
  padding: 1px 8px;
  font-size: 0.76rem;
  font-weight: 600;
  margin: 2px 3px 2px 0;
}

/* Completed / cancelled notes */
.booking-completed-notes {
  font-size: 0.8rem;
  color: #059669;
  background: rgba(16, 185, 129, 0.06);
  border-radius: 6px;
  padding: 0.4rem 0.75rem;
}

.booking-cancel-reason {
  font-size: 0.8rem;
  color: #DC2626;
  background: rgba(239, 68, 68, 0.06);
  border-radius: 6px;
  padding: 0.4rem 0.75rem;
}

/* Booking modals */
.booking-modal-card {
  max-width: 640px;
  width: 92%;
  max-height: 90vh;
  overflow-y: auto;
  padding: 2rem;
}

.complete-modal-card {
  max-width: 580px;
  width: 92%;
  max-height: 90vh;
  overflow-y: auto;
  padding: 2rem;
}

/* Attendee selector (checkbox list in create modal) */
.attendee-selector {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid rgba(99,102,241,0.12);
  border-radius: 8px;
  padding: 0.75rem;
  background: rgba(248,250,252,0.8);
}

.attendee-check-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.83rem;
  cursor: pointer;
}

.attendee-check-item input[type="checkbox"] {
  accent-color: var(--primary);
  width: 15px;
  height: 15px;
}

.att-username-hint {
  font-size: 0.72rem;
  color: var(--text-secondary);
}

/* Complete modal attendee cards */
.complete-attendees {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.complete-attendee-card {
  border: 1px solid rgba(99,102,241,0.12);
  border-radius: 10px;
  padding: 0.85rem 1rem;
  background: rgba(248,250,252,0.6);
}

.complete-att-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.att-status-toggle {
  display: flex;
  gap: 0.35rem;
}

.att-toggle-btn {
  padding: 0.25rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 20px;
  border: 1.5px solid rgba(99,102,241,0.2);
  background: transparent;
  cursor: pointer;
  transition: all 0.18s;
  color: var(--text-secondary);
}

.att-toggle-btn.active {
  background: rgba(16, 185, 129, 0.15);
  color: #059669;
  border-color: rgba(16,185,129,0.4);
}

.att-toggle-btn.danger.active {
  background: rgba(239, 68, 68, 0.12);
  color: #DC2626;
  border-color: rgba(239,68,68,0.35);
}

.form-input-sm {
  font-size: 0.82rem;
}

</style>
