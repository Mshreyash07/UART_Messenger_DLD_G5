`timescale 1ns/1ps

module tb_hamming_decoder;
    reg  [7:0]  data_in;
    wire [12:0] encoded_word;
    reg  [12:0] codeword_in;
    wire [7:0]  data_out;
    wire        single_error_corrected;
    wire        double_error_detected;
    wire [3:0]  syndrome;

    integer d;
    integer i;
    integer j;
    reg [12:0] one_bit_mask;
    reg [12:0] two_bit_mask;

    hamming_encoder encoder (
        .data_in(data_in),
        .codeword_out(encoded_word)
    );

    hamming_decoder decoder (
        .codeword_in(codeword_in),
        .data_out(data_out),
        .single_error_corrected(single_error_corrected),
        .double_error_detected(double_error_detected),
        .syndrome(syndrome)
    );

    initial begin
        $dumpfile("sim/hamming_decoder.vcd");
        $dumpvars(0, tb_hamming_decoder);

        data_in = 8'h00;
        codeword_in = 13'h0000;
        #1;

        for (d = 0; d < 256; d = d + 1) begin
            data_in = d[7:0];
            #1;
            codeword_in = encoded_word;
            #1;

            
            if (data_out !== data_in || single_error_corrected !== 1'b0 ||
                double_error_detected !== 1'b0)
                $fatal(1, "FAIL: No-error decode failed for %h", data_in);

            
            for (i = 0; i < 13; i = i + 1) begin
                one_bit_mask = (13'b1 << i);
                codeword_in = encoded_word ^ one_bit_mask;
                #1;
                if (data_out !== data_in || single_error_corrected !== 1'b1 ||
                    double_error_detected !== 1'b0)
                    $fatal(1, "FAIL: Single-bit correction failed. data=%h bit=%0d syndrome=%b",
                           data_in, i, syndrome);
            end

            
            for (i = 0; i < 13; i = i + 1) begin
                for (j = i + 1; j < 13; j = j + 1) begin
                    two_bit_mask = (13'b1 << i) | (13'b1 << j);
                    codeword_in = encoded_word ^ two_bit_mask;
                    #1;
                    if (double_error_detected !== 1'b1 ||
                        single_error_corrected !== 1'b0)
                        $fatal(1, "FAIL: Double-bit detection failed. data=%h bits=%0d,%0d syndrome=%b",
                               data_in, i, j, syndrome);
                end
            end
        end

        $display("PASS: Decoder passed all 256 values, all 13 single-bit positions, and all 78 double-bit pairs per value.");
        $finish;
    end
endmodule
