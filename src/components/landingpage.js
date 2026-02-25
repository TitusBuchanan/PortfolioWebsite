import React, {Component} from 'react';
import { Link } from 'react-router-dom';

const techs = [
  'AWS', 'Terraform', 'Kubernetes', 'Docker', 'Jenkins',
  'Python', 'Bash', 'Ansible', 'Prometheus', 'Grafana',
  'GitHub Actions', 'Helm', 'Linux', 'Azure', 'CloudFormation'
];

class Landing extends Component {
  render() {
    return (
      <div className="page">
        <section className="hero">
          <div className="hero-mesh" />
          <div className="hero-grid-lines" />

          <div className="hero-content">
            <div className="hero-badge">
              <span className="dot" />
              Open to opportunities
            </div>

            <h1>
              Titus Buchanan Jr
              <br />
              <span className="gr">DevOps Engineer</span>
            </h1>

            <p className="hero-desc">
              I design, automate, and scale secure cloud-native infrastructure.
              From CI/CD pipelines to Kubernetes clusters, I build the systems
              that keep software shipping.
            </p>

            <div className="hero-stats">
              <div className="hero-stat">
                <div className="hero-stat-value">4+</div>
                <div className="hero-stat-label">Years Experience</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-value">99.9%</div>
                <div className="hero-stat-label">Uptime Achieved</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-value">40%</div>
                <div className="hero-stat-label">Faster Deploys</div>
              </div>
            </div>

            <div className="hero-techs">
              {techs.map(t => <span className="hero-tech" key={t}>{t}</span>)}
            </div>

            <div className="hero-actions">
              <Link className="btn-primary" to="/projects">
                View Projects <span aria-hidden="true">&rarr;</span>
              </Link>
              <Link className="btn-outline" to="/contact">
                Get in Touch
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }
}

export default Landing;
