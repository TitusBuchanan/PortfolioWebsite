import React, {Component} from 'react';

class About extends Component {
  render() {
    return (
      <div className="page">
        <div className="about-page">
          <span className="section-label">About</span>
          <h2 className="section-title">Building the infrastructure<br/>behind <span className="gr">great software</span></h2>

          <div className="bento">
            {/* Summary — wide */}
            <div className="bento-card bento-wide">
              <div className="bento-icon" role="img" aria-label="person">
                <i className="fa fa-user" style={{color: 'var(--accent-cyan)'}} />
              </div>
              <h3>Who I Am</h3>
              <p className="bento-summary">
                DevOps Engineer with 4+ years of experience designing, automating,
                and scaling secure cloud-native infrastructure across AWS, Azure,
                and Kubernetes environments. I thrive at the intersection of
                development and operations, building the pipelines, platforms,
                and monitoring that keep teams shipping with confidence.
              </p>
            </div>

            {/* Stats */}
            <div className="bento-card">
              <div className="bento-icon" role="img" aria-label="chart">
                <i className="fa fa-line-chart" style={{color: 'var(--accent-emerald)'}} />
              </div>
              <h3>By the Numbers</h3>
              <div className="bento-stat-grid">
                <div className="bento-stat-item">
                  <div className="bento-stat-num">40%</div>
                  <div className="bento-stat-lbl">Faster provisioning</div>
                </div>
                <div className="bento-stat-item">
                  <div className="bento-stat-num">99.9%</div>
                  <div className="bento-stat-lbl">Uptime achieved</div>
                </div>
                <div className="bento-stat-item">
                  <div className="bento-stat-num">30%</div>
                  <div className="bento-stat-lbl">Faster releases</div>
                </div>
                <div className="bento-stat-item">
                  <div className="bento-stat-num">25%</div>
                  <div className="bento-stat-lbl">Cost reduction</div>
                </div>
              </div>
            </div>

            {/* Cloud */}
            <div className="bento-card">
              <div className="bento-icon" role="img" aria-label="cloud">
                <i className="fa fa-cloud" style={{color: 'var(--accent-cyan)'}} />
              </div>
              <h3>Cloud & IaC</h3>
              <p>Multi-cloud expertise across AWS and Azure with Terraform-driven infrastructure automation.</p>
              <div className="skill-chips">
                <span className="skill-chip">AWS</span>
                <span className="skill-chip">Azure</span>
                <span className="skill-chip">Terraform</span>
                <span className="skill-chip">CloudFormation</span>
              </div>
            </div>

            {/* Containers */}
            <div className="bento-card">
              <div className="bento-icon" role="img" aria-label="containers">
                <i className="fa fa-cubes" style={{color: 'var(--accent-violet)'}} />
              </div>
              <h3>Containers & Orchestration</h3>
              <p>Production Kubernetes on EKS with Helm-managed microservice deployments.</p>
              <div className="skill-chips">
                <span className="skill-chip">Docker</span>
                <span className="skill-chip">Kubernetes</span>
                <span className="skill-chip">EKS</span>
                <span className="skill-chip">Helm</span>
              </div>
            </div>

            {/* CI/CD */}
            <div className="bento-card">
              <div className="bento-icon" role="img" aria-label="cicd">
                <i className="fa fa-refresh" style={{color: 'var(--accent-emerald)'}} />
              </div>
              <h3>CI/CD Pipelines</h3>
              <p>End-to-end pipeline design with automated testing, security scanning, and deploy gates.</p>
              <div className="skill-chips">
                <span className="skill-chip">Jenkins</span>
                <span className="skill-chip">GitLab CI</span>
                <span className="skill-chip">GitHub Actions</span>
              </div>
            </div>

            {/* Toolbox — wide */}
            <div className="bento-card bento-wide">
              <div className="bento-icon" role="img" aria-label="toolbox">
                <i className="fa fa-wrench" style={{color: 'var(--accent-amber)'}} />
              </div>
              <h3>Full Toolbox</h3>
              <div className="skill-chips">
                <span className="skill-chip">Prometheus</span>
                <span className="skill-chip">Grafana</span>
                <span className="skill-chip">CloudWatch</span>
                <span className="skill-chip">Ansible</span>
                <span className="skill-chip">Python</span>
                <span className="skill-chip">Bash</span>
                <span className="skill-chip">Linux</span>
                <span className="skill-chip">PostgreSQL</span>
                <span className="skill-chip">MongoDB</span>
                <span className="skill-chip">IAM</span>
                <span className="skill-chip">VPC</span>
                <span className="skill-chip">Jira</span>
                <span className="skill-chip">Agile</span>
              </div>
            </div>

            {/* Security */}
            <div className="bento-card">
              <div className="bento-icon" role="img" aria-label="security">
                <i className="fa fa-shield" style={{color: 'var(--accent-amber)'}} />
              </div>
              <h3>DevSecOps</h3>
              <p>Security-first infrastructure with IAM policies, VPC isolation, and compliance automation.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default About;
