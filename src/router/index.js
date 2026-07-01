import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('../views/Layout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/config'
      },
      {
        path: 'config',
        name: 'Config',
        component: () => import('../views/ConfigView.vue'),
        meta: { title: '系统配置' }
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('../views/UserView.vue'),
        meta: { title: '用户管理' }
      },
      {
        path: 'credit',
        name: 'Credit',
        component: () => import('../views/CreditView.vue'),
        meta: { title: '授信日志' }
      },
      {
        path: 'commission',
        name: 'Commission',
        component: () => import('../views/CommissionView.vue'),
        meta: { title: '积分反点' }
      },
      {
        path: 'super-club',
        name: 'SuperClub',
        component: () => import('../views/SuperClubView.vue'),
        meta: { title: '大联盟俱乐部' }
      },
      {
        path: 'game-record',
        name: 'GameRecord',
        component: () => import('../views/GameRecordView.vue'),
        meta: { title: '战绩明细' }
      },
      {
        path: 'customer-service',
        name: 'CustomerService',
        component: () => import('../views/CustomerServiceView.vue'),
        meta: { title: '客服系统' }
      },
      {
        path: 'metrics',
        name: 'Metrics',
        component: () => import('../views/MetricsView.vue'),
        meta: { title: '服务器监控' }
      },
      {
        path: 'gift-config',
        name: 'GiftConfig',
        component: () => import('../views/GiftConfigView.vue'),
        meta: { title: '礼物管理' }
      },
      {
        path: 'robot',
        name: 'Robot',
        component: () => import('../views/RobotView.vue'),
        meta: { title: '俱乐部管理' }
      },
      {
        path: 'system-ops',
        name: 'SystemOps',
        component: () => import('../views/SystemOpsView.vue'),
        meta: { title: '系统运维' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth !== false && !auth.isLoggedIn) {
    next('/login')
  } else if (to.path === '/login' && auth.isLoggedIn) {
    next('/')
  } else {
    next()
  }
})

export default router
