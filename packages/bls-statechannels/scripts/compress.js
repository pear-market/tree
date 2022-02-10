const BN = require('bn.js')
const { BigNumber } = ethers

async function getDeployedContracts() {
  const Decompressor = await ethers.getContractFactory('Decompressor')
  const decompressor = await Decompressor.deploy(ethers.constants.AddressZero)
  await decompressor.deployed()

  return { decompressor }
}

async function main() {
  const { decompressor } = await getDeployedContracts()
  const [user] = await ethers.getSigners()
  const reverse = (str) => str.split('').reverse().join('')
  const val = new BN(reverse('00100111'), 2)
  const tx = await decompressor
    .connect(user)
    .decompressSimple('0x' + val.toString(16), [])
  await tx.wait()
}

main().then((err) => console.log(err) || process.exit(1))
