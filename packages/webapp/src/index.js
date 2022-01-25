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
import BLSStore from './stores/bls'
import EthStore from './stores/eth'
import ContractStore from './stores/contract'

export function createApp(cookie) {
  Vue.use(VueRouter)
  Vue.use(Vuex)
  Vue.use(Meta)
  const store = new Vuex.Store({
    state: {},
    mutations: {},
    actions: {},
    modules: {
      eth: EthStore,
      auth: AuthStore,
      connection: ConnectionStore,
      storage: StorageConnector,
      bls: BLSStore,
      contract: ContractStore,
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
