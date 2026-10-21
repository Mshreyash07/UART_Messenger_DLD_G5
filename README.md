# UART-Based Secure Digital Communication System

A **CS203 Group 5** project implementing an 8-bit UART communication system with ChaCha20 encryption and extended Hamming error correction. The design is written in Verilog and verified through simulation; the project scope is software/RTL simulation only, with no physical hardware or FPGA deployment currently included.

> **Status:** The baseline UART, ChaCha20, Hamming modules, secure top-level integration, and testbenches are present in the project. The end-to-end testbench has been prepared, but a top-level simulation should be run locally before claiming the integrated design has passed. Record actual simulator results in the project documentation.

## Project Overview

The project sends variable-length messages from a sender to a receiver over a UART serial link. Before transmission, the sender encrypts the message using ChaCha20 and protects each packet byte with extended Hamming (13,8). The receiver reconstructs the packet, corrects supported transmission errors, and decrypts the ciphertext.

The UART framing is **8N1**:

- 8 data bits
- No UART parity bit
- 1 stop bit
- Idle serial line HIGH
- Data transmitted least-significant bit first

The secure integration keeps UART framing separate from Hamming coding. Each 8-bit packet byte is Hamming-encoded into a 13-bit codeword, then sent as two ordinary UART payload bytes.

## Architecture

```text
Sender/host byte stream
        |
        v
+--------------------+
| ChaCha20 encryption|
+--------------------+
        |
        v
+--------------------------+
| Packet header + ciphertext|
| Sync, nonce, length, data |
+--------------------------+
        |
        v
+-------------------------+
| Hamming encoder (13,8)  |
+-------------------------+
        |
        v
+-------------------------+
| Hamming packetizer      |
| 13 bits -> two 8-bit    |
| UART payload bytes      |
+-------------------------+
        |
        v
+-------------------------+
| FIFO -> UART transmitter|
+-------------------------+
        |
        | Serial UART TX/RX channel
        v
+-------------------------+
| UART receiver          |
+-------------------------+
        |
        v
+-------------------------+
| Hamming depacketizer    |
| two bytes -> 13-bit word|
+-------------------------+
        |
        v
+-------------------------+
| Hamming decoder (13,8)  |
+-------------------------+
        |
        v
+-------------------------+
| Packet parser           |
| Sync, nonce, length     |
+-------------------------+
        |
        v
+-------------------------+
| ChaCha20 decryption     |
+-------------------------+
        |
        v
Recovered plaintext stream
```

`secure_uart_top.v` is the top-level module for the secure system. The original `uart_top.v` remains the basic UART integration and is not replaced by the secure top level.

## RTL Modules

| File | Responsibility |
|---|---|
| `rtl/baud_gen.v` | Generates baud-rate timing ticks from the system clock. |
| `rtl/uart_tx.v` | Serializes each 8-bit payload into a UART 8N1 frame. |
| `rtl/uart_rx.v` | Detects and samples incoming UART frames to recover bytes. |
| `rtl/fifo.v` | Buffers bytes before UART transmission. |
| `rtl/uart_top.v` | Original/basic UART integration. |
| `rtl/chacha20_keystream.v` | Shared ChaCha20 keystream/block generator. |
| `rtl/chacha20_encrypt.v` | Encrypts each plaintext byte by XORing it with the ChaCha20 keystream. |
| `rtl/chacha20_decrypt.v` | Recovers plaintext by XORing ciphertext with the same keystream, generated from the same key, nonce, and counter. |
| `rtl/hamming_encoder.v` | Encodes each 8-bit packet byte into an extended Hamming (13,8) codeword. |
| `rtl/hamming_decoder.v` | Decodes a 13-bit codeword, corrects supported single-bit errors, and reports detected double-bit errors. |
| `rtl/hamming_packetizer.v` | Splits each 13-bit codeword into two 8-bit UART payload bytes. |
| `rtl/hamming_depacketizer.v` | Reassembles the pair of UART payload bytes into a 13-bit codeword and checks padding bits. |
| `rtl/secure_uart_top.v` | Integrates encryption/decryption, packet handling, Hamming coding, FIFO, baud generator, UART TX, and UART RX. |

### Testbenches

The repository includes testbenches for both the original UART modules and the secure integration. Keep and run the baseline UART tests as well as the newer ChaCha20 and Hamming tests; the secure top-level test does not replace them.

| File | Scope |
|---|---|
| `tb/tb_baud_gen.v` | Baud-tick interval and reset behavior. |
| `tb/tb_fifo.v` | FIFO ordering, full/empty behavior, and boundary conditions. |
| `tb/tb_uart_tx.v` | UART transmitter framing, bit order, and TX status behavior. |
| `tb/tb_uart_rx.v` | UART receiver sampling and received-byte reconstruction. |
| `tb/tb_uart_top.v` | Basic UART top-level integration and loopback behavior. |
| `tb/tb_chacha20.v` | ChaCha20 known-vector, encryption/decryption, and multi-block tests. |
| `tb/tb_hamming_encoder.v` | Hamming encoder tests. |
| `tb/tb_hamming_decoder.v` | Hamming decoder tests, including error cases. |
| `tb/tb_hamming_system.v` | Hamming encoder/packetizer/depacketizer/decoder integration tests. |
| `tb/tb_secure_uart_top.v` | End-to-end secure UART loopback tests. |

## Hamming (13,8) Encoding and UART Packing

The secure design uses **extended Hamming (13,8)**: eight data bits plus five check bits. Under the standard SECDED assumptions it can correct a single-bit error and detect a double-bit error in a codeword.

For every 13-bit codeword `codeword[12:0]`, the packetizer transmits:

- First UART payload byte: `codeword[7:0]`
- Second UART payload byte: `{3'b000, codeword[12:8]}`

At the receiver, the depacketizer restores the codeword. The three padding bits must be zero. A Hamming codeword is not a UART frame: each of the two bytes is separately sent using ordinary 8N1 UART framing.

## Secure Packet Format

Every packet byte, including the header, is Hamming-encoded before UART transmission.

| Packet byte index | Contents |
|---|---|
| `0` | Sync byte `8'hC3` |
| `1` | Sync byte `8'h5A` |
| `2..13` | 96-bit nonce, most-significant byte first |
| `14` | Message length, high byte |
| `15` | Message length, low byte |
| `16` onward | ChaCha20 ciphertext, exactly `message_length` bytes |

The message length is supplied before transmission starts, and the host must provide exactly that many plaintext bytes.

## `secure_uart_top` Host Interface

### Transmit

1. Keep `key` stable when starting a message.
2. Configure `nonce_prefix` according to the nonce-uniqueness rules below.
3. Wait until `tx_message_ready` is HIGH and supply a nonzero `tx_message_length`.
4. Pulse `tx_message_start` while `tx_message_ready` is HIGH.
5. Supply exactly `tx_message_length` bytes using `tx_data_valid` and `tx_data_ready`. A byte transfers on a rising clock edge when both are HIGH.
6. Observe `tx_message_done` for completion and `tx_error` for rejected input or nonce exhaustion.

Zero-length messages are rejected by this interface. The message length is 16 bits, so the packet format supports lengths from 1 to 65,535 bytes, subject to available FIFO capacity, counter limits, and the behavior of the complete system.

### Receive

- `rx_data_valid` marks a recovered plaintext byte.
- `rx_data_last` marks the final byte of a received message.
- `rx_message_done` is asserted with the final valid plaintext byte.
- `rx_single_error_corrected` is a status pulse when a single-bit error was corrected.
- `rx_packet_error` reports a detected Hamming or packet-format error.

## Nonce Handling

The top-level creates the 96-bit nonce as:

```text
nonce = {nonce_prefix[63:0], nonce_counter[31:0]}
```

The 32-bit counter increments for each accepted message and stops rather than wrapping. **This is a counter-based nonce scheme, not a true random-number generator.** The nonce prefix is provided as an input and is not secret.

Never encrypt two different messages with the same ChaCha20 key and nonce. Because the counter resets when the hardware resets, the system must use a prefix that is unique for each sender/session under the same key, or preserve the counter across resets. For multiple senders sharing a key, nonce allocation must prevent collisions between senders as well.

## Security Limitations

- ChaCha20 provides confidentiality but does **not** authenticate the ciphertext or detect malicious modifications by itself.
- Hamming coding can correct supported accidental transmission errors. It is not a cryptographic integrity check and does not prevent intentional tampering or replay.
- For a real secure messaging design, use an authenticated encryption scheme such as **ChaCha20-Poly1305** and verify the authentication tag before releasing plaintext.
- This project's sync-and-length packet format is an educational integration baseline; it does not currently implement retransmission, authenticated packet sequence numbers, or comprehensive recovery after inserted/dropped UART bytes.

## Tools

- **Verilog** for RTL and testbenches
- **Icarus Verilog (`iverilog`)** for compilation
- **VVP (`vvp`)** for running simulations
- **GTKWave** for viewing VCD waveforms
- **Visual Studio Code** for editing and running commands
- **Git and GitHub** for version control

## How to Simulate

Run commands from the project root in a PowerShell terminal with Icarus Verilog installed. The commands below assume that the design files are in `rtl/`, the testbenches are in `tb/`, and the `sim/` directory exists. In PowerShell, create it if needed using:

```powershell
New-Item -ItemType Directory -Force sim | Out-Null
```

### End-to-end secure UART test

Compile the top-level design and its testbench:

```powershell
iverilog -g2012 -s tb_secure_uart_top -o sim/tb_secure_uart_top.out `
  tb/tb_secure_uart_top.v `
  rtl/secure_uart_top.v `
  rtl/baud_gen.v rtl/fifo.v rtl/uart_tx.v rtl/uart_rx.v `
  rtl/chacha20_keystream.v rtl/chacha20_encrypt.v rtl/chacha20_decrypt.v `
  rtl/hamming_encoder.v rtl/hamming_packetizer.v `
  rtl/hamming_depacketizer.v rtl/hamming_decoder.v

vvp sim/tb_secure_uart_top.out
```

The current `tb_secure_uart_top.v` testbench uses accelerated timing (100 MHz clock and 10 clocks per UART bit) and tests these clean-loopback messages:

1. `Hello` (5 bytes)
2. `Hello, I am Rishi!` (18 bytes)
3. A 70-byte message that crosses the ChaCha20 64-byte keystream-block boundary

It compares every received plaintext byte and message boundary, and stops with `$fatal` on a mismatch, unexpected packet error, or timeout. It does not inject serial-line bit errors; error correction is tested separately by the Hamming testbenches.

### ChaCha20 testbench

```powershell
iverilog -g2012 -s tb_chacha20 -o sim/tb_chacha20.out `
  rtl/chacha20_keystream.v rtl/chacha20_encrypt.v rtl/chacha20_decrypt.v `
  tb/tb_chacha20.v

vvp sim/tb_chacha20.out
```

### Hamming testbenches

```powershell
iverilog -g2012 -s tb_hamming_encoder -o sim/tb_hamming_encoder.out `
  rtl/hamming_encoder.v tb/tb_hamming_encoder.v
vvp sim/tb_hamming_encoder.out

iverilog -g2012 -s tb_hamming_decoder -o sim/tb_hamming_decoder.out `
  rtl/hamming_decoder.v tb/tb_hamming_decoder.v
vvp sim/tb_hamming_decoder.out

iverilog -g2012 -s tb_hamming_system -o sim/tb_hamming_system.out `
  rtl/hamming_encoder.v rtl/hamming_decoder.v `
  rtl/hamming_packetizer.v rtl/hamming_depacketizer.v `
  tb/tb_hamming_system.v
vvp sim/tb_hamming_system.out
```

### Basic UART regression testbenches

Run these five baseline testbenches as well as the secure top-level test. They verify the original UART modules individually and ensure that later secure-system changes do not silently break the basic UART design. All five testbench files are listed in the repository structure above.

```powershell
iverilog -g2012 -s tb_baud_gen -o sim/tb_baud_gen.out `
  tb/tb_baud_gen.v rtl/baud_gen.v
vvp sim/tb_baud_gen.out

iverilog -g2012 -s tb_fifo -o sim/tb_fifo.out `
  tb/tb_fifo.v rtl/fifo.v
vvp sim/tb_fifo.out

iverilog -g2012 -s tb_uart_tx -o sim/tb_uart_tx.out `
  tb/tb_uart_tx.v rtl/uart_tx.v rtl/baud_gen.v
vvp sim/tb_uart_tx.out

iverilog -g2012 -s tb_uart_rx -o sim/tb_uart_rx.out `
  tb/tb_uart_rx.v rtl/uart_rx.v
vvp sim/tb_uart_rx.out

iverilog -g2012 -s tb_uart_top -o sim/tb_uart_top.out `
  tb/tb_uart_top.v rtl/uart_top.v rtl/baud_gen.v `
  rtl/fifo.v rtl/uart_tx.v rtl/uart_rx.v
vvp sim/tb_uart_top.out
```

If one of these legacy testbench files is not present in your local `tb/` directory, skip only that corresponding command. Do not remove the testbench merely because the secure integration has its own test.

To inspect waveforms, add `$dumpfile` and `$dumpvars` to the relevant testbench, then open the generated VCD file in GTKWave, for example:

```powershell
gtkwave sim/secure_uart.vcd
```

The path in the `gtkwave` command must match the filename actually generated by the testbench.

## Verification Status

The integrated secure top-level testbench has been marked as compiled and run in the target environment, and end-to-end simulation logs and waveform screenshots have been marked as saved. Keep the actual logs and screenshots in the repository (for example, under `docs/` or `sim/`) so the results can be reviewed and reproduced.

Testbenches are provided for all five baseline UART components (`baud_gen`, `fifo`, `uart_tx`, `uart_rx`, and `uart_top`), as well as ChaCha20, Hamming, and the secure top-level integration. Run the baseline tests and secure-system tests together. Keep this section and the project progress checklist synchronized with the latest local simulator results.

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

- [x] Basic UART RTL modules are present (`baud_gen`, `fifo`, `uart_tx`, `uart_rx`).
- [x] Basic UART top level (`uart_top.v`) is retained.
- [x] ChaCha20 keystream, encryption, and decryption modules are present.
- [x] Extended Hamming (13,8) encoder and decoder are present.
- [x] Hamming packetizer and depacketizer are present.
- [x] Secure top-level integration (`secure_uart_top.v`) is present.
- [x] Unit and system testbench source files are present.
- [x] Compile and run the integrated secure top-level testbench in the target environment.
- [x] Save end-to-end simulation logs and waveform screenshots.

## License

No license has been selected yet. Unless a license is added, others should not assume the repository is licensed for reuse.
