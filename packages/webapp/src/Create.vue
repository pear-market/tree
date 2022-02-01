<template>
  <div>
    <div class="header">
      <div>Home</div>
      <div>Pear Node Manager</div>
    </div>
    <div style="display: flex; flex-direction: column">
      <TextInput v-model="title" />
      <textarea v-model="postText" />
      <TextInput v-model="price" />
      <Button :onClick="() => click()">Post</Button>
      <Button :onClick="() => $router.push('/')">Cancel</Button>
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
  components: { TextInput, Button },
  metaInfo: {
    title: 'Create Post',
  },
})
export default class Create extends Vue {
  title = ''
  postText = ''
  price = ''

  async click() {
    await this.$store.dispatch('createPost', {
      title: this.title,
      fullText: this.postText,
      price: this.price,
    })
    this.$router.push('/')
  }
}
</script>

<style scoped></style>
