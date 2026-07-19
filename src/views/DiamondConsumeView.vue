<template>
  <div class="diamond-consume-page">
    <!-- 筛选区域 -->
    <el-card class="filter-card">
      <div class="filter-row">
        <div class="filter-item">
          <span class="filter-label">日期区间</span>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            :shortcuts="dateShortcuts"
            style="width: 280px"
            @change="loadData"
          />
        </div>
        <el-button type="primary" :icon="Search" @click="loadData">查询</el-button>
        <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        <span class="tip-text">消耗口径：创建/修改俱乐部、创建房间、房间周期扣费、房间送礼(钻石)、钻石兑换金币</span>
      </div>
    </el-card>

    <!-- 汇总统计卡片 -->
    <div class="summary-cards" v-loading="loading">
      <el-card class="summary-item total" shadow="hover">
        <div class="summary-label">所有俱乐部总消耗</div>
        <div class="summary-value highlight">{{ formatNum(data.totalConsume) }}</div>
      </el-card>
      <el-card class="summary-item" shadow="hover">
        <div class="summary-label">今日总消耗</div>
        <div class="summary-value">{{ formatNum(data.todayConsume) }}</div>
      </el-card>
      <el-card v-if="hasRange" class="summary-item" shadow="hover">
        <div class="summary-label">区间总消耗（{{ data.startDate }} ~ {{ data.endDate }}）</div>
        <div class="summary-value">{{ formatNum(data.rangeConsume) }}</div>
      </el-card>
      <el-card class="summary-item" shadow="hover">
        <div class="summary-label">有消耗的俱乐部数</div>
        <div class="summary-value">{{ clubCount }}</div>
      </el-card>
    </div>

    <!-- 按俱乐部明细 -->
    <el-card class="main-card">
      <div class="table-tip">点击俱乐部行可查看消耗明细（按类型分tab）</div>
      <el-table
        :data="data.clubs"
        v-loading="loading"
        stripe
        border
        size="small"
        style="width: 100%"
        row-key="clubId"
        :default-sort="{ prop: 'totalConsume', order: 'descending' }"
        @row-click="openDetail"
        class="clickable-table"
      >
        <el-table-column label="俱乐部ID" prop="clubId" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.clubId === 0" type="info" size="small">-</el-tag>
            <span v-else>{{ row.clubId }}</span>
          </template>
        </el-table-column>
        <el-table-column label="俱乐部" prop="clubName" min-width="180">
          <template #default="{ row }">
            <span :class="{ 'club-other': row.clubId === 0 }">{{ row.clubName }}</span>
            <span v-if="row.clubNo" class="club-no">({{ row.clubNo }})</span>
          </template>
        </el-table-column>
        <el-table-column label="累计消耗" prop="totalConsume" width="160" align="right" sortable>
          <template #default="{ row }">
            <span class="consume-total">{{ formatNum(row.totalConsume) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="今日消耗" prop="todayConsume" width="140" align="right" sortable>
          <template #default="{ row }">
            <span :class="{ 'consume-today': row.todayConsume > 0 }">{{ formatNum(row.todayConsume) }}</span>
          </template>
        </el-table-column>
        <el-table-column v-if="hasRange" label="区间消耗" prop="rangeConsume" width="140" align="right" sortable>
          <template #default="{ row }">
            {{ formatNum(row.rangeConsume) }}
          </template>
        </el-table-column>
        <el-table-column label="占比" width="180">
          <template #default="{ row }">
            <el-progress
              :percentage="percentOf(row.totalConsume)"
              :stroke-width="10"
              :show-text="true"
              :format="() => percentOf(row.totalConsume) + '%'"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click.stop="openDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 消耗详情弹窗（分tab） -->
    <el-dialog
      v-model="detailVisible"
      :title="`钻石消耗详情 — ${detailClub.clubName || ''}`"
      width="960px"
      top="6vh"
      destroy-on-close
    >
      <!-- 各分类汇总 -->
      <div class="detail-sums">
        <div class="sum-item">
          <span class="sum-label">游戏房间消耗</span>
          <span class="sum-value">{{ formatNum(detail.sums?.room) }}</span>
        </div>
        <div class="sum-item">
          <span class="sum-label">俱乐部消耗</span>
          <span class="sum-value">{{ formatNum(detail.sums?.club) }}</span>
        </div>
        <div class="sum-item">
          <span class="sum-label">其它消耗</span>
          <span class="sum-value">{{ formatNum(detail.sums?.other) }}</span>
        </div>
        <div class="sum-item transfer">
          <span class="sum-label">转出（非消耗，全网）</span>
          <span class="sum-value">{{ formatNum(detail.sums?.transfer) }}</span>
        </div>
      </div>

      <el-tabs v-model="detailTab" @tab-change="handleDetailTabChange">
        <el-tab-pane label="游戏房间消耗" name="room" />
        <el-tab-pane label="俱乐部消耗" name="club" />
        <el-tab-pane label="其它消耗" name="other" />
        <el-tab-pane label="转出" name="transfer" />
      </el-tabs>

      <div v-if="detailTab === 'transfer'" class="transfer-tip">
        转出（好友互转/群主转MTT机器人）不绑定俱乐部，此处为全网转出记录，与消耗分开统计
      </div>

      <el-table
        :data="detail.content"
        v-loading="detailLoading"
        stripe
        border
        size="small"
        style="width: 100%"
        max-height="420"
      >
        <el-table-column label="时间" prop="createdAt" width="160" align="center">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="用户" min-width="140">
          <template #default="{ row }">
            <span>{{ row.username || '-' }}</span>
            <span class="user-id">(ID:{{ row.userId }})</span>
          </template>
        </el-table-column>
        <el-table-column label="类型" prop="typeName" width="110" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="detailTab === 'transfer' ? 'warning' : 'danger'">{{ row.typeName }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="变动" prop="changeAmount" width="110" align="right">
          <template #default="{ row }">
            <span class="consume-amount">{{ formatNum(row.changeAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="变动后" prop="afterAmount" width="110" align="right">
          <template #default="{ row }">{{ formatNum(row.afterAmount) }}</template>
        </el-table-column>
        <el-table-column label="备注" prop="remark" min-width="240" show-overflow-tooltip />
      </el-table>

      <div class="detail-pager">
        <el-pagination
          v-model:current-page="detailPage"
          :page-size="detailPageSize"
          :total="detail.totalElements || 0"
          layout="total, prev, pager, next"
          @current-change="loadDetail"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'
import { getDiamondConsumeStats, getDiamondConsumeDetail } from '../api'

const loading = ref(false)
const dateRange = ref(null)
const data = ref({ totalConsume: 0, todayConsume: 0, rangeConsume: 0, clubs: [] })

// 详情弹窗
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailClub = ref({})
const detailTab = ref('room')
const detailPage = ref(1)
const detailPageSize = 20
const detail = ref({ sums: {}, content: [], totalElements: 0 })

const hasRange = computed(() => !!(dateRange.value && dateRange.value.length === 2))
const clubCount = computed(() => (data.value.clubs || []).filter(c => c.clubId !== 0).length)

const dateShortcuts = [
  { text: '今天', value: () => { const d = new Date(); return [d, d] } },
  { text: '近7天', value: () => { const end = new Date(); const start = new Date(); start.setDate(start.getDate() - 6); return [start, end] } },
  { text: '近30天', value: () => { const end = new Date(); const start = new Date(); start.setDate(start.getDate() - 29); return [start, end] } }
]

function formatNum(n) {
  if (n === null || n === undefined) return '0'
  return Number(n).toLocaleString()
}

function percentOf(v) {
  const total = Number(data.value.totalConsume) || 0
  if (total <= 0) return 0
  return Math.round((Number(v) / total) * 1000) / 10
}

async function loadData() {
  loading.value = true
  try {
    const params = {}
    if (hasRange.value) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const res = await getDiamondConsumeStats(params)
    if (res.code === 200) {
      data.value = res.data || { totalConsume: 0, todayConsume: 0, clubs: [] }
    }
  } finally {
    loading.value = false
  }
}

function handleReset() {
  dateRange.value = null
  loadData()
}

function formatTime(t) {
  if (!t) return '-'
  return String(t).replace('T', ' ').substring(0, 19)
}

function openDetail(row) {
  detailClub.value = row
  detailTab.value = 'room'
  detailPage.value = 1
  detail.value = { sums: {}, content: [], totalElements: 0 }
  detailVisible.value = true
  loadDetail()
}

function handleDetailTabChange() {
  detailPage.value = 1
  loadDetail()
}

async function loadDetail() {
  detailLoading.value = true
  try {
    const res = await getDiamondConsumeDetail({
      clubId: detailClub.value.clubId,
      category: detailTab.value,
      page: detailPage.value,
      pageSize: detailPageSize
    })
    if (res.code === 200) {
      detail.value = res.data || { sums: {}, content: [], totalElements: 0 }
    }
  } finally {
    detailLoading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.filter-card {
  margin-bottom: 16px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 14px;
  color: #606266;
  white-space: nowrap;
}

.tip-text {
  font-size: 12px;
  color: #909399;
}

.summary-cards {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.summary-item {
  flex: 1;
  min-width: 200px;
}

.summary-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}

.summary-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.summary-value.highlight {
  color: #409eff;
}

.club-no {
  color: #909399;
  font-size: 12px;
  margin-left: 4px;
}

.club-other {
  color: #909399;
}

.consume-total {
  font-weight: 600;
  color: #303133;
}

.consume-today {
  color: #e6a23c;
  font-weight: 600;
}

.table-tip {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

.clickable-table :deep(.el-table__row) {
  cursor: pointer;
}

.detail-sums {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.sum-item {
  flex: 1;
  min-width: 160px;
  background: #f5f7fa;
  border-radius: 6px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sum-item.transfer {
  background: #fdf6ec;
}

.sum-label {
  font-size: 12px;
  color: #909399;
}

.sum-value {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.transfer-tip {
  font-size: 12px;
  color: #e6a23c;
  margin-bottom: 8px;
}

.user-id {
  color: #909399;
  font-size: 12px;
  margin-left: 4px;
}

.consume-amount {
  color: #f56c6c;
  font-weight: 600;
}

.detail-pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
