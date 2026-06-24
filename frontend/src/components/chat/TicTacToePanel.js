import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
import { apiClient } from '../../lib/api';
const EMPTY_BOARD = Array(9).fill('');
const WINNING_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6], // diagonals
];
function getWinningCells(board) {
    for (const [a, b, c] of WINNING_LINES) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return [a, b, c];
        }
    }
    return [];
}
export function TicTacToePanel({ isOpen, onClose }) {
    const [board, setBoard] = useState(EMPTY_BOARD);
    const [userMarker, setUserMarker] = useState('X');
    const [gameStatus, setGameStatus] = useState('idle');
    const [trashTalk, setTrashTalk] = useState('');
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [error, setError] = useState(null);
    const [gameStarted, setGameStarted] = useState(false);
    const aiMarker = userMarker === 'X' ? 'O' : 'X';
    const winningCells = getWinningCells(board);
    const resetGame = useCallback(() => {
        setBoard(EMPTY_BOARD);
        setGameStatus('ongoing');
        setTrashTalk('');
        setError(null);
        setIsAiThinking(false);
        setGameStarted(true);
    }, []);
    const startGame = useCallback((marker) => {
        setUserMarker(marker);
        setBoard(EMPTY_BOARD);
        setGameStatus('ongoing');
        setTrashTalk('');
        setError(null);
        setIsAiThinking(false);
        setGameStarted(true);
    }, []);
    const handleCellClick = useCallback(async (index) => {
        if (gameStatus !== 'ongoing' ||
            isAiThinking ||
            board[index] !== '')
            return;
        // Apply user's move locally
        const newBoard = [...board];
        newBoard[index] = userMarker;
        setBoard(newBoard);
        // Check if user just won (avoids sending a request)
        const userWin = getWinningCells(newBoard).length > 0;
        const isDraw = !userWin && newBoard.every((c) => c !== '');
        if (userWin) {
            setGameStatus('user_win');
            return;
        }
        if (isDraw) {
            setGameStatus('draw');
            return;
        }
        // Ask AI for its move
        setIsAiThinking(true);
        setError(null);
        try {
            const result = await apiClient.tictactoeMove({
                board: newBoard,
                user_marker: userMarker,
            });
            setBoard(result.board);
            setTrashTalk(result.trash_talk);
            setGameStatus(result.game_status);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to get AI move.');
        }
        finally {
            setIsAiThinking(false);
        }
    }, [board, gameStatus, isAiThinking, userMarker]);
    const statusMessage = () => {
        if (gameStatus === 'ai_win')
            return `${aiMarker} wins! Better luck next time. 🤖`;
        if (gameStatus === 'user_win')
            return `You win! The AI is humbled. 🎉`;
        if (gameStatus === 'draw')
            return `It's a draw! Great minds think alike. 🤝`;
        if (isAiThinking)
            return 'AI is thinking…';
        return `Your turn — you are ${userMarker}`;
    };
    if (!isOpen)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm", children: _jsxs("div", { className: "relative w-full max-w-sm rounded-3xl border border-slate-700/70 bg-slate-900/95 p-6 shadow-2xl", children: [_jsxs("div", { className: "mb-5 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-bold text-slate-100", children: "Tic-Tac-Toe" }), _jsx("p", { className: "text-xs text-slate-400", children: "vs. LLM Agent" })] }), _jsx("button", { onClick: onClose, className: "rounded-xl border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-700", children: "\u2715 Close" })] }), !gameStarted && (_jsxs("div", { className: "mb-6 text-center", children: [_jsx("p", { className: "mb-3 text-sm text-slate-300", children: "Choose your marker to start:" }), _jsxs("div", { className: "flex justify-center gap-4", children: [_jsx("button", { onClick: () => startGame('X'), className: "w-20 rounded-2xl border-2 border-cyan-500 bg-cyan-500/10 py-3 text-2xl font-bold text-cyan-300 transition hover:bg-cyan-500/20", children: "X" }), _jsx("button", { onClick: () => startGame('O'), className: "w-20 rounded-2xl border-2 border-violet-500 bg-violet-500/10 py-3 text-2xl font-bold text-violet-300 transition hover:bg-violet-500/20", children: "O" })] })] })), gameStarted && (_jsxs(_Fragment, { children: [_jsx("div", { className: "mb-4 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-center text-sm font-medium text-slate-200", children: statusMessage() }), trashTalk && (_jsxs("div", { className: "mb-3 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-center text-xs italic text-violet-300", children: ["\uD83E\uDD16 \"", trashTalk, "\""] })), error && (_jsx("div", { className: "mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-center text-xs text-rose-300", children: error })), _jsx("div", { className: "mb-5 grid grid-cols-3 gap-2", children: board.map((cell, i) => {
                                const isWinner = winningCells.includes(i);
                                const isX = cell === 'X';
                                const isO = cell === 'O';
                                const isEmpty = cell === '';
                                const clickable = isEmpty && gameStatus === 'ongoing' && !isAiThinking;
                                return (_jsx("button", { onClick: () => handleCellClick(i), disabled: !clickable, className: [
                                        'flex h-20 w-full items-center justify-center rounded-2xl border text-3xl font-bold transition',
                                        isWinner
                                            ? 'border-yellow-400 bg-yellow-400/20 text-yellow-300'
                                            : isX
                                                ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300'
                                                : isO
                                                    ? 'border-violet-500/50 bg-violet-500/10 text-violet-300'
                                                    : clickable
                                                        ? 'border-slate-600 bg-slate-800/50 text-transparent hover:border-cyan-500/50 hover:bg-cyan-500/5'
                                                        : 'border-slate-700 bg-slate-800/30 text-transparent',
                                    ].join(' '), children: cell || (clickable ? '·' : '') }, i));
                            }) }), isAiThinking && (_jsxs("div", { className: "mb-3 flex items-center justify-center gap-2 text-xs text-slate-400", children: [_jsx("span", { className: "inline-block h-2 w-2 animate-ping rounded-full bg-cyan-400" }), "AI is calculating its move\u2026"] })), gameStatus !== 'ongoing' && (_jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: resetGame, className: "flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-2 text-sm font-semibold text-white transition hover:from-cyan-400 hover:to-blue-400", children: "Play Again" }), _jsx("button", { onClick: () => { setGameStarted(false); setGameStatus('idle'); setBoard(EMPTY_BOARD); setTrashTalk(''); }, className: "rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700", children: "Change Marker" })] }))] }))] }) }));
}
//# sourceMappingURL=TicTacToePanel.js.map