import React, {Component} from 'react';

class Contact extends Component {
  render() {
    return (
      <div className="page">
        <div className="contact-page">
          <span className="section-label">Contact</span>
          <h2 className="section-title">Let's <span className="gr">connect</span></h2>
          <p className="contact-cta">
            I'm always open to discussing new DevOps challenges,
            cloud architecture opportunities, or ways to improve
            infrastructure at scale. Feel free to reach out.
          </p>

          <div className="contact-cards">
            <a className="contact-card" href="mailto:titusbuchananjr@gmail.com">
              <div className="contact-card-icon">
                <i className="fa fa-envelope" />
              </div>
              <div className="contact-card-label">Email</div>
              <div className="contact-card-value">titusbuchananjr@gmail.com</div>
            </a>

            <a className="contact-card" href="tel:+19084183062">
              <div className="contact-card-icon">
                <i className="fa fa-phone" />
              </div>
              <div className="contact-card-label">Phone</div>
              <div className="contact-card-value">(908) 418-3062</div>
            </a>

            <div className="contact-card">
              <div className="contact-card-icon">
                <i className="fa fa-map-marker" />
              </div>
              <div className="contact-card-label">Location</div>
              <div className="contact-card-value">Providence, RI</div>
            </div>
          </div>

          <div className="contact-bottom">
            <a className="contact-social-btn" href="https://www.linkedin.com/in/titusbuchanan/" target="_blank" rel="noopener noreferrer">
              <i className="fa fa-linkedin" />
            </a>
            <a className="contact-social-btn" href="https://github.com/TitusBuchanan" target="_blank" rel="noopener noreferrer">
              <i className="fa fa-github" />
            </a>
            <a className="contact-social-btn" href="mailto:titusbuchananjr@gmail.com">
              <i className="fa fa-envelope-o" />
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default Contact;
