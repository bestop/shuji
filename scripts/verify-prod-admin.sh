#!/bin/bash
# 书集生产环境 · 管理员审核链路验证
BASE="https://shuji-book-market.vercel.app"
JAR="/tmp/shuji-prod-cookies.txt"
rm -f "$JAR"
json() { python3 -c "import json,sys; d=json.load(sys.stdin); $1"; }

echo "=== 1. 生产市集基线 ==="
curl -s "$BASE/api/books" | json "print('enabled:', d['enabled'], '| db:', d.get('db'), '| 市集:', len(d['books']), '本 | 状态分布:', {s: sum(1 for b in d['books'] if b['status']==s) for s in ['PENDING','APPROVED','REJECTED']})"

echo "=== 2. 发布测试书（应 PENDING） ==="
CREATED=$(curl -s -X POST "$BASE/api/books" -H "Content-Type: application/json" -d '{
  "title": "《生产链路验证书》", "author": "运维", "category": "其他", "condition": "全新",
  "price": 5, "description": "生产验证用，稍后删除", "sellerName": "运维检查", "sellerWechat": "ops_check",
  "ownerId": "prod-ops-check"}')
BID=$(echo "$CREATED" | json "print(d['book']['id'])")
echo "书ID: $BID | 状态: $(echo "$CREATED" | json "print(d['book']['status'])")"

echo "=== 3. 待审书对市集不可见 ==="
curl -s "$BASE/api/books" | json "print('市集本数:', len(d['books']), '| 测试书可见:', any(b['id']=='$BID' for b in d['books']), '（应 12 本 / False）')"

echo "=== 4. 管理员登录（生产口令） ==="
CODE=$(curl -s -c "$JAR" -o /dev/null -w "%{http_code}" -X POST "$BASE/api/admin/login" -H "Content-Type: application/json" -d "{\"passcode\":\"$SHUJI_ADMIN_PASSCODE\"}")
echo "登录: $CODE（应 200）"

echo "=== 5. 管理员书单计数 ==="
curl -s -b "$JAR" "$BASE/api/admin/books" | json "print('总数:', len(d['books']), '| 计数:', d['counts'])"

echo "=== 6. 通过审核 ==="
curl -s -b "$JAR" -X PATCH "$BASE/api/admin/books/$BID" -H "Content-Type: application/json" -d '{"action":"approve"}' | json "print('状态:', d['book']['status'])"

echo "=== 7. 通过后市集可见（13 本） ==="
curl -s "$BASE/api/books" | json "print('市集本数:', len(d['books']), '| 可见:', any(b['id']=='$BID' for b in d['books']), '（应 13 / True）')"

echo "=== 8. 清理测试书 ==="
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/api/books/$BID?ownerId=prod-ops-check")
echo "删除: $CODE（应 200）"
curl -s "$BASE/api/books" | json "print('终态市集:', len(d['books']), '本')"
curl -s -b "$JAR" -X POST "$BASE/api/admin/logout" -o /dev/null
rm -f "$JAR"
echo "=== 生产验证完成 ✅ ==="
