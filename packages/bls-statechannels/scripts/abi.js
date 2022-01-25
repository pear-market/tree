const fs = require('fs')
const path = require('path')

const artifactsPath = path.join(__dirname, '../artifacts')
const srcPath = path.join(__dirname, '../src/abi')

const contracts = ['BLSKeyCache']

fs.mkdirSync(srcPath, { recursive: true })

for (const contract of contracts) {
  fs.renameSync(
    path.join(
      artifactsPath,
      'contracts',
      `${contract}.sol`,
      `${contract}.json`
    ),
    path.join(srcPath, `${contract}.json`)
  )
}
