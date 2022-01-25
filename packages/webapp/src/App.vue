<template>
  <div>
    <div v-if="loading">Loading...</div>
    <div id="app" v-if="!loading">
      <router-view />
    </div>
  </div>
</template>

<script>
import Vue from 'vue'
import Component from 'vue-class-component'

@Component({
  name: 'App',
})
export default class App extends Vue {
  loading = true
  async mounted() {
    await this.$store.dispatch('initDB')
    await this.$store.dispatch('init')
    this.loading = false
    if (!this.$store.state.auth.auth) {
      this.$router.push('/auth')
    }
  }
}
</script>

<style>
body {
  margin: 0px;
}
</style>
