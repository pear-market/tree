async function main() {
  const BLSKeyCache = await ethers.getContractFactory('BLSKeyCache')
  const cache = await BLSKeyCache.deploy()
  await cache.deployed()

  const BLSMoveApp = await ethers.getContractFactory('BLSMoveApp')
  const blsMoveApp = await BLSMoveApp.deploy()
  await blsMoveApp.deployed()

  const BLSOpen = await ethers.getContractFactory('BLSOpen')
  const blsOpen = await BLSOpen.deploy()
  await blsOpen.deployed()

  const BLSMove = await ethers.getContractFactory('BLSMove', {
    libraries: {
      BLSOpen: blsOpen.address,
    }
  })
  const blsMove = await BLSMove.deploy(blsMoveApp.address, 100000)
  await blsMove.deployed()

  console.log(`Cache address: ${cache.address}`)
  console.log(`BLSMove address: ${blsMove.address}`)
}

main().catch((err) => {
  console.log(err)
  process.exit(1)
})
