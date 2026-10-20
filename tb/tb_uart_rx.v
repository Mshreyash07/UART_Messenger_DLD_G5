`timescale 1ns/1ps

module tb_uart_rx;

    reg clk;
    reg reset;
    reg rx;

    wire [7:0] rx_data;
    wire rx_done;
    wire rx_busy;

    localparam integer CLK_FREQ_HZ = 100_000_000;
    localparam integer BAUD_RATE   = 6_250_000;
    localparam integer CLKS_PER_BIT = CLK_FREQ_HZ / BAUD_RATE; 

    integer i;
    integer done_count;
    integer old_done_count;
    reg [7:0] last_rx_data;

    uart_rx #(
        .CLK_FREQ_HZ(CLK_FREQ_HZ),
        .BAUD_RATE(BAUD_RATE)
    ) dut (
        .clk(clk), .reset(reset), .rx(rx),
        .rx_data(rx_data), .rx_done(rx_done), .rx_busy(rx_busy)
    );

    initial clk = 1'b0;
    always #5 clk = ~clk;

   
    always @(posedge clk or posedge reset) begin
        if (reset) begin
            done_count   <= 0;
            last_rx_data <= 8'b0;
        end
        else if (rx_done) begin
            done_count   <= done_count + 1;
            last_rx_data <= rx_data;
        end
    end

    task send_byte;
        input [7:0] data;
        integer bit_num;
        begin
            @(negedge clk);
            rx = 1'b0; 
            repeat (CLKS_PER_BIT) @(negedge clk);

            for (bit_num = 0; bit_num < 8; bit_num = bit_num + 1) begin
                rx = data[bit_num];
                repeat (CLKS_PER_BIT) @(negedge clk);
            end

            rx = 1'b1; 
            repeat (CLKS_PER_BIT) @(negedge clk);
        end
    endtask

    task test_byte;
        input [7:0] expected;
        begin
            old_done_count = done_count;
            send_byte(expected);
            while (done_count == old_done_count)
                @(negedge clk);
            #1;

            if (last_rx_data !== expected)
                $fatal(1, "FAIL: Expected %h, received %h", expected, last_rx_data);
            $display("PASS: RX received %h correctly", last_rx_data);
        end
    endtask

    initial begin
        $dumpfile("sim/uart_rx.vcd");
        $dumpvars(0, tb_uart_rx);

        reset = 1'b1;
        rx = 1'b1; 
        done_count = 0;
        last_rx_data = 0;

        repeat (4) @(negedge clk);
        reset = 1'b0;
        repeat (2) @(negedge clk);

        test_byte(8'hA5);
        test_byte(8'h3C);
        test_byte(8'h00);
        test_byte(8'hFF);

        $display("ALL UART RX TESTS PASSED");
        $finish;
    end

    initial begin
        #50000;
        $fatal(1, "FAIL: UART RX simulation timed out");
    end

endmodule