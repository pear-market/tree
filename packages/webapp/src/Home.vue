<template>
  <div>
    Home page
  </div>
</template>

<script>
import Vue from 'vue'
import Component from 'vue-class-component'

@Component({
  name: 'Home',
  components: {},
  metaInfo: {
    title: 'Hello World',
  },
})
export default class Home extends Vue {}
</script>

<style scoped>
</style>
