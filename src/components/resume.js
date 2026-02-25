import React, {Component} from 'react';

class Resume extends Component {
  render() {
    return (
      <div className="page">
        <div className="resume-page">
          <span className="section-label">Resume</span>
          <h2 className="section-title">Experience & <span className="gr">Education</span></h2>

          {/* Header Card */}
          <div className="resume-header">
            <div className="resume-header-card">
              <div className="resume-avatar-ring">
                <div className="resume-avatar-inner">TB</div>
              </div>
              <div className="resume-header-info">
                <h2>Titus Buchanan Jr</h2>
                <p>DevOps Engineer</p>
                <div className="resume-meta">
                  <span><i className="fa fa-map-marker" /> Providence, RI</span>
                  <span><i className="fa fa-envelope" /> titusbuchananjr@gmail.com</span>
                  <span><i className="fa fa-phone" /> (908) 418-3062</span>
                </div>
              </div>
            </div>
          </div>

          {/* Experience */}
          <div className="resume-section">
            <div className="resume-section-head">
              <h3>Experience</h3>
              <div className="resume-section-line" />
            </div>

            <div className="exp-card">
              <div className="exp-card-top">
                <div>
                  <div className="exp-role">DevOps Engineer</div>
                  <div className="exp-company">Moody's &mdash; New York, NY</div>
                </div>
                <span className="exp-date">Sep 2022 &ndash; Feb 2025</span>
              </div>
              <ul className="exp-bullets">
                <li>Orchestrated cloud infrastructure on AWS using Terraform, automating deployments for EC2, S3, RDS, and ELB &mdash; reduced manual provisioning time by 40%</li>
                <li>Deployed and managed microservices on Kubernetes (EKS), achieving 99.9% availability across multi-region deployments</li>
                <li>Engineered CI/CD pipelines using Jenkins and Docker, accelerating release cycles by 30%</li>
                <li>Implemented serverless architectures with AWS Lambda, reducing monthly infrastructure costs by 25%</li>
                <li>Developed monitoring dashboards with CloudWatch and Prometheus, improving incident detection by 50%</li>
              </ul>
            </div>

            <div className="exp-card">
              <div className="exp-card-top">
                <div>
                  <div className="exp-role">DevOps / Infrastructure Engineer</div>
                  <div className="exp-company">The Barnes Group &mdash; Peabody, MA</div>
                </div>
                <span className="exp-date">Aug 2021 &ndash; Jun 2022</span>
              </div>
              <ul className="exp-bullets">
                <li>Led deployment of an IoT firmware update system using Docker, Azure, and Ubuntu &mdash; reduced deployment windows by 35%</li>
                <li>Automated application builds and deployments using Azure CLI and Jenkins, cutting manual intervention by 50%</li>
                <li>Integrated Jira with GitHub and Jenkins to enhance workflow visibility, improving team productivity by 20%</li>
                <li>Managed virtualized infrastructure using VMware and configured Linux systems for high availability</li>
              </ul>
            </div>

            <div className="exp-card">
              <div className="exp-card-top">
                <div>
                  <div className="exp-role">Junior DevOps Engineer</div>
                  <div className="exp-company">Orgbubble &mdash; Providence, RI</div>
                </div>
                <span className="exp-date">Nov 2020 &ndash; Mar 2021</span>
              </div>
              <ul className="exp-bullets">
                <li>Assisted in building and maintaining RESTful APIs and server configurations using JavaScript and MongoDB</li>
                <li>Contributed to automation initiatives that reduced repetitive tasks and improved workflow efficiency</li>
              </ul>
            </div>
          </div>

          {/* Education */}
          <div className="resume-section">
            <div className="resume-section-head">
              <h3>Education</h3>
              <div className="resume-section-line" />
            </div>
            <div className="edu-row">
              <div>
                <div className="edu-degree">Br.S in Computer Science</div>
                <div className="edu-school">CareerDevs Computer Science Institute &mdash; Providence, RI</div>
              </div>
              <span className="edu-year">2021</span>
            </div>
            <div className="edu-row">
              <div>
                <div className="edu-degree">Bachelor of Arts in Business</div>
                <div className="edu-school">Saint Anselm College &mdash; Manchester, NH</div>
              </div>
              <span className="edu-year">2014</span>
            </div>
          </div>

          {/* Skills */}
          <div className="resume-section">
            <div className="resume-section-head">
              <h3>Skills</h3>
              <div className="resume-section-line" />
            </div>
            <div className="skills-grid">
              {[
                ['AWS (EC2, S3, EKS, Lambda)', 90],
                ['Terraform / IaC', 88],
                ['Kubernetes / Docker / Helm', 85],
                ['CI/CD Pipelines', 85],
                ['Python / Bash', 80],
                ['Prometheus / Grafana', 82],
                ['Ansible', 78],
                ['Linux Administration', 88]
              ].map(([name, pct]) => (
                <div className="skill-row" key={name}>
                  <span className="skill-name">{name}</span>
                  <div className="skill-track">
                    <div className="skill-fill" style={{width: pct + '%'}} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    );
  }
}

export default Resume;
