import React, {Component} from 'react';

const projects = [
  { cat:'cloud', title:'AWS Multi-Region Infra', desc:'Terraform-based multi-region AWS infrastructure with EC2, S3, RDS. Reduced provisioning time by 40%.', tags:['Terraform','AWS','EC2'], link:'https://github.com/TitusBuchanan' },
  { cat:'cloud', title:'Serverless Event Pipeline', desc:'Lambda-based serverless architecture for event processing, reducing infrastructure costs by 25%.', tags:['Lambda','CloudFormation','S3'], link:'https://github.com/TitusBuchanan' },
  { cat:'cloud', title:'VPC Network Architecture', desc:'Secure VPC design with public/private subnets, NAT gateways, and IAM policies.', tags:['AWS','VPC','IAM'], link:'https://github.com/TitusBuchanan' },
  { cat:'cicd', title:'Jenkins CI/CD Pipeline', desc:'End-to-end pipeline using Jenkins, Docker, and GitHub webhooks. Accelerated releases by 30%.', tags:['Jenkins','Docker','Groovy'], link:'https://github.com/TitusBuchanan' },
  { cat:'cicd', title:'GitLab CI Multi-Stage', desc:'Multi-stage GitLab CI with automated testing, security scanning, and blue-green deploys.', tags:['GitLab CI','Docker','Bash'], link:'https://github.com/TitusBuchanan' },
  { cat:'k8s', title:'EKS Microservices', desc:'Kubernetes platform on EKS achieving 99.9% availability across multi-region deployments.', tags:['Kubernetes','EKS','Helm'], link:'https://github.com/TitusBuchanan' },
  { cat:'k8s', title:'Cluster Monitoring Stack', desc:'Prometheus and Grafana observability for K8s clusters, improving incident detection by 50%.', tags:['Prometheus','Grafana','K8s'], link:'https://github.com/TitusBuchanan' },
  { cat:'auto', title:'Ansible Config Mgmt', desc:'Ansible playbooks for automated server provisioning and configuration management.', tags:['Ansible','Python','YAML'], link:'https://github.com/TitusBuchanan' },
  { cat:'auto', title:'Infra Automation Scripts', desc:'Python and Bash automation for cloud resource management, backups, and health checks.', tags:['Python','Bash','AWS CLI'], link:'https://github.com/TitusBuchanan' },
  { cat:'k8s', title:'IoT Firmware Deploy', desc:'Docker + Azure IoT firmware update system, reducing deployment windows by 35%.', tags:['Docker','Azure','Ubuntu'], link:'https://github.com/TitusBuchanan' },
];

const filters = [
  {key:'all', label:'All'},
  {key:'cloud', label:'Cloud'},
  {key:'cicd', label:'CI/CD'},
  {key:'k8s', label:'Kubernetes'},
  {key:'auto', label:'Automation'}
];

class Projects extends Component {
  constructor(props) {
    super(props);
    this.state = {active:'all'};
  }

  render() {
    const filtered = this.state.active === 'all'
      ? projects : projects.filter(p => p.cat === this.state.active);

    return (
      <div className="page">
        <div className="projects-page">
          <span className="resume-section-label">Projects</span>
          <h2 className="resume-section-title">WORK</h2>

          <div className="proj-filter-bar">
            {filters.map(f => (
              <button
                key={f.key}
                className={'proj-filter' + (this.state.active === f.key ? ' active' : '')}
                onClick={() => this.setState({active: f.key})}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="proj-grid">
            {filtered.map((p, i) => (
              <a className="proj-cell" key={i} href={p.link} target="_blank" rel="noopener noreferrer">
                <div className="proj-num">{String(i + 1).padStart(2, '0')}</div>
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
                <div className="proj-cell-tags">
                  {p.tags.map(t => <span className="proj-cell-tag" key={t}>{t}</span>)}
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }
}

export default Projects;
