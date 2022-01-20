<template>
  <div style="display: flex; flex-direction: column">
    <div>
      <input type="text" placeholder="username" v-model="username" />
    </div>
    <div spacer style="height: 8px" />
    <div>
      <input type="text" placeholder="password" v-model="password" />
    </div>
    <div spacer style="height: 8px" />
    <div style="display: flex">
      <Button :onClick="() => createAccount()"> Create Account </Button>
      <Button :onClick="() => login()"> Login </Button>
    </div>
    <div spacer style="height: 8px" />
  </div>
</template>

<script>
import Vue from 'vue'
import Component from 'vue-class-component'
import Button from './components/Button'
@Component({
  name: 'Auth',
  components: { Button },
})
export default class Auth extends Vue {
  activePane = 1
  token = ''
  username = ''
  password = ''
  errorMessage = ''
  async mounted() {
    await this.$store.dispatch('connect')
  }
  selectPane(index) {
    if (index === this.activePane) return
    this.activePane = index
    this.username = ''
    this.password = ''
    this.errorMessage = ''
  }
  async login() {
    await this.$store.dispatch('login', {
      username: this.username,
      password: this.password,
    })
    this.$router.push('/')
  }
  async createAccount() {
    await this.$store.dispatch('createAccount', {
      username: this.username,
      password: this.password,
      token: this.token,
    })
    this.$router.push('/')
  }
}
</script>

<style scoped>
.section-button {
  border-radius: 4px;
  padding: 4px;
  border: 1px solid black;
  font-size: 18px;
  cursor: pointer;
}
.section-button.active {
  background-color: lightgray;
}
.error-text {
  color: red;
}
</style>
