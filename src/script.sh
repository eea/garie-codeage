#!/usr/bin/env bash
set -e

echo "Start getting data"

echo "Getting data for: $1"
# echo "Extra parameter: $3"

report_location=$2/$(date +"%FT%H%M%S+0000")

delimiter=$3

mkdir -p $report_location
END=$#
printf "This tool (hercules) analyzes the github repos from the applcation's Taskman page and offers for each repo an overview of the survived lines ratio.
For example: 30 days ....... 0.924356 means that approximately 92 percent lines of code are older than 30 days. We name this '30 days' a milestone.
To create a score based on this data, we compute a weighted sum (the difference between 'milestones' multiplied by the number of days)." >> $report_location/code-age.txt

for ((i=4;i<=END;i++));
do
    timeout 1800 hercules --burndown --pb ${!i} | labours -f pb -m burndown-project >> $report_location/code-age.txt 2> /dev/null
    echo $delimiter >> $report_location/code-age.txt
done
chmod 777 $report_location/code-age.txt 
echo "Finished getting data for: $1"

exit 0

