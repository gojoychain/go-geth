## Create Release

1. Build all the tools in root folder (`/go-geth`): `make all`
2. If you would like to upload the Android and iOS packages, do `make android` and `make ios` respectively
3. Copy `config.sample.json` to `config.json`
4. Edit the values in `config.json`
5. `node release.js`
