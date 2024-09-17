#!/bin/sh -l

if ["$1" = "true"]; then
    pensar scan --github --local
else
    pensar scan --github
fi