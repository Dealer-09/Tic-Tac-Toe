import React from "react";
import './App.css';
import Square from "./Square/Square"; 

const renderFrom = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];

const App = () => {
  return (
    <div className="main-div">
      <div className="move-detection">
        <div className="left"></div>
        <div className="right"></div>

      </div>
      <div className="content-container">
        <h1 className="game-heading water-background">Tic Tac Toe</h1>
        <div className="square-wrapper">
          {renderFrom.flat().map((e, index) => (
            <Square key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;