
`timescale 1ns/1ps

module fifo (
    input wire clk,
    input wire rst,

    input wire wr_en,
    input wire rd_en,

    input wire [7:0] din,
    output reg [7:0] dout,

    output wire full,
    output wire empty
);
    reg [7:0] mem [0:15];
    
    reg [3:0] wr_ptr;
    reg [3:0] rd_ptr;

    reg [4:0] count;

    assign empty = (count == 5'd0);
    assign full  = (count == 5'd16);

    wire do_write;
    wire do_read;

    assign do_write = wr_en && !full;
    assign do_read  = rd_en && !empty;

    always @(posedge clk) begin
        if (rst) begin
            wr_ptr <= 4'd0;
            rd_ptr <= 4'd0;
            count  <= 5'd0;
            dout   <= 8'd0;
        end
        else begin

            if (do_write) begin
                mem[wr_ptr] <= din;
                wr_ptr <= wr_ptr + 1'b1;
            end

            if (do_read) begin
                dout <= mem[rd_ptr];
                rd_ptr <= rd_ptr + 1'b1;
            end

            case ({do_write, do_read})
                2'b10: count <= count + 1'b1;
                2'b01: count <= count - 1'b1;
                default: count <= count;
            endcase

        end
    end

endmodule
