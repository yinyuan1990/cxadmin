<template>
  <el-container class="layout">
    <!-- 侧边栏 -->
    <el-aside width="220px" class="sidebar">
      <div class="sidebar-logo">
        <span class="logo-text">扯旋管理后台</span>
      </div>

      <el-menu
        :default-active="$route.path"
        router
        background-color="#1a1a2e"
        text-color="#c0c4cc"
        active-text-color="#409eff"
        class="sidebar-menu"
      >
        <el-menu-item index="/config">
          <el-icon><Setting /></el-icon>
          <span>系统配置</span>
        </el-menu-item>

        <el-menu-item index="/users">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item>

        <el-menu-item index="/credit">
          <el-icon><Wallet /></el-icon>
          <span>授信日志</span>
        </el-menu-item>

        <el-menu-item index="/commission">
          <el-icon><Money /></el-icon>
          <span>积分反点</span>
        </el-menu-item>

        <el-menu-item index="/super-club">
          <el-icon><Connection /></el-icon>
          <span>大联盟俱乐部</span>
        </el-menu-item>

        <el-menu-item index="/game-record">
          <el-icon><Document /></el-icon>
          <span>战绩明细</span>
        </el-menu-item>

        <el-menu-item index="/customer-service">
          <el-icon><ChatDotRound /></el-icon>
          <span>客服系统</span>
        </el-menu-item>

        <el-menu-item index="/metrics">
          <el-icon><Monitor /></el-icon>
          <span>服务器监控</span>
        </el-menu-item>

        <el-menu-item index="/gift-config">
          <el-icon><Present /></el-icon>
          <span>礼物管理</span>
        </el-menu-item>

        <el-menu-item index="/robot">
          <el-icon><MagicStick /></el-icon>
          <span>俱乐部管理</span>
        </el-menu-item>

        <el-menu-item index="/system-ops">
          <el-icon><Tickets /></el-icon>
          <span>系统运维</span>
        </el-menu-item>

        <el-menu-item index="/stats" disabled>
          <el-icon><DataAnalysis /></el-icon>
          <span>数据统计</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 右侧主区域 -->
    <el-container>
      <!-- 顶栏 -->
      <el-header class="header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="admin-info">
              <el-icon><UserFilled /></el-icon>
              {{ auth.username }}
              <el-icon class="ml-1"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout" :icon="SwitchButton">
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 内容区 -->
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import {
  Setting, User, DataAnalysis, Wallet, Money, Connection, Document, ChatDotRound, Monitor,
  Present, MagicStick, Tickets, UserFilled, ArrowDown, SwitchButton
} from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const currentTitle = computed(() => route.meta?.title || '首页')

function handleCommand(cmd) {
  if (cmd === 'logout') {
    ElMessageBox.confirm('确认退出登录？', '提示', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      auth.logout()
      router.push('/login')
    }).catch(() => {})
  }
}
</script>

<style scoped>
.layout {
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  background: #1a1a2e;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100vh;
}

.sidebar-logo {
  height: 60px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.logo-text {
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 1px;
}

.sidebar-menu {
  border-right: none;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

/* 菜单独立滚动条样式（窄、暗色，菜单项变多时可滚） */
.sidebar-menu::-webkit-scrollbar {
  width: 6px;
}
.sidebar-menu::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.18);
  border-radius: 3px;
}
.sidebar-menu::-webkit-scrollbar-track {
  background: transparent;
}

.header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  border-bottom: 1px solid #ebeef5;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  height: 60px;
  flex-shrink: 0;
}

.admin-info {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: #606266;
  font-size: 14px;
}

.admin-info:hover {
  color: #409eff;
}

.ml-1 {
  margin-left: 4px;
}

.main-content {
  background: #f0f2f5;
  padding: 24px;
  overflow-y: auto;
  height: calc(100vh - 60px);
}
</style>
