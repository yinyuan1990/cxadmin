<template>
  <div class="metrics-page">
    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <span class="title">服务器监控</span>
          <div style="display:flex; gap:12px; align-items:center;">
            <span style="color:#909399; font-size:12px;" v-if="lastUpdate">
              最后刷新: {{ formatTime(lastUpdate) }}
            </span>
            <el-tooltip content="自动每 5 秒刷新一次">
              <el-switch v-model="autoRefresh" inline-prompt active-text="自动" inactive-text="手动" />
            </el-tooltip>
            <el-button :icon="Refresh" :loading="loading" size="small" @click="loadMetrics">刷新</el-button>
          </div>
        </div>
      </template>

      <div v-if="!data" style="text-align:center; padding:40px; color:#909399;">加载中...</div>
      <template v-else>
        <!-- 业务指标 -->
        <el-card class="m-card" shadow="never">
          <template #header><span class="m-title">🎮 业务指标</span></template>
          <div class="m-grid">
            <div class="m-item">
              <div class="m-label">总房间数</div>
              <div class="m-value">{{ data.business?.totalRooms ?? 0 }}</div>
            </div>
            <div class="m-item">
              <div class="m-label">游戏中房间</div>
              <div class="m-value" style="color:#67C23A;">{{ data.business?.activeRooms ?? 0 }}</div>
            </div>
            <div class="m-item">
              <div class="m-label">等待中房间</div>
              <div class="m-value" style="color:#909399;">{{ data.business?.waitingRooms ?? 0 }}</div>
            </div>
            <div class="m-item">
              <div class="m-label">座位上玩家</div>
              <div class="m-value">{{ data.business?.totalSeated ?? 0 }}</div>
            </div>
            <div class="m-item">
              <div class="m-label">房间内成员</div>
              <div class="m-value">{{ data.business?.totalRoomMembers ?? 0 }}</div>
            </div>
            <div class="m-item">
              <div class="m-label">在线 WebSocket</div>
              <div class="m-value" style="color:#409EFF;">{{ data.business?.onlineWebSocket ?? 0 }}</div>
            </div>
          </div>
        </el-card>

        <!-- JVM -->
        <el-card class="m-card" shadow="never">
          <template #header><span class="m-title">☕ JVM 内存 / 线程 / GC</span></template>
          <div class="m-grid">
            <div class="m-item">
              <div class="m-label">堆内存使用</div>
              <div class="m-value" :style="heapColor(data.jvm?.heapUsagePct)">
                {{ data.jvm?.heapUsedMB ?? 0 }} / {{ data.jvm?.heapMaxMB ?? 0 }} MB
              </div>
              <el-progress
                :percentage="data.jvm?.heapUsagePct ?? 0"
                :color="heapProgressColor(data.jvm?.heapUsagePct)"
                :show-text="true"
                :stroke-width="6"
              />
            </div>
            <div class="m-item">
              <div class="m-label">线程数</div>
              <div class="m-value">{{ data.jvm?.threadCount ?? 0 }}</div>
              <div class="m-sub">峰值: {{ data.jvm?.threadPeak ?? 0 }} / Daemon: {{ data.jvm?.threadDaemon ?? 0 }}</div>
            </div>
            <div class="m-item">
              <div class="m-label">GC 总次数</div>
              <div class="m-value">{{ data.jvm?.gcTotalCount ?? 0 }}</div>
              <div class="m-sub">耗时: {{ data.jvm?.gcTotalTimeMs ?? 0 }} ms</div>
            </div>
            <div class="m-item">
              <div class="m-label">运行时长</div>
              <div class="m-value">{{ formatUptime(data.jvm?.uptimeSeconds) }}</div>
            </div>
          </div>
        </el-card>

        <!-- HikariCP -->
        <el-card class="m-card" shadow="never">
          <template #header><span class="m-title">🗄 数据库连接池 (HikariCP)</span></template>
          <div class="m-grid">
            <div class="m-item">
              <div class="m-label">活跃连接</div>
              <div class="m-value" :style="hikariActiveColor(data.hikari)">{{ data.hikari?.active ?? 0 }}</div>
            </div>
            <div class="m-item">
              <div class="m-label">空闲连接</div>
              <div class="m-value">{{ data.hikari?.idle ?? 0 }}</div>
            </div>
            <div class="m-item">
              <div class="m-label">总连接数</div>
              <div class="m-value">{{ data.hikari?.total ?? 0 }} / {{ data.hikari?.maxPoolSize ?? 0 }}</div>
              <el-progress
                :percentage="hikariUsagePct"
                :color="hikariProgressColor"
                :show-text="true"
                :stroke-width="6"
              />
            </div>
            <div class="m-item">
              <div class="m-label">等待获取连接的线程</div>
              <div class="m-value" :style="(data.hikari?.waitingThreads ?? 0) > 0 ? 'color:#F56C6C;' : 'color:#67C23A;'">
                {{ data.hikari?.waitingThreads ?? 0 }}
              </div>
              <div class="m-sub" v-if="(data.hikari?.waitingThreads ?? 0) > 0" style="color:#F56C6C;">
                ⚠️ 有线程在等待连接,可能要扩池
              </div>
            </div>
          </div>
        </el-card>

        <!-- 系统 -->
        <el-card class="m-card" shadow="never">
          <template #header><span class="m-title">🖥 系统资源</span></template>
          <div class="m-grid">
            <div class="m-item">
              <div class="m-label">CPU 核数</div>
              <div class="m-value">{{ data.system?.availableProcessors ?? '-' }}</div>
            </div>
            <div class="m-item">
              <div class="m-label">系统 CPU 使用率</div>
              <div class="m-value" :style="cpuColor(data.system?.cpuLoadPct)">
                {{ (data.system?.cpuLoadPct ?? -1) >= 0 ? data.system.cpuLoadPct + '%' : '-' }}
              </div>
              <el-progress
                v-if="(data.system?.cpuLoadPct ?? -1) >= 0"
                :percentage="data.system?.cpuLoadPct ?? 0"
                :color="cpuProgressColor(data.system?.cpuLoadPct)"
                :show-text="true"
                :stroke-width="6"
              />
            </div>
            <div class="m-item">
              <div class="m-label">进程 CPU 使用率</div>
              <div class="m-value">{{ (data.system?.processCpuLoadPct ?? -1) >= 0 ? data.system.processCpuLoadPct + '%' : '-' }}</div>
            </div>
            <div class="m-item">
              <div class="m-label">系统负载 (load avg)</div>
              <div class="m-value">{{ formatLoadAvg(data.system?.systemLoadAverage) }}</div>
            </div>
            <div class="m-item">
              <div class="m-label">系统内存使用</div>
              <div class="m-value" :style="memColor(data.system?.usedMemoryPct)">
                {{ data.system?.usedMemoryPct ?? 0 }}%
              </div>
              <div class="m-sub">
                总: {{ data.system?.totalMemoryMB ?? 0 }} MB / 空闲: {{ data.system?.freeMemoryMB ?? 0 }} MB
              </div>
            </div>
            <div class="m-item">
              <div class="m-label">磁盘 /opt/soft</div>
              <div class="m-value" :style="diskColor(data.system?.diskOptSoftUsagePct)">
                {{ data.system?.diskOptSoftUsagePct ?? '-' }}%
              </div>
              <div class="m-sub">
                空闲: {{ data.system?.diskOptSoftFreeGB ?? '-' }} GB / 总: {{ data.system?.diskOptSoftTotalGB ?? '-' }} GB
              </div>
            </div>
          </div>
        </el-card>

        <!-- trace 文件 -->
        <el-card class="m-card" shadow="never" v-if="data.traceFiles?.files">
          <template #header>
            <span class="m-title">📂 trace 日志文件</span>
            <span style="color:#909399; font-size:12px; margin-left:8px;">
              共 {{ data.traceFiles.fileCount }} 个 / {{ data.traceFiles.totalSizeMB }} MB
              <span v-if="data.traceFiles.totalSizeMB > 1000" style="color:#F56C6C;">⚠️ 超过 1GB,建议清理</span>
            </span>
          </template>
          <el-table :data="data.traceFiles.files" size="small" stripe>
            <el-table-column prop="name" label="文件名" />
            <el-table-column label="大小" width="120">
              <template #default="{ row }">
                <span :style="row.sizeMB > 100 ? 'color:#F56C6C; font-weight:600;' : ''">
                  {{ row.sizeMB }} MB
                </span>
              </template>
            </el-table-column>
            <el-table-column label="最后修改" width="180">
              <template #default="{ row }">{{ formatTime(row.lastModified) }}</template>
            </el-table-column>
            <el-table-column label="说明" min-width="200">
              <template #default="{ row }">
                <span style="color:#909399; font-size:12px;">{{ traceFileDesc(row.name) }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </template>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { getServerMetrics } from '../api/index'

const data = ref(null)
const loading = ref(false)
const autoRefresh = ref(true)
const lastUpdate = ref(0)
let pollTimer = null

const hikariUsagePct = computed(() => {
  const h = data.value?.hikari
  if (!h || !h.maxPoolSize) return 0
  return Math.round((h.total || 0) * 100 / h.maxPoolSize)
})

const hikariProgressColor = computed(() => {
  const p = hikariUsagePct.value
  if (p > 90) return '#F56C6C'
  if (p > 70) return '#E6A23C'
  return '#67C23A'
})

function heapColor(p) {
  if ((p ?? 0) > 90) return 'color:#F56C6C; font-weight:600;'
  if ((p ?? 0) > 75) return 'color:#E6A23C;'
  return ''
}
function heapProgressColor(p) {
  if ((p ?? 0) > 90) return '#F56C6C'
  if ((p ?? 0) > 75) return '#E6A23C'
  return '#67C23A'
}
function hikariActiveColor(h) {
  if (!h) return ''
  const pct = h.maxPoolSize ? (h.active * 100 / h.maxPoolSize) : 0
  if (pct > 80) return 'color:#F56C6C; font-weight:600;'
  if (pct > 60) return 'color:#E6A23C;'
  return ''
}
function cpuColor(p) {
  if ((p ?? -1) < 0) return 'color:#909399;'
  if (p > 80) return 'color:#F56C6C; font-weight:600;'
  if (p > 60) return 'color:#E6A23C;'
  return ''
}
function cpuProgressColor(p) {
  if (p > 80) return '#F56C6C'
  if (p > 60) return '#E6A23C'
  return '#67C23A'
}
function memColor(p) {
  if ((p ?? 0) > 90) return 'color:#F56C6C; font-weight:600;'
  if ((p ?? 0) > 75) return 'color:#E6A23C;'
  return ''
}
function diskColor(p) {
  if ((p ?? 0) > 90) return 'color:#F56C6C; font-weight:600;'
  if ((p ?? 0) > 75) return 'color:#E6A23C;'
  return ''
}

function formatTime(t) {
  if (!t) return ''
  const d = new Date(typeof t === 'number' ? t : parseInt(t))
  return d.toLocaleString('zh-CN', { hour12: false })
}
function formatUptime(sec) {
  if (!sec) return '-'
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (d > 0) return `${d}天 ${h}时 ${m}分`
  if (h > 0) return `${h}时 ${m}分`
  return `${m} 分钟`
}
function formatLoadAvg(v) {
  if (v == null || v < 0) return '-'
  return Number(v).toFixed(2)
}
function traceFileDesc(name) {
  const map = {
    'cf.txt': '主调试日志(可在配置关闭)',
    'js.txt': '筹码变更追踪(含奖池)',
    '休芒.txt': '休芒+死皮规则',
    '揍芒.txt': '揍芒规则',
    '三花.txt': '三花处理',
    '桌子.txt': '桌子生命周期',
    '离开.txt': '玩家离开/掉线',
    'jrjlb.txt': '加入俱乐部追踪',
    'jlyx.txt': '游戏存档保存',
    'fjlcz.txt': '强制秀牌付费',
    'moneymore.txt': '🔴 资金审计(永久开)',
    '接口.txt': '🔴 接口失败诊断(永久开)',
    'jf.txt': '🔴 合伙人反点(永久开)',
  }
  return map[name] || ''
}

async function loadMetrics() {
  loading.value = true
  try {
    const res = await getServerMetrics()
    if (res.code === 200) {
      data.value = res.data
      lastUpdate.value = Date.now()
    } else {
      ElMessage.error(res.message || '获取指标失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '获取指标失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadMetrics()
  pollTimer = setInterval(() => {
    if (autoRefresh.value) loadMetrics()
  }, 5000)
})

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<style scoped>
.metrics-page {
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

.m-card {
  margin-top: 16px;
  border: 1px solid #ebeef5;
}
.m-title {
  font-weight: 600;
  font-size: 14px;
}
.m-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}
.m-item {
  background: #fafbfc;
  padding: 12px 16px;
  border-radius: 6px;
}
.m-label {
  color: #909399;
  font-size: 12px;
  margin-bottom: 4px;
}
.m-value {
  color: #303133;
  font-size: 22px;
  font-weight: 600;
  font-family: ui-monospace, SF Mono, Menlo, monospace;
}
.m-sub {
  color: #909399;
  font-size: 11px;
  margin-top: 4px;
}
</style>
