import React, {Component} from 'react';
import {Grid, Cell} from 'react-mdl';

class Resume extends Component {
  render() {
    return (
      <div className="resume-page">
        <Grid>
          {/* Sidebar */}
          <Cell col={4}>
            <div className="resume-sidebar">
              <div style={{
                width: 100, height: 100, borderRadius: '50%',
                background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.5rem', fontSize: '2.5rem', color: '#0d1117',
                fontFamily: 'Inter, sans-serif', fontWeight: 800
              }}>TB</div>

              <h2>Titus Buchanan Jr</h2>
              <h4>DevOps Engineer</h4>

              <div className="info-block">
                <h5>Location</h5>
                <p>Providence, RI 02909</p>
                <h5>Phone</h5>
                <p>(908) 418-3062</p>
                <h5>Email</h5>
                <p>titusbuchananjr@gmail.com</p>
                <h5>LinkedIn</h5>
                <p>linkedin.com/in/titusbuchanan</p>
                <h5>GitHub</h5>
                <p>github.com/TitusBuchanan</p>
              </div>
            </div>
          </Cell>

          {/* Main Content */}
          <Cell className="resume-right-col" col={8}>

            {/* Experience */}
            <h2><span className="section-icon">&#9670;</span> Experience</h2>

            <div className="timeline-item">
              <p className="timeline-date">September 2022 – February 2025</p>
              <h4 className="timeline-title">DevOps Engineer</h4>
              <p className="timeline-subtitle">Moody's — New York, NY</p>
              <ul className="timeline-bullets">
                <li>Orchestrated cloud infrastructure on AWS using Terraform, automating deployments for EC2, S3, RDS, and ELB — reduced manual provisioning time by 40%</li>
                <li>Deployed and managed microservices on Kubernetes (EKS), achieving 99.9% availability across multi-region deployments</li>
                <li>Engineered CI/CD pipelines using Jenkins and Docker, accelerating release cycles by 30%</li>
                <li>Implemented serverless architectures with AWS Lambda, reducing monthly infrastructure costs by 25%</li>
                <li>Developed monitoring dashboards with CloudWatch and Prometheus, improving incident detection by 50%</li>
              </ul>
            </div>

            <div className="timeline-item">
              <p className="timeline-date">August 2021 – June 2022</p>
              <h4 className="timeline-title">DevOps / Infrastructure Engineer</h4>
              <p className="timeline-subtitle">The Barnes Group — Peabody, MA</p>
              <ul className="timeline-bullets">
                <li>Led deployment of an IoT firmware update system using Docker, Azure, and Ubuntu — reduced deployment windows by 35%</li>
                <li>Automated application builds and deployments using Azure CLI and Jenkins, cutting manual intervention by 50%</li>
                <li>Integrated Jira with GitHub and Jenkins to enhance workflow visibility, improving team productivity by 20%</li>
                <li>Managed virtualized infrastructure using VMware and configured Linux systems for high availability</li>
              </ul>
            </div>

            <div className="timeline-item">
              <p className="timeline-date">November 2020 – March 2021</p>
              <h4 className="timeline-title">Junior DevOps Engineer</h4>
              <p className="timeline-subtitle">Orgbubble — Providence, RI</p>
              <ul className="timeline-bullets">
                <li>Assisted in building and maintaining RESTful APIs and server configurations using JavaScript and MongoDB</li>
                <li>Contributed to automation initiatives that reduced repetitive tasks and improved workflow efficiency</li>
              </ul>
            </div>

            <hr className="resume-section-divider" />

            {/* Education */}
            <h2><span className="section-icon">&#9670;</span> Education</h2>

            <div className="timeline-item">
              <p className="timeline-date">2021</p>
              <h4 className="timeline-title">Br.S in Computer Science</h4>
              <p className="timeline-subtitle">CareerDevs Computer Science Institute — Providence, RI</p>
            </div>

            <div className="timeline-item">
              <p className="timeline-date">2014</p>
              <h4 className="timeline-title">Bachelor of Arts in Business</h4>
              <p className="timeline-subtitle">Saint Anselm College — Manchester, NH</p>
            </div>

            <hr className="resume-section-divider" />

            {/* Skills */}
            <h2><span className="section-icon">&#9670;</span> Skills</h2>

            <SkillBar skill="AWS (EC2, S3, EKS, Lambda, CloudFormation)" progress={90} />
            <SkillBar skill="Terraform / IaC" progress={88} />
            <SkillBar skill="Kubernetes / Docker / Helm" progress={85} />
            <SkillBar skill="CI/CD (Jenkins, GitHub Actions, GitLab CI)" progress={85} />
            <SkillBar skill="Python / Bash / Groovy" progress={80} />
            <SkillBar skill="Prometheus / Grafana / CloudWatch" progress={82} />
            <SkillBar skill="Ansible / Configuration Management" progress={78} />
            <SkillBar skill="Linux / Unix Administration" progress={88} />

          </Cell>
        </Grid>
      </div>
    );
  }
}

function SkillBar({skill, progress}) {
  return (
    <div className="skill-bar-container">
      <div className="skill-bar-label">
        <span>{skill}</span>
        <span>{progress}%</span>
      </div>
      <div className="skill-bar-track">
        <div className="skill-bar-fill" style={{width: progress + '%'}} />
      </div>
    </div>
  );
}

export default Resume;
