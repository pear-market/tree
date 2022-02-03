<template>
  <div class="container">
    <div class="header">
      <div>
        <div class="silent-link" v-on:click="$router.push('/auth')">Pear Node</div>
      </div>
      <ActivityPanel />
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
    <div
      v-if="$store.state.bls.signer"
      style="
        display: flex;
        justify-content: space-between;
        border: 1px solid black;
      "
    >
      <div>No active state channel</div>
      <Button
        v-if="$store.state.bls.signer"
        :onClick="() => openStateChannel()"
      >
        Create State Channel
      </Button>
    </div>
    <div spacer style="height: 8px" />
    <div v-if="$store.state.auth.auth" style="display: flex; flex-direction: column; border: 1px solid black">
      <div>0 Total Posts</div>
      <div>0 Askers</div>
    </div>
    <div spacer style="height: 8px" />
    <Button v-if="$store.state.auth.auth" :onClick="() => $router.push('/create')">Create Post</Button>
    <!-- <Button v-if="!$store.state.auth.blsChallengeSig" :onClick="() => authBLS()">Auth BLS</Button> -->
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
      <Button :onClick="() => viewPost(post.id)">
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
import ActivityPanel from './components/ActivityPanel'

@Component({
  name: 'Home',
  components: { Button, ActivityPanel, },
  metaInfo: {
    title: 'Pear Tree',
  },
})
export default class Home extends Vue {
  publicKey = ''
  keyIndex = -2
  async mounted() {
    if (!this.$store.state.bls.signer) {
      await this.$store.dispatch('createSigner')
    }
    this.publicKey = this.$store.state.bls.signer.pubkey.join('-')
    this.keyIndex = await this.$store.dispatch(
      'loadPubKeyIndex',
      this.$store.state.bls.signer.pubkey
    )
    if (!this.$store.state.auth.blsChallengeSig) {
      await this.authBLS()
      this.$store.commit('logUrgent', 'You may now open a state channel')
    }
    await this.$store.dispatch('loadPostFeed')
  }

  async authBLS() {
    try {
      await this.$store.dispatch('blsAuth')
    } catch (err) {
      console.error(err)
    }
  }

  async openChannel() {
    try {
      // generate a channel
    } catch (err) {
      console.log(err)
    }
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

  async openStateChannel() {
    // determine a registration key first
  }

  async viewPost(id) {

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
.silent-link {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  padding: 4px;
  padding-top: 0px;
  cursor: pointer;
}
</style>
