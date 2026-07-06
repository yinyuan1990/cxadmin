<template>
  <div class="config-page">
    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <span class="title">系统配置</span>
          <el-button
            type="primary"
            :icon="Refresh"
            :loading="loading"
            @click="loadConfigs"
          >
            刷新
          </el-button>
        </div>
      </template>

      <!-- ⭐ 指定发牌（测试） — 规则存 Redis，按 userId/昵称/6位ID 指定目标玩家 -->
      <el-card class="test-tools-card" shadow="never">
        <template #header>
          <span style="font-weight:600; color:#E6A23C;">⚠️ 指定发牌（测试）</span>
        </template>
        <div style="margin-bottom:12px; font-size:12px; color:#909399; line-height:1.7;">
          按牌型场景给指定玩家发固定牌，用于联调。规则<b>存 Redis</b>，发牌时实时读取。<br/>
          <b>目标玩家</b>可填 <b>userId / 昵称 / 6位ID</b> 任意一个；<b>留空 = 本局第一个参与者</b>。<br/>
          多场景可<b>同时启用</b>，不同玩家可拿不同牌型；同一玩家命中多条按优先级
          <b>丁二皇 &gt; 三花 &gt; 地九王</b> 取一。<br/>
          <span style="color:#F56C6C;">⚠️ 三花需该桌开启「三花」规则（或对指定目标自动视同开启）；地九王 ranking=10 需该桌开启「地九王」。</span>
        </div>
        <el-table :data="dealRules" border size="small" style="width:100%;">
          <el-table-column label="牌型场景" width="130">
            <template #default="{ row }">
              <el-tag size="small" type="warning">{{ row.scenarioLabel }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="启用" width="90" align="center">
            <template #default="{ row }">
              <el-switch v-model="row.enabled" active-color="#E6A23C" />
            </template>
          </el-table-column>
          <el-table-column label="目标玩家（userId / 昵称 / 6位ID）" min-width="220">
            <template #default="{ row }">
              <el-input
                v-model="row.target"
                size="small"
                placeholder="留空 = 本局第一个参与者"
                clearable
              />
            </template>
          </el-table-column>
          <el-table-column label="三花参数" min-width="280">
            <template #default="{ row }">
              <div v-if="row.scenario === 'san_hua'" style="display:flex; gap:8px; flex-wrap:wrap;">
                <el-select v-model="row.type" size="small" style="width:130px;">
                  <el-option
                    v-for="opt in sanHuaTypeOptions"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
                <el-select v-model="row.stage" size="small" style="width:130px;">
                  <el-option
                    v-for="opt in sanHuaStageOptions"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
              </div>
              <span v-else style="color:#C0C4CC;">—</span>
            </template>
          </el-table-column>
        </el-table>
        <div style="margin-top:12px; display:flex; gap:8px;">
          <el-button
            type="warning"
            size="small"
            :loading="dealRulesSaving"
            @click="handleSaveDealRules"
          >保存指定发牌规则</el-button>
          <el-button size="small" @click="loadDealRules">重置/刷新</el-button>
        </div>
        <el-divider style="margin: 12px 0;" />
        <div class="test-tool-row">
          <div class="test-tool-info">
            <span class="test-tool-label">强制秀牌费用</span>
            <span class="test-tool-desc">查看对手底牌消耗的游戏积分，设为0则免费</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <el-input-number
              v-model="forceShowCardCost"
              :min="0"
              :max="99999"
              :step="1"
              size="small"
              style="width: 140px;"
            />
            <el-button
              type="primary"
              size="small"
              :loading="costSaving"
              @click="handleSaveCost"
            >
              保存
            </el-button>
          </div>
        </div>
      </el-card>

      <!-- ⭐ 玩法全局开关 -->
      <el-card class="gameplay-card" shadow="never" style="margin-top:16px;">
        <template #header>
          <span style="font-weight:600; color:#409EFF;">玩法全局开关（针对所有房间）</span>
        </template>
        <div class="test-tool-row">
          <div class="test-tool-info">
            <span class="test-tool-label">奖池（中丁二皇等返利）</span>
            <span class="test-tool-desc">关闭后所有房间不再从赢家芒果里抽 8% 累积奖池，玩家积分尾数永远是整百，对账更干净。开启则按各房间自身配置生效。</span>
          </div>
          <el-switch
            v-model="bonusPoolEnabled"
            :loading="bonusPoolEnabledLoading"
            active-text="开启"
            inactive-text="关闭"
            active-color="#409EFF"
            @change="handleToggleBonusPoolEnabled"
          />
        </div>
      </el-card>

      <!-- ⭐ 注册昵称限制 -->
      <el-card class="register-card" shadow="never" style="margin-top:16px;">
        <template #header>
          <span style="font-weight:600; color:#67C23A;">注册限制</span>
        </template>
        <div class="test-tool-row">
          <div class="test-tool-info">
            <span class="test-tool-label">注册昵称最大长度（中文字符）</span>
            <span class="test-tool-desc">单位为"中文字符数"。1 个中文 = 2 个半角等价宽度。例：配置=4 → 最多 4 个汉字 或 8 个英文 或混合（含 emoji）。范围 1~32。</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <el-input-number
              v-model="registerNicknameMaxLength"
              :min="1"
              :max="32"
              :step="1"
              size="small"
              style="width: 140px;"
            />
            <span style="color:#909399; font-size:12px;">≈ {{ registerNicknameMaxLength * 2 }} 半角</span>
            <el-button
              type="primary"
              size="small"
              :loading="nicknameSaving"
              @click="handleSaveRegisterNicknameMaxLength"
            >
              保存
            </el-button>
          </div>
        </div>
        <div class="test-tool-row" style="margin-top:12px;">
          <div class="test-tool-info">
            <span class="test-tool-label">俱乐部名称最大长度（中文字符）</span>
            <span class="test-tool-desc">规则与注册昵称一致：汉字/字母/数字/符号/emoji 混合，按显示宽度计算。1 个中文 = 2 半角。范围 1~32。</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <el-input-number
              v-model="clubNameMaxLength"
              :min="1"
              :max="32"
              :step="1"
              size="small"
              style="width: 140px;"
            />
            <span style="color:#909399; font-size:12px;">≈ {{ clubNameMaxLength * 2 }} 半角</span>
            <el-button
              type="primary"
              size="small"
              :loading="clubNameSaving"
              @click="handleSaveClubNameMaxLength"
            >
              保存
            </el-button>
          </div>
        </div>
      </el-card>

      <!-- ⭐ 调试 trace 开关 -->
      <el-card class="trace-card" shadow="never" style="margin-top:16px;">
        <template #header>
          <span style="font-weight:600; color:#909399;">性能 / 日志</span>
        </template>
        <div class="test-tool-row">
          <div class="test-tool-info">
            <span class="test-tool-label">调试 trace 总开关</span>
            <span class="test-tool-desc">
              控制 cf.txt / 休芒.txt / 揍芒.txt / 三花.txt / 桌子.txt / 离开.txt / js.txt / jrjlb.txt / jlyx.txt / fjlcz.txt 是否写入。<br/>
              <span style="color:#67C23A;">✅ 审计类(moneymore.txt, 接口.txt, jf.txt)永远开,不受此开关影响</span><br/>
              <span style="color:#F56C6C;">⚠️ 生产环境 100+ 桌建议关闭,降低同步 IO 压力(每个 trace 都是 open+write+flush+close,影响游戏线程)</span>
            </span>
          </div>
          <el-switch
            v-model="debugTraceEnabled"
            :loading="debugTraceSaving"
            active-text="开启"
            inactive-text="关闭"
            active-color="#67C23A"
            inactive-color="#909399"
            @change="handleToggleDebugTrace"
          />
        </div>
      </el-card>

      <!-- ⭐ 抽水上限 -->
      <el-card class="commission-card" shadow="never" style="margin-top:16px;">
        <template #header>
          <span style="font-weight:600; color:#E6A23C;">牌桌创建限制 / 返点服务费</span>
        </template>
        <div class="test-tool-row">
          <div class="test-tool-info">
            <span class="test-tool-label">抽水(commission)上限百分比</span>
            <span class="test-tool-desc">玩家创建牌桌时能选的最大抽水百分比。0 表示不抽水。例：配置=10 → 玩家创建时只能选 0~10%。范围 1~50。<br/>
            <span style="color:#F56C6C;">⚠️ 抽水来源:玩家赢钱时按 profit×rate% 抽点位,分给合伙人/群主链路。</span></span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <el-input-number
              v-model="commissionRateMax"
              :min="1"
              :max="50"
              :step="1"
              size="small"
              style="width: 140px;"
            />
            <span style="color:#909399; font-size:12px;">% (0~{{ commissionRateMax }})</span>
            <el-button
              type="warning"
              size="small"
              :loading="commissionMaxSaving"
              @click="handleSaveCommissionRateMax"
            >
              保存
            </el-button>
          </div>
        </div>

        <el-divider style="margin: 12px 0;" />

        <div class="test-tool-row">
          <div class="test-tool-info">
            <span class="test-tool-label">周期返点扣群主钻石（系统服务费）</span>
            <span class="test-tool-desc">每次到 settleTime 触发周期返点结算时,从俱乐部群主账户扣多少钻石作为系统服务费。0 表示不扣。<br/>
            <span style="color:#F56C6C;">⚠️ 开局前会查群主钻石是否够下次扣。<b>不够则全员强制站起</b>,桌子无法继续直到群主充钻石。</span></span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <el-input-number
              v-model="commissionSettleDiamondCost"
              :min="0"
              :max="9999"
              :step="1"
              size="small"
              style="width: 140px;"
            />
            <span style="color:#909399; font-size:12px;">钻石/次</span>
            <el-button
              type="warning"
              size="small"
              :loading="diamondCostSaving"
              @click="handleSaveDiamondCost"
            >
              保存
            </el-button>
          </div>
        </div>

        <el-divider style="margin: 12px 0;" />

        <div style="padding:12px 0;">
          <div style="margin-bottom:12px;">
            <span style="font-weight:600; color:#E6A23C;">⭐ v49 / v50: 按房间游戏时间分档扣费（1~5 档位动态配置）</span>
            <p style="margin:8px 0 0 0; font-size:12px; color:#909399;">
              根据房间累计游戏时间（不含等人/留座时间）到达不同档位时，扣对应钻石数。<b>精确匹配</b>档位时间才生效。<br/>
              支持 <b>1 ~ 5</b> 个档位动态增删；档位间 <b>分钟数不能重复</b>。<br/>
              <span style="color:#909399;">⚠️ 档位的"分钟数"应与下方"可选结算时间"保持一致，否则该结算时间会回退到老配置（默认 5 钻石）。</span>
            </p>
          </div>
          <el-table :data="diamondTiers" border size="small" style="width:100%; max-width:680px;">
            <el-table-column label="档位" width="80" align="center">
              <template #default="{ $index }">档位{{ $index + 1 }}</template>
            </el-table-column>
            <el-table-column label="结算时间（分钟）" width="180">
              <template #default="{ row }">
                <el-input-number v-model="row.minutes" :min="1" :max="9999" :step="1" size="small" style="width:140px;" />
              </template>
            </el-table-column>
            <el-table-column label="钻石数" width="180">
              <template #default="{ row }">
                <el-input-number v-model="row.cost" :min="0" :max="9999" :step="1" size="small" style="width:140px;" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" align="center">
              <template #default="{ $index }">
                <el-button
                  type="danger"
                  size="small"
                  :disabled="diamondTiers.length <= 1"
                  @click="removeDiamondTier($index)"
                >删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div style="margin-top:12px; display:flex; gap:8px;">
            <el-button
              type="primary"
              size="small"
              :disabled="diamondTiers.length >= 5"
              @click="addDiamondTier"
            >+ 添加档位（{{ diamondTiers.length }}/5）</el-button>
            <el-button type="warning" size="small" :loading="diamondTiersSaving" @click="handleSaveDiamondTiers">
              保存档位配置
            </el-button>
          </div>
        </div>

        <el-divider style="margin: 12px 0;" />

        <!-- ⭐ v50: 可选结算时间配置（创建房间下拉框选项） -->
        <div style="padding:12px 0;">
          <div style="margin-bottom:12px;">
            <span style="font-weight:600; color:#E6A23C;">⭐ v50: 可选结算时间（创建房间下拉框选项）</span>
            <p style="margin:8px 0 0 0; font-size:12px; color:#909399;">
              创建房间时"结算时间"下拉框的选项列表（分钟）。<br/>
              至少 <b>1 个</b>，<b>互不重复</b>，每个值 ≥ 1。<br/>
              <span style="color:#909399;">⚠️ 应与上方"分档扣费"中的分钟数保持一致，确保到期能精确匹配档位扣钻石。</span>
            </p>
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:10px; align-items:center;">
            <div
              v-for="(item, idx) in availableSettleTimeList"
              :key="idx"
              style="display:flex; align-items:center; gap:4px;"
            >
              <el-input-number
                v-model="item.value"
                :min="1"
                :max="9999"
                :step="1"
                size="small"
                style="width:120px;"
              />
              <span style="font-size:12px; color:#909399;">分钟</span>
              <el-button
                type="danger"
                size="small"
                :disabled="availableSettleTimeList.length <= 1"
                @click="removeAvailableSettleTime(idx)"
              >删除</el-button>
            </div>
          </div>
          <div style="margin-top:12px; display:flex; gap:8px;">
            <el-button
              type="primary"
              size="small"
              @click="addAvailableSettleTime"
            >+ 添加结算时间（{{ availableSettleTimeList.length }}）</el-button>
            <el-button
              type="warning"
              size="small"
              :loading="availableSettleTimeSaving"
              @click="handleSaveAvailableSettleTime"
            >保存可选结算时间</el-button>
          </div>
        </div>
      </el-card>

      <!-- ⭐ 逃跑惩罚配置区 -->
      <el-card class="runaway-card" shadow="never">
        <template #header>
          <span style="font-weight:600; color:#F56C6C;">逃跑惩罚配置</span>
        </template>
        <div class="test-tool-row" style="margin-bottom:16px;">
          <div class="test-tool-info">
            <span class="test-tool-label">启用逃跑惩罚</span>
            <span class="test-tool-desc">赢分达到阈值且离座超时，罚赢分的指定比例补贴给大输家</span>
          </div>
          <el-switch
            v-model="runAway.enabled"
            active-text="开启"
            inactive-text="关闭"
            active-color="#F56C6C"
          />
        </div>
        <el-divider style="margin: 12px 0;" />
        <el-form label-width="130px" size="small" style="max-width:600px;">
          <el-form-item label="离座时间(分钟)">
            <el-input-number v-model="runAway.time" :min="1" :max="60" :step="1" style="width:140px;" />
            <span style="margin-left:8px;color:#909399;font-size:12px;">累计离座超过此时间触发惩罚</span>
          </el-form-item>
          <el-form-item label="罚金比例(%)">
            <el-input-number v-model="runAway.penaltyRate" :min="1" :max="100" :step="5" style="width:140px;" />
            <span style="margin-left:8px;color:#909399;font-size:12px;">扣除赢分的百分比</span>
          </el-form-item>
          <el-form-item label="赢分阈值(按底皮)">
            <div style="display:flex;flex-direction:column;gap:6px;">
              <div v-for="item in runAway.thresholdList" :key="item.dipi" style="display:flex;align-items:center;gap:8px;">
                <span style="width:80px;text-align:right;">底皮 {{ item.dipi }}：</span>
                <el-input-number v-model="item.value" :min="0" :step="100" size="small" style="width:140px;" />
              </div>
            </div>
          </el-form-item>
          <el-form-item>
            <el-button type="danger" :loading="runAway.saving" @click="handleSaveRunAway">保存逃跑惩罚配置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- ⭐ 赢家早退过路费配置区 -->
      <el-card class="runaway-card" shadow="never">
        <template #header>
          <span style="font-weight:600; color:#E6A23C;">赢家早退过路费</span>
        </template>
        <div class="test-tool-row" style="margin-bottom:12px;">
          <div class="test-tool-info">
            <span class="test-tool-label">过路费比例(%)</span>
            <span class="test-tool-desc">
              赢家离开房间时（含<b>周期结算后未补带入/站起</b>、以及周期进行中主动离开），按<b>本周期毛盈亏</b>的此比例扣给群主。<br/>
              <span style="color:#909399;">群主本人、无俱乐部、本周期不盈利不扣。设为 0 = 关闭此功能。</span>
            </span>
          </div>
          <el-input-number v-model="winnerEarlyLeave.rate" :min="0" :max="100" :step="5" style="width:140px;" />
        </div>
        <el-form label-width="130px" size="small" style="max-width:600px;">
          <el-form-item>
            <el-button type="warning" :loading="winnerEarlyLeave.saving" @click="handleSaveWinnerEarlyLeave">保存早退过路费配置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- ⭐ 丁皇吃席金额（按底皮，与可选底注列表联动） -->
      <el-card class="feast-card" shadow="never" style="margin-top:16px;">
        <template #header>
          <span style="font-weight:600; color:#E6A23C;">丁皇吃席金额（按底皮）</span>
        </template>
        <div style="margin-bottom:12px; font-size:12px; color:#909399;">
          开启「丁二皇吃席」的房间，本把有人持丁二皇（丁丁31 + 二红32）时，其余在座玩家各付一笔<b>桌上积分</b>席钱给丁皇，丁皇收席同样加桌上积分。<br/>
          金额<b>按底皮分别配置</b>，与「游戏参数 → 可选底注」列表联动；新底皮默认 <b>底皮 × 20</b>，可逐项修改。设为 0 表示该底皮不收席。<br/>
          <span style="color:#909399;">⚠️ 仅对创建时勾选了「丁二皇吃席」的房间生效。</span>
        </div>
        <div v-if="feast.list.length === 0" style="color:#C0C4CC; font-size:13px;">
          暂无可选底注，请先在「游戏参数」里配置 available_base_scores。
        </div>
        <div v-else style="display:flex; flex-wrap:wrap; gap:12px;">
          <div
            v-for="item in feast.list"
            :key="item.dipi"
            style="display:flex; align-items:center; gap:6px;"
          >
            <span style="width:90px; text-align:right; font-size:13px; color:#606266;">底皮 {{ item.dipi }}：</span>
            <el-input-number
              v-model="item.value"
              :min="0"
              :max="9999999"
              :step="item.dipi"
              size="small"
              style="width:150px;"
            />
          </div>
        </div>
        <div style="margin-top:14px; display:flex; gap:8px;">
          <el-button
            size="small"
            :disabled="feast.list.length === 0"
            @click="resetFeastToDefault"
          >重置为底皮×20</el-button>
          <el-button
            type="warning"
            size="small"
            :loading="feast.saving"
            :disabled="feast.list.length === 0"
            @click="handleSaveFeast"
          >保存丁皇吃席金额</el-button>
        </div>
      </el-card>

      <!-- ⭐ 房间列表显示 -->
      <el-card class="ghost-card" shadow="never" style="margin-top:16px;">
        <template #header>
          <span style="font-weight:600; color:#909399;">俱乐部房间列表显示</span>
        </template>
        <div class="test-tool-row">
          <div class="test-tool-info">
            <span class="test-tool-label">幽灵玩家展示时长（秒）</span>
            <span class="test-tool-desc">
              玩家真正离开房间后，在俱乐部房间列表里继续显示的时长，用于"假装房间有人"，吸引其他人进来。<br/>
              <span style="color:#909399;">⚠️ 与"留座离桌 grace"是两套独立机制（grace 保座位，ghost 只是列表里多展示一会）。</span><br/>
              <span style="color:#67C23A;">范围 0 ~ 86400 秒。设为 <b>0</b> 表示玩家离开后房间列表立即不显示，不再缓存幽灵。默认 300（5 分钟）。</span>
            </span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <el-input-number
              v-model="ghostExpireSeconds"
              :min="0"
              :max="86400"
              :step="30"
              size="small"
              style="width: 160px;"
            />
            <span style="color:#909399; font-size:12px;">秒</span>
            <el-button
              type="primary"
              size="small"
              :loading="ghostExpireSaving"
              @click="handleSaveGhostExpire"
            >
              保存
            </el-button>
          </div>
        </div>
      </el-card>

      <!-- ⭐ 周期结算补带入 -->
      <el-card class="period-settle-card" shadow="never" style="margin-top:16px;">
        <template #header>
          <span style="font-weight:600; color:#E6A23C;">周期结算 / 补带入</span>
        </template>
        <div class="test-tool-row">
          <div class="test-tool-info">
            <span class="test-tool-label">周期结算后保留座位等待时间（秒）</span>
            <span class="test-tool-desc">
              玩家在线时长达到房间结算周期、完成抽点后，<b>不立即站起</b>，在座位上等待从俱乐部补带入的秒数；超时未带入则自动站起离座。<br/>
              <span style="color:#909399;">与「留座放假 grace 300s」独立，仅作用于周期结算场景。默认 10 秒。</span><br/>
              <span style="color:#67C23A;">范围 3 ~ 120 秒。</span>
            </span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <el-input-number
              v-model="periodSettleBringInSeconds"
              :min="3"
              :max="120"
              :step="1"
              size="small"
              style="width: 160px;"
            />
            <span style="color:#909399; font-size:12px;">秒</span>
            <el-button
              type="warning"
              size="small"
              :loading="periodSettleBringInSaving"
              @click="handleSavePeriodSettleBringIn"
            >
              保存
            </el-button>
          </div>
        </div>
        <el-divider style="margin: 12px 0;" />
        <div class="test-tool-row">
          <div class="test-tool-info">
            <span class="test-tool-label">周期内筹码不足保留座位时间（秒）</span>
            <span class="test-tool-desc">
              玩家<b>在线时长未到房间结算周期</b>，且桌上筹码不够下局最低所需时，<b>不立即站起</b>，在<b>原座位</b>等待补筹码；超时未补才站起并广播 206。<br/>
              <span style="color:#909399;">与上项「周期到期补带入」独立；280 推送的倒计时秒数取本配置。默认 10 秒。</span><br/>
              <span style="color:#67C23A;">范围 3 ~ 120 秒。</span>
            </span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <el-input-number
              v-model="insufficientChipsProtectSeconds"
              :min="3"
              :max="120"
              :step="1"
              size="small"
              style="width: 160px;"
            />
            <span style="color:#909399; font-size:12px;">秒</span>
            <el-button
              type="warning"
              size="small"
              :loading="insufficientChipsProtectSaving"
              @click="handleSaveInsufficientChipsProtect"
            >
              保存
            </el-button>
          </div>
        </div>
      </el-card>

      <!-- ⭐ 单人坐下等待超时 -->
      <el-card class="solo-wait-card" shadow="never" style="margin-top:16px;">
        <template #header>
          <span style="font-weight:600; color:#F56C6C;">单人坐下等待超时</span>
        </template>
        <div class="test-tool-row" style="margin-bottom:16px;">
          <div class="test-tool-info">
            <span class="test-tool-label">启用单人等待超时</span>
            <span class="test-tool-desc">
              房间里<b>只有 1 个玩家坐下</b>且<b>游戏未开始</b>（WAITING）时，超时后系统自动让其站起（不算逃跑）。<br/>
              <span style="color:#909399;">两种场景都适用：① 新桌只有 1 人坐下没开过局；② 一局结束后其他人站起、只剩它自己。</span><br/>
              <span style="color:#909399;">有第 2 人坐下凑够开局人数 / 开局后，计时自动取消。仅「站起」一种处理方式（不踢出房间）。</span>
            </span>
          </div>
          <el-switch
            v-model="soloWait.enabled"
            active-text="开启"
            inactive-text="关闭"
            active-color="#F56C6C"
          />
        </div>
        <el-divider style="margin: 12px 0;" />
        <el-form label-width="130px" size="small" style="max-width:640px;">
          <el-form-item label="等待超时(秒)">
            <el-input-number
              v-model="soloWait.seconds"
              :min="30"
              :max="600"
              :step="10"
              style="width:160px;"
            />
            <span style="margin-left:8px;color:#909399;font-size:12px;">
              默认 120 秒（2 分钟），范围 30 ~ 600
            </span>
          </el-form-item>
          <el-form-item label="超时处理方式">
            <span style="color:#606266;font-size:13px;">自动站起（仍在房间内，可继续观战或再次坐下；不计逃跑罚金）</span>
          </el-form-item>
          <el-form-item>
            <el-button type="danger" :loading="soloWait.saving" @click="handleSaveSoloWait">
              保存单人等待配置
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- ⭐ 排队保队时间 -->
      <el-card class="queue-keep-card" shadow="never" style="margin-top:16px;">
        <template #header>
          <span style="font-weight:600; color:#409EFF;">排队保队时间</span>
        </template>
        <div class="test-tool-row">
          <div class="test-tool-info">
            <span class="test-tool-label">排队中离线保留时长</span>
            <span class="test-tool-desc">
              排队房间里正在排队的玩家<b>断线/退出程序</b>后，保留其排队资格（位次不变）的时长。<br/>
              <span style="color:#F56C6C;">默认 <b>0</b>：离线立即踢出队伍，后面的人自动前移。</span><br/>
              <span style="color:#67C23A;">设为 N&gt;0：离线后保留 N 秒，期间重连回来位次不丢；超时仍未回来则移出队伍。范围 0 ~ 600 秒。</span>
            </span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <el-input-number
              v-model="queueKeepSeconds"
              :min="0"
              :max="600"
              :step="5"
              size="small"
              style="width: 160px;"
            />
            <span style="color:#909399; font-size:12px;">秒</span>
            <el-button
              type="primary"
              size="small"
              :loading="queueKeepSaving"
              @click="handleSaveQueueKeep"
            >
              保存
            </el-button>
          </div>
        </div>
      </el-card>

      <!-- ⭐ GPS 防火牌配置 -->
      <el-card class="gps-card" shadow="never" style="margin-top:16px;">
        <template #header>
          <span style="font-weight:600; color:#409EFF;">GPS 防火牌</span>
        </template>
        <el-form label-width="180px" size="small" style="max-width:720px;">
          <el-form-item label="最小距离（米）">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <el-input-number
                v-model="gps.minDistanceMeters"
                :min="1"
                :max="99999"
                :step="1"
                style="width:160px;"
              />
              <span style="color:#909399;font-size:12px;">
                同房间已坐下玩家间最小允许距离，低于此值禁止坐下。范围 1 ~ 99999 米，默认 100。
              </span>
            </div>
          </el-form-item>
          <el-form-item label="GPS 数据有效期（秒）">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <el-input-number
                v-model="gps.maxAgeSeconds"
                :min="1"
                :max="3600"
                :step="1"
                style="width:160px;"
              />
              <span style="color:#909399;font-size:12px;">
                超过此时间未更新的 GPS 视为无效。建议 ≥ 上报间隔 + 30 秒，默认 90。
              </span>
            </div>
          </el-form-item>
          <el-form-item label="前端上报间隔（秒）">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <el-input-number
                v-model="gps.uploadIntervalSeconds"
                :min="5"
                :max="600"
                :step="1"
                style="width:160px;"
              />
              <span style="color:#909399;font-size:12px;">
                客户端 198 GPS_UPDATE 上报间隔，范围 5 ~ 600 秒，默认 60。
              </span>
            </div>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="gps.saving" @click="handleSaveGps">
              保存 GPS 配置
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- ⭐ 俱乐部聊天配置 -->
      <el-card class="chat-card" shadow="never">
        <template #header>
          <span style="font-weight:600; color:#409EFF;">俱乐部聊天</span>
        </template>
        <div class="test-tool-row">
          <div class="test-tool-info">
            <span class="test-tool-label">历史消息保留时长（小时）</span>
            <span class="test-tool-desc">
              超过该时长的聊天消息及其关联的图片/语音（MinIO）会被定时任务清理。
              范围 1 ~ 720 小时（30天）。默认 24 小时。
            </span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <el-input-number
              v-model="chatTtlHours"
              :min="1"
              :max="720"
              :step="1"
              size="small"
              style="width: 140px;"
            />
            <el-button
              type="primary"
              size="small"
              :loading="chatTtlSaving"
              @click="handleSaveChatTtl"
            >
              保存
            </el-button>
          </div>
        </div>
      </el-card>

      <!-- 分组 Tab -->
      <el-tabs v-model="activeGroup" class="config-tabs">
        <el-tab-pane
          v-for="group in configGroups"
          :key="group.key"
          :label="group.label"
          :name="group.key"
        >
          <el-table
            :data="group.items"
            v-loading="loading"
            stripe
            border
            style="width: 100%"
          >
            <el-table-column label="配置项" prop="configKey" width="280" />
            <el-table-column label="说明" prop="description" min-width="220" show-overflow-tooltip />
            <el-table-column label="当前值" prop="configValue" width="180">
              <template #default="{ row }">
                <el-tag type="info">{{ row.configValue }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="center">
              <template #default="{ row }">
                <el-button
                  type="primary"
                  link
                  :icon="Edit"
                  @click="openEdit(row)"
                >
                  编辑
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="`编辑配置 — ${editForm.key}`"
      width="480px"
      destroy-on-close
    >
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="80px">
        <el-form-item label="配置键">
          <el-input :value="editForm.key" disabled />
        </el-form-item>
        <el-form-item label="说明">
          <el-input :value="editForm.description" disabled type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="新值" prop="value">
          <el-input
            v-model="editForm.value"
            placeholder="请输入新值"
            clearable
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Edit } from '@element-plus/icons-vue'
import { getAllConfigs, updateConfig, getDealRules, setDealRules, getBonusPoolEnabled, toggleBonusPoolEnabled, getForceShowCardCost, setForceShowCardCost, getRegisterNicknameMaxLength, setRegisterNicknameMaxLength, getClubNameMaxLength, setClubNameMaxLength, getCommissionRateMax, setCommissionRateMax, getCommissionSettleDiamondCost, setCommissionSettleDiamondCost, getCommissionSettleDiamondTiers, setCommissionSettleDiamondTiers, getAvailableSettleTime, setAvailableSettleTime, getDebugTraceEnabled, toggleDebugTraceEnabled, getRunAwayPenaltyConfig, setRunAwayPenaltyConfig, getWinnerEarlyLeaveConfig, setWinnerEarlyLeaveConfig, getGpsConfig, setGpsConfig, getChatMessageTtl, setChatMessageTtl, getGhostExpireSeconds, setGhostExpireSeconds, getPeriodSettleBringInSeconds, setPeriodSettleBringInSeconds, getInsufficientChipsProtectSeconds, setInsufficientChipsProtectSeconds, getSoloWaitTimeout, setSoloWaitTimeout, getQueueKeepSeconds, setQueueKeepSeconds } from '../api/index'

const loading = ref(false)
const saving = ref(false)
const configs = ref([])
const activeGroup = ref('noscore')
const dialogVisible = ref(false)
const editFormRef = ref(null)

const editForm = ref({
  key: '',
  value: '',
  description: ''
})

const editRules = {
  value: [{ required: true, message: '请输入配置值', trigger: 'blur' }]
}

// ⭐ 指定发牌（测试）规则（存 Redis，按 userId/昵称/6位ID 指定目标玩家）
const dealRules = ref([])
const dealRulesSaving = ref(false)

function mapDealRule(r) {
  return {
    scenario: r.scenario,
    scenarioLabel: r.scenarioLabel || r.scenario,
    enabled: !!r.enabled,
    target: r.target != null ? String(r.target) : '',
    type: r.type != null ? r.type : 1,
    stage: r.stage != null ? r.stage : 4
  }
}

async function loadDealRules() {
  try {
    const res = await getDealRules()
    if (res.code === 200 && res.data) {
      dealRules.value = (res.data.rules || []).map(mapDealRule)
      if (Array.isArray(res.data.sanHuaTypeOptions) && res.data.sanHuaTypeOptions.length) {
        sanHuaTypeOptions.value = res.data.sanHuaTypeOptions
      }
      if (Array.isArray(res.data.sanHuaStageOptions) && res.data.sanHuaStageOptions.length) {
        sanHuaStageOptions.value = res.data.sanHuaStageOptions
      }
    }
  } catch { /* ignore */ }
}

async function handleSaveDealRules() {
  dealRulesSaving.value = true
  try {
    const payload = dealRules.value.map(r => ({
      scenario: r.scenario,
      enabled: !!r.enabled,
      target: (r.target || '').trim(),
      type: r.scenario === 'san_hua' ? r.type : undefined,
      stage: r.scenario === 'san_hua' ? r.stage : undefined
    }))
    const res = await setDealRules(payload)
    if (res.code === 200) {
      ElMessage.success('指定发牌规则已保存')
      if (res.data && Array.isArray(res.data.rules)) {
        dealRules.value = res.data.rules.map(mapDealRule)
      }
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    dealRulesSaving.value = false
  }
}

// ⭐ 三花下拉选项（指定发牌表格用；loadDealRules 会用后端值覆盖）
const sanHuaTypeOptions = ref([])
const sanHuaStageOptions = ref([
  { value: 3, label: '潜在三花', desc: '第3张后即潜在三花，第4张破坏' },
  { value: 4, label: '确认三花', desc: '凑齐四张确认三花' }
])

// ⭐ 全局奖池开关（针对所有房间）
const bonusPoolEnabled = ref(false)
const bonusPoolEnabledLoading = ref(false)

async function loadBonusPoolEnabled() {
  try {
    const res = await getBonusPoolEnabled()
    if (res.code === 200) {
      bonusPoolEnabled.value = res.data.enabled
    }
  } catch {
    // ignore
  }
}

async function handleToggleBonusPoolEnabled(val) {
  bonusPoolEnabledLoading.value = true
  try {
    const res = await toggleBonusPoolEnabled(val)
    if (res.code === 200) {
      ElMessage.success(val ? '全局奖池已开启（按各房间配置生效）' : '全局奖池已关闭（所有房间禁用）')
    } else {
      ElMessage.error(res.message || '操作失败')
      bonusPoolEnabled.value = !val
    }
  } catch {
    bonusPoolEnabled.value = !val
  } finally {
    bonusPoolEnabledLoading.value = false
  }
}

// ⭐ 注册昵称最大长度
const registerNicknameMaxLength = ref(4)
const nicknameSaving = ref(false)

async function loadRegisterNicknameMaxLength() {
  try {
    const res = await getRegisterNicknameMaxLength()
    if (res.code === 200) {
      registerNicknameMaxLength.value = res.data.maxLength
    }
  } catch {
    // ignore
  }
}

async function handleSaveRegisterNicknameMaxLength() {
  nicknameSaving.value = true
  try {
    const res = await setRegisterNicknameMaxLength(registerNicknameMaxLength.value)
    if (res.code === 200) {
      ElMessage.success('已保存：' + registerNicknameMaxLength.value + ' 个中文(' + (registerNicknameMaxLength.value * 2) + ' 半角)')
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    nicknameSaving.value = false
  }
}

const clubNameMaxLength = ref(4)
const clubNameSaving = ref(false)

async function loadClubNameMaxLength() {
  try {
    const res = await getClubNameMaxLength()
    if (res.code === 200) {
      clubNameMaxLength.value = res.data.maxLength
    }
  } catch {
    // ignore
  }
}

async function handleSaveClubNameMaxLength() {
  clubNameSaving.value = true
  try {
    const res = await setClubNameMaxLength(clubNameMaxLength.value)
    if (res.code === 200) {
      ElMessage.success('已保存俱乐部名称：' + clubNameMaxLength.value + ' 个中文(' + (clubNameMaxLength.value * 2) + ' 半角)')
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    clubNameSaving.value = false
  }
}

// ⭐ 周期返点扣群主钻石
const commissionSettleDiamondCost = ref(5)
const diamondCostSaving = ref(false)

async function loadCommissionSettleDiamondCost() {
  try {
    const res = await getCommissionSettleDiamondCost()
    if (res.code === 200) {
      commissionSettleDiamondCost.value = res.data.cost
    }
  } catch {
    // ignore
  }
}

async function handleSaveDiamondCost() {
  diamondCostSaving.value = true
  try {
    const res = await setCommissionSettleDiamondCost(commissionSettleDiamondCost.value)
    if (res.code === 200) {
      ElMessage.success('已保存：周期返点扣群主 ' + commissionSettleDiamondCost.value + ' 钻石/次')
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    diamondCostSaving.value = false
  }
}

// ⭐ v49 / v50: 周期返点扣群主钻石档位配置（1~5 个动态）
const diamondTiers = ref([
  { minutes: 30, cost: 5 }
])
const diamondTiersSaving = ref(false)

async function loadDiamondTiers() {
  try {
    const res = await getCommissionSettleDiamondTiers()
    if (res.code === 200 && Array.isArray(res.data?.tiers) && res.data.tiers.length > 0) {
      diamondTiers.value = res.data.tiers.map(t => ({
        minutes: Number(t.minutes) || 1,
        cost: Number(t.cost) || 0
      }))
    } else {
      diamondTiers.value = [{ minutes: 30, cost: 5 }]
    }
  } catch {
    // ignore
  }
}

function addDiamondTier() {
  if (diamondTiers.value.length >= 5) {
    ElMessage.warning('最多 5 个档位')
    return
  }
  const last = diamondTiers.value[diamondTiers.value.length - 1]
  diamondTiers.value.push({
    minutes: (last?.minutes || 30) + 30,
    cost: (last?.cost || 5) + 5
  })
}

function removeDiamondTier(index) {
  if (diamondTiers.value.length <= 1) {
    ElMessage.warning('至少保留 1 个档位')
    return
  }
  diamondTiers.value.splice(index, 1)
}

async function handleSaveDiamondTiers() {
  // 前端校验：minutes 互不重复
  const seen = new Set()
  for (const t of diamondTiers.value) {
    if (!t.minutes || t.minutes < 1) {
      ElMessage.error('档位结算时间必须 ≥ 1 分钟')
      return
    }
    if (seen.has(t.minutes)) {
      ElMessage.error('档位结算时间重复: ' + t.minutes + ' 分钟')
      return
    }
    seen.add(t.minutes)
  }

  diamondTiersSaving.value = true
  try {
    const res = await setCommissionSettleDiamondTiers(diamondTiers.value)
    if (res.code === 200) {
      ElMessage.success('已保存 ' + diamondTiers.value.length + ' 个档位')
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    diamondTiersSaving.value = false
  }
}

// ⭐ v50: 可选结算时间(创建房间下拉框选项)
const availableSettleTimeList = ref([{ value: 30 }])
const availableSettleTimeSaving = ref(false)

async function loadAvailableSettleTime() {
  try {
    const res = await getAvailableSettleTime()
    if (res.code === 200 && Array.isArray(res.data?.values) && res.data.values.length > 0) {
      availableSettleTimeList.value = res.data.values.map(v => ({ value: Number(v) || 1 }))
    } else {
      availableSettleTimeList.value = [{ value: 30 }]
    }
  } catch {
    // ignore
  }
}

function addAvailableSettleTime() {
  const last = availableSettleTimeList.value[availableSettleTimeList.value.length - 1]
  availableSettleTimeList.value.push({ value: (last?.value || 30) + 15 })
}

function removeAvailableSettleTime(index) {
  if (availableSettleTimeList.value.length <= 1) {
    ElMessage.warning('至少保留 1 个结算时间')
    return
  }
  availableSettleTimeList.value.splice(index, 1)
}

async function handleSaveAvailableSettleTime() {
  // 前端校验
  const seen = new Set()
  const values = []
  for (const item of availableSettleTimeList.value) {
    const v = Number(item.value)
    if (!v || v < 1) {
      ElMessage.error('结算时间必须 ≥ 1 分钟')
      return
    }
    if (seen.has(v)) {
      ElMessage.error('结算时间重复: ' + v + ' 分钟')
      return
    }
    seen.add(v)
    values.push(v)
  }

  availableSettleTimeSaving.value = true
  try {
    const res = await setAvailableSettleTime(values)
    if (res.code === 200) {
      ElMessage.success('已保存可选结算时间: ' + values.join(', ') + ' 分钟')
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    availableSettleTimeSaving.value = false
  }
}

// ⭐ 调试 trace 总开关
const debugTraceEnabled = ref(true)
const debugTraceSaving = ref(false)

async function loadDebugTraceEnabled() {
  try {
    const res = await getDebugTraceEnabled()
    if (res.code === 200) {
      debugTraceEnabled.value = res.data.enabled
    }
  } catch {
    // ignore
  }
}

async function handleToggleDebugTrace(val) {
  debugTraceSaving.value = true
  try {
    const res = await toggleDebugTraceEnabled(val)
    if (res.code === 200) {
      ElMessage.success(val ? '调试 trace 已开启(写所有日志)' : '调试 trace 已关闭(降低 IO 压力)')
    } else {
      ElMessage.error(res.message || '操作失败')
      debugTraceEnabled.value = !val
    }
  } catch (e) {
    ElMessage.error(e.message || '操作失败')
    debugTraceEnabled.value = !val
  } finally {
    debugTraceSaving.value = false
  }
}

// ⭐ 抽水上限(commission_rate_max)
const commissionRateMax = ref(10)
const commissionMaxSaving = ref(false)

async function loadCommissionRateMax() {
  try {
    const res = await getCommissionRateMax()
    if (res.code === 200) {
      commissionRateMax.value = res.data.max
    }
  } catch {
    // ignore
  }
}

async function handleSaveCommissionRateMax() {
  commissionMaxSaving.value = true
  try {
    const res = await setCommissionRateMax(commissionRateMax.value)
    if (res.code === 200) {
      ElMessage.success('已保存：抽水上限 ' + commissionRateMax.value + '%')
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    commissionMaxSaving.value = false
  }
}

// ⭐ 强制秀牌费用
const forceShowCardCost = ref(5)
const costSaving = ref(false)

async function loadForceShowCardCost() {
  try {
    const res = await getForceShowCardCost()
    if (res.code === 200) {
      forceShowCardCost.value = res.data.cost
    }
  } catch {
    // ignore
  }
}

async function handleSaveCost() {
  costSaving.value = true
  try {
    const res = await setForceShowCardCost(forceShowCardCost.value)
    if (res.code === 200) {
      ElMessage.success('强制秀牌费用已保存')
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch {
    // ignore
  } finally {
    costSaving.value = false
  }
}

// ⭐ 逃跑惩罚配置
const DIPI_LIST = [100, 200, 500, 1000, 2000, 5000, 10000]
const runAway = ref({
  enabled: false,
  time: 6,
  penaltyRate: 30,
  thresholdList: DIPI_LIST.map(d => ({ dipi: d, value: d * 2 })),
  saving: false
})

async function loadRunAwayConfig() {
  try {
    const res = await getRunAwayPenaltyConfig()
    if (res.code === 200) {
      const d = res.data
      runAway.value.enabled = d.enabled === true || d.enabled === 'true'
      runAway.value.time = d.time || 6
      runAway.value.penaltyRate = d.penaltyRate || 30
      // 解析阈值JSON
      if (d.threshold) {
        try {
          const thMap = typeof d.threshold === 'string' ? JSON.parse(d.threshold) : d.threshold
          runAway.value.thresholdList = DIPI_LIST.map(dipi => ({
            dipi,
            value: thMap[String(dipi)] || dipi * 2
          }))
        } catch { /* 解析失败用默认值 */ }
      }
    }
  } catch { /* ignore */ }
}

async function handleSaveRunAway() {
  runAway.value.saving = true
  try {
    // 构建阈值JSON
    const thresholdObj = {}
    runAway.value.thresholdList.forEach(item => {
      thresholdObj[String(item.dipi)] = item.value
    })
    const res = await setRunAwayPenaltyConfig({
      enabled: runAway.value.enabled,
      threshold: JSON.stringify(thresholdObj),
      time: runAway.value.time,
      penaltyRate: runAway.value.penaltyRate
    })
    if (res.code === 200) {
      ElMessage.success('逃跑惩罚配置已保存')
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch { /* ignore */ } finally {
    runAway.value.saving = false
  }
}

// ⭐ 赢家早退过路费（赢家主动离开 / 周期结算后未续/站起，按本周期毛盈亏抽比例给群主）
const winnerEarlyLeave = ref({
  rate: 30,
  saving: false
})

async function loadWinnerEarlyLeaveConfig() {
  try {
    const res = await getWinnerEarlyLeaveConfig()
    if (res.code === 200 && res.data) {
      winnerEarlyLeave.value.rate = res.data.rate != null ? res.data.rate : 30
    }
  } catch { /* ignore */ }
}

async function handleSaveWinnerEarlyLeave() {
  winnerEarlyLeave.value.saving = true
  try {
    const res = await setWinnerEarlyLeaveConfig({ rate: winnerEarlyLeave.value.rate })
    if (res.code === 200) {
      ElMessage.success('赢家早退过路费配置已保存')
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch { /* ignore */ } finally {
    winnerEarlyLeave.value.saving = false
  }
}

// ⭐ 丁皇吃席金额（按底皮 JSON，与可选底注列表联动；默认底皮×20）
const FEAST_DEFAULT_MULTIPLIER = 20
const FEAST_CONFIG_KEY = 'ding_er_huang_feast_amount'
const feast = ref({
  list: [],   // [{ dipi, value }]
  saving: false
})

// 从已加载的 configs 解析底皮列表 + 现有席钱 JSON，构建可编辑行
function buildFeastFromConfigs() {
  const map = {}
  configs.value.forEach(c => { map[c.configKey] = c.configValue })

  let bases = []
  const baseStr = map['available_base_scores']
  if (baseStr) {
    bases = String(baseStr)
      .split(',')
      .map(s => Number(String(s).trim()))
      .filter(n => Number.isFinite(n) && n > 0)
  }
  // 去重保序
  bases = [...new Set(bases)]

  let feastMap = {}
  const fStr = map[FEAST_CONFIG_KEY]
  if (fStr) {
    const t = String(fStr).trim()
    try {
      if (t.startsWith('{')) {
        feastMap = JSON.parse(t)
      } else {
        // 兼容旧的纯数字配置（全底皮统一金额）
        const n = Number(t)
        if (Number.isFinite(n)) bases.forEach(b => { feastMap[String(b)] = n })
      }
    } catch { /* 解析失败用默认值 */ }
  }

  feast.value.list = bases.map(b => ({
    dipi: b,
    value: feastMap[String(b)] != null ? Number(feastMap[String(b)]) : b * FEAST_DEFAULT_MULTIPLIER
  }))
}

function resetFeastToDefault() {
  feast.value.list = feast.value.list.map(it => ({
    dipi: it.dipi,
    value: it.dipi * FEAST_DEFAULT_MULTIPLIER
  }))
}

async function handleSaveFeast() {
  const obj = {}
  for (const item of feast.value.list) {
    const v = Number(item.value)
    if (!Number.isFinite(v) || v < 0) {
      ElMessage.error('底皮 ' + item.dipi + ' 的席钱必须 ≥ 0')
      return
    }
    obj[String(item.dipi)] = Math.round(v)
  }
  feast.value.saving = true
  try {
    const res = await updateConfig(
      FEAST_CONFIG_KEY,
      JSON.stringify(obj),
      '丁皇吃席金额（按底皮JSON配置，与可选底注列表联动，默认底皮×20倍）'
    )
    if (res.code === 200) {
      ElMessage.success('丁皇吃席金额已保存')
      await loadConfigs()  // 重新拉取并重建行
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    feast.value.saving = false
  }
}

// ⭐ 幽灵玩家展示时长（玩家离开房间后在俱乐部房间列表里继续显示的时长）
const ghostExpireSeconds = ref(300)
const ghostExpireSaving = ref(false)

async function loadGhostExpireSeconds() {
  try {
    const res = await getGhostExpireSeconds()
    if (res.code === 200 && res.data) {
      ghostExpireSeconds.value = Number(res.data.seconds) || 0
    }
  } catch { /* ignore */ }
}

async function handleSaveGhostExpire() {
  const s = Number(ghostExpireSeconds.value)
  if (!(s >= 0 && s <= 86400)) {
    ElMessage.warning('请输入 0 ~ 86400 秒')
    return
  }
  ghostExpireSaving.value = true
  try {
    const res = await setGhostExpireSeconds(s)
    if (res.code === 200) {
      ElMessage.success(s === 0 ? '已保存:玩家离开后房间列表立即不显示' : '已保存:' + s + ' 秒')
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    ghostExpireSaving.value = false
  }
}

// ⭐ 周期结算后补带入等待秒数
const periodSettleBringInSeconds = ref(10)
const periodSettleBringInSaving = ref(false)

// ⭐ 周期内筹码不足座位保护秒数
const insufficientChipsProtectSeconds = ref(10)
const insufficientChipsProtectSaving = ref(false)

async function loadPeriodSettleBringInSeconds() {
  try {
    const res = await getPeriodSettleBringInSeconds()
    if (res.code === 200 && res.data) {
      periodSettleBringInSeconds.value = Number(res.data.seconds) || 10
    }
  } catch { /* ignore */ }
}

async function handleSavePeriodSettleBringIn() {
  const s = Number(periodSettleBringInSeconds.value)
  if (!(s >= 3 && s <= 120)) {
    ElMessage.warning('请输入 3 ~ 120 秒')
    return
  }
  periodSettleBringInSaving.value = true
  try {
    const res = await setPeriodSettleBringInSeconds(s)
    if (res.code === 200) {
      ElMessage.success('已保存:周期结算后等待 ' + s + ' 秒补带入')
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    periodSettleBringInSaving.value = false
  }
}

async function loadInsufficientChipsProtectSeconds() {
  try {
    const res = await getInsufficientChipsProtectSeconds()
    if (res.code === 200 && res.data) {
      insufficientChipsProtectSeconds.value = Number(res.data.seconds) || 10
    }
  } catch { /* ignore */ }
}

async function handleSaveInsufficientChipsProtect() {
  const s = Number(insufficientChipsProtectSeconds.value)
  if (!(s >= 3 && s <= 120)) {
    ElMessage.warning('请输入 3 ~ 120 秒')
    return
  }
  insufficientChipsProtectSaving.value = true
  try {
    const res = await setInsufficientChipsProtectSeconds(s)
    if (res.code === 200) {
      ElMessage.success('已保存:周期内筹码不足保护 ' + s + ' 秒')
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    insufficientChipsProtectSaving.value = false
  }
}

// ⭐ 单人坐下等待超时（仅"自动站起"一种处理方式）
const soloWait = ref({
  enabled: true,
  seconds: 120,
  saving: false
})

function applySoloWaitConfig(data) {
  if (!data) return
  soloWait.value.enabled = data.enabled === true || data.enabled === 'true'
  soloWait.value.seconds = Number(data.seconds) || 120
}

async function loadSoloWaitTimeout() {
  try {
    const res = await getSoloWaitTimeout()
    if (res.code === 200) {
      applySoloWaitConfig(res.data)
    }
  } catch { /* ignore */ }
}

async function handleSaveSoloWait() {
  const s = Number(soloWait.value.seconds)
  if (!(s >= 30 && s <= 600)) {
    ElMessage.warning('请输入 30 ~ 600 秒')
    return
  }
  soloWait.value.saving = true
  try {
    const res = await setSoloWaitTimeout({
      enabled: soloWait.value.enabled,
      seconds: s
    })
    if (res.code === 200) {
      applySoloWaitConfig(res.data)
      ElMessage.success(
        soloWait.value.enabled
          ? `已保存：${s} 秒超时后自动站起`
          : '已保存：单人等待超时已关闭'
      )
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    soloWait.value.saving = false
  }
}

// ⭐ 排队保队时间（排队中玩家离线后保留排队资格的秒数，0=离线立即踢队）
const queueKeepSeconds = ref(0)
const queueKeepSaving = ref(false)

async function loadQueueKeepSeconds() {
  try {
    const res = await getQueueKeepSeconds()
    if (res.code === 200 && res.data) {
      queueKeepSeconds.value = Number(res.data.seconds) || 0
    }
  } catch { /* ignore */ }
}

async function handleSaveQueueKeep() {
  const s = Number(queueKeepSeconds.value)
  if (!(s >= 0 && s <= 600)) {
    ElMessage.warning('请输入 0 ~ 600 秒')
    return
  }
  queueKeepSaving.value = true
  try {
    const res = await setQueueKeepSeconds(s)
    if (res.code === 200) {
      ElMessage.success(s === 0 ? '已保存：排队玩家离线立即踢出队伍' : '已保存：离线保队 ' + s + ' 秒')
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    queueKeepSaving.value = false
  }
}

// ⭐ GPS 防火牌配置
const gps = ref({
  minDistanceMeters: 100,
  maxAgeSeconds: 90,
  uploadIntervalSeconds: 60,
  saving: false
})

function applyGpsConfig(data) {
  if (!data) return
  gps.value.minDistanceMeters = Number(data.minDistanceMeters) || 100
  gps.value.maxAgeSeconds = Number(data.maxAgeSeconds) || 90
  gps.value.uploadIntervalSeconds = Number(data.uploadIntervalSeconds) || 60
}

async function loadGpsConfig() {
  try {
    const res = await getGpsConfig()
    if (res.code === 200) {
      applyGpsConfig(res.data)
    }
  } catch { /* ignore */ }
}

async function handleSaveGps() {
  const min = Number(gps.value.minDistanceMeters)
  const maxAge = Number(gps.value.maxAgeSeconds)
  const interval = Number(gps.value.uploadIntervalSeconds)
  if (!(min >= 1 && min <= 99999)) {
    ElMessage.warning('最小距离请输入 1 ~ 99999 米')
    return
  }
  if (!(maxAge >= 1 && maxAge <= 3600)) {
    ElMessage.warning('GPS 有效期请输入 1 ~ 3600 秒')
    return
  }
  if (!(interval >= 5 && interval <= 600)) {
    ElMessage.warning('上报间隔请输入 5 ~ 600 秒')
    return
  }
  gps.value.saving = true
  try {
    const res = await setGpsConfig({
      minDistanceMeters: min,
      maxAgeSeconds: maxAge,
      uploadIntervalSeconds: interval
    })
    if (res.code === 200) {
      applyGpsConfig({ minDistanceMeters: min, maxAgeSeconds: maxAge, uploadIntervalSeconds: interval })
      ElMessage.success('GPS 配置已保存：最小距离 ' + min + ' 米')
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    gps.value.saving = false
  }
}

// ⭐ 俱乐部聊天消息保留时长
const chatTtlHours = ref(24)
const chatTtlSaving = ref(false)

async function loadChatTtl() {
  try {
    const res = await getChatMessageTtl()
    if (res.code === 200 && res.data) {
      chatTtlHours.value = Number(res.data.hours) || 24
    }
  } catch { /* ignore */ }
}

async function handleSaveChatTtl() {
  const h = Number(chatTtlHours.value)
  if (!(h >= 1 && h <= 720)) {
    ElMessage.warning('请输入 1 ~ 720 小时')
    return
  }
  chatTtlSaving.value = true
  try {
    const res = await setChatMessageTtl(h)
    if (res.code === 200) {
      ElMessage.success('聊天保留时长已保存')
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch { /* ignore */ } finally {
    chatTtlSaving.value = false
  }
}

// 配置分组定义
const GROUP_DEFS = [
  {
    key: 'noscore',
    label: '无分模式',
    keys: ['no_score_rebuy_threshold', 'no_score_default_chips']
  },
  {
    key: 'game',
    label: '游戏参数',
    keys: [
      'available_base_scores',
      'available_mango_max',
      'available_settle_time',
      'commission_rate_max',
      'min_bring_in_multiplier',
      'operation_timeout',
      'splitting_timeout',
      'deal_animation_delay',
      'next_round_delay',
      'settle_show_delay',
      'game_start_delay',
      'viewer_expire_hours'
    ]
  },
  {
    key: 'club',
    label: '俱乐部费用',
    keys: [
      'create_normal_club_diamond_cost',
      'update_normal_club_diamond_cost',
      'create_alliance_club_diamond_cost',
      'update_alliance_club_diamond_cost',
      'create_normal_game_diamond_cost',
      'create_alliance_game_diamond_cost',
      'max_club_count_per_user'
    ]
  },
  {
    key: 'register',
    label: '注册奖励',
    keys: ['register_gift_balance', 'register_gift_diamond']
  },
  {
    key: 'other',
    label: '其他',
    keys: []  // 兜底：不属于上面任何分组的配置
  }
]

// GPS 配置键：由上方专用卡片管理，不在下方 Tab 表格重复展示
const GPS_CONFIG_KEYS = [
  'gps_min_distance_meters',
  'gps_max_age_seconds',
  'gps_upload_interval_seconds'
]

// 由专用卡片管理、不在下方 Tab 表格重复展示的键
const DEDICATED_CONFIG_KEYS = [
  'ding_er_huang_feast_amount'  // 丁皇吃席金额（按底皮专用卡片）
]

// 所有已分类的 key 集合
const classifiedKeys = new Set([
  ...GROUP_DEFS.flatMap(g => g.keys),
  ...GPS_CONFIG_KEYS,
  ...DEDICATED_CONFIG_KEYS
])

// 计算分组数据
const configGroups = computed(() => {
  const map = {}
  configs.value.forEach(c => { map[c.configKey] = c })

  return GROUP_DEFS.map(g => {
    let items
    if (g.key === 'other') {
      // 兜底分组：收录所有未分类的
      items = configs.value.filter(c => !classifiedKeys.has(c.configKey))
    } else {
      items = g.keys.map(k => map[k]).filter(Boolean)
    }
    return { ...g, items }
  }).filter(g => g.items.length > 0 || g.key === 'noscore')
})

async function loadConfigs() {
  loading.value = true
  try {
    const res = await getAllConfigs()
    if (res.code === 200) {
      configs.value = res.data || []
      buildFeastFromConfigs()  // ⭐ 重建丁皇吃席按底皮编辑行（依赖 available_base_scores）
    } else {
      ElMessage.error(res.message || '加载失败')
    }
  } catch {
    // 错误已在拦截器处理
  } finally {
    loading.value = false
  }
}

function openEdit(row) {
  editForm.value = {
    key: row.configKey,
    value: row.configValue,
    description: row.description || ''
  }
  dialogVisible.value = true
}

async function handleSave() {
  const valid = await editFormRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    const res = await updateConfig(
      editForm.value.key,
      editForm.value.value,
      editForm.value.description
    )
    if (res.code === 200) {
      ElMessage.success('保存成功')
      dialogVisible.value = false
      await loadConfigs()
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch {
    // 错误已在拦截器处理
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadConfigs()
  loadDealRules()  // ⭐ 指定发牌（测试）规则（Redis）
  loadBonusPoolEnabled()
  loadDebugTraceEnabled()
  loadRegisterNicknameMaxLength()
  loadClubNameMaxLength()
  loadCommissionRateMax()
  loadCommissionSettleDiamondCost()
  loadDiamondTiers()  // ⭐ v49 / v50: 加载档位配置（1~5 动态）
  loadAvailableSettleTime()  // ⭐ v50: 加载可选结算时间
  loadForceShowCardCost()
  loadRunAwayConfig()
  loadWinnerEarlyLeaveConfig()
  loadGpsConfig()
  loadChatTtl()
  loadGhostExpireSeconds()
  loadPeriodSettleBringInSeconds()
  loadInsufficientChipsProtectSeconds()
  loadSoloWaitTimeout()
  loadQueueKeepSeconds()  // ⭐ 排队保队时间
})
</script>

<style scoped>
.config-page {
  min-height: calc(100vh - 108px);
}

.page-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.test-tools-card {
  margin-bottom: 16px;
  border: 1px solid #E6A23C;
  border-radius: 8px;
  background: #FDF6EC;
}

.test-tool-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.test-tool-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.test-tool-label {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.test-tool-desc {
  font-size: 12px;
  color: #909399;
}

.runaway-card {
  margin-bottom: 16px;
  border: 1px solid #F56C6C;
  border-radius: 8px;
  background: #FEF0F0;
}

.gps-card {
  margin-bottom: 16px;
  border: 1px solid #409EFF;
  border-radius: 8px;
  background: #ECF5FF;
}

.chat-card {
  margin-bottom: 16px;
  border: 1px solid #409EFF;
  border-radius: 8px;
  background: #ECF5FF;
}

.ghost-card {
  margin-bottom: 16px;
  border: 1px solid #909399;
  border-radius: 8px;
  background: #F4F4F5;
}

.feast-card {
  margin-bottom: 16px;
  border: 1px solid #E6A23C;
  border-radius: 8px;
  background: #FDF6EC;
}

.solo-wait-card {
  margin-bottom: 16px;
  border: 1px solid #F56C6C;
  border-radius: 8px;
  background: #FEF0F0;
}

.config-tabs {
  margin-top: 4px;
}
</style>
