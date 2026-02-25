import React from 'react';
import {Layout, Content} from 'react-mdl';
import './App.css';
import Main from './components/main';
import { Link } from 'react-router-dom';

function App() {
  return (
    <div>
      <nav className="navbar">
        <Link className="nav-logo" to="/">titus<span>.dev</span></Link>
        <div className="nav-links">
          <Link className="nav-link" to="/resume">Resume</Link>
          <Link className="nav-link" to="/aboutme">About</Link>
          <Link className="nav-link" to="/projects">Projects</Link>
          <Link className="nav-link" to="/contact">Contact</Link>
        </div>
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
