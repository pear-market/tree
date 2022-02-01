<template>
  <div class="container">
    <div class="header">
      <div>Home</div>
      <div>Pear Node Manager</div>
    </div>
    <div spacer style="height: 20px" />
    <div
      v-if="$store.state.bls.signer"
      style="
        display: flex;
        justify-content: space-between;
        border: 1px solid black;
      "
    >
      <div>BLS Key Management</div>
      <div spacer style="width: 20px" />
      <Button
        v-if="$store.state.bls.signer && keyIndex === -1"
        :onClick="() => registerPubKey()"
      >
        Upload Public Key
      </Button>
      <div v-if="keyIndex > 0">Key index: {{ keyIndex }}</div>
    </div>
    <div spacer style="height: 8px" />
    <div style="display: flex; flex-direction: column; border: 1px solid black">
      <div>0 Total Posts</div>
      <div>0 Askers</div>
    </div>
    <div spacer style="height: 8px" />
    <Button :onClick="() => $router.push('/create')">Create Post</Button>
    <div spacer style="height: 8px" />
    <div class="post-cell" v-for="post of $store.state.post.postFeed">
      <div style="display: flex; justify-content: space-between">
        <div style="font-size: 18px; font-weight: bold">{{ post.title }}</div>
        <div>10 seconds ago</div>
      </div>
      <div>
        {{ post.fullText }}
      </div>
      <div spacer style="height: 8px" />
      <Button>
        View Post (1000 Gwei)
      </Button>
    </div>
  </div>
</template>

<script>
import Vue from 'vue'
import Component from 'vue-class-component'
import { Buffer } from 'buffer/'
import Button from './components/Button'

@Component({
  name: 'Home',
  components: { Button },
  metaInfo: {
    title: 'Pear Tree',
  },
})
export default class Home extends Vue {
  publicKey = ''
  keyIndex = -2
  async mounted() {
    await this.$store.dispatch('createSigner')
    this.publicKey = this.$store.state.bls.signer.pubkey.join('-')
    this.keyIndex = await this.$store.dispatch(
      'loadPubKeyIndex',
      this.$store.state.bls.signer.pubkey
    )
    const sig = await this.$store.dispatch('sign', 'test')
    await this.$store.dispatch('loadPostFeed')
  }

  async registerPubKey() {
    await this.$store.dispatch(
      'registerPubKey',
      this.$store.state.bls.signer.pubkey
    )
    this.keyIndex = await this.$store.dispatch(
      'loadPubKeyIndex',
      this.$store.state.bls.signer.pubkey
    )
  }
}
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
}
.container {
  display: flex;
  flex-direction: column;
  margin: auto;
  max-width: 800px;
}
.post-cell {
  border: 1px solid black;
  padding: 4px;
  margin: 2px 0px;
}
</style>
