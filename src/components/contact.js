import React, {Component} from 'react'
import {Grid, Cell, List, ListItem, ListItemContent} from 'react-mdl'
import Logo from '../Assets/Landingpagepic.png'


class Contact extends Component {
    render(){
        return(
            <div className="contact-body">
                <Grid className="contact-grid">
                    <Cell col={6}>
                        <h2>Titus Buchanan</h2>
                        <img
                         src={Logo}
                         alt="avatar"
                         style={{height:'250px'}}
                        />
                        <p style={{width:'75%',margin:'auto', paddingTop:'1em'}}></p>
                        
                        
                         

                    </Cell>
                    
                    <Cell col={6}>
                    <h2>Contact Me</h2>
                    <hr></hr>
                    <div className="contact-list">
                        <List>
                            <ListItem>
                                <ListItemContent  style={{fontSize:'30px',fontFamily:'Assistant'}} >
                                <i className= "fa fa-phone-square" aria-hidden='true' />
                                (908) 418-3062
                                
                                </ListItemContent>
                            </ListItem>
                            <ListItem>
                                <ListItemContent  style={{fontSize:'30px',fontFamily:'Assistant'}} >
                                <i className= "fa fa-envelope" aria-hidden='true' />
                                titusbuchananjr@gmail.com
                                </ListItemContent>
                            </ListItem>
                            <ListItem>
                                <ListItemContent  style={{fontSize:'30px',fontFamily:'Assistant'}} >
                                <i className="fa fa-linkedin-square" aria-hidden="true" />
                                linkedin.com/in/titusbuchanan/
                                </ListItemContent>
                            </ListItem>
                            
                        </List>
                    </div>
                    </Cell>
                </Grid>
            </div>
        )
    }
};


export default Contact;