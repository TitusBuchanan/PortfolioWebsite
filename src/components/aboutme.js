import React, {Component} from 'react';
import {Grid, Cell} from 'react-mdl';

class About extends Component {
  render() {
    return (
      <div className="about-page">
        <Grid>
          <Cell col={6}>
            <h2 className="about-section-title">
              About <span className="accent">Me</span>
            </h2>
            <hr className="about-divider" />
            <p className="about-summary">
              DevOps Engineer with 4+ years of experience designing, automating,
              and scaling secure cloud-native infrastructure across AWS, Azure,
              and Kubernetes environments.
            </p>
            <p className="about-summary" style={{marginTop: '1rem'}}>
              Proven expertise in building CI/CD pipelines, implementing
              Infrastructure as Code with Terraform, and enhancing system
              observability with Grafana and Prometheus. Adept at collaborating
              directly with customers and cross-functional teams to
              troubleshoot complex cloud and container challenges in fast-paced,
              startup-like settings.
            </p>
          </Cell>

          <Cell col={6}>
            <h2 className="about-section-title">
              Core <span className="accent">Strengths</span>
            </h2>
            <hr className="about-divider" />

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
              <div className="about-card">
                <span className="about-card-icon">☁️</span>
                <h4>Cloud & IaC</h4>
                <p>AWS, Azure, Terraform, CloudFormation</p>
              </div>
              <div className="about-card">
                <span className="about-card-icon">🐳</span>
                <h4>Containers</h4>
                <p>Docker, Kubernetes, EKS, Helm, Microservices</p>
              </div>
              <div className="about-card">
                <span className="about-card-icon">🔄</span>
                <h4>CI/CD</h4>
                <p>Jenkins, GitLab CI, GitHub Actions, Maven</p>
              </div>
              <div className="about-card">
                <span className="about-card-icon">📊</span>
                <h4>Observability</h4>
                <p>Prometheus, Grafana, CloudWatch, Logging</p>
              </div>
              <div className="about-card">
                <span className="about-card-icon">⚙️</span>
                <h4>Automation</h4>
                <p>Ansible, Python, Bash, Linux Administration</p>
              </div>
              <div className="about-card">
                <span className="about-card-icon">🔐</span>
                <h4>Security</h4>
                <p>IAM, VPC, DevSecOps, Network Security</p>
              </div>
            </div>
          </Cell>
        </Grid>
      </div>
    );
  }
}

export default About;
