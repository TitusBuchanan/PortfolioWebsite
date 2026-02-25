import React, {Component} from 'react';
import { Link } from 'react-router-dom';

class Landing extends Component {
  render() {
    return (
      <div className="page">
        <section className="hero">
          {/* Decorative elements */}
          <div className="hero-orb" />
          <div className="hero-cross"><div className="hero-cross-dot" /></div>
          <div className="hero-scribble">Titus B</div>

          {/* Scattered metadata */}
          <div className="hero-meta-tl meta">LEGAL<br/>© 2025</div>
          <div className="hero-meta-tr meta">UPDATES<br/>INITIATIVES 0.422</div>
          <div className="hero-meta-ml meta">FALL<br/>IN 27/298.09</div>
          <div className="hero-meta-br meta">PROVIDENCE<br/>RI, USA</div>

          {/* Top giant text */}
          <div className="hero-top-text">DEVOPS</div>

          {/* Center */}
          <div className="hero-center">
            <div className="hero-center-visual">
              <div className="hero-center-visual-text">CLOUD<br/>NATIVE<br/>INFRA</div>
            </div>
            <div className="hero-center-info">
              <p className="hero-desc">
                Building seamless cloud infrastructure and
                scalable DevOps pipelines, blending automation
                with reliability to transform deployments into
                efficient, secure, and production-ready systems.
              </p>
              <div className="meta" style={{marginBottom:'1rem'}}>
                4+ YEARS EXPERIENCE<br/>
                AWS / TERRAFORM / KUBERNETES
              </div>
              <Link to="/projects" className="bracket-btn">VIEW WORK</Link>
            </div>
          </div>

          {/* Bottom giant text */}
          <div className="hero-bottom-text">
            <span className="white">ENGI</span><span className="orange">NEER</span>
          </div>

          {/* Bottom bar */}
          <div className="hero-bar">
            <Link to="/contact" className="bracket-btn">SAY HELLO</Link>
            <span className="bracket-btn">CLOUD ENGINEERING</span>
            <Link to="/resume" className="bracket-btn">RESUME</Link>
          </div>
        </section>
      </div>
    );
  }
}

export default Landing;
