#!/bin/bash
pkill -9 -f "next" 2>/dev/null
sleep 2
cd /home/z/my-project
nohup npx next start --port 3000 >> /tmp/next-server.log 2>&1 &
echo "Server starting on port 3000..."
sleep 5
ss -tlnp 2>/dev/null | rg ":3000" && echo "Server is running!" || echo "Server failed to start"
