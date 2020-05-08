import React, {Component} from 'react'
import {Tabs, Tab, Grid, Cell, Card, CardTitle, CardActions,Button,CardMenu,IconButton, CardText } from 'react-mdl';

class Projects extends Component {
    constructor(props) {
        super(props);
        this.state = { activeTab:0 };
    }
    
    
   toggleCategories() {
    if(this.state.activeTab === 0){
        return (
            
            <div className="projects-grid">
                <Card shadow={5} style={{ minWidth:'450', margin:'auto' }}>
                    <CardTitle style={{color: '#fff', height:'176px', background: 'url(https://reactjs.org/logo-og.png) center/cover'}}></CardTitle>
                        <CardText >
                            My First React Project
                        </CardText>
                        <CardActions border>
                            <Button colored href="https://github.com/TitusBuchanan/ReactProjects">Github</Button>
                        </CardActions>
                        <CardMenu style={{color: '#fff'}}>
                            <IconButton name='share' />
                        </CardMenu>
                </Card>
                <Card shadow={5} style={{ minWidth:'450', margin:'auto' }}>
                    <CardTitle style={{color: '#fff', height:'176px', background: 'url(https://reactjs.org/logo-og.png) center/cover'}}></CardTitle>
                        <CardText >
                            REACT project making a To-Do Lst.
                        </CardText>
                        <CardActions border>
                            <Button colored href="https://github.com/TitusBuchanan/ToDoReact">Github</Button>
                        </CardActions>
                        <CardMenu style={{color: '#fff'}}>
                            <IconButton name='share' />
                        </CardMenu>
                </Card>
                <Card shadow={5} style={{ minWidth:'450', margin:'auto' }}>
                    <CardTitle style={{color: '#fff', height:'176px', background: 'url(https://reactjs.org/logo-og.png) center/cover'}}></CardTitle>
                        <CardText >
                            Code for this website which was made with only REACT!
                        </CardText>
                        <CardActions border>
                            <Button colored href="https://github.com/TitusBuchanan/PortfolioWebsite">Github</Button>
                        </CardActions>
                        <CardMenu style={{color: '#fff'}}>
                            <IconButton name='share' />
                        </CardMenu>
                </Card>
           </div>
    
        )
            
                


            
        
           
           

           
    } else if(this.state.activeTab === 1) {
        return (
            <div className="projects-grid">
                <Card shadow={5} style={{ minWidth:'450', margin:'auto' }}>
                    <CardTitle style={{color: '#fff', height:'176px', background: 'url(https://miro.medium.com/max/1440/1*ahpxPO0jLGb9EWrY2qQPhg.jpeg) center/cover'}}></CardTitle>
                        <CardText >
                           Miscellaneous JavaScript Algorithims 
                        </CardText>
                        <CardActions border>
                            <Button colored href="https://github.com/TitusBuchanan/fcc">Github</Button>
                        </CardActions>
                        <CardMenu style={{color: '#fff'}}>
                            <IconButton name='share' />
                        </CardMenu>
                </Card>
                <Card shadow={5} style={{ minWidth:'450', margin:'auto' }}>
                    <CardTitle style={{color: '#fff', height:'176px', background: 'url(https://miro.medium.com/max/1440/1*ahpxPO0jLGb9EWrY2qQPhg.jpeg) center/cover'}}></CardTitle>
                        <CardText >
                        Javascript project using passport, passport local, bcrypt and other dependencies displaying my knowledge of these dependencies and how to incoperate them in applications
                        </CardText>
                        <CardActions border>
                            <Button colored href="https://github.com/TitusBuchanan/Passport">Github</Button>
                        </CardActions>
                        <CardMenu style={{color: '#fff'}}>
                            <IconButton name='share' />
                        </CardMenu>
                </Card>
                <Card shadow={5} style={{ minWidth:'450', margin:'auto' }}>
                    <CardTitle style={{color: '#fff', height:'176px', background: 'url(https://miro.medium.com/max/1440/1*ahpxPO0jLGb9EWrY2qQPhg.jpeg) center/cover'}}></CardTitle>
                        <CardText >
                        JavaScript HackerRank problem completed using JS
                        </CardText>
                        <CardActions border>
                            <Button colored href="https://github.com/TitusBuchanan/HackerRank">Github</Button>
                        </CardActions>
                        <CardMenu style={{color: '#fff'}}>
                            <IconButton name='share' />
                        </CardMenu>
                </Card>
           </div>
        )
    } else if(this.state.activeTab === 2) {
        return (
            <div className="projects-grid">
            <Card shadow={5} style={{ minWidth:'450', margin:'auto' }}>
                <CardTitle style={{color: '#fff', height:'176px', background: 'url(https://i.pcmag.com/imagery/reviews/02Q6yxveinggAu3PomearaV-7..v_1569481734.jpg) center/cover'}}></CardTitle>
                    <CardText >
                        Agile Men Stack Project using MongoDB,Express, And NodeJS
                    </CardText>
                    <CardActions border>
                        <Button colored href="https://github.com/TitusBuchanan/NewApiTeamProject">Github</Button>
                    </CardActions>
                    <CardMenu style={{color: '#fff'}}>
                        <IconButton name='share' />
                    </CardMenu>
            </Card>
            <Card shadow={5} style={{ minWidth:'450', margin:'auto' }}>
                <CardTitle style={{color: '#fff', height:'176px', background: 'url(https://i.pcmag.com/imagery/reviews/02Q6yxveinggAu3PomearaV-7..v_1569481734.jpg) center/cover'}}></CardTitle>
                    <CardText >
                    Scrum Men Stack Project using MongoDB,Express, And NodeJS
                    </CardText>
                    <CardActions border>
                        <Button colored href="https://github.com/TitusBuchanan/menStack-1">Github</Button>
                    </CardActions>
                    <CardMenu style={{color: '#fff'}}>
                        <IconButton name='share' />
                    </CardMenu>
            </Card>
            <Card shadow={5} style={{ minWidth:'450', margin:'auto' }}>
                <CardTitle style={{color: '#fff', height:'176px', background: 'url(https://i.pcmag.com/imagery/reviews/02Q6yxveinggAu3PomearaV-7..v_1569481734.jpg) center/cover'}}>React Project #3</CardTitle>
                    <CardText >
                        Solo Men Stack Project using MongoDB,Express, And NodeJS
                    </CardText>
                    <CardActions border>
                        <Button colored href="https://github.com/TitusBuchanan/ReactProjects">Github</Button>
                    </CardActions>
                    <CardMenu style={{color: '#fff'}}>
                        <IconButton name='share' />
                    </CardMenu>
            </Card>
       </div>
        )
    }else if(this.state.activeTab === 3) {
        return (
            <div className="projects-grid">
            <Card shadow={5} style={{ minWidth:'450', margin:'auto' }}>
                <CardTitle style={{color: '#fff', height:'176px', background: 'url(https://hackernoon.com/drafts/ar1wv331n.png) center/cover'}}></CardTitle>
                    <CardText >
                        Coming Soon....
                    </CardText>
                    <CardActions border>
                        <Button colored href="https://github.com/TitusBuchanan">Github</Button>
                    </CardActions>
                    <CardMenu style={{color: '#fff'}}>
                        <IconButton name='share' />
                    </CardMenu>
            </Card>
            <Card shadow={5} style={{ minWidth:'450', margin:'auto' }}>
                <CardTitle style={{color: '#fff', height:'176px', background: 'url(https://hackernoon.com/drafts/ar1wv331n.png) center/cover'}}></CardTitle>
                    <CardText >
                    Coming Soon....
                    </CardText>
                    <CardActions border>
                        <Button colored href="https://github.com/TitusBuchanan">Github</Button>
                    </CardActions>
                    <CardMenu style={{color: '#fff'}}>
                        <IconButton name='share' />
                    </CardMenu>
            </Card>
            <Card shadow={5} style={{ minWidth:'450', margin:'auto' }}>
                <CardTitle style={{color: '#fff', height:'176px', background: 'url(https://hackernoon.com/drafts/ar1wv331n.png) center/cover'}}>React Project #3</CardTitle>
                    <CardText >
                    Coming Soon....
                    </CardText>
                    <CardActions border>
                        <Button colored href="https://github.com/TitusBuchanan">Github</Button>
                    </CardActions>
                    <CardMenu style={{color: '#fff'}}>
                        <IconButton name='share' />
                    </CardMenu>
            </Card>
       </div>
        )
    }
   }
    
    render(){
        return(
            <div className="category-tabs">
                <Tabs activeTab={this.state.activeTab} onChange={(tabId) => this.setState({activeTab: tabId })} ripple>
                <Tab>React</Tab>
                <Tab>JavaScript</Tab>
                <Tab>MongoDB</Tab>
                <Tab>MERN</Tab>
                </Tabs>

                
                    <Grid >
                        <Cell col={12}>
                            <div className="content">{this.toggleCategories()}</div>
                        </Cell>
                    </Grid>
                    
                
            </div>
        )
    }
};


export default Projects;