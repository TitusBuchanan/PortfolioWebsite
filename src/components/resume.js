import React, {Component} from 'react';

const skills = [
  'AWS','EC2','S3','EKS','Lambda','CloudFormation','Terraform','Azure',
  'Docker','Kubernetes','Helm','Jenkins','GitLab CI','GitHub Actions',
  'Prometheus','Grafana','CloudWatch','Ansible','Python','Bash','Groovy',
  'Linux','PostgreSQL','MongoDB','Jira','VMware'
];

class Resume extends Component {
  render() {
    return (
      <div className="page">
        <div className="resume-page">
          <span className="resume-section-label">Resume</span>
          <h2 className="resume-section-title">EXPERIENCE</h2>

          <div className="exp-block">
            <div>
              <div className="exp-year">2022</div>
              <div className="exp-year-sub">Sep 2022 — Feb 2025</div>
            </div>
            <div className="exp-content">
              <h3>DevOps Engineer</h3>
              <h4>Moody's — New York, NY</h4>
              <ul>
                <li>Orchestrated cloud infrastructure on AWS using Terraform — reduced manual provisioning time by 40%</li>
                <li>Deployed microservices on Kubernetes (EKS), achieving 99.9% availability across multi-region deployments</li>
                <li>Engineered CI/CD pipelines using Jenkins and Docker, accelerating release cycles by 30%</li>
                <li>Implemented serverless architectures with AWS Lambda, reducing infrastructure costs by 25%</li>
                <li>Built monitoring dashboards with CloudWatch and Prometheus, improving incident detection by 50%</li>
              </ul>
            </div>
          </div>

          <div className="exp-block">
            <div>
              <div className="exp-year">2021</div>
              <div className="exp-year-sub">Aug 2021 — Jun 2022</div>
            </div>
            <div className="exp-content">
              <h3>DevOps / Infrastructure Engineer</h3>
              <h4>The Barnes Group — Peabody, MA</h4>
              <ul>
                <li>Led IoT firmware update system deployment using Docker, Azure, and Ubuntu — reduced deployment windows by 35%</li>
                <li>Automated builds with Azure CLI and Jenkins, cutting manual intervention by 50%</li>
                <li>Integrated Jira with GitHub and Jenkins, improving team productivity by 20%</li>
                <li>Managed virtualized infrastructure using VMware with high availability Linux systems</li>
              </ul>
            </div>
          </div>

          <div className="exp-block">
            <div>
              <div className="exp-year">2020</div>
              <div className="exp-year-sub">Nov 2020 — Mar 2021</div>
            </div>
            <div className="exp-content">
              <h3>Junior DevOps Engineer</h3>
              <h4>Orgbubble — Providence, RI</h4>
              <ul>
                <li>Built and maintained RESTful APIs and server configurations using JavaScript and MongoDB</li>
                <li>Contributed to automation initiatives that reduced repetitive tasks</li>
              </ul>
            </div>
          </div>

          <div style={{marginTop:'3rem'}}>
            <span className="resume-section-label">Education</span>
            <h2 className="resume-section-title">DEGREES</h2>

            <div className="edu-block">
              <div>
                <div className="edu-name">Br.S in Computer Science</div>
                <div className="edu-school">CareerDevs Computer Science Institute — Providence, RI</div>
              </div>
              <div className="edu-year">2021</div>
            </div>
            <div className="edu-block">
              <div>
                <div className="edu-name">Bachelor of Arts in Business</div>
                <div className="edu-school">Saint Anselm College — Manchester, NH</div>
              </div>
              <div className="edu-year">2014</div>
            </div>
          </div>

          <div style={{marginTop:'3rem'}}>
            <span className="resume-section-label">Technical</span>
            <h2 className="resume-section-title">SKILLS</h2>
            <div className="skills-bar">
              {skills.map(s => <span className="skill-pill" key={s}>{s}</span>)}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default Resume;
