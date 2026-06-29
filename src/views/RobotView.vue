<template>
  <div class="robot-page">
    <el-alert type="warning" :closable="false" class="intro">
      <template #title><strong>机器人压测（仅用于压测，请勿用于线上运营）</strong></template>
      <div class="desc-list">
        <p>• 机器人 = user 表 is_robot=1 的真实俱乐部成员；不破坏现有房间逻辑，独立模块接管「机器人」的操作。</p>
        <p>• 流程：俱乐部列表选一个真实俱乐部 → 进入后按页签管理机器人 / 建桌 / 盈利控盘。</p>
      </div>
    </el-alert>

    <!-- 全局运行态（开关/配置已按俱乐部，进入俱乐部后设置） -->
    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <span class="title">全局运行态</span>
          <div class="header-actions">
            <el-button :icon="Refresh" :loading="loading" @click="loadStatus">刷新</el-button>
            <el-button type="danger" plain :icon="CircleClose" @click="handleStopAll">停止所有(解散全部托管桌)</el-button>
          </div>
        </div>
      </template>
      <el-descriptions :column="4" border size="small">
        <el-descriptions-item label="机器人总数">{{ status.robotCount }}</el-descriptions-item>
        <el-descriptions-item label="托管房间">{{ status.managedRoomCount }}</el-descriptions-item>
        <el-descriptions-item label="服务器房间总数">{{ status.totalRoomCount }}</el-descriptions-item>
        <el-descriptions-item label="有俱乐部在压测">
          <el-tag :type="status.anyClubEnabled ? 'success' : 'info'">{{ status.anyClubEnabled ? '是' : '否' }}</el-tag>
        </el-descriptions-item>
      </el-descriptions>
      <div class="hint">压测开关/配置已改为【按俱乐部】并持久化（重启不丢）：点进俱乐部在「俱乐部配置」页签设置。</div>
    </el-card>

    <!-- ============ 视图一：俱乐部列表（入口） ============ -->
    <el-card class="page-card" v-if="view === 'list'">
      <template #header>
        <div class="card-header">
          <span class="title">俱乐部列表（点击「进入」管理该俱乐部机器人）</span>
          <div class="header-actions">
            <el-input
              v-model="clubQuery.keyword"
              placeholder="ID / 6位编号 / 名称，留空=全部"
              clearable
              style="width:260px"
              @keyup.enter="searchClubs"
              @clear="searchClubs"
            />
            <el-button :icon="Search" @click="searchClubs">搜索</el-button>
          </div>
        </div>
      </template>
      <el-table :data="clubList" v-loading="clubListLoading" stripe border height="440">
        <el-table-column label="ID" prop="id" width="90" align="center" />
        <el-table-column label="头像" width="70" align="center">
          <template #default="{ row }">
            <el-avatar :size="32" :src="row.avatar"><el-icon><Avatar /></el-icon></el-avatar>
          </template>
        </el-table-column>
        <el-table-column label="编号" prop="no" width="100" />
        <el-table-column label="名称" prop="name" min-width="140" show-overflow-tooltip />
        <el-table-column label="类型" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.type === 3 ? 'warning' : (row.type === 2 ? 'success' : 'info')">{{ row.typeName }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="群主" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.ownerName || '—' }}（{{ row.ownerId }}）</template>
        </el-table-column>
        <el-table-column label="成员数" prop="memberCount" width="90" align="center" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.state === 1 ? 'success' : 'danger'">{{ row.state === 1 ? '正常' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="enterClub(row)">进入</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pager" v-if="!clubQuery.keyword">
        <el-pagination
          layout="prev, pager, next, total"
          :total="clubTotal"
          :page-size="clubQuery.size"
          :current-page="clubQuery.page + 1"
          @current-change="onClubPageChange"
        />
      </div>
    </el-card>

    <!-- ============ 视图二：俱乐部详情（页签） ============ -->
    <template v-else>
      <el-card class="page-card">
        <template #header>
          <div class="card-header">
            <div class="detail-title">
              <el-button :icon="ArrowLeft" @click="backToList">返回列表</el-button>
              <el-avatar :size="32" :src="clubInfo && clubInfo.avatar"><el-icon><Avatar /></el-icon></el-avatar>
              <span class="title" v-if="clubInfo">{{ clubInfo.name }}（#{{ clubInfo.id }} / {{ clubInfo.no }}）</span>
            </div>
            <div class="header-actions">
              <span style="font-size:13px;color:#606266">本俱乐部压测</span>
              <el-switch v-model="config.enabled" @change="handleToggleEnabled" />
              <el-button type="danger" plain size="small" :icon="CircleClose" @click="handleStopClub">停本俱乐部</el-button>
              <el-button :icon="Refresh" :loading="memberLoading" @click="loadMembers">刷新</el-button>
            </div>
          </div>
        </template>
        <el-descriptions v-if="clubInfo" :column="4" border size="small">
          <el-descriptions-item label="类型">
            <el-tag size="small" :type="clubInfo.type === 3 ? 'warning' : (clubInfo.type === 2 ? 'success' : 'info')">{{ clubInfo.typeName }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="群主">{{ clubInfo.ownerName || '—' }}（{{ clubInfo.ownerId }}）</el-descriptions-item>
          <el-descriptions-item label="成员数">{{ clubInfo.memberCount }}</el-descriptions-item>
          <el-descriptions-item label="机器人数">{{ clubInfo.robotCount }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card class="page-card">
        <el-tabs v-model="activeTab" @tab-change="onTabChange">
          <!-- ===== 机器人管理 ===== -->
          <el-tab-pane label="机器人管理" name="members">
            <div class="ops-row">
              <el-card shadow="never" class="op-card">
                <div class="op-title">一键生成俱乐部机器人</div>
                <el-form label-width="90px">
                  <el-form-item label="数量"><el-input-number v-model="gen.count" :min="1" :max="2000" /></el-form-item>
                  <el-form-item label="昵称前缀">
                    <el-input v-model="gen.namePrefix" placeholder="留空=随机网名" style="width:160px" />
                  </el-form-item>
                  <el-form-item label="昵称长度">
                    <el-input-number v-model="nick.minLen" :min="1" :max="12" />
                    <span style="margin:0 6px">~</span>
                    <el-input-number v-model="nick.maxLen" :min="1" :max="12" />
                    <span class="hint">2~5随机；含20%懒人昵称(数字/字母/emoji)。改名也用此长度</span>
                  </el-form-item>
                  <el-form-item label="登录密码"><el-input v-model="gen.password" placeholder="123456" style="width:160px" /></el-form-item>
                  <el-form-item label="初始上分"><el-input-number v-model="gen.initScore" :min="0" :max="1000000000" /></el-form-item>
                  <el-form-item label="统一头像">
                    <el-input v-model="gen.avatar" placeholder="头像URL(可选)" style="width:200px" />
                    <el-upload :show-file-list="false" :http-request="(o)=>doUpload(o,'gen')" accept="image/*">
                      <el-button :icon="Upload" style="margin-left:6px">上传</el-button>
                    </el-upload>
                  </el-form-item>
                  <el-divider content-position="left">本地随机头像（可选，给新建的机器人）</el-divider>
                  <el-form-item label="选择图片">
                    <input ref="genDirInput" type="file" webkitdirectory directory multiple accept="image/*" style="display:none" @change="onPickFiles('gen', $event)" />
                    <input ref="genFilesInput" type="file" multiple accept="image/*" style="display:none" @change="onPickFiles('gen', $event)" />
                    <el-button @click="genDirInput.click()">选择文件夹</el-button>
                    <el-button @click="genFilesInput.click()">选多张</el-button>
                    <span class="hint" v-if="genUpload.fileList.length">已选 {{ genUpload.fileList.length }} 张</span>
                  </el-form-item>
                  <el-form-item v-if="genUpload.uploading">
                    <el-progress :percentage="genUploadPct" style="width:200px" />
                    <span class="hint">上传中 {{ genUpload.done }}/{{ genUpload.total }}</span>
                  </el-form-item>
                  <el-form-item>
                    <el-button type="primary" :loading="genLoading" @click="handleGenerate">生成（含上传随机头像）</el-button>
                    <span class="hint">选了文件夹/图片就先上传再随机分给新机器人</span>
                  </el-form-item>
                </el-form>
              </el-card>

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
                  <el-form-item label="一键改名">
                    <el-button :loading="renameLoading" @click="handleRandomNames">随机改名</el-button>
                    <span class="hint">未选=全部机器人；已选=仅选中</span>
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

              <el-card shadow="never" class="op-card">
                <div class="op-title">一键随机头像（选文件夹上传随机分配）</div>
                <el-form label-width="90px">
                  <el-form-item label="选择图片">
                    <input ref="bulkDirInput" type="file" webkitdirectory directory multiple accept="image/*" style="display:none" @change="onPickFiles('bulk', $event)" />
                    <input ref="bulkFilesInput" type="file" multiple accept="image/*" style="display:none" @change="onPickFiles('bulk', $event)" />
                    <el-button @click="bulkDirInput.click()">选择文件夹</el-button>
                    <el-button @click="bulkFilesInput.click()">选多张</el-button>
                    <span class="hint" v-if="bulkAvatar.fileList.length">已选 {{ bulkAvatar.fileList.length }} 张</span>
                  </el-form-item>
                  <el-form-item label="分配对象">
                    <el-tag type="info">{{ selectedUserIds.length ? `已选 ${selectedUserIds.length} 个机器人` : '本俱乐部全部机器人' }}</el-tag>
                  </el-form-item>
                  <el-form-item v-if="bulkAvatar.uploading">
                    <el-progress :percentage="bulkAvatarPct" style="width:200px" />
                    <span class="hint">上传中 {{ bulkAvatar.done }}/{{ bulkAvatar.total }}</span>
                  </el-form-item>
                  <el-form-item>
                    <el-button type="primary" :loading="bulkAvatar.uploading" @click="handleBulkAvatars">上传并随机分配</el-button>
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
            <div class="pager">
              <el-pagination
                layout="prev, pager, next, total, sizes"
                :total="memberTotal"
                :page-size="memberQuery.size"
                :current-page="memberQuery.page + 1"
                :page-sizes="[20, 50, 100, 200]"
                @current-change="onMemberPageChange"
                @size-change="(s) => { memberQuery.size = s; memberQuery.page = 0; loadMembers() }"
              />
            </div>
          </el-tab-pane>

          <!-- ===== 围观机器人（造假围观，仅观战不打牌） ===== -->
          <el-tab-pane label="围观机器人" name="viewers">
            <el-alert type="info" :closable="false" style="margin-bottom:12px">
              <template #title>围观机器人只用于造假围观，不参与打牌（独立身份 is_robot=2）。先在此生成围观池，再到「牌桌列表」对某桌点「加围观」。昵称/头像与打牌机器人同一套逻辑。</template>
            </el-alert>
            <div class="ops-row">
              <el-card shadow="never" class="op-card">
                <div class="op-title">一键生成围观机器人</div>
                <el-form label-width="90px">
                  <el-form-item label="数量"><el-input-number v-model="viewerGen.count" :min="1" :max="2000" /></el-form-item>
                  <el-form-item label="昵称长度">
                    <el-input-number v-model="nick.minLen" :min="1" :max="12" />
                    <span style="margin:0 6px">~</span>
                    <el-input-number v-model="nick.maxLen" :min="1" :max="12" />
                    <span class="hint">与打牌机器人共用：随机网名 + 20% 懒人昵称</span>
                  </el-form-item>
                  <el-form-item label="登录密码"><el-input v-model="viewerGen.password" placeholder="123456" style="width:160px" /></el-form-item>
                  <el-divider content-position="left">本地随机头像（可选，给新建围观机器人）</el-divider>
                  <el-form-item label="选择图片">
                    <input ref="vgenDirInput" type="file" webkitdirectory directory multiple accept="image/*" style="display:none" @change="onPickFiles('vgen', $event)" />
                    <input ref="vgenFilesInput" type="file" multiple accept="image/*" style="display:none" @change="onPickFiles('vgen', $event)" />
                    <el-button @click="vgenDirInput.click()">选择文件夹</el-button>
                    <el-button @click="vgenFilesInput.click()">选多张</el-button>
                    <span class="hint" v-if="vgenUpload.fileList.length">已选 {{ vgenUpload.fileList.length }} 张</span>
                  </el-form-item>
                  <el-form-item v-if="vgenUpload.uploading">
                    <el-progress :percentage="vgenUploadPct" style="width:200px" />
                    <span class="hint">上传中 {{ vgenUpload.done }}/{{ vgenUpload.total }}</span>
                  </el-form-item>
                  <el-form-item>
                    <el-button type="primary" :loading="viewerGenLoading" @click="handleGenerateViewers">生成（含上传随机头像）</el-button>
                  </el-form-item>
                </el-form>
              </el-card>

              <el-card shadow="never" class="op-card">
                <div class="op-title">围观机器人：改名 / 换头像</div>
                <el-form label-width="90px">
                  <el-form-item label="操作对象">
                    <el-tag type="info">{{ viewerSelectedIds.length ? `已选 ${viewerSelectedIds.length} 个` : '本俱乐部全部围观机器人' }}</el-tag>
                  </el-form-item>
                  <el-form-item label="一键改名">
                    <el-button :loading="viewerRenameLoading" @click="handleViewerRandomNames">随机改名</el-button>
                  </el-form-item>
                  <el-divider content-position="left">一键随机头像（选本地图片上传随机分配）</el-divider>
                  <el-form-item label="选择图片">
                    <input ref="vbulkDirInput" type="file" webkitdirectory directory multiple accept="image/*" style="display:none" @change="onPickFiles('vbulk', $event)" />
                    <input ref="vbulkFilesInput" type="file" multiple accept="image/*" style="display:none" @change="onPickFiles('vbulk', $event)" />
                    <el-button @click="vbulkDirInput.click()">选择文件夹</el-button>
                    <el-button @click="vbulkFilesInput.click()">选多张</el-button>
                    <span class="hint" v-if="vbulkAvatar.fileList.length">已选 {{ vbulkAvatar.fileList.length }} 张</span>
                  </el-form-item>
                  <el-form-item v-if="vbulkAvatar.uploading">
                    <el-progress :percentage="vbulkAvatarPct" style="width:200px" />
                    <span class="hint">上传中 {{ vbulkAvatar.done }}/{{ vbulkAvatar.total }}</span>
                  </el-form-item>
                  <el-form-item>
                    <el-button type="primary" :loading="vbulkAvatar.uploading" @click="handleViewerBulkAvatars">上传并随机分配</el-button>
                  </el-form-item>
                </el-form>
              </el-card>
            </div>

            <el-table :data="viewers" v-loading="viewerLoading" stripe border height="360" @selection-change="onViewerSelectionChange">
              <el-table-column type="selection" width="44" />
              <el-table-column label="userId" prop="userId" width="90" align="center" />
              <el-table-column label="昵称" prop="nickname" min-width="120" show-overflow-tooltip />
              <el-table-column label="头像" width="90">
                <template #default="{ row }">
                  <el-avatar :size="28" :src="row.avatar"><el-icon><Avatar /></el-icon></el-avatar>
                </template>
              </el-table-column>
              <el-table-column label="身份" width="100" align="center">
                <template #default>
                  <el-tag type="warning" size="small">围观机器人</el-tag>
                </template>
              </el-table-column>
            </el-table>
            <div class="pager">
              <el-pagination
                layout="prev, pager, next, total, sizes"
                :total="viewerTotal"
                :page-size="viewerQuery.size"
                :current-page="viewerQuery.page + 1"
                :page-sizes="[20, 50, 100, 200]"
                @current-change="onViewerPageChange"
                @size-change="(s) => { viewerQuery.size = s; viewerQuery.page = 0; loadViewers() }"
              />
            </div>
          </el-tab-pane>

          <!-- ===== 批量建桌 ===== -->
          <el-tab-pane label="批量建桌" name="batch">
            <el-form :inline="true" :model="batch" label-width="90px">
              <el-form-item label="建桌数量"><el-input-number v-model="batch.tableCount" :min="1" :max="2000" /></el-form-item>
              <el-form-item label="每桌机器人">
                <el-input-number v-model="batch.perTable" :min="5" :max="7" />
                <span class="hint">5~7 个</span>
              </el-form-item>
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
              <el-divider content-position="left">盈利控盘（真人进来时按目标放水/吃分）</el-divider>
              <el-form-item label="开启控盘"><el-switch v-model="batch.profitControlEnabled" /></el-form-item>
              <el-form-item label="目标模式">
                <el-radio-group v-model="batch.profitMode">
                  <el-radio label="rate">放水率</el-radio>
                  <el-radio label="absolute">绝对分</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="放水率" v-if="batch.profitMode === 'rate'">
                <el-input-number v-model="batch.targetProfitRate" :min="-1" :max="1" :step="0.01" :precision="2" />
                <span class="hint">机器人净/下注量，负=放水（-0.05=放水5%）</span>
              </el-form-item>
              <el-form-item label="目标分" v-else>
                <el-input-number v-model="batch.targetProfit" :min="-1000000000" :max="1000000000" :step="1000" />
                <span class="hint">机器人净收益，负=放水</span>
              </el-form-item>
              <el-form-item label="单把上限"><el-input-number v-model="batch.perHandCap" :min="0" :max="1000000000" :step="1000" /><span class="hint">0=自动</span></el-form-item>
              <el-form-item label="纠偏强度"><el-input-number v-model="batch.adjustStrength" :min="0" :max="1" :step="0.1" :precision="1" /></el-form-item>
              <el-form-item>
                <el-button type="primary" :loading="batchLoading" :icon="Plus" @click="handleBatchCreate">批量建桌</el-button>
              </el-form-item>
            </el-form>
            <div class="hint">提示：带入不填则按「底注 × 系统最低带入倍数」。建桌会自动开启本俱乐部压测。</div>
            <div class="hint">注意：每桌必须坐满才建桌，所需机器人数 = 桌数 × 每桌机器人（不够会少建）。上次建桌：{{ lastBatchTip }}</div>
            <el-alert type="info" :closable="false" style="margin-top:8px">
              <template #title><strong>盈利控盘怎么填（建桌时设置；建好后可在「牌桌列表」按桌单独再调）</strong></template>
              <div class="profit-help">
                <p>「目标分」= <b>每桌</b>机器人对真人的最终净收益（单位：分）。<b>负=放水（真人赢）</b>，<b>正=盈利（机器人赢真人）</b>。达标后机器人趋于打平。</p>
                <el-table :data="profitExamples" size="small" border style="margin:8px 0">
                  <el-table-column label="群主今天想要" prop="want" />
                  <el-table-column label="目标模式" prop="mode" width="90" />
                  <el-table-column label="目标分" prop="val" width="100" />
                </el-table>
                <p style="color:#e6a23c"><b>每桌算</b>：开 N 桌则整体≈目标×N。想整体放水 1000、开 5 桌 → 每桌填 <b>-200</b>。只开 1 桌就 -1000。</p>
                <p>「放水率」模式只在按打牌量比例长期放水/抽水时用（-0.05=每100下注放水5）。仅影响「真人+机器人同桌」的房间。</p>
              </div>
            </el-alert>
          </el-tab-pane>

          <!-- ===== 牌桌列表 ===== -->
          <el-tab-pane :label="`牌桌列表 (${tableStat.total || 0})`" name="tables">
            <div class="tab-toolbar">
              <span class="hint">内存中 {{ tableStat.total || 0 }} 桌，机器人托管 {{ tableStat.managedCount || 0 }} 桌</span>
              <el-button :icon="Refresh" :loading="tableLoading" size="small" @click="loadTables">刷新牌桌</el-button>
            </div>
            <el-table :data="tables" v-loading="tableLoading" stripe border height="420">
              <el-table-column label="roomId" prop="roomId" width="90" align="center" />
              <el-table-column label="桌号" prop="tableNo" width="120" />
              <el-table-column label="名称" prop="roomName" min-width="120" show-overflow-tooltip />
              <el-table-column label="状态" width="110">
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
              <el-table-column label="围观(假)" width="100" align="center">
                <template #default="{ row }">
                  <span>{{ row.viewerCount || 0 }}</span>
                  <span class="hint" v-if="row.viewerRobotCount">({{ row.viewerRobotCount }}假)</span>
                </template>
              </el-table-column>
              <el-table-column label="已打手数" prop="currentRound" width="90" align="center" />
              <el-table-column label="底注" prop="baseScore" width="70" align="center" />
              <el-table-column label="控盘" width="70" align="center">
                <template #default="{ row }">
                  <el-tag size="small" :type="row.profit && row.profit.controlled ? 'success' : 'info'">{{ row.profit && row.profit.controlled ? '开' : '关' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="目标/账本(对真人净)" width="150" align="right">
                <template #default="{ row }">
                  <span v-if="row.profit && row.profit.controlled">
                    {{ row.profit.targetNet ?? row.profit.targetProfit ?? 0 }} / {{ row.profit.ledgerNet || 0 }}
                  </span>
                  <span v-else>—</span>
                </template>
              </el-table-column>
              <el-table-column label="完成度" width="110" align="center">
                <template #default="{ row }">
                  <template v-if="row.profit && row.profit.controlled">
                    <el-tag v-if="row.profit.reached" type="success" size="small">已达标</el-tag>
                    <span v-else-if="row.profit.progressPct != null">{{ row.profit.progressPct }}%</span>
                    <span v-else>—</span>
                  </template>
                  <span v-else>—</span>
                </template>
              </el-table-column>
              <el-table-column label="实际率/把数" width="120" align="center">
                <template #default="{ row }">
                  <span v-if="row.profit && row.profit.controlled">{{ (row.profit.actualRate * 100).toFixed(2) }}% / {{ row.profit.handCount || 0 }}</span>
                  <span v-else>—</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="190" align="center" fixed="right">
                <template #default="{ row }">
                  <el-button type="primary" link size="small" @click="openRoomProfit(row)">调控盘</el-button>
                  <el-button type="success" link size="small" @click="openAddViewers(row)">加围观</el-button>
                  <el-button type="info" link size="small" @click="handleClearViewers(row)">清围观</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <!-- ===== 俱乐部配置（持久化，重启不丢） ===== -->
          <el-tab-pane label="俱乐部配置" name="config">
            <el-form :inline="true" :model="config" label-width="110px" class="cfg-form">
              <el-form-item label="活跃起始(时)"><el-input-number v-model="config.activeStartHour" :min="0" :max="23" /></el-form-item>
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
              <el-form-item label="自动补位"><el-switch v-model="config.autoRefill" /></el-form-item>
              <el-form-item label="桌外分自动补">
                <el-switch v-model="config.autoTopUpClubScore" />
                <span class="hint">输完/周期结算后桌外分不足自动补</span>
              </el-form-item>
              <el-form-item label="桌外最低积分">
                <el-input-number v-model="config.minClubScore" :min="0" :max="1000000000" :step="10000" />
                <span class="hint">默认 10000</span>
              </el-form-item>
              <el-form-item label="补带入倍数">
                <el-input-number v-model="config.rebuyMultiplier" :min="0" :max="100000" />
                <span class="hint">机器人输完补带入 = 底注 × 此倍数（默认50）。0=用建桌带入</span>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" :icon="Check" @click="handleSaveConfig">保存俱乐部配置(持久化)</el-button>
              </el-form-item>
            </el-form>
            <div class="hint">该配置按俱乐部保存到数据库，服务重启后自动恢复（房间不恢复）。「本俱乐部压测」开关在右上角。</div>
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </template>

    <!-- 单桌控盘调节 -->
    <el-dialog v-model="roomProfitVisible" title="单桌盈利控盘" width="460px">
      <el-form :model="roomProfit" label-width="90px">
        <el-form-item label="房间">#{{ roomProfit.roomId }}</el-form-item>
        <el-form-item label="开启控盘"><el-switch v-model="roomProfit.enabled" /></el-form-item>
        <el-form-item label="目标模式">
          <el-radio-group v-model="roomProfit.mode">
            <el-radio label="absolute">绝对分</el-radio>
            <el-radio label="rate">放水率</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="目标分" v-if="roomProfit.mode === 'absolute'">
          <el-input-number v-model="roomProfit.targetProfit" :min="-1000000000" :max="1000000000" :step="1000" />
          <span class="hint">负=放水</span>
        </el-form-item>
        <el-form-item label="放水率" v-else>
          <el-input-number v-model="roomProfit.targetProfitRate" :min="-1" :max="1" :step="0.01" :precision="2" />
          <span class="hint">负=放水</span>
        </el-form-item>
        <el-form-item label="单把上限"><el-input-number v-model="roomProfit.perHandCap" :min="0" :max="1000000000" :step="1000" /><span class="hint">0=自动</span></el-form-item>
        <el-form-item label="纠偏强度"><el-input-number v-model="roomProfit.adjustStrength" :min="0" :max="1" :step="0.1" :precision="1" /></el-form-item>
        <el-form-item label="清零账本"><el-switch v-model="roomProfit.resetLedger" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="roomProfitVisible = false">取消</el-button>
        <el-button type="primary" :loading="roomProfitLoading" @click="saveRoomProfit">保存(仅本桌)</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="viewerAddVisible" title="给牌桌加围观机器人" width="420px">
      <el-form :model="viewerAdd" label-width="90px">
        <el-form-item label="房间">#{{ viewerAdd.roomId }} <span class="hint">{{ viewerAdd.tableNo }}</span></el-form-item>
        <el-form-item label="围观数量">
          <el-input-number v-model="viewerAdd.count" :min="1" :max="200" />
          <span class="hint">从本俱乐部围观池挑选(排除在座/已在本房间)</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="viewerAddVisible = false">取消</el-button>
        <el-button type="primary" :loading="viewerAddLoading" @click="confirmAddViewers">确认加围观</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Plus, Check, Search, Upload, Avatar, CircleClose, ArrowLeft } from '@element-plus/icons-vue'
import {
  getRobotStatus, getRobotClubConfig, updateRobotConfig, setRobotEnabled, robotStopAll,
  listRobotClubs, listClubRobotsPaged, generateClubRobots, setRobotFlag,
  robotTopUp, setRobotAvatars, robotBatchCreate, listRobotTables,
  robotRandomAvatars, robotRandomNames, setRobotProfitRoom, uploadAvatar,
  generateClubViewers, listClubViewers, viewerRandomNames, viewerRandomAvatars,
  addRobotViewers, clearRobotViewers
} from '../api'

const loading = ref(false)
const status = reactive({})
// 俱乐部级压测配置（持久化，进入俱乐部时加载）
const config = reactive({
  enabled: false, activeStartHour: 0, activeEndHour: 24, maxHandsPerTable: 0,
  minActionDelayMs: 800, maxActionDelayMs: 2500, autoRefill: true,
  autoTopUpClubScore: true, minClubScore: 10000, rebuyMultiplier: 50
})

// 视图：list=俱乐部列表入口；detail=进入某俱乐部
const view = ref('list')
const activeTab = ref('members')

// 俱乐部列表
const clubList = ref([])
const clubTotal = ref(0)
const clubListLoading = ref(false)
const clubQuery = reactive({ keyword: '', page: 0, size: 20 })

const clubId = ref(null)
const clubInfo = ref(null)

const members = ref([])
const memberLoading = ref(false)
const selectedUserIds = ref([])
const memberQuery = reactive({ page: 0, size: 20 })
const memberTotal = ref(0)

const gen = reactive({ count: 8, namePrefix: '', password: '123456', initScore: 100000, avatar: '' })
const genLoading = ref(false)

// 昵称长度（随机名 + 一键改名共用；含 20% 懒人昵称：数字/字母/emoji）
const nick = reactive({ minLen: 2, maxLen: 5 })

// 创建时：选择本地图片（真实上传后随机分配给新建机器人）
const genUpload = reactive({ fileList: [], uploading: false, done: 0, total: 0 })
const genUploadPct = computed(() => genUpload.total ? Math.round(genUpload.done / genUpload.total * 100) : 0)
const genDirInput = ref(null)
const genFilesInput = ref(null)

// 一键随机头像：选择本地图片（真实上传后随机分配给机器人）
const bulkAvatar = reactive({ fileList: [], uploading: false, done: 0, total: 0 })
const bulkAvatarPct = computed(() => bulkAvatar.total ? Math.round(bulkAvatar.done / bulkAvatar.total * 100) : 0)
const bulkDirInput = ref(null)
const bulkFilesInput = ref(null)

// ===== 围观机器人（造假围观，仅观战不打牌；昵称/头像与打牌机器人同一套逻辑） =====
const viewers = ref([])
const viewerLoading = ref(false)
const viewerTotal = ref(0)
const viewerSelectedIds = ref([])
const viewerQuery = reactive({ page: 0, size: 20 })
const viewerGen = reactive({ count: 20, password: '123456', avatar: '' })
const viewerGenLoading = ref(false)
// 生成围观机器人时选本地图片随机分配
const vgenUpload = reactive({ fileList: [], uploading: false, done: 0, total: 0 })
const vgenUploadPct = computed(() => vgenUpload.total ? Math.round(vgenUpload.done / vgenUpload.total * 100) : 0)
const vgenDirInput = ref(null)
const vgenFilesInput = ref(null)
// 围观机器人一键随机头像
const vbulkAvatar = reactive({ fileList: [], uploading: false, done: 0, total: 0 })
const vbulkAvatarPct = computed(() => vbulkAvatar.total ? Math.round(vbulkAvatar.done / vbulkAvatar.total * 100) : 0)
const vbulkDirInput = ref(null)
const vbulkFilesInput = ref(null)
const viewerRenameLoading = ref(false)
// 牌桌「加围观」弹窗
const viewerAddVisible = ref(false)
const viewerAddLoading = ref(false)
const viewerAdd = reactive({ roomId: null, tableNo: '', count: 8 })

// 选择本地文件夹/多张图片：取出其中的图片文件（不立即上传，点按钮才真实上传）
function onPickFiles(target, e) {
  const files = Array.from(e.target.files || []).filter(f => f.type && f.type.startsWith('image/'))
  const list = files.map(f => ({ raw: f, name: f.name }))
  if (target === 'gen') genUpload.fileList = list
  else if (target === 'vgen') vgenUpload.fileList = list
  else if (target === 'vbulk') vbulkAvatar.fileList = list
  else bulkAvatar.fileList = list
  e.target.value = '' // 允许再次选择同一文件夹
  if (!files.length) ElMessage.warning('未找到图片文件')
  else ElMessage.success(`已选择 ${files.length} 张图片`)
}

// 逐个真实上传本地图片，返回 URL 列表；onTick(done,total) 更新进度
async function uploadFiles(rawFiles, onTick) {
  const urls = []
  for (let i = 0; i < rawFiles.length; i++) {
    try {
      const res = await uploadAvatar(rawFiles[i]) // 头像上传带压缩
      if (res?.data) urls.push(res.data)
    } catch (e) { /* 跳过失败的单张 */ }
    onTick && onTick(i + 1, rawFiles.length)
  }
  return urls
}

const topup = reactive({ amount: 100000, mode: 'add' })
const topupLoading = ref(false)
const renameLoading = ref(false)

const batch = reactive({
  tableCount: 10, perTable: 6, playerCount: 6, baseScore: 10, mangoMax: 5,
  settleTime: 30, commissionRate: 5, bringIn: 0, sanHua: true, diWang: false, noScore: false, dingErHuangFeast: false,
  profitControlEnabled: false, profitMode: 'rate', targetProfit: 0, targetProfitRate: -0.05, perHandCap: 0, adjustStrength: 0.5
})
const batchLoading = ref(false)
const lastBatchTip = ref('—')

// 单桌控盘调节弹窗
const roomProfitVisible = ref(false)
const roomProfitLoading = ref(false)
const roomProfit = reactive({
  roomId: null, enabled: true, mode: 'absolute', targetProfit: -1000, targetProfitRate: -0.05,
  perHandCap: 0, adjustStrength: 0.5, resetLedger: false
})

// 盈利控盘配置示例（给群主看怎么填）
const profitExamples = [
  { want: '放水 1000（真人共赢1000）', mode: '绝对分', val: '-1000' },
  { want: '放水 5000', mode: '绝对分', val: '-5000' },
  { want: '放水 1万', mode: '绝对分', val: '-10000' },
  { want: '盈利 1000（赢真人1000）', mode: '绝对分', val: '+1000' },
  { want: '盈利 5000', mode: '绝对分', val: '+5000' },
  { want: '盈利 1万', mode: '绝对分', val: '+10000' }
]

const tables = ref([])
const tableStat = reactive({})
const tableLoading = ref(false)

async function loadStatus() {
  loading.value = true
  try {
    const res = await getRobotStatus()
    Object.assign(status, res.data || {})
  } finally {
    loading.value = false
  }
}

// 加载某俱乐部的压测配置（持久化）
async function loadClubConfig() {
  if (!clubId.value) return
  try {
    const res = await getRobotClubConfig(clubId.value)
    if (res.code === 200 && res.data) Object.assign(config, res.data)
  } catch (e) { /* ignore */ }
}

// ===== 俱乐部列表 =====
async function loadClubs() {
  clubListLoading.value = true
  try {
    const res = await listRobotClubs({ keyword: clubQuery.keyword || '', page: clubQuery.page, size: clubQuery.size })
    if (res.code === 200) {
      clubList.value = res.data?.list || []
      clubTotal.value = res.data?.total || 0
    }
  } finally {
    clubListLoading.value = false
  }
}

function searchClubs() {
  clubQuery.page = 0
  loadClubs()
}

function onClubPageChange(p) {
  clubQuery.page = p - 1
  loadClubs()
}

function enterClub(row) {
  clubId.value = row.id
  clubInfo.value = row
  view.value = 'detail'
  activeTab.value = 'members'
  memberQuery.page = 0
  loadClubConfig()
  loadMembers()
}

function backToList() {
  view.value = 'list'
  clubId.value = null
  members.value = []
  tables.value = []
  loadClubs()
  loadStatus()
}

async function handleToggleEnabled(val) {
  if (!clubId.value) return
  try {
    await setRobotEnabled(clubId.value, val)
    ElMessage.success(val ? '已开启本俱乐部压测' : '已关闭本俱乐部压测')
    loadClubConfig(); loadStatus()
  } catch (e) { loadClubConfig() }
}

async function handleSaveConfig() {
  if (!clubId.value) { ElMessage.warning('请先进入俱乐部'); return }
  if (config.maxActionDelayMs <= config.minActionDelayMs) {
    ElMessage.warning('最大延时需大于最小延时')
    return
  }
  await updateRobotConfig({ clubId: clubId.value, ...config })
  ElMessage.success('配置已保存(持久化，重启不丢)')
  loadClubConfig(); loadStatus()
}

// 全局停止（解散所有托管房间 + 关闭所有俱乐部开关）
async function handleStopAll() {
  await ElMessageBox.confirm('确认解散【所有】机器人托管房间并关闭所有俱乐部压测？', '提示', { type: 'warning' })
  const res = await robotStopAll()
  ElMessage.success(`已解散 ${res.data?.disbandedRooms ?? 0} 桌`)
  loadStatus()
  if (view.value === 'detail') { loadClubConfig(); loadTables() }
}

// 只停本俱乐部
async function handleStopClub() {
  if (!clubId.value) return
  await ElMessageBox.confirm('确认解散【本俱乐部】机器人托管房间并关闭其压测？', '提示', { type: 'warning' })
  const res = await robotStopAll(clubId.value)
  ElMessage.success(`已解散本俱乐部 ${res.data?.disbandedRooms ?? 0} 桌`)
  loadClubConfig(); loadStatus(); loadTables()
}

async function loadMembers() {
  if (!clubId.value) return
  memberLoading.value = true
  try {
    const res = await listClubRobotsPaged({ clubId: clubId.value, page: memberQuery.page, size: memberQuery.size })
    if (res.code !== 200) {
      members.value = []
      ElMessage.error(res.message || '查询失败')
      return
    }
    members.value = res.data?.members || []
    memberTotal.value = res.data?.total || 0
    // 用详情接口返回的更完整俱乐部信息覆盖列表行（含机器人数）
    if (res.data?.club) clubInfo.value = res.data.club
    loadTables()
  } finally {
    memberLoading.value = false
  }
}

function onMemberPageChange(p) {
  memberQuery.page = p - 1
  loadMembers()
}

function onTabChange(name) {
  if (name === 'viewers') { viewerQuery.page = 0; loadViewers() }
  else if (name === 'tables') loadTables()
}

function onSelectionChange(rows) {
  selectedUserIds.value = rows.map(r => r.userId)
}

async function handleGenerate() {
  if (!clubId.value) { ElMessage.warning('请先选择俱乐部'); return }
  genLoading.value = true
  try {
    // 1) 若选了本地图片，先真实上传拿到 URL（带进度）
    let urls = []
    const raws = genUpload.fileList.map(f => f.raw).filter(Boolean)
    if (raws.length) {
      genUpload.uploading = true; genUpload.total = raws.length; genUpload.done = 0
      urls = await uploadFiles(raws, (d) => { genUpload.done = d })
      genUpload.uploading = false
    }
    // 2) 生成机器人
    const res = await generateClubRobots({
      clubId: clubId.value, count: gen.count, namePrefix: gen.namePrefix,
      password: gen.password, avatar: gen.avatar, initScore: gen.initScore,
      nickMinLen: nick.minLen, nickMaxLen: nick.maxLen
    })
    const ids = res.data?.userIds || []
    // 3) 把上传的图片随机分配给刚创建的机器人
    if (urls.length && ids.length) {
      await robotRandomAvatars({ clubId: clubId.value, urls, userIds: ids })
    }
    ElMessage.success(`生成 ${res.data?.createdUsers ?? 0} 个机器人，入会 ${res.data?.joinedClub ?? 0}` + (urls.length ? `，随机头像 ${urls.length} 张` : ''))
    genUpload.fileList = []
    loadMembers(); loadStatus()
  } finally {
    genUpload.uploading = false
    genLoading.value = false
  }
}

async function handleBulkAvatars() {
  if (!clubId.value) { ElMessage.warning('请先选择俱乐部'); return }
  const raws = bulkAvatar.fileList.map(f => f.raw).filter(Boolean)
  if (!raws.length) { ElMessage.warning('请先选择本地图片'); return }
  bulkAvatar.uploading = true; bulkAvatar.total = raws.length; bulkAvatar.done = 0
  try {
    const urls = await uploadFiles(raws, (d) => { bulkAvatar.done = d })
    if (!urls.length) { ElMessage.error('图片上传失败'); return }
    const res = await robotRandomAvatars({ clubId: clubId.value, urls, userIds: selectedUserIds.value })
    ElMessage.success(`已上传 ${urls.length} 张，随机分配给 ${res.data?.changed ?? 0} 个机器人`)
    bulkAvatar.fileList = []
    loadMembers()
  } finally {
    bulkAvatar.uploading = false
  }
}

async function handleSetFlag(isRobot) {
  if (!clubId.value) return
  const res = await setRobotFlag({ clubId: clubId.value, userIds: selectedUserIds.value, isRobot })
  ElMessage.success(`已${isRobot ? '设为' : '取消'}机器人 ${res.data?.changed ?? 0} 人`)
  loadMembers(); loadStatus()
}

async function handleRandomNames() {
  if (!clubId.value) return
  const scope = selectedUserIds.value.length ? `选中的 ${selectedUserIds.value.length} 个机器人` : '本俱乐部全部机器人'
  try {
    await ElMessageBox.confirm(`确认把${scope}的昵称随机改名？`, '一键随机改名', { type: 'warning' })
  } catch (e) { return }
  renameLoading.value = true
  try {
    const res = await robotRandomNames({ clubId: clubId.value, userIds: selectedUserIds.value, nickMinLen: nick.minLen, nickMaxLen: nick.maxLen })
    ElMessage.success(`已随机改名 ${res.data?.changed ?? 0} 个机器人`)
    loadMembers()
  } finally {
    renameLoading.value = false
  }
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
    const { value } = await ElMessageBox.prompt('输入头像URL', '设置头像', { inputValue: row.avatar || '' })
    await setRobotAvatars({ userIds: [row.userId], avatar: value })
    ElMessage.success('头像已更新')
    loadMembers()
  } catch (e) { /* cancel */ }
}

async function doUpload(option, target) {
  try {
    const res = await uploadAvatar(option.file) // 头像上传带压缩
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
    const scheduled = d.scheduledRobots ?? 0
    lastBatchTip.value = `请求 ${batch.tableCount} 桌(需 ${need} 机器人)，可用机器人 ${avail}，实建 ${created} 桌，已排程入座 ${scheduled} 机器人（30秒~5分钟内陆续入座，坐满才开局）`
    if (created < batch.tableCount) {
      ElMessage.warning(`只建了 ${created}/${batch.tableCount} 桌：可用机器人 ${avail} 个，不够坐满（需 ${need} 个）。请先生成/上分更多机器人。`)
    } else {
      ElMessage.success(`建桌 ${created}，机器人将在 30秒~5分钟内错峰入座，坐满后自动开局`)
    }
    loadStatus(); loadClubConfig(); loadMembers(); loadTables()
    activeTab.value = 'tables'
  } finally {
    batchLoading.value = false
  }
}

function openRoomProfit(row) {
  const p = row.profit || {}
  roomProfit.roomId = row.roomId
  roomProfit.enabled = p.controlled != null ? !!p.controlled : true
  roomProfit.mode = p.mode || 'absolute'
  roomProfit.targetProfit = p.targetProfit != null ? p.targetProfit : -1000
  roomProfit.targetProfitRate = p.targetProfitRate != null ? p.targetProfitRate : -0.05
  roomProfit.perHandCap = p.perHandCap != null ? p.perHandCap : 0
  roomProfit.adjustStrength = p.adjustStrength != null ? p.adjustStrength : 0.5
  roomProfit.resetLedger = false
  roomProfitVisible.value = true
}

async function saveRoomProfit() {
  if (!roomProfit.roomId) return
  roomProfitLoading.value = true
  try {
    await setRobotProfitRoom({ ...roomProfit })
    ElMessage.success('已保存(仅本桌)')
    roomProfitVisible.value = false
    loadTables()
  } finally {
    roomProfitLoading.value = false
  }
}

// ===== 围观机器人 =====
async function loadViewers() {
  if (!clubId.value) return
  viewerLoading.value = true
  try {
    const res = await listClubViewers({ clubId: clubId.value, page: viewerQuery.page, size: viewerQuery.size })
    if (res.code === 200) {
      viewers.value = res.data?.members || []
      viewerTotal.value = res.data?.total || 0
    }
  } finally {
    viewerLoading.value = false
  }
}

function onViewerSelectionChange(rows) {
  viewerSelectedIds.value = rows.map(r => r.userId)
}

function onViewerPageChange(p) {
  viewerQuery.page = p - 1
  loadViewers()
}

async function handleGenerateViewers() {
  if (!clubId.value) { ElMessage.warning('请先选择俱乐部'); return }
  viewerGenLoading.value = true
  try {
    let urls = []
    const raws = vgenUpload.fileList.map(f => f.raw).filter(Boolean)
    if (raws.length) {
      vgenUpload.uploading = true; vgenUpload.total = raws.length; vgenUpload.done = 0
      urls = await uploadFiles(raws, (d) => { vgenUpload.done = d })
      vgenUpload.uploading = false
    }
    const res = await generateClubViewers({
      clubId: clubId.value, count: viewerGen.count, password: viewerGen.password,
      avatar: viewerGen.avatar, nickMinLen: nick.minLen, nickMaxLen: nick.maxLen
    })
    const ids = res.data?.userIds || []
    if (urls.length && ids.length) {
      await viewerRandomAvatars({ clubId: clubId.value, urls, userIds: ids })
    }
    ElMessage.success(`生成 ${res.data?.createdUsers ?? 0} 个围观机器人` + (urls.length ? `，随机头像 ${urls.length} 张` : ''))
    vgenUpload.fileList = []
    loadViewers()
  } finally {
    vgenUpload.uploading = false
    viewerGenLoading.value = false
  }
}

async function handleViewerBulkAvatars() {
  if (!clubId.value) { ElMessage.warning('请先选择俱乐部'); return }
  const raws = vbulkAvatar.fileList.map(f => f.raw).filter(Boolean)
  if (!raws.length) { ElMessage.warning('请先选择本地图片'); return }
  vbulkAvatar.uploading = true; vbulkAvatar.total = raws.length; vbulkAvatar.done = 0
  try {
    const urls = await uploadFiles(raws, (d) => { vbulkAvatar.done = d })
    if (!urls.length) { ElMessage.error('图片上传失败'); return }
    const res = await viewerRandomAvatars({ clubId: clubId.value, urls, userIds: viewerSelectedIds.value })
    ElMessage.success(`已上传 ${urls.length} 张，随机分配给 ${res.data?.changed ?? 0} 个围观机器人`)
    vbulkAvatar.fileList = []
    loadViewers()
  } finally {
    vbulkAvatar.uploading = false
  }
}

async function handleViewerRandomNames() {
  if (!clubId.value) return
  const scope = viewerSelectedIds.value.length ? `选中的 ${viewerSelectedIds.value.length} 个` : '本俱乐部全部围观机器人'
  try {
    await ElMessageBox.confirm(`确认把${scope}的昵称随机改名？`, '一键随机改名', { type: 'warning' })
  } catch (e) { return }
  viewerRenameLoading.value = true
  try {
    const res = await viewerRandomNames({ clubId: clubId.value, userIds: viewerSelectedIds.value, nickMinLen: nick.minLen, nickMaxLen: nick.maxLen })
    ElMessage.success(`已随机改名 ${res.data?.changed ?? 0} 个围观机器人`)
    loadViewers()
  } finally {
    viewerRenameLoading.value = false
  }
}

function openAddViewers(row) {
  viewerAdd.roomId = row.roomId
  viewerAdd.tableNo = row.tableNo
  viewerAdd.count = 8
  viewerAddVisible.value = true
}

async function confirmAddViewers() {
  if (!viewerAdd.roomId) return
  viewerAddLoading.value = true
  try {
    const res = await addRobotViewers({ roomId: viewerAdd.roomId, count: viewerAdd.count })
    ElMessage.success(res.message || `已添加 ${res.data?.added ?? 0} 个围观`)
    viewerAddVisible.value = false
    loadTables()
  } finally {
    viewerAddLoading.value = false
  }
}

async function handleClearViewers(row) {
  try {
    await ElMessageBox.confirm(`确认清除 #${row.roomId} 的围观机器人？(不影响真人观众/座位玩家)`, '清除围观', { type: 'warning' })
  } catch (e) { return }
  const res = await clearRobotViewers({ roomId: row.roomId })
  ElMessage.success(res.message || `已清除 ${res.data?.removed ?? 0} 个围观`)
  loadTables()
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
  loadClubs()
})
</script>

<style scoped>
.robot-page { display: flex; flex-direction: column; gap: 16px; }
.intro .desc-list p { margin: 2px 0; font-size: 13px; }
.page-card { border-radius: 8px; }
.card-header { display: flex; align-items: center; justify-content: space-between; }
.card-header .title { font-weight: 600; }
.card-header .header-actions { display: flex; align-items: center; gap: 8px; }
.detail-title { display: flex; align-items: center; gap: 10px; }
.cfg-form .hint, .hint { color: #909399; font-size: 12px; margin-left: 8px; }
.ops-row { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
.op-card { flex: 1; min-width: 360px; background: #fafafa; }
.op-title { font-weight: 600; margin-bottom: 12px; }
.avatar-cell { display: flex; align-items: center; gap: 6px; }
.warn-text { color: #e6a23c; font-weight: 600; }
.pager { margin-top: 12px; display: flex; justify-content: flex-end; }
.tab-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.profit-help p { margin: 4px 0; font-size: 13px; line-height: 1.6; }
</style>
