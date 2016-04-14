#!/bin/bash

echo " - Discover current host: ${SERVICE_URL}"

sed -i 's/CURR_HOST/${SERVICE_URL}/g' paphos-discover.json

echo " - Done."