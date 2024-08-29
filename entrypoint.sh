#!/bin/sh -l

if ["$2" = "true"]; then
    pensar scan -lang $1 --github --local
else
    pensar scan -lang $1 --github
fi