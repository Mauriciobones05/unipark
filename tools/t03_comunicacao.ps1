<#
  T03 - Comunicacao Wi-Fi: envia N comandos VALIDOS e mede o tempo de resposta.
  Uso (conectado ao Wi-Fi "Cancela-ESP32"):   powershell -ExecutionPolicy Bypass -File tools\t03_comunicacao.ps1
  Os comandos alternam /api/mode auto|manual (sempre validos, nao movem o servo).
  Saida: tabela no console + tools\t03_resultado.csv (resultado REAL medido; nao e inventado).
#>
param([string]$BaseUrl = "http://192.168.4.1", [int]$N = 20, [int]$LimitMs = 1000, [int]$MinOk = 19)
$rows = @(); $ok = 0
for ($i = 1; $i -le $N; $i++) {
  $mode = if ($i % 2) { "manual" } else { "auto" }
  $sw = [Diagnostics.Stopwatch]::StartNew()
  $status = 0
  try {
    $r = Invoke-WebRequest -Uri "$BaseUrl/api/mode" -Method POST -Body @{ mode = $mode } -TimeoutSec 2 -UseBasicParsing
    $status = [int]$r.StatusCode
  } catch { if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode } }
  $sw.Stop()
  $ms = [int]$sw.ElapsedMilliseconds
  $pass = ($status -eq 200 -and $ms -le $LimitMs)
  if ($pass) { $ok++ }
  $rows += [pscustomobject]@{ N = $i; Comando = "mode=$mode"; HTTP = $status; TempoMs = $ms; Dentro1s = $pass }
  Start-Sleep -Milliseconds 300
}
$rows | Format-Table -AutoSize
$rows | Export-Csv -Path "$PSScriptRoot\t03_resultado.csv" -NoTypeInformation -Encoding UTF8
$avg = [math]::Round(($rows | Measure-Object TempoMs -Average).Average, 1)
$max = ($rows | Measure-Object TempoMs -Maximum).Maximum
"Sucesso: $ok/$N (minimo exigido: $MinOk)  | media: $avg ms | maximo: $max ms"
if ($ok -ge $MinOk) { "T03: ATENDIDO" } else { "T03: NAO ATENDIDO" }
