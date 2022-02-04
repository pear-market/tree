<template>
  <div class="container">
    <div class="header">
      <div>
        <div class="silent-link" v-on:click="$router.push('/auth')">
          Pear Node
        </div>
      </div>
      <ActivityPanel />
    </div>
    <div spacer style="height: 20px" />
    <!-- <div
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
    </div> -->
    <div spacer style="height: 8px" />
    <div
      v-if="$store.state.channel.latestState"
      style="
        display: flex;
        justify-content: space-between;
        border: 1px solid black;
      "
    >
      <div>
        <div style="font-weight: bold">State channel</div>
        <div spacer style="height: 8px" />
        <div v-if="$store.state.channel.balance !== undefined">
          Channel balance: {{ $store.state.channel.balance.toString() }} wei
        </div>
      </div>
      <div>
        <div>Internal Balances</div>
        <div spacer style="height: 8px" />
        <div v-if="$store.state.channel.balance !== undefined">
          My balance:
          {{
            $store.state.channel.latestState.outcome[0].allocations[0].amount.toString()
          }}
          wei
        </div>
        <div spacer style="height: 8px" />
        <div v-if="$store.state.channel.balance !== undefined">
          Server balance:
          {{
            $store.state.channel.latestState.outcome[0].allocations[1].amount.toString()
          }}
          wei
        </div>
      </div>
      <Button
        v-if="+$store.state.channel.balance.toString() === 0"
        :onClick="() => deposit()"
      >
        Deposit funds
      </Button>
    </div>
    <div spacer style="height: 8px" />
    <div
      v-if="$store.state.auth.auth"
      style="display: flex; flex-direction: column; border: 1px solid black"
    >
      <div>0 Total Posts</div>
      <div>0 Askers</div>
    </div>
    <div
      v-if="!$store.state.auth.auth"
      style="text-align: center; font-size: 20px; font-weight: bold"
    >
      Posts on this server
    </div>
    <div spacer style="height: 8px" />
    <Button
      v-if="$store.state.auth.auth"
      :onClick="() => $router.push('/create')"
      >Create Post</Button
    >
    <!-- <Button v-if="!$store.state.auth.blsChallengeSig" :onClick="() => authBLS()">Auth BLS</Button> -->
    <div spacer style="height: 8px" />
    <PostCell
      v-for="post of $store.state.post.postFeed"
      :post="post"
      :key="post.id"
    />
  </div>
</template>

<script>
import Vue from 'vue'
import Component from 'vue-class-component'
import { Buffer } from 'buffer/'
import Button from './components/Button'
import ActivityPanel from './components/ActivityPanel'
import BurnButton from './components/BurnButton'
import PostCell from './components/PostCell'

@Component({
  name: 'Home',
  components: { Button, ActivityPanel, BurnButton, PostCell },
  metaInfo: {
    title: 'Pear Tree',
  },
})
export default class Home extends Vue {
  publicKey = ''
  async mounted() {
    if (!this.$store.state.bls.signer) {
      await this.$store.dispatch('createSigner')
    }
    this.publicKey = this.$store.state.bls.signer.pubkey.join('-')
    if (!this.$store.state.auth.blsChallengeSig) {
      await this.authBLS()
    }
    await Promise.all([
      this.$store.dispatch('loadPostFeed'),
      this.$store.dispatch('loadChannel'),
    ])
  }

  async authBLS() {
    try {
      await this.$store.dispatch('blsAuth')
    } catch (err) {
      console.error(err)
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

  async deposit() {
    await this.$store.dispatch('deposit')
  }
}
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
}
.silent-link {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  padding: 4px;
  padding-top: 0px;
  cursor: pointer;
}
</style>
