#!/bin/bash

DIRECTORY="./src/generated/"

if [ ! -d "$DIRECTORY" ]; then
  mkdir $DIRECTORY
fi

cp ../infra/common/config.json $DIRECTORY

npm i
