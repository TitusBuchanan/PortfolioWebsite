import React, {Component} from 'react';
import {Grid, Cell} from 'react-mdl';



class Landing extends Component {
    render(){
        return(
            <div style={{width: '100%', margin: 'auto'}}>
                <Grid className="landing-grid">
                    <Cell col={12}>
                        <img 
                            src="https:cdn4.iconfinder.com/data/icons/business-avatar-3/64/Business-Man-Avatar_2-512.png"
                            alt="avatar"
                            className="avatar-img"
                        />
                       
                        <div className="banner-text">
                            <h1 className="header">Full Stack Web Developer</h1>

                            <hr/>

                            <p> HTML/CSS | Bootstrap | JavaScript | React | React Native | NodeJS | Express | MongoDB | Git </p>  

                            <div className="social-links">
                               {/* LinkedIn */}
                                <a href="https://www.linkedin.com/in/titusbuchanan/" rel="noopener noreferrer" target="_blank">
                                    <i className="fa fa-linkedin-square" aria-hidden="true" />
                                </a>
                                {/* Github */}
                                <a href="https://github.com/TitusBuchanan" rel="noopener noreferrer" target="_blank">
                                    <i className="fa fa-github-square" aria-hidden="true" />
                                </a>
                                {/* FreeCodeCamp */}
                                <a href="https://www.freecodecamp.org/" rel="noopener noreferrer" target="_blank">
                                    <i className="fa fa-free-code-camp" aria-hidden="true" />
                                </a>
                                {/* Twitter */}
                                <a href="https://www.instagram.com/prettymofotitus/" rel="noopener noreferrer" target="_blank">
                                    <i className="fa fa-instagram" aria-hidden="true" />
                                </a>
                            </div>  
                            
                        </div>
                    </Cell>
                </Grid>
                
            </div>
        )
    }
};


export default Landing;