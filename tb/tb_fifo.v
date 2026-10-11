
`timescale 1ns/1ps

module tb_fifo;

    reg clk;
    reg rst;
    reg wr_en;
    reg rd_en;
    reg [7:0] din;

    wire [7:0] dout;
    wire full;
    wire empty;

    integer i;

    // Instantiate the FIFO module
    fifo uut (
        .clk(clk),
        .rst(rst),
        .wr_en(wr_en),
        .rd_en(rd_en),
        .din(din),
        .dout(dout),
        .full(full),
        .empty(empty)
    );

    // Clock: 10 ns period
    initial clk = 0;
    always #5 clk = ~clk;

    // Task to write one byte
    task write_byte;
        input [7:0] data;
        begin
            @(negedge clk);
            din = data;
            wr_en = 1;
            rd_en = 0;

            @(posedge clk);
            #1;

            @(negedge clk);
            wr_en = 0;
        end
    endtask

    // Task to read one byte and verify it
    task read_byte;
        input [7:0] expected;
        begin
            @(negedge clk);
            rd_en = 1;
            wr_en = 0;

            @(posedge clk);
            #1;

            if (dout !== expected) begin
                $display(
                    "FAIL: expected %h, got %h",
                    expected, dout
                );
                $finish;
            end
            else begin
                $display("PASS: read %h", dout);
            end

            @(negedge clk);
            rd_en = 0;
        end
    endtask

    // Main test sequence
    initial begin

        // Generate waveform file
        $dumpfile("sim/fifo.vcd");
        $dumpvars(0, tb_fifo);

        // Initialize inputs
        rst = 1;
        wr_en = 0;
        rd_en = 0;
        din = 0;

        // Apply reset
        repeat (2) @(posedge clk);
        @(negedge clk);
        rst = 0;

        // TEST 1: Reset and initial flags
        if (!empty || full) begin
            $display("FAIL: reset flags incorrect");
            $finish;
        end

        $display("PASS: reset");

        // TEST 2: FIFO ordering
        write_byte(8'h11);
        write_byte(8'h22);
        write_byte(8'h33);

        read_byte(8'h11);
        read_byte(8'h22);
        read_byte(8'h33);

        if (!empty) begin
            $display("FAIL: FIFO should be empty");
            $finish;
        end

        $display("PASS: FIFO ordering and empty flag");

        // TEST 3: Fill all 16 entries
        for (i = 0; i < 16; i = i + 1)
            write_byte(i);

        if (!full) begin
            $display("FAIL: full flag not asserted");
            $finish;
        end

        $display("PASS: FIFO full");

        // TEST 4: Attempt write while full
        write_byte(8'hEE);

        if (!full) begin
            $display("FAIL: overflow changed FIFO status");
            $finish;
        end

        $display("PASS: overflow rejection");

        // TEST 5: Drain FIFO and verify order
        for (i = 0; i < 16; i = i + 1)
            read_byte(i);

        if (!empty) begin
            $display("FAIL: FIFO should be empty after draining");
            $finish;
        end

        $display("PASS: FIFO draining");

        // TEST 6: Pointer wraparound
        for (i = 0; i < 12; i = i + 1)
            write_byte(i + 8'h40);

        for (i = 0; i < 12; i = i + 1)
            read_byte(i + 8'h40);

        if (!empty) begin
            $display("FAIL: wraparound test did not finish empty");
            $finish;
        end

        $display("PASS: pointer wraparound");

        // All tests completed
        $display("--------------------------------");
        $display("ALL FIFO TESTS PASSED");
        $display("--------------------------------");

        $finish;
    end

endmodule
