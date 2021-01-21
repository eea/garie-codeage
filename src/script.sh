#!/usr/bin/env bash
set -e

echo "Start getting data"

echo "Getting data for: $1"
# echo "Extra parameter: $3"

report_location=$2/$(date +"%FT%H%M%S+0000")

delimiter=$3

mkdir -p $report_location
END=$#
for ((i=4;i<=END;i++));
do
    timeout 1800 hercules --burndown --pb ${!i} | labours -f pb -m burndown-project >> $report_location/code-age.txt 2> /dev/null
    echo $delimiter >> $report_location/code-age.txt
done
chmod 777 $report_location/code-age.txt 
echo "Finished getting data for: $1"

exit 0

