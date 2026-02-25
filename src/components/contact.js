import React, {Component} from 'react';

class Contact extends Component {
  render() {
    return (
      <div className="page">
        <div className="contact-page">
          <div className="contact-left">
            <div className="contact-headline">LET'S<br/>CONNECT</div>
            <p className="contact-desc">
              Open to discussing DevOps challenges, cloud architecture
              opportunities, or ways to improve infrastructure at scale.
            </p>

            <div className="contact-info-row">
              <div className="contact-info-icon"><i className="fa fa-envelope" /></div>
              <div>
                <div className="contact-info-label">Email</div>
                <div className="contact-info-value">titusbuchananjr@gmail.com</div>
              </div>
            </div>

            <div className="contact-info-row">
              <div className="contact-info-icon"><i className="fa fa-phone" /></div>
              <div>
                <div className="contact-info-label">Phone</div>
                <div className="contact-info-value">(908) 418-3062</div>
              </div>
            </div>

            <div className="contact-info-row">
              <div className="contact-info-icon"><i className="fa fa-map-marker" /></div>
              <div>
                <div className="contact-info-label">Location</div>
                <div className="contact-info-value">Providence, RI</div>
              </div>
            </div>
          </div>

          <div className="contact-right">
            <div className="contact-right-content">
              <div className="contact-big-text">
                DEVOPS<br/>ENGINEER<br/>PROVIDENCE, RI
              </div>
              <div className="contact-social-row">
                <a className="contact-social-link" href="https://www.linkedin.com/in/titusbuchanan/" target="_blank" rel="noopener noreferrer">
                  <i className="fa fa-linkedin" />
                </a>
                <a className="contact-social-link" href="https://github.com/TitusBuchanan" target="_blank" rel="noopener noreferrer">
                  <i className="fa fa-github" />
                </a>
                <a className="contact-social-link" href="mailto:titusbuchananjr@gmail.com">
                  <i className="fa fa-envelope-o" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default Contact;
