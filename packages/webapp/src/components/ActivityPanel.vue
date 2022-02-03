<template>
  <div class="activity-panel-container">
    <div class="activity-panel">
      <div v-for="log of $store.state.activity.logs">
        <div :class="`log${log.level}`">{{ log.text }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import Vue from 'vue'
import Component from 'vue-class-component'

@Component({
  name: 'ActivityPanel',
})
export default class ActivityPanel extends Vue {

}
</script>

<style scoped>
.activity-panel-contiainer {
  border: 1px solid black;
}
.activity-panel {
  font-size: 10px;
}
.log0 {
  color: lightgray;
}
.log1 {
  color: black;
}
.log2 {
  color: green;
  font-size: 12px;
}
.log3 {
  color: red;
  font-size: 12px;
}
</style>
