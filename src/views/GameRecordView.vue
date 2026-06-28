<template>
  <div class="game-record-page">
    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <span class="title">每局牌型与结算明细</span>
          <el-button :icon="Refresh" :loading="loading" @click="loadSessions">刷新</el-button>
        </div>
      </template>

      <!-- 筛选条件 -->
      <el-form :inline="true" class="filter-bar">
        <el-form-item label="俱乐部ID">
          <el-input v-model="filter.clubId" placeholder="可选" clearable size="small" style="width: 120px;" />
        </el-form-item>
        <el-form-item label="桌号(tableId)">
          <el-input v-model="filter.tableId" placeholder="可选" clearable size="small" style="width: 140px;" />
        </el-form-item>
        <el-form-item label="玩家userId">
          <el-input v-model="filter.userId" placeholder="可选" clearable size="small" style="width: 140px;" />
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker
            v-model="filter.dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            start-placeholder="开始"
            end-placeholder="结束"
            size="small"
            style="width: 240px;"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="small" @click="loadSessions">查询</el-button>
          <el-button size="small" @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 场次列表 -->
      <el-table :data="sessions" v-loading="loading" stripe size="small" style="margin-top: 12px;">
        <el-table-column prop="sessionId" label="场次ID" width="160" />
        <el-table-column prop="tableNo" label="桌号" width="100" />
        <el-table-column prop="tableId" label="桌ID" width="80" />
        <el-table-column prop="clubId" label="俱乐部" width="80" />
        <el-table-column label="开始/结束时间" min-width="180">
          <template #default="{ row }">{{ formatTime(row.lastTime) }}</template>
        </el-table-column>
        <el-table-column prop="playerCount" label="人数" width="70" align="center" />
        <el-table-column prop="roundCount" label="局数" width="70" align="center" />
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openDetail(row.sessionId)">明细</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        background
        layout="total, prev, pager, next, sizes"
        :current-page="page.current"
        :page-size="page.size"
        :total="page.total"
        :page-sizes="[10, 20, 50, 100]"
        @current-change="onPageChange"
        @size-change="onSizeChange"
        style="margin-top: 12px; justify-content: flex-end;"
      />
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="场次明细" width="92%" top="3vh" destroy-on-close>
      <div v-if="detailLoading" style="text-align:center; padding: 40px;">
        <el-icon class="is-loading" :size="22"><Loading /></el-icon>
        <span style="margin-left: 8px;">加载中…</span>
      </div>
      <template v-else-if="detail">
        <!-- 头部概要 -->
        <el-descriptions :column="4" border size="small" style="margin-bottom: 12px;">
          <el-descriptions-item label="场次ID">{{ detail.sessionId }}</el-descriptions-item>
          <el-descriptions-item label="桌号">{{ detail.tableNo || detail.tableId }}</el-descriptions-item>
          <el-descriptions-item label="俱乐部">{{ detail.clubId }}</el-descriptions-item>
          <el-descriptions-item label="局数">{{ detail.rounds.length }}</el-descriptions-item>
          <el-descriptions-item label="开始" :span="2">{{ formatTime(detail.firstTime) }}</el-descriptions-item>
          <el-descriptions-item label="结束" :span="2">{{ formatTime(detail.lastTime) }}</el-descriptions-item>
        </el-descriptions>

        <!-- 玩家总盈亏 -->
        <div style="margin-bottom: 12px;">
          <span style="font-weight:600; margin-right:12px;">玩家总盈亏：</span>
          <el-tag
            v-for="p in detail.players"
            :key="p.userId"
            :type="(p.totalEarn || 0) >= 0 ? 'success' : 'danger'"
            style="margin-right: 8px;"
          >
            #{{ p.seatNo }} {{ p.username || p.userId }}
            <span v-if="p.numberId">({{ p.numberId }})</span>
            ：{{ p.totalEarn >= 0 ? '+' : '' }}{{ p.totalEarn }}
          </el-tag>
        </div>

        <!-- 每局明细 -->
        <el-collapse v-model="activeRounds">
          <el-collapse-item
            v-for="rd in detail.rounds"
            :key="rd.roundNo"
            :title="`第 ${rd.roundNo} 局`"
            :name="rd.roundNo"
          >
            <el-table :data="rd.records" border size="small" stripe>
              <el-table-column label="座位" prop="seatNo" width="60" align="center" />
              <el-table-column label="玩家" width="160">
                <template #default="{ row }">
                  <span v-if="findPlayer(row.userId)">
                    {{ findPlayer(row.userId).username }}
                    <span style="color:#909399; font-size:12px;" v-if="findPlayer(row.userId).numberId">
                      ({{ findPlayer(row.userId).numberId }})
                    </span>
                  </span>
                  <span v-else>{{ row.userId }}</span>
                  <el-tag v-if="row.isBanker" type="warning" size="small" style="margin-left:4px;">庄</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="原始4张" width="120">
                <template #default="{ row }">
                  <span style="font-family: monospace;">{{ row.allCards }}</span>
                </template>
              </el-table-column>
              <el-table-column label="头牌" width="100">
                <template #default="{ row }">
                  <span style="font-family: monospace;">{{ row.headCards }}</span>
                  <div v-if="row.headTypeName" style="color:#409EFF; font-size:12px;">{{ row.headTypeName }}</div>
                </template>
              </el-table-column>
              <el-table-column label="尾牌" width="100">
                <template #default="{ row }">
                  <span style="font-family: monospace;">{{ row.tailCards }}</span>
                  <div v-if="row.tailTypeName" style="color:#67C23A; font-size:12px;">{{ row.tailTypeName }}</div>
                </template>
              </el-table-column>
              <el-table-column label="操作" prop="lastOpName" width="60" align="center" />
              <el-table-column label="下注(底分)" prop="totalBet" width="90" align="right" />
              <el-table-column label="下注(芒果)" prop="betMango" width="90" align="right" />
              <el-table-column label="底分盈亏" prop="scoreEarn" width="90" align="right">
                <template #default="{ row }">
                  <span :style="{ color: (row.scoreEarn || 0) >= 0 ? '#67C23A' : '#F56C6C' }">
                    {{ row.scoreEarn >= 0 ? '+' : '' }}{{ row.scoreEarn }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column label="芒果盈亏" prop="mangoEarn" width="90" align="right">
                <template #default="{ row }">
                  <span :style="{ color: (row.mangoEarn || 0) >= 0 ? '#67C23A' : '#F56C6C' }">
                    {{ row.mangoEarn >= 0 ? '+' : '' }}{{ row.mangoEarn }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column label="奖池返利" prop="bonusPoolReward" width="90" align="right">
                <template #default="{ row }">
                  <span v-if="row.bonusPoolReward">
                    +{{ row.bonusPoolReward }}
                    <div v-if="row.winTypeName" style="color:#E6A23C; font-size:11px;">{{ row.winTypeName }}</div>
                  </span>
                  <span v-else style="color:#C0C4CC;">—</span>
                </template>
              </el-table-column>
              <el-table-column label="点位" prop="commission" width="70" align="right" />
              <el-table-column label="最终盈亏" prop="finalEarn" width="100" align="right" fixed="right">
                <template #default="{ row }">
                  <span :style="{ color: (row.finalEarn || 0) >= 0 ? '#67C23A' : '#F56C6C', fontWeight: 600 }">
                    {{ row.finalEarn >= 0 ? '+' : '' }}{{ row.finalEarn }}
                  </span>
                </template>
              </el-table-column>
            </el-table>
          </el-collapse-item>
        </el-collapse>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Loading } from '@element-plus/icons-vue'
import { listGameRecordSessions, getGameRecordSessionDetail } from '../api/index'

const loading = ref(false)
const sessions = ref([])
const filter = reactive({
  clubId: '',
  tableId: '',
  userId: '',
  dateRange: []
})
const page = reactive({
  current: 1,
  size: 20,
  total: 0
})

const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref(null)
const activeRounds = ref([])

const playerMap = computed(() => {
  if (!detail.value) return {}
  const m = {}
  for (const p of detail.value.players) m[p.userId] = p
  return m
})

function findPlayer(userId) {
  return playerMap.value[userId]
}

function formatTime(t) {
  if (!t) return '—'
  return String(t).replace('T', ' ').slice(0, 19)
}

async function loadSessions() {
  loading.value = true
  try {
    const params = {
      page: page.current,
      pageSize: page.size,
    }
    if (filter.clubId) params.clubId = filter.clubId
    if (filter.tableId) params.tableId = filter.tableId
    if (filter.userId) params.userId = filter.userId
    if (filter.dateRange && filter.dateRange.length === 2) {
      params.startDate = filter.dateRange[0]
      params.endDate = filter.dateRange[1]
    }
    const res = await listGameRecordSessions(params)
    if (res.code === 200) {
      sessions.value = res.data.content || []
      page.total = res.data.totalElements || 0
    } else {
      ElMessage.error(res.message || '查询失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '查询失败')
  } finally {
    loading.value = false
  }
}

function resetFilter() {
  filter.clubId = ''
  filter.tableId = ''
  filter.userId = ''
  filter.dateRange = []
  page.current = 1
  loadSessions()
}

function onPageChange(p) {
  page.current = p
  loadSessions()
}

function onSizeChange(s) {
  page.size = s
  page.current = 1
  loadSessions()
}

async function openDetail(sessionId) {
  detail.value = null
  detailVisible.value = true
  detailLoading.value = true
  try {
    const res = await getGameRecordSessionDetail(sessionId)
    if (res.code === 200) {
      detail.value = res.data
      // 默认打开第 1 局
      activeRounds.value = res.data.rounds.length > 0 ? [res.data.rounds[0].roundNo] : []
    } else {
      ElMessage.error(res.message || '查询失败')
      detailVisible.value = false
    }
  } catch (e) {
    ElMessage.error(e.message || '查询失败')
    detailVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

onMounted(() => {
  loadSessions()
})
</script>

<style scoped>
.game-record-page {
  min-height: calc(100vh - 108px);
}
.page-card {
  border-radius: 8px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.title {
  font-weight: 600;
  font-size: 16px;
}
.filter-bar {
  margin-bottom: 0;
}
</style>
