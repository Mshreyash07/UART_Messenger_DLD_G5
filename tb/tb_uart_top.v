`timescale 1ns/1ps

module tb_uart_top;

    localparam CLK_FREQ_HZ = 100;
    localparam BAUD_RATE = 10;

    reg clk;
    reg rst;
    reg [7:0] data_in;
    reg write_en;

    wire fifo_full;
    wire fifo_empty;
    wire tx;
    wire tx_busy;
    wire tx_done;
    wire [7:0] rx_data;
    wire rx_done;
    wire rx_busy;

    integer cycles;
    integer i;
    reg [7:0] expected [0:3];

    uart_top #(
        .CLK_FREQ_HZ(CLK_FREQ_HZ),
        .BAUD_RATE(BAUD_RATE)
    ) dut (
        .clk(clk),
        .rst(rst),
        .data_in(data_in),
        .write_en(write_en),
        .fifo_full(fifo_full),
        .fifo_empty(fifo_empty),
        .tx(tx),
        .tx_busy(tx_busy),
        .tx_done(tx_done),
        .rx(tx),
        .rx_data(rx_data),
        .rx_done(rx_done),
        .rx_busy(rx_busy)
    );

    always #5 clk = ~clk;

    task enqueue_byte;
        input [7:0] data;
        begin
            @(negedge clk);

            if (fifo_full)
                $fatal(1, "FAIL: FIFO full before write");

            data_in = data;
            write_en = 1'b1;

            @(negedge clk);
            write_en = 1'b0;
            data_in = 8'b0;
        end
    endtask

    task check_received;
        input [7:0] expected_data;
        begin
            cycles = 0;

            while (rx_done !== 1'b1 && cycles < 2000) begin
                @(negedge clk);
                cycles = cycles + 1;
            end

            if (rx_done !== 1'b1)
                $fatal(1,
                    "FAIL: Timeout waiting for byte %h",
                    expected_data);

            #1;

            if (rx_data !== expected_data)
                $fatal(1,
                    "FAIL: Expected %h, received %h",
                    expected_data, rx_data);

            $display("PASS: Expected=%h, Received=%h",
                     expected_data, rx_data);

            @(negedge clk);
        end
    endtask

    initial begin
        $dumpfile("sim/uart_top.vcd");
        $dumpvars(0, tb_uart_top);

        clk = 0;
        rst = 1;
        data_in = 0;
        write_en = 0;

        expected[0] = 8'hA5;
        expected[1] = 8'h3C;
        expected[2] = 8'h00;
        expected[3] = 8'hFF;

        repeat (4) @(negedge clk);
        rst = 0;

        repeat (2) @(negedge clk);

        $display("Sending bytes through FIFO and UART loopback...");

        for (i = 0; i < 4; i = i + 1)
            enqueue_byte(expected[i]);

        for (i = 0; i < 4; i = i + 1)
            check_received(expected[i]);

        if (!fifo_empty)
            $fatal(1, "FAIL: FIFO should be empty");

        $display("----------------------------------");
        $display("ALL UART TOP TESTS PASSED");
        $display("----------------------------------");

        $finish;
    end

    initial begin
        #100000;
        $fatal(1, "FAIL: Simulation timeout");
    end

endmodule