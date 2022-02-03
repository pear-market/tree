const fs = require('fs')
const path = require('path')

const artifactsPath = path.join(__dirname, '../artifacts')
const srcPath = path.join(__dirname, '../src/abi')

const contracts = ['BLSKeyCache', 'BLSMove', 'Adjudicator']

fs.mkdirSync(srcPath, { recursive: true })

for (const contract of contracts) {
  const { abi } = require(path.join(
    artifactsPath,
    'contracts',
    `${contract}.sol`,
    `${contract}.json`
  ))
  fs.writeFileSync(path.join(srcPath, `${contract}.json`), JSON.stringify(abi))
}
