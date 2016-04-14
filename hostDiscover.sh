#!/bin/bash

echo " - Discover current host:{$SERVICE_URL}"

echo " - Processing..."
sed -i 's_CURRHOST_'"$SERVICE_URL"'_' paphos-discover.json

echo " - Done."