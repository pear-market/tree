require('@nomiclabs/hardhat-waffle')
// require('solidity-coverage')
// require('@atixlabs/hardhat-time-n-mine')

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: '0.7.4',
    // settings: {
    //   optimizer: {
    //     enabled: true,
    //     runs: 99999,
    //   }
    // }
  },
  networks: {
    goerli: {
      // url: 'http://192.168.1.198:9545',
      url: 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
      accounts: [
        '0x18ef552014cb0717769838c7536bc1d3b1c800fe351aa2c38ac093fa4d4eb7d6',
      ],
    },
  },
  mocha: {
    timeout: 300000,
  },
}
