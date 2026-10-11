
`timescale 1ns/1ps

module tb_uart_rx;

    reg clk;
    reg reset;
    reg rx;

    wire [7:0] rx_data;
    wire rx_done;
    wire rx_busy;

    reg done_seen;

    localparam CLKS_PER_BIT = 16;

    // Connect the receiver module to the testbench
    uart_rx #(
        .CLKS_PER_BIT(CLKS_PER_BIT)
    ) dut (
        .clk(clk),
        .reset(reset),
        .rx(rx),
        .rx_data(rx_data),
        .rx_done(rx_done),
        .rx_busy(rx_busy)
    );

    // Generate a clock with a 10 ns period
    initial clk = 0;
    always #5 clk = ~clk;

    // Remember when the receiver finishes
    always @(posedge clk) begin
        if (reset)
            done_seen <= 0;
        else if (rx_done)
            done_seen <= 1;
    end

    // Task to transmit one simulated UART frame
    task send_byte;
        input [7:0] data;
        integer i;
        begin
            // Start bit: LOW
            rx = 0;
            repeat (CLKS_PER_BIT) @(negedge clk);

            // Send 8 data bits, LSB first
            for (i = 0; i < 8; i = i + 1) begin
                rx = data[i];
                repeat (CLKS_PER_BIT) @(negedge clk);
            end

            // Stop bit: HIGH
            rx = 1;
            repeat (CLKS_PER_BIT) @(negedge clk);
        end
    endtask

    // Main test sequence
    initial begin
        $dumpfile("sim/uart_rx.vcd");
        $dumpvars(0, tb_uart_rx);

        reset = 1;
        rx = 1;             // Idle line is HIGH
        done_seen = 0;

        repeat (4) @(negedge clk);
        reset = 0;

        // Send hexadecimal A5
        send_byte(8'hA5);

        // Wait for reception to complete
        wait (done_seen == 1);
        #1;

        if (rx_data === 8'hA5)
            $display("PASS: RX received A5 correctly");
        else
            $display("FAIL: Expected A5, received %h", rx_data);

        $finish;
    end

    // Stop the test if it gets stuck
    initial begin
        #20000;
        $display("FAIL: Simulation timed out");
        $finish;
    end

endmodule
