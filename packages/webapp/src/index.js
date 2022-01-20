import Vue from 'vue'
import Vuex from 'vuex'
import VueRouter from 'vue-router'
import Meta from 'vue-meta'
import App from './App'
import Home from './Home'
import Create from './Create'
import Auth from './Auth'
import AuthStore from './stores/auth'
import ConnectionStore from './stores/connection'
import StorageConnector from './stores/storage'

export function createApp(cookie) {
  Vue.use(VueRouter)
  Vue.use(Vuex)
  Vue.use(Meta)
  const store = new Vuex.Store({
    state: {},
    mutations: {},
    actions: {},
    modules: {
      auth: AuthStore,
      connection: ConnectionStore,
      storage: StorageConnector,
    },
  })
  const router = new VueRouter({
    mode: 'history',
    routes: [
      { path: '/', component: Home },
      { path: '/auth', component: Auth },
      { path: '/create', component: Create },
    ],
  })
  const app = new Vue({
    router,
    store,
    render: (h) => h(App),
  })
  return { app, router, store }
}

const { app } = createApp()
app.$mount('#app')
