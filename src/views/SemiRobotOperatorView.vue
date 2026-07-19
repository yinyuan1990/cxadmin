<template>
  <div class="semi-robot-operator-page">
    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <span class="title">半自动机器人操作员</span>
          <div class="header-actions">
            <el-button :icon="Refresh" :loading="loading" @click="loadList">刷新</el-button>
            <el-button type="primary" :icon="Plus" @click="openCreateDialog">新建操作员账号</el-button>
          </div>
        </div>
      </template>

      <div class="hint" style="margin-bottom: 12px;">
        操作员是一套独立的登录体系(跟这里的超管账号、俱乐部真人账号都不是一套)，登录地址是单独部署的半自动机器人操作台(不是这个cxadmin)。
        这里只负责：①创建操作员账号 ②指定这个操作员能管理哪些俱乐部。操作员登录后只能看到/操作被分配到的俱乐部下的半自动机器人账号，
        进房/入座/带入/打牌/离开全部由操作员在操作台手动代操作，不接入自动机器人引擎。
      </div>

      <el-table :data="operators" v-loading="loading" stripe border>
        <el-table-column label="账号" prop="username" width="160" />
        <el-table-column label="备注" prop="remark" width="160" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 1"
              :loading="row._statusLoading"
              @change="val => handleToggleStatus(row, val)"
            />
          </template>
        </el-table-column>
        <el-table-column label="可管理俱乐部" min-width="320">
          <template #default="{ row }">
            <el-tag v-for="c in row.clubs" :key="c.id" size="small" style="margin: 2px;">
              {{ c.name }}({{ c.no }})
            </el-tag>
            <span v-if="!row.clubs || row.clubs.length === 0" class="hint">未分配</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createdAt" width="180" />
        <el-table-column label="操作" width="220" align="center" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openAssignDialog(row)">分配俱乐部</el-button>
            <el-button size="small" type="warning" plain @click="openResetPasswordDialog(row)">重置密码</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新建操作员 -->
    <el-dialog v-model="createVisible" title="新建操作员账号" width="520px">
      <el-form :model="createForm" label-width="90px">
        <el-form-item label="账号" required>
          <el-input v-model="createForm.username" placeholder="登录账号" />
        </el-form-item>
        <el-form-item label="密码" required>
          <el-input v-model="createForm.password" placeholder="登录密码" show-password />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="createForm.remark" placeholder="方便区分是哪个人/哪个团队用的" />
        </el-form-item>
        <el-form-item label="可管俱乐部">
          <el-select
            v-model="createForm.clubIds"
            multiple filterable remote reserve-keyword
            :remote-method="searchClubs" :loading="clubSearchLoading"
            placeholder="搜索俱乐部编号/名称"
            style="width: 100%;"
          >
            <el-option v-for="c in clubOptions" :key="c.id" :label="`${c.name}(${c.no})`" :value="c.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="createLoading" @click="handleCreate">创建</el-button>
      </template>
    </el-dialog>

    <!-- 分配俱乐部 -->
    <el-dialog v-model="assignVisible" title="分配可管俱乐部" width="520px">
      <div class="hint" style="margin-bottom: 10px;">操作员：{{ assignForm.username }}（整体覆盖，保存后以下面列表为准）</div>
      <el-select
        v-model="assignForm.clubIds"
        multiple filterable remote reserve-keyword
        :remote-method="searchClubs" :loading="clubSearchLoading"
        placeholder="搜索俱乐部编号/名称"
        style="width: 100%;"
      >
        <el-option v-for="c in clubOptions" :key="c.id" :label="`${c.name}(${c.no})`" :value="c.id" />
      </el-select>
      <template #footer>
        <el-button @click="assignVisible = false">取消</el-button>
        <el-button type="primary" :loading="assignLoading" @click="handleAssign">保存</el-button>
      </template>
    </el-dialog>

    <!-- 重置密码 -->
    <el-dialog v-model="resetPwdVisible" title="重置密码" width="420px">
      <el-form label-width="90px">
        <el-form-item label="操作员">{{ resetPwdForm.username }}</el-form-item>
        <el-form-item label="新密码" required>
          <el-input v-model="resetPwdForm.password" placeholder="新密码" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetPwdVisible = false">取消</el-button>
        <el-button type="primary" :loading="resetPwdLoading" @click="handleResetPassword">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Plus } from '@element-plus/icons-vue'
import {
  listSemiRobotOperators, createSemiRobotOperator, assignSemiRobotOperatorClubs,
  resetSemiRobotOperatorPassword, setSemiRobotOperatorStatus, listRobotClubs
} from '../api'

const loading = ref(false)
const operators = ref([])

async function loadList() {
  loading.value = true
  try {
    const res = await listSemiRobotOperators()
    if (res.code === 200) operators.value = res.data || []
  } finally {
    loading.value = false
  }
}

// ===== 俱乐部搜索(创建/分配 弹窗共用) =====
const clubOptions = ref([])
const clubSearchLoading = ref(false)
async function searchClubs(keyword) {
  clubSearchLoading.value = true
  try {
    const res = await listRobotClubs({ keyword: keyword || '', page: 0, size: 20 })
    if (res.code === 200) clubOptions.value = res.data?.list || []
  } finally {
    clubSearchLoading.value = false
  }
}

// ===== 新建操作员 =====
const createVisible = ref(false)
const createLoading = ref(false)
const createForm = reactive({ username: '', password: '', remark: '', clubIds: [] })
function openCreateDialog() {
  createForm.username = ''; createForm.password = ''; createForm.remark = ''; createForm.clubIds = []
  clubOptions.value = []
  createVisible.value = true
}
async function handleCreate() {
  if (!createForm.username || !createForm.password) {
    ElMessage.warning('账号和密码不能为空')
    return
  }
  createLoading.value = true
  try {
    const res = await createSemiRobotOperator({ ...createForm })
    if (res.code === 200) {
      ElMessage.success('创建成功')
      createVisible.value = false
      loadList()
    } else {
      ElMessage.error(res.message || '创建失败')
    }
  } finally {
    createLoading.value = false
  }
}

// ===== 分配俱乐部 =====
const assignVisible = ref(false)
const assignLoading = ref(false)
const assignForm = reactive({ operatorId: null, username: '', clubIds: [] })
function openAssignDialog(row) {
  assignForm.operatorId = row.id
  assignForm.username = row.username
  assignForm.clubIds = (row.clubs || []).map(c => c.id)
  clubOptions.value = row.clubs || []
  assignVisible.value = true
}
async function handleAssign() {
  assignLoading.value = true
  try {
    const res = await assignSemiRobotOperatorClubs({ operatorId: assignForm.operatorId, clubIds: assignForm.clubIds })
    if (res.code === 200) {
      ElMessage.success('已更新')
      assignVisible.value = false
      loadList()
    } else {
      ElMessage.error(res.message || '更新失败')
    }
  } finally {
    assignLoading.value = false
  }
}

// ===== 重置密码 =====
const resetPwdVisible = ref(false)
const resetPwdLoading = ref(false)
const resetPwdForm = reactive({ operatorId: null, username: '', password: '' })
function openResetPasswordDialog(row) {
  resetPwdForm.operatorId = row.id
  resetPwdForm.username = row.username
  resetPwdForm.password = ''
  resetPwdVisible.value = true
}
async function handleResetPassword() {
  if (!resetPwdForm.password) { ElMessage.warning('请输入新密码'); return }
  resetPwdLoading.value = true
  try {
    const res = await resetSemiRobotOperatorPassword({ operatorId: resetPwdForm.operatorId, password: resetPwdForm.password })
    if (res.code === 200) {
      ElMessage.success('已重置')
      resetPwdVisible.value = false
    } else {
      ElMessage.error(res.message || '重置失败')
    }
  } finally {
    resetPwdLoading.value = false
  }
}

// ===== 启用/禁用 =====
async function handleToggleStatus(row, val) {
  row._statusLoading = true
  try {
    const res = await setSemiRobotOperatorStatus({ operatorId: row.id, status: val ? 1 : 0 })
    if (res.code === 200) {
      row.status = val ? 1 : 0
      ElMessage.success(val ? '已启用' : '已禁用')
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } finally {
    row._statusLoading = false
  }
}

onMounted(() => {
  loadList()
  searchClubs('')
})
</script>

<style scoped>
.semi-robot-operator-page { display: flex; flex-direction: column; gap: 16px; }
.page-card { border-radius: 8px; }
.card-header { display: flex; align-items: center; justify-content: space-between; }
.card-header .title { font-weight: 600; }
.header-actions { display: flex; align-items: center; gap: 8px; }
.hint { color: #909399; font-size: 12px; }
</style>
