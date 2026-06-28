import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Spring Boot 后端地址
const BACKEND = 'http://127.0.0.1:9000'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3010,
    proxy: {
      '/api': {
        target: BACKEND,
        changeOrigin: true
      },
      '/admin': {
        target: BACKEND,
        changeOrigin: true
      },
      // 文件上传（后端 UploadController，公开接口，用于大联盟俱乐部头像等）
      '/upload': {
        target: BACKEND,
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    // nginx 以 /admin/ 子路径访问时取消注释并改为实际路径
    // base: '/admin/'
  }
})
