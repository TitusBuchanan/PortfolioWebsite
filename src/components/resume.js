import React, {Component} from 'react'
import {Grid, Cell} from 'react-mdl'
import Education from './education'
import Experience from './experience'
import Skills from './skills'

class Resume extends Component {
    render(){
        return(
            <div>
                <Grid>
                    <Cell col={4}>
                        <div style={{textAlign:'center'}}>
                            <img
                                src="https://png.pngtree.com/png-clipart/20190924/original/pngtree-user-vector-avatar-png-image_4830521.jpg"
                                alt="avatar"
                                style={{height:'200px'}}
                            />
                        </div>

                        <h2 style={{paddingTop:'2em'}}>Titus Buchanan Jr</h2>
                        <h4 style={{color:'grey'}}>Programmer</h4>
                        <hr style={{borderTop:'3px solid #833fb2', width:'50%'}}></hr>
                        <p>Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised </p>
                        <hr style={{borderTop:'3px solid #833fb2', width:'50%'}}></hr>
                        <h5>Address</h5>
                        <p>91 Ring Street #3, Providence, RI 02909</p>
                        <h5>Phone</h5>
                        <p>(908)-418-3062</p>
                        <h5>Web</h5>
                        <p>mywebsite.com</p>
                        <hr style={{borderTop:'3px solid #833fb2', width:'50%'}}></hr>




                    </Cell>

                    <Cell className="resume-right-col" col={8}>
                        <h2>Education</h2>

                        <Education
                        startYear={2010}
                        endYear={2014}
                        schoolName={'Saint Anselm College'}
                        schoolDescription={'Saint Anselm College is a Benedictine, liberal arts college in Goffstown, New Hampshire. Founded in 1889, it is the third-oldest Catholic college in New England.'}
                         />
                         <Education
                        startYear={2019}
                        endYear={2020}
                        schoolName={'CareerDevs Computer Science University'}
                        schoolDescription={'CareerDevs students graduate with an in-depth understanding of and practical experience with a smorgasbord of the most in-demand technologies in the job market today including C#, Python, JavaScript, Java, C, SQL, object-oriented programming, functional programming, Node.js, React, Redux, React Native, HTML and CSS. Beyond these specific technologies, CareerDevs also trains students to be resourceful problem-solvers by approaching problems as computer scientists. They don’t just train you what you need to know; they train you how to think, setting you up for a lifetime of success beyond the CareerDevs classroom.'}
                         />
                         <hr style={{borderTop:'3px solid #e22947'}}></hr>

                         <h2>Experience</h2>
                         <Experience 
                             startYear={'November 2019'}
                             endYear={'March 2020'}
                             jobName={'Jardine Associates/J&Marketing'}
                             jobDescription={'Accounts Recivable'}
                         />

                        <hr style={{borderTop:'3px solid #e22947'}}></hr>
                        <h2>Skills</h2>
                        <Skills 
                            skill="JavaScript"
                            progress={65}
                        />
                        <Skills 
                            skill="React"
                            progress={50}
                        />
                        <Skills 
                            skill="HTML/CSS"
                            progress={70}
                        />
                        <Skills 
                            skill="NodeJS"
                            progress={85}
                        />
                        <Skills 
                            skill="Git"
                            progress={75}
                        />
                        <Skills 
                            skill="Java"
                            progress={75}
                        />



                    </Cell>
                </Grid>
            </div>
        )
    }
};


export default Resume;