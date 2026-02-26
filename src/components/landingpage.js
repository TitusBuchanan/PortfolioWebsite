import React, {Component} from 'react';
import { Link } from 'react-router-dom';

const skills = [
  'AWS','Terraform','Kubernetes','Docker','Jenkins','Python','Bash',
  'Ansible','Prometheus','Grafana','GitHub Actions','Helm','Linux',
  'Azure','CloudFormation','EKS','Lambda','PostgreSQL','MongoDB','Jira'
];
const doubled = [...skills, ...skills];

class Landing extends Component {
  render() {
    return (
      <div className="page">
        <section className="hero">
          <div className="hero-diag-1" />
          <div className="hero-diag-2" />
          <div className="hero-orb" />
          <div className="hero-cross"><div className="hero-cross-dot" /></div>
          <div className="hero-scribble">Titus B</div>

          <div className="hero-meta-tl meta">LEGAL<br/>© 2025</div>
          <div className="hero-meta-tr meta">UPDATES<br/>INITIATIVES 0.422</div>
          <div className="hero-meta-ml meta">FALL<br/>IN 27/298.09</div>
          <div className="hero-meta-br meta">PROVIDENCE<br/>RI, USA</div>

          <div className="hero-top-text text-reveal">DEVOPS</div>

          <div className="hero-center">
            <div className="hero-visual">
              <div className="hero-visual-inner">CLOUD<br/>NATIVE<br/>INFRA</div>
            </div>
            <div className="hero-info">
              <p className="hero-desc text-reveal text-reveal-d">
                Building seamless cloud infrastructure and
                scalable DevOps pipelines, blending automation
                with reliability to transform deployments into
                efficient, secure, and production-ready systems.
              </p>
              <div className="meta text-reveal text-reveal-d2" style={{marginBottom:'1.5rem'}}>
                4+ YEARS EXPERIENCE<br/>
                AWS / TERRAFORM / KUBERNETES
              </div>
              <Link to="/projects" className="bracket-btn text-reveal text-reveal-d2">
                <span className="bracket-btn-text">VIEW WORK</span>
              </Link>
            </div>
          </div>

          <div className="hero-bottom-text text-reveal text-reveal-d">
            <span style={{color:'var(--white)'}}>ENGI</span><span className="grad-text">NEER</span>
          </div>

          <div className="marquee-wrap" style={{marginTop:'1rem'}}>
            <div className="marquee-track">
              {doubled.map((s, i) => (
                <React.Fragment key={i}>
                  <span className="marquee-item">{s}</span>
                  <span className="marquee-dot">◆</span>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="hero-bar">
            <Link to="/contact" className="bracket-btn"><span className="bracket-btn-text">SAY HELLO</span></Link>
            <span className="bracket-btn"><span className="bracket-btn-text">CLOUD ENGINEERING</span></span>
            <Link to="/resume" className="bracket-btn"><span className="bracket-btn-text">RESUME</span></Link>
          </div>
        </section>
      </div>
    );
  }
}

export default Landing;
