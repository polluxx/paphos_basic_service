#!/bin/bash

HOST=$SERVICE_URL
echo " - Discover current host:{$HOST}"

sed -i 's/CURR_HOST/'"$HOST"'/g' paphos-discover.json

echo $SERVICE_URL

echo " - Done."