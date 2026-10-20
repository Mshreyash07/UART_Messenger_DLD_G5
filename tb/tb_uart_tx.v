`timescale 1ns/1ps

module tb_uart_tx;

    reg clk;
    reg rst;
    reg tx_start;
    reg [7:0] tx_data;

    wire baud_tick;
    wire tx;
    wire tx_busy;
    wire tx_done;

    integer i;
    reg [7:0] received;

    baud_gen #(
        .CLK_FREQ_HZ(100_000_000),
        .BAUD_RATE(10_000_000)
    ) bg (
        .clk(clk), .rst(rst), .baud_tick(baud_tick)
    );

    uart_tx dut (
        .clk(clk), .rst(rst), .tx_start(tx_start),
        .tx_data(tx_data), .baud_tick(baud_tick),
        .tx(tx), .tx_busy(tx_busy), .tx_done(tx_done)
    );

    initial clk = 1'b0;
    always #5 clk = ~clk;

    task test_byte;
        input [7:0] expected;
        begin
            @(negedge clk);
            tx_data = expected;
            tx_start = 1'b1;

            @(negedge clk);
            tx_start = 1'b0;

            @(negedge tx);
            repeat (5) @(negedge clk);
            if (tx !== 1'b0)
                $fatal(1, "FAIL: Incorrect start bit for %h", expected);

            for (i = 0; i < 8; i = i + 1) begin
                repeat (10) @(negedge clk);
                received[i] = tx;
            end

            repeat (10) @(negedge clk);
            if (tx !== 1'b1)
                $fatal(1, "FAIL: Incorrect stop bit for %h", expected);

            wait (tx_done === 1'b1);
            if (received !== expected)
                $fatal(1, "FAIL: Expected %h, received %h", expected, received);

            #1;
            if (tx_busy !== 1'b0)
                $fatal(1, "FAIL: tx_busy should be LOW after completion");

            $display("PASS: TX=%h, sampled=%h", expected, received);
        end
    endtask

    initial begin
        $dumpfile("sim/uart_tx.vcd");
        $dumpvars(0, tb_uart_tx);

        rst = 1'b1;
        tx_start = 1'b0;
        tx_data = 8'b0;
        received = 8'b0;

        #22;
        rst = 1'b0;
        repeat (2) @(negedge clk);

        test_byte(8'hA5);
        test_byte(8'h3C);
        test_byte(8'h00);
        test_byte(8'hFF);

        $display("ALL UART TX TESTS PASSED");
        $finish;
    end

    initial begin
        #100000;
        $fatal(1, "FAIL: UART TX simulation timed out");
    end

endmodule