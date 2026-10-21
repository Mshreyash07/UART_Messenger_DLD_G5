`timescale 1ns/1ps

module tb_chacha20;
    reg clk = 1'b0;
    always #5 clk = ~clk;

    reg rst;
    reg [255:0] key;

    //Encryption
    reg enc_start;
    reg [95:0] enc_nonce;
    reg [31:0] enc_initial_counter;
    reg [7:0] enc_in_data;
    reg enc_in_valid;
    wire enc_in_ready;
    reg enc_in_last;
    wire [7:0] enc_out_data;
    wire enc_out_valid;
    reg enc_out_ready;
    wire enc_out_last;
    wire enc_busy;
    wire enc_counter_exhausted;

    //Decryption
    reg dec_start;
    reg [95:0] dec_nonce;
    reg [31:0] dec_initial_counter;
    reg [7:0] dec_in_data;
    reg dec_in_valid;
    wire dec_in_ready;
    reg dec_in_last;
    wire [7:0] dec_out_data;
    wire dec_out_valid;
    reg dec_out_ready;
    wire dec_out_last;
    wire dec_busy;
    wire dec_counter_exhausted;

    localparam integer MAX_BYTES = 80;
    reg [7:0] original [0:MAX_BYTES-1];
    reg [7:0] enc_source [0:MAX_BYTES-1];
    reg [7:0] dec_source [0:MAX_BYTES-1];
    reg [7:0] encrypted [0:MAX_BYTES-1];
    reg [7:0] decrypted [0:MAX_BYTES-1];

    reg [143:0] expected_short_cipher;
    reg [559:0] expected_long_cipher;

    integer enc_count;
    integer dec_count;
    integer enc_expected_len;
    integer dec_expected_len;
    integer i;

    chacha20_encrypt enc_dut (
        .clk(clk), .rst(rst),
        .start(enc_start), .key(key), .nonce(enc_nonce),
        .initial_counter(enc_initial_counter),
        .in_data(enc_in_data), .in_valid(enc_in_valid),
        .in_ready(enc_in_ready), .in_last(enc_in_last),
        .out_data(enc_out_data), .out_valid(enc_out_valid),
        .out_ready(enc_out_ready), .out_last(enc_out_last),
        .busy(enc_busy), .counter_exhausted(enc_counter_exhausted)
    );

    chacha20_decrypt dec_dut (
        .clk(clk), .rst(rst),
        .start(dec_start), .key(key), .nonce(dec_nonce),
        .initial_counter(dec_initial_counter),
        .in_data(dec_in_data), .in_valid(dec_in_valid),
        .in_ready(dec_in_ready), .in_last(dec_in_last),
        .out_data(dec_out_data), .out_valid(dec_out_valid),
        .out_ready(dec_out_ready), .out_last(dec_out_last),
        .busy(dec_busy), .counter_exhausted(dec_counter_exhausted)
    );

    always @(posedge clk) begin
        if (!rst && enc_out_valid && enc_out_ready) begin
            if (enc_count >= MAX_BYTES) begin
                $display("FAIL: encryption output exceeded test buffer.");
                $fatal(1);
            end
            encrypted[enc_count] <= enc_out_data;
            if (enc_out_last !== (enc_count == enc_expected_len - 1)) begin
                $display("FAIL: encryption out_last mismatch at byte %0d.", enc_count);
                $fatal(1);
            end
            enc_count <= enc_count + 1;
        end

        if (!rst && dec_out_valid && dec_out_ready) begin
            if (dec_count >= MAX_BYTES) begin
                $display("FAIL: decryption output exceeded test buffer.");
                $fatal(1);
            end
            decrypted[dec_count] <= dec_out_data;
            if (dec_out_last !== (dec_count == dec_expected_len - 1)) begin
                $display("FAIL: decryption out_last mismatch at byte %0d.", dec_count);
                $fatal(1);
            end
            dec_count <= dec_count + 1;
        end
    end

    task start_encryption;
        input [95:0] nonce_value;
        input [31:0] counter_value;
        begin
            wait (enc_busy == 1'b0);
            @(negedge clk);
            enc_nonce = nonce_value;
            enc_initial_counter = counter_value;
            enc_start = 1'b1;
            @(negedge clk);
            enc_start = 1'b0;
        end
    endtask

    task start_decryption;
        input [95:0] nonce_value;
        input [31:0] counter_value;
        begin
            wait (dec_busy == 1'b0);
            @(negedge clk);
            dec_nonce = nonce_value;
            dec_initial_counter = counter_value;
            dec_start = 1'b1;
            @(negedge clk);
            dec_start = 1'b0;
        end
    endtask

    task send_encryption_source;
        input integer length;
        integer k;
        begin
            for (k = 0; k < length; k = k + 1) begin
                @(negedge clk);
                enc_in_data = enc_source[k];
                enc_in_last = (k == length - 1);
                enc_in_valid = 1'b1;
                while (enc_in_ready !== 1'b1)
                    @(negedge clk);
                @(posedge clk);
                @(negedge clk);
                enc_in_valid = 1'b0;
                enc_in_last = 1'b0;
            end
        end
    endtask

    task send_decryption_source;
        input integer length;
        integer k;
        begin
            for (k = 0; k < length; k = k + 1) begin
                @(negedge clk);
                dec_in_data = dec_source[k];
                dec_in_last = (k == length - 1);
                dec_in_valid = 1'b1;
                while (dec_in_ready !== 1'b1)
                    @(negedge clk);
                @(posedge clk);
                @(negedge clk);
                dec_in_valid = 1'b0;
                dec_in_last = 1'b0;
            end
        end
    endtask

    task wait_encryption_done;
        begin
            wait (enc_busy == 1'b0);
            @(negedge clk);
            if (enc_counter_exhausted) begin
                $display("FAIL: encryption block counter exhausted.");
                $fatal(1);
            end
        end
    endtask

    task wait_decryption_done;
        begin
            wait (dec_busy == 1'b0);
            @(negedge clk);
            if (dec_counter_exhausted) begin
                $display("FAIL: decryption block counter exhausted.");
                $fatal(1);
            end
        end
    endtask

    initial begin
        rst = 1'b1;
        key = 256'h000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f;

        enc_start = 1'b0;
        enc_nonce = 96'd0;
        enc_initial_counter = 32'd1;
        enc_in_data = 8'd0;
        enc_in_valid = 1'b0;
        enc_in_last = 1'b0;
        enc_out_ready = 1'b1;

        dec_start = 1'b0;
        dec_nonce = 96'd0;
        dec_initial_counter = 32'd1;
        dec_in_data = 8'd0;
        dec_in_valid = 1'b0;
        dec_in_last = 1'b0;
        dec_out_ready = 1'b1;

        enc_count = 0;
        dec_count = 0;
        enc_expected_len = 18;
        dec_expected_len = 18;

        expected_short_cipher = 144'h58948b88be17795c706eb03ff14902acaef0;
        expected_long_cipher = 560'h6e5671c9221ca16632535b07983a262627cb02008df7b5390a68e07072b0fe6eb447817ac08dd7ff5eca6eac2d6d3b5a5264d8d32acdfd99cb89a5f6d4a9eebdd818ad6a11ec;

        // 18-byte example message.
        original[0]  = 8'h48; // H
        original[1]  = 8'h65; // e
        original[2]  = 8'h6c; // l
        original[3]  = 8'h6c; // l
        original[4]  = 8'h6f; // o
        original[5]  = 8'h2c; // ,
        original[6]  = 8'h20; // space
        original[7]  = 8'h49; // I
        original[8]  = 8'h20; // space
        original[9]  = 8'h61; // a
        original[10] = 8'h6d; // m
        original[11] = 8'h20; // space
        original[12] = 8'h52; // R
        original[13] = 8'h69; // i
        original[14] = 8'h73; // s
        original[15] = 8'h68; // h
        original[16] = 8'h69; // i
        original[17] = 8'h21; // !
        for (i = 0; i < 18; i = i + 1)
            enc_source[i] = original[i];

        repeat (3) @(negedge clk);
        rst = 1'b0;

        // Test 1: Encrypt the 18-byte example and compare against the
        // RFC 8439-derived expected ciphertext bytes.
        start_encryption(96'h000000090000004a00000000, 32'd1);
        send_encryption_source(18);
        wait_encryption_done();
        if (enc_count != 18) begin
            $display("FAIL: expected 18 encrypted bytes, got %0d.", enc_count);
            $fatal(1);
        end
        for (i = 0; i < 18; i = i + 1) begin
            if (encrypted[i] !== expected_short_cipher[143-(i*8) -: 8]) begin
                $display("FAIL: short ciphertext byte %0d: got %02x expected %02x",
                         i, encrypted[i], expected_short_cipher[143-(i*8) -: 8]);
                $fatal(1);
            end
            dec_source[i] = encrypted[i];
        end
        $display("PASS: encryption matches the known ChaCha20 vector.");

        // Test 2: Decrypt those bytes using the same key,nonce and counter.
        dec_count = 0;
        dec_expected_len = 18;
        start_decryption(96'h000000090000004a00000000, 32'd1);
        send_decryption_source(18);
        wait_decryption_done();
        if (dec_count != 18) begin
            $display("FAIL: expected 18 decrypted bytes, got %0d.", dec_count);
            $fatal(1);
        end
        for (i = 0; i < 18; i = i + 1) begin
            if (decrypted[i] !== original[i]) begin
                $display("FAIL: short decryption byte %0d: got %02x expected %02x",
                         i, decrypted[i], original[i]);
                $fatal(1);
            end
        end
        $display("PASS: decryption recovered \"Hello, I am Rishi!\".");

        // Test 3: Encrypt a 70-byte message, crossing the 64-byte boundary.
        enc_count = 0;
        enc_expected_len = 70;
        for (i = 0; i < 70; i = i + 1) begin
            original[i] = (i * 3 + 7) & 8'hff;
            enc_source[i] = original[i];
        end
        start_encryption(96'h000000000000000000000001, 32'd1);
        send_encryption_source(70);
        wait_encryption_done();
        if (enc_count != 70) begin
            $display("FAIL: expected 70 encrypted bytes, got %0d.", enc_count);
            $fatal(1);
        end
        for (i = 0; i < 70; i = i + 1) begin
            if (encrypted[i] !== expected_long_cipher[559-(i*8) -: 8]) begin
                $display("FAIL: long ciphertext byte %0d: got %02x expected %02x",
                         i, encrypted[i], expected_long_cipher[559-(i*8) -: 8]);
                $fatal(1);
            end
            dec_source[i] = encrypted[i];
        end
        $display("PASS: 70-byte encryption and counter increment.");

        // Test 4: Decrypt all 70 bytes and compare with the original message.
        dec_count = 0;
        dec_expected_len = 70;
        start_decryption(96'h000000000000000000000001, 32'd1);
        send_decryption_source(70);
        wait_decryption_done();
        if (dec_count != 70) begin
            $display("FAIL: expected 70 decrypted bytes, got %0d.", dec_count);
            $fatal(1);
        end
        for (i = 0; i < 70; i = i + 1) begin
            if (decrypted[i] !== original[i]) begin
                $display("FAIL: long decryption byte %0d: got %02x expected %02x",
                         i, decrypted[i], original[i]);
                $fatal(1);
            end
        end
        $display("PASS: 70-byte decryption across block boundary.");
        $display("ALL CHACHA20 ENCRYPTION/DECRYPTION TESTS PASSED.");
        $finish;
    end

    initial begin
        #2000000;
        $display("FAIL: testbench timeout.");
        $fatal(1);
    end
endmodule
