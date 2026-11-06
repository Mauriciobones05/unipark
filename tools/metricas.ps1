param([string]$BaseUrl = "http://192.168.4.1")
# Mostra as medicoes T01/T02/T05 guardadas no ESP32 (GET /api/metrics).
Invoke-RestMethod "$BaseUrl/api/metrics" | ConvertTo-Json -Depth 5
