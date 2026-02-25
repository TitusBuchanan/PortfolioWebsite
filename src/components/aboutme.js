import React, {Component} from 'react';

class CountUp extends Component {
  constructor(props) {
    super(props);
    this.state = {value: 0};
  }
  componentDidMount() {
    const target = parseFloat(this.props.to);
    const duration = 2000;
    const start = Date.now();
    this.raf = requestAnimationFrame(function tick() {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.setState({value: eased * target});
      if (progress < 1) this.raf = requestAnimationFrame(tick.bind(this));
    }.bind(this));
  }
  componentWillUnmount() { cancelAnimationFrame(this.raf); }
  render() {
    const v = this.state.value;
    const display = this.props.suffix === '%'
      ? v.toFixed(1) + '%'
      : this.props.suffix === '+'
        ? Math.round(v) + '+'
        : Math.round(v).toString();
    return <span>{display}</span>;
  }
}

const allSkills = [
  'AWS','Terraform','Kubernetes','Docker','Jenkins','Python','Bash','Ansible',
  'Prometheus','Grafana','CloudWatch','GitHub Actions','Helm','Linux','Azure',
  'CloudFormation','IAM','VPC','PostgreSQL','MongoDB','Jira','Agile','Maven','Groovy'
];

class About extends Component {
  render() {
    return (
      <div className="page">
        <div className="about-page">
          <div style={{marginBottom:'2rem'}}>
            <span className="resume-section-label">About</span>
            <h2 className="resume-section-title">TITUS BUCHANAN JR</h2>
          </div>

          <div className="about-grid">
            <div className="about-cell">
              <div className="about-cell-label">Years of Experience</div>
              <div className="about-cell-value"><CountUp to={4} suffix="+" /></div>
              <div className="about-cell-desc">Designing, automating, and scaling cloud-native infrastructure across AWS, Azure, and Kubernetes.</div>
            </div>
            <div className="about-cell">
              <div className="about-cell-label">Uptime Achieved</div>
              <div className="about-cell-value"><CountUp to={99.9} suffix="%" /></div>
              <div className="about-cell-desc">Multi-region Kubernetes deployments on EKS with automated failover and monitoring.</div>
            </div>
            <div className="about-cell">
              <div className="about-cell-label">Faster Deployments</div>
              <div className="about-cell-value"><CountUp to={40} suffix="%" /></div>
              <div className="about-cell-desc">Automated provisioning with Terraform, reducing manual setup time dramatically.</div>
            </div>
            <div className="about-cell">
              <div className="about-cell-label">Cost Reduction</div>
              <div className="about-cell-value"><CountUp to={25} suffix="%" /></div>
              <div className="about-cell-desc">Serverless architectures with AWS Lambda improving elastic scalability.</div>
            </div>
            <div className="about-cell about-cell-wide">
              <div className="about-cell-label">Professional Summary</div>
              <p className="about-summary">
                DevOps Engineer with 4+ years of experience building CI/CD pipelines,
                implementing Infrastructure as Code with Terraform, and enhancing system
                observability with Grafana and Prometheus. Adept at collaborating with
                cross-functional teams to troubleshoot complex cloud and container
                challenges in fast-paced environments.
              </p>
              <div className="about-skills-row">
                {allSkills.map(s => (
                  <span className="about-skill" key={s}>{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default About;
