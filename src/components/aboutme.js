import React, {Component} from 'react';

class CountUp extends Component {
  constructor(props) { super(props); this.state = {v:0}; }
  componentDidMount() {
    const t = parseFloat(this.props.to), d = 2000, s = Date.now();
    const tick = () => {
      const p = Math.min((Date.now()-s)/d,1);
      this.setState({v: (1-Math.pow(1-p,3)) * t});
      if(p<1) this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
  componentWillUnmount() { cancelAnimationFrame(this.raf); }
  render() {
    return this.props.suffix === '%'
      ? <span>{this.state.v.toFixed(1)}<span className="orange">%</span></span>
      : <span>{Math.round(this.state.v)}<span className="orange">{this.props.suffix}</span></span>;
  }
}

const tags = [
  'AWS','Terraform','Kubernetes','Docker','Jenkins','Python','Bash','Ansible',
  'Prometheus','Grafana','CloudWatch','GitHub Actions','Helm','Linux','Azure',
  'CloudFormation','IAM','VPC','PostgreSQL','MongoDB','Jira','Agile'
];

class About extends Component {
  render() {
    return (
      <div className="page">
        <div className="about-page">
          <div className="about-header">
            <div className="about-title">ABO<span className="orange">UT</span></div>
            <div className="meta" style={{paddingTop:'1rem'}}>TITUS BUCHANAN JR<br/>DEVOPS ENGINEER<br/>PROVIDENCE, RI</div>
          </div>

          <div className="about-body">
            <div className="about-cell">
              <div className="about-cell-label meta">Years of Experience</div>
              <div className="about-cell-num"><CountUp to={4} suffix="+" /></div>
              <p>Designing, automating, and scaling cloud-native infrastructure across AWS, Azure, and Kubernetes.</p>
            </div>
            <div className="about-cell">
              <div className="about-cell-label meta">Uptime Achieved</div>
              <div className="about-cell-num"><CountUp to={99.9} suffix="%" /></div>
              <p>Multi-region Kubernetes deployments on EKS with automated failover and monitoring.</p>
            </div>
            <div className="about-cell">
              <div className="about-cell-label meta">Faster Deployments</div>
              <div className="about-cell-num"><CountUp to={40} suffix="%" /></div>
              <p>Automated provisioning with Terraform, reducing manual setup time dramatically.</p>
            </div>
            <div className="about-cell">
              <div className="about-cell-label meta">Cost Reduction</div>
              <div className="about-cell-num"><CountUp to={25} suffix="%" /></div>
              <p>Serverless architectures with AWS Lambda improving elastic scalability.</p>
            </div>
            <div className="about-cell about-wide">
              <div className="about-cell-label meta">Professional Summary</div>
              <p style={{fontStyle:'italic',lineHeight:'1.8',maxWidth:'700px'}}>
                DevOps Engineer with 4+ years of experience building CI/CD pipelines,
                implementing Infrastructure as Code with Terraform, and enhancing
                system observability with Grafana and Prometheus. Adept at collaborating
                with cross-functional teams to troubleshoot complex cloud and container
                challenges in fast-paced environments.
              </p>
              <div className="about-tags">
                {tags.map(t => <span className="about-tag" key={t}>{t}</span>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default About;
