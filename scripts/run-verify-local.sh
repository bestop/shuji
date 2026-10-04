#!/bin/bash
# 启动 dev server → 跑指定验证脚本（默认 verify-shipping.mjs）→ 从容关闭 → 输出断言结果
cd /home/z/my-project
SCRIPT="${1:-scripts/verify-shipping.mjs}"
bun run dev > /tmp/dev.log 2>&1 &
DEVPID=$!
# 等服务就绪（最多 40s）
for i in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:3000/api/books 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 1
done
echo "dev ready: $code (waited ${i}s)"
node "$SCRIPT" > /tmp/verify-run.out 2>&1
VERIFY=$?
kill $DEVPID 2>/dev/null
sleep 1
cat /tmp/verify-run.out
exit $VERIFY
