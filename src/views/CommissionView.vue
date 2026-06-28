<template>
  <div class="commission-page">
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
          <span class="filter-label">角色</span>
          <el-select
            v-model="filter.toRole"
            placeholder="全部角色"
            clearable
            style="width: 130px"
            @change="handleFilter"
          >
            <el-option label="群主" value="OWNER" />
            <el-option label="合伙人" value="PARTNER" />
          </el-select>
        </div>

        <div class="filter-item">
          <span class="filter-label">收益人ID</span>
          <el-input
            v-model="filter.toUserId"
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
      <el-card class="summary-item total" shadow="hover">
        <div class="summary-label">总点位扣除</div>
        <div class="summary-value highlight">{{ formatNum(summary.totalCommission) }}</div>
      </el-card>
      <el-card class="summary-item total" shadow="hover">
        <div class="summary-label">总分成发放</div>
        <div class="summary-value highlight">{{ formatNum(summary.totalShareAmount) }}</div>
      </el-card>
      <el-card class="summary-item" shadow="hover">
        <div class="summary-label">总笔数</div>
        <div class="summary-value">{{ formatNum(summary.totalCount) }}</div>
      </el-card>
      <el-card
        v-for="item in summary.byRole"
        :key="item.toRole"
        class="summary-item"
        shadow="hover"
      >
        <div class="summary-label">{{ item.toRoleName }}分成</div>
        <div class="summary-value">
          <span class="summary-amount">{{ formatNum(item.totalShareAmount) }}</span>
          <span class="summary-count">{{ item.count }}笔</span>
        </div>
      </el-card>
    </div>

    <!-- Tab切换 -->
    <el-card class="main-card">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <!-- 日志列表 -->
        <el-tab-pane label="反点日志" name="logs">
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
            <el-table-column label="牌局" width="100" align="center">
              <template #default="{ row }">
                <span class="table-info">{{ row.tableId }}</span>
                <span class="hand-info">#{{ row.handNum }}</span>
              </template>
            </el-table-column>
            <el-table-column label="俱乐部" width="120" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.clubName }}
              </template>
            </el-table-column>
            <el-table-column label="赢家(产点位)" width="130">
              <template #default="{ row }">
                <span class="user-info">{{ row.fromUserName }}</span>
                <span class="user-id">({{ row.fromUserId }})</span>
              </template>
            </el-table-column>
            <el-table-column label="收益人" width="130">
              <template #default="{ row }">
                <span class="user-info">{{ row.toUserName }}</span>
                <span class="user-id">({{ row.toUserId }})</span>
              </template>
            </el-table-column>
            <el-table-column label="收益角色" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="row.toRole === 'OWNER' ? 'danger' : 'warning'" size="small">
                  {{ row.toRoleName }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="赢家盈利" prop="totalEarn" width="100" align="right">
              <template #default="{ row }">
                <span class="earn-value">{{ formatNum(row.totalEarn) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="点位总额" prop="commission" width="100" align="right">
              <template #default="{ row }">
                <span class="commission-value">{{ formatNum(row.commission) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="分得金额" prop="shareAmount" width="100" align="right">
              <template #default="{ row }">
                <span class="share-value">{{ formatNum(row.shareAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="分成比例" width="85" align="center">
              <template #default="{ row }">
                <el-tag type="info" size="small">{{ row.shareRate }}%</el-tag>
              </template>
            </el-table-column>
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

        <!-- 收益人明细 -->
        <el-tab-pane label="收益人明细" name="userSummary">
          <el-alert
            v-if="!filter.clubId"
            type="warning"
            :closable="false"
            title="请先选择俱乐部再查看收益人明细"
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
            row-key="uniqueKey"
          >
            <el-table-column label="用户ID" prop="userId" width="90" align="center" />
            <el-table-column label="用户名" prop="userName" width="120" show-overflow-tooltip />
            <el-table-column label="角色" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="row.toRole === 'OWNER' ? 'danger' : 'warning'" size="small">
                  {{ row.toRoleName }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="总分成金额" width="130" align="right">
              <template #default="{ row }">
                <span class="share-value">{{ formatNum(row.totalShareAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="总笔数" prop="count" width="90" align="center" />
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
import {
  getCreditClubs,
  getCommissionLogs,
  getCommissionSummary,
  getCommissionUserSummary
} from '../api/index'

// 筛选
const filter = reactive({
  clubId: null,
  toRole: null,
  toUserId: '',
  dateRange: null
})

const dateShortcuts = [
  {
    text: '今天',
    value: () => { const d = new Date(); return [d, d] }
  },
  {
    text: '最近7天',
    value: () => { const e = new Date(); const s = new Date(); s.setDate(s.getDate() - 6); return [s, e] }
  },
  {
    text: '最近30天',
    value: () => { const e = new Date(); const s = new Date(); s.setDate(s.getDate() - 29); return [s, e] }
  },
  {
    text: '本月',
    value: () => { const e = new Date(); const s = new Date(e.getFullYear(), e.getMonth(), 1); return [s, e] }
  },
  {
    text: '上月',
    value: () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth() - 1, 1), new Date(n.getFullYear(), n.getMonth(), 0)] }
  }
]

// 俱乐部列表
const clubList = ref([])

// 日志
const logLoading = ref(false)
const logList = ref([])
const page = ref(1)
const pageSize = ref(20)
const totalCount = ref(0)

// 汇总
const summaryLoading = ref(false)
const summary = reactive({
  totalCommission: 0,
  totalShareAmount: 0,
  totalCount: 0,
  byRole: []
})

// 收益人明细
const userSummaryLoading = ref(false)
const userSummaryList = ref([])

const activeTab = ref('logs')

async function loadClubs() {
  try {
    const res = await getCreditClubs()
    if (res.code === 200) clubList.value = res.data || []
  } catch { /* ignore */ }
}

function buildParams() {
  const p = {}
  if (filter.clubId) p.clubId = filter.clubId
  if (filter.toRole) p.toRole = filter.toRole
  if (filter.toUserId) p.toUserId = filter.toUserId
  if (filter.dateRange && filter.dateRange.length === 2) {
    p.startDate = filter.dateRange[0]
    p.endDate = filter.dateRange[1]
  }
  return p
}

async function loadLogs() {
  logLoading.value = true
  try {
    const params = { ...buildParams(), page: page.value, pageSize: pageSize.value }
    const res = await getCommissionLogs(params)
    if (res.code === 200) {
      logList.value = res.data.content || []
      totalCount.value = res.data.totalElements || 0
    } else {
      ElMessage.error(res.message || '查询失败')
    }
  } catch { /* interceptor */ }
  finally { logLoading.value = false }
}

async function loadSummary() {
  summaryLoading.value = true
  try {
    const params = buildParams()
    const res = await getCommissionSummary(params)
    if (res.code === 200) {
      summary.totalCommission = res.data.totalCommission || 0
      summary.totalShareAmount = res.data.totalShareAmount || 0
      summary.totalCount = res.data.totalCount || 0
      summary.byRole = res.data.byRole || []
    }
  } catch { /* ignore */ }
  finally { summaryLoading.value = false }
}

async function loadUserSummary() {
  if (!filter.clubId) return
  userSummaryLoading.value = true
  try {
    const params = buildParams()
    const res = await getCommissionUserSummary(params)
    if (res.code === 200) {
      userSummaryList.value = (res.data.users || []).map((u, i) => ({ ...u, uniqueKey: `${u.userId}_${u.toRole}_${i}` }))
    }
  } catch { /* ignore */ }
  finally { userSummaryLoading.value = false }
}

function handleFilter() {
  page.value = 1
  loadLogs()
  loadSummary()
  if (activeTab.value === 'userSummary') loadUserSummary()
}

function handleReset() {
  filter.clubId = null
  filter.toRole = null
  filter.toUserId = ''
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
  if (tab === 'userSummary') loadUserSummary()
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

function pad(n) { return String(n).padStart(2, '0') }

onMounted(() => {
  loadClubs()
  loadLogs()
  loadSummary()
})
</script>

<style scoped>
.commission-page {
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

.summary-item.total {
  border-left: 3px solid #e6a23c;
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

.summary-value.highlight {
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

.table-info {
  font-weight: 500;
  color: #303133;
}

.hand-info {
  font-size: 12px;
  color: #909399;
  margin-left: 2px;
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

.earn-value {
  color: #67c23a;
  font-weight: 600;
}

.commission-value {
  color: #f56c6c;
  font-weight: 600;
}

.share-value {
  color: #e6a23c;
  font-weight: 600;
}
</style>
