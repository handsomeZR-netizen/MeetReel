#!/usr/bin/env bash
# 部署到 https://120.26.94.180/sukesong/
#
#   bash web/scripts/deploy.sh            # 部署当前分支已提交的 HEAD（干净副本构建，不带未提交的改动）
#   bash web/scripts/deploy.sh <commit>   # 部署某个提交
#
# 服务器上已经配好了（只在第一次部署时配过，这个脚本不碰 nginx）：
#   /etc/nginx/snippets/sukesong.conf   主站 80/443 的 /sukesong/ 反代到 127.0.0.1:18081
#   /etc/nginx/conf.d/sukesong.conf     18081 用 alias 指向 /opt/sukesong/current/
# 每次部署只是新增一个 /opt/sukesong/releases/<发布号>/，再把 current 软链接切过去；
# 回滚就是把 current 指回上一个目录。同机的 cityindex 等项目不受影响。
#
# 需要能免密 ssh 到服务器：默认用 ~/.ssh/config 里的 Host cityindex-server，可用 DEPLOY_HOST 覆盖。
set -euo pipefail

HOST="${DEPLOY_HOST:-cityindex-server}"
BASE="/sukesong/"
ROOT="$(git rev-parse --show-toplevel)"
REF="${1:-HEAD}"
SHA="$(git -C "$ROOT" rev-parse --short "$REF")"
FULL="$(git -C "$ROOT" rev-parse "$REF")"
BRANCH="$(git -C "$ROOT" rev-parse --abbrev-ref HEAD)"
RELEASE="$(date +%Y%m%d-%H%M%S)-$SHA"
TMP="$(mktemp -d)"

cleanup() {
  # node_modules 是链接到本地那份的，先拆链接再删临时目录，免得删到原件
  if [ -e "$TMP/web/node_modules" ]; then
    if command -v cmd >/dev/null 2>&1; then MSYS_NO_PATHCONV=1 cmd /c rmdir "$(cygpath -w "$TMP/web/node_modules")" >/dev/null 2>&1 || true
    else rm -f "$TMP/web/node_modules"; fi
  fi
  # 链接还在就不删，宁可留个临时目录
  if [ -e "$TMP/web/node_modules" ]; then echo "node_modules 链接没拆掉，保留 $TMP，请手动删" >&2; return; fi
  rm -rf "$TMP"
}
trap cleanup EXIT

echo "→ 构建 $BRANCH@$SHA（base $BASE）"
git -C "$ROOT" archive "$REF" | tar -x -C "$TMP"
if command -v cmd >/dev/null 2>&1; then
  MSYS_NO_PATHCONV=1 cmd /c mklink /J "$(cygpath -w "$TMP/web/node_modules")" "$(cygpath -w "$ROOT/web/node_modules")" >/dev/null
else
  ln -s "$ROOT/web/node_modules" "$TMP/web/node_modules"
fi
# MSYS_NO_PATHCONV：不然 Git Bash 会把 /sukesong/ 改写成 C:/Program Files/Git/sukesong/
(cd "$TMP/web" && npx tsc -b && MSYS_NO_PATHCONV=1 npx vite build --base "$BASE" --logLevel warn)
grep -q "src=\"$BASE" "$TMP/web/dist/index.html" || { echo "index.html 里的资源路径不是 $BASE 开头，停止部署" >&2; exit 1; }

echo "→ 上传到 $HOST:/opt/sukesong/releases/$RELEASE"
tar -czf "$TMP/release.tar.gz" -C "$TMP/web/dist" .
scp -q "$TMP/release.tar.gz" "$HOST:/opt/sukesong/$RELEASE.tar.gz"
ssh "$HOST" bash -s -- "$RELEASE" "$BRANCH" "$FULL" <<'REMOTE'
set -euo pipefail
cd /opt/sukesong
mkdir -p "releases/$1"
tar -xzf "$1.tar.gz" -C "releases/$1"
rm -f "$1.tar.gz"
prev="$(readlink -f current || true)"
printf '{"release": "%s", "previous": "%s", "branch": "%s", "commit": "%s", "working_tree_included": false}\n' "$1" "$prev" "$2" "$3" > "releases/$1/deployment.json"
ln -sfn "/opt/sukesong/releases/$1" current
# 只留最近 5 个版本
ls -1dt releases/*/ | tail -n +6 | xargs -r rm -rf
echo "current -> $(readlink -f current)"
REMOTE

code="$(curl -sk -o /dev/null -w '%{http_code}' "https://120.26.94.180$BASE")"
echo "→ https://120.26.94.180$BASE 返回 $code"
[ "$code" = 200 ]
