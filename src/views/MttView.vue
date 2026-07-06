<template>
  <div class="mtt-page">
    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <span class="title">MTT 比赛管理</span>
          <div style="display:flex; gap:8px; align-items:center;">
            <el-input v-model="clubIdFilter" placeholder="按俱乐部ID筛选(空=全部)" size="small" clearable style="width:200px;" @clear="load" @keyup.enter="load" />
            <el-button size="small" :loading="loading" @click="load">查询</el-button>
            <el-button type="warning" size="small" @click="openAutoConfig">自动开赛配置</el-button>
            <el-button type="primary" size="small" @click="openCreate">创建比赛</el-button>
          </div>
        </div>
      </template>

      <!-- 统计卡片 -->
      <div class="stats-row" v-if="stats">
        <div class="stat-card"><div class="num">{{ stats.totalMatches }}</div><div class="lab">总场次</div></div>
        <div class="stat-card"><div class="num" style="color:#409EFF">{{ stats.upcoming }}</div><div class="lab">报名中</div></div>
        <div class="stat-card"><div class="num" style="color:#E6A23C">{{ stats.playing }}</div><div class="lab">进行中</div></div>
        <div class="stat-card"><div class="num" style="color:#67C23A">{{ stats.finished }}</div><div class="lab">已结束</div></div>
        <div class="stat-card"><div class="num" style="color:#909399">{{ stats.dismissed }}</div><div class="lab">已解散</div></div>
        <div class="stat-card"><div class="num">{{ stats.finishedBonusSum }}</div><div class="lab">累计奖池(已结束)</div></div>
        <div class="stat-card"><div class="num">{{ stats.finishedParticipantsSum }}</div><div class="lab">累计参赛人次</div></div>
      </div>

      <!-- 比赛列表 -->
      <el-table :data="matches" border size="small" style="width:100%; margin-top:12px;">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="name" label="名称" min-width="150" />
        <el-table-column prop="clubId" label="俱乐部" width="80" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="开赛时间" width="150">
          <template #default="{ row }">{{ fmtTime(row.startTime) }}</template>
        </el-table-column>
        <el-table-column label="报名费" width="120">
          <template #default="{ row }">{{ row.entryFee }} {{ feeUnit(row.rewardType) }}</template>
        </el-table-column>
        <el-table-column prop="initialScore" label="初始记分牌" width="100" />
        <el-table-column label="类型" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.rewardType===1?'info':(row.rewardType===2?'warning':'danger')">
              {{ row.rewardType===1?'金币赛':(row.rewardType===2?'钻石赛':'实物赛') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="robotCount" label="机器人" width="80" align="center" />
        <el-table-column prop="participants" label="参赛" width="70" align="center" />
        <el-table-column prop="totalBonus" label="冠军兑付" width="90" />
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openDetail(row)">详情</el-button>
            <el-button v-if="row.rewardType===3" size="small" type="warning" @click="openPrizes(row)">发放单</el-button>
            <el-button v-if="row.status===1 || row.status===2" size="small" type="danger" @click="doCancel(row)">取消</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 创建比赛 -->
    <el-dialog v-model="createVisible" title="创建比赛" width="620px">
      <el-form :model="form" label-width="130px" size="small">
        <el-form-item label="名称"><el-input v-model="form.name" placeholder="周末千分锦标赛" /></el-form-item>
        <el-form-item label="俱乐部ID"><el-input-number v-model="form.clubId" :min="1" style="width:180px" /></el-form-item>
        <el-form-item label="开赛时间">
          <el-date-picker v-model="form.startTimeDate" type="datetime" placeholder="选择开赛时间" style="width:220px" />
        </el-form-item>
        <el-form-item label="奖励类型">
          <el-radio-group v-model="form.rewardType">
            <el-radio :value="1">金币赛(金币报名,冠军通吃)</el-radio>
            <el-radio :value="2">钻石赛(钻石报名,冠军通吃)</el-radio>
            <el-radio :value="3">实物赛(钻石报名,按名次发实物)</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="'报名费(' + feeUnit(form.rewardType) + ')'">
          <el-input-number v-model="form.entryFee" :min="form.rewardType===3?0:1" :step="form.rewardType===1?100:1" style="width:180px" />
          <span class="tip" v-if="form.rewardType===1">金币由钻石兑换(默认1钻=1000金币,系统配置可调)</span>
          <span class="tip" v-else>直接扣玩家钻石</span>
        </el-form-item>
        <el-form-item v-if="form.rewardType!==3" label="初始记分牌">
          <el-input :model-value="form.entryFee + ' (=报名费)'" disabled style="width:180px" />
          <span class="tip">记分牌即货币:1记分牌=1{{ feeUnit(form.rewardType) }},输赢即钱的流动,冠军兑付全部记分牌</span>
        </el-form-item>
        <el-form-item v-else label="初始记分牌">
          <el-input-number v-model="form.initialScore" :min="1000" :step="1000" style="width:180px" />
          <span class="tip">实物赛记分牌为纯虚拟计分,比赛结束作废</span>
        </el-form-item>
        <el-form-item label="桌型">
          <el-radio-group v-model="form.seatNum">
            <el-radio :value="6">6人桌</el-radio>
            <el-radio :value="8">8人桌</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="人数下限/上限">
          <el-input-number v-model="form.lowerLimit" :min="2" style="width:120px" />
          <span style="margin:0 8px">~</span>
          <el-input-number v-model="form.upperLimit" :min="2" style="width:120px" />
        </el-form-item>
        <el-form-item label="升底皮周期(分)"><el-input-number v-model="form.upgradeMinutes" :min="1" style="width:180px" /></el-form-item>
        <el-form-item label="底皮级别表">
          <el-input v-model="form.levelTable" placeholder='[[1,10],[2,20],[3,30],[4,50],[5,80],[6,120],[7,200]] 空=默认' />
        </el-form-item>
        <el-form-item v-if="form.rewardType===3" label="奖品清单">
          <el-input v-model="form.prizeList" type="textarea" :rows="3"
            placeholder='按名次配多件: [{"rank":1,"prizeName":"iPhone 17","prizeIcon":"","isVirtual":false},{"rank":2,"prizeName":"AirPods","prizeIcon":"","isVirtual":false}]' />
          <span class="tip">实物赛必填。玩家获奖后填收货地址,后台派送</span>
        </el-form-item>
        <el-form-item v-if="form.rewardType!==3" :label="'固定奖池(' + feeUnit(form.rewardType) + ')'">
          <el-input-number v-model="form.initialPool" :min="0" :step="1000" style="width:180px" />
          <span class="tip">运营预置,叠加进冠军兑付(报名人数×报名费+固定奖池)</span>
        </el-form-item>
        <el-form-item label="机器人数">
          <el-input-number v-model="form.robotCount" :min="0" :max="200" style="width:180px" />
          <span class="tip">开赛前5分钟自动报名(公共俱乐部撑场用)</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible=false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="doCreate">创建</el-button>
      </template>
    </el-dialog>

    <!-- 详情 -->
    <el-dialog v-model="detailVisible" :title="'比赛详情 #' + (detail?.id || '')" width="760px">
      <template v-if="detail">
        <el-descriptions :column="3" size="small" border>
          <el-descriptions-item label="名称">{{ detail.name }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ statusText(detail.status) }}</el-descriptions-item>
          <el-descriptions-item label="开赛">{{ fmtTime(detail.startTime) }}</el-descriptions-item>
          <el-descriptions-item label="报名数">{{ detail.registeredCount }}</el-descriptions-item>
          <el-descriptions-item label="存活">{{ detail.aliveCount }}</el-descriptions-item>
          <el-descriptions-item label="奖池">{{ detail.totalBonus ?? '-' }}</el-descriptions-item>
        </el-descriptions>

        <el-tabs style="margin-top:10px;">
          <el-tab-pane label="名次">
            <el-table :data="competitors" border size="small" max-height="320">
              <el-table-column prop="rankNo" label="名次" width="70" align="center" />
              <el-table-column prop="userId" label="userId" width="90" />
              <el-table-column prop="score" label="记分牌" width="90" />
              <el-table-column label="状态" width="80" align="center">
                <template #default="{ row }">{{ row.status===0?'存活':'淘汰' }}</template>
              </el-table-column>
              <el-table-column prop="eliminateHandNo" label="淘汰手数" width="90" />
              <el-table-column prop="rewardAmount" label="奖励" width="90" />
              <el-table-column prop="roomId" label="桌" width="90" />
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="账务流水">
            <el-table :data="ledger" border size="small" max-height="320">
              <el-table-column prop="entryType" label="类型" width="130" />
              <el-table-column prop="userId" label="userId" width="90" />
              <el-table-column prop="currency" label="货币" width="90" />
              <el-table-column prop="amount" label="金额" width="90" />
              <el-table-column prop="status" label="状态" width="90" />
              <el-table-column prop="idempotencyKey" label="幂等键" min-width="180" />
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="对账">
            <pre class="reconcile">{{ JSON.stringify(reconcile, null, 2) }}</pre>
          </el-tab-pane>
        </el-tabs>
      </template>
    </el-dialog>

    <!-- 实物发放单（含收货地址 + 派送） -->
    <el-dialog v-model="prizesVisible" title="实物发放单" width="960px">
      <el-table :data="prizes" border size="small">
        <el-table-column prop="rankNo" label="名次" width="60" align="center" />
        <el-table-column prop="userId" label="userId" width="80" />
        <el-table-column prop="prizeName" label="奖品" min-width="110" />
        <el-table-column label="收货信息" min-width="220">
          <template #default="{ row }">
            <template v-if="row.isVirtual"><span class="tip">虚拟奖品,无需地址</span></template>
            <template v-else-if="row.receiverAddress">
              <div>{{ row.receiverName }} {{ row.receiverPhone }}</div>
              <div class="tip">{{ row.receiverAddress }}</div>
            </template>
            <template v-else><el-tag type="info" size="small">玩家未填地址</el-tag></template>
          </template>
        </el-table-column>
        <el-table-column prop="shipNote" label="快递单号" width="130" />
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="prizeStatusTag(row.status)" size="small">{{ prizeStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button v-if="!row.isVirtual && row.status==='GRANTED' && row.receiverAddress"
                       size="small" type="primary" @click="doShip(row)">派送</el-button>
            <el-button v-if="row.status!=='REDEEMED' && (row.isVirtual || row.status==='SHIPPED')"
                       size="small" type="success" @click="doRedeem(row)">核销</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 自动开赛配置（热闹机制） -->
    <el-dialog v-model="autoVisible" title="自动开赛配置（热闹机制）" width="620px">
      <div class="tip" style="margin-bottom:10px;">
        默认<b>关闭</b>。开启后该俱乐部"报名中"的比赛少于 N 场时自动按模板补建，保证赛事列表永不空。
        公共俱乐部(大联盟)建议开启并在模板里配机器人数；真人俱乐部群主也可自己手动建赛，两者共存。
      </div>
      <el-form label-width="140px" size="small">
        <el-form-item label="俱乐部ID">
          <el-input-number v-model="autoCfg.clubId" :min="1" style="width:180px" />
          <el-button size="small" style="margin-left:8px" @click="loadAutoConfig">读取</el-button>
        </el-form-item>
        <el-form-item label="开关">
          <el-switch v-model="autoCfg.enabled" active-text="开启" inactive-text="关闭" />
        </el-form-item>
        <el-form-item label="保底未开赛场次"><el-input-number v-model="autoCfg.minUpcoming" :min="1" :max="10" style="width:180px" /></el-form-item>
        <el-form-item label="报名期(分钟)"><el-input-number v-model="autoCfg.leadMinutes" :min="5" :max="720" style="width:180px" /></el-form-item>
        <el-form-item label="场次间隔(分钟)"><el-input-number v-model="autoCfg.intervalMinutes" :min="10" :max="1440" style="width:180px" /></el-form-item>
        <el-form-item label="名称前缀"><el-input v-model="autoCfg.namePrefix" style="width:220px" placeholder="公开赛" /></el-form-item>
        <el-form-item label="比赛模板JSON">
          <el-input v-model="autoCfg.templateJson" type="textarea" :rows="4"
            placeholder='{"entryFee":1000,"seatNum":8,"lowerLimit":4,"upperLimit":200,"upgradeMinutes":10,"rewardType":1,"robotCount":6}  rewardType:1金币赛 2钻石赛(冠军通吃,记分牌=报名费) 3实物赛(需prizeList+initialScore)' />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="autoVisible=false">关闭</el-button>
        <el-button type="primary" :loading="saving" @click="saveAutoConfig">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  mttList, mttCreate, mttCancel, mttDetail, mttCompetitors, mttLedger,
  mttReconcile, mttStats, mttPrizeGrants, mttPrizeShip, mttPrizeRedeem,
  mttAutoConfigGet, mttAutoConfigSave
} from '../api/index'

const loading = ref(false)
const saving = ref(false)
const clubIdFilter = ref('')
const matches = ref([])
const stats = ref(null)

const createVisible = ref(false)
const detailVisible = ref(false)
const prizesVisible = ref(false)
const autoVisible = ref(false)

const detail = ref(null)
const competitors = ref([])
const ledger = ref([])
const reconcile = ref(null)
const prizes = ref([])

const form = ref(defaultForm())
const autoCfg = ref({ clubId: null, enabled: false, minUpcoming: 2, leadMinutes: 20, intervalMinutes: 60, namePrefix: '公开赛', templateJson: '' })

function defaultForm() {
  return {
    name: '', clubId: null, startTimeDate: null,
    entryFee: 1000, initialScore: 10000, seatNum: 8,
    lowerLimit: 4, upperLimit: 200, upgradeMinutes: 10,
    levelTable: '', rewardType: 1,
    prizeList: '', initialPool: 0, robotCount: 0
  }
}

function statusText(s) { return { 0: '已结束', 1: '报名中', 2: '进行中', 3: '已解散' }[s] ?? s }
function statusTag(s) { return { 0: 'success', 1: 'info', 2: 'warning', 3: 'danger' }[s] ?? 'info' }
// 报名费货币单位：金币赛=金币；钻石赛/实物赛=钻石
function feeUnit(rewardType) { return rewardType === 1 ? '金币' : '钻石' }
function prizeStatusText(s) { return { GRANTED: '待派送', SHIPPED: '已派送', REDEEMED: '已兑付' }[s] ?? s }
function prizeStatusTag(s) { return { GRANTED: 'warning', SHIPPED: 'primary', REDEEMED: 'success' }[s] ?? 'info' }
function fmtTime(ms) {
  if (!ms) return '-'
  const d = new Date(Number(ms))
  const p = n => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

async function load() {
  loading.value = true
  try {
    const clubId = clubIdFilter.value ? Number(clubIdFilter.value) : null
    const [listRes, statsRes] = await Promise.all([mttList(clubId), mttStats(clubId)])
    if (listRes.code === 200) matches.value = listRes.data || []
    if (statsRes.code === 200) stats.value = statsRes.data
  } catch (e) {
    ElMessage.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.value = defaultForm()
  if (clubIdFilter.value) form.value.clubId = Number(clubIdFilter.value)
  createVisible.value = true
}

async function doCreate() {
  const f = form.value
  if (!f.name || !f.clubId || !f.startTimeDate) {
    ElMessage.warning('名称/俱乐部ID/开赛时间必填')
    return
  }
  saving.value = true
  try {
    const body = { ...f, startTime: new Date(f.startTimeDate).getTime() }
    delete body.startTimeDate
    if (!body.levelTable) delete body.levelTable
    if (!body.prizeList) delete body.prizeList
    const res = await mttCreate(body)
    if (res.code === 200) {
      ElMessage.success('比赛已创建')
      createVisible.value = false
      load()
    } else {
      ElMessage.error(res.message || '创建失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '创建失败')
  } finally {
    saving.value = false
  }
}

async function doCancel(row) {
  try {
    await ElMessageBox.confirm(`确认取消「${row.name}」？将全额退还所有报名费。`, '取消比赛', { type: 'warning' })
  } catch { return }
  const res = await mttCancel(row.id, '运营取消')
  if (res.code === 200) { ElMessage.success('已取消并退费'); load() }
  else ElMessage.error(res.message || '取消失败')
}

async function openDetail(row) {
  detailVisible.value = true
  detail.value = null
  try {
    const [d, c, l, r] = await Promise.all([
      mttDetail(row.id), mttCompetitors(row.id), mttLedger(row.id), mttReconcile(row.id)
    ])
    if (d.code === 200) detail.value = d.data
    if (c.code === 200) competitors.value = c.data || []
    if (l.code === 200) ledger.value = l.data || []
    if (r.code === 200) reconcile.value = r.data
  } catch (e) {
    ElMessage.error(e.message || '加载详情失败')
  }
}

async function openPrizes(row) {
  prizesVisible.value = true
  const res = await mttPrizeGrants(row.id)
  prizes.value = res.code === 200 ? (res.data || []) : []
}

async function doShip(row) {
  let shipNote = ''
  try {
    const { value } = await ElMessageBox.prompt(
      `收货人：${row.receiverName} ${row.receiverPhone}\n地址：${row.receiverAddress}\n\n请输入快递单号/派送备注：`,
      `派送「${row.prizeName}」`, { confirmButtonText: '确认派送', inputPlaceholder: '如 SF1234567890' })
    shipNote = value || ''
  } catch { return }
  const res = await mttPrizeShip(row.id, shipNote, 'admin')
  if (res.code === 200) {
    ElMessage.success('已标记派送')
    row.status = 'SHIPPED'
    row.shipNote = shipNote
  } else {
    ElMessage.error(res.message || '派送失败')
  }
}

async function doRedeem(row) {
  try {
    await ElMessageBox.confirm(`确认核销「${row.prizeName}」(名次${row.rankNo}, userId=${row.userId})？`, '核销兑付', { type: 'warning' })
  } catch { return }
  const res = await mttPrizeRedeem(row.id, 'admin')
  if (res.code === 200) {
    ElMessage.success('已核销')
    row.status = 'REDEEMED'
  } else {
    ElMessage.error(res.message || '核销失败')
  }
}

function openAutoConfig() {
  if (clubIdFilter.value) autoCfg.value.clubId = Number(clubIdFilter.value)
  autoVisible.value = true
}

async function loadAutoConfig() {
  if (!autoCfg.value.clubId) { ElMessage.warning('先填俱乐部ID'); return }
  const res = await mttAutoConfigGet(autoCfg.value.clubId)
  if (res.code === 200 && res.data) {
    autoCfg.value = { ...autoCfg.value, ...res.data }
    ElMessage.success('已读取')
  }
}

async function saveAutoConfig() {
  if (!autoCfg.value.clubId) { ElMessage.warning('先填俱乐部ID'); return }
  saving.value = true
  try {
    const res = await mttAutoConfigSave(autoCfg.value)
    if (res.code === 200) {
      ElMessage.success(autoCfg.value.enabled ? '已保存：自动开赛已开启' : '已保存：自动开赛关闭')
      autoVisible.value = false
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.mtt-page { padding: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.title { font-weight: 600; font-size: 16px; }
.stats-row { display: flex; gap: 12px; flex-wrap: wrap; }
.stat-card {
  flex: 1; min-width: 110px; background: #f7f9fc; border: 1px solid #e4e9f2;
  border-radius: 8px; padding: 10px 14px; text-align: center;
}
.stat-card .num { font-size: 20px; font-weight: 700; }
.stat-card .lab { font-size: 12px; color: #909399; margin-top: 2px; }
.tip { font-size: 12px; color: #909399; margin-left: 8px; }
.reconcile { background: #f7f9fc; padding: 10px; border-radius: 6px; font-size: 12px; }
</style>
