`timescale 1ns/1ps

module tb_secure_uart_top;

    localparam integer CLK_FREQ_HZ = 100000000;
    localparam integer BAUD_RATE   = 10000000; 
    localparam integer MAX_TEST_BYTES = 1024;

    reg clk;
    reg rst;

    reg [255:0] key;
    reg [63:0]  nonce_prefix;

    reg         tx_message_start;
    reg [15:0]  tx_message_length;
    wire        tx_message_ready;
    reg [7:0]   tx_data;
    reg         tx_data_valid;
    wire        tx_data_ready;
    wire        tx_message_busy;
    wire        tx_message_done;
    wire        tx_error;
    wire        tx_nonce_exhausted;

    wire        serial_tx;
    wire        uart_tx_busy;
    wire        uart_tx_done;
    wire        uart_rx_busy;

    wire [7:0]  rx_data;
    wire        rx_data_valid;
    wire        rx_data_last;
    wire        rx_message_done;
    wire        rx_single_error_corrected;
    wire        rx_packet_error;
    wire        tx_fifo_full;
    wire        tx_fifo_empty;

    reg [7:0] tx_message_buffer [0:MAX_TEST_BYTES-1];
    reg [7:0] expected_data      [0:MAX_TEST_BYTES-1];
    reg       expected_last      [0:MAX_TEST_BYTES-1];

    integer expected_total;
    integer rx_count;
    integer completed_message_count;
    integer tx_done_count;

    integer i;
    integer expected_cursor;

    initial begin
        clk = 1'b0;
        forever #5 clk = ~clk;
    end

    secure_uart_top #(
        .CLK_FREQ_HZ(CLK_FREQ_HZ),
        .BAUD_RATE(BAUD_RATE),
        .TX_FIFO_DEPTH(16)
    ) dut (
        .clk(clk),
        .rst(rst),
        .key(key),
        .nonce_prefix(nonce_prefix),

        .tx_message_start(tx_message_start),
        .tx_message_length(tx_message_length),
        .tx_message_ready(tx_message_ready),
        .tx_data(tx_data),
        .tx_data_valid(tx_data_valid),
        .tx_data_ready(tx_data_ready),
        .tx_message_busy(tx_message_busy),
        .tx_message_done(tx_message_done),
        .tx_error(tx_error),
        .tx_nonce_exhausted(tx_nonce_exhausted),

        .tx(serial_tx),
        .rx(serial_tx),
        .uart_tx_busy(uart_tx_busy),
        .uart_tx_done(uart_tx_done),
        .uart_rx_busy(uart_rx_busy),

        .rx_data(rx_data),
        .rx_data_valid(rx_data_valid),
        .rx_data_last(rx_data_last),
        .rx_message_done(rx_message_done),
        .rx_single_error_corrected(rx_single_error_corrected),
        .rx_packet_error(rx_packet_error),
        .tx_fifo_full(tx_fifo_full),
        .tx_fifo_empty(tx_fifo_empty)
    );

    always @(posedge clk) begin
        if (rst) begin
            rx_count               <= 0;
            completed_message_count <= 0;
            tx_done_count          <= 0;
        end else begin
            if (tx_error)
                $fatal(1, "FAIL: secure_uart_top asserted tx_error");

            if (tx_nonce_exhausted)
                $fatal(1, "FAIL: nonce counter unexpectedly exhausted");

            if (rx_packet_error)
                $fatal(1, "FAIL: receiver reported a Hamming/packet format error");

            if (rx_single_error_corrected)
                $fatal(1, "FAIL: unexpected corrected error during clean loopback");

            if (tx_message_done)
                tx_done_count <= tx_done_count + 1;

            if (rx_data_valid) begin
                if (rx_count >= expected_total)
                    $fatal(1, "FAIL: received more bytes than expected (extra byte %0d)",rx_count);

                if (rx_data !== expected_data[rx_count]) begin
                    $display("Mismatch at byte %0d: expected 0x%02x, got 0x%02x",
                             rx_count, expected_data[rx_count], rx_data);
                    $fatal(1, "FAIL: recovered plaintext mismatch");
                end

                if (rx_data_last !== expected_last[rx_count]) begin
                    $display("Message-boundary mismatch at byte %0d: expected last=%b, got last=%b",
                             rx_count, expected_last[rx_count], rx_data_last);
                    $fatal(1, "FAIL: rx_data_last asserted at the wrong position");
                end

                if (rx_message_done !== rx_data_last)
                    $fatal(1, "FAIL: rx_message_done should coincide with the final valid byte");

                if (rx_data_last)
                    completed_message_count <= completed_message_count + 1;

                rx_count <= rx_count + 1;
            end else if (rx_message_done) begin
                $fatal(1, "FAIL: rx_message_done asserted without rx_data_valid");
            end
        end
    end

    task send_message;
        input integer message_len;
        integer j;
        begin
            @(negedge clk);
            tx_message_length = message_len[15:0];

            while (tx_message_ready !== 1'b1)
                @(negedge clk);

            tx_message_start = 1'b1;
            @(posedge clk); 
            @(negedge clk);
            tx_message_start = 1'b0;

            for (j = 0; j < message_len; j = j + 1) begin
                tx_data = tx_message_buffer[j];
                tx_data_valid = 1'b1;

                do begin
                    @(posedge clk);
                end while (tx_data_ready !== 1'b1);

                @(negedge clk);
                tx_data_valid = 1'b0;
                tx_data = 8'h00;
            end
        end
    endtask

    task wait_for_messages;
        input integer target_count;
        integer cycles_waited;
        begin
            cycles_waited = 0;
            while ((tx_done_count < target_count) ||
                   (completed_message_count < target_count)) begin
                @(posedge clk);
                cycles_waited = cycles_waited + 1;
                if (cycles_waited > 500000)
                    $fatal(1, "FAIL: timeout waiting for message %0d (TX done=%0d, RX done=%0d)",
                           target_count, tx_done_count, completed_message_count);
            end
            @(negedge clk);
        end
    endtask

    initial begin
        rst                       = 1'b1;
        key                       = 256'h000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f;
        nonce_prefix              = 64'hA0A1A2A3A4A5A6A7;
        tx_message_start          = 1'b0;
        tx_message_length         = 16'd0;
        tx_data                   = 8'h00;
        tx_data_valid             = 1'b0;
        expected_total            = 0;
        expected_cursor           = 0;

        for (i = 0; i < MAX_TEST_BYTES; i = i + 1) begin
            tx_message_buffer[i] = 8'h00;
            expected_data[i]     = 8'h00;
            expected_last[i]     = 1'b0;
        end

        tx_message_buffer[0] = 8'h48; 
        tx_message_buffer[1] = 8'h65; 
        tx_message_buffer[2] = 8'h6c; 
        tx_message_buffer[3] = 8'h6c; 
        tx_message_buffer[4] = 8'h6f; 
        for (i = 0; i < 5; i = i + 1)
            expected_data[expected_cursor + i] = tx_message_buffer[i];
        expected_last[expected_cursor + 4] = 1'b1;
        expected_cursor = expected_cursor + 5;

        tx_message_buffer[0]  = 8'h48; 
        tx_message_buffer[1]  = 8'h65; 
        tx_message_buffer[2]  = 8'h6c; 
        tx_message_buffer[3]  = 8'h6c; 
        tx_message_buffer[4]  = 8'h6f; 
        tx_message_buffer[5]  = 8'h2c; 
        tx_message_buffer[6]  = 8'h20; 
        tx_message_buffer[7]  = 8'h49; 
        tx_message_buffer[8]  = 8'h20; 
        tx_message_buffer[9]  = 8'h61; 
        tx_message_buffer[10] = 8'h6d; 
        tx_message_buffer[11] = 8'h20; 
        tx_message_buffer[12] = 8'h52; 
        tx_message_buffer[13] = 8'h69; 
        tx_message_buffer[14] = 8'h73; 
        tx_message_buffer[15] = 8'h68; 
        tx_message_buffer[16] = 8'h69; 
        tx_message_buffer[17] = 8'h21; 
        for (i = 0; i < 18; i = i + 1)
            expected_data[expected_cursor + i] = tx_message_buffer[i];
        expected_last[expected_cursor + 17] = 1'b1;
        expected_cursor = expected_cursor + 18;

        for (i = 0; i < 70; i = i + 1) begin
            tx_message_buffer[i] = 8'h41 + (i % 26); 
            expected_data[expected_cursor + i] = tx_message_buffer[i];
        end
        expected_last[expected_cursor + 69] = 1'b1;
        expected_cursor = expected_cursor + 70;
        expected_total = expected_cursor; 

        repeat (8) @(posedge clk);
        @(negedge clk);
        rst = 1'b0;

        $display("Starting test 1: 5-byte message (Hello)");

        tx_message_buffer[0] = 8'h48;
        tx_message_buffer[1] = 8'h65;
        tx_message_buffer[2] = 8'h6c;
        tx_message_buffer[3] = 8'h6c;
        tx_message_buffer[4] = 8'h6f;
        send_message(5);
        wait_for_messages(1);
        $display("PASS: 5-byte message recovered");

        $display("Starting test 2: 18-byte message");
        tx_message_buffer[0]  = 8'h48;
        tx_message_buffer[1]  = 8'h65;
        tx_message_buffer[2]  = 8'h6c;
        tx_message_buffer[3]  = 8'h6c;
        tx_message_buffer[4]  = 8'h6f;
        tx_message_buffer[5]  = 8'h2c;
        tx_message_buffer[6]  = 8'h20;
        tx_message_buffer[7]  = 8'h49;
        tx_message_buffer[8]  = 8'h20;
        tx_message_buffer[9]  = 8'h61;
        tx_message_buffer[10] = 8'h6d;
        tx_message_buffer[11] = 8'h20;
        tx_message_buffer[12] = 8'h52;
        tx_message_buffer[13] = 8'h69;
        tx_message_buffer[14] = 8'h73;
        tx_message_buffer[15] = 8'h68;
        tx_message_buffer[16] = 8'h69;
        tx_message_buffer[17] = 8'h21;
        send_message(18);
        wait_for_messages(2);
        $display("PASS: 18-byte message recovered");

        $display("Starting test 3: 70-byte message (two ChaCha20 blocks)");
        for (i = 0; i < 70; i = i + 1)
            tx_message_buffer[i] = 8'h41 + (i % 26);
        send_message(70);
        wait_for_messages(3);
        $display("PASS: 70-byte message recovered");

        if (rx_count != expected_total)
            $fatal(1, "FAIL: total received bytes %0d, expected %0d",
                   rx_count, expected_total);
        if (completed_message_count != 3)
            $fatal(1, "FAIL: completed %0d messages, expected 3",
                   completed_message_count);
        if (tx_done_count != 3)
            $fatal(1, "FAIL: TX completed %0d messages, expected 3", tx_done_count);

        $display("PASS: all secure_uart_top loopback tests completed (%0d bytes total)",
                 rx_count);
        $finish;
    end

    initial begin
        #10000000; 
        $fatal(1, "FAIL: global simulation watchdog expired");
    end

endmodule