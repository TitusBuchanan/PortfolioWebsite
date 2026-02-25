import React, {Component} from 'react';

class Contact extends Component {
  render() {
    return (
      <div className="page">
        <div className="contact-page">
          <div className="contact-bg-text">CONTACT</div>
          <div className="contact-content">
            <div className="contact-left">
              <div className="contact-headline">LET'S<br/><span className="orange">CONNECT</span></div>
              <p className="contact-desc">
                Open to discussing DevOps challenges, cloud architecture
                opportunities, or ways to improve infrastructure at scale.
              </p>
              <div className="contact-row">
                <div className="contact-row-icon"><i className="fa fa-envelope" /></div>
                <div><div className="contact-row-label meta">Email</div><div className="contact-row-value">titusbuchananjr@gmail.com</div></div>
              </div>
              <div className="contact-row">
                <div className="contact-row-icon"><i className="fa fa-phone" /></div>
                <div><div className="contact-row-label meta">Phone</div><div className="contact-row-value">(908) 418-3062</div></div>
              </div>
              <div className="contact-row">
                <div className="contact-row-icon"><i className="fa fa-map-marker" /></div>
                <div><div className="contact-row-label meta">Location</div><div className="contact-row-value">Providence, RI</div></div>
              </div>
            </div>
            <div className="contact-right">
              <div className="contact-right-title">DEVOPS<br/>ENGINEER<br/>PROVIDENCE,<br/><span style={{color:'var(--orange)'}}>RI</span></div>
              <div className="contact-socials">
                <a className="contact-social" href="https://www.linkedin.com/in/titusbuchanan/" target="_blank" rel="noopener noreferrer"><i className="fa fa-linkedin" /></a>
                <a className="contact-social" href="https://github.com/TitusBuchanan" target="_blank" rel="noopener noreferrer"><i className="fa fa-github" /></a>
                <a className="contact-social" href="mailto:titusbuchananjr@gmail.com"><i className="fa fa-envelope-o" /></a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default Contact;
