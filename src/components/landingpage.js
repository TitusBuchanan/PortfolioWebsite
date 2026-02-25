import React, {Component} from 'react';
import { Link } from 'react-router-dom';

const SKILLS = [
  {name:'AWS', time:'04:00'},
  {name:'Terraform', time:'03:45'},
  {name:'Kubernetes', time:'03:30'},
  {name:'Docker', time:'03:15'},
  {name:'Jenkins', time:'02:50'}
];

class Landing extends Component {
  constructor(props) {
    super(props);
    const now = new Date();
    this.state = {
      hours: now.getHours(), minutes: now.getMinutes(), seconds: now.getSeconds(),
      activeSkill: 0, prevDigits: {h:'', m:'', s:''}
    };
  }

  componentDidMount() {
    this.timer = setInterval(() => {
      const now = new Date();
      this.setState({
        hours: now.getHours(), minutes: now.getMinutes(), seconds: now.getSeconds()
      });
    }, 1000);
    this.skillTimer = setInterval(() => {
      this.setState(prev => ({activeSkill: (prev.activeSkill + 1) % SKILLS.length}));
    }, 4000);
  }

  componentWillUnmount() {
    clearInterval(this.timer);
    clearInterval(this.skillTimer);
  }

  pad(n) { return n < 10 ? '0' + n : '' + n; }

  render() {
    const {hours, minutes, seconds, activeSkill} = this.state;
    const h = this.pad(hours);
    const m = this.pad(minutes);
    const s = this.pad(seconds);

    const now = new Date();
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const dayName = dayNames[now.getDay()];
    const monthName = monthNames[now.getMonth()];
    const date = now.getDate();

    return (
      <div className="page">
        <div className="hero-split">
          <div className="hero-top">
            <div className="hero-labels">
              <span className="hero-label">hours</span>
              <span className="hero-label">minutes</span>
              <span className="hero-label">seconds</span>
            </div>

            <div className="hero-clock">
              <div className="clock-digit-group">
                <span className="clock-digit" key={'h'+h}>{h}</span>
              </div>
              <span className="clock-separator">:</span>
              <div className="clock-digit-group">
                <span className="clock-digit" key={'m'+m}>{m}</span>
              </div>
              <span className="clock-separator">:</span>
              <span className="clock-seconds" key={'s'+s}>{s}</span>
            </div>

            <div className="tz-bar">
              {SKILLS.map((sk, i) => (
                <div
                  className={'tz-item' + (i === activeSkill ? ' active' : '')}
                  key={sk.name}
                  onClick={() => this.setState({activeSkill: i})}
                >
                  <span className="tz-name">{sk.name}</span>
                  <span className="tz-time">{sk.time}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-bottom">
            <div className="hero-bottom-left">
              <div className="hero-location">
                DevOps Engineer,<br/>
                <Link to="/projects" style={{opacity:0.7}}>View Projects →</Link>
              </div>
            </div>
            <div className="hero-bottom-right">
              <div className="hero-day">{dayName},</div>
              <div className="hero-date">{monthName} {date}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default Landing;
