<template>
  <div>
    <div class="header">
      <div>Home</div>
      <div>Pear Node Manager</div>
    </div>
    <div v-if="$store.state.bls.signer">
      BLS Key Management
      <Button v-if="$store.state.bls.signer"> Upload Public Key </Button>
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

@Component({
  name: 'Home',
  components: {},
  metaInfo: {
    title: 'Pear Tree',
  },
})
export default class Home extends Vue {
  publicKey = ''
  async mounted() {
    await this.$store.dispatch('createSigner')
    this.publicKey = this.$store.state.bls.signer.pubkey.join('-')
    const sig = await this.$store.dispatch('sign', 'test')
    console.log(sig)
  }
}
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
}
</style>
