<template>
  <div class="page">
    <!-- 服务器日志 -->
    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <span class="title">服务器日志（下载 / 清理）</span>
          <span>
            <el-button :icon="Refresh" :loading="logLoading" @click="loadLogs">刷新</el-button>
            <el-button type="danger" plain :icon="CircleClose" @click="handleClearAllLogs">一键清理(截断当前+删归档)</el-button>
          </span>
        </div>
      </template>
      <el-table :data="logs" v-loading="logLoading" stripe border height="520">
        <el-table-column label="文件名" prop="name" min-width="220" show-overflow-tooltip />
        <el-table-column label="目录" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ dirOf(row.path) }}</template>
        </el-table-column>
        <el-table-column label="大小" width="110" align="right">
          <template #default="{ row }">{{ formatSize(row.sizeBytes) }}</template>
        </el-table-column>
        <el-table-column label="修改时间" width="170">
          <template #default="{ row }">{{ formatTime(row.lastModified) }}</template>
        </el-table-column>
        <el-table-column label="类型" width="80" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.rolled ? 'info' : 'success'">{{ row.rolled ? '归档' : '当前' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" align="center" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" :loading="row._downloading" @click="handleDownloadLog(row)">下载</el-button>
            <el-button size="small" type="danger" plain @click="handleClearLog(row)">{{ row.rolled ? '删除' : '清空' }}</el-button>
            <el-button size="small" type="warning" plain @click="handleDownloadThenClear(row)">下载并清理</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="hint">提示：当前文件（game.log / chexuan-game.log / trace 当前文件）清理时截断为 0，进程可继续写；归档文件（.date.N.log / .gz）直接删除。</div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, CircleClose } from '@element-plus/icons-vue'
import {
  listServerLogs, downloadServerLog, clearServerLog, clearAllServerLogs
} from '../api'

const logs = ref([])
const logLoading = ref(false)

function formatSize(b) {
  if (b == null) return '—'
  if (b < 1024) return b + ' B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  if (b < 1024 * 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + ' MB'
  return (b / 1024 / 1024 / 1024).toFixed(2) + ' GB'
}
function formatTime(ms) {
  if (!ms) return '—'
  const d = new Date(ms)
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
function dirOf(path) {
  if (!path) return '—'
  const i = path.lastIndexOf('/')
  return i > 0 ? path.substring(0, i) : path
}

async function loadLogs() {
  logLoading.value = true
  try {
    const res = await listServerLogs()
    logs.value = (res.data || []).map(x => ({ ...x, _downloading: false }))
  } finally {
    logLoading.value = false
  }
}

async function handleDownloadLog(row) {
  row._downloading = true
  try {
    await downloadServerLog(row.path, row.name)
  } catch (e) {
    ElMessage.error('下载失败')
  } finally {
    row._downloading = false
  }
}

async function handleClearLog(row) {
  try {
    await ElMessageBox.confirm(
      `确定要${row.rolled ? '删除' : '清空'}「${row.name}」吗？`, '确认', { type: 'warning' })
  } catch { return }
  await clearServerLog(row.path)
  ElMessage.success('已清理')
  loadLogs()
}

async function handleDownloadThenClear(row) {
  row._downloading = true
  try {
    await downloadServerLog(row.path, row.name)
  } catch (e) {
    row._downloading = false
    ElMessage.error('下载失败，未清理')
    return
  }
  row._downloading = false
  try {
    await ElMessageBox.confirm(`「${row.name}」已开始下载，确认后将${row.rolled ? '删除' : '清空'}该文件`, '下载完成，是否清理', { type: 'warning' })
  } catch { return }
  await clearServerLog(row.path)
  ElMessage.success('已清理')
  loadLogs()
}

async function handleClearAllLogs() {
  try {
    await ElMessageBox.confirm('将截断所有当前日志并删除全部滚动归档，确定？', '一键清理', { type: 'warning' })
  } catch { return }
  const res = await clearAllServerLogs()
  const d = res.data || {}
  ElMessage.success(`清理完成：截断 ${d.truncated || 0}，删除 ${d.deleted || 0}，释放约 ${formatSize(d.freedBytes || 0)}`)
  loadLogs()
}

onMounted(() => {
  loadLogs()
})
</script>

<style scoped>
.page-card {
  margin-bottom: 16px;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.title {
  font-weight: 600;
}
.hint {
  margin-top: 10px;
  color: #909399;
  font-size: 12px;
}
</style>
