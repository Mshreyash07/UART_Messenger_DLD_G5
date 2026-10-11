`timescale 1ns/1ps

module tb_baud_gen;

    reg clk;
    reg rst;
    wire baud_tick;

    localparam integer EXPECTED_CLKS_PER_BIT = 10;

    integer cycles;
    integer last_tick_cycle;
    integer tick_count;

    baud_gen #(
        .CLK_FREQ_HZ(100),
        .BAUD_RATE(10)
    ) dut (
        .clk(clk),
        .rst(rst),
        .baud_tick(baud_tick)
    );

    always #5 clk = ~clk;

    initial begin
        $dumpfile("sim/baud_gen.vcd");
        $dumpvars(0, tb_baud_gen);

        clk = 0;
        rst = 1;
        cycles = 0;
        last_tick_cycle = 0;
        tick_count = 0;

        #22;
        rst = 0;
    end

    always @(negedge clk) begin
        if (!rst) begin
            cycles = cycles + 1;

            if (baud_tick) begin
                tick_count = tick_count + 1;

                $display(
                    "Tick %0d at cycle %0d",
                    tick_count, cycles
                );

                if (tick_count > 1 &&
                    cycles - last_tick_cycle != EXPECTED_CLKS_PER_BIT) begin
                    $display("FAIL: Incorrect tick interval");
                    $finish;
                end

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
        $display("FAIL: Simulation timeout");
        $finish;
    end

endmodule