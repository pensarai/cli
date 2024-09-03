#!/bin/sh -l

if ["$2" = "true"]; then
    pensar scan -lang $1 --github --local --no_metrics
else
    pensar scan -lang $1 --github --no_metrics
fi