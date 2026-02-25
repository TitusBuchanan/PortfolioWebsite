import React, {Component} from 'react';
import {Grid, Cell} from 'react-mdl';

const techTags = [
  'AWS', 'Terraform', 'Kubernetes', 'Docker', 'Jenkins',
  'Python', 'Bash', 'Ansible', 'Prometheus', 'Grafana',
  'GitHub Actions', 'Helm', 'Linux'
];

class Landing extends Component {
  render() {
    return (
      <div style={{width: '100%', margin: 'auto'}}>
        <Grid className="landing-grid">
          <Cell col={12}>

            <div className="terminal-badge">
              <span className="prompt">$</span> whoami
            </div>

            <h1 className="hero-title">
              Titus Buchanan Jr
              <br />
              <span className="accent">DevOps Engineer</span>
            </h1>

            <p className="hero-subtitle">
              4+ years designing, automating, and scaling secure cloud-native
              infrastructure across AWS, Azure, and Kubernetes environments.
            </p>

            <div className="tech-stack">
              {techTags.map(tag => (
                <span className="tech-tag" key={tag}>{tag}</span>
              ))}
            </div>

            <div className="social-links">
              <a href="https://www.linkedin.com/in/titusbuchanan/" rel="noopener noreferrer" target="_blank">
                <i className="fa fa-linkedin" aria-hidden="true" />
              </a>
              <a href="https://github.com/TitusBuchanan" rel="noopener noreferrer" target="_blank">
                <i className="fa fa-github" aria-hidden="true" />
              </a>
              <a href="mailto:titusbuchananjr@gmail.com" rel="noopener noreferrer" target="_blank">
                <i className="fa fa-envelope" aria-hidden="true" />
              </a>
            </div>

          </Cell>
        </Grid>
      </div>
    );
  }
}

export default Landing;
