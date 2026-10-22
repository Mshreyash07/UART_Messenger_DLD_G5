`timescale 1ns/1ps

module tb_hamming_encoder;
    reg  [7:0]  data_in;
    wire [12:0] codeword_out;
    integer i;

    hamming_encoder dut (
        .data_in(data_in),
        .codeword_out(codeword_out)
    );

    initial begin
        $dumpfile("sim/hamming_encoder.vcd");
        $dumpvars(0, tb_hamming_encoder);

        data_in = 8'h00;
        #1;

        for (i = 0; i < 256; i = i + 1) begin
            data_in = i[7:0];
            #1;

            if ((^codeword_out) !== 1'b0) begin
                $display("FAIL: Overall parity error for data %h", data_in);
                $fatal(1);
            end

            if ((codeword_out[0] ^ codeword_out[2] ^ codeword_out[4] ^
                 codeword_out[6] ^ codeword_out[8] ^ codeword_out[10]) !== 1'b0)
                $fatal(1, "FAIL: P1 check failed for data %h", data_in);

            if ((codeword_out[1] ^ codeword_out[2] ^ codeword_out[5] ^
                 codeword_out[6] ^ codeword_out[9] ^ codeword_out[10]) !== 1'b0)
                $fatal(1, "FAIL: P2 check failed for data %h", data_in);

            if ((codeword_out[3] ^ codeword_out[4] ^ codeword_out[5] ^
                 codeword_out[6] ^ codeword_out[11]) !== 1'b0)
                $fatal(1, "FAIL: P4 check failed for data %h", data_in);

            if ((codeword_out[7] ^ codeword_out[8] ^ codeword_out[9] ^
                 codeword_out[10] ^ codeword_out[11]) !== 1'b0)
                $fatal(1, "FAIL: P8 check failed for data %h", data_in);
        end

        $display("PASS: Hamming encoder passed all 256 input patterns.");
        $finish;
    end
endmodule
