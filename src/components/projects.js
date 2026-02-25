import React, {Component} from 'react';
import {Tabs, Tab, Grid, Cell} from 'react-mdl';

const projectData = {
  0: [ // Cloud & IaC
    {
      icon: '☁️',
      title: 'AWS Multi-Region Infrastructure',
      desc: 'Terraform-based multi-region AWS infrastructure with EC2, S3, RDS, and ELB. Automated provisioning that reduced manual setup time by 40%.',
      tags: ['Terraform', 'AWS', 'EC2', 'RDS'],
      link: 'https://github.com/TitusBuchanan'
    },
    {
      icon: '🏗️',
      title: 'Serverless Event Pipeline',
      desc: 'AWS Lambda-based serverless architecture for event processing, reducing monthly infrastructure costs by 25% with elastic scalability.',
      tags: ['AWS Lambda', 'CloudFormation', 'S3', 'SNS'],
      link: 'https://github.com/TitusBuchanan'
    },
    {
      icon: '🔐',
      title: 'VPC Network Architecture',
      desc: 'Secure VPC design with public/private subnets, NAT gateways, security groups, and IAM policies following AWS best practices.',
      tags: ['AWS', 'VPC', 'IAM', 'Terraform'],
      link: 'https://github.com/TitusBuchanan'
    }
  ],
  1: [ // CI/CD
    {
      icon: '🔄',
      title: 'Jenkins CI/CD Pipeline',
      desc: 'End-to-end CI/CD pipeline using Jenkins, Docker, and GitHub webhooks. Automated build, test, and deploy — accelerated release cycles by 30%.',
      tags: ['Jenkins', 'Docker', 'Groovy', 'GitHub'],
      link: 'https://github.com/TitusBuchanan'
    },
    {
      icon: '🚀',
      title: 'GitLab CI Multi-Stage Deploy',
      desc: 'Multi-stage GitLab CI pipeline with automated testing, security scanning, and blue-green deployment strategy.',
      tags: ['GitLab CI', 'Docker', 'Bash', 'YAML'],
      link: 'https://github.com/TitusBuchanan'
    },
    {
      icon: '📦',
      title: 'Automated Build & Release',
      desc: 'Maven and Docker-based build automation with artifact versioning and deployment to container registries.',
      tags: ['Maven', 'Docker', 'Jenkins', 'ECR'],
      link: 'https://github.com/TitusBuchanan'
    }
  ],
  2: [ // Kubernetes
    {
      icon: '⎈',
      title: 'EKS Microservices Platform',
      desc: 'Kubernetes-based microservices platform on EKS achieving 99.9% availability across multi-region deployments with Helm charts.',
      tags: ['Kubernetes', 'EKS', 'Helm', 'Docker'],
      link: 'https://github.com/TitusBuchanan'
    },
    {
      icon: '📊',
      title: 'Cluster Monitoring Stack',
      desc: 'Full observability stack with Prometheus and Grafana dashboards for Kubernetes clusters, improving incident detection by 50%.',
      tags: ['Prometheus', 'Grafana', 'Kubernetes', 'CloudWatch'],
      link: 'https://github.com/TitusBuchanan'
    },
    {
      icon: '🔧',
      title: 'IoT Firmware Deploy System',
      desc: 'Docker and Azure-based IoT firmware update system that streamlined updates across multiple channels, reducing deployment windows by 35%.',
      tags: ['Docker', 'Azure', 'Ubuntu', 'Bash'],
      link: 'https://github.com/TitusBuchanan'
    }
  ],
  3: [ // Automation
    {
      icon: '⚙️',
      title: 'Ansible Config Management',
      desc: 'Ansible playbooks for automated server provisioning, configuration management, and application deployment across environments.',
      tags: ['Ansible', 'Python', 'YAML', 'Linux'],
      link: 'https://github.com/TitusBuchanan'
    },
    {
      icon: '🐍',
      title: 'Infrastructure Automation Scripts',
      desc: 'Python and Bash automation scripts for cloud resource management, log rotation, backup scheduling, and system health checks.',
      tags: ['Python', 'Bash', 'AWS CLI', 'Cron'],
      link: 'https://github.com/TitusBuchanan'
    },
    {
      icon: '🔗',
      title: 'Jira-GitHub-Jenkins Integration',
      desc: 'Workflow automation integrating Jira with GitHub and Jenkins for enhanced development visibility and tracking, improving team productivity by 20%.',
      tags: ['Jira', 'GitHub', 'Jenkins', 'REST API'],
      link: 'https://github.com/TitusBuchanan'
    }
  ]
};

class Projects extends Component {
  constructor(props) {
    super(props);
    this.state = {activeTab: 0};
  }

  renderProjects() {
    const projects = projectData[this.state.activeTab] || [];
    return (
      <div className="projects-grid">
        {projects.map((project, idx) => (
          <div className="project-card" key={idx}>
            <div className="project-card-header">
              <span className="project-card-icon">{project.icon}</span>
              <h3>{project.title}</h3>
            </div>
            <div className="project-card-body">
              <p>{project.desc}</p>
              <div className="project-tags">
                {project.tags.map(tag => (
                  <span className="project-tag" key={tag}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="project-card-footer">
              <a className="project-link" href={project.link} target="_blank" rel="noopener noreferrer">
                <i className="fa fa-github" /> View on GitHub →
              </a>
            </div>
          </div>
        ))}
      </div>
    );
  }

  render() {
    return (
      <div className="projects-page">
        <div className="projects-header">
          <h2>Featured <span className="accent">Projects</span></h2>
          <p>Infrastructure, automation, and cloud-native solutions</p>
        </div>
        <div className="category-tabs">
          <div style={{textAlign: 'center'}}>
            <Tabs activeTab={this.state.activeTab} onChange={(tabId) => this.setState({activeTab: tabId})} ripple>
              <Tab>Cloud & IaC</Tab>
              <Tab>CI/CD</Tab>
              <Tab>Kubernetes</Tab>
              <Tab>Automation</Tab>
            </Tabs>
          </div>
          <Grid>
            <Cell col={12}>
              {this.renderProjects()}
            </Cell>
          </Grid>
        </div>
      </div>
    );
  }
}

export default Projects;
