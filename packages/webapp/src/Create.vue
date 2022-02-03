<template>
  <div class="container">
    <div class="header">
      <div>Create Post</div>
    </div>
    <div style="display: flex; flex-direction: column">
      <TextInput v-model="title" placeholder="Title" />
      <TextInput v-model="preview" placeholder="Preview text" />
      <textarea v-model="postText" placeholder="Full text" />
      <TextInput v-model="price" placeholder="Price (wei)" />
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
  preview = ''

  async click() {
    await this.$store.dispatch('createPost', {
      title: this.title,
      fullText: this.postText,
      price: this.price,
      preview: this.preview,
    })
    this.$router.push('/')
  }
}
</script>

<style scoped></style>
