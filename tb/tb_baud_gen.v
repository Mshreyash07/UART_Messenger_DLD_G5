`timescale 1ns/1ps

module tb_baud_gen;

    reg clk;
    reg rst;
    wire baud_tick;

    // The testbench clock has a 10 ns period = 100 MHz. These accelerated
    // simulation parameters preserve 10 clocks per bit for a short test.
    localparam integer CLK_FREQ_HZ = 100_000_000;
    localparam integer BAUD_RATE   = 10_000_000;
    localparam integer EXPECTED_CLKS_PER_BIT = 10;

    integer cycles;
    integer last_tick_cycle;
    integer tick_count;

    baud_gen #(
        .CLK_FREQ_HZ(CLK_FREQ_HZ),
        .BAUD_RATE(BAUD_RATE)
    ) dut (
        .clk(clk),
        .rst(rst),
        .baud_tick(baud_tick)
    );

    initial clk = 1'b0;
    always #5 clk = ~clk;

    initial begin
        $dumpfile("sim/baud_gen.vcd");
        $dumpvars(0, tb_baud_gen);

        rst = 1'b1;
        cycles = 0;
        last_tick_cycle = 0;
        tick_count = 0;

        #22;
        rst = 1'b0;
    end

    always @(negedge clk) begin
        if (!rst) begin
            cycles = cycles + 1;
            if (baud_tick) begin
                tick_count = tick_count + 1;
                $display("Tick %0d at cycle %0d", tick_count, cycles);

                if (tick_count > 1 &&
                    cycles - last_tick_cycle != EXPECTED_CLKS_PER_BIT)
                    $fatal(1, "FAIL: Incorrect baud tick interval");

                last_tick_cycle = cycles;

                if (tick_count == 5) begin
                    $display("PASS: Baud generator timing is correct");
                    $finish;
                end
            end
        end
    end

    initial begin
        #2000;
        $fatal(1, "FAIL: Baud generator simulation timed out");
    end

endmodule