<template>
  <div class="robot-page">
    <el-alert type="warning" :closable="false" class="intro">
      <template #title><strong>机器人压测（仅用于压测，请勿用于线上运营）</strong></template>
      <div class="desc-list">
        <p>• 机器人 = user 表 is_robot=1 的真实俱乐部成员；不破坏现有房间逻辑，独立模块接管「机器人」的操作。</p>
        <p>• 流程：选一个真实俱乐部 → 一键生成/标记机器人 → 一键上分 → 批量建桌坐满 → 自动打牌。</p>
        <p>• 单桌打满设定手数后自动解散；「停止压测」可一键解散所有托管房间。</p>
      </div>
    </el-alert>

    <!-- 状态 + 总开关 -->
    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <span class="title">压测状态</span>
          <div class="header-actions">
            <el-button :icon="Refresh" :loading="loading" @click="loadStatus">刷新</el-button>
            <el-button type="danger" plain :icon="CircleClose" @click="handleStopAll">停止压测(解散所有托管桌)</el-button>
          </div>
        </div>
      </template>
      <el-descriptions :column="4" border size="small">
        <el-descriptions-item label="总开关">
          <el-switch v-model="status.enabled" @change="handleToggleEnabled" />
        </el-descriptions-item>
        <el-descriptions-item label="机器人数量">{{ status.robotCount }}</el-descriptions-item>
        <el-descriptions-item label="托管房间">{{ status.managedRoomCount }}</el-descriptions-item>
        <el-descriptions-item label="服务器房间总数">{{ status.totalRoomCount }}</el-descriptions-item>
        <el-descriptions-item label="当前在活跃时段">
          <el-tag :type="status.inActiveWindow ? 'success' : 'info'">{{ status.inActiveWindow ? '是' : '否' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="活跃时段">{{ status.activeStartHour }}:00 ~ {{ status.activeEndHour }}:00</el-descriptions-item>
        <el-descriptions-item label="单桌手数上限">{{ status.maxHandsPerTable }}</el-descriptions-item>
        <el-descriptions-item label="操作延时">{{ status.minActionDelayMs }}~{{ status.maxActionDelayMs }}ms</el-descriptions-item>
        <el-descriptions-item label="桌外分自动补">
          <el-tag :type="status.autoTopUpClubScore ? 'success' : 'info'">{{ status.autoTopUpClubScore ? '是' : '否' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="桌外最低积分">{{ status.minClubScore }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 配置 -->
    <el-card class="page-card">
      <template #header><span class="title">机器人配置</span></template>
      <el-form :inline="true" :model="config" label-width="110px" class="cfg-form">
        <el-form-item label="活跃起始(时)">
          <el-input-number v-model="config.activeStartHour" :min="0" :max="23" />
        </el-form-item>
        <el-form-item label="活跃结束(时)">
          <el-input-number v-model="config.activeEndHour" :min="1" :max="24" />
          <span class="hint">默认 0~24 全天</span>
        </el-form-item>
        <el-form-item label="单桌手数上限">
          <el-input-number v-model="config.maxHandsPerTable" :min="0" :max="100000" />
          <span class="hint">0=不限</span>
        </el-form-item>
        <el-form-item label="操作延时(ms)">
          <el-input-number v-model="config.minActionDelayMs" :min="100" :max="60000" />
          <span style="margin:0 6px">~</span>
          <el-input-number v-model="config.maxActionDelayMs" :min="200" :max="60000" />
        </el-form-item>
        <el-form-item label="自动补位">
          <el-switch v-model="config.autoRefill" />
        </el-form-item>
        <el-form-item label="桌外分自动补">
          <el-switch v-model="config.autoTopUpClubScore" />
          <span class="hint">输完/周期结算后桌外分不足自动补</span>
        </el-form-item>
        <el-form-item label="桌外最低积分">
          <el-input-number v-model="config.minClubScore" :min="0" :max="1000000000" :step="10000" />
          <span class="hint">默认 10000</span>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Check" @click="handleSaveConfig">保存配置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 俱乐部选择 -->
    <el-card class="page-card">
      <template #header><span class="title">选择真实俱乐部</span></template>
      <el-form :inline="true">
        <el-form-item label="搜索俱乐部">
          <el-select
            v-model="selectClubId"
            filterable
            remote
            clearable
            reserve-keyword
            :remote-method="remoteSearchClubs"
            :loading="clubSearchLoading"
            placeholder="输入 ID / 6位编号 / 名称 搜索"
            style="width:320px"
            @change="onSelectClub"
          >
            <el-option
              v-for="c in clubSearchOptions"
              :key="c.id"
              :label="`#${c.id} [${c.no}] ${c.name}（${c.typeName}）`"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="或直接输入俱乐部ID">
          <el-input-number v-model="clubId" :min="1" :controls="false" style="width:160px" />
        </el-form-item>
        <el-form-item>
          <el-button :icon="Search" @click="loadMembers" :disabled="!clubId">查询成员</el-button>
        </el-form-item>
      </el-form>
      <!-- 查询成功后展示俱乐部基本信息 -->
      <div class="club-info" v-if="clubInfo">
        <el-descriptions :column="4" border size="small" title="俱乐部基本信息">
          <template #extra>
            <el-avatar :size="36" :src="clubInfo.avatar"><el-icon><Avatar /></el-icon></el-avatar>
          </template>
          <el-descriptions-item label="ID">{{ clubInfo.id }}</el-descriptions-item>
          <el-descriptions-item label="编号">{{ clubInfo.no }}</el-descriptions-item>
          <el-descriptions-item label="名称">{{ clubInfo.name }}</el-descriptions-item>
          <el-descriptions-item label="类型">
            <el-tag size="small" :type="clubInfo.type === 3 ? 'warning' : (clubInfo.type === 2 ? 'success' : 'info')">
              {{ clubInfo.typeName }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="群主">{{ clubInfo.ownerName || '—' }}（ID:{{ clubInfo.ownerId }}）</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag size="small" :type="clubInfo.state === 1 ? 'success' : 'danger'">
              {{ clubInfo.state === 1 ? '正常' : (clubInfo.state === 2 ? '已解散' : '禁用') }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="成员数">{{ clubInfo.memberCount }}</el-descriptions-item>
          <el-descriptions-item label="机器人数">{{ clubInfo.robotCount }}</el-descriptions-item>
          <el-descriptions-item label="简介" :span="4">{{ clubInfo.remark || '—' }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-card>

    <!-- 机器人管理 -->
    <el-card class="page-card" v-if="clubId">
      <template #header><span class="title">机器人管理（俱乐部 #{{ clubId }}）</span></template>

      <div class="ops-row">
        <!-- 生成机器人 -->
        <el-card shadow="never" class="op-card">
          <div class="op-title">一键生成俱乐部机器人</div>
          <el-form label-width="90px">
            <el-form-item label="数量"><el-input-number v-model="gen.count" :min="1" :max="2000" /></el-form-item>
            <el-form-item label="昵称前缀"><el-input v-model="gen.namePrefix" placeholder="机器人" style="width:160px" /></el-form-item>
            <el-form-item label="登录密码"><el-input v-model="gen.password" placeholder="123456" style="width:160px" /></el-form-item>
            <el-form-item label="初始上分"><el-input-number v-model="gen.initScore" :min="0" :max="1000000000" /></el-form-item>
            <el-form-item label="统一头像">
              <el-input v-model="gen.avatar" placeholder="头像URL(可选)" style="width:200px" />
              <el-upload :show-file-list="false" :http-request="(o)=>doUpload(o,'gen')" accept="image/*">
                <el-button :icon="Upload" style="margin-left:6px">上传</el-button>
              </el-upload>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="genLoading" @click="handleGenerate">生成</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 标记机器人 / 上分 -->
        <el-card shadow="never" class="op-card">
          <div class="op-title">现有成员设为机器人 / 上分</div>
          <el-form label-width="90px">
            <el-form-item label="操作对象">
              <el-tag type="info">{{ selectedUserIds.length ? `已选 ${selectedUserIds.length} 人` : '全部非群主成员' }}</el-tag>
            </el-form-item>
            <el-form-item>
              <el-button type="success" @click="handleSetFlag(true)">设为机器人</el-button>
              <el-button @click="handleSetFlag(false)">取消机器人</el-button>
            </el-form-item>
            <el-divider />
            <el-form-item label="上分金额"><el-input-number v-model="topup.amount" :min="0" :max="1000000000" /></el-form-item>
            <el-form-item label="方式">
              <el-radio-group v-model="topup.mode">
                <el-radio label="add">增加</el-radio>
                <el-radio label="set">设为</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item>
              <el-button type="warning" :loading="topupLoading" @click="handleTopUp">一键上分(本俱乐部机器人)</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </div>

      <el-table :data="members" v-loading="memberLoading" stripe border height="360" @selection-change="onSelectionChange">
        <el-table-column type="selection" width="44" />
        <el-table-column label="userId" prop="userId" width="90" align="center" />
        <el-table-column label="昵称" prop="nickname" min-width="120" show-overflow-tooltip />
        <el-table-column label="头像" width="120">
          <template #default="{ row }">
            <div class="avatar-cell">
              <el-avatar :size="28" :src="row.avatar"><el-icon><Avatar /></el-icon></el-avatar>
              <el-button link size="small" @click="editAvatar(row)">改</el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="机器人" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isRobot ? 'success' : 'info'" size="small">{{ row.isRobot ? '是' : '否' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="俱乐部积分" prop="score" width="120" align="right" />
        <el-table-column label="在桌" width="70" align="center">
          <template #default="{ row }">
            <el-tag :type="row.inRoom ? 'warning' : 'info'" size="small">{{ row.inRoom ? '在' : '空' }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 批量建桌 -->
    <el-card class="page-card" v-if="clubId">
      <template #header><span class="title">批量建桌（坐满机器人自动打牌）</span></template>
      <el-form :inline="true" :model="batch" label-width="90px">
        <el-form-item label="建桌数量"><el-input-number v-model="batch.tableCount" :min="1" :max="2000" /></el-form-item>
        <el-form-item label="每桌人数"><el-input-number v-model="batch.perTable" :min="2" :max="8" /></el-form-item>
        <el-form-item label="开局人数"><el-input-number v-model="batch.playerCount" :min="2" :max="8" /></el-form-item>
        <el-form-item label="底注"><el-input-number v-model="batch.baseScore" :min="1" :max="100000" /></el-form-item>
        <el-form-item label="芒果封顶"><el-input-number v-model="batch.mangoMax" :min="1" :max="999" /></el-form-item>
        <el-form-item label="结算(分钟)"><el-input-number v-model="batch.settleTime" :min="1" :max="1440" /></el-form-item>
        <el-form-item label="点位"><el-input-number v-model="batch.commissionRate" :min="0" :max="10" /></el-form-item>
        <el-form-item label="带入(可选)"><el-input-number v-model="batch.bringIn" :min="0" :max="1000000000" /></el-form-item>
        <el-form-item label="三花"><el-switch v-model="batch.sanHua" /></el-form-item>
        <el-form-item label="地九王"><el-switch v-model="batch.diWang" /></el-form-item>
        <el-form-item label="丁二皇吃席"><el-switch v-model="batch.dingErHuangFeast" /></el-form-item>
        <el-form-item label="无分模式"><el-switch v-model="batch.noScore" /></el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="batchLoading" :icon="Plus" @click="handleBatchCreate">批量建桌</el-button>
        </el-form-item>
      </el-form>
      <div class="hint">提示：带入不填则按「底注 × 系统最低带入倍数」。建桌会自动开启总开关。</div>
      <div class="hint">注意：每桌必须坐满才建桌，所需机器人数 = 桌数 × 每桌人数（不够会少建）。上次建桌：{{ lastBatchTip }}</div>
    </el-card>

    <!-- 牌桌列表 -->
    <el-card class="page-card" v-if="clubId">
      <template #header>
        <div class="card-header">
          <span class="title">俱乐部牌桌列表（内存中 {{ tableStat.total || 0 }} 桌，机器人托管 {{ tableStat.managedCount || 0 }} 桌）</span>
          <el-button :icon="Refresh" :loading="tableLoading" @click="loadTables">刷新牌桌</el-button>
        </div>
      </template>
      <el-table :data="tables" v-loading="tableLoading" stripe border height="360">
        <el-table-column label="roomId" prop="roomId" width="90" align="center" />
        <el-table-column label="桌号" prop="tableNo" width="120" />
        <el-table-column label="名称" prop="roomName" min-width="120" show-overflow-tooltip />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="row.state === 'WAITING' ? 'info' : 'success'">{{ row.stateDesc || row.state }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="在座/开局所需" width="120" align="center">
          <template #default="{ row }">
            <span :class="{ 'warn-text': row.seated < row.needToStart }">{{ row.seated }} / {{ row.needToStart }}</span>
          </template>
        </el-table-column>
        <el-table-column label="机器人数" prop="robotSeated" width="90" align="center" />
        <el-table-column label="已打手数" prop="currentRound" width="90" align="center" />
        <el-table-column label="底注" prop="baseScore" width="80" align="center" />
        <el-table-column label="托管" width="70" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.managed ? 'warning' : 'info'">{{ row.managed ? '是' : '否' }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Plus, Check, Search, Upload, Avatar, CircleClose } from '@element-plus/icons-vue'
import {
  getRobotStatus, updateRobotConfig, setRobotEnabled, robotStopAll,
  searchRobotClubs, listClubRobots, generateClubRobots, setRobotFlag,
  robotTopUp, setRobotAvatars, robotBatchCreate, listRobotTables, uploadImage
} from '../api'

const loading = ref(false)
const status = reactive({})
const config = reactive({
  activeStartHour: 0, activeEndHour: 24, maxHandsPerTable: 100,
  minActionDelayMs: 800, maxActionDelayMs: 2500, autoRefill: true,
  autoTopUpClubScore: true, minClubScore: 10000
})

const clubSearchOptions = ref([])
const clubSearchLoading = ref(false)
const selectClubId = ref(null)
const clubId = ref(null)

const members = ref([])
const memberStat = reactive({})
const clubInfo = ref(null)
const memberLoading = ref(false)
const selectedUserIds = ref([])

const gen = reactive({ count: 8, namePrefix: '机器人', password: '123456', initScore: 100000, avatar: '' })
const genLoading = ref(false)

const topup = reactive({ amount: 100000, mode: 'add' })
const topupLoading = ref(false)

const batch = reactive({
  tableCount: 10, perTable: 4, playerCount: 4, baseScore: 10, mangoMax: 5,
  settleTime: 30, commissionRate: 5, bringIn: 0, sanHua: true, diWang: false, noScore: false, dingErHuangFeast: false
})
const batchLoading = ref(false)
const lastBatchTip = ref('—')

const tables = ref([])
const tableStat = reactive({})
const tableLoading = ref(false)

async function loadStatus() {
  loading.value = true
  try {
    const res = await getRobotStatus()
    Object.assign(status, res.data || {})
    config.activeStartHour = status.activeStartHour
    config.activeEndHour = status.activeEndHour
    config.maxHandsPerTable = status.maxHandsPerTable
    config.minActionDelayMs = status.minActionDelayMs
    config.maxActionDelayMs = status.maxActionDelayMs
    config.autoRefill = status.autoRefill
    config.autoTopUpClubScore = status.autoTopUpClubScore
    config.minClubScore = status.minClubScore
  } finally {
    loading.value = false
  }
}

async function remoteSearchClubs(query) {
  const kw = (query || '').trim()
  if (!kw) { clubSearchOptions.value = []; return }
  clubSearchLoading.value = true
  try {
    const res = await searchRobotClubs(kw)
    clubSearchOptions.value = res.code === 200 ? (res.data || []) : []
  } catch (e) {
    clubSearchOptions.value = []
  } finally {
    clubSearchLoading.value = false
  }
}

function onSelectClub(val) {
  if (val) {
    clubId.value = val
    loadMembers()
  }
}

async function handleToggleEnabled(val) {
  try {
    await setRobotEnabled(val)
    ElMessage.success(val ? '已开启机器人压测' : '已关闭机器人压测')
    loadStatus()
  } catch (e) { loadStatus() }
}

async function handleSaveConfig() {
  if (config.maxActionDelayMs <= config.minActionDelayMs) {
    ElMessage.warning('最大延时需大于最小延时')
    return
  }
  await updateRobotConfig({ ...config })
  ElMessage.success('配置已保存')
  loadStatus()
}

async function handleStopAll() {
  await ElMessageBox.confirm('确认解散所有机器人托管房间并停止压测？', '提示', { type: 'warning' })
  const res = await robotStopAll()
  ElMessage.success(`已解散 ${res.data?.disbandedRooms ?? 0} 桌`)
  loadStatus()
}

async function loadMembers() {
  if (!clubId.value) return
  memberLoading.value = true
  try {
    const res = await listClubRobots(clubId.value)
    if (res.code !== 200) {
      clubInfo.value = null
      members.value = []
      memberStat.total = undefined
      ElMessage.error(res.message || '查询失败')
      return
    }
    members.value = res.data?.members || []
    memberStat.total = res.data?.total
    memberStat.robotCount = res.data?.robotCount
    clubInfo.value = res.data?.club || null
    if (clubInfo.value) {
      ElMessage.success(`已加载俱乐部「${clubInfo.value.name}」`)
    }
    loadTables()
  } catch (e) {
    clubInfo.value = null
  } finally {
    memberLoading.value = false
  }
}

function onSelectionChange(rows) {
  selectedUserIds.value = rows.map(r => r.userId)
}

async function handleGenerate() {
  if (!clubId.value) { ElMessage.warning('请先选择俱乐部'); return }
  genLoading.value = true
  try {
    const res = await generateClubRobots({
      clubId: clubId.value, count: gen.count, namePrefix: gen.namePrefix,
      password: gen.password, avatar: gen.avatar, initScore: gen.initScore
    })
    ElMessage.success(`生成 ${res.data?.createdUsers ?? 0} 个机器人，入会 ${res.data?.joinedClub ?? 0}`)
    loadMembers(); loadStatus()
  } finally {
    genLoading.value = false
  }
}

async function handleSetFlag(isRobot) {
  if (!clubId.value) return
  const res = await setRobotFlag({ clubId: clubId.value, userIds: selectedUserIds.value, isRobot })
  ElMessage.success(`已${isRobot ? '设为' : '取消'}机器人 ${res.data?.changed ?? 0} 人`)
  loadMembers(); loadStatus()
}

async function handleTopUp() {
  if (!clubId.value) return
  topupLoading.value = true
  try {
    const res = await robotTopUp({ clubId: clubId.value, amount: topup.amount, mode: topup.mode })
    ElMessage.success(`已为 ${res.data?.affected ?? 0} 个机器人上分`)
    loadMembers()
  } finally {
    topupLoading.value = false
  }
}

async function editAvatar(row) {
  try {
    const { value } = await ElMessageBox.prompt('输入头像URL', '设置头像', {
      inputValue: row.avatar || ''
    })
    await setRobotAvatars({ userIds: [row.userId], avatar: value })
    ElMessage.success('头像已更新')
    loadMembers()
  } catch (e) { /* cancel */ }
}

async function doUpload(option, target) {
  try {
    const res = await uploadImage(option.file)
    const url = res.data
    if (target === 'gen') gen.avatar = url
    ElMessage.success('上传成功')
  } catch (e) {
    ElMessage.error('上传失败')
  }
}

async function handleBatchCreate() {
  if (!clubId.value) { ElMessage.warning('请先选择俱乐部'); return }
  const need = batch.tableCount * batch.perTable
  batchLoading.value = true
  try {
    const payload = { ...batch, clubId: clubId.value }
    if (!payload.bringIn) delete payload.bringIn
    const res = await robotBatchCreate(payload)
    const d = res.data || {}
    const created = d.createdTables ?? 0
    const avail = d.availableRobots ?? 0
    lastBatchTip.value = `请求 ${batch.tableCount} 桌(需 ${need} 机器人)，可用机器人 ${avail}，实建 ${created} 桌，坐下 ${d.seatedRobots ?? 0}`
    if (created < batch.tableCount) {
      ElMessage.warning(`只建了 ${created}/${batch.tableCount} 桌：可用机器人 ${avail} 个，不够坐满（需 ${need} 个）。请先生成/上分更多机器人。`)
    } else {
      ElMessage.success(`建桌 ${created}，坐下机器人 ${d.seatedRobots ?? 0}`)
    }
    loadStatus(); loadMembers(); loadTables()
  } finally {
    batchLoading.value = false
  }
}

async function loadTables() {
  if (!clubId.value) return
  tableLoading.value = true
  try {
    const res = await listRobotTables(clubId.value)
    if (res.code === 200) {
      tables.value = res.data?.tables || []
      tableStat.total = res.data?.total
      tableStat.managedCount = res.data?.managedCount
    }
  } finally {
    tableLoading.value = false
  }
}

onMounted(() => {
  loadStatus()
})
</script>

<style scoped>
.robot-page { display: flex; flex-direction: column; gap: 16px; }
.intro .desc-list p { margin: 2px 0; font-size: 13px; }
.page-card { border-radius: 8px; }
.card-header { display: flex; align-items: center; justify-content: space-between; }
.card-header .title { font-weight: 600; }
.cfg-form .hint, .hint { color: #909399; font-size: 12px; margin-left: 8px; }
.club-summary { margin-top: 10px; color: #606266; }
.ops-row { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
.op-card { flex: 1; min-width: 360px; background: #fafafa; }
.op-title { font-weight: 600; margin-bottom: 12px; }
.avatar-cell { display: flex; align-items: center; gap: 6px; }
.warn-text { color: #e6a23c; font-weight: 600; }
</style>
