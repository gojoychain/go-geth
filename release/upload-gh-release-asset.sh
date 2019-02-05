#!/usr/bin/env bash
#
# Author: Deric Walintukan
#
# Script to upload a release asset using GitHub's API v3.
# This script requires the following parameters:
# * api_token
# * owner
# * repo
# * id
# * filename
#
# Example:
# upload-gh-release-asset.sh api_token=abcde12345 owner=ghuchain repo=go-ghuchain id=12345678 filename=./build.zip

# Check dependencies
set -e
xargs=$(which gxargs || which xargs)

# Validate settings
[ "$TRACE" ] && set -x

CONFIG=$@

for line in $CONFIG; do
  eval "$line"
done

# Upload release asset
curl \
-H "Authorization: token $api_token" \
-H "Content-Type: application/octet-stream" \
--data-binary @"$filename" \
"https://uploads.github.com/repos/$owner/$repo/releases/$id/assets?name=$(basename $filename)"
