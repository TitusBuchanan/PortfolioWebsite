import React, {Component} from 'react';

const allProjects = [
  {
    cat: 'cloud',
    icon: <i className="fa fa-cloud" style={{color:'var(--accent-cyan)'}} />,
    title: 'AWS Multi-Region Infrastructure',
    desc: 'Terraform-based multi-region AWS infrastructure with EC2, S3, RDS, and ELB. Automated provisioning that reduced manual setup time by 40%.',
    tags: ['Terraform', 'AWS', 'EC2', 'RDS'],
    link: 'https://github.com/TitusBuchanan'
  },
  {
    cat: 'cloud',
    icon: <i className="fa fa-bolt" style={{color:'var(--accent-amber)'}} />,
    title: 'Serverless Event Pipeline',
    desc: 'AWS Lambda-based serverless architecture for event processing, reducing monthly infrastructure costs by 25% with elastic scalability.',
    tags: ['Lambda', 'CloudFormation', 'S3', 'SNS'],
    link: 'https://github.com/TitusBuchanan'
  },
  {
    cat: 'cloud',
    icon: <i className="fa fa-lock" style={{color:'var(--accent-violet)'}} />,
    title: 'VPC Network Architecture',
    desc: 'Secure VPC design with public/private subnets, NAT gateways, security groups, and IAM policies following AWS best practices.',
    tags: ['AWS', 'VPC', 'IAM', 'Terraform'],
    link: 'https://github.com/TitusBuchanan'
  },
  {
    cat: 'cicd',
    icon: <i className="fa fa-refresh" style={{color:'var(--accent-emerald)'}} />,
    title: 'Jenkins CI/CD Pipeline',
    desc: 'End-to-end CI/CD pipeline using Jenkins, Docker, and GitHub webhooks. Automated build, test, and deploy accelerated release cycles by 30%.',
    tags: ['Jenkins', 'Docker', 'Groovy', 'GitHub'],
    link: 'https://github.com/TitusBuchanan'
  },
  {
    cat: 'cicd',
    icon: <i className="fa fa-rocket" style={{color:'var(--accent-cyan)'}} />,
    title: 'GitLab CI Multi-Stage Deploy',
    desc: 'Multi-stage GitLab CI pipeline with automated testing, security scanning, and blue-green deployment strategy.',
    tags: ['GitLab CI', 'Docker', 'Bash', 'YAML'],
    link: 'https://github.com/TitusBuchanan'
  },
  {
    cat: 'cicd',
    icon: <i className="fa fa-archive" style={{color:'var(--accent-amber)'}} />,
    title: 'Automated Build & Release',
    desc: 'Maven and Docker-based build automation with artifact versioning and deployment to container registries.',
    tags: ['Maven', 'Docker', 'Jenkins', 'ECR'],
    link: 'https://github.com/TitusBuchanan'
  },
  {
    cat: 'k8s',
    icon: <i className="fa fa-cubes" style={{color:'var(--accent-violet)'}} />,
    title: 'EKS Microservices Platform',
    desc: 'Kubernetes-based microservices platform on EKS achieving 99.9% availability across multi-region deployments with Helm charts.',
    tags: ['Kubernetes', 'EKS', 'Helm', 'Docker'],
    link: 'https://github.com/TitusBuchanan'
  },
  {
    cat: 'k8s',
    icon: <i className="fa fa-area-chart" style={{color:'var(--accent-emerald)'}} />,
    title: 'Cluster Monitoring Stack',
    desc: 'Full observability stack with Prometheus and Grafana dashboards for Kubernetes clusters, improving incident detection by 50%.',
    tags: ['Prometheus', 'Grafana', 'Kubernetes'],
    link: 'https://github.com/TitusBuchanan'
  },
  {
    cat: 'auto',
    icon: <i className="fa fa-cogs" style={{color:'var(--accent-cyan)'}} />,
    title: 'Ansible Config Management',
    desc: 'Ansible playbooks for automated server provisioning, configuration management, and application deployment across environments.',
    tags: ['Ansible', 'Python', 'YAML', 'Linux'],
    link: 'https://github.com/TitusBuchanan'
  },
  {
    cat: 'auto',
    icon: <i className="fa fa-terminal" style={{color:'var(--accent-emerald)'}} />,
    title: 'Infrastructure Automation Scripts',
    desc: 'Python and Bash automation for cloud resource management, log rotation, backup scheduling, and system health checks.',
    tags: ['Python', 'Bash', 'AWS CLI', 'Cron'],
    link: 'https://github.com/TitusBuchanan'
  },
  {
    cat: 'k8s',
    icon: <i className="fa fa-microchip" style={{color:'var(--accent-amber)'}} />,
    title: 'IoT Firmware Deploy System',
    desc: 'Docker and Azure-based IoT firmware update system that streamlined updates across channels, reducing deployment windows by 35%.',
    tags: ['Docker', 'Azure', 'Ubuntu', 'Bash'],
    link: 'https://github.com/TitusBuchanan'
  },
  {
    cat: 'auto',
    icon: <i className="fa fa-link" style={{color:'var(--accent-violet)'}} />,
    title: 'Jira-GitHub-Jenkins Integration',
    desc: 'Workflow automation integrating Jira with GitHub and Jenkins for development visibility, improving team productivity by 20%.',
    tags: ['Jira', 'GitHub', 'Jenkins', 'API'],
    link: 'https://github.com/TitusBuchanan'
  }
];

const filters = [
  {key: 'all', label: 'All'},
  {key: 'cloud', label: 'Cloud & IaC'},
  {key: 'cicd', label: 'CI / CD'},
  {key: 'k8s', label: 'Kubernetes'},
  {key: 'auto', label: 'Automation'}
];

class Projects extends Component {
  constructor(props) {
    super(props);
    this.state = {active: 'all'};
  }

  render() {
    const filtered = this.state.active === 'all'
      ? allProjects
      : allProjects.filter(p => p.cat === this.state.active);

    return (
      <div className="page">
        <div className="projects-page">
          <span className="section-label">Projects</span>
          <h2 className="section-title">Infrastructure &<br/><span className="gr">cloud-native solutions</span></h2>

          <div className="filter-bar">
            {filters.map(f => (
              <button
                key={f.key}
                className={'filter-btn' + (this.state.active === f.key ? ' active' : '')}
                onClick={() => this.setState({active: f.key})}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="projects-grid">
            {filtered.map((p, i) => (
              <a className="proj-card" key={i} href={p.link} target="_blank" rel="noopener noreferrer">
                <div className="proj-card-top">
                  <span className="proj-icon">{p.icon}</span>
                  <span className="proj-arrow">&#8599;</span>
                </div>
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
                <div className="proj-tags">
                  {p.tags.map(t => <span className="proj-tag" key={t}>{t}</span>)}
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
