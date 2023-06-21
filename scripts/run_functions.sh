#!/bin/bash

while true; do
    # NOTE: this is my local userId here, you should use your own
    curl -X POST -H "Content-Type: application/json" -d '{"url":"https://google.com/search?eras-fyi!!!", "userId": "2a2b20c2-8885-4368-a9f0-379787e5bd07"}' http://localhost:50321/functions/v1/content
    printf '\n'
    sleep 3
done
