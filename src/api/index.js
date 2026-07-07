import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import router from '../router'

const request = axios.create({
  baseURL: '/',
  timeout: 10000
})

// 请求拦截：自动附加 Token
request.interceptors.request.use(config => {
  const auth = useAuthStore()
  if (auth.token) {
    config.headers['Authorization'] = `Bearer ${auth.token}`
  }
  return config
})

// 响应拦截：统一错误处理
request.interceptors.response.use(
  res => res.data,
  err => {
    const status = err.response?.status
    if (status === 401) {
      const auth = useAuthStore()
      auth.logout()
      router.push('/login')
      ElMessage.error('登录已过期，请重新登录')
    } else {
      ElMessage.error(err.response?.data?.message || '请求失败')
    }
    return Promise.reject(err)
  }
)

// ---- 管理员接口 ----

export function adminLogin(username, password) {
  return request.post('/admin/login', { username, password })
}

// ---- 用户管理接口 ----

export function getUserList(params) {
  return request.get('/admin/user/list', { params })
}

export function adjustGameScore(userId, amount) {
  return request.post('/admin/user/adjustGameScore', { userId, amount })
}

export function adjustDiamond(userId, amount) {
  return request.post('/admin/user/adjustDiamond', { userId, amount })
}

export function resetUserPassword(userId, newPassword) {
  return request.post('/admin/user/resetPassword', { userId, newPassword })
}

export function updateUserAvatar(userId, avatar) {
  return request.post('/admin/user/updateAvatar', { userId, avatar })
}

export function getScoreLog(params) {
  return request.get('/admin/user/scoreLog', { params })
}

export function getDiamondLog(params) {
  return request.get('/admin/user/diamondLog', { params })
}

// ---- 授信日志接口 ----

export function getCreditClubs() {
  return request.get('/admin/credit/clubs')
}

export function getCreditLogs(params) {
  return request.get('/admin/credit/logs', { params })
}

export function getCreditSummary(params) {
  return request.get('/admin/credit/summary', { params })
}

export function getCreditUserSummary(params) {
  return request.get('/admin/credit/userSummary', { params })
}

// ---- 积分反点日志接口 ----

export function getCommissionLogs(params) {
  return request.get('/admin/commission/logs', { params })
}

export function getCommissionSummary(params) {
  return request.get('/admin/commission/summary', { params })
}

export function getCommissionUserSummary(params) {
  return request.get('/admin/commission/userSummary', { params })
}

// ---- 系统配置接口 ----

export function getAllConfigs() {
  return request.get('/api/system/config/all')
}

export function updateConfig(key, value, description) {
  return request.post('/api/system/config/update', { key, value, description })
}

// ---- 指定发牌（测试）：规则存 Redis，按 userId/昵称/6位ID 指定目标玩家 ----

export function getDealRules() {
  return request.get('/api/system/config/dealRules')
}

export function setDealRules(rules) {
  return request.post('/api/system/config/dealRules', { rules })
}

// ---- 客服系统(admin 代表群主聊天) ----

export function getChatClubs() {
  return request.get('/admin/chat/clubs')
}

export function getChatSessions(clubId) {
  return request.get('/admin/chat/sessions', { params: { clubId } })
}

export function getChatHistory(params) {
  // params: { clubId, peerUserId, beforeId?, size? }
  return request.get('/admin/chat/history', { params })
}

export function sendChatMessage(body) {
  // body: { clubId, targetUserId, msgType, content?, mediaUrl?, ... }
  return request.post('/admin/chat/send', body)
}

// ---- 战绩查询（每局牌型 + 盈亏明细） ----

export function listGameRecordSessions(params) {
  // params: { clubId?, tableId?, userId?, startDate?, endDate?, page?, pageSize? }
  return request.get('/admin/gameRecord/sessions', { params })
}

export function getGameRecordSessionDetail(sessionId) {
  return request.get('/admin/gameRecord/sessionDetail', { params: { sessionId } })
}

// ---- 服务器监控 ----

export function getServerMetrics() {
  return request.get('/admin/metrics/overview')
}

// ---- 调试 trace 总开关 ----

export function getDebugTraceEnabled() {
  return request.get('/api/system/config/debugTraceEnabled')
}

export function toggleDebugTraceEnabled(enabled) {
  return request.post('/api/system/config/debugTraceEnabled', { enabled })
}

// ---- 周期返点扣群主钻石 ----

export function getCommissionSettleDiamondCost() {
  return request.get('/api/system/config/commissionSettleDiamondCost')
}

export function setCommissionSettleDiamondCost(cost) {
  return request.post('/api/system/config/commissionSettleDiamondCost', { cost })
}

// ---- v49 / v50: 周期返点扣群主钻石档位配置(1~5 个动态) ----

export function getCommissionSettleDiamondTiers() {
  return request.get('/api/system/config/commissionSettleDiamondTiers')
}

export function setCommissionSettleDiamondTiers(tiers) {
  return request.post('/api/system/config/commissionSettleDiamondTiers', { tiers })
}

// ---- v50: 可选结算时间(创建房间下拉框选项,逗号分隔分钟数) ----

export function getAvailableSettleTime() {
  return request.get('/api/system/config/availableSettleTime')
}

export function setAvailableSettleTime(values) {
  return request.post('/api/system/config/availableSettleTime', { values })
}

// ---- 幽灵玩家展示时长（玩家离开房间后在俱乐部房间列表里继续显示的时长） ----

export function getGhostExpireSeconds() {
  return request.get('/api/system/config/ghostExpireSeconds')
}

export function setGhostExpireSeconds(seconds) {
  return request.post('/api/system/config/ghostExpireSeconds', { seconds })
}

// ---- 周期结算补带入等待秒数 ----

export function getPeriodSettleBringInSeconds() {
  return request.get('/api/system/config/periodSettleBringInSeconds')
}

export function setPeriodSettleBringInSeconds(seconds) {
  return request.post('/api/system/config/periodSettleBringInSeconds', { seconds })
}

// ---- 周期内筹码不足座位保护秒数 ----

export function getInsufficientChipsProtectSeconds() {
  return request.get('/api/system/config/insufficientChipsProtectSeconds')
}

export function setInsufficientChipsProtectSeconds(seconds) {
  return request.post('/api/system/config/insufficientChipsProtectSeconds', { seconds })
}

// ---- 单人坐下等待超时（人数不足时自动站起/踢出房间） ----

export function getSoloWaitTimeout() {
  return request.get('/api/system/config/soloWaitTimeout')
}

export function setSoloWaitTimeout(data) {
  return request.post('/api/system/config/soloWaitTimeout', data)
}

// ---- MTT 比赛管理（主服 /admin/mtt/* 代理比赛服） ----

export function mttList(clubId) {
  return request.post('/admin/mtt/list', clubId ? { clubId } : {})
}

export function mttCreate(data) {
  return request.post('/admin/mtt/create', data)
}

export function mttCancel(matchId, reason) {
  return request.post('/admin/mtt/cancel', { matchId, reason })
}

export function mttDetail(matchId) {
  return request.post('/admin/mtt/detail', { matchId })
}

export function mttCompetitors(matchId) {
  return request.post('/admin/mtt/competitors', { matchId })
}

export function mttLedger(matchId) {
  return request.post('/admin/mtt/ledger', { matchId })
}

export function mttReconcile(matchId) {
  return request.post('/admin/mtt/reconcile', { matchId })
}

export function mttStats(clubId) {
  return request.post('/admin/mtt/stats', clubId ? { clubId } : {})
}

export function mttPrizeGrants(matchId) {
  return request.post('/admin/mtt/prizeGrants', { matchId })
}

export function mttPrizeShip(grantId, shipNote, operator) {
  return request.post('/admin/mtt/prizeShip', { grantId, shipNote, operator })
}

export function mttPrizeRedeem(grantId, operator) {
  return request.post('/admin/mtt/prizeRedeem', { grantId, operator })
}

// ---- MTT 俱乐部维度管理（机器人/成员/赢亏配置，主服直出不走比赛服） ----

export function mttClubs(params) {
  // { type?, keyword?, page, size }
  return request.post('/admin/mtt/clubs', params || {})
}

export function mttRobotGenerate(clubId, count, avatarFolder) {
  return request.post('/admin/mtt/robot/generate', { clubId, count, avatarFolder })
}

export function mttRobotList(clubId, page = 0, size = 50) {
  return request.post('/admin/mtt/robot/list', { clubId, page, size })
}

export function mttOwnerBalance(clubId) {
  return request.post('/admin/mtt/robot/ownerBalance', { clubId })
}

export function mttRobotTransfer(clubId, currency, amountPerRobot, userIds) {
  return request.post('/admin/mtt/robot/transfer', { clubId, currency, amountPerRobot, userIds })
}

export function mttTopUpOwner(clubId, currency, amount) {
  return request.post('/admin/mtt/robot/topUpOwner', { clubId, currency, amount })
}

export function mttAvatarFolder(clubId) {
  return request.post('/admin/mtt/robot/avatarFolder', { clubId })
}

export function mttRobotUpdateProfile(userId, nickname, avatar) {
  return request.post('/admin/mtt/robot/updateProfile', { userId, nickname, avatar })
}

export function mttMembers(clubId, page = 0, size = 50) {
  return request.post('/admin/mtt/members', { clubId, page, size })
}

// ---- 实物奖品库（最简 CRUD；建实物赛时下拉选择） ----

export function mttPrizeItemList(all = false) {
  return request.post('/admin/mtt/prizeItem/list', { all })
}

export function mttPrizeItemSave(data) {
  // { id?, name, icon?, detail?, isVirtual?, status? }
  return request.post('/admin/mtt/prizeItem/save', data)
}

export function mttPrizeItemDelete(id) {
  return request.post('/admin/mtt/prizeItem/delete', { id })
}

export function mttAutoConfigGet(clubId) {
  return request.post('/admin/mtt/autoConfig/get', { clubId })
}

export function mttAutoConfigSave(data) {
  return request.post('/admin/mtt/autoConfig/save', data)
}

// ---- 排队保队时间（排队中玩家离线后保留排队资格的秒数，0=离线立即踢队） ----

export function getQueueKeepSeconds() {
  return request.get('/api/system/config/queueKeepSeconds')
}

export function setQueueKeepSeconds(seconds) {
  return request.post('/api/system/config/queueKeepSeconds', { seconds })
}

// ---- 钻石兑换金币比例（1钻=N金币，单向兑换，MTT金币赛报名货币） ----

export function getGoldPerDiamond() {
  return request.get('/api/system/config/goldPerDiamond')
}

export function setGoldPerDiamond(rate) {
  return request.post('/api/system/config/goldPerDiamond', { rate })
}

// ---- 抽水上限(commission_rate_max) ----

export function getCommissionRateMax() {
  return request.get('/api/system/config/commissionRateMax')
}

export function setCommissionRateMax(max) {
  return request.post('/api/system/config/commissionRateMax', { max })
}

// ---- 注册昵称最大长度 ----

export function getRegisterNicknameMaxLength() {
  return request.get('/api/system/config/registerNicknameMaxLength')
}

export function setRegisterNicknameMaxLength(maxLength) {
  return request.post('/api/system/config/registerNicknameMaxLength', { maxLength })
}

// ---- 俱乐部名称最大长度 ----

export function getClubNameMaxLength() {
  return request.get('/api/system/config/clubNameMaxLength')
}

export function setClubNameMaxLength(maxLength) {
  return request.post('/api/system/config/clubNameMaxLength', { maxLength })
}

// ---- 全局奖池开关（针对所有房间） ----

export function getBonusPoolEnabled() {
  return request.get('/api/system/config/bonusPoolEnabled')
}

export function toggleBonusPoolEnabled(enabled) {
  return request.post('/api/system/config/bonusPoolEnabled', { enabled })
}

// ---- 强制秀牌费用 ----

export function getForceShowCardCost() {
  return request.get('/api/system/config/forceShowCardCost')
}

export function setForceShowCardCost(cost) {
  return request.post('/api/system/config/forceShowCardCost', { cost })
}

// ---- 逃跑惩罚配置 ----

export function getRunAwayPenaltyConfig() {
  return request.get('/api/system/config/runAwayPenalty')
}

export function setRunAwayPenaltyConfig(data) {
  return request.post('/api/system/config/runAwayPenalty', data)
}

// ---- 赢家早退过路费配置 ----

export function getWinnerEarlyLeaveConfig() {
  return request.get('/api/system/config/winnerEarlyLeave')
}

export function setWinnerEarlyLeaveConfig(data) {
  return request.post('/api/system/config/winnerEarlyLeave', data)
}

// ---- 文件上传 ----

/**
 * 上传图片（multipart/form-data）
 * 后端 /admin/upload/file，返回图片可访问 URL
 *
 * 注意：之前走 /upload/uploadFile，但生产 nginx 只转发 /api 与 /admin，
 * /upload 没有 location → nginx 按静态文件处理导致 POST 405。
 * 改走 /admin/upload/file 复用已有的 /admin 反向代理，无需动 nginx。
 *
 * @param {File} file  Browser File 对象（el-upload 的 rawFile）
 * @returns Promise<{ code, message, data: string (图片URL) }>
 */
export function uploadImage(file) {
  const form = new FormData()
  form.append('file', file)
  return request.post('/admin/upload/file', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000
  })
}

export function uploadAvatar(file) {
  // 头像上传：服务端按需压缩（>200KB 缩放并压到 ≤100KB，256px）
  const form = new FormData()
  form.append('file', file)
  return request.post('/admin/upload/file', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    params: { compress: true, thresholdKb: 200, maxDim: 256, maxKb: 100 },
    timeout: 30000
  })
}

// ---- 大联盟俱乐部（type=3）----

export function getSuperClubList() {
  return request.get('/admin/superClub/list')
}

/**
 * 创建大联盟俱乐部
 * @param {Object} data { name, remark, avatar, notice?, ownerUserId? }
 */
export function createSuperClub(data) {
  return request.post('/admin/superClub/create', data)
}

/**
 * 修改大联盟俱乐部
 * @param {Object} data { clubId, name?, remark?, avatar?, notice? }
 */
export function updateSuperClub(data) {
  return request.post('/admin/superClub/update', data)
}

/**
 * 后台针对大联盟俱乐部创建房间（不扣钻石，creator=群主）
 * @param {Object} data 同 /api/game/create 的 CreateGameRequest（clubId 必须是 type=3）
 */
export function createSuperClubGame(data) {
  return request.post('/admin/superClub/createGame', data)
}

/**
 * 获取创建房间所需配置（可选底注、芒果封顶、结算时间等）
 * 复用客户端的配置接口
 */
export function getCreateGameConfig() {
  return request.get('/api/game/createConfig')
}

/**
 * 获取某俱乐部的牌桌列表
 */
export function getClubTables(clubId) {
  return request.get(`/api/game/club/${clubId}/tables`)
}

/**
 * 解散房间（需俱乐部创建者权限 —— 大联盟群主 = 系统第一个用户）
 * 注意：此接口需要带群主 token，管理员 token 走不通；此处仅占位
 */
export function disbandRoom(roomId) {
  return request.post(`/api/game/club/disband-room/${roomId}`)
}

// ---- 大联盟俱乐部成员管理 ----

/**
 * 大联盟俱乐部成员列表
 * @param {Object} params { clubId, page=0, size=20, keyword? }
 */
export function getSuperClubMembers(params) {
  return request.get('/admin/superClub/members', { params })
}

/**
 * 管理员直接添加成员（绕过 type=3 的自由加入限制）
 * 后端用俱乐部创建者作为操作者，确保权限检查通过
 * @param {Object} data { clubId, userId }
 */
export function addSuperClubMember(data) {
  return request.post('/admin/superClub/addMember', data)
}

/**
 * 管理员直接移除成员（软删除，不能移除群主）
 * @param {Object} data { clubId, userId }
 */
export function removeSuperClubMember(data) {
  return request.post('/admin/superClub/removeMember', data)
}

// ---- GPS 防火牌配置 ----

export function getGpsConfig() {
  return request.get('/api/system/config/gps')
}

export function setGpsConfig(data) {
  return request.post('/api/system/config/gps', data)
}

// ---- 聊天消息保留时长 ----

export function getChatMessageTtl() {
  return request.get('/api/system/config/chatMessageTtl')
}

export function setChatMessageTtl(hours) {
  return request.post('/api/system/config/chatMessageTtl', { hours })
}

// ---- v49: 礼物管理 ----

export function adminGiftList() {
  return request.get('/admin/gift/list')
}

export function adminGiftSave(data) {
  return request.post('/admin/gift/save', data)
}

export function adminGiftDelete(id) {
  return request.post('/admin/gift/delete', { id })
}

// ---- 俱乐部管理 / 机器人压测 ----

export function getRobotStatus() {
  // 全局运行态：robotCount / managedRoomCount / totalRoomCount / anyClubEnabled
  return request.get('/admin/robot/status')
}

export function getRobotClubConfig(clubId) {
  // 某俱乐部压测配置（持久化）
  return request.get('/admin/robot/clubConfig', { params: { clubId } })
}

export function updateRobotConfig(data) {
  // data: { clubId, enabled?, activeStartHour?, ... rebuyMultiplier? } 落库
  return request.post('/admin/robot/clubConfig', data)
}

export function setRobotEnabled(clubId, enabled) {
  // 某俱乐部压测开关（落库）
  return request.post('/admin/robot/enable', { clubId, enabled })
}

export function setClubGameDisabled(clubId, gameDisabled) {
  // 俱乐部「禁用游戏」开关（维护/测试）：true=禁止新玩家进桌坐下，不影响已在玩的
  return request.post('/admin/robot/setGameDisabled', { clubId, gameDisabled })
}

export function reloadRobotIds() {
  return request.post('/admin/robot/reloadIds')
}

export function listClubRobots(clubId) {
  return request.get('/admin/robot/list', { params: { clubId } })
}

export function listClubRobotsPaged(params) {
  // params: { clubId, page=0, size=20 }
  return request.get('/admin/robot/listPaged', { params })
}

export function listRobotClubs(params) {
  // params: { keyword?, page=0, size=20 }
  return request.get('/admin/robot/clubs', { params })
}

export function searchRobotClubs(keyword) {
  // 支持 俱乐部ID / 6位编号 / 名称
  return request.get('/admin/robot/searchClubs', { params: { keyword } })
}

export function listRobotTables(clubId) {
  return request.get('/admin/robot/tables', { params: { clubId } })
}

export function generateClubRobots(data) {
  // data: { clubId, count, namePrefix?, password?, avatar?, avatars?, initScore? }
  return request.post('/admin/robot/generate', data)
}

export function setRobotFlag(data) {
  // data: { clubId, userIds?, isRobot }
  return request.post('/admin/robot/setFlag', data)
}

export function robotTopUp(data) {
  // data: { clubId, amount, mode? }  mode: add / set
  return request.post('/admin/robot/topUp', data)
}

export function setRobotAvatars(data) {
  // data: { userIds, avatar?, avatars? }
  return request.post('/admin/robot/setAvatars', data)
}

export function robotBatchCreate(data) {
  // data: RobotBatchParams
  return request.post('/admin/robot/batchCreate', data)
}

export function robotStopAll(clubId) {
  // clubId 为空=停所有俱乐部；指定=只停该俱乐部
  return request.post('/admin/robot/stopAll', clubId ? { clubId } : {})
}

export function assignAvatarsFromFolder(data) {
  return request.post('/admin/robot/avatars/assignFromFolder', data)
}

// 控盘对真人输赢 — 本俱乐部结果 / 按桌 / 历史回顾（持久化，解散改桌后仍可查）
export function getClubProfit(clubId) {
  return request.get('/admin/robot/profit/clubSummary', { params: { clubId } })
}

// 全局汇总（保留，跨俱乐部；当前后台按俱乐部查看）
export function getProfitSummary() {
  return request.get('/admin/robot/profit/summary')
}

export function getProfitTables(clubId) {
  return request.get('/admin/robot/profit/tables', { params: { clubId } })
}

export function getProfitHistory(params) {
  // params: { clubId?, roomId?, page?, size? }
  return request.get('/admin/robot/profit/history', { params })
}

// 手动清理逐把「对账过程」（不影响群主输赢结果）
export function clearProfitHistory(data) {
  // data: { clubId?, roomId?, beforeDays? }
  return request.post('/admin/robot/profit/history/clear', data || {})
}

export function robotRandomAvatars(data) {
  // data: { clubId, urls: [url...], userIds? }  先上传本地图片拿到 urls 再调用
  return request.post('/admin/robot/randomAvatars', data)
}

export function robotRandomNames(data) {
  // data: { clubId, userIds? }
  return request.post('/admin/robot/randomNames', data)
}

export function getRobotProfitStatus(roomId) {
  return request.get('/admin/robot/profit/status', { params: { roomId } })
}

export function setRobotProfitRoom(data) {
  // data: { roomId, enabled, mode, targetProfit, targetProfitRate, perHandCap, adjustStrength, resetLedger? }
  return request.post('/admin/robot/profit/room', data)
}

export function setRobotProfitClub(data) {
  // data: { clubId, enabled, mode, targetProfit, targetProfitRate, perHandCap, adjustStrength, resetLedger? }
  return request.post('/admin/robot/profit/club', data)
}

// ---- 围观机器人（造假围观，仅观战不打牌；is_robot=2） ----

export function generateClubViewers(data) {
  // data: { clubId, count, password?, avatar?, avatars?, nickMinLen?, nickMaxLen? }
  return request.post('/admin/robot/viewers/generate', data)
}

export function listClubViewers(params) {
  // params: { clubId, page, size }
  return request.get('/admin/robot/viewers/list', { params })
}

export function viewerRandomNames(data) {
  // data: { clubId, userIds?, nickMinLen?, nickMaxLen? }
  return request.post('/admin/robot/viewers/randomNames', data)
}

export function viewerRandomAvatars(data) {
  // data: { clubId, urls, userIds? }
  return request.post('/admin/robot/viewers/randomAvatars', data)
}

export function addRobotViewers(data) {
  // data: { roomId, count }
  return request.post('/admin/robot/viewers/add', data)
}

export function clearRobotViewers(data) {
  // data: { roomId }
  return request.post('/admin/robot/viewers/clear', data)
}

export function adjustRobotViewers(data) {
  // data: { roomId } 围观机器人集合不变，只换昵称+随机顺序
  return request.post('/admin/robot/viewers/adjust', data)
}

// ---- 服务器日志下载 / 清理 ----

export function listServerLogs() {
  return request.get('/admin/logs/list')
}

export function clearServerLog(path) {
  return request.post('/admin/logs/clear', { path })
}

export function clearAllServerLogs() {
  return request.post('/admin/logs/clearAll')
}

// 下载日志：blob 流式下载（带 Authorization），返回 { blob, filename }
export function downloadServerLog(path, filename) {
  return request.get('/admin/logs/download', {
    params: { path },
    responseType: 'blob',
    timeout: 0 // 大文件不限时
  }).then(blob => {
    // 响应拦截器对 blob 也会返回 res.data(=blob)
    const url = window.URL.createObjectURL(new Blob([blob]))
    const a = document.createElement('a')
    a.href = url
    a.download = filename || 'log.txt'
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  })
}
