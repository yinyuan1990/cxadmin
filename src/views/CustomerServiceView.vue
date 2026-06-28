<template>
  <div class="cs-page">
    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <span class="title">客服系统（群主代聊）</span>
          <div style="display:flex; gap:12px; align-items:center;">
            <span style="color:#909399; font-size:12px;">俱乐部:</span>
            <el-select
              v-model="currentClubId"
              size="small"
              filterable
              placeholder="选择俱乐部"
              style="width: 280px;"
              @change="onClubChange"
            >
              <el-option
                v-for="c in clubs"
                :key="c.clubId"
                :value="c.clubId"
                :label="`${c.clubName}（${c.clubNo}）— 群主 ${c.ownerName}`"
              />
            </el-select>
            <el-button :icon="Refresh" :loading="sessionsLoading" size="small" @click="loadSessions">刷新</el-button>
            <el-tooltip content="自动每 8 秒拉一次最新会话和消息">
              <el-switch v-model="autoRefresh" inline-prompt active-text="自动" inactive-text="手动" />
            </el-tooltip>
          </div>
        </div>
      </template>

      <div class="cs-body" v-if="currentClubId">
        <!-- 左：会话列表 -->
        <div class="sessions-pane">
          <div v-if="sessions.length === 0" class="empty-tip">暂无会员对话</div>
          <div
            v-for="s in sessions"
            :key="s.peerUserId"
            class="session-item"
            :class="{ active: activeSession && activeSession.peerUserId === s.peerUserId }"
            @click="openSession(s)"
          >
            <div class="session-avatar">
              <img v-if="s.peerAvatar" :src="s.peerAvatar" />
              <span v-else>{{ initialOf(s.peerName) }}</span>
            </div>
            <div class="session-meta">
              <div class="session-title">
                <span class="session-name">{{ s.peerName }}</span>
                <span v-if="s.peerNumberId" class="session-numid">({{ s.peerNumberId }})</span>
                <span class="session-time">{{ formatTime(s.lastTime) }}</span>
              </div>
              <div class="session-preview">
                <span v-if="s.lastFromMe" style="color:#909399;">我: </span>
                {{ s.lastContent || '...' }}
              </div>
            </div>
          </div>
        </div>

        <!-- 右：聊天区 -->
        <div class="chat-pane" v-if="activeSession">
          <div class="chat-header">
            <span class="chat-peer-name">
              {{ activeSession.peerName }}
              <span v-if="activeSession.peerNumberId" style="color:#909399; font-size:12px;">
                ({{ activeSession.peerNumberId }})
              </span>
            </span>
            <el-button :icon="Refresh" size="small" link @click="reloadMessages">刷新</el-button>
          </div>

          <div class="chat-messages" ref="chatBoxRef" v-loading="historyLoading">
            <div v-if="messages.length === 0 && !historyLoading" class="empty-tip">暂无消息记录</div>
            <div
              v-for="m in messages"
              :key="m.id"
              class="msg-row"
              :class="{ mine: isMine(m), system: m.senderId === 0 }"
            >
              <div class="msg-meta">
                <span>{{ isMine(m) ? '我（群主）' : m.senderNick || ('用户' + m.senderId) }}</span>
                <span class="msg-time">{{ formatTime(m.createdAt) }}</span>
              </div>
              <div class="msg-bubble" :class="bubbleClass(m)">
                <template v-if="m.msgType === 1 || m.msgType === 4">{{ m.content }}</template>
                <template v-else-if="m.msgType === 2">
                  <a :href="m.mediaUrl" target="_blank">
                    <img :src="m.mediaUrl" style="max-width:200px; max-height:200px; display:block; border-radius:4px;" />
                  </a>
                </template>
                <template v-else-if="m.msgType === 3">
                  <audio :src="m.mediaUrl" controls preload="none" style="max-width:200px;" />
                  <div style="color:#909399; font-size:12px;">语音 {{ m.mediaDuration || 0 }}s</div>
                </template>
                <template v-else-if="m.msgType === 5">
                  [礼物] {{ m.giftId }} ×{{ m.giftCount || 1 }}
                  <span v-if="m.content"> — {{ m.content }}</span>
                </template>
                <template v-else-if="m.msgType === 9">
                  <span style="color:#E6A23C;">[系统] {{ m.content }}</span>
                </template>
                <template v-else>{{ m.content }}</template>
              </div>
            </div>
          </div>

          <div class="chat-input">
            <el-input
              v-model="draftText"
              type="textarea"
              :rows="3"
              placeholder="输入消息内容，Enter 发送，Shift+Enter 换行"
              resize="none"
              @keydown.enter.exact.prevent="onSend"
            />
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
              <span style="color:#909399; font-size:12px;">作为群主回复 {{ activeSession.peerName }}</span>
              <el-button type="primary" size="small" :loading="sending" :disabled="!draftText.trim()" @click="onSend">
                发送
              </el-button>
            </div>
          </div>
        </div>

        <div class="chat-pane empty" v-else>
          <div class="empty-tip">从左侧选一个会员开始对话</div>
        </div>
      </div>

      <div v-else class="empty-tip" style="padding:60px 0;">
        请先选择俱乐部
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { getChatClubs, getChatSessions, getChatHistory, sendChatMessage } from '../api/index'

const clubs = ref([])
const currentClubId = ref(null)
const sessions = ref([])
const sessionsLoading = ref(false)
const activeSession = ref(null)

const messages = ref([])
const historyLoading = ref(false)
const draftText = ref('')
const sending = ref(false)
const chatBoxRef = ref(null)
const autoRefresh = ref(true)
let pollTimer = null
let lastMsgIdSeen = 0

function formatTime(t) {
  if (!t) return ''
  const s = String(t).replace('T', ' ').slice(0, 19)
  return s
}

function initialOf(name) {
  if (!name) return '?'
  return name[0]
}

function isMine(m) {
  // 群主 = activeSession 的"非 peer"那一方
  if (!activeSession.value) return false
  return m.senderId && m.senderId !== activeSession.value.peerUserId && m.senderId !== 0
}

function bubbleClass(m) {
  if (m.senderId === 0) return 'system'
  return isMine(m) ? 'mine' : 'theirs'
}

async function loadClubs() {
  try {
    const res = await getChatClubs()
    if (res.code === 200) {
      clubs.value = res.data.content || []
      if (clubs.value.length > 0 && !currentClubId.value) {
        currentClubId.value = clubs.value[0].clubId
        await loadSessions()
      }
    } else {
      ElMessage.error(res.message || '加载俱乐部列表失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '加载俱乐部列表失败')
  }
}

async function loadSessions() {
  if (!currentClubId.value) return
  sessionsLoading.value = true
  try {
    const res = await getChatSessions(currentClubId.value)
    if (res.code === 200) {
      sessions.value = res.data.sessions || []
    } else {
      ElMessage.error(res.message || '加载会话失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '加载会话失败')
  } finally {
    sessionsLoading.value = false
  }
}

function onClubChange() {
  activeSession.value = null
  messages.value = []
  loadSessions()
}

async function openSession(s) {
  activeSession.value = s
  messages.value = []
  lastMsgIdSeen = 0
  await loadMessages()
}

async function loadMessages() {
  if (!currentClubId.value || !activeSession.value) return
  historyLoading.value = true
  try {
    const res = await getChatHistory({
      clubId: currentClubId.value,
      peerUserId: activeSession.value.peerUserId,
      size: 50,
    })
    if (res.code === 200) {
      // list 是按 id 倒序返回的 → 反转成正序展示
      const list = (res.data.list || []).slice().reverse()
      messages.value = list
      if (list.length > 0) {
        lastMsgIdSeen = Math.max(...list.map(m => m.id || 0))
      }
      await nextTick()
      scrollToBottom()
    } else {
      ElMessage.error(res.message || '加载历史失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '加载历史失败')
  } finally {
    historyLoading.value = false
  }
}

function reloadMessages() {
  loadMessages()
}

function scrollToBottom() {
  const box = chatBoxRef.value
  if (box) box.scrollTop = box.scrollHeight
}

async function onSend() {
  if (!draftText.value.trim() || !activeSession.value) return
  sending.value = true
  try {
    const res = await sendChatMessage({
      clubId: currentClubId.value,
      targetUserId: activeSession.value.peerUserId,
      msgType: 1,
      content: draftText.value.trim(),
    })
    if (res.code === 200) {
      draftText.value = ''
      // 立即刷新当前会话和列表
      await loadMessages()
      loadSessions()
    } else {
      ElMessage.error(res.message || '发送失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '发送失败')
  } finally {
    sending.value = false
  }
}

// 轮询：每 8 秒拉一次会话列表 + 当前打开的会话历史（增量比对）
async function pollOnce() {
  if (!autoRefresh.value || !currentClubId.value) return
  try {
    // 先拉会话列表（更新预览/排序）
    const sRes = await getChatSessions(currentClubId.value)
    if (sRes.code === 200) {
      sessions.value = sRes.data.sessions || []
      // 同步选中会话的元数据
      if (activeSession.value) {
        const updated = sessions.value.find(x => x.peerUserId === activeSession.value.peerUserId)
        if (updated) activeSession.value = updated
      }
    }
    // 再拉当前打开会话的最新消息
    if (activeSession.value) {
      const hRes = await getChatHistory({
        clubId: currentClubId.value,
        peerUserId: activeSession.value.peerUserId,
        size: 50,
      })
      if (hRes.code === 200) {
        const list = (hRes.data.list || []).slice().reverse()
        const newMaxId = list.length > 0 ? Math.max(...list.map(m => m.id || 0)) : 0
        if (newMaxId > lastMsgIdSeen) {
          messages.value = list
          lastMsgIdSeen = newMaxId
          await nextTick()
          scrollToBottom()
        }
      }
    }
  } catch (e) {
    // 静默失败
  }
}

onMounted(() => {
  loadClubs()
  pollTimer = setInterval(pollOnce, 8000)
})

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<style scoped>
.cs-page {
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

.cs-body {
  display: flex;
  height: calc(100vh - 240px);
  border: 1px solid #ebeef5;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}

.sessions-pane {
  width: 320px;
  border-right: 1px solid #ebeef5;
  overflow-y: auto;
  background: #fafbfc;
}

.session-item {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid #f0f2f5;
  transition: background 0.15s;
}
.session-item:hover {
  background: #f0f7ff;
}
.session-item.active {
  background: #e6f0ff;
}

.session-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #c0c4cc;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  flex-shrink: 0;
  overflow: hidden;
}
.session-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.session-meta {
  flex: 1;
  min-width: 0;
}
.session-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
}
.session-name {
  font-weight: 600;
  color: #303133;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.session-numid {
  color: #909399;
  font-size: 12px;
}
.session-time {
  color: #909399;
  font-size: 11px;
  white-space: nowrap;
}
.session-preview {
  color: #606266;
  font-size: 12px;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
}
.chat-pane.empty {
  align-items: center;
  justify-content: center;
}

.chat-header {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid #ebeef5;
  background: #fafbfc;
}
.chat-peer-name {
  font-weight: 600;
  color: #303133;
}

.chat-messages {
  flex: 1;
  padding: 14px 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.msg-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.msg-row.mine {
  align-items: flex-end;
}
.msg-row.system {
  align-items: center;
}
.msg-meta {
  font-size: 11px;
  color: #909399;
  margin-bottom: 2px;
  display: flex;
  gap: 6px;
}
.msg-time {
  color: #c0c4cc;
}
.msg-bubble {
  max-width: 70%;
  padding: 8px 12px;
  border-radius: 8px;
  word-break: break-all;
  font-size: 14px;
  line-height: 1.5;
}
.msg-bubble.mine {
  background: #409eff;
  color: #fff;
}
.msg-bubble.theirs {
  background: #f4f4f5;
  color: #303133;
}
.msg-bubble.system {
  background: #fdf6ec;
  color: #e6a23c;
  border: 1px dashed #e6a23c;
}

.chat-input {
  padding: 10px 12px;
  border-top: 1px solid #ebeef5;
  background: #fafbfc;
}

.empty-tip {
  text-align: center;
  color: #c0c4cc;
  padding: 40px 0;
  font-size: 14px;
}
</style>
