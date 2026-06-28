<template>
  <div class="super-club-page">
    <el-alert type="info" :closable="false" class="intro">
      <template #title>
        <strong>大联盟俱乐部（type=3）</strong>
      </template>
      <div class="desc-list">
        <p>• 公共俱乐部，任何用户都可用「搜索俱乐部编号」加入，无需审批。</p>
        <p>• 不扣钻石；群主默认取「用户表最早的真实用户」，也可在创建时指定。</p>
        <p>• 反点 / 授信 / 合伙人逻辑与普通俱乐部一致，分成仍然发到群主账户。</p>
        <p>• 「后台建房」不扣钻石，房间创建人 = 群主。</p>
      </div>
    </el-alert>

    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <span class="title">大联盟俱乐部列表</span>
          <div class="header-actions">
            <el-button :icon="Refresh" :loading="loading" @click="loadList">刷新</el-button>
            <el-button type="primary" :icon="Plus" @click="handleCreate">创建大联盟俱乐部</el-button>
          </div>
        </div>
      </template>

      <el-table
        :data="clubList"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
        row-key="id"
      >
        <el-table-column label="ID" prop="id" width="70" align="center" />
        <el-table-column label="编号" prop="no" width="90" align="center" />
        <el-table-column label="名称" prop="name" width="120" show-overflow-tooltip />
        <el-table-column label="头像" width="60" align="center">
          <template #default="{ row }">
            <el-avatar :size="32" :src="row.avatar" v-if="row.avatar">
              <el-icon><Avatar /></el-icon>
            </el-avatar>
            <el-avatar :size="32" v-else>
              <el-icon><Avatar /></el-icon>
            </el-avatar>
          </template>
        </el-table-column>
        <el-table-column label="简介" prop="remark" min-width="160" show-overflow-tooltip />
        <el-table-column label="群主" width="160">
          <template #default="{ row }">
            <div class="owner-cell">
              <span>{{ row.ownerName }}</span>
              <span class="sub">ID:{{ row.createrId }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="成员数" prop="memberCount" width="80" align="center" />
        <el-table-column label="牌桌数" prop="tableCount" width="80" align="center" />
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">
            <span>{{ formatTime(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="340" align="center" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="handleEdit(row)">修改</el-button>
            <el-button size="small" type="primary" @click="handleCreateGame(row)">建房</el-button>
            <el-button size="small" type="info" @click="handleViewTables(row)">牌桌</el-button>
            <el-button size="small" type="warning" @click="handleManageMembers(row)">成员</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && clubList.length === 0" description="暂无大联盟俱乐部，点击右上角创建" />
    </el-card>

    <!-- 创建 / 修改俱乐部 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '创建大联盟俱乐部' : '修改大联盟俱乐部'"
      width="520px"
      destroy-on-close
    >
      <el-form :model="clubForm" label-width="90px" :rules="clubRules" ref="clubFormRef">
        <el-form-item label="名称" prop="name">
          <el-input v-model="clubForm.name" maxlength="6" show-word-limit placeholder="1-6 字" />
        </el-form-item>
        <el-form-item label="简介" prop="remark">
          <el-input v-model="clubForm.remark" maxlength="100" show-word-limit type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="头像" prop="avatar">
          <div class="avatar-uploader-wrap">
            <el-upload
              class="avatar-uploader"
              :show-file-list="false"
              :auto-upload="true"
              :http-request="handleAvatarUpload"
              :before-upload="beforeAvatarUpload"
              accept="image/*"
            >
              <img v-if="clubForm.avatar" :src="clubForm.avatar" class="avatar-preview" />
              <div v-else class="avatar-placeholder">
                <el-icon><Plus /></el-icon>
                <div class="tip">上传头像</div>
              </div>
            </el-upload>
            <div class="avatar-hint">
              <el-button size="small" link @click="triggerAvatarClear" v-if="clubForm.avatar">重置</el-button>
              <div class="form-hint">支持 jpg/png，最大 5MB；上传后自动替换</div>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="公告">
          <el-input v-model="clubForm.notice" maxlength="500" type="textarea" :rows="2" placeholder="可选" />
        </el-form-item>
        <el-form-item v-if="dialogMode === 'create'" label="群主 userId">
          <el-input v-model.number="clubForm.ownerUserId" placeholder="留空则使用系统最早真实用户" />
          <div class="form-hint">不填则由后端自动选择 user 表中最早注册的真实用户</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ dialogMode === 'create' ? '创建' : '保存' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 建房对话框 -->
    <el-dialog
      v-model="gameDialogVisible"
      :title="`为「${currentClub?.name || ''}」创建房间`"
      width="640px"
      destroy-on-close
    >
      <el-form :model="gameForm" label-width="110px" :rules="gameRules" ref="gameFormRef">
        <el-form-item label="房间名称" prop="gameName">
          <el-input v-model="gameForm.gameName" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="房间人数" prop="playerCount">
          <el-input-number v-model="gameForm.playerCount" :min="2" :max="8" />
          <span class="form-hint">2 ~ 8 人</span>
        </el-form-item>
        <el-form-item label="底注" prop="baseScore">
          <el-select v-model="gameForm.baseScore" placeholder="请选择底注" style="width:200px">
            <el-option
              v-for="v in gameConfig.availableBaseScores"
              :key="v" :label="v" :value="v"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="芒果封顶" prop="mangoMax">
          <el-select v-model="gameForm.mangoMax" placeholder="请选择" style="width:200px">
            <el-option
              v-for="opt in gameConfig.availableMangoMax"
              :key="opt.value" :label="opt.label" :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="结算时间" prop="settleTime">
          <el-select v-model="gameForm.settleTime" placeholder="请选择" style="width:200px">
            <el-option
              v-for="opt in gameConfig.availableSettleTime"
              :key="opt.value" :label="opt.label" :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="点位" prop="commissionRate">
          <el-input-number v-model="gameForm.commissionRate" :min="0" :max="gameConfig.commissionRateMax || 10" />
          <span class="form-hint">0 = 不抽水</span>
        </el-form-item>
        <el-form-item label="可选规则">
          <el-checkbox v-model="gameForm.diWang">地王</el-checkbox>
          <el-checkbox v-model="gameForm.sanHua">三花</el-checkbox>
          <el-checkbox v-model="gameForm.gps">GPS</el-checkbox>
          <el-checkbox v-model="gameForm.voice">语音</el-checkbox>
          <el-checkbox v-model="gameForm.noScore" :disabled="gameForm.queue">无分模式</el-checkbox>
          <el-checkbox v-model="gameForm.bonusPool">奖池</el-checkbox>
          <el-checkbox v-model="gameForm.queue" :disabled="gameForm.noScore">排队</el-checkbox>
        </el-form-item>
        <el-form-item v-if="gameForm.queue" label="排队人数" prop="queuePlayerCount">
          <el-input-number v-model="gameForm.queuePlayerCount" :min="2" :max="gameForm.playerCount" />
          <span class="form-hint">2 ~ 房间人数</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="gameDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="gameSubmitting" @click="handleCreateGameSubmit">
          创建房间
        </el-button>
      </template>
    </el-dialog>

    <!-- 牌桌列表 -->
    <el-dialog
      v-model="tablesDialogVisible"
      :title="`「${currentClub?.name || ''}」的牌桌`"
      width="760px"
      destroy-on-close
    >
      <el-table :data="tableList" v-loading="tablesLoading" stripe border>
        <el-table-column label="房间ID" prop="tableId" width="80" align="center" />
        <el-table-column label="桌号" prop="tableNo" width="90" align="center" />
        <el-table-column label="名称" prop="gameName" min-width="120" show-overflow-tooltip />
        <el-table-column label="人数" width="90" align="center">
          <template #default="{ row }">{{ row.currentPlayers || 0 }} / {{ row.playerCount }}</template>
        </el-table-column>
        <el-table-column label="底注" prop="baseScore" width="80" align="center" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.status === 2 ? 'success' : 'info'">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!tablesLoading && tableList.length === 0" description="暂无牌桌" />
    </el-dialog>

    <!-- 成员管理 -->
    <el-dialog
      v-model="memberDialogVisible"
      :title="`「${currentClub?.name || ''}」成员管理`"
      width="900px"
      destroy-on-close
      @closed="resetMemberDialog"
    >
      <el-alert type="warning" :closable="false" style="margin-bottom:12px;">
        <template #title>
          大联盟俱乐部已禁止自由加入，仅支持管理员在此页面手动添加成员（群主除外）。
        </template>
      </el-alert>

      <div class="member-toolbar">
        <el-input
          v-model="memberKeyword"
          placeholder="搜索昵称 / 手机号 / 用户ID"
          clearable
          style="width:260px;"
          @keyup.enter="loadMembers(0)"
          @clear="loadMembers(0)"
        />
        <el-button type="primary" :icon="Search" @click="loadMembers(0)">搜索</el-button>
        <div style="flex:1;"></div>
        <el-input
          v-model.number="memberAddUserId"
          placeholder="输入要添加的用户ID"
          style="width:200px;"
          clearable
        />
        <el-button type="success" :icon="Plus" :loading="memberAdding" @click="handleAddMember">添加成员</el-button>
      </div>

      <el-table :data="memberList" v-loading="memberLoading" stripe border size="small">
        <el-table-column label="用户ID" prop="userId" width="90" align="center" />
        <el-table-column label="头像" width="60" align="center">
          <template #default="{ row }">
            <el-avatar :size="32" :src="row.avatar" v-if="row.avatar">
              <el-icon><Avatar /></el-icon>
            </el-avatar>
            <el-avatar :size="32" v-else><el-icon><Avatar /></el-icon></el-avatar>
          </template>
        </el-table-column>
        <el-table-column label="昵称" prop="nickname" min-width="140" show-overflow-tooltip />
        <el-table-column label="手机号" prop="phone" width="140" />
        <el-table-column label="角色" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="roleTag(row.role).type">{{ roleTag(row.role).label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="等级" prop="level" width="70" align="center" />
        <el-table-column label="加入时间" width="170">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.role !== 4"
              type="danger"
              size="small"
              link
              @click="handleRemoveMember(row)"
            >移除</el-button>
            <span v-else style="color:#909399;font-size:12px;">群主</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="member-pager">
        <el-pagination
          layout="total, prev, pager, next, jumper"
          :total="memberTotal"
          :page-size="memberSize"
          :current-page="memberPage + 1"
          @current-change="p => loadMembers(p - 1)"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Plus, Avatar, Search } from '@element-plus/icons-vue'
import {
  getSuperClubList,
  createSuperClub,
  updateSuperClub,
  createSuperClubGame,
  getCreateGameConfig,
  getClubTables,
  uploadImage,
  getSuperClubMembers,
  addSuperClubMember,
  removeSuperClubMember
} from '../api'

// ==================== 列表 ====================
const loading = ref(false)
const clubList = ref([])

async function loadList() {
  loading.value = true
  try {
    const res = await getSuperClubList()
    if (res.code === 200) {
      clubList.value = res.data || []
    } else {
      ElMessage.error(res.message || '加载失败')
    }
  } catch (e) {
    // axios 拦截器已处理
  } finally {
    loading.value = false
  }
}

// ==================== 创建 / 修改 ====================
const dialogVisible = ref(false)
const dialogMode = ref('create')  // 'create' | 'edit'
const submitting = ref(false)
const clubFormRef = ref(null)
const clubForm = reactive({
  clubId: null,
  name: '',
  remark: '',
  avatar: '',
  notice: '',
  ownerUserId: null
})
const clubRules = {
  name:   [{ required: true, message: '请输入名称', trigger: 'blur' }],
  remark: [{ required: true, message: '请输入简介', trigger: 'blur' }],
  avatar: [{ required: true, message: '请上传头像', trigger: 'change' }]
}

// ==================== 头像上传 ====================

function beforeAvatarUpload(file) {
  const okType = /^image\/(png|jpe?g|gif|webp|bmp)$/i.test(file.type)
  if (!okType) {
    ElMessage.error('只能上传图片文件')
    return false
  }
  const maxMB = 5
  if (file.size / 1024 / 1024 > maxMB) {
    ElMessage.error(`图片大小不能超过 ${maxMB}MB`)
    return false
  }
  return true
}

// el-upload http-request 自定义上传：交给后端 /upload/uploadFile
async function handleAvatarUpload({ file, onSuccess, onError }) {
  try {
    const res = await uploadImage(file)
    if (res?.code === 200 && res.data) {
      clubForm.avatar = res.data
      ElMessage.success('头像上传成功')
      // 让 el-form 重新校验 avatar
      clubFormRef.value?.validateField?.('avatar')
      onSuccess?.(res)
    } else {
      ElMessage.error(res?.message || '上传失败')
      onError?.(new Error(res?.message || '上传失败'))
    }
  } catch (e) {
    ElMessage.error('上传失败')
    onError?.(e)
  }
}

function triggerAvatarClear() {
  clubForm.avatar = ''
  clubFormRef.value?.validateField?.('avatar')
}

function resetClubForm() {
  clubForm.clubId = null
  clubForm.name = ''
  clubForm.remark = ''
  clubForm.avatar = 'https://placehold.co/128'
  clubForm.notice = ''
  clubForm.ownerUserId = null
}

function handleCreate() {
  resetClubForm()
  dialogMode.value = 'create'
  dialogVisible.value = true
}

function handleEdit(row) {
  resetClubForm()
  clubForm.clubId = row.id
  clubForm.name = row.name
  clubForm.remark = row.remark
  clubForm.avatar = row.avatar
  clubForm.notice = row.notice || ''
  dialogMode.value = 'edit'
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!clubFormRef.value) return
  await clubFormRef.value.validate(async valid => {
    if (!valid) return
    submitting.value = true
    try {
      const res = dialogMode.value === 'create'
        ? await createSuperClub({
            name: clubForm.name,
            remark: clubForm.remark,
            avatar: clubForm.avatar,
            notice: clubForm.notice || null,
            ownerUserId: clubForm.ownerUserId || null
          })
        : await updateSuperClub({
            clubId: clubForm.clubId,
            name: clubForm.name,
            remark: clubForm.remark,
            avatar: clubForm.avatar,
            notice: clubForm.notice
          })
      if (res.code === 200) {
        ElMessage.success(dialogMode.value === 'create' ? '创建成功' : '修改成功')
        dialogVisible.value = false
        loadList()
      } else {
        ElMessage.error(res.message || '操作失败')
      }
    } finally {
      submitting.value = false
    }
  })
}

// ==================== 建房 ====================
const gameDialogVisible = ref(false)
const gameSubmitting = ref(false)
const gameFormRef = ref(null)
const currentClub = ref(null)
const gameConfig = reactive({
  availableBaseScores: [],
  availableMangoMax: [],
  availableSettleTime: [],
  commissionRateMin: 0,
  commissionRateMax: 10
})
const gameForm = reactive({
  gameName: '',
  clubId: null,
  playerCount: 6,
  baseScore: 1,
  mangoMax: 5,
  settleTime: 30,
  commissionRate: 5,
  diWang: false,
  sanHua: false,
  gps: false,
  voice: false,
  noScore: false,
  bonusPool: false,
  queue: false,
  queuePlayerCount: null
})
const gameRules = {
  gameName: [{ required: true, message: '请输入房间名称', trigger: 'blur' }],
  playerCount: [{ required: true, message: '请选择房间人数', trigger: 'change' }],
  baseScore: [{ required: true, message: '请选择底注', trigger: 'change' }],
  mangoMax: [{ required: true, message: '请选择芒果封顶', trigger: 'change' }],
  settleTime: [{ required: true, message: '请选择结算时间', trigger: 'change' }]
}

function resetGameForm(club) {
  gameForm.gameName = `${club.name} - 后台房间`
  gameForm.clubId = club.id
  gameForm.playerCount = 6
  gameForm.baseScore = gameConfig.availableBaseScores[0] ?? 1
  gameForm.mangoMax = gameConfig.availableMangoMax?.[0]?.value ?? 5
  gameForm.settleTime = gameConfig.availableSettleTime?.[0]?.value ?? 30
  gameForm.commissionRate = 5
  gameForm.diWang = false
  gameForm.sanHua = false
  gameForm.gps = false
  gameForm.voice = false
  gameForm.noScore = false
  gameForm.bonusPool = false
  gameForm.queue = false
  gameForm.queuePlayerCount = null
}

async function loadGameConfig() {
  try {
    const res = await getCreateGameConfig()
    if (res.code === 200 && res.data) {
      gameConfig.availableBaseScores = res.data.availableBaseScores || []
      gameConfig.availableMangoMax = res.data.availableMangoMax || []
      gameConfig.availableSettleTime = res.data.availableSettleTime || []
      gameConfig.commissionRateMin = res.data.commissionRateMin ?? 0
      gameConfig.commissionRateMax = res.data.commissionRateMax ?? 10
    }
  } catch (e) {}
}

async function handleCreateGame(row) {
  currentClub.value = row
  if (!gameConfig.availableBaseScores.length) {
    await loadGameConfig()
  }
  resetGameForm(row)
  gameDialogVisible.value = true
}

async function handleCreateGameSubmit() {
  if (!gameFormRef.value) return
  await gameFormRef.value.validate(async valid => {
    if (!valid) return
    if (gameForm.queue && !gameForm.queuePlayerCount) {
      ElMessage.warning('开启排队模式时必须指定排队人数')
      return
    }
    gameSubmitting.value = true
    try {
      const payload = { ...gameForm }
      if (!payload.queue) delete payload.queuePlayerCount
      const res = await createSuperClubGame(payload)
      if (res.code === 200) {
        ElMessage.success(`房间创建成功：桌号 ${res.data?.tableNo}`)
        gameDialogVisible.value = false
        loadList()
      } else {
        ElMessage.error(res.message || '创建失败')
      }
    } finally {
      gameSubmitting.value = false
    }
  })
}

// ==================== 查看牌桌 ====================
const tablesDialogVisible = ref(false)
const tablesLoading = ref(false)
const tableList = ref([])

async function handleViewTables(row) {
  currentClub.value = row
  tableList.value = []
  tablesDialogVisible.value = true
  tablesLoading.value = true
  try {
    const res = await getClubTables(row.id)
    if (res.code === 200) {
      tableList.value = res.data || []
    }
  } finally {
    tablesLoading.value = false
  }
}

// ==================== 成员管理 ====================
const memberDialogVisible = ref(false)
const memberLoading = ref(false)
const memberList = ref([])
const memberKeyword = ref('')
const memberPage = ref(0)
const memberSize = ref(20)
const memberTotal = ref(0)
const memberAddUserId = ref(null)
const memberAdding = ref(false)

function resetMemberDialog() {
  memberList.value = []
  memberKeyword.value = ''
  memberPage.value = 0
  memberTotal.value = 0
  memberAddUserId.value = null
}

async function handleManageMembers(row) {
  currentClub.value = row
  resetMemberDialog()
  memberDialogVisible.value = true
  await loadMembers(0)
}

async function loadMembers(page = 0) {
  if (!currentClub.value) return
  memberLoading.value = true
  memberPage.value = page
  try {
    const res = await getSuperClubMembers({
      clubId: currentClub.value.id,
      page,
      size: memberSize.value,
      keyword: memberKeyword.value || undefined
    })
    if (res.code === 200 && res.data) {
      memberList.value = res.data.list || res.data.content || []
      memberTotal.value = res.data.total ?? res.data.totalElements ?? memberList.value.length
    }
  } finally {
    memberLoading.value = false
  }
}

async function handleAddMember() {
  if (!memberAddUserId.value || memberAddUserId.value <= 0) {
    ElMessage.warning('请输入有效的用户ID')
    return
  }
  memberAdding.value = true
  try {
    const res = await addSuperClubMember({
      clubId: currentClub.value.id,
      userId: memberAddUserId.value
    })
    if (res.code === 200) {
      ElMessage.success('添加成功')
      memberAddUserId.value = null
      await loadMembers(0)
      loadList()  // 刷新列表里的成员数
    } else {
      ElMessage.error(res.message || '添加失败')
    }
  } finally {
    memberAdding.value = false
  }
}

async function handleRemoveMember(row) {
  try {
    await ElMessageBox.confirm(
      `确定将「${row.nickname || row.userId}」移出俱乐部吗？`,
      '移除成员',
      { type: 'warning', confirmButtonText: '移除', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  try {
    const res = await removeSuperClubMember({
      clubId: currentClub.value.id,
      userId: row.userId
    })
    if (res.code === 200) {
      ElMessage.success('已移除')
      await loadMembers(memberPage.value)
      loadList()
    } else {
      ElMessage.error(res.message || '移除失败')
    }
  } catch { /* ignore */ }
}

function roleTag(role) {
  switch (role) {
    case 4: return { type: 'danger',  label: '群主' }
    case 3: return { type: 'warning', label: '管理员' }
    case 2: return { type: 'success', label: '合伙人' }
    default: return { type: 'info',   label: '成员' }
  }
}

function statusLabel(s) {
  switch (s) {
    case 1: return '等待中'
    case 2: return '游戏中'
    case 3: return '已结束'
    default: return '未知'
  }
}

function formatTime(t) {
  if (!t) return '-'
  const d = new Date(t)
  if (isNaN(d.getTime())) return t
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

onMounted(() => {
  loadList()
  loadGameConfig()
})
</script>

<style scoped>
.super-club-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.intro .desc-list p {
  margin: 4px 0;
  color: #606266;
  font-size: 13px;
}
.page-card {
  border-radius: 6px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-header .title {
  font-size: 15px;
  font-weight: 600;
}
.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}
.owner-cell {
  display: flex;
  flex-direction: column;
  line-height: 1.4;
}
.owner-cell .sub {
  color: #909399;
  font-size: 12px;
}
.form-hint {
  color: #909399;
  font-size: 12px;
  margin-left: 10px;
}

/* ========== 头像上传器 ========== */
.avatar-uploader-wrap {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}
.avatar-uploader :deep(.el-upload) {
  border: 1px dashed var(--el-border-color);
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: border-color .2s;
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}
.avatar-uploader :deep(.el-upload:hover) {
  border-color: var(--el-color-primary);
}
.avatar-preview {
  width: 100px;
  height: 100px;
  object-fit: cover;
  display: block;
}
.avatar-placeholder {
  color: #8c939d;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}
.avatar-placeholder .el-icon {
  font-size: 22px;
}
.avatar-hint {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 4px;
}
.avatar-hint .form-hint {
  margin-left: 0;
}

/* ========== 成员管理 ========== */
.member-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.member-pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
