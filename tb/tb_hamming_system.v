`timescale 1ns/1ps

module tb_hamming_system;
    reg clk;
    reg rst;
    reg start;
    reg [7:0] data_in;
    reg [12:0] error_mask;
    reg second_byte_seen;
    reg packet_byte_ready;
    integer ready_cycle;
    wire packet_byte_transfer;

    wire [12:0] encoded_word;
    wire [7:0] packet_byte;
    wire packet_byte_valid;
    wire packet_busy;
    wire packet_done;
    wire [7:0] channel_byte;
    wire [12:0] received_word;
    wire received_word_valid;
    wire format_error;
    wire [7:0] data_out;
    wire single_error_corrected;
    wire double_error_detected;
    wire [3:0] syndrome;

    integer test_count;

    hamming_encoder encoder (
        .data_in(data_in),
        .codeword_out(encoded_word)
    );

    assign packet_byte_transfer = packet_byte_valid && packet_byte_ready;

    hamming_packetizer packetizer (
        .clk(clk),
        .rst(rst),
        .start(start),
        .codeword_in(encoded_word),
        .byte_ready(packet_byte_ready),
        .byte_data(packet_byte),
        .byte_valid(packet_byte_valid),
        .busy(packet_busy),
        .done(packet_done)
    );

    assign channel_byte = packet_byte ^
        (second_byte_seen ? {3'b000, error_mask[12:8]} : error_mask[7:0]);

    hamming_depacketizer depacketizer (
        .clk(clk),
        .rst(rst),
        .byte_data(channel_byte),
        .byte_valid(packet_byte_transfer),
        .codeword_out(received_word),
        .codeword_valid(received_word_valid),
        .format_error(format_error)
    );

    hamming_decoder decoder (
        .codeword_in(received_word),
        .data_out(data_out),
        .single_error_corrected(single_error_corrected),
        .double_error_detected(double_error_detected),
        .syndrome(syndrome)
    );

    always #5 clk = ~clk;

    always @(negedge clk or posedge rst) begin
        if (rst) begin
            packet_byte_ready <= 1'b0;
            ready_cycle <= 0;
        end
        else begin
            ready_cycle <= ready_cycle + 1;
           
            packet_byte_ready <= ((ready_cycle % 4) != 1);
        end
    end


    always @(posedge clk or posedge rst) begin
        if (rst)
            second_byte_seen <= 1'b0;
        else if (packet_byte_transfer) begin
            if (!second_byte_seen)
                second_byte_seen <= 1'b1;
            else
                second_byte_seen <= 1'b0;
        end
    end

    task run_case;
        input [7:0]  test_data;
        input [12:0] mask;
        input        expect_single;
        input        expect_double;
        begin
           
            wait (packet_busy == 1'b0);
            @(negedge clk);
            data_in = test_data;
            error_mask = mask;
            start = 1'b1;
            @(negedge clk);
            start = 1'b0;

            wait (received_word_valid == 1'b1);
            #1;

            if (format_error !== 1'b0)
                $fatal(1, "FAIL: Unexpected packet format error");

            if (single_error_corrected !== expect_single)
                $fatal(1, "FAIL: Wrong single-error flag for input %h", test_data);

            if (double_error_detected !== expect_double)
                $fatal(1, "FAIL: Wrong double-error flag for input %h", test_data);

            if (!expect_double && data_out !== test_data)
                $fatal(1, "FAIL: Input=%h Output=%h Mask=%h", test_data, data_out, mask);

            if (expect_double && data_out !== 8'h00)
                $fatal(1, "FAIL: Decoder should suppress data for uncorrectable word");

            test_count = test_count + 1;
            $display("PASS: data=%h error_mask=%h single_corrected=%b double_detected=%b",
                     test_data, mask, single_error_corrected, double_error_detected);

            
            @(negedge clk);
        end
    endtask

    initial begin
        $dumpfile("sim/hamming_system.vcd");
        $dumpvars(0, tb_hamming_system);

        clk = 1'b0;
        rst = 1'b1;
        start = 1'b0;
        data_in = 8'h00;
        error_mask = 13'h0000;
        test_count = 0;

        repeat (3) @(negedge clk);
        rst = 1'b0;

        // No-error cases.
        run_case(8'hA5, 13'h0000, 1'b0, 1'b0);
        run_case(8'h3C, 13'h0000, 1'b0, 1'b0);
        run_case(8'h00, 13'h0000, 1'b0, 1'b0);
        run_case(8'hFF, 13'h0000, 1'b0, 1'b0);

    
        run_case(8'hA5, (13'b1 << 5), 1'b1, 1'b0);

        
        run_case(8'h3C, ((13'b1 << 2) | (13'b1 << 9)), 1'b0, 1'b1);

        $display("ALL HAMMING SYSTEM TESTS PASSED (%0d cases).", test_count);
        $finish;
    end

    initial begin
        #100000;
        $fatal(1, "FAIL: Hamming system testbench timeout");
    end
endmodule
