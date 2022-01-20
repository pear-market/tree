<template>
  <div>
    <div class="header">
      <div>Home</div>
      <div>Pear Node Manager</div>
    </div>
    <div style="display: flex; flex-direction: column">
      <textarea v-model="postText" />
      <TextInput
        v-model="price"
      />
      <Button :onClick="click">
        Test
      </Button>
    </div>
  </div>
</template>

<script>
import Vue from 'vue'
import Component from 'vue-class-component'
import TextInput from './components/TextInput'
import Button from './components/Button'

@Component({
  name: 'Create',
  components: { TextInput, Button, },
  metaInfo: {
    title: 'Create Post',
  }
})
export default class Create extends Vue {
  postText = ''
  price = ''
  
  click() {
  }
}
</script>

<style scoped>
</style>
