<template>
  <div class="prize-page">
    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <span class="title">实物管理 · 奖品库</span>
          <el-button type="primary" size="small" @click="openEdit(null)">+ 添加奖品</el-button>
        </div>
      </template>

      <el-alert type="info" :closable="false" style="margin-bottom:12px;"
        title="MTT 实物赛建赛时,奖品清单从这里下拉选择。已建比赛存的是快照,后改/删奖品不影响历史比赛。" />

      <el-table :data="items" border size="small" v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column label="图标" width="80" align="center">
          <template #default="{ row }">
            <el-image v-if="row.icon" :src="row.icon" :preview-src-list="[row.icon]" preview-teleported
              style="width:44px;height:44px;border-radius:6px;" fit="cover" />
            <span v-else class="tip">无</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="名称" min-width="130" />
        <el-table-column prop="detail" label="详情" min-width="200" show-overflow-tooltip />
        <el-table-column label="类型" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.isVirtual?'info':'warning'">{{ row.isVirtual?'虚拟':'实物' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.status===1?'success':'info'">{{ row.status===1?'上架':'下架' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="160" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" :type="row.status===1?'info':'success'" @click="toggle(row)">
              {{ row.status===1?'下架':'上架' }}
            </el-button>
            <el-button size="small" type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑 -->
    <el-dialog v-model="editVisible" :title="form.id ? '编辑奖品' : '添加奖品'" width="480px">
      <el-form label-width="80px" size="small">
        <el-form-item label="名称">
          <el-input v-model="form.name" placeholder="如 iPhone 17" maxlength="64" />
        </el-form-item>
        <el-form-item label="图标">
          <div class="icon-upload">
            <el-upload
              :show-file-list="false"
              accept="image/*"
              :before-upload="handleUpload"
            >
              <div v-if="form.icon" class="icon-preview">
                <el-image :src="form.icon" style="width:80px;height:80px;border-radius:8px;" fit="cover" />
                <div class="icon-mask">点击更换</div>
              </div>
              <div v-else class="icon-empty" v-loading="uploading">
                <el-icon size="26"><Plus /></el-icon>
                <div class="tip" style="margin:0;">上传图片</div>
              </div>
            </el-upload>
            <el-button v-if="form.icon" size="small" text type="danger" @click="form.icon = ''">移除图标</el-button>
          </div>
        </el-form-item>
        <el-form-item label="详情">
          <el-input v-model="form.detail" type="textarea" :rows="3" placeholder="简介/规格(可留空)" maxlength="512" show-word-limit />
        </el-form-item>
        <el-form-item label="类型">
          <el-radio-group v-model="form.isVirtual">
            <el-radio :value="false">实物(需收货地址派送)</el-radio>
            <el-radio :value="true">虚拟(直接核销)</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible=false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { mttPrizeItemList, mttPrizeItemSave, mttPrizeItemDelete, uploadImage } from '../api/index'

const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)
const items = ref([])
const editVisible = ref(false)
const form = ref(emptyForm())

function emptyForm() {
  return { id: null, name: '', icon: '', detail: '', isVirtual: false }
}

async function load() {
  loading.value = true
  try {
    const res = await mttPrizeItemList(true)
    if (res.code === 200) items.value = res.data || []
  } finally {
    loading.value = false
  }
}

function openEdit(row) {
  form.value = row
    ? { id: row.id, name: row.name, icon: row.icon || '', detail: row.detail || '', isVirtual: !!row.isVirtual }
    : emptyForm()
  editVisible.value = true
}

/** el-upload before-upload 钩子：自己传,返回 false 阻止默认行为 */
async function handleUpload(rawFile) {
  if (rawFile.size > 5 * 1024 * 1024) {
    ElMessage.warning('图片不能超过 5MB')
    return false
  }
  uploading.value = true
  try {
    const res = await uploadImage(rawFile)
    if (res.code === 200 && res.data) {
      form.value.icon = res.data
      ElMessage.success('图片已上传')
    } else {
      ElMessage.error(res.message || '上传失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '上传失败')
  } finally {
    uploading.value = false
  }
  return false
}

async function save() {
  if (!form.value.name || !form.value.name.trim()) { ElMessage.warning('奖品名称必填'); return }
  saving.value = true
  try {
    const res = await mttPrizeItemSave(form.value)
    if (res.code === 200) {
      ElMessage.success('已保存')
      editVisible.value = false
      load()
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } finally {
    saving.value = false
  }
}

async function toggle(row) {
  const res = await mttPrizeItemSave({ ...row, status: row.status === 1 ? 0 : 1 })
  if (res.code === 200) { ElMessage.success(row.status === 1 ? '已下架' : '已上架'); load() }
  else ElMessage.error(res.message || '操作失败')
}

async function remove(row) {
  try {
    await ElMessageBox.confirm(`确认删除奖品「${row.name}」？已建比赛的奖品快照不受影响。`, '删除奖品', { type: 'warning' })
  } catch { return }
  const res = await mttPrizeItemDelete(row.id)
  if (res.code === 200) { ElMessage.success('已删除'); load() }
  else ElMessage.error(res.message || '删除失败')
}

onMounted(load)
</script>

<style scoped>
.prize-page { padding: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.title { font-weight: 600; font-size: 16px; }
.tip { font-size: 12px; color: #909399; }
.icon-upload { display: flex; align-items: center; gap: 10px; }
.icon-empty {
  width: 80px; height: 80px; border: 1px dashed #cdd0d6; border-radius: 8px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  color: #909399; cursor: pointer; transition: border-color .2s;
}
.icon-empty:hover { border-color: #409eff; color: #409eff; }
.icon-preview { position: relative; cursor: pointer; }
.icon-mask {
  position: absolute; inset: 0; background: rgba(0,0,0,.45); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; border-radius: 8px; opacity: 0; transition: opacity .2s;
}
.icon-preview:hover .icon-mask { opacity: 1; }
</style>
