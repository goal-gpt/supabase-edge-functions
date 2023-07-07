#!/bin/bash

while true; do
    # NOTE: this is my local userId here, to use this function: generate a new local user and replace the userId here
    # NOTE: the bearer token comes from the session generated on the frontend

    # curl -X POST -H "Content-Type: application/json" -d '{"url":"https://google.com/search?eras-fyi?", "userId": "2a2b20c2-8885-4368-a9f0-379787e5bd07"}' http://localhost:50321/functions/v1/connor
    curl -H "Content-Type: application/json" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3YXdjdnhqa3V4ZnB3eHNnZHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODE3NTUwNzYsImV4cCI6MTk5NzMzMTA3Nn0.eqe_IQ2Z5gw1DL8DHifT16yc37zH2PfAZ8u5ZuEIQ14" http://localhost:50321/functions/v1/leela/plans
    printf '\n'
    sleep 3
done
