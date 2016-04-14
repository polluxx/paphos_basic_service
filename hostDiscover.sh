#!/bin/bash

echo " - Discover current host:{$HOST}"

sed -i 's_CURRHOST_'"$HOST"'_' paphos-discover.json

echo " - Done."