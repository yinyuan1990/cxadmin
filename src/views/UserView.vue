<template>
  <div class="user-page">
    <!-- 字段说明 -->
    <el-alert type="info" :closable="false" class="field-desc">
      <template #title>
        <strong>积分相关字段说明</strong>
      </template>
      <div class="desc-list">
        <p><el-tag size="small">gameScore</el-tag> 游戏积分（单位：分）— 坐下时扣除带入量，站起时返还剩余筹码，代表可用于游戏的积分余额</p>
        <p><el-tag size="small">diamond</el-tag> 钻石 — 用于亮牌等付费功能消耗</p>
        <p><el-tag size="small">balance</el-tag> 账户余额（预留字段，暂未使用）</p>
      </div>
    </el-alert>

    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <span class="title">用户管理</span>
          <div class="header-actions">
            <el-select v-model="type" placeholder="类型" clearable style="width: 140px" @change="handleSearch">
              <el-option label="全部" :value="null" />
              <el-option label="真人" :value="0" />
              <el-option label="打牌机器人" :value="1" />
              <el-option label="围观机器人" :value="2" />
            </el-select>
            <el-input
              v-model="keyword"
              placeholder="搜索手机号/用户名/编号"
              clearable
              style="width: 260px"
              @keyup.enter="handleSearch"
              @clear="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
            <el-button :icon="Refresh" :loading="loading" @click="handleReset">重置</el-button>
          </div>
        </div>
      </template>

      <el-table
        :data="userList"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
        row-key="id"
      >
        <el-table-column label="ID" prop="id" width="70" align="center" />
        <el-table-column label="编号" prop="numberId" width="80" align="center" />
        <el-table-column label="用户名" prop="username" width="120" show-overflow-tooltip />
        <el-table-column label="手机号" prop="phone" width="130" />
        <el-table-column label="头像" width="60" align="center">
          <template #default="{ row }">
            <el-avatar :size="32" :src="row.avatar" v-if="row.avatar">
              <el-icon><User /></el-icon>
            </el-avatar>
            <el-avatar :size="32" v-else>
              <el-icon><User /></el-icon>
            </el-avatar>
          </template>
        </el-table-column>
        <el-table-column label="游戏积分" prop="gameScore" width="110" align="right">
          <template #default="{ row }">
            <span class="score-value">{{ formatNum(row.gameScore) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="钻石" prop="diamond" width="100" align="right">
          <template #default="{ row }">
            <span class="diamond-value">{{ formatNum(row.diamond) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
              {{ row.status === 1 ? '正常' : '冻结' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.isRobot === 1" type="warning" size="small">打牌机器人</el-tag>
            <el-tag v-else-if="row.isRobot === 2" type="info" size="small">围观机器人</el-tag>
            <el-tag v-else type="success" size="small">真人</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="注册时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center" fixed="right">
          <template #default="{ row }">
            <el-dropdown trigger="click" @command="(cmd) => handleCommand(cmd, row)">
              <el-button type="primary" size="small">
                操作 <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="adjustScore">调积分</el-dropdown-item>
                  <el-dropdown-item command="adjustDiamond">调钻石</el-dropdown-item>
                  <el-dropdown-item command="updateAvatar">修改头像</el-dropdown-item>
                  <el-dropdown-item command="resetPassword" divided>修改密码</el-dropdown-item>
                  <el-dropdown-item command="scoreLog">积分变动</el-dropdown-item>
                  <el-dropdown-item command="diamondLog">钻石变动</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
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
          @current-change="loadUsers"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- 调整弹窗 -->
    <el-dialog
      v-model="adjustVisible"
      :title="adjustTitle"
      width="420px"
      destroy-on-close
    >
      <el-form :model="adjustForm" label-width="80px">
        <el-form-item label="用户">
          <span>{{ adjustForm.username }}（ID: {{ adjustForm.userId }}）</span>
        </el-form-item>
        <el-form-item label="当前值">
          <el-tag type="info" size="large">{{ formatNum(adjustForm.currentValue) }}</el-tag>
        </el-form-item>
        <el-form-item label="变动值">
          <el-input-number
            v-model="adjustForm.amount"
            :step="100"
            controls-position="right"
            style="width: 100%"
          />
          <div class="adjust-hint">正数=增加，负数=减少</div>
        </el-form-item>
        <el-form-item label="预计结果">
          <el-tag
            :type="(adjustForm.currentValue + adjustForm.amount) >= 0 ? 'success' : 'danger'"
            size="large"
          >
            {{ formatNum(adjustForm.currentValue + adjustForm.amount) }}
          </el-tag>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="adjustVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="adjusting"
          :disabled="adjustForm.amount === 0"
          @click="handleAdjust"
        >
          确认
        </el-button>
      </template>
    </el-dialog>

    <!-- 修改密码弹窗 -->
    <el-dialog
      v-model="passwordVisible"
      title="修改密码"
      width="420px"
      destroy-on-close
    >
      <el-form :model="passwordForm" label-width="80px">
        <el-form-item label="用户">
          <span>{{ passwordForm.username }}（ID: {{ passwordForm.userId }}）</span>
        </el-form-item>
        <el-form-item label="手机号">
          <span>{{ passwordForm.phone || '-' }}</span>
        </el-form-item>
        <el-form-item label="新密码">
          <el-input
            v-model="passwordForm.newPassword"
            type="password"
            show-password
            placeholder="请输入新密码，至少6位"
            maxlength="32"
          />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input
            v-model="passwordForm.confirmPassword"
            type="password"
            show-password
            placeholder="请再次输入新密码"
            maxlength="32"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="passwordVisible = false">取消</el-button>
        <el-button type="primary" :loading="resettingPassword" @click="handleResetPassword">
          确认修改
        </el-button>
      </template>
    </el-dialog>

    <!-- 修改头像弹窗 -->
    <el-dialog
      v-model="avatarVisible"
      title="修改用户头像"
      width="440px"
      destroy-on-close
    >
      <el-form :model="avatarForm" label-width="80px">
        <el-form-item label="用户">
          <span>{{ avatarForm.username }}（ID: {{ avatarForm.userId }}）</span>
        </el-form-item>
        <el-form-item label="当前头像">
          <el-avatar :size="56" :src="avatarForm.avatar" v-if="avatarForm.avatar">
            <el-icon><User /></el-icon>
          </el-avatar>
          <el-avatar :size="56" v-else><el-icon><User /></el-icon></el-avatar>
        </el-form-item>
        <el-form-item label="上传图片">
          <el-upload
            :show-file-list="false"
            :http-request="doUploadAvatar"
            accept="image/*"
          >
            <el-button type="primary" :loading="avatarUploading">选择本地图片上传</el-button>
          </el-upload>
          <div class="adjust-hint">上传后自动压缩；也可直接在下方填头像URL</div>
        </el-form-item>
        <el-form-item label="头像URL">
          <el-input v-model="avatarForm.avatar" placeholder="头像图片URL" clearable />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="avatarVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingAvatar" :disabled="!avatarForm.avatar" @click="handleSaveAvatar">
          确认修改
        </el-button>
      </template>
    </el-dialog>

    <!-- 变动日志弹窗 -->
    <el-dialog
      v-model="logVisible"
      :title="logTitle"
      width="750px"
      destroy-on-close
    >
      <el-table
        :data="logList"
        v-loading="logLoading"
        stripe
        border
        size="small"
        style="width: 100%"
        max-height="450"
      >
        <el-table-column label="时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="类型" prop="typeName" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ row.typeName }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="变动前" width="100" align="right">
          <template #default="{ row }">
            {{ formatNum(row.beforeScore ?? row.beforeAmount) }}
          </template>
        </el-table-column>
        <el-table-column label="变动" width="100" align="right">
          <template #default="{ row }">
            <span :class="getChangeClass(row)">
              {{ formatChange(row) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="变动后" width="100" align="right">
          <template #default="{ row }">
            {{ formatNum(row.afterScore ?? row.afterAmount) }}
          </template>
        </el-table-column>
        <el-table-column label="说明" prop="remark" min-width="150" show-overflow-tooltip />
      </el-table>

      <!-- 日志分页 -->
      <div class="pagination-wrap" v-if="logTotalCount > 0">
        <el-pagination
          v-model:current-page="logPage"
          :page-size="logPageSize"
          :total="logTotalCount"
          layout="total, prev, pager, next"
          @current-change="loadLog"
          small
        />
      </div>

      <el-empty v-if="!logLoading && logList.length === 0" description="暂无变动记录" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, User, ArrowDown } from '@element-plus/icons-vue'
import { getUserList, adjustGameScore, adjustDiamond, resetUserPassword, getScoreLog, getDiamondLog, updateUserAvatar, uploadAvatar } from '../api/index'

const loading = ref(false)
const userList = ref([])
const keyword = ref('')
const type = ref(null)  // 用户类型筛选：null=全部 0=真人 1=打牌机器人 2=围观机器人
const page = ref(1)
const pageSize = ref(20)
const totalCount = ref(0)

// 调整弹窗
const adjustVisible = ref(false)
const adjusting = ref(false)
const adjustTitle = ref('')
const adjustForm = ref({
  userId: null,
  username: '',
  type: '',       // 'gameScore' | 'diamond'
  currentValue: 0,
  amount: 0
})

async function loadUsers() {
  loading.value = true
  try {
    const res = await getUserList({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
      type: type.value != null ? type.value : undefined
    })
    if (res.code === 200) {
      userList.value = res.data.content || []
      totalCount.value = res.data.totalElements || 0
    } else {
      ElMessage.error(res.message || '加载失败')
    }
  } catch {
    // 拦截器已处理
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  page.value = 1
  loadUsers()
}

function handleReset() {
  keyword.value = ''
  type.value = null
  page.value = 1
  loadUsers()
}

function handleSizeChange() {
  page.value = 1
  loadUsers()
}

const passwordVisible = ref(false)
const resettingPassword = ref(false)
const passwordForm = ref({
  userId: null,
  username: '',
  phone: '',
  newPassword: '',
  confirmPassword: ''
})

function handleCommand(cmd, row) {
  switch (cmd) {
    case 'adjustScore':  openAdjust(row, 'gameScore'); break
    case 'adjustDiamond': openAdjust(row, 'diamond'); break
    case 'updateAvatar': openAvatar(row); break
    case 'resetPassword': openResetPassword(row); break
    case 'scoreLog':     openLog(row, 'score'); break
    case 'diamondLog':   openLog(row, 'diamond'); break
  }
}

// 修改头像
const avatarVisible = ref(false)
const savingAvatar = ref(false)
const avatarUploading = ref(false)
const avatarForm = ref({ userId: null, username: '', avatar: '' })

function openAvatar(row) {
  avatarForm.value = { userId: row.id, username: row.username, avatar: row.avatar || '' }
  avatarVisible.value = true
}

async function doUploadAvatar(option) {
  avatarUploading.value = true
  try {
    const res = await uploadAvatar(option.file)
    if (res.code === 200 && res.data) {
      avatarForm.value.avatar = res.data
      ElMessage.success('上传成功')
    } else {
      ElMessage.error(res.message || '上传失败')
    }
  } catch {
    ElMessage.error('上传失败')
  } finally {
    avatarUploading.value = false
  }
}

async function handleSaveAvatar() {
  const { userId, avatar } = avatarForm.value
  if (!avatar) { ElMessage.warning('请先上传图片或填写头像URL'); return }
  savingAvatar.value = true
  try {
    const res = await updateUserAvatar(userId, avatar)
    if (res.code === 200) {
      ElMessage.success('头像修改成功')
      avatarVisible.value = false
      await loadUsers()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch {
    // 拦截器已处理
  } finally {
    savingAvatar.value = false
  }
}

function openResetPassword(row) {
  passwordForm.value = {
    userId: row.id,
    username: row.username,
    phone: row.phone,
    newPassword: '',
    confirmPassword: ''
  }
  passwordVisible.value = true
}

async function handleResetPassword() {
  const { userId, username, newPassword, confirmPassword } = passwordForm.value
  if (!newPassword || newPassword.length < 6) {
    ElMessage.warning('新密码长度不能少于6位')
    return
  }
  if (newPassword !== confirmPassword) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确认重置用户 ${username} 的登录密码？重置后该用户需重新登录。`,
      '确认操作',
      { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }

  resettingPassword.value = true
  try {
    const res = await resetUserPassword(userId, newPassword)
    if (res.code === 200) {
      ElMessage.success('密码修改成功')
      passwordVisible.value = false
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch {
    // 拦截器已处理
  } finally {
    resettingPassword.value = false
  }
}

function openAdjust(row, type) {
  adjustForm.value = {
    userId: row.id,
    username: row.username,
    type,
    currentValue: type === 'gameScore' ? (row.gameScore || 0) : (row.diamond || 0),
    amount: 0
  }
  adjustTitle.value = type === 'gameScore'
    ? `调整游戏积分 — ${row.username}`
    : `调整钻石 — ${row.username}`
  adjustVisible.value = true
}

async function handleAdjust() {
  const { userId, type, amount, username } = adjustForm.value
  if (amount === 0) return

  const label = type === 'gameScore' ? '游戏积分' : '钻石'
  const sign = amount > 0 ? '+' : ''

  try {
    await ElMessageBox.confirm(
      `确认给用户 ${username} ${label} ${sign}${amount}？`,
      '确认操作',
      { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }

  adjusting.value = true
  try {
    const fn = type === 'gameScore' ? adjustGameScore : adjustDiamond
    const res = await fn(userId, amount)
    if (res.code === 200) {
      ElMessage.success(`${label}调整成功`)
      adjustVisible.value = false
      await loadUsers()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch {
    // 拦截器已处理
  } finally {
    adjusting.value = false
  }
}

// 变动日志弹窗
const logVisible = ref(false)
const logLoading = ref(false)
const logTitle = ref('')
const logList = ref([])
const logPage = ref(1)
const logPageSize = 20
const logTotalCount = ref(0)
const logType = ref('')      // 'score' | 'diamond'
const logUserId = ref(null)

function openLog(row, type) {
  logUserId.value = row.id
  logType.value = type
  logPage.value = 1
  logTitle.value = type === 'score'
    ? `积分变动记录 — ${row.username}`
    : `钻石变动记录 — ${row.username}`
  logVisible.value = true
  loadLog()
}

async function loadLog() {
  logLoading.value = true
  logList.value = []
  try {
    const fn = logType.value === 'score' ? getScoreLog : getDiamondLog
    const res = await fn({
      userId: logUserId.value,
      page: logPage.value,
      pageSize: logPageSize
    })
    if (res.code === 200) {
      logList.value = res.data.content || []
      logTotalCount.value = res.data.totalElements || 0
    } else {
      ElMessage.error(res.message || '加载失败')
    }
  } catch {
    // 拦截器已处理
  } finally {
    logLoading.value = false
  }
}

function getChangeClass(row) {
  const val = row.changeScore ?? row.changeAmount ?? 0
  return val > 0 ? 'change-positive' : val < 0 ? 'change-negative' : ''
}

function formatChange(row) {
  const val = row.changeScore ?? row.changeAmount ?? 0
  return (val > 0 ? '+' : '') + formatNum(val)
}

function formatNum(n) {
  if (n == null) return '0'
  return Number(n).toLocaleString()
}

function formatTime(t) {
  if (!t) return '-'
  // LocalDateTime 格式: "2026-03-23T10:30:00" 或数组
  if (Array.isArray(t)) {
    const [y, m, d, h = 0, min = 0, s = 0] = t
    return `${y}-${pad(m)}-${pad(d)} ${pad(h)}:${pad(min)}:${pad(s)}`
  }
  return String(t).replace('T', ' ').substring(0, 19)
}

function pad(n) {
  return String(n).padStart(2, '0')
}

onMounted(loadUsers)
</script>

<style scoped>
.user-page {
  min-height: calc(100vh - 108px);
}

.field-desc {
  margin-bottom: 16px;
  border-radius: 8px;
}

.desc-list p {
  margin: 4px 0;
  font-size: 13px;
  color: #606266;
}

.desc-list .el-tag {
  margin-right: 6px;
  font-family: monospace;
}

.page-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-value {
  color: #e6a23c;
  font-weight: 600;
}

.diamond-value {
  color: #409eff;
  font-weight: 600;
}

.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.adjust-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.change-positive {
  color: #67c23a;
  font-weight: 600;
}

.change-negative {
  color: #f56c6c;
  font-weight: 600;
}
</style>
