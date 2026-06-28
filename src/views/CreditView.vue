<template>
  <div class="credit-page">
    <!-- 筛选区域 -->
    <el-card class="filter-card">
      <div class="filter-row">
        <div class="filter-item">
          <span class="filter-label">俱乐部</span>
          <el-select
            v-model="filter.clubId"
            placeholder="全部俱乐部"
            clearable
            filterable
            style="width: 200px"
            @change="handleFilter"
          >
            <el-option
              v-for="c in clubList"
              :key="c.id"
              :label="`${c.name} (${c.no})`"
              :value="c.id"
            />
          </el-select>
        </div>

        <div class="filter-item">
          <span class="filter-label">类型</span>
          <el-select
            v-model="filter.type"
            placeholder="全部类型"
            clearable
            style="width: 180px"
            @change="handleFilter"
          >
            <el-option label="群主授信给合伙人" :value="1" />
            <el-option label="群主回收合伙人授信" :value="2" />
            <el-option label="合伙人下发积分" :value="3" />
            <el-option label="合伙人回收积分" :value="4" />
            <el-option label="成员互转积分" :value="5" />
            <el-option label="成员互转钻石" :value="6" />
            <el-option label="群主自己上分" :value="7" />
          </el-select>
        </div>

        <div class="filter-item">
          <span class="filter-label">用户ID</span>
          <el-input
            v-model="filter.userId"
            placeholder="输入用户ID"
            clearable
            style="width: 140px"
            @keyup.enter="handleFilter"
            @clear="handleFilter"
          />
        </div>

        <div class="filter-item">
          <span class="filter-label">日期</span>
          <el-date-picker
            v-model="filter.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            :shortcuts="dateShortcuts"
            style="width: 280px"
            @change="handleFilter"
          />
        </div>

        <el-button type="primary" :icon="Search" @click="handleFilter">查询</el-button>
        <el-button :icon="Refresh" @click="handleReset">重置</el-button>
      </div>
    </el-card>

    <!-- 汇总统计卡片 -->
    <div class="summary-cards" v-loading="summaryLoading">
      <el-card class="summary-item" shadow="hover">
        <div class="summary-label">总笔数</div>
        <div class="summary-value">{{ formatNum(summary.totalCount) }}</div>
      </el-card>
      <el-card class="summary-item" shadow="hover">
        <div class="summary-label">总金额</div>
        <div class="summary-value amount">{{ formatNum(summary.totalAmount) }}</div>
      </el-card>
      <el-card
        v-for="item in summary.byType"
        :key="item.type"
        class="summary-item"
        shadow="hover"
      >
        <div class="summary-label">{{ item.typeName }}</div>
        <div class="summary-value">
          <span class="summary-amount">{{ formatNum(item.totalAmount) }}</span>
          <span class="summary-count">{{ item.count }}笔</span>
        </div>
      </el-card>
    </div>

    <!-- Tab切换：日志列表 / 去向明细 -->
    <el-card class="main-card">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="日志列表" name="logs">
          <el-table
            :data="logList"
            v-loading="logLoading"
            stripe
            border
            size="small"
            style="width: 100%"
            row-key="id"
          >
            <el-table-column label="ID" prop="id" width="70" align="center" />
            <el-table-column label="俱乐部" width="120" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.clubName }}
              </template>
            </el-table-column>
            <el-table-column label="类型" width="150">
              <template #default="{ row }">
                <el-tag :type="getTypeTagColor(row.type)" size="small">
                  {{ row.typeName }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="发起人" width="130">
              <template #default="{ row }">
                <span class="user-info">{{ row.fromUserName }}</span>
                <span class="user-id">({{ row.fromUserId }})</span>
              </template>
            </el-table-column>
            <el-table-column label="接收人" width="130">
              <template #default="{ row }">
                <span class="user-info">{{ row.toUserName }}</span>
                <span class="user-id">({{ row.toUserId }})</span>
              </template>
            </el-table-column>
            <el-table-column label="金额" prop="amount" width="100" align="right">
              <template #default="{ row }">
                <span class="amount-value">{{ formatNum(row.amount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="发起人变化" width="150">
              <template #default="{ row }">
                <span class="before-after">
                  {{ formatNum(row.fromBefore) }} → {{ formatNum(row.fromAfter) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="接收人变化" width="150">
              <template #default="{ row }">
                <span class="before-after">
                  {{ formatNum(row.toBefore) }} → {{ formatNum(row.toAfter) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="备注" prop="remark" min-width="150" show-overflow-tooltip />
            <el-table-column label="时间" width="165">
              <template #default="{ row }">
                {{ formatTime(row.createdAt) }}
              </template>
            </el-table-column>
          </el-table>

          <!-- 分页 -->
          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="page"
              v-model:page-size="pageSize"
              :total="totalCount"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              @current-change="loadLogs"
              @size-change="handleSizeChange"
            />
          </div>
        </el-tab-pane>

        <el-tab-pane label="额度去向" name="userSummary">
          <el-alert
            v-if="!filter.clubId"
            type="warning"
            :closable="false"
            title="请先选择俱乐部再查看额度去向"
            style="margin-bottom: 16px"
          />

          <el-table
            v-else
            :data="userSummaryList"
            v-loading="userSummaryLoading"
            stripe
            border
            size="small"
            style="width: 100%"
            row-key="userId"
          >
            <el-table-column label="用户ID" prop="userId" width="90" align="center" />
            <el-table-column label="用户名" prop="userName" width="120" show-overflow-tooltip />
            <el-table-column label="角色" width="100">
              <template #default="{ row }">
                <el-tag :type="getRoleTagColor(row.role)" size="small">{{ row.role }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="当前授信余额" width="120" align="right">
              <template #default="{ row }">
                <span class="amount-value">{{ formatNum(row.creditBalance) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="总金额" width="110" align="right">
              <template #default="{ row }">
                <span class="amount-value">{{ formatNum(row.totalAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="总笔数" prop="totalCount" width="80" align="center" />
            <el-table-column label="各类型明细" min-width="350">
              <template #default="{ row }">
                <div class="detail-tags">
                  <el-tag
                    v-for="d in row.details"
                    :key="d.type"
                    :type="getTypeTagColor(d.type)"
                    size="small"
                    class="detail-tag"
                  >
                    {{ d.typeName }}: {{ formatNum(d.totalAmount) }} ({{ d.count }}笔)
                  </el-tag>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { getCreditClubs, getCreditLogs, getCreditSummary, getCreditUserSummary } from '../api/index'

// 筛选条件
const filter = reactive({
  clubId: null,
  type: null,
  userId: '',
  dateRange: null
})

// 日期快捷选项
const dateShortcuts = [
  {
    text: '今天',
    value: () => {
      const today = new Date()
      return [today, today]
    }
  },
  {
    text: '最近7天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 6)
      return [start, end]
    }
  },
  {
    text: '最近30天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 29)
      return [start, end]
    }
  },
  {
    text: '本月',
    value: () => {
      const end = new Date()
      const start = new Date(end.getFullYear(), end.getMonth(), 1)
      return [start, end]
    }
  },
  {
    text: '上月',
    value: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0)
      return [start, end]
    }
  }
]

// 俱乐部列表
const clubList = ref([])

// 日志列表
const logLoading = ref(false)
const logList = ref([])
const page = ref(1)
const pageSize = ref(20)
const totalCount = ref(0)

// 汇总统计
const summaryLoading = ref(false)
const summary = reactive({
  totalAmount: 0,
  totalCount: 0,
  byType: []
})

// 额度去向
const userSummaryLoading = ref(false)
const userSummaryList = ref([])

// Tab
const activeTab = ref('logs')

// 加载俱乐部列表
async function loadClubs() {
  try {
    const res = await getCreditClubs()
    if (res.code === 200) {
      clubList.value = res.data || []
    }
  } catch {
    // ignore
  }
}

// 构建查询参数
function buildParams() {
  const params = {}
  if (filter.clubId) params.clubId = filter.clubId
  if (filter.type) params.type = filter.type
  if (filter.userId) params.userId = filter.userId
  if (filter.dateRange && filter.dateRange.length === 2) {
    params.startDate = filter.dateRange[0]
    params.endDate = filter.dateRange[1]
  }
  return params
}

// 加载日志列表
async function loadLogs() {
  logLoading.value = true
  try {
    const params = buildParams()
    params.page = page.value
    params.pageSize = pageSize.value

    const res = await getCreditLogs(params)
    if (res.code === 200) {
      logList.value = res.data.content || []
      totalCount.value = res.data.totalElements || 0
    } else {
      ElMessage.error(res.message || '查询失败')
    }
  } catch {
    // interceptor handles
  } finally {
    logLoading.value = false
  }
}

// 加载汇总
async function loadSummary() {
  summaryLoading.value = true
  try {
    const params = buildParams()
    const res = await getCreditSummary(params)
    if (res.code === 200) {
      summary.totalAmount = res.data.totalAmount || 0
      summary.totalCount = res.data.totalCount || 0
      summary.byType = res.data.byType || []
    }
  } catch {
    // ignore
  } finally {
    summaryLoading.value = false
  }
}

// 加载额度去向
async function loadUserSummary() {
  if (!filter.clubId) return
  userSummaryLoading.value = true
  try {
    const params = buildParams()
    const res = await getCreditUserSummary(params)
    if (res.code === 200) {
      userSummaryList.value = res.data.users || []
    }
  } catch {
    // ignore
  } finally {
    userSummaryLoading.value = false
  }
}

// 筛选
function handleFilter() {
  page.value = 1
  loadLogs()
  loadSummary()
  if (activeTab.value === 'userSummary') {
    loadUserSummary()
  }
}

// 重置
function handleReset() {
  filter.clubId = null
  filter.type = null
  filter.userId = ''
  filter.dateRange = null
  page.value = 1
  loadLogs()
  loadSummary()
  userSummaryList.value = []
}

function handleSizeChange() {
  page.value = 1
  loadLogs()
}

function handleTabChange(tab) {
  if (tab === 'userSummary') {
    loadUserSummary()
  }
}

// 类型标签颜色
function getTypeTagColor(type) {
  const map = {
    1: 'success',   // 授信
    2: 'danger',    // 回收
    3: '',          // 下发
    4: 'warning',   // 回收积分
    5: 'info',      // 互转积分
    6: 'info',      // 互转钻石
    7: 'success'    // 群主上分
  }
  return map[type] || ''
}

function getRoleTagColor(role) {
  if (role === '群主') return 'danger'
  if (role === '合伙人') return 'warning'
  if (role === '管理员') return ''
  return 'info'
}

function formatNum(n) {
  if (n == null) return '0'
  return Number(n).toLocaleString()
}

function formatTime(t) {
  if (!t) return '-'
  if (Array.isArray(t)) {
    const [y, m, d, h = 0, min = 0, s = 0] = t
    return `${y}-${pad(m)}-${pad(d)} ${pad(h)}:${pad(min)}:${pad(s)}`
  }
  return String(t).replace('T', ' ').substring(0, 19)
}

function pad(n) {
  return String(n).padStart(2, '0')
}

onMounted(() => {
  loadClubs()
  loadLogs()
  loadSummary()
})
</script>

<style scoped>
.credit-page {
  min-height: calc(100vh - 108px);
}

.filter-card {
  margin-bottom: 16px;
  border-radius: 8px;
}

.filter-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-label {
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}

.summary-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.summary-item {
  flex: 1;
  min-width: 140px;
  border-radius: 8px;
}

.summary-item :deep(.el-card__body) {
  padding: 16px;
}

.summary-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 6px;
}

.summary-value {
  font-size: 20px;
  font-weight: 700;
  color: #303133;
}

.summary-value.amount {
  color: #e6a23c;
}

.summary-amount {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.summary-count {
  font-size: 12px;
  color: #909399;
  margin-left: 6px;
}

.main-card {
  border-radius: 8px;
}

.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.user-info {
  font-weight: 500;
  color: #303133;
}

.user-id {
  font-size: 12px;
  color: #909399;
  margin-left: 2px;
}

.amount-value {
  color: #e6a23c;
  font-weight: 600;
}

.before-after {
  font-size: 12px;
  color: #606266;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.detail-tag {
  margin: 2px 0;
}
</style>
