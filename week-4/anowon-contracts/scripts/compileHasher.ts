// Generates Hasher artifact at compile-time using external compilermechanism
const path = require('path')
const fs = require('fs')
const { mimcSpongecontract } = require('circomlibjs')
const outputPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'Hasher.sol')
const outputFile = path.join(outputPath, 'Hasher.json')

if (!fs.existsSync(outputPath)) {
  fs.mkdirSync(outputPath, { recursive: true })
}

const contract = {
  _format: 'hh-sol-artifact-1',
  sourceName: 'contracts/Hasher.sol',
  contractName: 'Hasher',
  abi: mimcSpongecontract.abi,
  bytecode: mimcSpongecontract.createCode('mimcsponge', 220),
}

fs.writeFileSync(outputFile, JSON.stringify(contract, null, 2))
