<template>
  <div>
    <div class="header">
      <div>Home</div>
      <div>Pear Node Manager</div>
    </div>
    <div style="display: flex; flex-direction: column">
      <div>0 Total Posts</div>
      <div>0 Askers</div>
    </div>
    <button v-on:click="$router.push('/create')">
      Create Post
    </button>
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
.header {
  display: flex;
  justify-content: space-between;
}
</style>
