import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('admin_token') || '')
  const username = ref(localStorage.getItem('admin_username') || '')

  const isLoggedIn = computed(() => !!token.value)

  function login(data) {
    token.value = data.token
    username.value = data.username
    localStorage.setItem('admin_token', data.token)
    localStorage.setItem('admin_username', data.username)
  }

  function logout() {
    token.value = ''
    username.value = ''
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_username')
  }

  return { token, username, isLoggedIn, login, logout }
})
