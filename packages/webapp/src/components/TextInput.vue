<template>
  <input
    type="text"
    class="text-input"
    :placeholder="placeholder"
    v-on:input="textChanged"
    :value="text"
  />
</template>

<script>
import Vue from 'vue'
import Component from 'vue-class-component'

@Component({
  name: 'TextInput',
  components: {},
  props: ['text', 'placeholder'],
  model: {
    prop: 'text',
    event: 'textChanged',
  },
})
export default class TextInput extends Vue {
  textChanged(e) {
    this.$emit('textChanged', e.target.value)
  }
}
</script>

<style scoped>
.text-input {
  height: 24px;
  border: 1px solid black;
  border-radius: 2px;
  background: lightgray;
  color: black;
  padding: 2px 2px;
}
.text-input:placeholder {
  font-size: 14px;
  color: black;
}
.text-input:focus {
  outline: 0px;
}
</style>
