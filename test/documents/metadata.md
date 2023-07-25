---
# Just a random workflow to have a valid YAML

name: Test

on:
  workflow_dispatch:
  push:
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@master
        with:
          node-version: latest
      - name: Install dependencies
        run: npm install
      - name: Test
        run: npm run test-ci
...

# A file with metadata

This file has a metadata header.
