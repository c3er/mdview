#!/bin/bash

tail -f "$(npm start --silent -- --get-user-data-path)/storage/log/app.log" &
npm start -- $@
kill 0
