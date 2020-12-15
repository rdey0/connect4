import {CELL_STATES, GAME_STATES} from '../utils/enum.js'
import {get_game_state} from '../utils/helper.js'
import AiModule from './ai_module.js'
/*
 * Minimax exhaustively searches all board states n moves ahead of the 
 * current board state and then evaluates them based on a heuristic 
 * (essentially a metric of how favorable the board state is). Minimax 
 * seeks to minimize it's potential loss and maximize it's potential gain.
 */
export default class MinimaxAi extends AiModule{
    constructor(player_number, num_to_win, timeout, depth) {
        super(player_number, num_to_win, timeout);
        this.depth = depth;
    }

    get_next_move(board) {
        var depth = this.depth;
        var move_score = 0;
        var best_move = 0;
        var best_score = Number.MIN_SAFE_INTEGER;
        this.board = board;
        var opponent = (this.player_num === CELL_STATES.PLAYER1) ? CELL_STATES.PLAYER2 : CELL_STATES.PLAYER1;
        var start_time = new Date().getTime();

        //if we can win in the next move, make the move
        for(let i = 0; i < this.board[0].length; i++){
            if(this.is_winning_move(i, this.player_num))
                return i;     
        }

        //if our opponent can win in the next move, block the move
        for(let i = 0; i < this.board[0].length; i++){
            if(this.is_winning_move(i, opponent))
                return i;  
        }

        for(var i=0; i < this.board[0].length && !this.is_timeout(start_time); ++i){
            if(this.can_make_move(i)){
                var[row, col] = this.make_move(i, this.player_num);
                move_score = this.min_value(depth-1, this.player_num, row, col);
                if(move_score >= best_score){
                    best_score = move_score;
                    best_move = i;
                }
                this.unmake_move(i);
            }
        }

        if(!this.can_make_move(best_move)) {
            best_move = 0;
            while(!this.can_make_move(best_move))
                best_move++;
        }
        while(!this.is_timeout(start_time)){}
        return best_move;
    }

    /*
     * Get the best possible score for your move
     * @depth: An int representing how many more moves in advance to survey
     * @player: The current player (1 or 2)
     * @row: The row where a move has been made
     * @col: the column where a move has been made
     * Return: The AI's best possible score
     */
    max_value(depth, player, row, col) {
        var best_score = Number.MIN_SAFE_INTEGER;
        var move_score;
        var game_state = get_game_state(this.board, row, col, this.num_to_win, player);
        if(depth === 0 || game_state !== GAME_STATES.ONGOING) {
            return this.get_heuristic(this.player_num, game_state, player);
        }else{
            player = (player === CELL_STATES.PLAYER1) ? CELL_STATES.PLAYER2 : CELL_STATES.PLAYER1;
            for(var i=0; i < this.board[0].length; ++i){
                if(this.can_make_move(i)){
                    var[r,c] = this.make_move(i, player);
                    move_score = this.min_value(depth-1, player, r, c);
                    if(move_score > best_score)
                        best_score = move_score;
                    this.unmake_move(i);
                }
            }
        }
        return best_score;
    }

    /*
     * Get the worst possible score for your opponent
     * @depth: An int representing how many more moves in advance to survey
     * @player: The current player (1 or 2)
     * @row: The row where a move has been made
     * @col: the column where a move has been made
     * Return: The opponents worst possible score
     */
    min_value(depth, player, row, col) {
        var best_score = Number.MAX_SAFE_INTEGER;
        var move_score;
        var game_state = get_game_state(this.board, row, col, this.num_to_win, player);
        if(depth === 0 || game_state !== GAME_STATES.ONGOING) {
            return this.get_heuristic(this.player_num, game_state, player);
        }else{
            player = (player === CELL_STATES.PLAYER1) ? CELL_STATES.PLAYER2 : CELL_STATES.PLAYER1;
            for(var i=0; i < this.board[0].length; ++i){
                if(this.can_make_move(i)){
                    var[r,c] = this.make_move(i, player);
                    move_score = this.max_value(depth-1, player, r, c);
                    if(move_score < best_score)
                        best_score = move_score;
                    this.unmake_move(i);
                }
            }
        }
        return best_score;
    }

    /*
     * Return a metric representing how favorable the current board state is
     * @our_player: An int representing the AI player (1 or 2)
     * @game_state: A 2D array representing the current state of the board
     * @last_player: The last player to make a move
     * Return: int representing how favorable the current board state is (larger is better)
     */
    get_heuristic(our_player, game_state, last_player) {
        if(game_state !== GAME_STATES.ONGOING)
            return (last_player === our_player) ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER;

        var board_width = this.board[0].length;
        var board_height = this.board.length;
        var player1_score = 0;
        var player2_score = 0;
        var column_value = [1,2,3,4,3,2,1];
        
        for(var i=0; i < board_width; i++){
            if(this.board[board_height - 1][i] === CELL_STATES.EMPTY) continue;
            var height = board_height - this.get_column_height(i);
            for(var j = board_height - 1; j >= height; j--){
                for(var x = -1; x <= 1; x++){
                    //check surrounding area with a padding of 1 cell horizontally and 2 cells vertically
                    for(var y = -2; y <= 2; y++){
                        if(i + x < 0 || i + x >= board_width || i - x < 0 || i - x >= board_width ||
                            j + y < 0 || j + y >= board_height || j - y < 0 || j - y >= board_height){
                            continue;
                        }
                        //calculate the utility of the cell for the respective player
                        if(this.board[j+y][i+x] === CELL_STATES.PLAYER1){
                            if(this.board[j-y][i-x] === CELL_STATES.PLAYER1) {
                                player1_score += 2 * column_value[i];
                            }else{
                                player1_score += 1;
                            }
                        }else if(this.board[j+y][i+x] === CELL_STATES.PLAYER2){
                            if(this.board[j-y][i-x] === CELL_STATES.PLAYER2){
                                player2_score += 2 * column_value[i];
                            }else{
                                player2_score += 1;
                            }
                        }
                    }
                }
                
            }
        }
        return (this.player_num === CELL_STATES.PLAYER1) ?
            (player1_score - player2_score):(player2_score - player1_score);

    }

}