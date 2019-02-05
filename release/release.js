const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const axios = require('axios')
const targz = require('targz')

let id, github, release, options

function parseConfig() {
  const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
  github = config.github
  release = config.release
  options = config.options

  if (!github.hasOwnProperty('owner')) {
    throw Error('github.owner not defined')
  }
  if (!github.hasOwnProperty('repo')) {
    throw Error('github.repo not defined')
  }
  if (!github.hasOwnProperty('api_token')) {
    throw Error('github.api_token not defined')
  }
  if (!release.hasOwnProperty('tag_name')) {
    throw Error('release.tag_name not defined')
  }
  if (!options.hasOwnProperty('mainnet')) {
    throw Error('options.mainnet not defined')
  }
}

async function createRelease() {
  await axios.post('https://api.github.com/repos/ghuchain/go-ghuchain/releases', release, {
    headers: {
      'Authorization': `token ${github.api_token}`,
      'User-Agent': 'node.js',
      'Accept': 'application/json',
    }
  }).then((res) => {
    id = res.data.id
    if (!id) {
      throw Error('release id not valid')
    }
    console.log(`Release created: ${release.name}`)
  }).catch((err) => {
    throw err
  })
}

function doesFileExist(path) {
  if (!fs.existsSync(path)) {
    console.log(`Skipped upload: ${path}`)
    return false
  }
  return true
}

async function uploadFile(filepath) {
  if (doesFileExist(filepath)) {
    console.log(`Uploading: ${path.basename(filepath)}`)
    exec(
      `sh upload-gh-release-asset.sh api_token=${github.api_token} owner=${github.owner} repo=${github.repo} id=${id} filename=${filepath}`, 
      (err, stdout, stderr) => {
        if (err) {
          console.error(`error: ${err}`)
          return
        }
        
        console.log(stderr)
        console.log(stdout)
      }
    )
  }
}

async function uploadGenesis() {
  const filename = Boolean(options.mainnet)
    ? 'genesis-mainnet.json'
    : 'genesis-testnet.json'
  const filepath = `../ghuchain/${filename}`
  if (doesFileExist(filepath)) {
    await uploadFile(filepath)
  }
}

async function uploadIos() {
  const srcFile = path.join('../build/bin/Geth.framework')
  const destFile = path.join('../build/bin/geth.framework.tar.gz')
  if (doesFileExist(srcFile)) {
    await targz.compress({ src: srcFile, dest: destFile }, async (err) => {
      if (err) {
        throw err
      }
  
      console.log('Compressed Geth.framework')
      await uploadFile(destFile)
    })
  }
}

async function deploy() {
  try {
    parseConfig()
    await createRelease()
    await uploadGenesis()
    await uploadFile('../build/bin/bootnode')
    await uploadFile('../build/bin/geth')
    await uploadFile('../build/bin/geth.aar')
    await uploadIos()
  } catch (err) {
    console.error(err)
  }
}

deploy()
