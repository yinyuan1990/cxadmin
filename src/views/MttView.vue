<template>
  <div class="mtt-page">

    <!-- ================= 视图1：俱乐部列表（入口） ================= -->
    <el-card v-if="!currentClub" class="page-card">
      <template #header>
        <div class="card-header">
          <span class="title">MTT 比赛管理 · 俱乐部列表</span>
          <div style="display:flex; gap:8px; align-items:center;">
            <el-select v-model="clubFilter.type" placeholder="类型" size="small" clearable style="width:140px" @change="loadClubs">
              <el-option label="全部类型" :value="''" />
              <el-option label="大联盟(公共)" :value="3" />
              <el-option label="联盟" :value="2" />
              <el-option label="普通" :value="1" />
            </el-select>
            <el-input v-model="clubFilter.keyword" placeholder="ID/编号/名称" size="small" clearable style="width:180px" @keyup.enter="loadClubs" />
            <el-button size="small" :loading="clubLoading" @click="loadClubs">查询</el-button>
            <el-button type="warning" size="small" @click="gotoPrizeItems">实物管理</el-button>
          </div>
        </div>
      </template>

      <el-table :data="clubList" border size="small" v-loading="clubLoading">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="no" label="编号" width="90" />
        <el-table-column prop="name" label="名称" min-width="140" />
        <el-table-column label="类型" width="110" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.type===3?'danger':(row.type===2?'warning':'info')">{{ row.typeName }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ownerName" label="群主" width="110" />
        <el-table-column prop="memberCount" label="成员" width="70" align="center" />
        <el-table-column prop="robotCount" label="机器人" width="80" align="center" />
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.state===1?'success':'danger'">{{ row.state===1?'正常':(row.state===2?'已解散':'禁用') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="enterClub(row)">进入管理</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination style="margin-top:12px; justify-content:flex-end;" layout="total, prev, pager, next"
        :total="clubTotal" :page-size="clubFilter.size" :current-page="clubFilter.page + 1"
        @current-change="p => { clubFilter.page = p - 1; loadClubs() }" />
    </el-card>

    <!-- ================= 视图2：单俱乐部 MTT 管理 ================= -->
    <el-card v-else class="page-card">
      <template #header>
        <div class="card-header">
          <div style="display:flex; align-items:center; gap:10px;">
            <el-button size="small" @click="backToClubs">← 返回俱乐部列表</el-button>
            <span class="title">{{ currentClub.name }}</span>
            <el-tag size="small" :type="currentClub.type===3?'danger':'info'">{{ currentClub.typeName }}</el-tag>
            <span class="tip">群主: {{ currentClub.ownerName }} (uid={{ currentClub.ownerId }})</span>
          </div>
        </div>
      </template>

      <el-tabs v-model="activeTab" @tab-change="onTabChange">

        <!-- ===== Tab 1: 比赛列表 ===== -->
        <el-tab-pane label="比赛列表" name="matches">
          <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <div class="stats-row" v-if="stats">
              <span class="tip">总{{ stats.totalMatches }}场 · 报名中{{ stats.upcoming }} · 进行中{{ stats.playing }} · 已结束{{ stats.finished }} · 累计冠军兑付{{ stats.finishedBonusSum }}</span>
            </div>
            <div style="display:flex; gap:8px;">
              <el-button type="warning" size="small" :loading="quickCreating" @click="quickCreate">⚡ 一键建赛(按模板)</el-button>
              <el-button type="primary" size="small" @click="openCreate">创建比赛</el-button>
            </div>
          </div>
          <el-table :data="matches" border size="small" v-loading="loading">
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="name" label="名称" min-width="150" />
            <el-table-column label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="statusTag(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="开赛时间" width="130">
              <template #default="{ row }">{{ fmtTime(row.startTime) }}</template>
            </el-table-column>
            <el-table-column label="报名费" width="110">
              <template #default="{ row }">{{ row.entryFee }} {{ feeUnit(row.rewardType) }}</template>
            </el-table-column>
            <el-table-column label="类型" width="90" align="center">
              <template #default="{ row }">
                <el-tag size="small" :type="row.rewardType===1?'info':(row.rewardType===2?'warning':'danger')">
                  {{ typeName(row.rewardType) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="robotCount" label="机器人" width="80" align="center" />
            <el-table-column prop="participants" label="参赛" width="70" align="center" />
            <el-table-column prop="totalBonus" label="冠军兑付" width="90" />
            <el-table-column label="操作" width="220" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click="openDetail(row)">详情</el-button>
                <el-button v-if="row.rewardType===3" size="small" type="warning" @click="openPrizes(row)">发放单</el-button>
                <el-button v-if="row.status===1 || row.status===2" size="small" type="danger" @click="doCancel(row)">取消</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- ===== Tab 2: MTT 机器人 ===== -->
        <el-tab-pane label="MTT机器人" name="robots">
          <el-alert type="info" :closable="false" style="margin-bottom:12px;"
            title="机器人的金币/钻石只能由群主转账（余额校验+双边流水,可查可对账）,系统不凭空发钱。金币赛报名扣机器人金币,钻石赛/实物赛扣钻石;余额不够的机器人不会自动报名。" />

          <div class="robot-toolbar">
            <el-card shadow="never" class="owner-card" v-if="ownerBal">
              <span style="font-weight:600;">群主余额：</span>
              <el-tag type="warning" size="large">金币 {{ ownerBal.gold }}</el-tag>
              <el-tag type="primary" size="large" style="margin-left:8px;">钻石 {{ ownerBal.diamond }}</el-tag>
              <el-button size="small" style="margin-left:12px;" @click="loadOwnerBalance">刷新</el-button>
            </el-card>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <el-input-number v-model="genCount" :min="1" :max="500" size="small" style="width:120px" />
              <el-input v-model="genAvatarFolder" placeholder="头像文件夹(点右边按钮生成)" size="small" style="width:260px" clearable>
                <template #suffix>
                  <span v-if="avatarFolderInfo" class="tip" style="margin:0;">{{ avatarFolderInfo.imageCount }} 张图</span>
                </template>
              </el-input>
              <el-button size="small" @click="ensureAvatarFolder">生成/检查头像文件夹</el-button>
              <el-button type="primary" size="small" :loading="robotWorking" @click="doGenerate">一键生成机器人</el-button>
              <el-button type="warning" size="small" @click="openTransfer">一键分配资金 →</el-button>
            </div>
            <div v-if="avatarFolderInfo" class="tip" style="width:100%;">
              📁 已按俱乐部编号 <b>{{ avatarFolderInfo.clubNo }}</b> 建好文件夹,当前 <b>{{ avatarFolderInfo.imageCount }}</b> 张图。
              上传位置(宿主机): <b>/home/fzcx/chexuan/shared/header/mtt-avatars/{{ avatarFolderInfo.clubNo }}/</b>
              → 放好图片后点"生成/检查"刷新数量,再一键生成机器人即可按图分配
            </div>
          </div>

          <el-table :data="robots" border size="small" v-loading="robotLoading" style="margin-top:10px;">
            <el-table-column prop="userId" label="userId" width="90" />
            <el-table-column prop="nickname" label="昵称" min-width="110" />
            <el-table-column prop="gold" label="金币" width="110" />
            <el-table-column prop="diamond" label="钻石" width="110" />
            <el-table-column prop="clubScore" label="俱乐部积分" width="110" />
          </el-table>
          <el-pagination style="margin-top:10px; justify-content:flex-end;" layout="total, prev, pager, next"
            :total="robotTotal" :page-size="robotPage.size" :current-page="robotPage.page + 1"
            @current-change="p => { robotPage.page = p - 1; loadRobots() }" />
        </el-tab-pane>

        <!-- ===== Tab 3: 成员列表 ===== -->
        <el-tab-pane label="成员列表" name="members">
          <el-table :data="members" border size="small" v-loading="memberLoading">
            <el-table-column prop="userId" label="userId" width="90" />
            <el-table-column prop="nickname" label="昵称" min-width="110" />
            <el-table-column label="角色" width="80" align="center">
              <template #default="{ row }">{{ roleName(row.role) }}</template>
            </el-table-column>
            <el-table-column label="身份" width="90" align="center">
              <template #default="{ row }">
                <el-tag size="small" :type="row.isRobot?'warning':'success'">{{ row.isRobot?'机器人':'真人' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="gold" label="金币" width="110" />
            <el-table-column prop="diamond" label="钻石" width="110" />
            <el-table-column prop="clubScore" label="俱乐部积分" width="110" />
          </el-table>
          <el-pagination style="margin-top:10px; justify-content:flex-end;" layout="total, prev, pager, next"
            :total="memberTotal" :page-size="memberPage.size" :current-page="memberPage.page + 1"
            @current-change="p => { memberPage.page = p - 1; loadMembers() }" />
        </el-tab-pane>

        <!-- ===== Tab 4: 赢亏配置（三类别） ===== -->
        <el-tab-pane label="赢亏配置" name="profit">
          <el-alert type="info" :closable="false" style="margin-bottom:12px;"
            title="控制机器人在本俱乐部 MTT 比赛里的打法倾向：收割=机器人弱牌早丢/强牌加注,更容易拿名次;放水=机器人强牌保守/弱牌多跟,真人更容易赢。不改发牌、不看底牌,只调机器人自己打法。" />
          <div class="profit-cards">
            <el-card v-for="cfg in profitConfigs" :key="cfg.rewardType" shadow="never" class="profit-card">
              <template #header>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-weight:600;">{{ typeName(cfg.rewardType) }}</span>
                  <el-tag v-if="cfg.rewardType===3" type="info" size="small">输赢控制后期开放</el-tag>
                  <el-switch v-else v-model="cfg.enabled" active-text="启用" />
                </div>
              </template>
              <template v-if="cfg.rewardType!==3">
                <div style="margin-bottom:6px;" class="tip">
                  机器人倾向：<b :style="{color: cfg.winBias>0?'#F56C6C':(cfg.winBias<0?'#67C23A':'#909399')}">
                  {{ cfg.winBias>0?('收割 +'+cfg.winBias):(cfg.winBias<0?('放水 '+cfg.winBias):'公平 0') }}</b>
                </div>
                <el-slider v-model="cfg.winBias" :min="-100" :max="100" :step="5" :disabled="!cfg.enabled"
                  :marks="{'-100':'放水', 0:'公平', 100:'收割'}" style="margin:0 12px 18px;" />
                <el-button type="primary" size="small" :loading="profitSaving" @click="saveProfit(cfg)">保存</el-button>
              </template>
              <template v-else>
                <div class="tip" style="padding:12px 0;">实物赛的输赢控制一期占位，后期版本开放。当前实物赛机器人按牌力公平打。</div>
              </template>
            </el-card>
          </div>
        </el-tab-pane>

        <!-- ===== Tab 5: 自动开赛 ===== -->
        <el-tab-pane label="自动开赛" name="auto">
          <el-alert type="info" :closable="false" style="margin-bottom:12px;"
            title="开启后本俱乐部「报名中」的比赛少于保底场次时自动按下方模板补建,保证赛事列表不空。公共俱乐部建议开启并配机器人数。" />
          <el-form label-width="130px" size="small" style="max-width:680px;">
            <el-form-item label="开关">
              <el-switch v-model="autoCfg.enabled" active-text="开启" inactive-text="关闭" />
            </el-form-item>
            <el-form-item label="保底未开赛场次"><el-input-number v-model="autoCfg.minUpcoming" :min="1" :max="10" style="width:160px" /></el-form-item>
            <el-form-item label="报名期(分钟)"><el-input-number v-model="autoCfg.leadMinutes" :min="5" :max="720" style="width:160px" /></el-form-item>
            <el-form-item label="场次间隔(分钟)"><el-input-number v-model="autoCfg.intervalMinutes" :min="10" :max="1440" style="width:160px" /></el-form-item>
            <el-form-item label="名称前缀"><el-input v-model="autoCfg.namePrefix" style="width:220px" placeholder="公开赛" /></el-form-item>

            <el-divider content-position="left">比赛模板（自动建赛用这套参数）</el-divider>

            <el-form-item label="赛事类型">
              <el-radio-group v-model="autoTpl.rewardType">
                <el-radio :value="1">金币赛(冠军通吃)</el-radio>
                <el-radio :value="2">钻石赛(冠军通吃)</el-radio>
                <el-radio :value="3">实物赛(按名次发实物)</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item :label="'报名费(' + feeUnit(autoTpl.rewardType) + ')'">
              <el-input-number v-model="autoTpl.entryFee" :min="autoTpl.rewardType===3?0:1" :step="autoTpl.rewardType===1?100:1" style="width:160px" />
              <span v-if="autoTpl.rewardType!==3" class="tip">记分牌=报名费(1:1)</span>
            </el-form-item>
            <el-form-item v-if="autoTpl.rewardType===3" label="初始记分牌">
              <el-input-number v-model="autoTpl.initialScore" :min="1000" :step="1000" style="width:160px" />
              <span class="tip">实物赛纯虚拟计分</span>
            </el-form-item>
            <el-form-item label="桌型">
              <el-radio-group v-model="autoTpl.seatNum">
                <el-radio :value="6">6人桌</el-radio>
                <el-radio :value="8">8人桌</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="人数下限/上限">
              <el-input-number v-model="autoTpl.lowerLimit" :min="2" style="width:110px" />
              <span style="margin:0 8px">~</span>
              <el-input-number v-model="autoTpl.upperLimit" :min="2" style="width:110px" />
            </el-form-item>
            <el-form-item label="升底皮周期(分)"><el-input-number v-model="autoTpl.upgradeMinutes" :min="1" style="width:160px" /></el-form-item>
            <el-form-item v-if="autoTpl.rewardType!==3" :label="'固定奖池(' + feeUnit(autoTpl.rewardType) + ')'">
              <el-input-number v-model="autoTpl.initialPool" :min="0" :step="1000" style="width:160px" />
              <span class="tip">叠加进冠军兑付</span>
            </el-form-item>
            <el-form-item v-if="autoTpl.rewardType===3" label="奖品清单">
              <div class="prize-rows">
                <div v-for="(p, i) in autoTpl.prizes" :key="i" class="prize-row">
                  <span class="tip">第</span>
                  <el-input-number v-model="p.rank" :min="1" :max="50" size="small" style="width:90px" />
                  <span class="tip">名</span>
                  <el-select v-model="p.itemId" placeholder="从奖品库选择" size="small" style="width:200px" filterable>
                    <el-option v-for="item in catalogOn" :key="item.id" :value="item.id"
                      :label="item.name + (item.isVirtual ? ' (虚拟)' : '')" />
                  </el-select>
                  <el-button size="small" type="danger" text @click="autoTpl.prizes.splice(i,1)">删除</el-button>
                </div>
                <div style="display:flex; gap:8px;">
                  <el-button size="small" @click="autoTpl.prizes.push({rank: autoTpl.prizes.length+1, itemId: null})">+ 添加奖品</el-button>
                  <el-button size="small" text type="primary" @click="gotoPrizeItems">去实物管理添加</el-button>
                </div>
              </div>
            </el-form-item>
            <el-form-item label="机器人数">
              <el-input-number v-model="autoTpl.robotCount" :min="0" :max="200" style="width:160px" />
              <span class="tip">开赛前5分钟自动报名(需机器人自有余额够报名费)</span>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" :loading="saving" @click="saveAutoConfig">保存自动开赛配置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- ================= 群主转账/一键分配弹窗 ================= -->
    <el-dialog v-model="transferVisible" title="群主 → 机器人 一键分配" width="520px" :close-on-click-modal="!distributing">
      <el-form label-width="120px" size="small" :disabled="distributing">
        <el-form-item label="转什么">
          <el-radio-group v-model="transferForm.currency">
            <el-radio value="GOLD">金币(金币赛报名用)</el-radio>
            <el-radio value="DIAMOND">钻石(钻石/实物赛用)</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="每个机器人">
          <el-input-number v-model="transferForm.amountPerRobot" :min="1" :step="transferForm.currency==='GOLD'?1000:10" style="width:180px" />
        </el-form-item>
      </el-form>

      <!-- 自动算账 -->
      <el-descriptions :column="1" size="small" border style="margin-top:4px;">
        <el-descriptions-item label="机器人数">{{ robotTotal }} 个</el-descriptions-item>
        <el-descriptions-item label="需要总额">
          <b>{{ needTotal }}</b> {{ transferForm.currency==='GOLD'?'金币':'钻石' }}
        </el-descriptions-item>
        <el-descriptions-item label="群主当前余额">{{ ownerCurrentBalance }}</el-descriptions-item>
        <el-descriptions-item label="缺口(自动给群主补)">
          <b :style="{color: ownerGap>0?'#E6A23C':'#67C23A'}">{{ ownerGap>0 ? ('+' + ownerGap + ' (分配时自动补给群主,落管理员流水)') : '余额充足,无需补款' }}</b>
        </el-descriptions-item>
      </el-descriptions>

      <!-- 进度条 -->
      <div v-if="distributing || distributeProgress > 0" style="margin-top:14px;">
        <el-progress :percentage="distributeProgress" :status="distributeProgress>=100?'success':undefined" :stroke-width="18" text-inside />
        <div class="tip" style="margin-top:4px;">{{ distributeText }}</div>
      </div>

      <template #footer>
        <el-button :disabled="distributing" @click="transferVisible=false">关闭</el-button>
        <el-button type="primary" :loading="distributing" @click="doDistribute">⚡ 一键分配</el-button>
      </template>
    </el-dialog>

    <!-- ================= 创建比赛弹窗 ================= -->
    <el-dialog v-model="createVisible" title="创建比赛" width="620px">
      <el-form :model="form" label-width="130px" size="small">
        <el-form-item label="名称"><el-input v-model="form.name" placeholder="周末千分锦标赛" /></el-form-item>
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
          <span class="tip" v-if="form.rewardType===1">金币由钻石兑换(默认1钻=1000金币)</span>
          <span class="tip" v-else>直接扣玩家钻石</span>
        </el-form-item>
        <el-form-item v-if="form.rewardType!==3" label="初始记分牌">
          <el-input :model-value="form.entryFee + ' (=报名费)'" disabled style="width:180px" />
          <span class="tip">记分牌即货币,冠军兑付全部记分牌</span>
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
          <div class="prize-rows">
            <div v-for="(p, i) in form.prizes" :key="i" class="prize-row">
              <span class="tip">第</span>
              <el-input-number v-model="p.rank" :min="1" :max="50" size="small" style="width:90px" />
              <span class="tip">名</span>
              <el-select v-model="p.itemId" placeholder="从奖品库选择" size="small" style="width:220px" filterable>
                <el-option v-for="item in catalogOn" :key="item.id" :value="item.id"
                  :label="item.name + (item.isVirtual ? ' (虚拟)' : '')" />
              </el-select>
              <el-button size="small" type="danger" text @click="form.prizes.splice(i,1)">删除</el-button>
            </div>
            <div style="display:flex; gap:8px;">
              <el-button size="small" @click="form.prizes.push({rank: form.prizes.length+1, itemId: null})">+ 添加奖品</el-button>
              <el-button size="small" text type="primary" @click="gotoPrizeItems">去实物管理添加</el-button>
            </div>
            <div class="tip">按名次可配多件。奖品先在「实物管理」登记(支持传图),这里下拉选择。玩家获奖后填收货地址,后台派送</div>
          </div>
        </el-form-item>
        <el-form-item v-if="form.rewardType!==3" :label="'固定奖池(' + feeUnit(form.rewardType) + ')'">
          <el-input-number v-model="form.initialPool" :min="0" :step="1000" style="width:180px" />
          <span class="tip">运营预置,叠加进冠军兑付(报名人数×报名费+固定奖池)</span>
        </el-form-item>
        <el-form-item label="机器人数">
          <el-input-number v-model="form.robotCount" :min="0" :max="200" style="width:180px" />
          <span class="tip">开赛前5分钟自动报名(需机器人自有余额够报名费)</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible=false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="doCreate">创建</el-button>
      </template>
    </el-dialog>

    <!-- ================= 比赛详情 ================= -->
    <el-dialog v-model="detailVisible" :title="'比赛详情 #' + (detail?.id || '')" width="760px">
      <template v-if="detail">
        <el-descriptions :column="3" size="small" border>
          <el-descriptions-item label="名称">{{ detail.name }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ statusText(detail.status) }}</el-descriptions-item>
          <el-descriptions-item label="开赛">{{ fmtTime(detail.startTime) }}</el-descriptions-item>
          <el-descriptions-item label="报名数">{{ detail.registeredCount }}</el-descriptions-item>
          <el-descriptions-item label="存活">{{ detail.aliveCount }}</el-descriptions-item>
          <el-descriptions-item label="冠军兑付">{{ detail.totalBonus ?? '-' }}</el-descriptions-item>
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

    <!-- ================= 实物发放单 ================= -->
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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  mttList, mttCreate, mttCancel, mttDetail, mttCompetitors, mttLedger,
  mttReconcile, mttStats, mttPrizeGrants, mttPrizeShip, mttPrizeRedeem,
  mttAutoConfigGet, mttAutoConfigSave,
  mttClubs, mttRobotGenerate, mttRobotList, mttOwnerBalance, mttRobotTransfer,
  mttTopUpOwner, mttAvatarFolder, mttMembers, mttProfitConfigGet, mttProfitConfigSave,
  mttPrizeItemList
} from '../api/index'

const router = useRouter()

// ==================== 俱乐部列表 ====================
const clubLoading = ref(false)
const clubList = ref([])
const clubTotal = ref(0)
const clubFilter = ref({ type: '', keyword: '', page: 0, size: 20 })
const currentClub = ref(null)
const activeTab = ref('matches')

async function loadClubs() {
  clubLoading.value = true
  try {
    const body = { page: clubFilter.value.page, size: clubFilter.value.size }
    if (clubFilter.value.type !== '' && clubFilter.value.type != null) body.type = clubFilter.value.type
    if (clubFilter.value.keyword) body.keyword = clubFilter.value.keyword
    const res = await mttClubs(body)
    if (res.code === 200 && res.data) {
      clubList.value = res.data.list || []
      clubTotal.value = res.data.total || 0
    }
  } catch (e) {
    ElMessage.error(e.message || '加载俱乐部失败')
  } finally {
    clubLoading.value = false
  }
}

function enterClub(club) {
  currentClub.value = club
  activeTab.value = 'matches'
  loadMatches()
}

function backToClubs() {
  currentClub.value = null
  loadClubs()
}

function onTabChange(tab) {
  if (tab === 'matches') loadMatches()
  else if (tab === 'robots') { loadRobots(); loadOwnerBalance() }
  else if (tab === 'members') loadMembers()
  else if (tab === 'profit') loadProfitConfigs()
  else if (tab === 'auto') loadAutoConfig()
}

// ==================== 比赛列表 ====================
const loading = ref(false)
const saving = ref(false)
const matches = ref([])
const stats = ref(null)

async function loadMatches() {
  if (!currentClub.value) return
  loading.value = true
  try {
    const clubId = currentClub.value.id
    const [listRes, statsRes] = await Promise.all([mttList(clubId), mttStats(clubId)])
    if (listRes.code === 200) matches.value = listRes.data || []
    if (statsRes.code === 200) stats.value = statsRes.data
  } catch (e) {
    ElMessage.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

// ==================== 创建比赛 ====================
const createVisible = ref(false)
const form = ref(defaultForm())

function defaultForm() {
  return {
    name: '', startTimeDate: null,
    entryFee: 1000, initialScore: 10000, seatNum: 8,
    lowerLimit: 4, upperLimit: 200, upgradeMinutes: 10,
    levelTable: '', rewardType: 1,
    prizes: [], initialPool: 0, robotCount: 0
  }
}

function openCreate() {
  form.value = defaultForm()
  createVisible.value = true
  loadCatalog() // 奖品下拉数据
}

async function doCreate() {
  const f = form.value
  if (!f.name || !f.startTimeDate) {
    ElMessage.warning('名称/开赛时间必填')
    return
  }
  let prizeSnapshot = null
  if (f.rewardType === 3) {
    if (!f.prizes.length) { ElMessage.warning('实物赛必须配奖品清单'); return }
    prizeSnapshot = prizesToSnapshot(f.prizes)
    if (!prizeSnapshot) { ElMessage.warning('有奖品行未从奖品库选择,请补全'); return }
  }
  saving.value = true
  try {
    const body = {
      name: f.name, clubId: currentClub.value.id,
      startTime: new Date(f.startTimeDate).getTime(),
      entryFee: f.entryFee, initialScore: f.initialScore, seatNum: f.seatNum,
      lowerLimit: f.lowerLimit, upperLimit: f.upperLimit, upgradeMinutes: f.upgradeMinutes,
      rewardType: f.rewardType, initialPool: f.initialPool, robotCount: f.robotCount
    }
    if (f.levelTable) body.levelTable = f.levelTable
    if (f.rewardType === 3) body.prizeList = prizeSnapshot
    const res = await mttCreate(body)
    if (res.code === 200) {
      ElMessage.success('比赛已创建')
      createVisible.value = false
      loadMatches()
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
  if (res.code === 200) { ElMessage.success('已取消并退费'); loadMatches() }
  else ElMessage.error(res.message || '取消失败')
}

// ==================== 比赛详情 / 发放单 ====================
const detailVisible = ref(false)
const prizesVisible = ref(false)
const detail = ref(null)
const competitors = ref([])
const ledger = ref([])
const reconcile = ref(null)
const prizes = ref([])

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

// ==================== MTT 机器人 ====================
const robotLoading = ref(false)
const robotWorking = ref(false)
const robots = ref([])
const robotTotal = ref(0)
const robotPage = ref({ page: 0, size: 50 })
const genCount = ref(10)
const genAvatarFolder = ref('')
const avatarFolderInfo = ref(null)

async function ensureAvatarFolder() {
  const res = await mttAvatarFolder(currentClub.value.id)
  if (res.code === 200 && res.data) {
    avatarFolderInfo.value = res.data
    genAvatarFolder.value = res.data.folder
    ElMessage.success(`文件夹就绪(编号${res.data.clubNo}),当前 ${res.data.imageCount} 张图`)
  } else {
    ElMessage.error(res.message || '生成文件夹失败')
  }
}
const ownerBal = ref(null)
const transferVisible = ref(false)
const transferForm = ref({ currency: 'GOLD', amountPerRobot: 1000 })
const distributing = ref(false)
const distributeProgress = ref(0)
const distributeText = ref('')

async function loadRobots() {
  if (!currentClub.value) return
  robotLoading.value = true
  try {
    const res = await mttRobotList(currentClub.value.id, robotPage.value.page, robotPage.value.size)
    if (res.code === 200 && res.data) {
      robots.value = res.data.list || []
      robotTotal.value = res.data.robotTotal || 0
    }
  } finally {
    robotLoading.value = false
  }
}

async function loadOwnerBalance() {
  if (!currentClub.value) return
  const res = await mttOwnerBalance(currentClub.value.id)
  if (res.code === 200) ownerBal.value = res.data
}

async function doGenerate() {
  try {
    await ElMessageBox.confirm(
      `确认为「${currentClub.value.name}」一键生成 ${genCount.value} 个 MTT 机器人？\n昵称自动随机(字不重叠)` +
      (genAvatarFolder.value ? `,头像从文件夹「${genAvatarFolder.value}」按图分配` : ',未填头像文件夹本次不分配头像') +
      '。\n生成后不带任何资金,用「一键分配资金」补金币/钻石。',
      '生成机器人', { type: 'warning' })
  } catch { return }
  robotWorking.value = true
  try {
    const res = await mttRobotGenerate(currentClub.value.id, genCount.value, genAvatarFolder.value || null)
    if (res.code === 200) {
      const d = res.data || {}
      if (d.avatarError) {
        ElMessage.warning(`机器人已生成 ${d.createdUsers} 个,但头像分配失败: ${d.avatarError}`)
      } else {
        ElMessage.success(`生成完成 ${d.createdUsers} 个` + (d.avatarsAssigned != null ? `,头像已分配 ${d.avatarsAssigned} 个` : ''))
      }
      loadRobots()
    } else {
      ElMessage.error(res.message || '生成失败')
    }
  } finally {
    robotWorking.value = false
  }
}

// ==================== ⚡ 一键分配资金（自动算缺口→补群主→进度条逐批转账） ====================
const needTotal = computed(() => (transferForm.value.amountPerRobot || 0) * robotTotal.value)
const ownerCurrentBalance = computed(() => {
  if (!ownerBal.value) return '-'
  return transferForm.value.currency === 'GOLD' ? (ownerBal.value.gold ?? 0) : (ownerBal.value.diamond ?? 0)
})
const ownerGap = computed(() => {
  const bal = typeof ownerCurrentBalance.value === 'number' ? ownerCurrentBalance.value : 0
  return Math.max(0, needTotal.value - bal)
})

function openTransfer() {
  distributeProgress.value = 0
  distributeText.value = ''
  loadOwnerBalance()
  transferVisible.value = true
}

async function doDistribute() {
  const f = transferForm.value
  if (!f.amountPerRobot || f.amountPerRobot < 1) { ElMessage.warning('请填每个机器人的分配金额'); return }
  if (robotTotal.value < 1) { ElMessage.warning('该俱乐部还没有机器人,先一键生成'); return }
  const unit = f.currency === 'GOLD' ? '金币' : '钻石'
  try {
    await ElMessageBox.confirm(
      `一键分配 ${unit}：${robotTotal.value} 个机器人 × ${f.amountPerRobot} = 共 ${needTotal.value}` +
      (ownerGap.value > 0 ? `\n群主余额不足,将自动给群主补 ${ownerGap.value}(落管理员流水),再由群主转给机器人。` : '\n群主余额充足,直接分配。') +
      '\n确认执行？',
      '⚡ 一键分配', { confirmButtonText: '开始分配', type: 'warning' })
  } catch { return }

  distributing.value = true
  distributeProgress.value = 0
  try {
    // 1. 缺口自动补给群主
    if (ownerGap.value > 0) {
      distributeText.value = `正在给群主补款 ${ownerGap.value} ${unit}...`
      const topUp = await mttTopUpOwner(currentClub.value.id, f.currency, ownerGap.value)
      if (topUp.code !== 200) { ElMessage.error('群主补款失败: ' + (topUp.message || '')); return }
      distributeProgress.value = 10
    }

    // 2. 拉全部机器人 ID（分页取完）
    distributeText.value = '正在获取机器人列表...'
    const allIds = []
    for (let p = 0; p * 200 < robotTotal.value + 200; p++) {
      const res = await mttRobotList(currentClub.value.id, p, 200)
      const rows = res.code === 200 && res.data ? (res.data.list || []) : []
      rows.forEach(r => allIds.push(r.userId))
      if (rows.length < 200) break
    }
    if (!allIds.length) { ElMessage.warning('没有机器人可分配'); return }
    distributeProgress.value = Math.max(distributeProgress.value, 15)

    // 3. 分批转账（每批20个），进度条实时推进
    const batchSize = 20
    let done = 0
    for (let i = 0; i < allIds.length; i += batchSize) {
      const batch = allIds.slice(i, i + batchSize)
      distributeText.value = `正在分配 ${done + 1} ~ ${done + batch.length} / ${allIds.length} 个机器人...`
      const res = await mttRobotTransfer(currentClub.value.id, f.currency, f.amountPerRobot, batch)
      if (res.code !== 200) {
        ElMessage.error(`第 ${done + 1} 批分配失败: ${res.message || ''}(已分配的 ${done} 个不受影响)`)
        return
      }
      done += batch.length
      distributeProgress.value = 15 + Math.round(done / allIds.length * 85)
    }

    distributeProgress.value = 100
    distributeText.value = `✅ 分配完成：${done} 个机器人,每个 ${f.amountPerRobot} ${unit},共 ${done * f.amountPerRobot}`
    ElMessage.success('一键分配完成')
    loadRobots()
    loadOwnerBalance()
  } finally {
    distributing.value = false
  }
}

// ==================== 成员列表 ====================
const memberLoading = ref(false)
const members = ref([])
const memberTotal = ref(0)
const memberPage = ref({ page: 0, size: 50 })

async function loadMembers() {
  if (!currentClub.value) return
  memberLoading.value = true
  try {
    const res = await mttMembers(currentClub.value.id, memberPage.value.page, memberPage.value.size)
    if (res.code === 200 && res.data) {
      members.value = res.data.list || []
      memberTotal.value = res.data.total || 0
    }
  } finally {
    memberLoading.value = false
  }
}

// ==================== 赢亏配置 ====================
const profitConfigs = ref([])
const profitSaving = ref(false)

async function loadProfitConfigs() {
  if (!currentClub.value) return
  const res = await mttProfitConfigGet(currentClub.value.id)
  if (res.code === 200) profitConfigs.value = res.data || []
}

async function saveProfit(cfg) {
  profitSaving.value = true
  try {
    const res = await mttProfitConfigSave({
      clubId: currentClub.value.id,
      rewardType: cfg.rewardType,
      enabled: !!cfg.enabled,
      winBias: cfg.winBias || 0
    })
    if (res.code === 200) ElMessage.success(typeName(cfg.rewardType) + ' 赢亏配置已保存(30秒内生效)')
    else ElMessage.error(res.message || '保存失败')
  } finally {
    profitSaving.value = false
  }
}

// ==================== 自动开赛（表单化,不再写 JSON） ====================
const autoCfg = ref(defaultAutoCfg())
const autoTpl = ref(defaultAutoTpl())

function defaultAutoCfg() {
  return { enabled: false, minUpcoming: 2, leadMinutes: 20, intervalMinutes: 60, namePrefix: '公开赛' }
}
function defaultAutoTpl() {
  return {
    rewardType: 1, entryFee: 1000, initialScore: 10000, seatNum: 8,
    lowerLimit: 4, upperLimit: 200, upgradeMinutes: 10,
    initialPool: 0, robotCount: 6, prizes: []
  }
}

async function loadAutoConfig() {
  if (!currentClub.value) return
  autoCfg.value = defaultAutoCfg()
  autoTpl.value = defaultAutoTpl()
  await loadCatalog() // 先有奖品库才能把快照回显成下拉选择
  const res = await mttAutoConfigGet(currentClub.value.id)
  if (res.code === 200 && res.data) {
    const d = res.data
    autoCfg.value = {
      enabled: !!d.enabled,
      minUpcoming: d.minUpcoming ?? 2,
      leadMinutes: d.leadMinutes ?? 20,
      intervalMinutes: d.intervalMinutes ?? 60,
      namePrefix: d.namePrefix || '公开赛'
    }
    // 模板 JSON → 表单（运营看不到 JSON）
    if (d.templateJson) {
      try {
        const t = JSON.parse(d.templateJson)
        autoTpl.value = {
          rewardType: t.rewardType ?? 1,
          entryFee: t.entryFee ?? 1000,
          initialScore: t.initialScore ?? 10000,
          seatNum: t.seatNum ?? 8,
          lowerLimit: t.lowerLimit ?? 4,
          upperLimit: t.upperLimit ?? 200,
          upgradeMinutes: t.upgradeMinutes ?? 10,
          initialPool: t.initialPool ?? 0,
          robotCount: t.robotCount ?? 0,
          prizes: t.prizeList ? snapshotToPrizes(JSON.parse(t.prizeList)) : []
        }
      } catch { /* 老数据解析失败用默认 */ }
    }
  }
}

async function saveAutoConfig() {
  const t = autoTpl.value
  let prizeSnapshot = null
  if (t.rewardType === 3) {
    if (!t.prizes.length) { ElMessage.warning('实物赛模板必须配奖品清单'); return }
    prizeSnapshot = prizesToSnapshot(t.prizes)
    if (!prizeSnapshot) { ElMessage.warning('有奖品行未从奖品库选择,请补全'); return }
  }
  saving.value = true
  try {
    const template = {
      rewardType: t.rewardType, entryFee: t.entryFee, seatNum: t.seatNum,
      lowerLimit: t.lowerLimit, upperLimit: t.upperLimit,
      upgradeMinutes: t.upgradeMinutes, robotCount: t.robotCount
    }
    if (t.rewardType === 3) {
      template.initialScore = t.initialScore
      template.prizeList = prizeSnapshot
    } else {
      template.initialPool = t.initialPool
    }
    const res = await mttAutoConfigSave({
      clubId: currentClub.value.id,
      enabled: autoCfg.value.enabled,
      minUpcoming: autoCfg.value.minUpcoming,
      leadMinutes: autoCfg.value.leadMinutes,
      intervalMinutes: autoCfg.value.intervalMinutes,
      namePrefix: autoCfg.value.namePrefix,
      templateJson: JSON.stringify(template)
    })
    if (res.code === 200) {
      ElMessage.success(autoCfg.value.enabled ? '已保存：自动开赛已开启' : '已保存：自动开赛关闭')
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

// ==================== 实物奖品库（管理在独立页「实物管理」,这里只做下拉数据源） ====================
const catalogAll = ref([])   // 含下架（快照回显匹配用）
const catalogOn = ref([])    // 下拉选择：仅上架

async function loadCatalog() {
  const [allRes, onRes] = await Promise.all([mttPrizeItemList(true), mttPrizeItemList(false)])
  if (allRes.code === 200) catalogAll.value = allRes.data || []
  if (onRes.code === 200) catalogOn.value = onRes.data || []
}

function gotoPrizeItems() {
  router.push('/prize-items')
}

/** 奖品行（{rank, itemId}）→ prizeList 快照 JSON；未选返回 null */
function prizesToSnapshot(rows) {
  const out = []
  for (const p of rows) {
    const item = catalogOn.value.find(x => x.id === p.itemId) || catalogAll.value.find(x => x.id === p.itemId)
    if (!item) return null
    out.push({ rank: p.rank, prizeName: item.name, prizeIcon: item.icon || '', isVirtual: !!item.isVirtual })
  }
  return JSON.stringify(out)
}

/** prizeList 快照 → 奖品行（编辑回显：按名称匹配奖品库,匹配不上 itemId=null 需重选） */
function snapshotToPrizes(list) {
  return (list || []).map(p => {
    const item = catalogOn.value.find(x => x.name === p.prizeName) || catalogAll.value.find(x => x.name === p.prizeName)
    return { rank: p.rank, itemId: item ? item.id : null }
  })
}

// ==================== ⚡ 一键建赛（按自动开赛模板立即建一场） ====================
const quickCreating = ref(false)

async function quickCreate() {
  quickCreating.value = true
  try {
    // 拉当前俱乐部的自动开赛模板
    const res = await mttAutoConfigGet(currentClub.value.id)
    let t = defaultAutoTpl()
    let namePrefix = '公开赛'
    let leadMinutes = 20
    if (res.code === 200 && res.data) {
      namePrefix = res.data.namePrefix || '公开赛'
      leadMinutes = res.data.leadMinutes ?? 20
      if (res.data.templateJson) {
        try {
          const j = JSON.parse(res.data.templateJson)
          t = { ...t, ...j, prizes: j.prizeList ? JSON.parse(j.prizeList) : [] }
        } catch { /* 模板损坏用默认 */ }
      }
    }
    const startTime = Date.now() + Math.max(5, leadMinutes) * 60_000
    const startStr = new Date(startTime)
    const p = n => String(n).padStart(2, '0')
    const name = `${namePrefix} ${p(startStr.getHours())}:${p(startStr.getMinutes())} 场`

    try {
      await ElMessageBox.confirm(
        `按自动开赛模板立即建一场：\n「${name}」 ${typeName(t.rewardType ?? 1)} · 报名费 ${t.entryFee ?? 1000} ${feeUnit(t.rewardType ?? 1)} · ${Math.max(5, leadMinutes)} 分钟后开赛 · 机器人 ${t.robotCount ?? 0} 个\n确认创建？`,
        '⚡ 一键建赛', { confirmButtonText: '立即创建', type: 'warning' })
    } catch { return }

    const body = {
      name, clubId: currentClub.value.id, startTime,
      entryFee: t.entryFee ?? 1000, seatNum: t.seatNum ?? 8,
      lowerLimit: t.lowerLimit ?? 4, upperLimit: t.upperLimit ?? 200,
      upgradeMinutes: t.upgradeMinutes ?? 10,
      rewardType: t.rewardType ?? 1, robotCount: t.robotCount ?? 0
    }
    if ((t.rewardType ?? 1) === 3) {
      body.initialScore = t.initialScore ?? 10000
      body.prizeList = typeof t.prizeList === 'string' && t.prizeList ? t.prizeList : JSON.stringify(t.prizes || [])
      if (!body.prizeList || body.prizeList === '[]') {
        ElMessage.warning('自动开赛模板是实物赛但没配奖品清单,请先到「自动开赛」页配好模板')
        return
      }
    } else {
      body.initialPool = t.initialPool ?? 0
    }
    const createRes = await mttCreate(body)
    if (createRes.code === 200) {
      ElMessage.success(`已创建「${name}」`)
      loadMatches()
    } else {
      ElMessage.error(createRes.message || '创建失败')
    }
  } finally {
    quickCreating.value = false
  }
}

// ==================== 工具 ====================
function statusText(s) { return { 0: '已结束', 1: '报名中', 2: '进行中', 3: '已解散' }[s] ?? s }
function statusTag(s) { return { 0: 'success', 1: 'info', 2: 'warning', 3: 'danger' }[s] ?? 'info' }
function typeName(t) { return { 1: '金币赛', 2: '钻石赛', 3: '实物赛' }[t] ?? t }
function feeUnit(rewardType) { return rewardType === 1 ? '金币' : '钻石' }
function roleName(r) { return { 1: '成员', 2: '管理员', 3: '群主', 4: '合伙人' }[r] ?? r }
function prizeStatusText(s) { return { GRANTED: '待派送', SHIPPED: '已派送', REDEEMED: '已兑付' }[s] ?? s }
function prizeStatusTag(s) { return { GRANTED: 'warning', SHIPPED: 'primary', REDEEMED: 'success' }[s] ?? 'info' }
function fmtTime(ms) {
  if (!ms) return '-'
  const d = new Date(Number(ms))
  const p = n => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

loadClubs()
</script>

<style scoped>
.mtt-page { padding: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.title { font-weight: 600; font-size: 16px; }
.tip { font-size: 12px; color: #909399; margin-left: 8px; }
.robot-toolbar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
.owner-card :deep(.el-card__body) { padding: 10px 16px; }
.profit-cards { display: flex; gap: 14px; flex-wrap: wrap; }
.profit-card { flex: 1; min-width: 280px; max-width: 380px; }
.prize-rows { display: flex; flex-direction: column; gap: 6px; }
.prize-row { display: flex; align-items: center; gap: 6px; }
.reconcile { background: #f7f9fc; padding: 10px; border-radius: 6px; font-size: 12px; }
</style>
