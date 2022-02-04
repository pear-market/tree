<template>
  <div class="burn-button" v-on:click="onBurn">Burn Payment</div>
</template>

<script>
import Vue from 'vue'
import Component from 'vue-class-component'

@Component({
  name: 'BurnButton',
  props: ['onBurn'],
})
export default class BurnButton extends Vue {}
</script>

<style scoped>
.burn-button {
  background: orange;
  cursor: pointer;
  user-select: none;
  border-radius: 8px;
  border: 1px solid black;
  padding: 8px;
}
</style>
