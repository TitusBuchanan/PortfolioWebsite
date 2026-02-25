import React from 'react';
import {Layout, Content} from 'react-mdl';
import './App.css';
import Main from './components/main';
import { Link } from 'react-router-dom';

function App() {
  return (
    <div>
      <nav className="nav">
        <Link className="nav-brand" to="/">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 3L4 14h5v7l9-11h-5V3z"/></svg>
          TITUS BUCHANAN
        </Link>
        <div className="nav-links">
          <Link className="nav-link" to="/resume">Resume</Link>
          <Link className="nav-link" to="/aboutme">About</Link>
          <Link className="nav-link" to="/projects">Projects</Link>
          <Link className="nav-link" to="/contact">Contact</Link>
        </div>
        <button className="nav-grid-btn" aria-label="menu">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <circle cx="3" cy="3" r="1.5"/><circle cx="11" cy="3" r="1.5"/>
            <circle cx="3" cy="11" r="1.5"/><circle cx="11" cy="11" r="1.5"/>
          </svg>
        </button>
      </nav>
      <Layout>
        <Content>
          <Main />
        </Content>
      </Layout>
    </div>
  );
}

export default App;
