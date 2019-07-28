import React from 'react';
import './App.css';
import MyComponent from './component'
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';

function App() {
  return (
    <div className="App">
      <MuiThemeProvider>
      <header className="App-header">
        Textbasierte Prozessanalyse
      </header>
      <MyComponent />
        </MuiThemeProvider>
    </div>
  );
}

export default App;
