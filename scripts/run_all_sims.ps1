# CS203 Group 5 - Automated Simulation Suite Runner
# Runs all 9 Icarus Verilog testbenches and reports status

$ErrorActionPreference = "Continue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  CS203 Group 5 - Secure UART Messenger Simulation Suite   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

if (-not (Test-Path "sim")) {
    New-Item -ItemType Directory -Force "sim" | Out-Null
}

$tests = @(
    @{
        name = "tb_baud_gen"
        top = "tb_baud_gen"
        files = @("tb/tb_baud_gen.v", "rtl/baud_gen.v")
    },
    @{
        name = "tb_fifo"
        top = "tb_fifo"
        files = @("tb/tb_fifo.v", "rtl/fifo.v")
    },
    @{
        name = "tb_uart_tx"
        top = "tb_uart_tx"
        files = @("tb/tb_uart_tx.v", "rtl/uart_tx.v", "rtl/baud_gen.v")
    },
    @{
        name = "tb_uart_rx"
        top = "tb_uart_rx"
        files = @("tb/tb_uart_rx.v", "rtl/uart_rx.v")
    },
    @{
        name = "tb_hamming_encoder"
        top = "tb_hamming_encoder"
        files = @("rtl/hamming_encoder.v", "tb/tb_hamming_encoder.v")
    },
    @{
        name = "tb_hamming_decoder"
        top = "tb_hamming_decoder"
        files = @("rtl/hamming_encoder.v", "rtl/hamming_decoder.v", "tb/tb_hamming_decoder.v")
    },
    @{
        name = "tb_hamming_system"
        top = "tb_hamming_system"
        files = @("rtl/hamming_encoder.v", "rtl/hamming_decoder.v", "rtl/hamming_packetizer.v", "rtl/hamming_depacketizer.v", "tb/tb_hamming_system.v")
    },
    @{
        name = "tb_chacha20"
        top = "tb_chacha20"
        files = @("rtl/chacha20_keystream.v", "rtl/chacha20_encrypt.v", "rtl/chacha20_decrypt.v", "tb/tb_chacha20.v")
    },
    @{
        name = "tb_uart_top"
        top = "tb_secure_uart_top"
        files = @(
            "tb/tb_uart_top.v",
            "rtl/uart_top.v",
            "rtl/baud_gen.v",
            "rtl/fifo.v",
            "rtl/uart_tx.v",
            "rtl/uart_rx.v",
            "rtl/chacha20_keystream.v",
            "rtl/chacha20_encrypt.v",
            "rtl/chacha20_decrypt.v",
            "rtl/hamming_encoder.v",
            "rtl/hamming_packetizer.v",
            "rtl/hamming_depacketizer.v",
            "rtl/hamming_decoder.v"
        )
    }
)

$passed = 0
$total = $tests.Count

foreach ($t in $tests) {
    Write-Host "`n[COMPILING] $($t.name)..." -ForegroundColor Yellow
    $outFile = "sim/$($t.name).out"
    $cmd = "iverilog -g2012 -s $($t.top) -o $outFile " + ($t.files -join " ")
    Invoke-Expression $cmd
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAILED: Compilation error in $($t.name)" -ForegroundColor Red
        continue
    }

    Write-Host "[RUNNING] $($t.name)..." -ForegroundColor Cyan
    $runCmd = "vvp $outFile"
    $output = Invoke-Expression $runCmd
    Write-Host $output

    if ($LASTEXITCODE -eq 0) {
        Write-Host ">>> PASS: $($t.name)" -ForegroundColor Green
        $passed++
    } else {
        Write-Host ">>> FAIL: $($t.name)" -ForegroundColor Red
    }
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "  SIMULATION RESULT: $passed / $total Testbenches Passed  " -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
Write-Host "==========================================================" -ForegroundColor Cyan
