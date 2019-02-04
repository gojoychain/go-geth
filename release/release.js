const axios = require('axios')
const FormData = require('form-data')
const fs = require('fs')
const path = require('path')
const targz = require('targz')

let config
let instance
let id

function parseConfig() {
  config = JSON.parse(fs.readFileSync('release.json', 'utf8'));
}

function setupAxios(baseURL) {
  instance = axios.create({
    baseURL,
    headers: {
      'Authorization': `token ${config.credentials.github_token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'node.js',
    },
  })
}

async function createRelease() {
  await instance.post('repos/ghuchain/go-ghuchain/releases', config.release)
  .then((res) => {
    id = res.data.id
    console.log(`Release created: ${config.release.name}`)
  }).catch((err) => {
    throw err
  })
}

async function uploadGenesis() {
  if (!id) {
    throw Error('id not defined')
  }
  if (!config.options || !config.options.mainnet) {
    throw Error('options.mainnet not found in release.json')
  }

  const filename = Boolean(config.options.mainnet)
    ? 'genesis-mainnet.json'
    : 'genesis-testnet.json'

  await instance.post(`repos/ghuchain/go-ghuchain/releases/${id}/assets?name=${filename}`, {
    header: { 'Content-Type': 'multipart/form-data' },
    data: new FormData().append(filename, fs.createReadStream(path.resolve(`../ghuchain/${filename}`)))
  }).then((res) => {
    const { name, state } = res.data
    console.log(`Upload: ${name} (${state})`)
  }).catch((err) => {
    throw err
  })
}

async function uploadFile(filename) {
  if (!id) {
    throw Error('id not defined')
  }

  await instance.post(`repos/ghuchain/go-ghuchain/releases/${id}/assets?name=${filename}`, {
    header: { 'Content-Type': 'multipart/form-data' },
    data: new FormData().append(filename, fs.createReadStream(path.resolve(`../build/bin/${filename}`)))
  }).then((res) => {
    const { name, state } = res.data
    console.log(`Upload: ${name} (${state})`)
  }).catch((err) => {
    throw err
  })
}

async function deploy() {
  try {
    parseConfig()

    setupAxios('https://api.github.com/')
    await createRelease()

    setupAxios('https://uploads.github.com/')
    await uploadGenesis()
    await uploadFile('bootnode')
    await uploadFile('geth')
    await uploadFile('geth.aar')

    await targz.compress({
      src: path.resolve(`../build/bin/Geth.framework`),
      dest: path.resolve(`../build/bin/geth.framework.tar.gz`),
    }, async (err) => {
      if (err) {
        throw err
      }

      console.log('Compressed Geth.framework')
      await uploadFile('geth.framework.tar.gz')
    })
  } catch (err) {
    console.error(err)
  }
}

deploy()