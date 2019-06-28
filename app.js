const express = require('express');
const bodyParser = require('body-parser');
const graphqlHttp = require('express-graphql');
const {buildSchema} = require('graphql');
const mongoose = require('mongoose');
const Event = require('./models/events');
const User = require('./models/users');
const bcrypt = require('bcryptjs');

const app = express();

app.use(bodyParser.json());

app.use(
    '/graphql',
    graphqlHttp({
        schema: buildSchema(`

            type Event {
                _id: ID!
                title: String!
                description: String!
                price: Float!
                date: String!
            }

            type User {
                _id: ID!
                email: String!
                password: String
            }

            input EventInput{
                title: String!
                description: String!
                price: Float!
                date: String!
            }

            input UserInput {
                email: String!
                password: String!
            }

            type RootQuery {
                events: [Event!]!
            }

            type RootMutation {
                createEvent(eventInput: EventInput): Event
                createUser(userInput: UserInput): User
            }

            schema {
                query: RootQuery,
                mutation: RootMutation
            }
        `),
        rootValue: {
            events: () => {
                // get all the events from the db
                // use the return here to let express know that this is an async operation
                return Event.find()
                .then(events => {
                    return events.map(event => {
                        return {...event._doc};
                    })
                })
                .catch(err => {
                    console.log(err);
                });
            },
            createEvent: (args) => {

                let eventCreated;
                User.findById('5d15dda130bc993754f335a7').then

                // build the js object
                const event = new Event({
                    title: args.eventInput.title,
                    description: args.eventInput.description,
                    price: +args.eventInput.price,
                    date: new Date(args.eventInput.date),
                    // add a hardcoded id for testing purpose for now
                    creator: '5d15dda130bc993754f335a7'
               });

               // return the event so the Graphql knows about the asyn operation
               return event
                .save()
                .then(result => {
                    // result is basically the event that we get
                    // however there is meta data attached to it
                    // so use the _doc method to get the json data
                    eventCreated = {...result._doc};

                    // we need to get the user so that we can add this event
                    // information in the user table as well
                    return User.findById('5d15dda130bc993754f335a7');
                })
                .then(user => {
                    // if we don't get any such user
                    // throw and error and let user know
                    if(!user){
                        throw new Error("User doesn't exit");
                    }

                    // add this new event to the created events
                    // array in the user model for this user
                    user.createdEvents.push(event);

                    // save this user
                    return user.save();
                })
                .then(result => {

                    // once the user is updated as well
                    // return the even that has been saved
                    return eventCreated;
                })
                .catch(err => {
                    throw err;
                })
            },
            createUser: args => {
                // begin by checking whether a user with this email id exists
                return User.findOne({ email: args.userInput.email})
                    .then(user => {
                        // if a user already exists,
                        // throw a duplicate user error
                        if(user){
                            throw new Error('Duplicate User');
                        }
                        // if now, return the hashed value of the password provided with 12 rounds of SALT
                        return bcrypt.hash(args.userInput.password, 12);
                    })    
                    .then(hashedPassword => {
                        // on getting the hashed passowrd
                        // save the user
                        const user = new User({
                            email: args.userInput.email,
                            password: hashedPassword
                        });
                    
                        return user.save()
                    })
                    .then(result => {
                        // once the user is saved 
                        // return the information (should it need to be queried)
                        // remember password hasn't been defined as mandatory on FE
                        return {...result._doc};
                    })
                    .catch(err => {
                        // catch any error that has occurred during this operation
                        throw err;
                    })
            } 
        },
        
        graphiql: true
    })
);


mongoose.connect(`mongodb+srv://${process.env.MONGO_USER}:${
    process.env.MONGO_PASSWORD
}@cluster0-vfwck.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority`).then(() => {
    app.listen(3000);
}).catch(err => {
    console.log(err);
});
