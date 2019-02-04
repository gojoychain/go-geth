const axios = require('axios')
const FormData = require('form-data')
const fs = require('fs')
const path = require('path')
const targz = require('targz')

/**
 * Release Instructions
 * 1. Edit the values in `release.json`
 * 2. `node release.js`
 */

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
  await instance.post('repos/nakachain/go-naka/releases', config.release)
  .then((res) => {
    id = res.data.id
    console.log(`Release created: ${config.release.name}`)
  }).catch((err) => {
    throw err
  })
}

async function uploadFile(filename) {
  if (!id) {
    throw Error('id not defined')
  }

  await instance.post(`repos/nakachain/go-naka/releases/${id}/assets?name=${filename}`, {
    header: { 'Content-Type': 'multipart/form-data' },
    data: new FormData().append(filename, fs.createReadStream(path.join('..', `/build/bin/${filename}`)))
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
    await uploadFile('bootnode')
    await uploadFile('geth')
    await uploadFile('geth.aar')

    await targz.compress({
      src: path.join('..', `/build/bin/Geth.framework`),
      dest: path.join('..', `/build/bin/geth.framework.tar.gz`),
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
