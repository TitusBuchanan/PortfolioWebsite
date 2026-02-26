import React, {Component} from 'react';

class Reveal extends Component {
  constructor(props) {
    super(props);
    this.state = {visible: false};
    this.ref = React.createRef();
  }

  componentDidMount() {
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.setState({visible: true});
          this.observer.unobserve(this.ref.current);
        }
      },
      {threshold: 0.1, rootMargin: '0px 0px -40px 0px'}
    );
    if (this.ref.current) this.observer.observe(this.ref.current);
  }

  componentWillUnmount() {
    if (this.observer && this.ref.current) this.observer.unobserve(this.ref.current);
  }

  render() {
    const {children, delay, className} = this.props;
    const cls = 'reveal' + (this.state.visible ? ' visible' : '') +
      (delay ? ' reveal-d' + delay : '') + (className ? ' ' + className : '');
    return <div ref={this.ref} className={cls}>{children}</div>;
  }
}

export default Reveal;
