# UART-Based Digital Communication System

A **CS203 Group 5** project to design and verify an 8-bit UART communication system using Verilog. The project is software-only: the design will be implemented and tested through simulation, without physical hardware or FPGA deployment.

> **Status:** Work in progress. The repository structure has been created; the Verilog modules and testbenches are planned implementation tasks. Features described below are goals, not completed results.

## Project Overview

UART (Universal Asynchronous Receiver/Transmitter) sends data serially without a separate clock wire between the transmitter and receiver. This project aims to implement a modular UART system that accepts 8-bit data, buffers bytes when needed, transmits UART frames, and reconstructs the data at the receiver.

The initial target configuration is **8N1**:

- 8 data bits
- No parity bit
- 1 stop bit
- Idle serial line is logic HIGH
- Data bits are transmitted least-significant bit first

The initial simulation parameters may use a 50 MHz system clock and 9600 baud. These values should be kept configurable where practical and confirmed by the team before implementation.

## Planned Core Features

- UART transmitter (TX) controlled by a finite state machine (FSM)
- UART receiver (RX) with start-bit detection and data sampling
- Baud-rate timing generator
- FIFO buffer to queue bytes and support burst input
- Top-level integration of the modules
- Verilog testbenches for individual modules and the complete system
- TX-to-RX loopback tests and waveform inspection
- Tests for reset, serial framing, FIFO ordering, and FIFO full/empty conditions

## Planned Extensions: Error Detection and Correction

After the basic UART system works, the team is considering adding error-control features. These are proposed extensions and are **not yet implemented**.

### 1. UART parity-bit support

Add selectable **even parity** and **odd parity** to the UART transmitter and receiver. With parity enabled, the transmitter sends an extra parity bit and the receiver checks it. A parity mismatch raises a `parity_error` flag.

- Keep 8N1 as the initial baseline configuration.
- Add 8E1 (8 data bits, even parity, 1 stop bit) and/or 8O1 (8 data bits, odd parity, 1 stop bit) as supported modes.
- Test normal frames and frames with an intentionally flipped data or parity bit.

**Limitation:** A parity bit detects many one-bit errors, but it does not detect every possible multi-bit error and cannot correct corrupted data.

### 2. Hamming-code protection for payload bytes

The team is also considering using a Hamming code to protect each 8-bit payload before it is passed to UART. The receiver would decode the protected payload after receiving the UART bytes.

- A Hamming (12,8) code adds four check bits to eight data bits and can correct a single-bit error under its standard assumptions.
- An extended Hamming (13,8) code adds an overall parity bit as well; it can provide single-error correction and double-error detection (SECDED).
- The coded bits would be transported using ordinary UART frames. This coding is separate from UART's optional frame parity bit.
- Testbenches should inject controlled bit errors and check correction/detection behavior.

The exact code and frame format will be selected after the basic UART has been verified. Hamming coding adds extra bits and implementation complexity, so it should be attempted only after the core TX/RX and FIFO paths are stable.

### Possible Future Extension: Secure Messaging

A further extension may encrypt message bytes before UART transmission and decrypt them at the receiver. This extension is not yet implemented and should be considered only after the baseline design works and the instructor approves the expanded scope. A secure design would also need sound key handling and message authentication; encryption alone does not guarantee tamper detection.

## Architecture

```text
8-bit input data
      |
      v
+-------------+
| FIFO Buffer |
+-------------+
      |
      v
+-------------------------+
| Optional payload encoder|
| (Hamming-code extension)|
+-------------------------+
      |
      v
+-------------+       +-------------------+
| UART TX FSM |<------| Baud-rate timing  |
| + optional  |       +-------------------+
| parity bit  |
+-------------+
      |
      | serial TX
      v
+-------------+       +-------------------+
| UART RX FSM |<------| Baud-rate timing  |
| + parity    |
| check       |
+-------------+
      |
      v
+-------------------------+
| Optional payload decoder|
| (Hamming-code extension)|
+-------------------------+
      |
      v
8-bit received data
      |
      v
Testbench compares sent and received data
```

The exact timing interface and FIFO read behavior will be defined during implementation. The baud-rate generator supplies timing; it does not carry payload data. The payload encoder/decoder are optional planned extensions and are not required for the initial 8N1 implementation.

## Repository Structure

```text
UART_Project/
├── rtl/                  # Verilog design modules
│   ├── baud_gen.v
│   ├── fifo.v
│   ├── uart_tx.v
│   ├── uart_rx.v
│   └── uart_top.v
├── tb/                   # Verilog testbenches
│   ├── tb_baud_gen.v
│   ├── tb_fifo.v
│   ├── tb_uart_tx.v
│   ├── tb_uart_rx.v
│   └── tb_uart_top.v
├── sim/                  # Generated simulation outputs (not all files are committed)
├── docs/                 # Proposal, report, and diagrams
├── README.md
└── .gitignore
```

If the parity or Hamming extensions are approved, additional RTL modules and testbenches can be added, such as `parity_check.v`, `hamming_encoder.v`, `hamming_decoder.v`, `tb_parity.v`, and `tb_hamming.v`.

## Tools

The team plans to use:

- **Verilog** for the design and testbenches
- **Icarus Verilog** to compile and run simulations
- **GTKWave** to inspect waveform files
- **Visual Studio Code** as the code editor
- **Git and GitHub** for version control and collaboration

Other simulators may be used if required by the course.

## How to Simulate

Once the top-level module and testbench have been implemented, run commands similar to the following from the repository root in a shell with Icarus Verilog installed:

```bash
iverilog -g2012 -o sim/uart_sim \
  tb/tb_uart_top.v \
  rtl/uart_top.v \
  rtl/uart_tx.v \
  rtl/uart_rx.v \
  rtl/fifo.v \
  rtl/baud_gen.v

vvp sim/uart_sim
```

To inspect waveforms, the testbench should generate a VCD file using `$dumpfile` and `$dumpvars`. Open the generated VCD file in GTKWave, for example:

```bash
gtkwave sim/uart.vcd
```

These commands are templates and may need to be adjusted to match the final module interfaces and waveform output path. They will not work until the source modules and testbench have been implemented.

## Verification Plan

The planned verification includes:

1. Reset and initial-state checks.
2. Baud tick interval checks.
3. UART TX start bit, eight data bits, stop bit, and bit-order checks.
4. UART RX reconstruction of generated test frames.
5. FIFO ordering, full/empty, and boundary-condition tests.
6. Loopback tests comparing each transmitted byte with the corresponding received byte.
7. Multi-byte burst tests to check that bytes are preserved and delivered in order.
8. **Parity extension:** verify even/odd parity generation, correct parity acceptance, and parity-error flagging after controlled bit flips.
9. **Hamming extension:** inject single-bit errors to test correction and, if extended Hamming (13,8) is selected, inject double-bit errors to test detection.

Simulation results and waveform screenshots will be added after tests are run. No successful results are claimed at this stage.

## Team

- **Course:** CS203
- **Group:** 5

| Roll Number | Name |
|---|---|
| 2025CSB1223 | Mishra Rishikesh |
| 2025CSB1204 | Kanchi Aggarwal |
| 2025CSB1995 | Gunjan Chaudhary |
| 2025CSB1220 | Meet Trivedi |
| 2025CSB1221 | Menkudle Shreyash |

## Current Progress

- [x] Repository folder structure created
- [ ] Baud-rate generator implemented and tested
- [ ] UART transmitter implemented and tested
- [ ] UART receiver implemented and tested
- [ ] FIFO implemented and tested
- [ ] Top-level integration completed
- [ ] Loopback and burst tests passing
- [ ] Simulation waveforms and results documented
- [ ] UART parity extension designed and tested
- [ ] Hamming-code extension scope finalized and tested
- [ ] Optional security extension evaluated

## License

No license has been selected yet. Unless a license is added, others should not assume the repository is licensed for reuse.
