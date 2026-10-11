# CS203 Group 5 --- UART-Based Digital Communication System

**Course:** CS203\
**Group:** 5\
**Project stage:** Stage 2 --- Initial Development completed\
**Implementation type:** Software-only Verilog design verified by
simulation

## 1. Project Overview

This project implements an 8-bit Universal Asynchronous
Receiver/Transmitter (UART) communication system in Verilog. The current
implementation is software-only: RTL modules are compiled and tested
using Icarus Verilog, and signal timing is inspected using GTKWave. No
physical hardware or FPGA deployment has been performed.

The baseline uses UART 8N1 framing: one LOW start bit, eight data bits
transmitted least-significant bit first, no parity bit, one HIGH stop
bit, and a HIGH idle line.

## 2. Problem Statement

Parallel data transfer requires multiple data wires, in addition to
control and ground connections. UART enables serial communication by
sending data one bit at a time over a serial line. A practical digital
communication design also needs timing control, buffering, transmitter
and receiver state machines, and verification that bytes arrive
correctly and in order.

This project addresses these needs with a modular UART design, a FIFO
buffer, and a simulated TX-to-RX loopback path.

## 3. Objectives

1.  Generate UART transmission timing from a system clock.
2.  Convert 8-bit parallel input data into a serial UART frame.
3.  Receive a serial frame and reconstruct the original byte.
4.  Buffer input bytes in a 16-entry FIFO.
5.  Coordinate FIFO reads and UART transmission using a top-level
    controller.
6.  Verify modules individually and as an integrated system.
7.  Inspect waveforms to understand timing and control-state
    transitions.
8.  Maintain source code, testbenches, and documentation in GitHub.

## 4. System Architecture

``` text
                   8-bit input data
                          |
                          v
                    +-----------+
                    | FIFO (16) |
                    +-----------+
                          |
                          v
                    +-----------+       +------------------+
                    | UART TX   |<------| Baud Generator   |
                    | FSM       |       +------------------+
                    +-----------+
                          |
                          | Serial TX (loopback in testbench)
                          v
                    +-----------+
                    | UART RX   |
                    | FSM       |
                    +-----------+
                          |
                          v
                    8-bit rx_data
                          |
                          v
                Testbench compares expected
                    and received bytes

Top-level controller coordinates FIFO reads and TX.
The testbench connects TX to RX for loopback testing.
```

The baud generator supplies timing pulses to the transmitter. The
receiver uses its configured clocks-per-bit parameter and derives its
sampling sequence from detection of the incoming start bit. The FIFO
temporarily stores bytes and preserves their order while the transmitter
is busy.

## 5. RTL Modules

  -----------------------------------------------------------------------
  File                                Responsibility
  ----------------------------------- -----------------------------------
  `rtl/baud_gen.v`                    Generates periodic baud timing
                                      ticks from the system clock.

  `rtl/uart_tx.v`                     Sends a start bit, eight data bits,
                                      and a stop bit; exposes `tx_busy`
                                      and `tx_done`.

  `rtl/uart_rx.v`                     Detects the start bit, samples
                                      eight data bits, checks the stop
                                      bit, and reports a completed byte
                                      through `rx_data` and `rx_done`.

  `rtl/fifo.v`                        Implements a 16-byte FIFO with
                                      read/write pointers, occupancy
                                      count, `full`, and `empty` status.

  `rtl/uart_top.v`                    Connects the FIFO, baud generator,
                                      TX, RX, and controller that
                                      sequences FIFO reads and
                                      transmissions.
  -----------------------------------------------------------------------

## 6. Tools and Development Environment

-   Verilog --- RTL design and testbenches
-   Visual Studio Code --- editing and running commands
-   Icarus Verilog (`iverilog`) --- compilation
-   VVP (`vvp`) --- running compiled simulations
-   GTKWave --- viewing VCD waveforms
-   Git and GitHub --- version control and project sharing

## 7. Stage 2 Implementation and Verification

Stage 2 --- Initial Development --- is completed according to the
current project progress. The core modules have been implemented,
individual tests have been run, and the top-level loopback test has
passed.

### 7.1 Baud-rate generator

The baud-generator testbench checked timing with reduced simulation
parameters. The reported output showed five ticks at clock cycles 10,
20, 30, 40, and 50, followed by a passing timing check.

### 7.2 UART transmitter

The transmitter uses an FSM to produce UART frames and exposes
transmission status signals. The TX testbench was prepared to test byte
patterns `A5`, `3C`, `00`, and `FF`, and the waveform was inspected in
GTKWave. The transmitter tests were reported as passing during
development.

### 7.3 UART receiver

The RX testbench sent a simulated UART frame for `8'hA5`. The test
passed and the receiver reconstructed `A5`. The waveform can be
inspected for serial input, receiver state, bit index, received byte,
and completion pulse.

### 7.4 FIFO

The 16-byte FIFO testbench passed these checks: - Reset and initial
empty/full flags - FIFO ordering - Full flag after filling all 16
entries - Rejection of a write request while full - Correct data order
while draining - Pointer wraparound

The FIFO has a registered `dout` output, so the top-level controller
provides a fetch step before starting transmission with the read byte.

### 7.5 Top-level integration and loopback

The top-level testbench connects `tx` to `rx` and sends four bytes
through the FIFO and UART path. The reported end-to-end tests passed for
`A5`, `3C`, `00`, and `FF`. The testbench checks that the receiver
returns each expected byte in order.

### 7.6 Verification summary

  -----------------------------------------------------------------------
  Component                           Reported result
  ----------------------------------- -----------------------------------
  Baud-rate generator                 Timing test passed

  UART transmitter                    Tests reported passing; waveform
                                      inspected

  UART receiver                       `A5` receive test passed

  FIFO                                Reset, ordering, full/empty,
                                      overflow rejection, draining, and
                                      wraparound tests passed

  Top-level loopback                  Four-byte test passed (`A5`, `3C`,
                                      `00`, `FF`)
  -----------------------------------------------------------------------

These are simulation results. They do not establish physical electrical
performance or hardware-level operation.

## 8. How to Run the Simulations

Run commands from the project root in a VS Code terminal where Icarus
Verilog is available. Ensure the `sim/` directory exists before running
testbenches that write VCD files.

### Baud generator

``` powershell
iverilog -g2012 -s tb_baud_gen -o sim/tb_baud_gen.out tb/tb_baud_gen.v rtl/baud_gen.v
vvp sim/tb_baud_gen.out
gtkwave sim/baud_gen.vcd
```

### FIFO

``` powershell
iverilog -g2012 -s tb_fifo -o sim/tb_fifo.out tb/tb_fifo.v rtl/fifo.v
vvp sim/tb_fifo.out
gtkwave sim/fifo.vcd
```

### UART transmitter

``` powershell
iverilog -g2012 -s tb_uart_tx -o sim/tb_uart_tx.out tb/tb_uart_tx.v rtl/uart_tx.v rtl/baud_gen.v
vvp sim/tb_uart_tx.out
gtkwave sim/uart_tx.vcd
```

### UART receiver

``` powershell
iverilog -g2012 -s tb_uart_rx -o sim/tb_uart_rx.out tb/tb_uart_rx.v rtl/uart_rx.v
vvp sim/tb_uart_rx.out
gtkwave sim/uart_rx.vcd
```

### Complete top-level loopback

``` powershell
iverilog -g2012 -s tb_uart_top -o sim/tb_uart_top.out tb/tb_uart_top.v rtl/uart_top.v rtl/baud_gen.v rtl/fifo.v rtl/uart_tx.v rtl/uart_rx.v
vvp sim/tb_uart_top.out
gtkwave sim/uart_top.vcd
```

Waveform paths depend on each testbench's `$dumpfile(...)` setting. If a
VCD file is not generated at the listed path, check that setting and
rerun the simulation.

## 9. Simulation Evidence

The `docs/` directory should contain the screenshots and test log that
actually exist in the repository. Recommended filenames are:

-   `baud_gen_waveform.png` --- clock, reset, baud tick, and counter
-   `uart_tx_waveform.png` --- TX line, data, busy/done, and TX FSM
    state
-   `uart_rx_waveform.png` --- RX serial input, received data, and
    completion pulse
-   `fifo_waveform.png` --- read/write activity, data order, count, and
    full/empty flags
-   `uart_top_waveform.png` --- FIFO status, TX activity, RX data, and
    controller state
-   `simulation_results.txt` --- terminal output copied from actual test
    runs

Only list an item as included if the corresponding file exists in
`docs/`. VCD files are generated by running simulations and may remain
in `sim/` locally; whether they are committed is controlled by
`.gitignore`.

## 10. Current Scope and Limitations

-   The implemented baseline uses UART 8N1 framing, without parity.
-   Verification is simulation-only; no physical hardware or FPGA
    deployment has been performed.
-   The receiver checks that the stop bit is HIGH, but the current
    interface does not expose a dedicated framing-error output.
-   The current loopback verifies functional byte transfer for the
    tested patterns; it is not a security or cryptographic system.
-   Parity, Hamming-code protection, and encryption are planned
    extensions, not features of the Stage 2 baseline.

## 11. Planned Extensions for the Next Stage

### 11.1 Parity-based error detection

Extend frame handling to support a selected parity mode, such as even or
odd parity. Add parity generation at the transmitter, checking at the
receiver, a `parity_error` status, and tests for valid parity and
intentionally corrupted frames. Update the frame format and interfaces
consistently at both ends.

### 11.2 Hamming-code error correction

Add a Hamming encoder before transmission and a matching decoder after
reception. Select and document the code format before implementation.
Hamming (12,8) can correct a single-bit error; an extended Hamming code
can provide single-error correction and double-error detection (SECDED).
Test error-free data, injected single-bit errors, and applicable
double-bit-error cases.

### 11.3 Encrypted payloads

If time and project scope permit, investigate encrypting payload bytes
before transmission and decrypting them after reception. Document the
chosen algorithm and key-handling assumptions. Encryption alone does not
guarantee message integrity, so authenticated integrity protection
should be considered for a secure-messaging demonstration.

## 12. Team Members

  Roll Number   Name
  ------------- -------------------
  2025CSB1223   Mishra Rishikesh
  2025CSB1204   Kanchi Aggarwal
  2025CSB1995   Gunjan Chaudhary
  2025CSB1220   Meet Trivedi
  2025CSB1221   Menkudle Shreyash

## 13. Stage Status

**Stage 2 --- Initial Development: Completed.**

The core RTL modules, testbenches, top-level integration, and reported
simulation checks are in place. The next stage is to continue
verification and extend the design with parity-based error detection and
Hamming-code protection. Encryption remains a proposed extension until
its scope and implementation are decided.

------------------------------------------------------------------------

**Report maintenance note:** Keep this document synchronized with the
actual repository files and latest test output. Do not mark a waveform
screenshot or test log as included until it has been saved under
`docs/`.
