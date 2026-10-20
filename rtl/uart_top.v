module uart_top #(
    parameter integer CLK_FREQ_HZ = 50000000,
    parameter integer BAUD_RATE   = 9600
)(
    input  wire       clk,
    input  wire       rst,
    input  wire [7:0] data_in,
    input  wire       write_en,
    output wire       fifo_full,
    output wire       fifo_empty,
    output wire       tx,
    output wire       tx_busy,
    output wire       tx_done,
    input  wire       rx,
    output wire [7:0] rx_data,
    output wire       rx_done,
    output wire       rx_busy
);

    localparam [1:0] CTRL_IDLE  = 2'd0;
    localparam [1:0] CTRL_FETCH = 2'd1;
    localparam [1:0] CTRL_START = 2'd2;
    localparam [1:0] CTRL_WAIT  = 2'd3;

    reg [1:0] ctrl_state;

    wire baud_tick;
    wire [7:0] fifo_dout;
    wire fifo_rd_en;
    wire tx_start;

    baud_gen #(
        .CLK_FREQ_HZ(CLK_FREQ_HZ),
        .BAUD_RATE(BAUD_RATE)
    ) baud_inst (
        .clk(clk),
        .rst(rst),
        .baud_tick(baud_tick)
    );

    fifo fifo_inst (
        .clk(clk),
        .rst(rst),
        .wr_en(write_en),
        .rd_en(fifo_rd_en),
        .din(data_in),
        .dout(fifo_dout),
        .full(fifo_full),
        .empty(fifo_empty)
    );

    uart_tx tx_inst (
        .clk(clk),
        .rst(rst),
        .tx_start(tx_start),
        .tx_data(fifo_dout),
        .baud_tick(baud_tick),
        .tx(tx),
        .tx_busy(tx_busy),
        .tx_done(tx_done)
    );

    uart_rx #(
        .CLK_FREQ_HZ(CLK_FREQ_HZ),
        .BAUD_RATE(BAUD_RATE)
    ) rx_inst (
        .clk(clk),
        .reset(rst),
        .rx(rx),
        .rx_data(rx_data),
        .rx_done(rx_done),
        .rx_busy(rx_busy)
    );

    assign fifo_rd_en = (ctrl_state == CTRL_FETCH);
    assign tx_start   = (ctrl_state == CTRL_START);

    always @(posedge clk or posedge rst) begin
        if (rst) begin
            ctrl_state <= CTRL_IDLE;
        end
        else begin
            case (ctrl_state)
                CTRL_IDLE: begin
                    if (!fifo_empty && !tx_busy)
                        ctrl_state <= CTRL_FETCH;
                end

                CTRL_FETCH: begin
                    ctrl_state <= CTRL_START;
                end

                CTRL_START: begin
                    ctrl_state <= CTRL_WAIT;
                end

                CTRL_WAIT: begin
                    if (tx_done)
                        ctrl_state <= CTRL_IDLE;
                end

                default: ctrl_state <= CTRL_IDLE;
            endcase
        end
    end

endmodule