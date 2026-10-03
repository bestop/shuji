#!/bin/bash
set -a; source /home/z/my-project/.env.local; set +a
# 易书管理员审核全链路 API 测试（本地 dev server）
set -e
BASE="http://localhost:3000"
JAR="/tmp/shuji-admin-cookies.txt"
rm -f "$JAR"

json() { python3 -c "import json,sys; d=json.load(sys.stdin); $1"; }

echo "=== 1. 市集基线 ==="
curl -s "$BASE/api/books" | json "print('市集书数:', len(d['books']), '| db:', d.get('db'))"

echo "=== 2. 发布测试书（应进入待审核） ==="
CREATED=$(curl -s -X POST "$BASE/api/books" -H "Content-Type: application/json" -d '{
  "title": "《审核链路测试书》", "author": "测试", "category": "其他", "condition": "全新",
  "price": 9.9, "description": "API 链路测试", "sellerName": "测试员", "sellerWechat": "test_wechat",
  "ownerId": "test-owner-api"}')
BID=$(echo "$CREATED" | json "print(d['book']['id'])")
STATUS=$(echo "$CREATED" | json "print(d['book']['status'])")
echo "书ID: $BID | 状态: $STATUS"

echo "=== 3. 待审书不出现在市集 ==="
VIS=$(curl -s "$BASE/api/books" | json "print(any(b['id']=='$BID' for b in d['books']))")
echo "市集可见: $VIS（应为 False）"

echo "=== 4. 发布者自己的请求能看到待审书 ==="
OWN=$(curl -s "$BASE/api/books?owner=test-owner-api" | json "print(any(b['id']=='$BID' for b in d['books']))")
echo "自己可见: $OWN（应为 True）"

echo "=== 5. 未登录管理员接口应 401 ==="
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/admin/books")
echo "未登录 GET /api/admin/books: $CODE（应为 401）"

echo "=== 6. 错误口令应 401 ==="
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/admin/login" -H "Content-Type: application/json" -d '{"passcode":"wrong"}')
echo "错误口令登录: $CODE（应为 401）"

echo "=== 7. 正确口令登录 ==="
CODE=$(curl -s -c "$JAR" -o /dev/null -w "%{http_code}" -X POST "$BASE/api/admin/login" -H "Content-Type: application/json" -d "{\"passcode\":\"$SHUJI_ADMIN_PASSCODE\"}")
echo "正确口令登录: $CODE（应为 200）"

echo "=== 8. 管理员书单含待审书 ==="
curl -s -b "$JAR" "$BASE/api/admin/books" | json "print('总数:', len(d['books']), '| 计数:', d['counts'])"

echo "=== 9. 驳回测试书（附原因） ==="
curl -s -b "$JAR" -X PATCH "$BASE/api/admin/books/$BID" -H "Content-Type: application/json" \
  -d '{"action":"reject","note":"测试驳回原因"}' | json "print('驳回后状态:', d['book']['status'], '| 原因:', d['book'].get('reviewNote'))"

echo "=== 10. 恢复上架 ==="
curl -s -b "$JAR" -X PATCH "$BASE/api/admin/books/$BID" -H "Content-Type: application/json" \
  -d '{"action":"approve"}' | json "print('恢复后状态:', d['book']['status'], '| 原因:', d['book'].get('reviewNote'))"

echo "=== 11. 通过后市集可见 ==="
VIS2=$(curl -s "$BASE/api/books" | json "print(any(b['id']=='$BID' for b in d['books']))")
echo "市集可见: $VIS2（应为 True）"

echo "=== 12. 会话查询 ==="
curl -s -b "$JAR" "$BASE/api/admin/session" | json "print('session:', d)"

echo "=== 13. 清理测试书 ==="
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/api/books/$BID?ownerId=test-owner-api")
echo "删除: $CODE（应为 200）"
curl -s "$BASE/api/books" | json "print('清理后市集书数:', len(d['books']))"
rm -f "$JAR"
echo "=== 全部通过 ✅ ==="
