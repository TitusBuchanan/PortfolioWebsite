import React, {Component} from 'react';
import {Grid,Cell} from 'react-mdl';

class About extends Component {
    render(){
        return(
            <Grid className="aboutme-grid">
                <Cell col={6}>About Me </Cell>
                <Cell col={6}>Details</Cell>
            </Grid>
        )
    }
};


export default About;