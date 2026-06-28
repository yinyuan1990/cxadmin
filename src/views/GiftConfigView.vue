<template>
  <div class="gift-page">
    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <span class="title">礼物管理</span>
          <div>
            <el-button type="primary" :icon="Refresh" :loading="loading" @click="loadGifts">刷新</el-button>
            <el-button type="success" :icon="Plus" @click="openAdd">新增礼物</el-button>
          </div>
        </div>
      </template>

      <el-table :data="gifts" v-loading="loading" stripe border style="width: 100%">
        <el-table-column label="ID" prop="id" width="70" align="center" />
        <el-table-column label="giftKey" prop="giftKey" width="140" />
        <el-table-column label="礼物名称" prop="name" width="140" />
        <el-table-column label="价格" width="120" align="center">
          <template #default="{ row }">
            <span style="font-weight:600;">{{ row.costScore }}</span>
          </template>
        </el-table-column>
        <el-table-column label="计费类型" width="140" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.costType === 'DIAMOND'" type="warning">钻石</el-tag>
            <el-tag v-else-if="row.costType === 'CLUB_SCORE'" type="primary">俱乐部积分</el-tag>
            <el-tag v-else type="success">桌面带入</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="图标" prop="iconUrl" min-width="180" show-overflow-tooltip />
        <el-table-column label="动画key" prop="animKey" width="120" />
        <el-table-column label="排序" prop="sortNo" width="80" align="center" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.enabled" type="success">上架</el-tag>
            <el-tag v-else type="danger">下架</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link :icon="Edit" @click="openEdit(row)">编辑</el-button>
            <el-button type="danger" link :icon="Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑礼物' : '新增礼物'" width="500px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="giftKey" prop="giftKey">
          <el-input v-model="form.giftKey" placeholder="前端匹配 key,如 rose" :disabled="!!form.id" />
        </el-form-item>
        <el-form-item label="礼物名称" prop="name">
          <el-input v-model="form.name" placeholder="如：玫瑰" />
        </el-form-item>
        <el-form-item label="计费类型" prop="costType">
          <el-radio-group v-model="form.costType">
            <el-radio label="SCORE">桌面带入（默认，扣 currentChips）</el-radio>
            <el-radio label="CLUB_SCORE">俱乐部积分（非带入，扣账户余额）</el-radio>
            <el-radio label="DIAMOND">钻石</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="价格" prop="costScore">
          <el-input-number v-model="form.costScore" :min="0" :max="999999" :step="1" style="width:200px;" />
          <span style="margin-left:8px;color:#909399;font-size:12px;">
            {{ form.costType === 'DIAMOND' ? '钻石/次' : (form.costType === 'CLUB_SCORE' ? '俱乐部积分/次' : '桌面带入/次') }}
          </span>
        </el-form-item>
        <el-form-item label="图标 URL">
          <el-input v-model="form.iconUrl" placeholder="可选,前端也可用 giftKey 本地匹配" />
        </el-form-item>
        <el-form-item label="动画 key">
          <el-input v-model="form.animKey" placeholder="可选" />
        </el-form-item>
        <el-form-item label="排序权重">
          <el-input-number v-model="form.sortNo" :min="0" :max="9999" :step="1" style="width:200px;" />
          <span style="margin-left:8px;color:#909399;font-size:12px;">数字小的排前面</span>
        </el-form-item>
        <el-form-item label="是否上架">
          <el-switch v-model="form.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Edit, Delete, Plus } from '@element-plus/icons-vue'
import { adminGiftList, adminGiftSave, adminGiftDelete } from '../api/index'

const loading = ref(false)
const saving = ref(false)
const gifts = ref([])
const dialogVisible = ref(false)
const formRef = ref(null)

const form = ref({
  id: null,
  giftKey: '',
  name: '',
  costType: 'SCORE',
  costScore: 0,
  iconUrl: '',
  animKey: '',
  sortNo: 0,
  enabled: true
})

const rules = {
  giftKey: [{ required: true, message: '请输入 giftKey', trigger: 'blur' }],
  name: [{ required: true, message: '请输入礼物名称', trigger: 'blur' }],
  costType: [{ required: true, message: '请选择计费类型', trigger: 'change' }],
  costScore: [{ required: true, message: '请输入价格', trigger: 'blur' }]
}

async function loadGifts() {
  loading.value = true
  try {
    const res = await adminGiftList()
    if (res.code === 200) {
      gifts.value = res.data || []
    } else {
      ElMessage.error(res.message || '加载失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function resetForm() {
  form.value = {
    id: null,
    giftKey: '',
    name: '',
    costType: 'SCORE',
    costScore: 0,
    iconUrl: '',
    animKey: '',
    sortNo: 0,
    enabled: true
  }
}

function openAdd() {
  resetForm()
  dialogVisible.value = true
}

function openEdit(row) {
  form.value = {
    id: row.id,
    giftKey: row.giftKey,
    name: row.name,
    costType: row.costType || 'SCORE',
    costScore: row.costScore || 0,
    iconUrl: row.iconUrl || '',
    animKey: row.animKey || '',
    sortNo: row.sortNo || 0,
    enabled: row.enabled !== false
  }
  dialogVisible.value = true
}

async function handleSave() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    saving.value = true
    try {
      const res = await adminGiftSave(form.value)
      if (res.code === 200) {
        ElMessage.success(form.value.id ? '更新成功' : '新增成功')
        dialogVisible.value = false
        await loadGifts()
      } else {
        ElMessage.error(res.message || '保存失败')
      }
    } catch (e) {
      ElMessage.error(e.message || '保存失败')
    } finally {
      saving.value = false
    }
  })
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定要删除礼物【${row.name}】吗？`, '提示', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
    const res = await adminGiftDelete(row.id)
    if (res.code === 200) {
      ElMessage.success('已删除')
      await loadGifts()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (e) {
    if (e === 'cancel') return
    ElMessage.error(e.message || '删除失败')
  }
}

onMounted(() => {
  loadGifts()
})
</script>

<style scoped>
.gift-page {
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
  font-size: 16px;
  font-weight: 600;
}
</style>
