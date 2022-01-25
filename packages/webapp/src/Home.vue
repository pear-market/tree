<template>
  <div>
    <div class="header">
      <div>Home</div>
      <div>Pear Node Manager</div>
    </div>
    <div v-if="$store.state.bls.signer">
      BLS Key Management
      <Button
        v-if="$store.state.bls.signer && keyIndex === -1"
        :onClick="() => registerPubKey()"
      >
        Upload Public Key
      </Button>
      <div v-if="keyIndex > 0">Key index: {{ keyIndex }}</div>
    </div>
    <div style="display: flex; flex-direction: column">
      <div>0 Total Posts</div>
      <div>0 Askers</div>
    </div>
    <button v-on:click="$router.push('/create')">Create Post</button>
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
</style>
