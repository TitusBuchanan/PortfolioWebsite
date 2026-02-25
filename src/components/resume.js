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
          <div className="resume-label meta">Resume</div>
          <div className="resume-title">EXPERI<span style={{color:'var(--orange)'}}>ENCE</span></div>

          <div className="exp-item">
            <div><div className="exp-year">2022</div><div className="exp-period meta">Sep 2022 — Feb 2025</div></div>
            <div>
              <div className="exp-role">DevOps Engineer</div>
              <div className="exp-company">Moody's — New York, NY</div>
              <ul className="exp-list">
                <li>Orchestrated cloud infrastructure on AWS using Terraform — reduced manual provisioning time by 40%</li>
                <li>Deployed microservices on Kubernetes (EKS), achieving 99.9% availability across multi-region deployments</li>
                <li>Engineered CI/CD pipelines using Jenkins and Docker, accelerating release cycles by 30%</li>
                <li>Implemented serverless architectures with AWS Lambda, reducing infrastructure costs by 25%</li>
                <li>Built monitoring dashboards with CloudWatch and Prometheus, improving incident detection by 50%</li>
              </ul>
            </div>
          </div>

          <div className="exp-item">
            <div><div className="exp-year">2021</div><div className="exp-period meta">Aug 2021 — Jun 2022</div></div>
            <div>
              <div className="exp-role">DevOps / Infrastructure Engineer</div>
              <div className="exp-company">The Barnes Group — Peabody, MA</div>
              <ul className="exp-list">
                <li>Led IoT firmware update system deployment using Docker, Azure, and Ubuntu — reduced deployment windows by 35%</li>
                <li>Automated builds with Azure CLI and Jenkins, cutting manual intervention by 50%</li>
                <li>Integrated Jira with GitHub and Jenkins, improving team productivity by 20%</li>
                <li>Managed virtualized infrastructure using VMware with high availability Linux systems</li>
              </ul>
            </div>
          </div>

          <div className="exp-item">
            <div><div className="exp-year">2020</div><div className="exp-period meta">Nov 2020 — Mar 2021</div></div>
            <div>
              <div className="exp-role">Junior DevOps Engineer</div>
              <div className="exp-company">Orgbubble — Providence, RI</div>
              <ul className="exp-list">
                <li>Built and maintained RESTful APIs and server configurations using JavaScript and MongoDB</li>
                <li>Contributed to automation initiatives that reduced repetitive tasks</li>
              </ul>
            </div>
          </div>

          <div style={{marginTop:'3rem'}}>
            <div className="resume-label meta">Education</div>
            <div className="resume-title">DEGR<span style={{color:'var(--orange)'}}>EES</span></div>
            <div className="edu-row">
              <div><div className="edu-name">Br.S in Computer Science</div><div className="edu-school">CareerDevs Computer Science Institute — Providence, RI</div></div>
              <div className="edu-year">2021</div>
            </div>
            <div className="edu-row">
              <div><div className="edu-name">Bachelor of Arts in Business</div><div className="edu-school">Saint Anselm College — Manchester, NH</div></div>
              <div className="edu-year">2014</div>
            </div>
          </div>

          <div style={{marginTop:'3rem'}}>
            <div className="resume-label meta">Technical</div>
            <div className="resume-title">SKI<span style={{color:'var(--orange)'}}>LLS</span></div>
            <div className="skills-wrap">
              {skills.map(s => <span className="skill-tag" key={s}>{s}</span>)}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default Resume;
