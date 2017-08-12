#!/bin/bash
MYDIR="$(dirname "$(realpath "$0")")/"
#echo $MYDIR
find $PWD -regex ".*\.pyc" -type f -delete
find $PWD -regex ".*~" -type f -delete
