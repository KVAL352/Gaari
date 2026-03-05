#!/bin/bash
# Quick health checks — runs in parallel, outputs JSON-like results

echo "=== SITE ==="
curl -s -o /dev/null -w "status=%{http_code} time=%{time_total}s" https://gaari.no
echo ""

echo "=== API ==="
curl -s https://gaari.no/api/health

echo ""
echo "=== SSL ==="
echo | openssl s_client -servername gaari.no -connect gaari.no:443 2>/dev/null | openssl x509 -noout -enddate -subject 2>/dev/null || echo "SSL check failed"

echo ""
echo "=== GHA ==="
gh run list --workflow=scrape.yml --limit 3 --json status,conclusion,startedAt,updatedAt 2>/dev/null || echo "gh CLI not available"
