<template>
  <div id="app">
    <div v-if="loading && !err">Loading...</div>
    <div v-if="err">Error initializing: {{ err }}</div>
    <router-view v-if="!loading && !err" />
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
  err = null
  async mounted() {
    try {
      await this.$store.dispatch('initDB')
      await this.$store.dispatch('init')
    } catch (err) {
      this.err = err
    }
    this.loading = false
    // if (!this.$store.state.auth.auth) {
    //   this.$router.push('/auth')
    // }
  }
}
</script>

<style>
body {
  margin: 0px;
}
.container {
  display: flex;
  flex-direction: column;
  margin: auto;
  max-width: 800px;
}
</style>
