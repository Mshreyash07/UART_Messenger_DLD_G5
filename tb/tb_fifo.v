
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

    // Instantiate the FIFO
    fifo dut (
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

    // Write one byte
    task write_byte;
        input [7:0] data;
        begin
            @(negedge clk);
            din = data;
            wr_en = 1;
            rd_en = 0;

            @(negedge clk);
            wr_en = 0;
        end
    endtask

    // Read one byte and compare it
    task read_byte;
        input [7:0] expected;
        begin
            @(negedge clk);
            rd_en = 1;
            wr_en = 0;

            // The FIFO updates dout at the intervening posedge
            @(negedge clk);
            rd_en = 0;

            if (dout !== expected) begin
                $display(
                    "FAIL: Expected %02h, received %02h",
                    expected, dout
                );
                $fatal(1, "FIFO data mismatch");
            end

            $display(
                "PASS: Expected=%02h, Received=%02h",
                expected, dout
            );
        end
    endtask

    initial begin
        $dumpfile("sim/fifo.vcd");
        $dumpvars(0, tb_fifo);

        rst = 1;
        wr_en = 0;
        rd_en = 0;
        din = 0;

        // Apply reset
        repeat (2) @(negedge clk);
        rst = 0;

        @(negedge clk);

        // TEST 1: FIFO should initially be empty
        if (empty !== 1'b1)
            $fatal(1, "FAIL: FIFO should be empty after reset");

        $display("PASS: FIFO reset and empty condition");

        // TEST 2: Read while empty
        rd_en = 1;
        @(negedge clk);
        rd_en = 0;

        if (empty !== 1'b1)
            $fatal(1, "FAIL: Empty FIFO changed after read");

        $display("PASS: Read while empty is ignored");

        // TEST 3: Write and read three bytes
        write_byte(8'h11);
        write_byte(8'h22);
        write_byte(8'h33);

        if (empty !== 1'b0)
            $fatal(1, "FAIL: FIFO should not be empty");

        read_byte(8'h11);
        read_byte(8'h22);
        read_byte(8'h33);

        if (empty !== 1'b1)
            $fatal(1, "FAIL: FIFO should be empty");

        $display("PASS: FIFO ordering");

        // TEST 4: Fill all 16 entries
        for (i = 0; i < 16; i = i + 1)
            write_byte(i[7:0]);

        if (full !== 1'b1)
            $fatal(1, "FAIL: FIFO did not become full");

        $display("PASS: FIFO full condition");

        // TEST 5: Attempt write when FIFO is full
        write_byte(8'hEE);

        if (full !== 1'b1)
            $fatal(1, "FAIL: Full flag changed unexpectedly");

        $display("PASS: Overflow write is ignored");

        // Check all original bytes remain in order
        for (i = 0; i < 16; i = i + 1)
            read_byte(i[7:0]);

        if (empty !== 1'b1)
            $fatal(1, "FAIL: FIFO should be empty");

        $display("PASS: Full FIFO data integrity");

        // TEST 6: Simultaneous read and write
        write_byte(8'hA1);
        write_byte(8'hB2);

        @(negedge clk);
        din = 8'hC3;
        wr_en = 1;
        rd_en = 1;

        @(negedge clk);
        wr_en = 0;
        rd_en = 0;

        if (dout !== 8'hA1)
            $fatal(1, "FAIL: Simultaneous read returned wrong data");

        $display("PASS: Simultaneous read returned A1");

        read_byte(8'hB2);
        read_byte(8'hC3);

        if (empty !== 1'b1)
            $fatal(1, "FAIL: FIFO should be empty at the end");

        $display("------------------------------------");
        $display("ALL FIFO TESTS PASSED");
        $display("------------------------------------");

        $finish;
    end

    // Timeout protection
    initial begin
        #20000;
        $fatal(1, "FAIL: Simulation timed out");
    end

endmodule