const { promises: fs } = require('fs')
const path = require('path')
const { DOMAIN } = require('../src/domain')

async function main() {
  const BLSKeyCache = await ethers.getContractFactory('BLSKeyCache')
  const cache = await BLSKeyCache.deploy()
  await cache.deployed()

  const BLSEstimator = await ethers.getContractFactory(
    'BNPairingPrecompileCostEstimator'
  )
  const blsEstimator = await BLSEstimator.deploy()
  await blsEstimator.deployed()

  const BLSMoveApp = await ethers.getContractFactory('BLSMoveApp')
  const blsMoveApp = await BLSMoveApp.deploy()
  await blsMoveApp.deployed()

  const BLSOpen = await ethers.getContractFactory('BLSOpen', {
    libraries: {
      BNPairingPrecompileCostEstimator: blsEstimator.address,
    },
  })
  const blsOpen = await BLSOpen.deploy()
  await blsOpen.deployed()

  const Adjudicator = await ethers.getContractFactory('Adjudicator', {
    libraries: {
      BLSOpen: blsOpen.address,
    },
  })
  const blsMove = await Adjudicator.deploy(blsMoveApp.address, 100000, DOMAIN)
  await blsMove.deployed()

  console.log(`Cache address: ${cache.address}`)
  console.log(`BLSMove address: ${blsMove.address}`)

  // now write to a js export
  const output = `module.exports = { BLSMove: '${blsMove.address}' }`
  await fs.writeFile(path.join(__dirname, '../src/address.js'), output)
}

main().catch((err) => {
  console.log(err)
  process.exit(1)
})
