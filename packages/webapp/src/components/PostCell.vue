<template>
  <div class="post-cell">
    <div style="display: flex; justify-content: space-between">
      <div>
        <div style="font-size: 18px; font-weight: bold">{{ post.title }}</div>
        <div>{{ dayjs(post.createdAt).fromNow() }}</div>
      </div>
      <div style="text-align: right">
        {{ post.price }} wei
        <BurnButton v-if="showingBurnOperation" :onBurn="() => burnFunds()" />
      </div>
    </div>
    <div
      style="max-width: 100%; overflow-x: hidden"
      v-html="markdown.render(post.fullText || post.preview)"
    />
    <div spacer v-if="!post.purchased" style="height: 8px" />
    <Button v-if="!post.purchased" :onClick="() => purchasePost(post)">
      View Post (pay {{ post.price }} wei)
    </Button>
  </div>
</template>

<script>
import Vue from 'vue'
import Component from 'vue-class-component'
import MarkdownIt from 'markdown-it'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import Button from './Button'
import BurnButton from './BurnButton'

const markdown = new MarkdownIt({
  html: true,
  linkify: true,
})

dayjs.extend(relativeTime)

@Component({
  name: 'PostCell',
  components: { BurnButton, Button },
  props: ['post'],
})
export default class PostCell extends Vue {
  markdown = markdown
  dayjs = dayjs
  showingBurnOperation = false

  async burnFunds() {
    this.showingBurnOperation = false
  }

  async purchasePost(post) {
    if (this.$store.state.channel.balance.toString() === '0') {
      throw new Error('Button: Deposit to the state channel first!')
    }
    await this.$store.dispatch('purchasePost', post)
    this.showingBurnOperation = true
  }
}
</script>

<style scoped>
.post-cell {
  border: 1px solid black;
  padding: 4px;
  margin: 2px 0px;
}
</style>
