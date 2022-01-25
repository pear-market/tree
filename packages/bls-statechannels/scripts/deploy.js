async function main() {
  const BLSKeyCache = await ethers.getContractFactory('BLSKeyCache')
  const cache = await BLSKeyCache.deploy()
  await cache.deployed()

  console.log(`Cache address: ${cache.address}`)
}

main().catch((err) => {
  console.log(err)
  process.exit(1)
})
