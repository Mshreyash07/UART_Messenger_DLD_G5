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

    initial clk = 1'b0;
    always #5 clk = ~clk;

    task write_byte;
        input [7:0] data;
        begin
            @(negedge clk);
            din = data;
            wr_en = 1'b1;
            rd_en = 1'b0;
            @(posedge clk);
            #1;
            @(negedge clk);
            wr_en = 1'b0;
        end
    endtask

    task read_byte;
        input [7:0] expected;
        begin
            @(negedge clk);
            rd_en = 1'b1;
            wr_en = 1'b0;
            @(posedge clk);
            #1;
            if (dout !== expected)
                $fatal(1, "FAIL: expected %h, got %h", expected, dout);
            else
                $display("PASS: read %h", dout);
            @(negedge clk);
            rd_en = 1'b0;
        end
    endtask

    initial begin
        $dumpfile("sim/fifo.vcd");
        $dumpvars(0, tb_fifo);

        rst = 1'b1;
        wr_en = 1'b0;
        rd_en = 1'b0;
        din = 8'b0;

        repeat (2) @(posedge clk);
        @(negedge clk);
        rst = 1'b0;

        if (!empty || full)
            $fatal(1, "FAIL: reset flags incorrect");
        $display("PASS: reset");

        
        write_byte(8'h11);
        write_byte(8'h22);
        write_byte(8'h33);
        read_byte(8'h11);
        read_byte(8'h22);
        read_byte(8'h33);
        if (!empty)
            $fatal(1, "FAIL: FIFO should be empty after three reads");
        $display("PASS: FIFO ordering and empty flag");

        
        for (i = 0; i < 16; i = i + 1)
            write_byte(i[7:0]);
        if (!full)
            $fatal(1, "FAIL: full flag not asserted");
        $display("PASS: FIFO full");

        
        write_byte(8'hEE);
        if (!full)
            $fatal(1, "FAIL: overflow changed FIFO status");
        $display("PASS: overflow rejection");

        
        for (i = 0; i < 16; i = i + 1)
            read_byte(i[7:0]);
        if (!empty)
            $fatal(1, "FAIL: FIFO should be empty after draining");
        $display("PASS: FIFO draining");

        
        for (i = 0; i < 12; i = i + 1)
            write_byte(i + 8'h40);
        for (i = 0; i < 12; i = i + 1)
            read_byte(i + 8'h40);
        if (!empty)
            $fatal(1, "FAIL: wraparound test did not finish empty");
        $display("PASS: pointer wraparound");

        
        for (i = 0; i < 16; i = i + 1)
            write_byte(i + 8'h10);
        if (!full)
            $fatal(1, "FAIL: expected full before simultaneous read/write");

        @(negedge clk);
        din = 8'hEE;
        wr_en = 1'b1;
        rd_en = 1'b1;
        @(posedge clk);
        #1;
        if (dout !== 8'h10)
            $fatal(1, "FAIL: simultaneous read expected 10, got %h", dout);
        if (!full)
            $fatal(1, "FAIL: occupancy should remain full after simultaneous read/write");
        @(negedge clk);
        wr_en = 1'b0;
        rd_en = 1'b0;
        $display("PASS: simultaneous read/write while full");

        for (i = 1; i < 16; i = i + 1)
            read_byte(i + 8'h10);
        read_byte(8'hEE);
        if (!empty)
            $fatal(1, "FAIL: FIFO should be empty after simultaneous read/write test");
        $display("PASS: simultaneous read/write ordering");

        @(negedge clk);
        rd_en = 1'b1;
        @(posedge clk);
        #1;
        if (!empty)
            $fatal(1, "FAIL: read while empty changed FIFO status");
        @(negedge clk);
        rd_en = 1'b0;
        $display("PASS: underflow rejection");

        $display("--------------------------------");
        $display("ALL FIFO TESTS PASSED");
        $display("--------------------------------");
        $finish;
    end

    initial begin
        #100000;
        $fatal(1, "FAIL: FIFO simulation timed out");
    end

endmodule