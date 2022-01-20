<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
import Vue from 'vue'
import Component from 'vue-class-component'

@Component({
  name: 'App',
})
export default class App extends Vue {
  mounted() {
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
