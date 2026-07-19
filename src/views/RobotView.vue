<template>
  <div class="robot-page">
    <el-alert type="warning" :closable="false" class="intro">
      <template #title><strong>俱乐部管理（机器人压测 / 俱乐部游戏开关，请谨慎用于线上运营）</strong></template>
      <div class="desc-list">
        <p>• 机器人 = user 表 is_robot=1 的真实俱乐部成员；不破坏现有房间逻辑，独立模块接管「机器人」的操作。</p>
        <p>• 流程：俱乐部列表选一个真实俱乐部 → 进入后按页签管理机器人 / 建桌 / 盈利控盘。</p>
        <p>• 「禁用游戏」开关：打开后该俱乐部新玩家<strong>不能进桌坐下玩游戏</strong>（不影响已经在玩的），用于临时关闭正常游戏功能以测试新功能，完善后手动关掉恢复。</p>
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
        <el-table-column label="禁用游戏" width="150" align="center">
          <template #default="{ row }">
            <el-switch
              v-model="row.gameDisabled"
              active-text="禁止进桌"
              inactive-text="正常"
              inline-prompt
              :loading="row._gdLoading"
              @change="(val) => toggleGameDisabled(row, val)"
            />
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

              <el-card shadow="never" class="op-card">
                <div class="op-title">服务器文件夹一一分配（自己上传到服务器，校验数量）</div>
                <el-form label-width="90px">
                  <el-form-item label="服务器目录">
                    <el-input v-model="folderAssign.path" placeholder="容器路径 如 /opt/header/robot-src/俱乐部A-打牌-1批" style="width:340px" clearable />
                  </el-form-item>
                  <el-form-item>
                    <el-button type="primary" :loading="folderAssign.loading" @click="handleAssignFromFolder(1)">一一分配给打牌机器人</el-button>
                  </el-form-item>
                  <el-form-item>
                    <span class="hint">图片传到宿主 <code>shared/header/robot-src/…</code>，此处填容器路径 <code>/opt/header/robot-src/…</code>；按文件名顺序一一对应到本俱乐部全部打牌机器人；<b>图片数 ≥ 机器人数即可</b>（多余忽略），不足才报错。复制进CDN目录、URL走静态域名(不暴露IP)。</span>
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
              <template #title>围观机器人只用于造假围观，不参与打牌（独立身份 is_robot=2）。先在此生成围观池，再到「牌桌列表」对某桌点「加围观」。昵称/头像与打牌机器人同一套逻辑。「调围观」=围观机器人不变、只随机换昵称+打乱顺序；程序也会每 5 分钟(viewer_adjust_seconds 可配)自动调一次，避免固定不动穿帮。</template>
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
                  <el-divider content-position="left">服务器文件夹一一分配（自己上传到服务器，校验数量）</el-divider>
                  <el-form-item label="服务器目录">
                    <el-input v-model="folderAssign.viewerPath" placeholder="容器路径 如 /opt/header/robot-src/俱乐部A-围观-1批" style="width:340px" clearable />
                  </el-form-item>
                  <el-form-item>
                    <el-button type="primary" :loading="folderAssign.viewerLoading" @click="handleAssignFromFolder(2)">一一分配给围观机器人</el-button>
                    <span class="hint" style="margin-left:8px">图片数 ≥ 围观机器人数即可（多余忽略），按文件名顺序一一对应；URL走静态域名不暴露IP。</span>
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
                <el-input-number v-model="batch.perTable" :min="2" :max="8" />
                <span class="hint">5~7 个</span>
              </el-form-item>
              <el-form-item label="开局人数"><el-input-number v-model="batch.playerCount" :min="2" :max="8" /></el-form-item>
              <el-form-item label="底注"><el-input-number v-model="batch.baseScore" :min="1" :max="100000" /></el-form-item>
              <el-form-item label="芒果封顶"><el-input-number v-model="batch.mangoMax" :min="1" :max="999" /></el-form-item>
              <el-form-item label="结算(分钟)"><el-input-number v-model="batch.settleTime" :min="1" :max="1440" /></el-form-item>
              <el-form-item label="点位"><el-input-number v-model="batch.commissionRate" :min="0" :max="10" /></el-form-item>
              <el-form-item label="带入(可选)">
                <el-input-number v-model="batch.bringIn" :min="0" :max="1000000000" />
                <span class="hint">留空则按「底注×系统最低带入倍数」；填了下面的带入倍数范围时本项被忽略</span>
              </el-form-item>
              <el-form-item label="带入倍数范围">
                <el-input-number v-model="batch.bringInMultiplierMin" :min="1" :max="100000" placeholder="最小倍数" style="width:110px" />
                <span style="margin:0 4px">~</span>
                <el-input-number v-model="batch.bringInMultiplierMax" :min="1" :max="100000" placeholder="最大倍数" style="width:110px" />
                <span style="margin:0 4px">步长</span>
                <el-input-number v-model="batch.bringInMultiplierStep" :min="1" :max="100000" placeholder="步长" style="width:100px" />
                <span class="hint">三项都填才生效：每个机器人坐下各自在[最小,最大]按步长随机抽一个倍数×底注当带入，不再统一一个数字(比如填50/200/50，就在50/100/150/200四个里随机抽)</span>
              </el-form-item>
              <el-form-item label="三花"><el-switch v-model="batch.sanHua" /></el-form-item>
              <el-form-item label="地九王"><el-switch v-model="batch.diWang" /></el-form-item>
              <el-form-item label="丁二皇吃席"><el-switch v-model="batch.dingErHuangFeast" /></el-form-item>
              <el-form-item label="无分模式"><el-switch v-model="batch.noScore" /></el-form-item>
              <el-form-item label="GPS">
                <el-switch v-model="batch.gps" />
                <span class="hint">与真人建桌接口对齐；机器人不搜索定位，对机器人无影响</span>
              </el-form-item>
              <el-form-item label="奖池">
                <el-switch v-model="batch.bonusPool" />
                <span class="hint">开启后本桌参与奖池累积/命中（需全局奖池开关也开启）</span>
              </el-form-item>
              <el-form-item label="排队">
                <el-switch v-model="batch.queue" />
                <span class="hint">本桌坐满后真人进入排队，凑够人自动开新桌</span>
              </el-form-item>
              <el-form-item label="排队人数" v-if="batch.queue">
                <el-input-number v-model="batch.queuePlayerCount" :min="2" :max="8" />
                <span class="hint">凑够该人数自动开新桌；默认=开局人数</span>
              </el-form-item>
              <el-divider content-position="left">拟真：周期结束站起/离桌（不填=用俱乐部默认值）</el-divider>
              <el-form-item label="赢家站起概率">
                <el-input-number v-model="batch.periodWinStandUpProb" :min="0" :max="100" placeholder="默认值" />
                <span class="hint">% 周期结算后本周期净赢的机器人站起离桌</span>
              </el-form-item>
              <el-form-item label="输家站起概率">
                <el-input-number v-model="batch.periodLoseStandUpProb" :min="0" :max="100" placeholder="默认值" />
                <span class="hint">% 周期结算后本周期净输的机器人站起离桌</span>
              </el-form-item>
              <el-form-item label="全机器人赢家比例" v-if="!batch.profitControlEnabled">
                <el-input-number v-model="batch.allRobotWinRatePercent" :min="0" :max="30" placeholder="默认值" />
                <span class="hint">% 本桌全程无真人时，本周期净赢人数占在座机器人比例，上限30%</span>
              </el-form-item>
              <el-form-item label="围观基数倍数">
                <el-input-number v-model="batch.viewerAudienceMultiplierMin" :min="1" :max="50" placeholder="默认" style="width:100px" />
                <span style="margin:0 4px">~</span>
                <el-input-number v-model="batch.viewerAudienceMultiplierMax" :min="1" :max="50" placeholder="默认" style="width:100px" />
                <span class="hint">基础围观基数=开局人数×此倍数(建桌时随机定一次)，叠加小时/节假日/在座人数后得出实时围观目标</span>
              </el-form-item>
              <el-form-item label="封顶倍数(赢/输)">
                <span style="margin-right:4px">赢</span>
                <el-input-number v-model="batch.chipCapMultiplier" :min="0" :max="100000" style="width:130px" @change="onChipCapManuallyEdited" />
                <span style="margin:0 4px 0 12px">输</span>
                <el-input-number v-model="batch.lossCapMultiplier" :min="0" :max="100000" style="width:130px" @change="onLossCapManuallyEdited" />
                <el-button v-if="chipCapAutoFilled || lossCapAutoFilled" size="small" text type="primary" style="margin-left:6px">已按带入范围自动算出</el-button>
                <span class="hint"><b>赢(筹码封顶)</b>：机器人筹码 &gt; 底注×此倍数时强制站起落袋，防止一直被判定"应赢"又不下桌筹码无限滚雪球(实测有滚到231万的)。
                  <b>输(亏损封顶)</b>：本次入座<b>累计净亏</b>(累计带入-当前筹码) ≥ 底注×此倍数时强制站起换人——没有它输家只在"筹码打空"那一刻才可能换人，
                  慢慢输、每次没输光就补带入的机器人会从头坐到尾越亏越多(实测一桌137局3个机器人各打88~112手，净亏滚到-8.6万~-12.4万)。
                  <b>两个都不建议留0</b>；填了上面的带入倍数范围会<b>自动算出建议值(都=带入倍数上限×2</b>，按步长取整，即"赢/输到最大带入的两倍就换人")，也可以各自手动改。
                  后端兜底：赢的生效封顶不低于本人带入×1.2。不填=用俱乐部默认值</span>
              </el-form-item>
              <el-form-item label="房间最低机器人数">
                <el-input-number v-model="batch.minSeatedRobots" :min="0" :max="8" placeholder="默认值" />
                <span class="hint">在座机器人不得低于此数：概率类站起会被拦下，低于时补位加急(不等错峰、跳过观望)。桌上只剩2~3个机器人时"赢家比例"退化成每把指定唯一赢家，观感=一个人一直赢，建议≥4。不填=用俱乐部默认值</span>
              </el-form-item>
              <el-form-item label="满座围观人数">
                <el-input-number v-model="batch.viewerSeatFullCount" :min="0" :max="10000" placeholder="默认值" />
                <span class="hint">本桌覆盖俱乐部的"满座围观人数"：坐满(=开局人数)时该组件等于此值，在座减少按 e 曲线快速衰减到 0；最终围观目标=50%×原有算法+50%×此组件。不填=用俱乐部默认值；填0=本桌明确关闭该组件</span>
              </el-form-item>
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
              <el-table-column label="操作" width="330" align="center" fixed="right">
                <template #default="{ row }">
                  <el-button type="danger" link size="small" @click="openRoomParams(row)">查看参数</el-button>
                  <el-button type="primary" link size="small" @click="openRoomProfit(row)">调控盘</el-button>
                  <el-button type="success" link size="small" @click="openAddViewers(row)">加围观</el-button>
                  <el-button type="warning" link size="small" @click="handleAdjustViewers(row)">调围观</el-button>
                  <el-button type="info" link size="small" @click="handleClearViewers(row)">清围观</el-button>
                  <el-button type="info" link size="small" @click="handleCleanPhantomViewers(row)">清幽灵观众</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <!-- ===== 俱乐部配置（持久化，重启不丢） ===== -->
          <el-tab-pane label="俱乐部配置" name="config">
            <el-alert type="warning" show-icon :closable="false" style="margin-bottom:12px">
              <template #title>
                <b>输赢比例调控说明（2026-07-17~18 为解决"一段时间一个人赢"所做的改动）</b>
              </template>
              图例：<el-tag size="small" type="danger" effect="dark">新增</el-tag> 这轮新加的参数
              <el-tag size="small" type="warning" effect="dark" style="margin-left:6px">已调整</el-tag> 参数还在但背后机制变了
              <el-tag size="small" effect="dark" style="margin-left:6px">受守门约束</el-tag> 原有参数，现在会被"房间最低机器人数"拦截。<br/>
              另有几处<b>写死在代码里、不可配置</b>的机制（ProfitControlService/RobotEngine）：
              ① 全机器人桌"应赢家"改为<b>每把重抽</b>（不再维护跨手数名单，杜绝同一人被连续照顾）；
              ② 每把仅 <b>40%</b> 概率真正接管发强牌，其余交回自然牌力；
              ③ 在座机器人 <b>&lt;4 人的小桌完全不接管</b>（小桌上比例会退化成"每把指定唯一赢家"）；
              ④ 应输家单把喂池上限=底注×15~40（不再无限跟注把整个带入喂给赢家）；
              ⑤ 封顶生效线=max(配置封顶, 本人带入×1.2)（防止带入高于封顶的机器人一坐下就被踢）；
              ⑥ 概率类站起在<b>执行时刻</b>会复查最低人数（防止全桌同时结算批量站起击穿下限）。
            </el-alert>
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
              <el-form-item label="输完换人">
                <el-switch v-model="config.swapOnLoseEnabled" />
                <el-tag size="small" effect="dark" style="margin-left:6px">受守门约束</el-tag>
                <span class="hint">机器人输完按概率不补带入、改为站起换上其他机器人，避免在座总是同几个（纯机器人/有真人都生效）。<b>为什么标记</b>：换人=先站起再补位，中间有空窗，站起后在座会跌破"房间最低机器人数"时本次换人被拦、改为补带入留下（判定时+执行时各查一次）</span>
              </el-form-item>
              <el-form-item label="换人概率(%)">
                <el-input-number v-model="config.swapOnLoseProb" :min="0" :max="100" :disabled="!config.swapOnLoseEnabled" />
                <span class="hint">0~100，命中则换人、未命中则照常补带入（默认30）</span>
              </el-form-item>
              <el-form-item label="拆牌错峰(ms)">
                <el-input-number v-model="config.splitMinDelayMs" :min="0" :max="10000" :step="100" />
                <span style="margin:0 6px">~</span>
                <el-input-number v-model="config.splitMaxDelayMs" :min="0" :max="10000" :step="100" />
                <span class="hint">机器人逐个拆牌、相邻随机滞后此区间（默认100~1500ms），不再同时拆；累计封顶=拆牌超时-3秒</span>
              </el-form-item>
              <el-form-item label="赢家站起概率(%)">
                <el-input-number v-model="config.periodWinStandUpProb" :min="0" :max="100" />
                <el-tag size="small" effect="dark" style="margin-left:6px">受守门约束</el-tag>
                <span class="hint">默认40。建桌时没单独设置就用这个（批量建桌页可按桌覆盖）。<b>为什么标记</b>：周期结算是全桌同时判定的，此前会出现"3个人同时通过检查一起站起、桌上瞬间掉到2~3人"；现在站起会跌破"房间最低机器人数"时被拦、改为补带入留下（判定时+执行时各查一次）</span>
              </el-form-item>
              <el-form-item label="输家站起概率(%)">
                <el-input-number v-model="config.periodLoseStandUpProb" :min="0" :max="100" />
                <el-tag size="small" effect="dark" style="margin-left:6px">受守门约束</el-tag>
                <span class="hint">默认30。建桌时没单独设置就用这个（批量建桌页可按桌覆盖）。<b>为什么标记</b>：同"赢家站起概率"，会跌破最低机器人数时本次站起被拦</span>
              </el-form-item>
              <el-form-item label="全机器人赢家比例(%)">
                <el-input-number v-model="config.allRobotWinRatePercent" :min="0" :max="30" />
                <el-tag size="small" type="warning" effect="dark" style="margin-left:6px">已调整</el-tag>
                <span class="hint">默认20，上限30。仅本桌全程无真人时生效；建桌时没单独设置就用这个。<b>为什么标记</b>：参数含义没变，但背后机制从"维护N手赢家名单"改成<b>每把重抽</b>——原来名单存续期内同一人每把必赢(还叠加一个名单几十手不刷新的bug)，正是"一段时间一个人赢"的根因；现在每把按此比例现场抽赢家、打完即弃，且每把只有40%概率真正接管、在座&lt;4人的小桌完全不接管(写死在代码里)</span>
              </el-form-item>
              <el-form-item label="封顶倍数(赢/输)">
                <span style="margin-right:4px">赢</span>
                <el-input-number v-model="config.chipCapMultiplier" :min="0" :max="100000" style="width:130px" />
                <span style="margin:0 4px 0 12px">输</span>
                <el-input-number v-model="config.lossCapMultiplier" :min="0" :max="100000" style="width:130px" />
                <el-tag size="small" type="danger" effect="dark" style="margin-left:6px">输侧新增</el-tag>
                <span class="hint">默认都是0=不启用，建桌时没单独设置就用这里的值，建议都配300~500。
                  <b>赢(筹码封顶)</b>：机器人筹码 &gt; 底注×此倍数时强制站起落袋，是压"一个人赢很多"观感的直接旋钮(生效线=max(此配置,本人带入×1.2)，不会一坐下就被踢)。
                  <b>输(亏损封顶)</b>：本次入座<b>累计净亏</b>(累计带入-当前筹码) ≥ 底注×此倍数时强制站起换人，防止同一机器人反复补带入越输越多、战绩榜挂着几个大负数。
                  另外注意：<b>"输完换人概率"配0等于永远不换</b>，输家只会无限补带入，建议同时把它调到30~50</span>
              </el-form-item>
              <el-form-item label="房间最低机器人数">
                <el-input-number v-model="config.minSeatedRobots" :min="0" :max="8" />
                <el-tag size="small" type="danger" effect="dark" style="margin-left:6px">新增</el-tag>
                <span class="hint">默认0=不启用。在座机器人不得低于此数：概率类站起(周期结算/输完换人/让座散场)会被拦下，低于时补位加急(不等错峰、跳过观望)。<b>为什么新增</b>：桌上只剩2~3个机器人时"赢家比例30%"四舍五入永远只能指定1个赢家(2人桌=每把50%概率指定你赢)，观感必然是"一个人一直赢"；只有把桌养到≥4人，比例控制才有意义。建议≥4且比"每桌坐人数"小1~2；建桌时没单独设置就用这个</span>
              </el-form-item>
              <el-form-item label="围观时段曲线">
                <el-switch v-model="config.viewerCurveEnabled" />
                <span class="hint">开启后围观目标按24小时曲线波动(凌晨低/晚8-9点峰值)；关闭则小时系数固定100%，但"基础基数+在座人数"仍生效</span>
              </el-form-item>
              <el-form-item label="围观基数倍数(默认)">
                <el-input-number v-model="config.viewerAudienceMultiplierMin" :min="1" :max="50" style="width:100px" />
                <span style="margin:0 4px">~</span>
                <el-input-number v-model="config.viewerAudienceMultiplierMax" :min="1" :max="50" style="width:100px" />
                <span class="hint">默认3~5倍。基础围观基数=开局人数×此倍数，建桌时没单独设置就用这个范围随机取一个倍数</span>
              </el-form-item>
              <el-form-item label="围观自然流动">
                <el-switch v-model="config.viewerFlowEnabled" />
                <span class="hint">开启后已达标的围观人数每5~15分钟随机换1人(出一个进一个)，看起来更"活"</span>
              </el-form-item>
              <el-form-item label="满座围观人数">
                <el-input-number v-model="config.viewerSeatFullCount" :min="0" :max="10000" :disabled="config.viewerSeatBandEnabled" />
                <span class="hint">旧算法组件（下面"围观档位模式"开启时<b>不生效</b>）。坐满时该组件等于此值，在座减少按 e 曲线衰减，占目标50%</span>
              </el-form-item>

              <el-divider content-position="left">在座/围观 拟真调度（2026-07-19 产品需求）</el-divider>

              <el-form-item label="在座人数曲线">
                <el-switch v-model="config.seatedCurveEnabled" />
                <el-tag size="small" type="danger" effect="dark" style="margin-left:6px">新增</el-tag>
                <span class="hint">开启后每张机器人桌的在座人数按下面的24小时表维持（多退少补：超了逐个站起、少了加急补位；
                  该表优先于"每桌坐多少/房间最低机器人数"）。<b>档位=8(满座)时自动启用"留座给真人"</b>：
                  每3~5分钟站起1个机器人留出空位1~2分钟，真人没进来就自动回补，最多同时留3个；非满座档没有留真人逻辑</span>
              </el-form-item>
              <el-form-item label="24小时在座表">
                <el-input v-model="config.seatedCurveJson" style="width:520px"
                          placeholder="留空=内置默认 全天满座 [8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8]" />
                <span class="hint">JSON数组24项，下标=小时(0~23点)，每项2~8。<b>内置默认已改为全天满座8人</b>（时段起伏改由下面"满座围观24小时表"体现）。
                  保存时校验格式，清空则回到内置默认</span>
              </el-form-item>
              <el-form-item label="围观档位模式">
                <el-switch v-model="config.viewerSeatBandEnabled" />
                <el-tag size="small" type="danger" effect="dark" style="margin-left:6px">新增·默认开</el-tag>
                <span class="hint">开启后围观人数只由<b>在座人数</b>定档：在座&lt;5 无人围观；5人→2~3个；6人→3~5个；7人→6~7个；8人→7~10个。
                  每30~60秒流动一次(<b>先进先出</b>：最早进来的围观离开、新人进来，总数在档位内)。
                  开启时上面的"围观基础基数/时段曲线/满座围观人数"旧算法全部不参与；关闭则回到旧算法</span>
              </el-form-item>
              <el-form-item label="满座围观24小时表">
                <el-input v-model="config.viewerFullHourJson" style="width:520px" :disabled="!config.viewerSeatBandEnabled"
                          placeholder="留空=满座沿用档位默认7~10，示例 [30,20,15,10,8,8,10,15,20,25,30,35,40,40,45,50,55,60,70,80,90,90,80,50]" />
                <el-tag size="small" type="danger" effect="dark" style="margin-left:6px">新增</el-tag>
                <span class="hint">JSON数组24项，下标=小时(0~23点)，每项0~500。<b>只在坐满8人后生效</b>：该小时的围观人数以表里的值为目标
                  (渐进增减到位，到位后每<b>30秒</b>先进先出流动1人)。在座&lt;8 时仍走上面的固定档位，不受此表影响。
                  留空=满座沿用7~10档位。需要"围观档位模式"开启</span>
              </el-form-item>

              <el-divider content-position="left">辅助参数</el-divider>

              <el-form-item label="机器人送礼">
                <el-switch v-model="config.giftEnabled" />
                <span class="hint">开启后机器人会在恭喜赢家/安慰输家(真人或机器人皆可)等场景随机送礼物</span>
              </el-form-item>
              <el-form-item label="送礼频控(次/桌/时)">
                <el-input-number v-model="config.giftMaxPerHour" :min="0" :max="1000" :disabled="!config.giftEnabled" />
                <span class="hint">默认6，每桌每小时送礼次数上限，下面4个场景概率共用这一个频控</span>
              </el-form-item>
              <el-form-item label="恭喜大牌赢家(%)">
                <el-input-number v-model="config.giftCongratsProb" :min="0" :max="100" :disabled="!config.giftEnabled" />
                <span class="hint">默认25。真人摸到大牌并赢钱时，随机机器人恭喜的概率</span>
              </el-form-item>
              <el-form-item label="真人赢钱拉氛围(%)">
                <el-input-number v-model="config.giftAtmosphereProb" :min="0" :max="100" :disabled="!config.giftEnabled" />
                <span class="hint">默认15。真人赢钱(未到大牌线)，随机机器人送礼拉氛围的概率</span>
              </el-form-item>
              <el-form-item label="安慰输家(%)">
                <el-input-number v-model="config.giftComfortProb" :min="0" :max="100" :disabled="!config.giftEnabled" />
                <span class="hint">默认15。真人或机器人净输达到"安慰线"时，随机在座机器人送礼安慰(纯机器人桌也生效)</span>
              </el-form-item>
              <el-form-item label="自己赢大把撒礼(%)">
                <el-input-number v-model="config.giftSelfSplashProb" :min="0" :max="100" :disabled="!config.giftEnabled" />
                <span class="hint">默认10。机器人自己净赢达到"大赢线"时，对全场撒礼物的概率</span>
              </el-form-item>
              <el-form-item label="大赢/安慰线(倍底分)">
                <el-input-number v-model="config.giftBigWinMultiplier" :min="1" :max="1000" style="width:100px" :disabled="!config.giftEnabled" />
                <span style="margin:0 4px">/</span>
                <el-input-number v-model="config.giftBigLoseMultiplier" :min="1" :max="1000" style="width:100px" :disabled="!config.giftEnabled" />
                <span class="hint">默认30/15。净赢≥底分×前者才算"大赢家"(可被恭喜/自己撒礼)；净输≥底分×后者才会被安慰</span>
              </el-form-item>
              <el-form-item label="坐下前观望">
                <el-switch v-model="config.watchBeforeSitEnabled" />
                <span class="hint">机器人补位时先以观众身份观望一段时间再坐下，而非立即入座</span>
              </el-form-item>
              <el-form-item label="观望时长(秒)">
                <el-input-number v-model="config.watchMinSec" :min="0" :max="3600" :disabled="!config.watchBeforeSitEnabled" />
                <span style="margin:0 6px">~</span>
                <el-input-number v-model="config.watchMaxSec" :min="0" :max="3600" :disabled="!config.watchBeforeSitEnabled" />
                <span class="hint">默认60~180秒</span>
              </el-form-item>
              <el-form-item label="站起后留观概率(%)">
                <el-input-number v-model="config.stayAfterStandProb" :min="0" :max="100" />
                <span class="hint">默认40。机器人站起后按此概率先留在观众列表一会再离房，而非立即消失</span>
              </el-form-item>
              <el-form-item label="补位相邻间隔(秒)">
                <el-input-number v-model="config.refillIntervalMinSec" :min="0" :max="3600" />
                <span style="margin:0 6px">~</span>
                <el-input-number v-model="config.refillIntervalMaxSec" :min="0" :max="3600" />
                <span class="hint">默认60~120秒。多个机器人补位时错峰间隔，避免同时涌入</span>
              </el-form-item>
              <el-form-item label="补带入延时(秒)">
                <el-input-number v-model="config.rebuyDelayMinSec" :min="0" :max="600" />
                <span style="margin:0 6px">~</span>
                <el-input-number v-model="config.rebuyDelayMaxSec" :min="0" :max="600" />
                <el-tag size="small" type="warning" effect="dark" style="margin-left:6px">受保护窗口约束</el-tag>
                <span class="hint">默认3~15秒。筹码不足/周期结算后补带入前的随机延时，避免同一时刻集体补充。
                  <b>注意：系统配置的"筹码不足保护窗口"当前为 {{ config.insufficientChipsProtectSeconds ?? 10 }} 秒</b>——
                  筹码打空的机器人只有这么长时间可以补带入，延时抽到超过窗口就会补带入失败、被按"筹码不足"硬站起
                  （一把大池同时打空几个机器人时就是"全桌一起站起"的观感，2026-07-19 修复）。
                  上限建议 ≤ {{ Math.max(1, (config.insufficientChipsProtectSeconds ?? 10) - 3) }} 秒；
                  配超了后端也会自动压到"窗口−2.5秒"，不会再误伤，但配置上对齐更直观</span>
              </el-form-item>
              <el-form-item label="首行动人额外延时">
                <el-switch v-model="config.firstActorExtraDelay" />
                <span class="hint">本手/本轮第一个行动的机器人多想一会，更像真人</span>
              </el-form-item>
              <el-form-item label="桌面构成站起规则">
                <el-switch v-model="config.standupRulesEnabled" />
                <span class="hint">开启后按"满桌让座/真人走散场/独坐超时"等规则自动触发机器人站起</span>
              </el-form-item>

              <el-form-item>
                <el-button type="primary" :icon="Check" @click="handleSaveConfig">保存俱乐部配置(持久化)</el-button>
              </el-form-item>
            </el-form>
            <div class="hint">该配置按俱乐部保存到数据库，服务重启后自动恢复（房间不恢复）。「本俱乐部压测」开关在右上角。</div>
          </el-tab-pane>

          <!-- ===== 节假日日历（全局配置，影响所有俱乐部的机器人围观日期系数，非本俱乐部专属） ===== -->
          <el-tab-pane label="节假日日历" name="holidayCal">
            <div class="hint" style="margin-bottom:10px">
              机器人围观目标人数 = 基础基数 × 小时系数 × <b>日期系数</b> × 在座热度系数；日期系数优先级：法定节假日 &gt; 周六日 &gt; 平日(固定100%)。
              <b>这里是全局配置，保存后对所有俱乐部生效</b>，不是本俱乐部单独的设置。点日历格子可直接切换该天"是否设为法定节假日"。
            </div>
            <el-form :inline="true" size="small" style="margin-bottom:6px">
              <el-form-item label="周末系数(%)">
                <el-input-number v-model="holidayCal.weekendCoefficient" :min="50" :max="300" style="width:120px" @change="handleSaveHolidayCalendar" />
              </el-form-item>
              <el-form-item label="节假日系数(%)">
                <el-input-number v-model="holidayCal.holidayCoefficient" :min="50" :max="300" style="width:120px" @change="handleSaveHolidayCalendar" />
              </el-form-item>
              <el-form-item label="今日生效系数">
                <el-tag type="success">{{ holidayCal.todayCoefficient }}%</el-tag>
              </el-form-item>
              <el-form-item>
                <el-button :icon="Refresh" :loading="holidayCal.loading" @click="loadHolidayCalendar">刷新</el-button>
                <el-button type="primary" :loading="holidayCal.saving" @click="handleSaveHolidayCalendar">保存系数</el-button>
              </el-form-item>
            </el-form>
            <el-calendar v-model="holidayCal.currentDate">
              <template #date-cell="{ data }">
                <div class="holiday-cal-cell" :class="holidayCalCellClass(data.day)" @click="toggleHolidayDate(data.day)">
                  <div class="holiday-cal-day">{{ Number(data.day.split('-')[2]) }}</div>
                  <el-tag v-if="isHolidayDate(data.day)" type="danger" size="small" effect="dark">节假日 {{ holidayCal.holidayCoefficient }}%</el-tag>
                  <el-tag v-else-if="isWeekendDate(data.day)" type="warning" size="small">周末 {{ holidayCal.weekendCoefficient }}%</el-tag>
                  <span v-else class="hint" style="font-size:11px">平日 100%</span>
                </div>
              </template>
            </el-calendar>
            <div class="hint" style="margin-top:8px">
              已设法定节假日({{ holidayCal.dates.length }}天)：{{ holidayCal.dates.slice().sort().join('、') || '无' }}
            </div>
          </el-tab-pane>

          <!-- ===== 输赢汇总（本俱乐部：结果·覆盖累计 + 对账过程可清理） ===== -->
          <el-tab-pane label="输赢汇总" name="profit">
            <div class="tab-toolbar">
              <span class="op-title" style="margin:0">本俱乐部 群主对真人 输赢（结果 · 覆盖累计，持久化，解散改桌不丢）</span>
              <div>
                <el-button :icon="Refresh" :loading="profit.loading" @click="loadClubProfit">刷新</el-button>
                <el-button type="warning" plain @click="handleClearClubHistory">清理本俱乐部对账过程</el-button>
              </div>
            </div>
            <el-descriptions :column="4" border size="small">
              <el-descriptions-item label="群主对真人净">
                <span :class="netClass(profit.club.robotNet)">{{ fmtNet(profit.club.robotNet) }}</span>
                <span class="hint">正=赢真人(吃分)·负=放水</span>
              </el-descriptions-item>
              <el-descriptions-item label="真人净">{{ fmtNet(profit.club.realNet) }}</el-descriptions-item>
              <el-descriptions-item label="累计把数">{{ profit.club.hands || 0 }}</el-descriptions-item>
              <el-descriptions-item label="最近时间">{{ profit.club.lastTime || '—' }}</el-descriptions-item>
            </el-descriptions>
            <div class="hint" style="margin:6px 0">结果=每把累加的权威口径，<b>不依赖</b>逐把过程；下方「对账过程」仅供核对、可随时清理，清理不影响上面的结果。</div>

            <div class="op-title" style="margin-top:12px">按桌明细（每个房间实例一行；解散/改桌的旧桌也保留；来自对账过程）</div>
            <el-table :data="profit.tables" v-loading="profit.tablesLoading" stripe border size="small" max-height="240"
                      highlight-current-row @current-change="onPickProfitTable">
              <el-table-column label="桌号" prop="tableNo" width="90" />
              <el-table-column label="房间" prop="roomId" width="90" align="center" />
              <el-table-column label="状态" width="80" align="center">
                <template #default="{ row }"><el-tag size="small" :type="row.live ? 'success' : 'info'">{{ row.live ? '进行中' : '已结束' }}</el-tag></template>
              </el-table-column>
              <el-table-column label="该桌群主净" width="120" align="right">
                <template #default="{ row }"><span :class="netClass(row.robotNet)">{{ fmtNet(row.robotNet) }}</span></template>
              </el-table-column>
              <el-table-column label="目标净" width="110" align="right">
                <template #default="{ row }">{{ row.targetNet == null ? '—' : fmtNet(row.targetNet) }}</template>
              </el-table-column>
              <el-table-column label="把数" prop="hands" width="70" align="center" />
              <el-table-column label="最近时间" prop="lastTime" width="150" align="center" />
              <el-table-column label="操作" width="140" align="center" fixed="right">
                <template #default="{ row }">
                  <el-button size="small" @click="onPickProfitTable(row)">逐把</el-button>
                  <el-button size="small" type="warning" plain @click="handleClearTableHistory(row)">清过程</el-button>
                </template>
              </el-table-column>
            </el-table>

            <div class="op-title" style="margin-top:12px">
              逐把历史 {{ profit.history.roomId ? ('· 桌 ' + (profit.history.tableNo || profit.history.roomId)) : '· 本俱乐部全部' }}
              <el-button size="small" link type="primary" @click="loadProfitHistory(null)">看全部</el-button>
            </div>
            <el-table :data="profit.history.rows" v-loading="profit.history.loading" stripe border size="small" max-height="320">
              <el-table-column label="时间" prop="time" width="150" />
              <el-table-column label="桌号" prop="tableNo" width="80" />
              <el-table-column label="第几手" prop="handNo" width="70" align="center" />
              <el-table-column label="真人净" width="100" align="right"><template #default="{ row }">{{ fmtNet(row.realNet) }}</template></el-table-column>
              <el-table-column label="群主净(本把)" width="120" align="right"><template #default="{ row }"><span :class="netClass(row.robotNet)">{{ fmtNet(row.robotNet) }}</span></template></el-table-column>
              <el-table-column label="该桌累计" width="110" align="right"><template #default="{ row }"><span :class="netClass(row.ledgerNet)">{{ fmtNet(row.ledgerNet) }}</span></template></el-table-column>
              <el-table-column label="目标" width="100" align="right"><template #default="{ row }">{{ row.targetNet == null ? '—' : fmtNet(row.targetNet) }}</template></el-table-column>
              <el-table-column label="真人/机器" width="90" align="center"><template #default="{ row }">{{ row.realCount }}/{{ row.robotCount }}</template></el-table-column>
              <el-table-column label="控盘" width="64" align="center"><template #default="{ row }"><el-tag size="small" :type="row.controlled ? 'warning' : 'info'">{{ row.controlled ? '开' : '关' }}</el-tag></template></el-table-column>
            </el-table>
            <div class="pager">
              <el-pagination layout="prev, pager, next, total" :total="profit.history.total"
                :page-size="profit.history.size" :current-page="profit.history.page + 1"
                @current-change="onProfitHistoryPage" />
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </template>

    <!-- 查看某桌实际生效的机器人拟真参数（建房覆盖 + 俱乐部默认），配合日志核实是否生效 -->
    <el-dialog v-model="roomParamsVisible" title="本桌实际生效的机器人参数" width="560px">
      <div class="hint" style="margin-bottom:10px">roomId={{ roomParamsData.roomId }}，桌号 {{ roomParamsData.tableNo }}。"建房覆盖" = 批量建桌时单独填过；"俱乐部默认" = 没单独填、回退俱乐部配置页的值。</div>
      <el-table :data="roomParamsData.params" v-loading="roomParamsLoading" size="small" border>
        <el-table-column label="参数" prop="name" min-width="180" />
        <el-table-column label="当前生效值" prop="effective" min-width="140">
          <template #default="{ row }">
            <span v-if="typeof row.effective === 'boolean'">{{ row.effective ? '是' : '否' }}</span>
            <span v-else>{{ row.effective }}</span>
          </template>
        </el-table-column>
        <el-table-column label="来源" width="110" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.source === '建房覆盖' ? 'success' : 'info'">{{ row.source }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="roomParamsVisible = false">关闭</el-button>
        <el-button type="primary" :icon="Refresh" @click="openRoomParams(roomParamsData)">刷新</el-button>
      </template>
    </el-dialog>

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
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Plus, Check, Search, Upload, Avatar, CircleClose, ArrowLeft } from '@element-plus/icons-vue'
import {
  getRobotStatus, getRobotClubConfig, updateRobotConfig, setRobotEnabled, robotStopAll,
  listRobotClubs, listClubRobotsPaged, generateClubRobots, setRobotFlag,
  robotTopUp, setRobotAvatars, robotBatchCreate, listRobotTables,
  robotRandomAvatars, robotRandomNames, setRobotProfitRoom, uploadAvatar,
  generateClubViewers, listClubViewers, viewerRandomNames, viewerRandomAvatars,
  addRobotViewers, clearRobotViewers, cleanPhantomRobotViewers, adjustRobotViewers, assignAvatarsFromFolder,
  getClubProfit, getProfitTables, getProfitHistory, clearProfitHistory,
  setClubGameDisabled, getRobotRoomParams,
  getHolidayViewerConfig, setHolidayViewerConfig
} from '../api'

const loading = ref(false)
const status = reactive({})
// 俱乐部级压测配置（持久化，进入俱乐部时加载）
const config = reactive({
  enabled: false, activeStartHour: 0, activeEndHour: 24, maxHandsPerTable: 0,
  minActionDelayMs: 800, maxActionDelayMs: 2500, autoRefill: true,
  autoTopUpClubScore: true, minClubScore: 10000, rebuyMultiplier: 50,
  swapOnLoseEnabled: false, swapOnLoseProb: 30,
  splitMinDelayMs: 100, splitMaxDelayMs: 1500,
  periodWinStandUpProb: 40, periodLoseStandUpProb: 30, allRobotWinRatePercent: 20, chipCapMultiplier: 0, lossCapMultiplier: 0, minSeatedRobots: 0,
  viewerCurveEnabled: false, viewerAudienceMultiplierMin: 3, viewerAudienceMultiplierMax: 5,
  viewerFlowEnabled: true, viewerSeatFullCount: 0,
  seatedCurveEnabled: false, seatedCurveJson: '', viewerSeatBandEnabled: true, viewerFullHourJson: '',
  giftEnabled: false, giftMaxPerHour: 6,
  giftCongratsProb: 25, giftAtmosphereProb: 15, giftComfortProb: 15, giftSelfSplashProb: 10,
  giftBigWinMultiplier: 30, giftBigLoseMultiplier: 15,
  watchBeforeSitEnabled: true, watchMinSec: 60, watchMaxSec: 180,
  insufficientChipsProtectSeconds: 10, // 只读展示：系统配置的筹码不足保护窗口(秒)，读接口带出
  stayAfterStandProb: 40,
  refillIntervalMinSec: 60, refillIntervalMaxSec: 120,
  rebuyDelayMinSec: 3, rebuyDelayMaxSec: 15,
  firstActorExtraDelay: true, standupRulesEnabled: true
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
const folderAssign = reactive({ path: '', loading: false, viewerPath: '', viewerLoading: false })

// 本俱乐部 群主对真人输赢：结果(覆盖累计) + 按桌/逐把过程(可清理)
const profit = reactive({
  loading: false,
  club: {},                 // 本俱乐部结果台账
  tables: [], tablesLoading: false,
  history: { rows: [], total: 0, page: 0, size: 30, roomId: null, tableNo: null, loading: false }
})

function fmtNet(n) {
  const v = Number(n || 0)
  return (v > 0 ? '+' : '') + v.toLocaleString()
}
function netClass(n) {
  const v = Number(n || 0)
  return v > 0 ? 'net-win' : (v < 0 ? 'net-lose' : '')
}

// 进入「输赢汇总」tab：加载本俱乐部结果 + 按桌 + 全部逐把
async function loadClubProfit() {
  if (!clubId.value) return
  profit.loading = true
  try {
    const res = await getClubProfit(clubId.value)
    profit.club = res.data || {}
  } finally {
    profit.loading = false
  }
  profit.history.roomId = null
  profit.history.tableNo = null
  profit.history.page = 0
  await Promise.all([loadProfitTables(), loadProfitHistory(null)])
}

async function loadProfitTables() {
  if (!clubId.value) return
  profit.tablesLoading = true
  try {
    const res = await getProfitTables(clubId.value)
    profit.tables = res.data || []
  } finally {
    profit.tablesLoading = false
  }
}

function onPickProfitTable(row) {
  if (!row || !row.roomId) return
  profit.history.roomId = row.roomId
  profit.history.tableNo = row.tableNo
  profit.history.page = 0
  loadProfitHistory(row.roomId)
}

async function loadProfitHistory(roomId) {
  if (roomId === null) { profit.history.roomId = null; profit.history.tableNo = null; profit.history.page = 0 }
  if (!clubId.value) return
  profit.history.loading = true
  try {
    const res = await getProfitHistory({
      clubId: clubId.value,
      roomId: profit.history.roomId || undefined,
      page: profit.history.page,
      size: profit.history.size
    })
    const d = res.data || {}
    profit.history.rows = d.rows || []
    profit.history.total = d.total || 0
  } finally {
    profit.history.loading = false
  }
}

function onProfitHistoryPage(p) {
  profit.history.page = p - 1
  loadProfitHistory(profit.history.roomId)
}

async function handleClearClubHistory() {
  if (!clubId.value) return
  try {
    await ElMessageBox.confirm('确认清理【本俱乐部】的逐把对账过程？不影响群主输赢结果（结果单独保留）。', '清理对账过程', { type: 'warning' })
  } catch (e) { return }
  const res = await clearProfitHistory({ clubId: clubId.value })
  ElMessage.success(`已清理对账过程 ${res.data?.deleted ?? 0} 条`)
  await Promise.all([loadProfitTables(), loadProfitHistory(null)])
}

async function handleClearTableHistory(row) {
  const roomId = (row && row.roomId) ? row.roomId : profit.history.roomId
  if (!roomId) return
  try {
    await ElMessageBox.confirm(`确认清理【本桌 ${(row && row.tableNo) || profit.history.tableNo || roomId}】的逐把对账过程？不影响群主输赢结果。`, '清理对账过程', { type: 'warning' })
  } catch (e) { return }
  const res = await clearProfitHistory({ roomId })
  ElMessage.success(`已清理对账过程 ${res.data?.deleted ?? 0} 条`)
  await Promise.all([loadProfitTables(), loadProfitHistory(null)])
}
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
  settleTime: 30, commissionRate: 5, bringIn: 0, sanHua: true, diWang: false, noScore: false, dingErHuangFeast: false, gps: false,
  bonusPool: false, queue: false, queuePlayerCount: 6,
  // ⭐ 带入倍数范围：三个都填才生效，每个机器人坐下各自随机抽一个倍数×底注，不再统一用上面的"带入"
  bringInMultiplierMin: null, bringInMultiplierMax: null, bringInMultiplierStep: null,
  // 拟真：周期结束站起/离桌 + 全机器人桌赢家比例 + 围观基数倍数，null=不覆盖，用俱乐部默认值
  periodWinStandUpProb: null, periodLoseStandUpProb: null, allRobotWinRatePercent: null,
  viewerAudienceMultiplierMin: null, viewerAudienceMultiplierMax: null,
  chipCapMultiplier: null, lossCapMultiplier: null, minSeatedRobots: null, viewerSeatFullCount: null,
  profitControlEnabled: false, profitMode: 'rate', targetProfit: 0, targetProfitRate: -0.05, perHandCap: 0, adjustStrength: 0.5
})
const batchLoading = ref(false)
const lastBatchTip = ref('—')

// ⭐ 筹码封顶倍数自动建议：填了带入倍数范围就自动算 = 带入倍数上限×2(按步长取整)，不用手动算；
//   手动改过封顶倍数之后就不再自动覆盖(chipCapAutoFilled 变 false)，尊重手动填的值。
//   2026-07-18 ×5→×2：×5 是封顶功能刚加时的老规则(250×5=1250,封顶12.5万)，实测赢家滚到12万+才被踢，
//   战绩榜观感就是"一个人赢很多"；改为"最大带入翻倍即落袋"(250×2=500)，配合后端"生效封顶不低于
//   本人带入×1.2"的兜底，建议值偏低也不会出现带入大于封顶、一坐下就被踢的问题。
const chipCapAutoFilled = ref(false)
// ⭐ 2026-07-19 亏损封顶(输家侧)跟筹码封顶用同一个建议值(=带入倍数上限×2)，各自独立记录"是否手动改过"
const lossCapAutoFilled = ref(false)

function computeSuggestedChipCap() {
  const max = batch.bringInMultiplierMax
  const step = batch.bringInMultiplierStep
  if (!max || max <= 0) return null
  let suggested = Math.round(max * 2)
  if (step && step > 0) {
    suggested = Math.ceil(suggested / step) * step // 对齐到步长，凑整好看
  }
  return suggested
}

watch([() => batch.bringInMultiplierMin, () => batch.bringInMultiplierMax, () => batch.bringInMultiplierStep], () => {
  const suggested = computeSuggestedChipCap()
  if (suggested == null) return
  // 只在"还没手动改过"或者"当前值就是上一次自动填的值"时才自动更新，不覆盖用户手动填的数字
  if (!chipCapAutoFilled.value && (batch.chipCapMultiplier === null || batch.chipCapMultiplier === 0)) {
    batch.chipCapMultiplier = suggested
    chipCapAutoFilled.value = true
  } else if (chipCapAutoFilled.value) {
    batch.chipCapMultiplier = suggested
  }
  // 亏损封顶同样自动填(同一个建议值)，手动改过就不再覆盖
  if (!lossCapAutoFilled.value && (batch.lossCapMultiplier === null || batch.lossCapMultiplier === 0)) {
    batch.lossCapMultiplier = suggested
    lossCapAutoFilled.value = true
  } else if (lossCapAutoFilled.value) {
    batch.lossCapMultiplier = suggested
  }
})

function onChipCapManuallyEdited() {
  chipCapAutoFilled.value = false // 手动改过，以后带入范围再变也不会覆盖这个值了
}

function onLossCapManuallyEdited() {
  lossCapAutoFilled.value = false
}

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

// 切换俱乐部「禁用游戏」开关（打开后新玩家不能进桌坐下，不影响已在玩的）
async function toggleGameDisabled(row, val) {
  row._gdLoading = true
  try {
    const res = await setClubGameDisabled(row.id, val)
    if (res.code === 200) {
      ElMessage.success(val ? '已禁用该俱乐部游戏（新玩家不能进桌）' : '已恢复该俱乐部游戏')
    } else {
      row.gameDisabled = !val
      ElMessage.error(res.message || '设置失败')
    }
  } catch (e) {
    row.gameDisabled = !val
    ElMessage.error('设置失败')
  } finally {
    row._gdLoading = false
  }
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
  else if (name === 'profit') loadClubProfit()
  else if (name === 'holidayCal') loadHolidayCalendar()
}

// ===== 节假日日历（全局配置，不区分俱乐部） =====
const holidayCal = reactive({
  currentDate: new Date(),
  dates: [],              // yyyy-MM-dd 字符串数组
  weekendCoefficient: 120,
  holidayCoefficient: 130,
  todayCoefficient: 100,
  loading: false,
  saving: false
})

function isHolidayDate(day) {
  return holidayCal.dates.includes(day)
}
function isWeekendDate(day) {
  const d = new Date(day + 'T00:00:00')
  const wd = d.getDay()
  return wd === 0 || wd === 6
}
function holidayCalCellClass(day) {
  if (isHolidayDate(day)) return 'is-holiday'
  if (isWeekendDate(day)) return 'is-weekend'
  return ''
}

async function loadHolidayCalendar() {
  holidayCal.loading = true
  try {
    const res = await getHolidayViewerConfig()
    if (res.code === 200 && res.data) {
      const dates = res.data.holidayDates || []
      holidayCal.dates = Array.isArray(dates) ? dates : []
      holidayCal.weekendCoefficient = Number(res.data.weekendCoefficient) || 120
      holidayCal.holidayCoefficient = Number(res.data.holidayCoefficient) || 130
      holidayCal.todayCoefficient = Number(res.data.todayCoefficient) || 100
    }
  } catch (e) { /* ignore */ } finally {
    holidayCal.loading = false
  }
}

async function persistHolidayCalendar() {
  holidayCal.saving = true
  try {
    const res = await setHolidayViewerConfig({
      holidayDates: holidayCal.dates,
      weekendCoefficient: holidayCal.weekendCoefficient,
      holidayCoefficient: holidayCal.holidayCoefficient
    })
    if (res.code === 200) {
      ElMessage.success('已保存(全局生效)')
      if (res.data) holidayCal.todayCoefficient = Number(res.data.todayCoefficient) || 100
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    holidayCal.saving = false
  }
}

function handleSaveHolidayCalendar() {
  persistHolidayCalendar()
}

function toggleHolidayDate(day) {
  const idx = holidayCal.dates.indexOf(day)
  if (idx >= 0) holidayCal.dates.splice(idx, 1)
  else holidayCal.dates.push(day)
  persistHolidayCalendar()
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

async function handleAssignFromFolder(type) {
  if (!clubId.value) { ElMessage.warning('请先选择俱乐部'); return }
  const path = (type === 2 ? folderAssign.viewerPath : folderAssign.path || '').trim()
  if (!path) { ElMessage.warning('请填写服务器目录'); return }
  const who = type === 2 ? '围观机器人' : '打牌机器人'
  try {
    await ElMessageBox.confirm(`确认从服务器目录【${path}】按文件名顺序一一分配给本俱乐部全部${who}？图片数必须与机器人数一致。`, '服务器文件夹一一分配', { type: 'warning' })
  } catch (e) { return }
  if (type === 2) folderAssign.viewerLoading = true; else folderAssign.loading = true
  try {
    const res = await assignAvatarsFromFolder({ clubId: clubId.value, folderPath: path, type })
    const d = res.data || {}
    ElMessage.success(`一一分配完成：图片 ${d.imageCount}，${who} ${d.robotCount}，已更新 ${d.changed}`)
    if (type === 2) loadViewers(); else loadMembers()
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || e?.message || '分配失败（请检查图片数与机器人数是否一致）')
  } finally {
    if (type === 2) folderAssign.viewerLoading = false; else folderAssign.loading = false
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

// 查看某桌实际生效的机器人拟真参数
const roomParamsVisible = ref(false)
const roomParamsLoading = ref(false)
const roomParamsData = reactive({ roomId: null, tableNo: '', params: [] })

async function openRoomParams(row) {
  roomParamsData.roomId = row.roomId
  roomParamsData.tableNo = row.tableNo
  roomParamsVisible.value = true
  roomParamsLoading.value = true
  try {
    const res = await getRobotRoomParams(row.roomId)
    if (res.code === 200) {
      roomParamsData.params = res.data?.params || []
    } else {
      ElMessage.error(res.message || '查询失败')
    }
  } catch (e) {
    ElMessage.error('查询失败')
  } finally {
    roomParamsLoading.value = false
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

async function handleCleanPhantomViewers(row) {
  // 清理打牌机器人站起后遗留、没坐座位却卡在观众列表里的"幽灵观众"（历史遗留 bug 修复）
  const res = await cleanPhantomRobotViewers({ roomId: row.roomId })
  ElMessage.success(res.message || `已清理 ${res.data?.removed ?? 0} 个幽灵观众`)
  loadTables()
}

async function handleAdjustViewers(row) {
  // 围观机器人集合不变，只换昵称+随机顺序（程序也会按 viewer_adjust_seconds 周期自动调整，默认5分钟）
  const res = await adjustRobotViewers({ roomId: row.roomId })
  ElMessage.success(res.message || `已调围观 ${res.data?.adjusted ?? 0} 个`)
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
.net-win { color: #f56c6c; font-weight: 600; }
.net-lose { color: #67c23a; font-weight: 600; }
.holiday-cal-cell { height: 100%; min-height: 56px; padding: 2px 0; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 2px; border-radius: 4px; }
.holiday-cal-cell:hover { background: #f5f7fa; }
.holiday-cal-cell.is-weekend { background: #fdf6ec; }
.holiday-cal-cell.is-holiday { background: #fef0f0; }
.holiday-cal-day { font-size: 13px; font-weight: 600; }
</style>
