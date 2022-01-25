<template>
  <div class="outer-container">
    <div
      v-on:click="_onClick"
      :class="`button ${this.loading ? 'loading' : ''} ${
        this.errored ? 'error' : ''
      }`"
      tabindex="0"
      v-on:keyup.enter="_onClick"
    >
      <div v-show="!this.loading && !this.errored"><slot></slot></div>
      <div v-if="this.loading">{{ loadingText || 'Loading...' }}</div>
      <div v-if="this.errored">{{ errorText || 'There was a problem' }}</div>
    </div>
  </div>
</template>

<script>
import Vue from 'vue'
import Component from 'vue-class-component'

@Component({
  name: 'Button',
  props: ['onClick', 'loadingText', 'errorText'],
})
export default class Button extends Vue {
  loading = false
  errored = false

  async _onClick(e) {
    e.preventDefault()
    if (this.errored) return
    if (typeof this.onClick !== 'function') {
      return
    }
    try {
      this.loading = true
      await this.onClick()
      this.loading = false
    } catch (err) {
      this.loading = false
      this.errored = true
      console.log('Uncaught button handler error', err)
      setTimeout(() => {
        this.errored = false
      }, 3000)
    }
  }
}
</script>

<style scoped>
.button {
  background: lightgray;
  cursor: pointer;
  user-select: none;
  border-radius: 8px;
  border: 1px solid black;
  padding: 8px;
}
.button.loading {
}
.button.error {
  background: red;
}
.outer-container {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
