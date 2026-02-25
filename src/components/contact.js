import React, {Component} from 'react';
import {Grid, Cell} from 'react-mdl';

class Contact extends Component {
  render() {
    return (
      <div className="contact-body">
        <div className="contact-grid">
          <Grid>
            <Cell col={6}>
              <h2>Get In <span className="accent">Touch</span></h2>
              <p>
                I'm always open to discussing new DevOps challenges,
                cloud architecture opportunities, or ways to improve
                infrastructure at scale. Feel free to reach out.
              </p>

              <div className="contact-social">
                <a href="https://www.linkedin.com/in/titusbuchanan/" target="_blank" rel="noopener noreferrer">
                  <i className="fa fa-linkedin" aria-hidden="true" />
                </a>
                <a href="https://github.com/TitusBuchanan" target="_blank" rel="noopener noreferrer">
                  <i className="fa fa-github" aria-hidden="true" />
                </a>
                <a href="mailto:titusbuchananjr@gmail.com">
                  <i className="fa fa-envelope" aria-hidden="true" />
                </a>
              </div>
            </Cell>

            <Cell col={6}>
              <div className="contact-item">
                <div className="contact-item-icon">
                  <i className="fa fa-map-marker" aria-hidden="true" />
                </div>
                <div className="contact-item-text">
                  <h4>Location</h4>
                  <p>Providence, RI 02909</p>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-item-icon">
                  <i className="fa fa-phone" aria-hidden="true" />
                </div>
                <div className="contact-item-text">
                  <h4>Phone</h4>
                  <p>(908) 418-3062</p>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-item-icon">
                  <i className="fa fa-envelope" aria-hidden="true" />
                </div>
                <div className="contact-item-text">
                  <h4>Email</h4>
                  <p>titusbuchananjr@gmail.com</p>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-item-icon">
                  <i className="fa fa-linkedin" aria-hidden="true" />
                </div>
                <div className="contact-item-text">
                  <h4>LinkedIn</h4>
                  <p>linkedin.com/in/titusbuchanan</p>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-item-icon">
                  <i className="fa fa-github" aria-hidden="true" />
                </div>
                <div className="contact-item-text">
                  <h4>GitHub</h4>
                  <p>github.com/TitusBuchanan</p>
                </div>
              </div>
            </Cell>
          </Grid>
        </div>
      </div>
    );
  }
}

export default Contact;
