import React, {Component} from 'react';
import Reveal from './Reveal';

const GH = 'https://github.com/TitusBuchanan/PortfolioWebsite/tree/cursor/development-environment-setup-cade/projects';

const projects = [
  {cat:'web',title:'MyResu-Me',desc:'Full-stack resume builder platform — fully responsible for development. Modern templates and professional export.',tags:['Full Stack','Web App','Development'],link:'https://www.myresu-me.com'},
  {cat:'cloud',title:'AWS Multi-Region Infra',desc:'Terraform-based multi-region AWS infrastructure with EC2, S3, RDS, and ELB. Modular design with prod/staging environments.',tags:['Terraform','AWS','EC2','RDS'],link:GH+'/aws-multi-region-infra'},
  {cat:'cloud',title:'Serverless Event Pipeline',desc:'AWS SAM pipeline: S3 events → Lambda → SNS → SQS → DynamoDB. Full event-driven architecture.',tags:['Lambda','SAM','SNS','SQS'],link:GH+'/serverless-event-pipeline'},
  {cat:'cloud',title:'VPC Network Architecture',desc:'Production VPC with 3-tier subnets, HA NAT gateways, NACLs, flow logs, and security groups.',tags:['Terraform','VPC','IAM'],link:GH+'/vpc-network-architecture'},
  {cat:'cicd',title:'Jenkins CI/CD Pipeline',desc:'Declarative pipeline: lint → test → Docker build → ECR push → ECS deploy with rollback and approval gates.',tags:['Jenkins','Docker','ECS'],link:GH+'/jenkins-cicd-pipeline'},
  {cat:'cicd',title:'GitLab CI Multi-Stage',desc:'7-stage pipeline with SAST/DAST security scanning, Trivy container scan, and blue-green deployment.',tags:['GitLab CI','Trivy','Blue-Green'],link:GH+'/gitlab-ci-multistage'},
  {cat:'k8s',title:'EKS Microservices',desc:'EKS cluster with Terraform, Helm charts, HPA, network policies, and mixed node groups.',tags:['EKS','Helm','Terraform'],link:GH+'/eks-microservices'},
  {cat:'k8s',title:'Cluster Monitoring Stack',desc:'Prometheus + Grafana + Alertmanager with 18 alert rules, dashboards, and K8s service discovery.',tags:['Prometheus','Grafana','K8s'],link:GH+'/cluster-monitoring'},
  {cat:'auto',title:'Ansible Config Mgmt',desc:'Ansible roles for nginx, Docker CE, and monitoring agents with inventory management.',tags:['Ansible','Nginx','Docker'],link:GH+'/ansible-config-mgmt'},
  {cat:'auto',title:'Infra Automation Scripts',desc:'Python + Bash toolkit: AWS audit, EBS backup, cost optimizer, SSL cert monitor, health checker.',tags:['Python','Bash','Boto3'],link:GH+'/infra-automation-scripts'},
  {cat:'k8s',title:'IoT Firmware Deploy',desc:'Docker-based firmware build pipeline with Azure Blob storage, IoT Hub integration, and canary rollout.',tags:['Docker','Azure','IoT Hub'],link:GH+'/iot-firmware-deploy'},
];

const filters = [{key:'all',label:'All'},{key:'web',label:'Web Apps'},{key:'cloud',label:'Cloud'},{key:'cicd',label:'CI/CD'},{key:'k8s',label:'Kubernetes'},{key:'auto',label:'Automation'}];

class Projects extends Component {
  constructor(props) { super(props); this.state = {active:'all'}; }

  render() {
    const filtered = this.state.active === 'all' ? projects : projects.filter(p => p.cat === this.state.active);
    return (
      <div className="page">
        <div className="projects-page">
          <div className="resume-label meta">Projects</div>
          <div className="proj-title text-reveal">WO<span className="grad-text">RK</span></div>

          <div className="proj-filters">
            {filters.map(f => (
              <button key={f.key} className={'proj-filter-btn'+(this.state.active===f.key?' active':'')}
                onClick={() => this.setState({active:f.key})}>{f.label}</button>
            ))}
          </div>

          <div className="proj-grid">
            {filtered.map((p,i) => (
              <Reveal key={this.state.active+'-'+i} delay={Math.min(i%4+1, 4)}>
                <a className="proj-cell" href={p.link} target="_blank" rel="noopener noreferrer">
                  <div className="proj-cell-idx">{String(i+1).padStart(2,'0')}</div>
                  <span className="proj-cell-arrow">↗</span>
                  <h3>{p.title}</h3>
                  <p>{p.desc}</p>
                  <div className="proj-tags">{p.tags.map(t => <span className="proj-tag" key={t}>{t}</span>)}</div>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    );
  }
}

export default Projects;
